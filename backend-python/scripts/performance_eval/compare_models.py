#!/usr/bin/env python3
"""
Model Comparison Script - Compare quality of Gemma (768-dim) vs Qwen3 (4096-dim).

Tests both models side-by-side using their respective embedding columns to 
measure separation gap, category agreement, and similarity scores.

Usage:
    python scripts/performance_eval/compare_models.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

import numpy as np
from app.core.database import get_db_connection
from pgvector.psycopg2 import register_vector
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def analyze_model_quality(embedding_column: str, model_name: str):
    """
    Analyze embedding quality for a specific model by comparing same-category
    vs different-category similarity scores.
    
    Args:
        embedding_column: Name of the embedding column (e.g., "embedding" or "embedding_4096")
        model_name: Display name for the model (e.g., "Gemma-768" or "Qwen3-4096")
    
    Returns:
        Dict with quality metrics
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"Analyzing {model_name} ({embedding_column})")
    logger.info(f"{'='*60}")
    
    try:
        with get_db_connection() as conn:
            register_vector(conn)
            cursor = conn.cursor()
            
            # Check if column has any embeddings
            cursor.execute(f"""
                SELECT COUNT(*) FROM servicenow_incidents 
                WHERE {embedding_column} IS NOT NULL
            """)
            count = cursor.fetchone()[0]
            
            if count == 0:
                logger.warning(f"⚠️  No embeddings found in {embedding_column}!")
                return {
                    "model_name": model_name,
                    "embedding_column": embedding_column,
                    "status": "NO_EMBEDDINGS",
                    "sample_size": 0
                }
            
            logger.info(f"Found {count} tickets with embeddings")
            
            # Get sample of tickets with categories
            cursor.execute(f"""
                SELECT incident_number, category, {embedding_column}
                FROM servicenow_incidents
                WHERE {embedding_column} IS NOT NULL 
                AND category IS NOT NULL
                ORDER BY RANDOM()
                LIMIT 100
            """)
            tickets = cursor.fetchall()
            
            logger.info(f"Sampled {len(tickets)} tickets for comparison")
            
            # Calculate pairwise similarities
            same_category_scores = []
            different_category_scores = []
            
            for i, (ticket1_id, cat1, emb1) in enumerate(tickets):
                for ticket2_id, cat2, emb2 in tickets[i+1:]:
                    # Calculate cosine similarity using pgvector
                    cursor.execute(f"""
                        SELECT 1 - (%s::vector <=> %s::vector) AS similarity
                    """, (emb1, emb2))
                    similarity = cursor.fetchone()[0]
                    
                    if cat1 == cat2:
                        same_category_scores.append(similarity)
                    else:
                        different_category_scores.append(similarity)
            
            cursor.close()
            
            # Calculate statistics
            same_mean = np.mean(same_category_scores) if same_category_scores else 0.0
            same_std = np.std(same_category_scores) if same_category_scores else 0.0
            diff_mean = np.mean(different_category_scores) if different_category_scores else 0.0
            diff_std = np.std(different_category_scores) if different_category_scores else 0.0
            separation_gap = same_mean - diff_mean
            
            # Print results
            print(f"\n📊 Quality Metrics for {model_name}:")
            print("-" * 60)
            print(f"Sample size: {len(tickets)} tickets")
            print(f"Same category pairs: {len(same_category_scores)}")
            print(f"Different category pairs: {len(different_category_scores)}")
            print()
            print(f"Same Category Similarity:")
            print(f"  Mean: {same_mean:.4f}")
            print(f"  Std:  {same_std:.4f}")
            print()
            print(f"Different Category Similarity:")
            print(f"  Mean: {diff_mean:.4f}")
            print(f"  Std:  {diff_std:.4f}")
            print()
            print(f"Separation Gap: {separation_gap:+.4f}")
            
            # Verdict
            if separation_gap > 0.10:
                verdict = "✅ EXCELLENT - Strong separation"
                status = "PASS"
            elif separation_gap > 0.05:
                verdict = "✓ GOOD - Moderate separation"
                status = "PASS"
            elif separation_gap > 0.0:
                verdict = "⚠️  WEAK - Minimal separation"
                status = "WARN"
            else:
                verdict = "❌ FAIL - Inverted separation (different > same)"
                status = "FAIL"
            
            print(f"\n{verdict}")
            
            return {
                "model_name": model_name,
                "embedding_column": embedding_column,
                "status": status,
                "sample_size": len(tickets),
                "same_category_mean": same_mean,
                "same_category_std": same_std,
                "different_category_mean": diff_mean,
                "different_category_std": diff_std,
                "separation_gap": separation_gap,
                "verdict": verdict
            }
            
    except Exception as e:
        logger.error(f"Error analyzing {model_name}: {e}")
        return {
            "model_name": model_name,
            "embedding_column": embedding_column,
            "status": "ERROR",
            "error": str(e)
        }


