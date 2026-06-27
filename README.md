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

Open the app at `http://localhost:3000`, sign in with Google, create an API key in the dashboard, then upload from the browser or call the public REST API.

Public REST API example:

```bash
curl -X POST http://localhost:8000/v1/analyses \
  -H "Authorization: Bearer vs_live_..." \
  -F "file=@./paper.pdf"
```

Then stream progress or fetch the result:

```bash
curl -N http://localhost:8000/v1/analyses/<analysis_id>/events \
  -H "Authorization: Bearer vs_live_..."

curl http://localhost:8000/v1/analyses/<analysis_id> \
  -H "Authorization: Bearer vs_live_..."
```

MCP clients can use the same dashboard-created API keys with the Streamable HTTP endpoint:

```bash
# Local backend endpoint
http://localhost:8000/mcp/

# Production endpoint through Nginx
https://verischolar.knurdz.org/api/mcp/
```

## API

### Authenticated Browser Endpoints

- `GET /health`: service health and connectivity summary.
- `GET /auth/google/start`: starts Google OAuth sign-in.
- `GET /auth/google/callback`: Google OAuth callback.
- `GET /auth/me`: current session user.
- `POST /auth/logout`: revokes the current session.
- `GET /dashboard/summary`: usage, limits, and recent analyses for the signed-in user.
- `GET /dashboard/api-keys`: list dashboard-managed API keys.
- `POST /dashboard/api-keys`: create an API key. The secret is returned once.
- `DELETE /dashboard/api-keys/{key_id}`: revoke an API key.
- `GET /config`: active LLM provider, model, and endpoint summary. Requires login.
- `GET /history`: recent user-owned analysis summaries. Requires login.
- `GET /analysis/{doc_id}`: fetch a user-owned analysis. Requires login.
- `GET /events/{doc_id}`: Server-Sent Events stream for user-owned progress logs. Requires login.
- `POST /analyze`: upload a PDF or DOCX from the dashboard. Requires login.

### Public REST API

All public v1 endpoints require `Authorization: Bearer <api_key>`.

- `POST /v1/analyses`: upload a PDF or DOCX; returns `202` with `analysis_id`.
- `GET /v1/analyses`: list analyses owned by the API key's user.
- `GET /v1/analyses/{analysis_id}`: fetch status, result, score, and report.
- `GET /v1/analyses/{analysis_id}/events`: stream analysis progress logs with SSE.

### MCP API

The MCP server is available at `POST /mcp/` locally and `/api/mcp/` through Nginx. It uses Streamable HTTP and requires `Authorization: Bearer <api_key>` on every request.

Available tools:

- `verischolar_submit_analysis`: submit a PDF/DOCX using `filename`, `content_base64`, and optional `mime_type`.
- `verischolar_list_analyses`: list recent analyses for the API key's user.
- `verischolar_get_analysis`: fetch one analysis by `analysis_id`.
- `verischolar_get_analysis_events`: fetch stored progress events from a zero-based `after_index`.
- `verischolar_wait_for_analysis`: wait briefly for new progress events or completion.

Rate-limit headers are returned on limited endpoints:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` on `429`

Default public-beta limits are 5 analysis submissions per day, 2 per hour, 1 active analysis per user, 120 result/status reads per minute, and 5 active API keys per user.

When the frontend is served through Nginx, public API calls are routed through `/api/*` and proxied to the backend. Direct local public REST calls use the backend port directly, such as `http://localhost:8000/v1/analyses`.

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
- Public app/auth:
  - `FRONTEND_BASE_URL` (default `https://verischolar.knurdz.org`)
  - `ALLOWED_CORS_ORIGINS`
  - `ALLOWED_CSRF_ORIGINS`
  - `APP_DB_PATH` (default `/data/verischolar.sqlite3`)
  - `MCP_SERVER_URL` (default `https://verischolar.knurdz.org/api/mcp/`)
  - `MCP_ALLOWED_HOSTS` (default `verischolar.knurdz.org,localhost:8000,127.0.0.1:8000`)
  - `MAX_UPLOAD_BYTES` (default `52428800`)
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - `SESSION_SECRET`
  - `SESSION_COOKIE_SECURE` (`true` in production)
  - `API_KEY_PEPPER`
  - `ENABLE_API_DOCS` (`false` in production by default)
- Public-beta limits:
  - `RATE_LIMIT_ANALYSIS_PER_DAY`
  - `RATE_LIMIT_ANALYSIS_PER_HOUR`
  - `RATE_LIMIT_READS_PER_MINUTE`
  - `RATE_LIMIT_ACTIVE_ANALYSES_PER_USER`
  - `MAX_ACTIVE_API_KEYS_PER_USER`

Generate `SESSION_SECRET` and `API_KEY_PEPPER` with:

```bash
openssl rand -base64 32
```

### Google OAuth Setup

Create or select a Google Cloud project, configure the OAuth consent screen, then create an OAuth 2.0 Client ID with application type `Web application`.

Authorized redirect URIs:

- Production: `https://verischolar.knurdz.org/api/auth/google/callback`
- Local via Next proxy: `http://localhost:3000/api/auth/google/callback`

For local development with the localhost `3000` callback, run the backend on `8000` and set the frontend server env:

```ini
API_PROXY_TARGET=http://localhost:8000
NEXT_PUBLIC_API_URL=/api
```

Copy the generated Google Client ID and Client Secret into `.env` as `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.

## Frontend

Frontend configuration lives in `frontend/.env.local` for local development:

```ini
NEXT_PUBLIC_API_URL=/api
API_PROXY_TARGET=http://localhost:8000
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

- `frontend/src/app/page.js`: public landing page.
- `frontend/src/app/login/page.js`: Google sign-in screen.
- `frontend/src/app/dashboard/page.js`: API key and usage dashboard.
- `frontend/src/components/AuthGate.js`: client-side session guard for protected pages.
- `frontend/src/app/analyze/[id]/page.js`: live Server-Sent Events progress screen.
- `frontend/src/app/audit/page.js`: protected upload workspace.
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
