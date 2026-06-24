# Verischolar

Verischolar is a research-integrity toolkit that runs a multi-stage pipeline to parse scholarly documents, extract claims and citations, build a citation graph, embed uncited claims, and run statistical and heuristic detectors to produce an integrity score and audit report.

Repository layout

- `backend/`: Python backend, ingestion pipeline, and core analysis modules.
- `frontend/`: Frontend app (placeholder).
- `docker-compose.yml`: Development compose configuration.

Summary of functionality

- Document parsing: PDF (`PyMuPDF`) and DOCX (`python-docx`) parsing into page-like text chunks (`backend/ingestion/parser.py`).
- Citation detection: APA parenthetical and narrative detection, numbered citations, and DOI extraction (`backend/ingestion/citation_detector.py`).
- Claim extraction: LLM-based claim classification via Ollama HTTP API with boilerplate heuristics (`backend/ingestion/claim_classifier.py`).
- Embeddings: Sentence-transformers embeddings (`all-MiniLM-L6-v2`) stored in ChromaDB via HTTP client for uncited claim search (`backend/ingestion/embeddings.py`).
- Graph building: Resolve citations (DOI/CrossRef), enrich via Semantic Scholar, and persist Paper/Author/Journal/Funder nodes and CITES edges to Neo4j (`backend/core/graph_builder.py`).
- Community & fraud analysis: Community detection and four statistical checks (GRIM, p-curve, small-sample, funding conflict) aggregated into `fraud_results` (`backend/core/community_detector.py`, `backend/core/fraud_detector.py`).
- Scoring & reporting: integrity score computation and Markdown audit report generation (`backend/core/integrity_scorer.py`, `backend/core/audit_reporter.py`).

API endpoints

- `GET /health`: service health and connectivity summary (Neo4j, ChromaDB, Ollama model).
- `POST /analyze`: upload a PDF or DOCX file to run the full pipeline; returns a JSON summary and `audit_report` (Markdown).

Example usage

Start services (recommended via Docker Compose):

```bash
docker compose up --build
```

Upload a file to analyze:

```bash
curl -F "file=@./paper.pdf" http://localhost:8000/analyze
```

Typical response fields

- `doc_id`, `pages_parsed`, `claims_found`, `citations_found`
- `integrity_score` (score, verdict, breakdown)
- `fraud_risk` and sub-results (`grim`, `p_curve`, `sample_size_flags`, `funding_conflicts`)
- `citations_resolved`, `cartel_risk`, `suspicious_clusters`, `retracted_papers`
- `audit_report` (Markdown string)

Configuration (environment variables)

- See `backend/core/config.py` for concrete config names. Common values to set:
	- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
	- `CHROMA_HOST`, `CHROMA_PORT`
	- `OLLAMA_HOST`, `OLLAMA_MODEL`
	- API keys for CrossRef / Semantic Scholar if required

Primary technologies and libraries

- Python 3.10+
- FastAPI (HTTP API)
- PyMuPDF (`fitz`) and python-docx (parsing)
- chromadb (ChromaDB HTTP client)
- sentence-transformers (`all-MiniLM-L6-v2`) for embeddings
- neo4j Python driver for graph storage
- scipy for statistical tests
- httpx for HTTP calls to Ollama and other services

Important notes and limitations

- DOCX documents are chunked into pseudo-pages (character-based) which can affect proximity-based heuristics.
- Claim extraction depends on the configured Ollama model and prompt; accuracy varies with model choice and prompt tuning.
- Citation resolution prefers DOI matches; fuzzy CrossRef searches may produce imperfect matches.
- Fraud detection is statistical/heuristic and intended to flag items for manual review, not to produce definitive legal conclusions.

Where to look in the code

- Backend entry: `backend/main.py`
- Pipeline orchestration: `backend/core/langgraph_app.py`
- Parsers & detectors: `backend/ingestion/` (`parser.py`, `citation_detector.py`, `claim_classifier.py`, `embeddings.py`)
- Graph & enrichment: `backend/core/graph_builder.py`, `backend/core/crossref_client.py`, `backend/core/semantic_scholar_client.py`

Next steps I can take

- Extract exact dependency versions from `backend/requirements.txt` and add them here.
- Add example API request/response snippets and an example audit report.
- Create a `LICENSE` file (MIT) and a minimal GitHub Actions CI workflow.

If you want the README adjusted further to emphasize any changed files or new behavior, tell me which areas to expand.