def main():
    """Compare both models."""
    print("\n" + "="*60)
    print("MODEL QUALITY COMPARISON - GEMMA vs QWEN3")
    print("="*60)
    
    # Test Gemma (768-dim)
    gemma_results = analyze_model_quality("embedding", "Gemma-768")
    
    print("\n" + "="*60)
    
    # Test Qwen3 (4096-dim)
    qwen3_results = analyze_model_quality("embedding_4096", "Qwen3-4096")
    
    # Print comparison summary
    print("\n" + "="*60)
    print("📊 COMPARISON SUMMARY")
    print("="*60)
    
    if gemma_results.get("status") == "NO_EMBEDDINGS":
        print("\n⚠️  Gemma: No embeddings found")
    elif gemma_results.get("status") == "ERROR":
        print(f"\n❌ Gemma: Error - {gemma_results.get('error')}")
    else:
        print(f"\nGemma-768:")
        print(f"  Separation Gap: {gemma_results['separation_gap']:+.4f}")
        print(f"  Status: {gemma_results['status']}")
    
    if qwen3_results.get("status") == "NO_EMBEDDINGS":
        print("\n⚠️  Qwen3: No embeddings found - run populate_embeddings.py with LM_STUDIO_MODEL=text-embedding-qwen3-embedding-8b")
    elif qwen3_results.get("status") == "ERROR":
        print(f"\n❌ Qwen3: Error - {qwen3_results.get('error')}")
    else:
        print(f"\nQwen3-4096:")
        print(f"  Separation Gap: {qwen3_results['separation_gap']:+.4f}")
        print(f"  Status: {qwen3_results['status']}")
    
    # Determine winner
    if (gemma_results.get("status") in ["PASS", "WARN", "FAIL"] and 
        qwen3_results.get("status") in ["PASS", "WARN", "FAIL"]):
        
        gemma_gap = gemma_results['separation_gap']
        qwen3_gap = qwen3_results['separation_gap']
        
        print("\n" + "="*60)
        print("🏆 RECOMMENDATION:")
        print("-" * 60)
        
        if qwen3_gap > gemma_gap and qwen3_gap > 0.05:
            print("✅ Use Qwen3-4096 - Better quality despite slower speed")
            print(f"   Gap improvement: {qwen3_gap - gemma_gap:+.4f}")
        elif gemma_gap > qwen3_gap and gemma_gap > 0.05:
            print("✅ Use Gemma-768 - Better quality and faster")
            print(f"   Gap improvement: {gemma_gap - qwen3_gap:+.4f}")
        elif gemma_gap > 0.05:
            print("⚠️  Use Gemma-768 - Both poor, but Gemma is faster")
        elif qwen3_gap > 0.05:
            print("⚠️  Use Qwen3-4096 - Both poor, but Qwen3 slightly better")
        else:
            print("❌ Neither model acceptable - both show poor separation")
            print("   Consider alternative models or data preprocessing")
    
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
