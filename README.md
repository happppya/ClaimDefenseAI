# ClaimDefenseAI — Overturn denied claims in minutes, not months

> **Production replacement for the hackathon Streamlit prototype.** React + Vite frontend, FastAPI + Chroma RAG backend. Zero hallucinations: every appeal is grounded in the payer's own policy with **source + page** citations.

## What it does
- **Paste or upload** a denial letter (text or text-based PDF, max 6MB/20 pages)
- **Auto-detects payer** (aetna/cigna/UHC/BCBS/medicare) and **CPT codes**; manual override available
- **Filtered RAG** over ~700 LCD/NCD PDFs (≈12k chunks) via **Chroma** + **Mistral embeddings** — only the selected payer's chunks are retrieved (4 best excerpts surfaced with page numbers)
- **Agentic draft** with `mistral-small-latest` at `temperature=0.0` — asks **one** clarifying question if context is thin, otherwise emits a `<FINAL_LETTER>`; refuses to hallucinate (`INSUFFICIENT POLICY DATA`)
- **Chat to refine** with the same grounded context; copy, open-in-tab/print, or download `.txt`

The hackathon Streamlit code (`src/backend.py`, `src/main.py`, Streamlit components/utils) has been **removed**. The product is the `src/` React app + `api/` FastAPI service.

## Stack
- **Frontend:** React 18, React Router, Vite, Tailwind, Framer Motion (`src/`)
- **Backend:** FastAPI, `pypdf`, `langchain` + `langchain-mistralai` + `langchain-community`, **Chroma** persistent (`chroma_db_storage/chroma.sqlite3` ~98MB), `policies/` pre-split by provider

## Quick start (local)
```bash
bun install          # or npm install
# create .env at repo root (see .env.example if present)
echo "MISTRAL_API_KEY=sk-..." > .env
sh scripts/start.sh   # starts API on 127.0.0.1:8000 then Vite on $PORT (default 5173)
# -> http://localhost:5173  ( /api proxied to 127.0.0.1:8000 )
```
Other scripts: `bun run dev` (Vite only), `bun run build` (static `dist/`), `bun run preview`.

### Env vars
- `MISTRAL_API_KEY` — **required** (Mistral console). Without it the API returns 503 with `MISTRAL_API_KEY not configured`; the frontend shows “Mistral key OK / Set MISTRAL_API_KEY”.
- Optional overrides used by `api/index.py`: `CHROMA_DIR`, `POLICIES_DIR` (defaults are repo-relative).

### Data dirs (checked in / prebuilt)
- `policies/medicaid/`, `policies/medicare/` — ~713 PDFs scraped from CMS LCDs
- `chroma_db_storage/` — persisted Chroma DB (no cold scrape needed); ignored on write (`*.lock`)

## Development notes
- Streamlit is gone: there is no `requirements.txt` at repo root; Python deps are `api/requirements.txt` only.
- PDF extraction (`POST /api/extract-pdf`) is text-only — **scanned/image PDFs** have no extractable text; paste instead. The frontend surfaces chars/pages/CPTs/claim number from the upload.
- `api/index.py` exposes `handler = app` for Vercel-style serverless; local dev uses `uvicorn api.index:app`.

## Project origins
Atlanta Divergent Teams Hackathon 2026. Original idea: “Appealing denial letters costs billions — LLMs hallucinate — so load real payer policy into Chroma and cite it.”

## Disclaimer
Drafting aid only — not legal or medical advice. Human review required before submission. Policy excerpts © their payers.
