#!/usr/bin/env python3
"""
Batch Embedding Population Script

This script fetches all tickets from the database without embeddings,
generates embeddings using LM Studio, and stores them back in the database.

Usage:
    python scripts/populate_embeddings.py [--batch-size 16] [--limit 100]
"""

import argparse
import logging
import os
import sys
from datetime import datetime
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import init_connection_pool, close_connection_pool, get_db_connection
from app.services.embedding import (
    generate_embeddings_batch,
    combine_ticket_text,
    get_model_info,
    get_embedding_dimension
)
from pgvector.psycopg2 import register_vector

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_tickets_without_embeddings(limit: int = None) -> List[Dict[str, Any]]:
    """
    Fetch tickets that don't have embeddings yet.
    
    Args:
        limit: Maximum number of tickets to fetch (None for all)
        
    Returns:
        List of ticket dictionaries
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                incident_number,
                short_description,
                description,
                priority,
                category
            FROM servicenow_incidents
            WHERE embedding IS NULL
            ORDER BY opened_at DESC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        
        tickets = [dict(zip(columns, row)) for row in rows]
        logger.info(f"Found {len(tickets)} tickets without embeddings")
        
        return tickets


def store_embeddings(tickets: List[Dict[str, Any]], embeddings: List[List[float]], model_name: str):
    """
    Store generated embeddings in the database.
    
    Args:
        tickets: List of ticket dictionaries
        embeddings: List of embedding vectors (same order as tickets)
        model_name: Name of the model used
    """
    if len(tickets) != len(embeddings):
        raise ValueError(f"Mismatch: {len(tickets)} tickets but {len(embeddings)} embeddings")
    
    with get_db_connection() as conn:
        register_vector(conn)
        cursor = conn.cursor()
        
        update_query = """
            UPDATE servicenow_incidents
            SET 
                embedding = %s,
                embedding_model = %s,
                embedded_at = %s
            WHERE incident_number = %s
        """
        
        now = datetime.utcnow()
        success_count = 0
        
        for ticket, embedding in zip(tickets, embeddings):
            try:
                cursor.execute(
                    update_query,
                    (embedding, model_name, now, ticket['incident_number'])
                )
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to store embedding for {ticket['incident_number']}: {e}")
        
        conn.commit()
        cursor.close()
        
        logger.info(f"Successfully stored {success_count}/{len(tickets)} embeddings")


def populate_embeddings(batch_size: int = 16, limit: int = None):
    """
    Main function to populate embeddings for all tickets.
    
    Args:
        batch_size: Number of tickets to process in each batch
        limit: Maximum total number of tickets to process
    """
    try:
        # Initialize database connection pool
        init_connection_pool()
        logger.info("Database connection pool initialized")
        
        # Get model info
        model_info = get_model_info()
        model_name = model_info['model_name']
        embedding_dim = get_embedding_dimension()
        logger.info(f"Using model: {model_name} (dimension: {embedding_dim})")
        
        # Fetch tickets
        tickets = fetch_tickets_without_embeddings(limit=limit)
        
        if not tickets:
            logger.info("No tickets need embeddings. All done!")
            return
        
        total_tickets = len(tickets)
        logger.info(f"Processing {total_tickets} tickets in batches of {batch_size}")
        
        # Process in batches
        for i in range(0, total_tickets, batch_size):
            batch = tickets[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_tickets + batch_size - 1) // batch_size
            
            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} tickets)")
            
            # Combine ticket text
            texts = []
            for ticket in batch:
                text = combine_ticket_text(
                    short_description=ticket.get('short_description'),
                    description=ticket.get('description'),
                    priority=ticket.get('priority'),
                    category=ticket.get('category')
                )
                texts.append(text)
            
            # Generate embeddings
            try:
                embeddings = generate_embeddings_batch(texts, batch_size=len(batch))
                logger.info(f"Generated {len(embeddings)} embeddings")
                
                # Store in database
                store_embeddings(batch, embeddings, model_name)
                
            except Exception as e:
                logger.error(f"Failed to process batch {batch_num}: {e}")
                continue
        
        logger.info("✅ Embedding population complete!")
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise
    finally:
        close_connection_pool()
        logger.info("Database connection pool closed")


def main():
    parser = argparse.ArgumentParser(description="Populate embeddings for ServiceNow incidents")
    parser.add_argument(
        '--batch-size',
        type=int,
        default=16,
        help='Number of tickets to process in each batch (default: 16)'
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
        help='Fetch tickets but do not generate/store embeddings'
    )
    
    args = parser.parse_args()
    
    logger.info(f"Starting embedding population (batch_size={args.batch_size}, limit={args.limit})")
    
    if args.dry_run:
        init_connection_pool()
        tickets = fetch_tickets_without_embeddings(limit=args.limit)
        logger.info(f"Dry run: Would process {len(tickets)} tickets")
        close_connection_pool()
    else:
        populate_embeddings(batch_size=args.batch_size, limit=args.limit)


if __name__ == "__main__":
    main()
