"""
Embedding Speed Benchmark - Measure embedding generation performance.

Tests single ticket latency, batch throughput, and memory usage.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

import time
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    
import numpy as np
from app.services.embedding import generate_embedding, generate_embeddings_batch
from app.core.database import get_db_connection
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def benchmark_embedding_speed():
    """
    Benchmark embedding generation performance.
    """
    logger.info("Starting embedding speed benchmark...")
    
    # Sample texts of varying lengths
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT short_description || ' ' || COALESCE(description, '')
                FROM servicenow_incidents
                LIMIT 100
            """)
            texts = [row[0] for row in cursor.fetchall()]
        
        if not texts:
            logger.error("No tickets found for benchmarking!")
            return
        
        logger.info(f"Loaded {len(texts)} ticket descriptions")
        
        print("\n" + "="*60)
        print("EMBEDDING GENERATION BENCHMARK")
        print("="*60)
        
        # Single embedding latency
        print("\n📊 Single Ticket Latency:")
        print("-" * 60)
        single_latencies = []
        
        for i, text in enumerate(texts[:10]):
            start = time.time()
            try:
                _ = generate_embedding(text)
                latency = time.time() - start
                single_latencies.append(latency)
                token_count = len(text.split())
                tokens_per_sec = token_count / latency if latency > 0 else 0
                print(f"  Ticket {i+1:2d} | Tokens: {token_count:4d} | Latency: {latency*1000:6.1f}ms | Tokens/sec: {tokens_per_sec:6.1f}")
            except Exception as e:
                logger.error(f"Error generating embedding for ticket {i+1}: {e}")
                continue
        
        if single_latencies:
            print(f"\n📈 Summary Statistics:")
            print(f"  Mean Latency:   {np.mean(single_latencies)*1000:6.1f}ms ± {np.std(single_latencies)*1000:5.1f}ms")
            print(f"  Median Latency: {np.median(single_latencies)*1000:6.1f}ms")
            print(f"  Min Latency:    {np.min(single_latencies)*1000:6.1f}ms")
            print(f"  Max Latency:    {np.max(single_latencies)*1000:6.1f}ms")
        
        # Batch throughput
        print("\n" + "="*60)
        print("📊 Batch Throughput:")
        print("-" * 60)
        batch_sizes = [1, 4, 8, 16, 32]
        
        for batch_size in batch_sizes:
            if batch_size > len(texts):
                continue
            
            batch = texts[:batch_size]
            start = time.time()
            try:
                _ = generate_embeddings_batch(batch)
                elapsed = time.time() - start
                throughput = batch_size / elapsed if elapsed > 0 else 0
                latency_per_ticket = (elapsed / batch_size * 1000) if batch_size > 0 else 0
                print(f"  Batch Size: {batch_size:2d} | Time: {elapsed:5.2f}s | Throughput: {throughput:5.1f} tickets/sec | Per-ticket: {latency_per_ticket:6.1f}ms")
            except Exception as e:
                logger.error(f"Error with batch size {batch_size}: {e}")
                continue
        
        # Memory usage
        print("\n" + "="*60)
        print("📊 Memory Usage:")
        print("-" * 60)
        
        if PSUTIL_AVAILABLE:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            print(f"  Current RSS Memory: {memory_mb:.1f} MB")
        else:
            print("  ⚠️  psutil not available - memory monitoring skipped")
            memory_mb = 0
        
        # Success criteria
        print("\n" + "="*60)
        print("SUCCESS CRITERIA EVALUATION")
        print("="*60)
        
        if single_latencies:
            mean_latency_ms = np.mean(single_latencies) * 1000
            print(f"\n✓ Mean latency <500ms per ticket: ", end="")
            if mean_latency_ms < 500:
                print(f"✅ PASS ({mean_latency_ms:.1f}ms)")
            else:
                print(f"❌ FAIL ({mean_latency_ms:.1f}ms)")
        
        # Calculate best batch throughput
        if len(texts) >= 8:
            batch = texts[:8]
            start = time.time()
            try:
                _ = generate_embeddings_batch(batch)
                elapsed = time.time() - start
                throughput = 8 / elapsed if elapsed > 0 else 0
                
                print(f"✓ Batch throughput >5 tickets/second: ", end="")
                if throughput > 5:
                    print(f"✅ PASS ({throughput:.1f} tickets/sec)")
                else:
                    print(f"❌ FAIL ({throughput:.1f} tickets/sec)")
            except Exception as e:
                logger.error(f"Error calculating throughput: {e}")
        
        if PSUTIL_AVAILABLE:
            print(f"✓ Memory usage <2GB: ", end="")
            if memory_mb < 2048:
                print(f"✅ PASS ({memory_mb:.1f} MB)")
            else:
                print(f"❌ FAIL ({memory_mb:.1f} MB)")
        else:
            print(f"✓ Memory usage <2GB: ⚠️  SKIPPED (psutil not available)")
        
        print("\n" + "="*60)
        print("BENCHMARK COMPLETE")
        print("="*60)
        
    except Exception as e:
        logger.error(f"Error during benchmark: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    benchmark_embedding_speed()
