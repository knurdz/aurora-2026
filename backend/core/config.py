from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    chroma_host: str
    chroma_port: int
    ollama_host: str
    ollama_model: str
    fastapi_env: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()