import os
import re
import uuid
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load env early - project root .env
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Late import heavy deps only if needed
_vector_db = None
_vector_db_error: Optional[str] = None

SYSTEM_PROMPT = (
    "You are an expert medical billing advocate. Your job is to draft an assertive, "
    "professional appeal letter to overturn an insurance denial.\n\n"
    "CRITICAL INSTRUCTIONS:\n"
    "1. You MUST use the provided extracted policy context to justify the medical necessity.\n"
    "2. You MUST cite the exact policy codes, clinical guidelines, or paragraphs found in the context.\n"
    "3. You MUST explicitly state the document names and page numbers (provided in the context) that you are using as sources in your response.\n"
    "4. Do NOT invent, hallucinate, or assume any medical guidelines or CPT codes.\n"
    "5. For unknown fields, format them like [EMAIL] or [PHONE NUMBER].\n\n"
    "AGENT BEHAVIOR & FORMATTING:\n"
    "- Before drafting the letter, analyze the user's denial details. If critical information "
    "is missing that would make the appeal stronger, ask the user ONE direct, professional question.\n"
    "- ONLY draft the final letter when you are confident you have sufficient details.\n"
    "- WHEN YOU DRAFT THE FINAL LETTER, YOU MUST ENCLOSE THE ENTIRE LETTER TEXT BETWEEN <FINAL_LETTER> AND </FINAL_LETTER> TAGS.\n"
    "- If the retrieved context does not contain relevant policy data to overturn the denial, state: "
    "'INSUFFICIENT POLICY DATA TO GENERATE APPEAL' and stop.\n\n"
    "Policy Context:\n{context}"
)

PROVIDERS = ["aetna", "cigna", "unitedhealthcare", "bluecross", "medicare"]

app = FastAPI(title="ClaimDefenseAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _clean_provider(s: str) -> str:
    # normalize: lower, remove punctuation, collapse whitespace, remove spaces for matching
    cleaned = re.sub(r"[^\w\s]", "", s.strip().lower())
    # canonicalize multi-word like "blue cross" -> "bluecross", "united healthcare" -> "unitedhealthcare"
    cleaned = re.sub(r"\s+", "", cleaned)
    return cleaned


def get_vector_db():
    global _vector_db, _vector_db_error
    if _vector_db is not None:
        return _vector_db
    if _vector_db_error is not None:
        raise HTTPException(status_code=503, detail=_vector_db_error)

    if not MISTRAL_API_KEY or len(MISTRAL_API_KEY) < 20:
        _vector_db_error = "MISTRAL_API_KEY not configured"
        raise HTTPException(status_code=503, detail=_vector_db_error)

    try:
        from langchain_mistralai import MistralAIEmbeddings
        from langchain_community.vectorstores import Chroma

        persist_dir = str(ROOT / "chroma_db_storage")
        policies_dir = str(ROOT / "policies")

        embeddings = MistralAIEmbeddings(mistral_api_key=MISTRAL_API_KEY)

        if os.path.exists(persist_dir) and os.listdir(persist_dir):
            _vector_db = Chroma(persist_directory=persist_dir, embedding_function=embeddings)
            return _vector_db

        if not os.path.exists(policies_dir):
            _vector_db_error = "No policies directory and no persisted DB"
            raise HTTPException(status_code=503, detail=_vector_db_error)

        # Build from scratch (cold start)
        from langchain_community.document_loaders import PyPDFDirectoryLoader
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        loader = PyPDFDirectoryLoader(policies_dir, recursive=True)
        documents = loader.load()
        if not documents:
            _vector_db_error = "No policy documents found"
            raise HTTPException(status_code=503, detail=_vector_db_error)

        for doc in documents:
            parts = os.path.normpath(doc.metadata.get("source", "")).split(os.sep)
            provider = parts[-2].lower().strip() if len(parts) >= 3 else "general"
            doc.metadata["provider"] = provider

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = splitter.split_documents(documents)
        _vector_db = Chroma.from_documents(documents=splits, embedding=embeddings, persist_directory=persist_dir)
        return _vector_db
    except HTTPException:
        raise
    except Exception as e:
        _vector_db_error = f"Vector DB init failed: {e}"
        raise HTTPException(status_code=503, detail=_vector_db_error)


def extract_provider_from_text(denial_text: str) -> str:
    try:
        from langchain_mistralai import ChatMistralAI
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser

        llm = ChatMistralAI(mistral_api_key=MISTRAL_API_KEY, model="mistral-small-latest", temperature=0.0, max_retries=2)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an extraction assistant. Identify insurance provider. Map to one of [aetna, cigna, unitedhealthcare, bluecross, medicare]. If United Healthcare/UHC -> unitedhealthcare. Respond ONLY the key. If unknown -> unknown."),
            ("human", "Denial Text:\n{input}"),
        ])
        chain = prompt | llm | StrOutputParser()
        extracted = chain.invoke({"input": denial_text}).strip().lower()
        return _clean_provider(extracted) or "unknown"
    except Exception:
        return "unknown"


