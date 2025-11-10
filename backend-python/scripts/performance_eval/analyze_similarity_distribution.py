"""
Similarity Distribution Analysis - Analyze how well embeddings distinguish similar vs dissimilar tickets.

This script calculates similarity scores between tickets with same/different categories
to understand model discrimination capability.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

import psycopg2
import numpy as np
from pgvector.psycopg2 import register_vector
from app.core.database import get_db_connection
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def analyze_similarity_distribution():
    """
    Analyze similarity score distributions to understand model behavior.
    """
    logger.info("Starting similarity distribution analysis...")
    
    try:
        with get_db_connection() as conn:
            register_vector(conn)
            cursor = conn.cursor()
            
            # Get all tickets with embeddings
            logger.info("Fetching tickets with embeddings...")
            cursor.execute("""
                SELECT incident_number, category, priority, embedding
                FROM servicenow_incidents
                WHERE embedding IS NOT NULL
                LIMIT 500
            """)
            tickets = cursor.fetchall()
            
            if not tickets:
                logger.error("No tickets with embeddings found!")
                return
            
            logger.info(f"Loaded {len(tickets)} tickets")
            
            same_category_scores = []
            diff_category_scores = []
            same_priority_scores = []
            diff_priority_scores = []
            
            # Compare each ticket with 10 random others
            logger.info("Calculating similarity scores...")
            for i, ticket_a in enumerate(tickets[:100]):
                if (i + 1) % 10 == 0:
                    logger.info(f"Processed {i + 1}/100 tickets")
                
                for j in range(i+1, min(i+11, len(tickets))):
                    ticket_b = tickets[j]
                    
                    # Calculate cosine similarity using pgvector operator
                    similarity = 1.0 - np.dot(
                        np.array(ticket_a[3]), 
                        np.array(ticket_b[3])
                    ) / (
                        np.linalg.norm(ticket_a[3]) * np.linalg.norm(ticket_b[3])
                    )
                    
                    # Categorize
                    if ticket_a[1] == ticket_b[1]:  # Same category
                        same_category_scores.append(similarity)
                    else:
                        diff_category_scores.append(similarity)
                    
                    if ticket_a[2] == ticket_b[2]:  # Same priority
                        same_priority_scores.append(similarity)
                    else:
                        diff_priority_scores.append(similarity)
            
            # Statistics
            print("\n" + "="*60)
            print("SIMILARITY DISTRIBUTION ANALYSIS")
            print("="*60)
            
            if same_category_scores:
                print(f"\n📊 Same Category:")
                print(f"  Mean: {np.mean(same_category_scores):.4f}")
                print(f"  Std:  {np.std(same_category_scores):.4f}")
                print(f"  Min:  {np.min(same_category_scores):.4f}")
                print(f"  Max:  {np.max(same_category_scores):.4f}")
                print(f"  Count: {len(same_category_scores)}")
            
            if diff_category_scores:
                print(f"\n📊 Different Category:")
                print(f"  Mean: {np.mean(diff_category_scores):.4f}")
                print(f"  Std:  {np.std(diff_category_scores):.4f}")
                print(f"  Min:  {np.min(diff_category_scores):.4f}")
                print(f"  Max:  {np.max(diff_category_scores):.4f}")
                print(f"  Count: {len(diff_category_scores)}")
            
            if same_category_scores and diff_category_scores:
                separation_gap = np.mean(same_category_scores) - np.mean(diff_category_scores)
                print(f"\n📈 Separation Gap: {separation_gap:.4f}")
                
                # Success criteria
                print("\n" + "="*60)
                print("SUCCESS CRITERIA EVALUATION")
                print("="*60)
                
                same_cat_mean = np.mean(same_category_scores)
                diff_cat_mean = np.mean(diff_category_scores)
                
                print(f"\n✓ Same category mean similarity >0.60: ", end="")
                if same_cat_mean > 0.60:
                    print(f"✅ PASS ({same_cat_mean:.4f})")
                else:
                    print(f"❌ FAIL ({same_cat_mean:.4f})")
                
                print(f"✓ Different category mean similarity <0.50: ", end="")
                if diff_cat_mean < 0.50:
                    print(f"✅ PASS ({diff_cat_mean:.4f})")
                else:
                    print(f"❌ FAIL ({diff_cat_mean:.4f})")
                
                print(f"✓ Separation gap >0.10: ", end="")
                if separation_gap > 0.10:
                    print(f"✅ PASS ({separation_gap:.4f})")
                else:
                    print(f"❌ FAIL ({separation_gap:.4f})")
            
            # Priority analysis
            if same_priority_scores and diff_priority_scores:
                print(f"\n📊 Same Priority:")
                print(f"  Mean: {np.mean(same_priority_scores):.4f}")
                
                print(f"\n📊 Different Priority:")
                print(f"  Mean: {np.mean(diff_priority_scores):.4f}")
                
                priority_gap = np.mean(same_priority_scores) - np.mean(diff_priority_scores)
                print(f"\n📈 Priority Separation Gap: {priority_gap:.4f}")
            
            print("\n" + "="*60)
            print("ANALYSIS COMPLETE")
            print("="*60)
            
    except Exception as e:
        logger.error(f"Error during analysis: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    analyze_similarity_distribution()
