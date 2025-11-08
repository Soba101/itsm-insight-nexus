"""
Similarity Service - Find similar tickets using vector embeddings and cosine similarity.

This service uses pgvector's cosine similarity to find tickets with similar
semantic meaning based on their embeddings.
"""

from typing import List, Dict, Any, Optional
import logging
from pgvector.psycopg2 import register_vector
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

def cosine_similarity_sql(embedding: List[float], limit: int = 5, min_similarity: float = 0.0) -> str:
    """
    Generate SQL query for cosine similarity search using pgvector.
    
    Args:
        embedding: Query embedding vector
        limit: Maximum number of results to return
        min_similarity: Minimum similarity score threshold (0.0-1.0)
        
    Returns:
        str: SQL query string
    """
    # pgvector uses <=> for cosine distance (1 - cosine_similarity)
    # We convert to similarity: 1 - (distance)
    return f"""
        SELECT 
            incident_number,
            short_description,
            description,
            state,
            priority,
            opened_at,
            parent_incident,
            similarity_score,
            (1 - (embedding <=> %s::vector)) AS similarity
        FROM servicenow_incidents
        WHERE embedding IS NOT NULL
          AND parent_incident IS NULL  -- Only match potential parent tickets
          AND (1 - (embedding <=> %s::vector)) >= %s  -- Minimum similarity threshold
        ORDER BY embedding <=> %s::vector  -- Order by distance (ascending = most similar)
        LIMIT %s
    """


async def find_similar_tickets(
    conn: Any,
    query_embedding: List[float],
    top_k: int = 5,
    min_similarity: float = 0.7,
    exclude_incident: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Find tickets similar to the query embedding using cosine similarity.
    
    Args:
        conn: Database connection (psycopg2)
        query_embedding: Embedding vector to search for
        top_k: Number of most similar tickets to return
        min_similarity: Minimum similarity score (0.0-1.0)
        exclude_incident: Incident number to exclude from results (e.g., self)
        
    Returns:
        List[Dict]: List of similar tickets with similarity scores
    """
    try:
        # Register pgvector type
        register_vector(conn)
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build query
        sql = cosine_similarity_sql(query_embedding, top_k + 1, min_similarity)  # +1 in case we exclude one
        
        # Execute query (need to pass embedding 4 times due to SQL structure)
        cursor.execute(
            sql,
            (query_embedding, query_embedding, min_similarity, query_embedding, top_k + 1)
        )
        
        results = cursor.fetchall()
        cursor.close()
        
        # Filter out excluded incident
        if exclude_incident:
            results = [r for r in results if r['incident_number'] != exclude_incident]
        
        # Limit to top_k after exclusion
        results = results[:top_k]
        
        # Convert to list of dicts and format
        similar_tickets = []
        for row in results:
            similar_tickets.append({
                "incident_number": row['incident_number'],
                "short_description": row['short_description'],
                "description": row['description'],
                "state": row['state'],
                "priority": row['priority'],
                "opened_at": row['opened_at'].isoformat() if row['opened_at'] else None,
                "similarity_score": float(row['similarity']),
                "already_has_parent": row['parent_incident'] is not None
            })
        
        logger.info(f"Found {len(similar_tickets)} similar tickets with similarity >= {min_similarity}")
        return similar_tickets
        
    except Exception as e:
        logger.error(f"Error finding similar tickets: {e}")
        raise RuntimeError(f"Similarity search failed: {e}")


def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors (fallback method).
    
    Args:
        vec1: First vector
        vec2: Second vector
        
    Returns:
        float: Cosine similarity (0.0-1.0)
    """
    import numpy as np
    
    if len(vec1) != len(vec2):
        raise ValueError("Vectors must have same length")
    
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    
    dot_product = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return float(dot_product / (norm1 * norm2))


async def get_ticket_family(
    conn: Any,
    incident_number: str
) -> Dict[str, Any]:
    """
    Get a ticket and all its related tickets (parent + children).
    
    Args:
        conn: Database connection
        incident_number: Incident number to get family for
        
    Returns:
        Dict with 'ticket', 'parent', and 'children' keys
    """
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get the ticket itself
        cursor.execute("""
            SELECT incident_number, short_description, description, state, priority,
                   opened_at, parent_incident, child_incidents, similarity_score
            FROM servicenow_incidents
            WHERE incident_number = %s
        """, (incident_number,))
        
        ticket = cursor.fetchone()
        if not ticket:
            return {"error": "Ticket not found"}
        
        ticket_dict = dict(ticket)
        
        # Get parent if exists
        parent = None
        if ticket_dict['parent_incident']:
            cursor.execute("""
                SELECT incident_number, short_description, state, priority, opened_at
                FROM servicenow_incidents
                WHERE incident_number = %s
            """, (ticket_dict['parent_incident'],))
            parent_row = cursor.fetchone()
            if parent_row:
                parent = dict(parent_row)
        
        # Get children if any
        children = []
        if ticket_dict['child_incidents']:
            placeholders = ','.join(['%s'] * len(ticket_dict['child_incidents']))
            cursor.execute(f"""
                SELECT incident_number, short_description, state, priority, 
                       opened_at, similarity_score
                FROM servicenow_incidents
                WHERE incident_number IN ({placeholders})
                ORDER BY similarity_score DESC NULLS LAST
            """, tuple(ticket_dict['child_incidents']))
            children = [dict(row) for row in cursor.fetchall()]
        
        cursor.close()
        
        return {
            "ticket": ticket_dict,
            "parent": parent,
            "children": children
        }
        
    except Exception as e:
        logger.error(f"Error getting ticket family: {e}")
        raise RuntimeError(f"Failed to get ticket family: {e}")
