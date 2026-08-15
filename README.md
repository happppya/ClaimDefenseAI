# ClaimDefenseAI

## What it does
- **Paste or upload** a denial letter (text or text-based PDF, max 6MB/20 pages)
- **Auto-detects payer** (aetna/cigna/UHC/BCBS/medicare) and **CPT codes**; manual override available
- **Filtered RAG** over ~700 LCD/NCD PDFs (≈12k chunks) via **Chroma** + **Mistral embeddings** — only the selected payer's chunks are retrieved (4 best excerpts surfaced with page numbers)
- **Agentic draft** with `mistral-small-latest` at `temperature=0.0` — asks **one** clarifying question if context is thin, otherwise emits a `<FINAL_LETTER>`; refuses to hallucinate (`INSUFFICIENT POLICY DATA`)
- **Chat to refine** with the same grounded context; copy, open-in-tab/print, or download `.txt`

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

### Data dirs
- `policies/medicaid/`, `policies/medicare/` — ~713 PDFs scraped from CMS LCDs
- `chroma_db_storage/` — persisted Chroma DB (no cold scrape needed); ignored on write (`*.lock`)

## Project origins
Originally made at Atlanta Divergent Teams Hackathon 2026. We identified that appealing denial letters costs billions.
Automating the process through LLMs was risky because of hallucinations, so we built in real payer policy into Chroma and enforced citations.

## Disclaimer
Drafting aid only. Not legal or medical advice. Human review required before submission. Policy excerpts © their payers.
