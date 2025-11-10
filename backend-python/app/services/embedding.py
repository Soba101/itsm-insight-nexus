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

# LM Studio configuration (defaults align with docker-compose configuration)
LM_STUDIO_BASE_URL_PRIMARY = os.getenv("LM_STUDIO_BASE_URL")
LM_STUDIO_BASE_URL_FALLBACK = os.getenv("LM_STUDIO_BASE_URL_FALLBACK")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "text-embedding-qwen3-embedding-8b")

# Build ordered list of candidate base URLs (primary first, then fallback if distinct)
LM_STUDIO_BASE_URLS: List[str] = [LM_STUDIO_BASE_URL_PRIMARY]
if LM_STUDIO_BASE_URL_FALLBACK and LM_STUDIO_BASE_URL_FALLBACK not in LM_STUDIO_BASE_URLS:
    LM_STUDIO_BASE_URLS.append(LM_STUDIO_BASE_URL_FALLBACK)

# Global client state
_client: Optional[OpenAI] = None
_embedding_dimension: Optional[int] = None
_current_base_index: int = 0


def _current_base_url() -> str:
    return LM_STUDIO_BASE_URLS[_current_base_index]


def _reset_client_state():
    global _client, _embedding_dimension
    _client = None
    _embedding_dimension = None


def _switch_to_next_base_url() -> bool:
    """Advance to the next configured base URL, if available."""
    global _current_base_index
    if _current_base_index + 1 >= len(LM_STUDIO_BASE_URLS):
        return False
    _current_base_index += 1
    new_url = _current_base_url()
    logger.warning(f"Switching LM Studio client to fallback base URL: {new_url}")
    _reset_client_state()
    return True


def get_embedding_client() -> OpenAI:
    """
    Get or initialize the OpenAI client for LM Studio.
    
    Returns:
        OpenAI: The client instance configured for LM Studio
    """
    global _client
    
    if _client is None:
        base_url = _current_base_url()
        logger.info(f"Initializing LM Studio client: {base_url}")
        _client = OpenAI(
            base_url=base_url,
            api_key="not-needed"  # LM Studio doesn't require API key
        )
        logger.info(f"LM Studio client initialized. Model: {LM_STUDIO_MODEL}")
    
    return _client


def _perform_embedding_request(input_payload: Any) -> Any:
    """Invoke the LM Studio embedding endpoint with automatic fallback across base URLs."""
    attempts = 0
    last_error: Optional[Exception] = None

    while attempts < len(LM_STUDIO_BASE_URLS):
        client = get_embedding_client()
        base_url = _current_base_url()
        try:
            return client.embeddings.create(
                model=LM_STUDIO_MODEL,
                input=input_payload
            )
        except Exception as exc:
            last_error = exc
            logger.warning("Embedding request failed via %s: %s", base_url, exc)
            if not _switch_to_next_base_url():
                break
            attempts += 1
            continue

    logger.error("All LM Studio base URLs failed for model %s", LM_STUDIO_MODEL)
    if last_error:
        raise last_error
    raise RuntimeError("Embedding request failed without specific error")


def get_embedding_dimension() -> int:
    """
    Get the dimension of embeddings from the model.
    
    Returns:
        int: The embedding dimension
    """
    global _embedding_dimension
    
    if _embedding_dimension is None:
        # Test with a sample to get dimension
        try:
            response = _perform_embedding_request("test")
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
        logger.debug(f"Generating embedding for text (length: {len(text)})")

        response = _perform_embedding_request(text)

        raw_embedding = response.data[0].embedding
        logger.debug(f"Generated embedding with dimension: {len(raw_embedding)}")

        # Ensure we only return native Python floats so psycopg2 can adapt them
        embedding = [float(value) for value in raw_embedding]

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
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            logger.debug(f"Processing batch {i // batch_size + 1} ({len(batch)} texts)")
            
            response = _perform_embedding_request(batch)
            
            for item in response.data:
                # Normalize to plain Python floats for downstream database adapters
                embeddings.append([float(value) for value in item.embedding])
        
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
        "base_url": _current_base_url(),
        "model_name": LM_STUDIO_MODEL,
        "embedding_dimension": get_embedding_dimension(),
        "max_batch_size": 16
    }

