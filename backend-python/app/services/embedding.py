"""
Embedding Service - Generate semantic embeddings using LM Studio.

This service uses LM Studio OpenAI-compatible API to generate embeddings
via local models without Docker compatibility issues.
"""

import logging
import os
from typing import List, Optional, Dict, Any
from openai import OpenAI

logger = logging.getLogger(__name__)

# Global client instance
_client: Optional[OpenAI] = None
_embedding_dimension: Optional[int] = None

# LM Studio configuration
LM_STUDIO_BASE_URL = os.getenv("LM_STUDIO_BASE_URL", "http://host.docker.internal:1234/v1")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "text-embedding-embeddinggemma-300m-qat")

LM_STUDIO_BASE_URL = os.getenv("LM_STUDIO_BASE_URL", "http://host.docker.internal:1234/v1")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "text-embedding-embeddinggemma-300m-qat")


def get_embedding_client() -> OpenAI:
    """
    Get or initialize the OpenAI client for LM Studio.
    
    Returns:
        OpenAI: The client instance configured for LM Studio
    """
    global _client
    
    if _client is None:
        logger.info(f"Initializing LM Studio client: {LM_STUDIO_BASE_URL}")
        _client = OpenAI(
            base_url=LM_STUDIO_BASE_URL,
            api_key="not-needed"  # LM Studio doesn't require API key
        )
        logger.info(f"LM Studio client initialized. Model: {LM_STUDIO_MODEL}")
    
    return _client


def get_embedding_dimension() -> int:
    """
    Get the dimension of embeddings from the model.
    
    Returns:
        int: The embedding dimension
    """
    global _embedding_dimension
    
    if _embedding_dimension is None:
        # Test with a sample to get dimension
        client = get_embedding_client()
        try:
            response = client.embeddings.create(
                model=LM_STUDIO_MODEL,
                input="test"
            )
            _embedding_dimension = len(response.data[0].embedding)
            logger.info(f"Embedding dimension detected: {_embedding_dimension}")
        except Exception as e:
            logger.error(f"Failed to detect embedding dimension: {e}")
            _embedding_dimension = 768  # Default fallback
    
    return _embedding_dimension


def generate_embedding(text: str) -> List[float]:
    """
    Generate an embedding vector for the given text.
    
    Args:
        text: The text to embed
        
    Returns:
        List[float]: The embedding vector
        
    Raises:
        Exception: If embedding generation fails
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    
    try:
        client = get_embedding_client()
        
        logger.debug(f"Generating embedding for text (length: {len(text)})")
        
        response = client.embeddings.create(
            model=LM_STUDIO_MODEL,
            input=text
        )
        
        embedding = response.data[0].embedding
        logger.debug(f"Generated embedding with dimension: {len(embedding)}")
        
        return embedding
        
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        raise


def generate_embeddings_batch(texts: List[str], batch_size: int = 16) -> List[List[float]]:
    """
    Generate embeddings for multiple texts in batches.
    
    Args:
        texts: List of texts to embed
        batch_size: Number of texts to process in each batch
        
    Returns:
        List[List[float]]: List of embedding vectors
        
    Raises:
        Exception: If embedding generation fails
    """
    if not texts:
        return []
    
    logger.info(f"Generating embeddings for {len(texts)} texts in batches of {batch_size}")
    
    embeddings = []
    
    try:
        client = get_embedding_client()
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            logger.debug(f"Processing batch {i // batch_size + 1} ({len(batch)} texts)")
            
            response = client.embeddings.create(
                model=LM_STUDIO_MODEL,
                input=batch
            )
            
            batch_embeddings = [item.embedding for item in response.data]
            embeddings.extend(batch_embeddings)
        
        logger.info(f"Successfully generated {len(embeddings)} embeddings")
        return embeddings
        
    except Exception as e:
        logger.error(f"Failed to generate batch embeddings: {e}")
        raise


def combine_ticket_text(
    short_description: Optional[str] = None,
    description: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None
) -> str:
    """
    Combine ticket fields into a single text for embedding.
    
    Args:
        short_description: Short description of the ticket
        description: Detailed description
        priority: Priority level
        category: Ticket category
        
    Returns:
        str: Combined text with field labels
    """
    parts = []
    
    if short_description:
        parts.append(f"Summary: {short_description}")
    
    if description:
        parts.append(f"Description: {description}")
    
    if priority:
        parts.append(f"Priority: {priority}")
    
    if category:
        parts.append(f"Category: {category}")
    
    return " | ".join(parts) if parts else "No content"


def get_model_info() -> Dict[str, Any]:
    """
    Get information about the embedding model.
    
    Returns:
        Dict with model configuration details
    """
    return {
        "provider": "LM Studio",
        "base_url": LM_STUDIO_BASE_URL,
        "model_name": LM_STUDIO_MODEL,
        "embedding_dimension": get_embedding_dimension(),
        "max_batch_size": 16
    }

