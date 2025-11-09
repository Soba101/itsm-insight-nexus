#!/usr/bin/env python3
"""
Establish Ticket Parent-Child Relationships

This script analyzes ticket embeddings to find similar tickets and establishes
parent-child relationships based on semantic similarity. It's designed to be
run after embeddings have been generated.

The script:
1. Finds tickets without parents
2. For each ticket, searches for similar older tickets
3. Assigns the most similar ticket as parent (if similarity >= threshold)
4. The database trigger automatically updates child_incidents arrays

Usage:
    python scripts/establish_ticket_relationships.py [--min-similarity 0.75] [--limit 100] [--dry-run]
"""

import argparse
import logging
import os
import sys
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import init_connection_pool, close_connection_pool, get_db_connection
from pgvector.psycopg2 import register_vector

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_tickets_without_parents(limit: int = None) -> List[Dict[str, Any]]:
    """
    Fetch tickets that have embeddings but no parent assigned.
    
    Args:
        limit: Maximum number of tickets to fetch (None for all)
        
    Returns:
        List of ticket dictionaries with embeddings
    """
    with get_db_connection() as conn:
        register_vector(conn)
        cursor = conn.cursor()
        
        query = """
            SELECT 
                incident_number,
                short_description,
                description,
                priority,
                opened_at,
                embedding
            FROM servicenow_incidents
            WHERE embedding IS NOT NULL
              AND parent_incident IS NULL
            ORDER BY opened_at ASC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        
        tickets = [dict(zip(columns, row)) for row in rows]
        logger.info(f"Found {len(tickets)} tickets without parents")
        
        return tickets


def find_best_parent(
    conn: Any,
    ticket: Dict[str, Any],
    min_similarity: float = 0.75
) -> Optional[Dict[str, Any]]:
    """
    Find the best parent ticket for a given ticket based on similarity.
    Only considers tickets that are older than the current ticket.
    
    Args:
        conn: Database connection
        ticket: Ticket to find parent for
        min_similarity: Minimum similarity threshold (0.0-1.0)
        
    Returns:
        Dict with parent info or None if no suitable parent found
    """
    register_vector(conn)
    cursor = conn.cursor()
    
    embedding = ticket['embedding']
    ticket_opened_at = ticket['opened_at']
    incident_number = ticket['incident_number']
    
    # First, check if there are ANY older tickets with embeddings
    debug_cursor = conn.cursor()
    debug_cursor.execute("""
        SELECT COUNT(*) 
        FROM servicenow_incidents 
        WHERE embedding IS NOT NULL 
          AND incident_number != %s
          AND opened_at < %s
    """, (incident_number, ticket_opened_at))
    older_count = debug_cursor.fetchone()[0]
    debug_cursor.close()
    
    if older_count == 0:
        logger.debug(f"  No older tickets with embeddings found for comparison")
        return None
    
    logger.debug(f"  Found {older_count} older tickets to compare against")
    
    # First check what the highest similarity is (for debugging)
    max_sim_cursor = conn.cursor()
    max_sim_cursor.execute("""
        SELECT 
            incident_number,
            (1 - (embedding <=> %s::vector)) AS similarity_score
        FROM servicenow_incidents
        WHERE embedding IS NOT NULL
          AND incident_number != %s
          AND opened_at < %s
          AND parent_incident IS NULL
        ORDER BY (1 - (embedding <=> %s::vector)) DESC
        LIMIT 1
    """, (embedding, incident_number, ticket_opened_at, embedding))
    max_result = max_sim_cursor.fetchone()
    max_sim_cursor.close()
    
    if max_result:
        logger.debug(f"  Max similarity: {float(max_result[1]):.4f} with {max_result[0]}")
    else:
        logger.debug(f"  No potential parents found (all have parents already)")
        return None
    
    # Find similar tickets that:
    # 1. Have embeddings
    # 2. Are older than this ticket
    # 3. Don't have a parent (to avoid deep hierarchies)
    # 4. Meet minimum similarity threshold
    query = """
        SELECT 
            incident_number,
            short_description,
            opened_at,
            (1 - (embedding <=> %s::vector)) AS similarity_score
        FROM servicenow_incidents
        WHERE embedding IS NOT NULL
          AND incident_number != %s
          AND opened_at < %s
          AND parent_incident IS NULL
          AND (1 - (embedding <=> %s::vector)) >= %s
        ORDER BY (1 - (embedding <=> %s::vector)) DESC
        LIMIT 1
    """
    
    cursor.execute(
        query,
        (embedding, incident_number, ticket_opened_at, embedding, float(min_similarity), embedding)
    )
    
    result = cursor.fetchone()
    cursor.close()
    
    if result:
        return {
            'incident_number': result[0],
            'short_description': result[1],
            'opened_at': result[2],
            'similarity_score': float(result[3])
        }
    
    return None


def assign_parent(
    conn: Any,
    child_incident: str,
    parent_incident: str,
    similarity_score: float,
    dry_run: bool = False
) -> bool:
    """
    Assign a parent to a ticket and set the similarity score.
    
    Args:
        conn: Database connection
        child_incident: Incident number of the child ticket
        parent_incident: Incident number of the parent ticket
        similarity_score: Similarity score between tickets
        dry_run: If True, don't actually update the database
        
    Returns:
        bool: True if successful, False otherwise
    """
    if dry_run:
        logger.info(f"[DRY RUN] Would assign {child_incident} -> {parent_incident} (similarity: {similarity_score:.4f})")
        return True
    
    try:
        cursor = conn.cursor()
        
        update_query = """
            UPDATE servicenow_incidents
            SET 
                parent_incident = %s,
                similarity_score = %s
            WHERE incident_number = %s
        """
        
        cursor.execute(
            update_query,
            (parent_incident, similarity_score, child_incident)
        )
        
        conn.commit()
        cursor.close()
        
        logger.info(f"Assigned {child_incident} -> {parent_incident} (similarity: {similarity_score:.4f})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to assign parent for {child_incident}: {e}")
        conn.rollback()
        return False


def establish_relationships(
    min_similarity: float = 0.75,
    limit: int = None,
    dry_run: bool = False
):
    """
    Main function to establish parent-child relationships for all tickets.
    
    Args:
        min_similarity: Minimum similarity threshold for parent assignment
        limit: Maximum number of tickets to process
        dry_run: If True, show what would be done without making changes
    """
    try:
        # Initialize database connection pool
        init_connection_pool()
        logger.info("Database connection pool initialized")
        
        if dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        
        # Fetch tickets without parents
        tickets = fetch_tickets_without_parents(limit=limit)
        
        if not tickets:
            logger.info("No tickets need parent assignment. All done!")
            return
        
        total_tickets = len(tickets)
        logger.info(f"Processing {total_tickets} tickets with min similarity {min_similarity}")
        
        # Process each ticket
        assigned_count = 0
        skipped_count = 0
        
        with get_db_connection() as conn:
            for i, ticket in enumerate(tickets, 1):
                incident_number = ticket['incident_number']
                logger.info(f"[{i}/{total_tickets}] Processing {incident_number}...")
                
                # Find best parent
                parent = find_best_parent(conn, ticket, min_similarity)
                
                if parent:
                    success = assign_parent(
                        conn,
                        incident_number,
                        parent['incident_number'],
                        parent['similarity_score'],
                        dry_run
                    )
                    
                    if success:
                        assigned_count += 1
                else:
                    logger.info(f"  No suitable parent found for {incident_number} (similarity < {min_similarity})")
                    skipped_count += 1
        
        # Summary
        logger.info("=" * 60)
        logger.info("SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total tickets processed: {total_tickets}")
        logger.info(f"Parents assigned: {assigned_count}")
        logger.info(f"Skipped (no match): {skipped_count}")
        
        if dry_run:
            logger.info("\n✅ Dry run complete. Run without --dry-run to apply changes.")
        else:
            logger.info("\n✅ Relationship establishment complete!")
        
    except Exception as e:
        logger.error(f"Error during relationship establishment: {e}", exc_info=True)
        raise
    finally:
        close_connection_pool()
        logger.info("Database connection pool closed")


def main():
    parser = argparse.ArgumentParser(
        description="Establish parent-child relationships between similar tickets"
    )
    parser.add_argument(
        '--min-similarity',
        type=float,
        default=0.75,
        help='Minimum similarity threshold (0.0-1.0) for parent assignment (default: 0.75)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='Maximum number of tickets to process (default: all)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    
    args = parser.parse_args()
    
    # Validate similarity threshold
    if not 0.0 <= args.min_similarity <= 1.0:
        parser.error("--min-similarity must be between 0.0 and 1.0")
    
    establish_relationships(
        min_similarity=args.min_similarity,
        limit=args.limit,
        dry_run=args.dry_run
    )


if __name__ == '__main__':
    main()
