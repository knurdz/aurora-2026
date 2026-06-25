from pydantic_settings import BaseSettings

class Settings(BaseSettings):
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
    
    fastapi_env: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()