def extract_cpts(text: str) -> list[str]:
    # Capture explicit CPT mentions and standalone 5-digit codes that look like CPTs
    cpts = re.findall(r"CPT\s*[:\-]?\s*(\d{5})\b", text, re.IGNORECASE)
    # Also grab generic 5-digit near denial context - but avoid years/dates
    # We filter to 90000-99499 + common surgical range if CPT prefix found
    # For now return explicit ones; fallback to any isolated 5-digit not starting with 19/20 (years)
    if not cpts:
        candidates = re.findall(r"\b(\d{5})\b", text)
        cpts = [c for c in candidates if not c.startswith("19") and not c.startswith("20")]
    # dedupe preserve order
    seen = set()
    out: list[str] = []
    for c in cpts:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out[:6]


def extract_claim_number(text: str) -> str | None:
    m = re.search(r"(?:Claim\s*(?:Number|#)?|CLM)\s*[:\-]?\s*([A-Z]*[-]?\d{4,})", text, re.IGNORECASE)
    return m.group(1).strip() if m else None


def _display_page(meta: dict) -> str:
    # Prefer page_label (human 1-indexed) if present, else page+1
    if "page_label" in meta and meta["page_label"]:
        return str(meta["page_label"])
    p = meta.get("page")
    if isinstance(p, int):
        return str(p + 1)
    if p is not None:
        return str(p)
    return "?"

def _basename(path: str) -> str:
    # Chroma metadata stores Windows separators on Linux host; normalize
    return os.path.basename(path.replace("\\", "/"))

def retrieve_policy_context(denial_reason: str, provider: Optional[str] = None):
    vector_db = get_vector_db()
    if not provider or provider == "auto-detect":
        provider = extract_provider_from_text(denial_reason)
    provider_key = _clean_provider(provider) if provider else "unknown"
    search_kwargs = {"k": 4}
    if provider_key and provider_key != "unknown":
        search_kwargs["filter"] = {"provider": provider_key}
    retriever = vector_db.as_retriever(search_kwargs=search_kwargs)
    docs = retriever.invoke(denial_reason)
    # Fallback: if filtered retrieval yields nothing or is too thin (<2 docs) and we filtered, retry unfiltered
    if (not docs or len(docs) < 2) and "filter" in search_kwargs:
        try:
            fallback = vector_db.as_retriever(search_kwargs={"k": 4})
            fb_docs = fallback.invoke(denial_reason)
            if fb_docs and len(fb_docs) > len(docs):
                docs = fb_docs
        except Exception:
            pass
    parts = []
    for i, doc in enumerate(docs):
        src = doc.metadata.get("source", "Unknown Document")
        # Use display page for model citation parity with UI
        page_disp = _display_page(doc.metadata)
        parts.append(f"--- SOURCE {i+1}: {src} (Page {page_disp}) ---\n{doc.page_content}")
    context_text = "\n\n".join(parts) if parts else "No relevant policy documents found."
    return context_text, docs, provider_key


def parse_agent_response(text: str):
    import re as _re
    m = _re.search(r"<FINAL_LETTER>(.*?)</FINAL_LETTER>", text, _re.DOTALL)
    draft = m.group(1).strip() if m else None
    clean = _re.sub(r"<FINAL_LETTER>|</FINAL_LETTER>", "", text).strip()
    return clean, draft


# ---------- Schemas ----------

class StartRequest(BaseModel):
    patient_name: str
    denial_reason: str
    provider: str = "auto-detect"

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class FollowupRequest(BaseModel):
    session_id: str
    message: str

# In-memory session store (ephemeral; production would use Redis/DB)
_sessions: dict[str, dict] = {}


# ---------- Routes ----------

@app.get("/api/health")
def health():
    has_key = bool(MISTRAL_API_KEY and len(MISTRAL_API_KEY) > 20)
    has_db = os.path.exists(str(ROOT / "chroma_db_storage" / "chroma.sqlite3"))
    return {"status": "ok", "has_mistral_key": has_key, "has_vector_db": has_db, "providers": PROVIDERS}

@app.get("/api/providers")
def list_providers():
    return {"providers": PROVIDERS}

