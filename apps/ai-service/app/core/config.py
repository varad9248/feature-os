from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "FeatureOS AI Service"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/ai/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # AI & Model settings
    OPENAI_API_KEY: Optional[str] = "mock-openai-key"
    MODEL_NAME: str = "gpt-4o-mini"
    
    # Infrastructure endpoints
    REDIS_URL: str = "redis://localhost:6379"
    CLICKHOUSE_HOST: str = "http://localhost:8123"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/featureos"
    
    model_config = SettingsConfigDict(
        env_file="../../.env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
