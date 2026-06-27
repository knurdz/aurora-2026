from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "verischolar_secret"
    chroma_host: str = "chromadb"
    chroma_port: int = 8000
    ollama_host: str = "http://ollama:11434"
    ollama_model: str = "mistral"
    
    # LLM provider selection
    llm_provider: str = "ollama"                      # "ollama" | "openai"
    openai_api_key: str = ""                           # API key
    openai_endpoint: str = "https://api.openai.com"    # Custom endpoint URL
    openai_model: str = "gpt-4o-mini"                  # Model name

    # Citation resolution tuning
    citation_crossref_concurrency: int = 8
    citation_semantic_scholar_concurrency: int = 4
    citation_request_timeout: float = 12.0

    # Page-level claim extraction tuning
    claim_page_concurrency: int = 3
    claim_page_timeout: float = 180.0
    
    fastapi_env: str = "development"

    # Public app/auth configuration
    frontend_base_url: str = "https://verischolar.knurdz.org"
    allowed_cors_origins: str = "https://verischolar.knurdz.org,http://localhost:3000,http://127.0.0.1:3000"
    allowed_csrf_origins: str = "https://verischolar.knurdz.org,http://localhost:3000,http://127.0.0.1:3000"
    app_db_path: str = "/data/verischolar.sqlite3"
    mcp_server_url: str = "https://verischolar.knurdz.org/api/mcp/"
    mcp_allowed_hosts: str = "verischolar.knurdz.org,localhost:8000,127.0.0.1:8000"
    max_upload_bytes: int = 52_428_800

    # Google OAuth web application credentials
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "https://verischolar.knurdz.org/api/auth/google/callback"

    # Session/API-key security. Override these in production.
    session_secret: str = "dev-insecure-session-secret-change-me"
    session_cookie_name: str = "verischolar_session"
    session_cookie_secure: bool = False
    session_ttl_seconds: int = 60 * 60 * 24 * 7
    oauth_state_ttl_seconds: int = 10 * 60
    api_key_pepper: str = "dev-insecure-api-key-pepper-change-me"

    # Public beta limits
    rate_limit_analysis_per_day: int = 5
    rate_limit_analysis_per_hour: int = 2
    rate_limit_reads_per_minute: int = 120
    rate_limit_active_analyses_per_user: int = 1
    max_active_api_keys_per_user: int = 5

    # FastAPI docs are disabled in production unless explicitly enabled.
    enable_api_docs: bool = False

settings = Settings()
