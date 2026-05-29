import os
import re
from dotenv import load_dotenv

# 1. CRITICAL: Load the env vars BEFORE setting any variables or doing heavy imports
load_dotenv()
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_mistralai import MistralAIEmbeddings, ChatMistralAI
from langchain_community.vectorstores import Chroma
from langchain_core.output_parsers import StrOutputParser

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

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

def retrieve_policy_context(denial_reason, vector_db, provider=None):
    """Retrieves context filtered by provider. Runs ONCE per session."""
    if not provider:
        provider = extract_provider_from_text(denial_reason)
    
    provider_key = provider.lower().strip()
    search_kwargs = {"k": 4}
    
    if provider_key and provider_key != 'unknown':
        search_kwargs["filter"] = {"provider": provider_key}

    retriever = vector_db.as_retriever(search_kwargs=search_kwargs)
    retrieved_docs = retriever.invoke(denial_reason)
    
    context_parts = []
    for i, doc in enumerate(retrieved_docs):
        source = doc.metadata.get('source', 'Unknown Document')
        page = doc.metadata.get('page', 'Unknown Page')
        content = doc.page_content
        context_parts.append(f"--- SOURCE {i+1}: {source} (Page {page}) ---\n{content}")
    
    context_text = "\n\n".join(context_parts)
    return context_text, retrieved_docs, provider_key

def chat_with_agent(messages, context_text, patient_name):
    """Handles the multi-turn conversation with the LLM."""
    llm = ChatMistralAI(
        mistral_api_key=MISTRAL_API_KEY, 
        model="mistral-large-latest",
        temperature=0.1
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="messages")
    ])

    rag_chain = prompt | llm | StrOutputParser()

    # We inject the context into the system prompt at runtime
    answer = rag_chain.invoke({
        "context": context_text,
        "messages": messages
    })
    
    return answer

def build_vector_db(policies_dir="policies", persist_dir="./chroma_db_storage"):
    embeddings = MistralAIEmbeddings(mistral_api_key=MISTRAL_API_KEY)
    
    if os.path.exists(persist_dir) and os.listdir(persist_dir):
        print("Loading existing ChromaDB...")
        return Chroma(persist_directory=persist_dir, embedding_function=embeddings)
        
    if not os.path.exists(policies_dir):
        os.makedirs(policies_dir)
        return None
        
    loader = PyPDFDirectoryLoader(policies_dir, recursive=True)
    documents = loader.load()
    if not documents: return None

    for doc in documents:
        path_parts = os.path.normpath(doc.metadata.get("source", "")).split(os.sep)
        if len(path_parts) >= 3:
            provider_name = path_parts[-2].lower().strip()
            doc.metadata["provider"] = provider_name
        else:
            doc.metadata["provider"] = "general"

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(documents)
    
    print("Building and persisting new ChromaDB...")
    vectorstore = Chroma.from_documents(
        documents=splits, 
        embedding=embeddings,
        persist_directory=persist_dir 
    )
    return vectorstore

def extract_provider_from_text(denial_reason):
    """Uses a fast LLM call to extract the insurance provider from the denial letter."""
    try:
        # 4. FREE TIER FIX: Dropped to open-mistral-7b for fast, free extraction
        llm = ChatMistralAI(
            mistral_api_key=MISTRAL_API_KEY, 
            model="open-mistral-7b",
            temperature=0.0,
            max_retries=3
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an extraction assistant. Read the medical denial text and identify the insurance provider. "
                    "You MUST map the provider to one of the following exact keys: "
                    "[aetna, cigna, unitedhealthcare, bluecross, medicare]. "
                    "If it is United Healthcare or UHC, output 'unitedhealthcare'. "
                    "Respond ONLY with the exact key string. If unidentifiable, respond with 'unknown'."),
            ("human", "Denial Text:\n{input}")
        ])
        
        chain = prompt | llm | StrOutputParser()
        extracted = chain.invoke({"input": denial_reason}).strip().lower()
        return re.sub(r'[^\w\s]', '', extracted)
        
    except Exception as e:
        print(f"Extraction Pipeline Failed: {e}")
        return "unknown"