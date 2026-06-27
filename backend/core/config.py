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

settings = Settings()
