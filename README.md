# Verischolar

Verischolar is a research-integrity toolkit that runs a multi-stage pipeline to parse scholarly documents, extract claims and citations, build a citation graph, embed uncited claims, and run statistical and heuristic detectors to produce an integrity score and audit report.

## Repository Layout

- `backend/`: Python backend, ingestion pipeline, and core analysis modules.
- `frontend/`: Next.js frontend app for upload, live analysis progress, audit reports, history, and settings.
- `docker-compose.yml`: Development compose configuration.

## Summary of Functionality

- Document parsing: PDF (`PyMuPDF`) and DOCX (`python-docx`) parsing into page-like text chunks (`backend/ingestion/parser.py`).
- Citation detection: APA parenthetical and narrative detection, numbered citations, DOI extraction, and bibliography/reference-list extraction (`backend/ingestion/citation_detector.py`, `backend/ingestion/reference_extractor.py`).
- Claim extraction: LLM-based claim classification via Ollama or OpenAI-compatible APIs with boilerplate heuristics and bounded page-level concurrency (`backend/ingestion/claim_classifier.py`, `backend/core/langgraph_app.py`).
- Embeddings: Sentence-transformers embeddings (`all-MiniLM-L6-v2`) stored in ChromaDB via HTTP client for uncited claim search (`backend/ingestion/embeddings.py`).
- Graph building: Resolve citations through CrossRef, enrich via Semantic Scholar, deduplicate repeated citations, and persist Paper/Author/Journal/Funder nodes and CITES edges to Neo4j (`backend/core/graph_builder.py`).
- Community & fraud analysis: Community detection and four statistical checks (GRIM, p-curve, small-sample, funding conflict) aggregated into `fraud_results` (`backend/core/community_detector.py`, `backend/core/fraud_detector.py`).
- Scoring & reporting: integrity score computation and Markdown audit report generation (`backend/core/integrity_scorer.py`, `backend/core/audit_reporter.py`).

## Quick Start

Start services (recommended via Docker Compose):

```bash
docker compose up --build
```

Upload a file to analyze:

```bash
curl -F "file=@./paper.pdf" http://localhost:8000/analyze
```

Then stream progress and fetch the result:

```bash
curl http://localhost:8000/events/<doc_id>
curl http://localhost:8000/analysis/<doc_id>
```

## API

### Endpoints

- `GET /health`: service health and connectivity summary.
- `GET /config`: active LLM provider, model, and endpoint summary.
- `GET /history`: recent in-memory analysis summaries.
- `GET /analysis/{doc_id}`: fetch a completed analysis.
- `GET /events/{doc_id}`: Server-Sent Events stream for analysis progress logs.
- `POST /analyze`: upload a PDF or DOCX file to run the full pipeline; returns a processing status and `doc_id`.

When the frontend is served through Nginx, public API calls are routed through `/api/*` and proxied to the backend. Direct local backend calls use the backend port directly, such as `http://localhost:8000/analyze`.

### Typical Response Fields

- `doc_id`, `pages_parsed`, `claims_found`, `citations_found`, `reference_count`, `citation_mentions_found`
- `integrity_score`, `integrity_verdict`, `score_breakdown`
- `fraud_risk` and sub-results (`grim`, `p_curve`, `sample_size_flags`, `funding_conflicts`)
- `citations_resolved`, `cartel_risk`, `suspicious_clusters`, `retracted_papers`
- `audit_report` (Markdown string)

## Configuration

- Backend values are loaded from `.env` through `backend/core/config.py`.
- Database and vector store:
  - `NEO4J_URI` (default `bolt://neo4j:7687`)
  - `NEO4J_USER` (default `neo4j`)
  - `NEO4J_PASSWORD` (default `verischolar_secret`)
  - `CHROMA_HOST` (default `chromadb`)
  - `CHROMA_PORT` (default `8000`)
