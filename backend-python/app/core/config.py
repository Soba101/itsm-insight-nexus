"""
Configuration management for ITSM AI Backend.
"""
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
