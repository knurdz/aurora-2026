# Verischolar

Verischolar is a research-integrity toolkit that ingests scholarly metadata and text, builds citation/claim graphs, and runs heuristics and analysis to detect questionable or fraudulent patterns.

**Repository layout**

- [backend/](backend/): Python backend, ingestion pipeline, and core analysis modules (community detector, fraud detector, graph builder, etc.).
- [frontend/](frontend/): Frontend application (placeholder — add framework-specific docs if present).
- [docker-compose.yml](docker-compose.yml): Development compose config used to run services together.

**Features**

- Ingests publication metadata and content from external sources.
- Builds citation and claim graphs for analysis.
- Heuristics and ML-based detectors for suspicious citation/claim behavior.
- Modular ingestion and analysis components to extend with new sources and detectors.

**Technologies used**

- Language: Python 3.10+
- Web framework: (see `backend/main.py` for the chosen server framework)
- Containerization: Docker + Docker Compose
- Data processing: pandas / numpy (check `backend/requirements.txt`)
- External integrations: Crossref, Semantic Scholar (clients in `backend/core/`)

If you'd like me to list concrete package names and versions, I can extract them from [backend/requirements.txt](backend/requirements.txt).

Getting started
---------------

Prerequisites

- Docker & Docker Compose (for containerized development)
- Python 3.10+ (for local development)
- Git

Quickstart — Docker Compose (recommended for development)

1. Build and start services:

```bash
docker compose up --build
```

2. Inspect service logs and ports in `docker-compose.yml`.

3. By default, API endpoints and ports are defined in [docker-compose.yml](docker-compose.yml) and the backend service; open those files to confirm ports and environment variables.

Run backend locally (without Docker)

1. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Run the backend server:

```bash
python backend/main.py
```

4. Confirm the server is running by checking logs or visiting the configured port (see [backend/main.py](backend/main.py)).

Configuration & environment variables

- Check `docker-compose.yml` and the backend code for environment variables used by services (API keys, DB URLs, ports).
- Common variables you may need to set:
	- `CROSSREF_API_KEY` — Crossref access (if required)
	- `SEMANTIC_SCHOLAR_API_KEY` — Semantic Scholar access (if used)
	- `DATABASE_URL` — DB connection string (if persistence is configured)

Default ports and endpoints

- Exact ports and exposed endpoints are declared in [docker-compose.yml](docker-compose.yml) and the backend entrypoint [backend/main.py](backend/main.py).
- Core application modules live in [backend/core/](backend/core/) (for example, [backend/core/langgraph_app.py](backend/core/langgraph_app.py), [backend/core/fraud_detector.py](backend/core/fraud_detector.py)).

How to use the backend (overview)

1. Ingest data: Use the ingestion modules in [backend/ingestion/](backend/ingestion/) to parse sources and produce intermediate artifacts.
2. Build graphs: The graph builder constructs citation/claim graphs from ingested records.
3. Analyze: Run detectors in `backend/core/` (fraud detector, community detector) against the built graphs.