@app.post("/api/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    # 6MB limit - keep within serverless bounds
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Please upload a PDF file.")
    data = await file.read()
    if len(data) > 6 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF too large (max 6MB). Try removing scanned images.")
    if len(data) == 0:
        raise HTTPException(status_code=422, detail="Empty file.")
    try:
        from pypdf import PdfReader
        import io
        reader = PdfReader(io.BytesIO(data))
        texts: list[str] = []
        for page in reader.pages[:20]:  # cap 20 pages
            try:
                t = page.extract_text() or ""
                if t.strip():
                    texts.append(t)
            except Exception:
                continue
        combined = "\n\n".join(texts).strip()
        if not combined or len(combined) < 30:
            raise HTTPException(status_code=422, detail="Could not extract readable text from this PDF. Is it a scanned image? Try pasting the text instead.")
        # normalize whitespace
        combined = re.sub(r"[ \t]+", " ", combined)
        combined = re.sub(r"\n{3,}", "\n\n", combined)
        return {
            "text": combined[:20000],
            "chars": len(combined),
            "pages": len(reader.pages),
            "cpts": extract_cpts(combined),
            "claim_number": extract_claim_number(combined),
            "filename": file.filename,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {e}")

@app.post("/api/appeal/start")
def start_appeal(req: StartRequest):
    if not req.patient_name.strip() or not req.denial_reason.strip():
        raise HTTPException(status_code=422, detail="patient_name and denial_reason required")
    if len(req.denial_reason.strip()) < 30:
        raise HTTPException(status_code=422, detail="Please paste the full denial letter text (at least 30 characters).")

    context, docs, provider_key = retrieve_policy_context(req.denial_reason, req.provider)

    # Build initial messages
    from langchain_core.messages import HumanMessage, AIMessage
    from langchain_mistralai import ChatMistralAI
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.output_parsers import StrOutputParser

    llm = ChatMistralAI(mistral_api_key=MISTRAL_API_KEY, model="mistral-small-latest", temperature=0.0)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="messages"),
    ])
    chain = prompt | llm | StrOutputParser()

    initial_input = f"Patient: {req.patient_name}\nDenial Reason: {req.denial_reason}"
    messages = [HumanMessage(content=initial_input)]
    try:
        raw = chain.invoke({"context": context, "messages": messages})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    clean, draft = parse_agent_response(raw)
    messages.append(AIMessage(content=clean, additional_kwargs={"draft": draft}))

    session_id = str(uuid.uuid4())
    # Serialize for API — normalize Windows paths, use human page numbers
    serial_docs = [
        {"source": _basename(d.metadata.get("source", "Unknown")), "full_source": d.metadata.get("source", "Unknown"), "page": _display_page(d.metadata), "preview": d.page_content[:520], "content": d.page_content}
        for d in docs
    ]

    cpts = extract_cpts(req.denial_reason)
    claim_no = extract_claim_number(req.denial_reason)

    _sessions[session_id] = {
        "patient_name": req.patient_name,
        "provider": provider_key,
        "cpts": cpts,
        "claim_number": claim_no,
        "context": context,
        "docs": serial_docs,
        "_raw_docs": docs,  # keep for followups
        "messages": [{"role": "user", "content": initial_input}, {"role": "assistant", "content": clean, "draft": draft}],
        "_lc_messages": messages,
    }

    return {
        "session_id": session_id,
        "provider": provider_key,
        "cpts": cpts,
        "claim_number": claim_no,
        "reply": clean,
        "draft": draft,
        "sources": serial_docs,
        "messages": _sessions[session_id]["messages"],
    }


@app.post("/api/appeal/{session_id}/message")
def followup(session_id: str, req: FollowupRequest):
    # Allow either path session_id or body session_id
    sid = session_id or req.session_id
    if sid not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found. Please start a new appeal.")
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    sess = _sessions[sid]
    from langchain_core.messages import HumanMessage, AIMessage
    from langchain_mistralai import ChatMistralAI
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.output_parsers import StrOutputParser

    # Append user message
    lc_msgs = sess["_lc_messages"]
    lc_msgs.append(HumanMessage(content=req.message))
    sess["messages"].append({"role": "user", "content": req.message})

    llm = ChatMistralAI(mistral_api_key=MISTRAL_API_KEY, model="mistral-small-latest", temperature=0.0)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="messages"),
    ])
    chain = prompt | llm | StrOutputParser()
    try:
        raw = chain.invoke({"context": sess["context"], "messages": lc_msgs})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    clean, draft = parse_agent_response(raw)
    lc_msgs.append(AIMessage(content=clean, additional_kwargs={"draft": draft}))
    sess["messages"].append({"role": "assistant", "content": clean, "draft": draft, "sources": sess["docs"] if draft else None})

    return {
        "session_id": sid,
        "reply": clean,
        "draft": draft,
        "sources": sess["docs"],
        "messages": sess["messages"],
        "provider": sess["provider"],
        "cpts": sess.get("cpts", []),
        "claim_number": sess.get("claim_number"),
    }


@app.get("/api/appeal/{session_id}")
def get_session(session_id: str):
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    s = _sessions[session_id]
    return {"session_id": session_id, "provider": s["provider"], "patient_name": s["patient_name"], "messages": s["messages"], "sources": s["docs"], "cpts": s.get("cpts", []), "claim_number": s.get("claim_number")}


@app.get("/api/demo-denial")
def demo_denial():
    # Use the canned example for Try Demo button
    p = ROOT / "notes" / "denied.md"
    if p.exists():
        text = p.read_text()
        # Strip leading [Medicare] marker if present
        text = re.sub(r"^\[.*?\]\s*\n*", "", text).strip()
        return {"text": text}
    return {"text": ""}

# Vercel-style handler compat
handler = app
