"""
Validation utilities for Python backend
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, validator, ValidationError
from fastapi import HTTPException, status


class SimilaritySearchRequest(BaseModel):
    """Validation schema for similarity search requests"""
    incident_number: str = Field(..., min_length=1, max_length=50)
    model: Optional[str] = Field(default="qwen3", regex="^(qwen3|gemma)$")
    top_k: Optional[int] = Field(default=5, ge=1, le=100)
    min_similarity: Optional[float] = Field(default=0.7, ge=0.0, le=1.0)

    @validator('incident_number')
    def validate_incident_number(cls, v):
        """Validate and sanitize incident number"""
        if not v or not v.strip():
            raise ValueError('Incident number cannot be empty')
        return v.strip()


class EmbeddingRequest(BaseModel):
    """Validation schema for embedding generation requests"""
    text: str = Field(..., min_length=1, max_length=10000)
    model: Optional[str] = Field(default="qwen3", regex="^(qwen3|gemma)$")

    @validator('text')
    def validate_text(cls, v):
        """Validate and sanitize text input"""
        if not v or not v.strip():
            raise ValueError('Text cannot be empty')
        return v.strip()


class TicketRelationshipRequest(BaseModel):
    """Validation schema for ticket relationship requests"""
    incident_number: str = Field(..., min_length=1, max_length=50)
    similarity_threshold: Optional[float] = Field(default=0.8, ge=0.0, le=1.0)

    @validator('incident_number')
    def validate_incident_number(cls, v):
        """Validate and sanitize incident number"""
        if not v or not v.strip():
            raise ValueError('Incident number cannot be empty')
        return v.strip()


def validate_request_data(model_class: BaseModel, data: Dict[str, Any]) -> BaseModel:
    """
    Validate request data against a Pydantic model
    
    Args:
        model_class: Pydantic model class to validate against
        data: Request data dictionary
        
    Returns:
        Validated model instance
        
    Raises:
        HTTPException: If validation fails
    """
    try:
        return model_class(**data)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(e)}"
        )


def sanitize_sql_input(value: str) -> str:
    """
    Sanitize string input to prevent SQL injection
    Note: This is a backup - always use parameterized queries
    
    Args:
        value: Input string
        
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        return str(value)
    
    # Remove potentially dangerous characters
    dangerous_chars = [';', '--', '/*', '*/', 'xp_', 'sp_', 'DROP', 'DELETE', 'INSERT', 'UPDATE']
    sanitized = value
    
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    
    return sanitized.strip()


def validate_similarity_threshold(threshold: float) -> float:
    """
    Validate similarity threshold value
    
    Args:
        threshold: Similarity threshold
        
    Returns:
        Validated threshold
        
    Raises:
        HTTPException: If threshold is invalid
    """
    if not 0.0 <= threshold <= 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Similarity threshold must be between 0.0 and 1.0"
        )
    return threshold


def validate_top_k(top_k: int) -> int:
    """
    Validate top_k parameter
    
    Args:
        top_k: Number of results to return
        
    Returns:
        Validated top_k
        
    Raises:
        HTTPException: If top_k is invalid
    """
    if not 1 <= top_k <= 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="top_k must be between 1 and 100"
        )
    return top_k


def validate_model_name(model: str) -> str:
    """
    Validate model name
    
    Args:
        model: Model name
        
    Returns:
        Validated model name
        
    Raises:
        HTTPException: If model name is invalid
    """
    valid_models = ['qwen3', 'gemma']
    if model not in valid_models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid model. Must be one of: {', '.join(valid_models)}"
        )
    return model
