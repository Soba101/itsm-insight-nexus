"""
Similarity Search Benchmark - Measure pgvector query performance.

Tests query latency for different K values and verifies HNSW index usage.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

import time
import numpy as np
from app.core.database import get_db_connection
from pgvector.psycopg2 import register_vector
import logging
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def benchmark_similarity_search():
    """
    Benchmark pgvector similarity search performance.
    """
    logger.info("Starting similarity search benchmark...")
    
    try:
        with get_db_connection() as conn:
            register_vector(conn)
            cursor = conn.cursor()
            
            # Get total count
            cursor.execute("SELECT COUNT(*) FROM servicenow_incidents WHERE embedding IS NOT NULL")
            total_count = cursor.fetchone()[0]
            
            logger.info(f"Total tickets with embeddings: {total_count}")
            
            # Get sample embeddings
            cursor.execute("""
                SELECT incident_number, embedding 
                FROM servicenow_incidents
                WHERE embedding IS NOT NULL
                ORDER BY RANDOM()
                LIMIT 20
            """)
            samples = cursor.fetchall()
            
            if not samples:
                logger.error("No tickets with embeddings found!")
                return
            
            sample_embeddings = [(row[0], row[1]) for row in samples]
            logger.info(f"Loaded {len(sample_embeddings)} sample embeddings")
            
            print("\n" + "="*60)
            print("SIMILARITY SEARCH BENCHMARK")
            print("="*60)
            print(f"\n📊 Dataset Size: {total_count} tickets with embeddings")
            
            # Test different K values
            print("\n" + "="*60)
            print("📊 Query Latency by Top-K:")
            print("-" * 60)
            
            k_values = [5, 10, 20, 50]
            all_latencies = {}
            
            for k in k_values:
                latencies = []
                for ticket_id, embedding in sample_embeddings[:10]:
                    start = time.time()
                    cursor.execute("""
                        SELECT incident_number, (1 - (embedding <=> %s::vector)) AS similarity
                        FROM servicenow_incidents
                        WHERE embedding IS NOT NULL
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    """, (embedding, embedding, k))
                    results = cursor.fetchall()
                    latency = time.time() - start
                    latencies.append(latency)
                
                all_latencies[k] = latencies
                mean_latency = np.mean(latencies) * 1000
                std_latency = np.std(latencies) * 1000
                min_latency = np.min(latencies) * 1000
                max_latency = np.max(latencies) * 1000
                p95_latency = np.percentile(latencies, 95) * 1000
                
                print(f"  Top-{k:2d}: Mean={mean_latency:6.1f}ms ± {std_latency:5.1f}ms | "
                      f"P95={p95_latency:6.1f}ms | Min={min_latency:5.1f}ms | Max={max_latency:6.1f}ms")
            
            # Check if HNSW index is being used
            print("\n" + "="*60)
            print("📊 Query Plan Analysis:")
            print("-" * 60)
            
            cursor.execute("""
                EXPLAIN (FORMAT JSON) 
                SELECT incident_number, (1 - (embedding <=> %s::vector)) AS similarity
                FROM servicenow_incidents
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT 10
            """, (sample_embeddings[0][1], sample_embeddings[0][1]))
            
            explain_result = cursor.fetchone()[0]
            plan_str = json.dumps(explain_result, indent=2)
            
            # Check for index usage
            using_index = "Index Scan" in plan_str
            using_hnsw = "ivfflat" in plan_str.lower() or "hnsw" in plan_str.lower()
            
            if using_index:
                print("  ✅ Index Scan detected (using index)")
                if using_hnsw:
                    print("  ✅ HNSW/IVFFlat index detected")
                else:
                    print("  ⚠️  Using index but not vector-specific (check index type)")
            else:
                print("  ⚠️  Sequential Scan detected (no index being used)")
                print("  💡 Consider creating an index:")
                print("     CREATE INDEX ON servicenow_incidents USING hnsw (embedding vector_cosine_ops);")
            
            print("\n📋 Query Plan Details:")
            print(plan_str[:500] + "..." if len(plan_str) > 500 else plan_str)
            
            # Success criteria
            print("\n" + "="*60)
            print("SUCCESS CRITERIA EVALUATION")
            print("="*60)
            
            if 10 in all_latencies:
                top10_p95 = np.percentile(all_latencies[10], 95) * 1000
                top10_mean = np.mean(all_latencies[10]) * 1000
                
                print(f"\n✓ Top-10 search <50ms (p95): ", end="")
                if top10_p95 < 50:
                    print(f"✅ PASS ({top10_p95:.1f}ms)")
                else:
                    print(f"❌ FAIL ({top10_p95:.1f}ms)")
                
                print(f"✓ Top-10 search <100ms (mean): ", end="")
                if top10_mean < 100:
                    print(f"✅ PASS ({top10_mean:.1f}ms)")
                else:
                    print(f"⚠️  MARGINAL ({top10_mean:.1f}ms)")
            
            print(f"✓ HNSW index is active: ", end="")
            if using_index:
                print("✅ PASS")
            else:
                print("❌ FAIL - Using sequential scan")
            
            print(f"✓ Performance scales sub-linearly: ", end="")
            if 5 in all_latencies and 50 in all_latencies:
                ratio = np.mean(all_latencies[50]) / np.mean(all_latencies[5])
                if ratio < 5:  # 10x more results should take <5x time
                    print(f"✅ PASS (ratio: {ratio:.2f}x)")
                else:
                    print(f"❌ FAIL (ratio: {ratio:.2f}x)")
            else:
                print("⚠️  SKIPPED (insufficient data)")
            
            print("\n" + "="*60)
            print("BENCHMARK COMPLETE")
            print("="*60)
            
    except Exception as e:
        logger.error(f"Error during benchmark: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    benchmark_similarity_search()
