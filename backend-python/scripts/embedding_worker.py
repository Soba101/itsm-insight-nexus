#!/usr/bin/env python3
"""
Embedding Queue Worker

This background worker continuously monitors the embedding_queue table
and generates embeddings for queued tickets.

Usage:
    python scripts/embedding_worker.py [--interval 5] [--batch-size 16]
"""

import argparse
import logging
import os
import sys
import time
from datetime import datetime
from typing import List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import init_connection_pool, close_connection_pool, get_db_connection
from app.services.embedding import (
    generate_embeddings_batch,
    combine_ticket_text,
    get_model_info,
)
from pgvector.psycopg2 import register_vector

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_queued_tickets(batch_size: int = 16) -> List[Dict[str, Any]]:
    """Fetch tickets from the queue that need embeddings."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Mark as processing first
        cursor.execute("""
            UPDATE embedding_queue
            SET status = 'processing'
            WHERE id IN (
                SELECT id FROM embedding_queue
                WHERE status = 'pending'
                ORDER BY created_at
                LIMIT %s
            )
            RETURNING incident_number
        """, (batch_size,))
        
        incident_numbers = [row[0] for row in cursor.fetchall()]
        
        if not incident_numbers:
            cursor.close()
            return []
        
        # Fetch ticket details
        cursor.execute("""
            SELECT incident_number, short_description, description, priority, category
            FROM servicenow_incidents
            WHERE incident_number = ANY(%s)
        """, (incident_numbers,))
        
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        
        return [dict(zip(columns, row)) for row in rows]


def process_tickets(tickets: List[Dict[str, Any]]):
    """Generate and store embeddings for a batch of tickets."""
    if not tickets:
        return
    
    try:
        # Generate text combinations
        texts = [
            combine_ticket_text(
                short_description=t.get('short_description'),
                description=t.get('description'),
                priority=t.get('priority'),
                category=t.get('category')
            )
            for t in tickets
        ]
        
        # Generate embeddings
        embeddings = generate_embeddings_batch(texts, batch_size=len(tickets))
        model_info = get_model_info()
        
        # Store embeddings
        with get_db_connection() as conn:
            register_vector(conn)
            cursor = conn.cursor()
            
            for ticket, embedding in zip(tickets, embeddings):
                incident = ticket['incident_number']
                
                try:
                    # Update ticket with embedding
                    cursor.execute("""
                        UPDATE servicenow_incidents
                        SET embedding = %s,
                            embedding_model = %s,
                            embedded_at = %s
                        WHERE incident_number = %s
                    """, (embedding, model_info['model_name'], datetime.utcnow(), incident))
                    
                    # Mark as completed in queue
                    cursor.execute("""
                        UPDATE embedding_queue
                        SET status = 'completed'
                        WHERE incident_number = %s
                    """, (incident,))
                    
                    logger.info(f"✓ Generated embedding for {incident}")
                    
                except Exception as e:
                    logger.error(f"✗ Failed to store embedding for {incident}: {e}")
                    
                    # Mark as failed
                    cursor.execute("""
                        UPDATE embedding_queue
                        SET status = 'failed',
                            retries = retries + 1,
                            last_error = %s
                        WHERE incident_number = %s
                    """, (str(e), incident))
            
            conn.commit()
            cursor.close()
            
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        
        # Mark all as failed
        with get_db_connection() as conn:
            cursor = conn.cursor()
            for ticket in tickets:
                cursor.execute("""
                    UPDATE embedding_queue
                    SET status = 'pending',
                        retries = retries + 1,
                        last_error = %s
                    WHERE incident_number = %s
                """, (str(e), ticket['incident_number']))
            conn.commit()
            cursor.close()


def cleanup_old_completed(days: int = 7):
    """Remove completed queue entries older than N days."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            DELETE FROM embedding_queue
            WHERE status = 'completed'
            AND created_at < NOW() - INTERVAL '%s days'
        """, (days,))
        deleted = cursor.rowcount
        conn.commit()
        cursor.close()
        
        if deleted > 0:
            logger.info(f"Cleaned up {deleted} old completed queue entries")


def run_worker(interval: int = 5, batch_size: int = 16):
    """Main worker loop."""
    logger.info(f"🚀 Embedding worker started (interval={interval}s, batch_size={batch_size})")
    
    init_connection_pool()
    model_info = get_model_info()
    logger.info(f"Using model: {model_info['model_name']} (dimension: {model_info['embedding_dimension']})")
    
    iteration = 0
    
    try:
        while True:
            iteration += 1
            
            # Fetch and process queued tickets
            tickets = fetch_queued_tickets(batch_size=batch_size)
            
            if tickets:
                logger.info(f"Processing {len(tickets)} queued tickets...")
                process_tickets(tickets)
            else:
                logger.debug(f"No tickets in queue (iteration {iteration})")
            
            # Cleanup every 100 iterations (~8 minutes at 5s interval)
            if iteration % 100 == 0:
                cleanup_old_completed()
            
            # Wait before next check
            time.sleep(interval)
            
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error(f"Worker crashed: {e}")
        raise
    finally:
        close_connection_pool()
        logger.info("Worker shutdown complete")


def main():
    parser = argparse.ArgumentParser(description="Embedding queue worker")
    parser.add_argument(
        '--interval',
        type=int,
        default=5,
        help='Polling interval in seconds (default: 5)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=16,
        help='Batch size for embedding generation (default: 16)'
    )
    
    args = parser.parse_args()
    run_worker(interval=args.interval, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
