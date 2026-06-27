# VeriScholar Project & Deployment Guide

This document provides a comprehensive overview of the VeriScholar project structure, its architecture, deployment procedures, and guidelines for redeploying and making changes.

---

## 1. Project Overview & Architecture

VeriScholar is a research integrity verification tool that analyzes scientific papers (PDF/DOCX) to detect:
- **Claim Isolation**: Extracting claims from pages using LLM agents.
- **Citation Cartels**: Resolving citation networks via CrossRef / Semantic Scholar and detecting suspicious citation circles (using Louvain community detection in Neo4j).
- **Statistical Fraud**: Audit tools running p-curve analysis (for p-hacking), GRIM testing (for mathematical anomalies in reported means), study power, and conflict of interest scanning.
- **Scoring & Report Generation**: Compiling audits and calculating a weighted paper integrity score.

### Tech Stack
- **Backend**: Python, FastAPI, LangGraph (multi-agent orchestration), ChromaDB (vector database for claim matching), Neo4j (graph database for citations).
- **Frontend**: Next.js 16 (App Router, Turbopack, vanilla CSS) running in a standalone Node container.
- **Reverse Proxy**: Nginx (handling SSL certificate paths and real-time streaming support).
- **LLM Integrations**: Pluggable provider system supporting Ollama (local) or OpenAI/Azure OpenAI (cloud).

---

## 2. Directory Structure

```text
aurora-2026/
├── backend/                   # FastAPI backend
│   ├── core/
│   │   ├── llm_client.py      # LLM abstraction (OpenAI / Ollama)
│   │   ├── langgraph_app.py   # LangGraph agent definition & progress callbacks
│   │   ├── progress_manager.py# Thread-safe SSE log manager
│   │   └── ...
│   ├── ingestion/             # Document parsing, embeddings, claim extraction
│   ├── main.py                # Main FastAPI entry point and endpoints
│   └── Dockerfile
├── frontend/                  # Next.js 16 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js        # File upload UI
│   │   │   ├── analyze/       # SSE terminal log screen
│   │   │   ├── report/        # Audit report layout and markdown viewer
│   │   │   └── settings/      # Read-only configuration page
│   │   ├── lib/api.js         # API integration client
│   │   └── components/
│   └── Dockerfile
├── nginx/
│   └── nginx.conf             # Nginx routing and SSE buffering parameters
├── deploy.sh                  # One-command VPS deployment script
└── docker-compose.yml         # Container definitions
```

---

## 3. Configuration (`.env`)

Configuration settings are loaded server-side from a `.env` file in the project root:

```ini
# LLM Provider Configuration
LLM_PROVIDER=openai # "openai" or "ollama"
OPENAI_API_KEY=your_key_here
OPENAI_ENDPOINT=https://api.openai.com
OPENAI_MODEL=gpt-4o-mini

# Database Configuration
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=verischolar_secret
CHROMA_HOST=chromadb
CHROMA_PORT=8000
```

---

## 4. Deployment Procedure

Deploying VeriScholar to a fresh Ubuntu VPS with the domain `verischolar.knurdz.org` is fully automated.

### Initial Setup
1. Point your domain DNS record (`A` record) to the VPS public IP.
2. SSH into your VPS:
   ```bash
   ssh user@vps_ip
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/knurdz/aurora-2026.git
   cd aurora-2026
   ```
4. Run the deploy script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
   *The script will automatically install Docker if missing, ask for your LLM configuration, generate the `.env` file, request SSL certificates from Let's Encrypt, and start the Docker container stack.*

---

## 5. Redeploying & Making Changes

When you make changes to the codebase and want to apply them, follow these procedures:

### A. Quick Update (Git Pull + Rebuild)
The `deploy.sh` script contains a helper to pull the latest changes from the main branch and rebuild only the affected containers:

```bash
./deploy.sh update
```
This command performs:
1. `git pull`
2. `docker compose up -d --build` (which builds updated images and replaces running containers with zero downtime for unchanged containers)
3. Restarts Nginx to refresh routing configurations.

### B. Manual Docker Compose Commands
If you need granular control, you can use raw docker compose commands on the VPS:

- **Rebuild and restart a specific container (e.g., backend)**:
  ```bash
  docker compose up -d --build backend
  ```
- **Rebuild and restart the frontend**:
  ```bash
  docker compose up -d --build frontend
  ```
- **Restart Nginx (without rebuild)**:
  ```bash
  docker compose restart nginx
  ```
- **Stop all services**:
  ```bash
  docker compose down
  ```
- **View live container logs**:
  ```bash
  # View all container logs
  docker compose logs -f
  
  # View only backend logs
  docker compose logs -f backend
  ```

### C. SSL Certificate Renewal
Let's Encrypt certificates are valid for 90 days. To renew them manually, run:
```bash
./deploy.sh ssl-renew
```

---

## 6. Real-time Log Architecture (SSE)

If you modify how progress logging works, keep the following flow in mind:
1. Graph nodes inside `backend/core/langgraph_app.py` call `_emit(doc_id, message)`.
2. This invokes the registered callback in `backend/main.py`, which routes the string to `progress_manager.emit(...)`.
3. The client connects to `GET /api/events/{doc_id}` via Next.js `EventSource`.
4. **Nginx Buffering**: Nginx must not buffer events. Ensure the `proxy_buffering off;` and `proxy_cache off;` directives are present in `nginx/nginx.conf` under the `location /api/` block.