- LLM provider:
  - `LLM_PROVIDER` (`ollama` or `openai`, default `ollama`)
  - `OLLAMA_HOST` (default `http://ollama:11434`)
  - `OLLAMA_MODEL` (default `mistral`)
  - `OPENAI_API_KEY`
  - `OPENAI_ENDPOINT` (default `https://api.openai.com`)
  - `OPENAI_MODEL` (default `gpt-4o-mini`)
- Pipeline tuning:
  - `CLAIM_PAGE_CONCURRENCY` (default `3`): concurrent per-page LLM claim extraction workers. Lower this for local Ollama if the machine is resource constrained.
  - `CLAIM_PAGE_TIMEOUT` (default `180`): timeout in seconds for each page-level claim extraction LLM call.
  - `CITATION_CROSSREF_CONCURRENCY` (default `8`): concurrent CrossRef resolution requests.
  - `CITATION_SEMANTIC_SCHOLAR_CONCURRENCY` (default `4`): concurrent Semantic Scholar enrichment requests.
  - `CITATION_REQUEST_TIMEOUT` (default `12`): timeout in seconds for citation metadata requests.
- Runtime:
  - `FASTAPI_ENV` (default `development`)

## Frontend

Frontend configuration lives in `frontend/.env.local` for local development:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

In production, the frontend defaults to relative `/api` routes so Nginx can proxy requests to the backend.

Frontend development commands:

```bash
cd frontend
npm install
npm run dev
npm run build
npm run start
npm run lint
```

Important frontend paths:

- `frontend/src/app/page.js`: upload workspace entry screen.
- `frontend/src/app/analyze/[id]/page.js`: live Server-Sent Events progress screen.
- `frontend/src/app/audit/page.js`: recent analysis/history view.
- `frontend/src/app/report/[id]/page.js`: audit report view.
- `frontend/src/app/settings/page.js`: backend configuration summary.
- `frontend/src/lib/api.js`: API helper functions and `NEXT_PUBLIC_API_URL` handling.

## Deployment

Deployment helper:

```bash
./deploy.sh
```

The deployment helper checks for Docker and Docker Compose, creates `.env` interactively when one is missing, starts the Ollama profile when `LLM_PROVIDER=ollama`, and runs `docker compose up -d --build`.

## Primary Technologies and Libraries

- Python 3.10+
- FastAPI (HTTP API)
- PyMuPDF (`fitz`) and python-docx (parsing)
- chromadb (ChromaDB HTTP client)
- sentence-transformers (`all-MiniLM-L6-v2`) for embeddings
- neo4j Python driver for graph storage
- scipy for statistical tests
- httpx for HTTP calls to Ollama and other services

## Important Notes and Limitations

- DOCX documents are chunked into pseudo-pages (character-based) which can affect proximity-based heuristics.
- Claim extraction depends on the configured Ollama model and prompt; accuracy varies with model choice and prompt tuning.
- Citation resolution prefers DOI matches; fuzzy CrossRef searches may produce imperfect matches.
- Bibliography/reference extraction prefers explicit `References`, `Bibliography`, `Literature Cited`, or `Works Cited` sections and falls back from numbered references to author-year parsing.
- Increasing LLM or citation concurrency can reduce wall-clock time, but very high values may hit model, CPU/GPU, or public API rate limits.
- Fraud detection is statistical/heuristic and intended to flag items for manual review, not to produce definitive legal conclusions.

## Where to Look in the Code

- Backend entry: `backend/main.py`
- Pipeline orchestration: `backend/core/langgraph_app.py`
- Parsers & detectors: `backend/ingestion/` (`parser.py`, `citation_detector.py`, `claim_classifier.py`, `embeddings.py`)
- Graph & enrichment: `backend/core/graph_builder.py`, `backend/core/crossref_client.py`, `backend/core/semantic_scholar_client.py`

## Next Steps I Can Take

- Extract exact dependency versions from `backend/requirements.txt` and add them here.
- Add example API request/response snippets and an example audit report.
- Create a `LICENSE` file (MIT) and a minimal GitHub Actions CI workflow.

If you want the README adjusted further to emphasize any changed files or new behavior, tell me which areas to expand.
