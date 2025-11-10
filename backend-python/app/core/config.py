"""
Configuration management for ITSM AI Backend.
"""
from typing import Optional

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Service configuration
    service_name: str = "itsm-ai-backend"
    service_version: str = "1.0.0"
    log_level: str = "INFO"
    
    # JWT Authentication (must match Node backend)
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    
    # Database configuration
    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "itsm_db"
    db_user: str = "postgres"
    db_password: str = "postgres"
    
    # Model configuration (for future phases)
    model_dir: str = "/app/.models"
    embed_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    combine_weight: float = 0.65

    # LM Studio configuration
    lm_studio_base_url: str = "http://host.docker.internal:1234/v1"
    lm_studio_base_url_fallback: Optional[str] = "http://169.254.83.107:1234/v1"
    lm_studio_model: str = "text-embedding-qwen3-embedding-8b"

    # Optional CORS overrides (comma-separated list)
    additional_cors_origins: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
