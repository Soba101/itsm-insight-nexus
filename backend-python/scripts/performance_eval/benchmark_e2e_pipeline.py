"""
End-to-End Pipeline Benchmark - Measure total time from ticket creation to similarity results.

Tests the complete workflow: embed → store → search.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

import time
from datetime import datetime
from app.core.database import get_db_connection
from app.services.embedding import generate_embedding
from pgvector.psycopg2 import register_vector
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def benchmark_e2e_pipeline():
    """
    Benchmark end-to-end pipeline performance.
    """
    test_ticket = {
        'incident_number': 'TEST_E2E_BENCHMARK_001',
        'short_description': 'Network connectivity issue in Building A',
        'description': 'Users on the 3rd floor are unable to access internal servers. '
                      'Intermittent connection drops observed every 5-10 minutes. '
                      'Affects approximately 25 workstations.'
    }
    
    logger.info("Starting end-to-end pipeline benchmark...")
    
    print("\n" + "="*60)
    print("END-TO-END PIPELINE BENCHMARK")
    print("="*60)
    print(f"\n📋 Test Ticket: {test_ticket['incident_number']}")
    print(f"Description: {test_ticket['short_description']}")
    
    try:
        # Step 1: Generate Embedding
        print("\n" + "-"*60)
        print("Step 1: Embedding Generation")
        print("-"*60)
        
        start_embed = time.time()
        text = f"{test_ticket['short_description']} {test_ticket['description']}"
        embedding = generate_embedding(text)
        embed_time = time.time() - start_embed
        
        print(f"  ✓ Embedding generated: {len(embedding)} dimensions")
        print(f"  ⏱️  Time: {embed_time*1000:.1f}ms")
        
        # Step 2: Store in Database
        print("\n" + "-"*60)
        print("Step 2: Database Storage")
        print("-"*60)
        
        with get_db_connection() as conn:
            register_vector(conn)
            cursor = conn.cursor()
            
            start_store = time.time()
            cursor.execute("""
                INSERT INTO servicenow_incidents 
                (incident_number, short_description, description, embedding, embedding_model, embedded_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (incident_number) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    embedded_at = EXCLUDED.embedded_at
            """, (
                test_ticket['incident_number'],
                test_ticket['short_description'],
                test_ticket['description'],
                embedding,
                'benchmark-test',
                datetime.now()
            ))
            conn.commit()
            store_time = time.time() - start_store
            
            print(f"  ✓ Ticket stored in database")
            print(f"  ⏱️  Time: {store_time*1000:.1f}ms")
            
            # Step 3: Find Similar Tickets
            print("\n" + "-"*60)
            print("Step 3: Similarity Search")
            print("-"*60)
            
            start_search = time.time()
            cursor.execute("""
                SELECT 
                    incident_number,
                    short_description,
                    (1 - (embedding <=> %s::vector)) AS similarity
                FROM servicenow_incidents
                WHERE embedding IS NOT NULL
                    AND incident_number != %s
                ORDER BY embedding <=> %s::vector
                LIMIT 10
            """, (embedding, test_ticket['incident_number'], embedding))
            
            similar_tickets = cursor.fetchall()
            search_time = time.time() - start_search
            
            print(f"  ✓ Found {len(similar_tickets)} similar tickets")
            if similar_tickets:
                print(f"\n  Top 3 Similar Tickets:")
                for i, (inc_num, desc, sim) in enumerate(similar_tickets[:3], 1):
                    print(f"    {i}. {inc_num} (similarity: {sim:.4f})")
                    print(f"       {desc[:60]}...")
            print(f"\n  ⏱️  Time: {search_time*1000:.1f}ms")
            
            # Cleanup
            cursor.execute("DELETE FROM servicenow_incidents WHERE incident_number = %s", 
                         (test_ticket['incident_number'],))
            conn.commit()
            logger.info("Test ticket cleaned up")
        
        # Summary
        total_time = embed_time + store_time + search_time
        
        print("\n" + "="*60)
        print("⏱️  TIMING SUMMARY")
        print("="*60)
        print(f"  Embedding Generation: {embed_time*1000:7.1f}ms ({embed_time/total_time*100:5.1f}%)")
        print(f"  Database Storage:     {store_time*1000:7.1f}ms ({store_time/total_time*100:5.1f}%)")
        print(f"  Similarity Search:    {search_time*1000:7.1f}ms ({search_time/total_time*100:5.1f}%)")
        print(f"  {'-'*60}")
        print(f"  Total E2E Time:       {total_time*1000:7.1f}ms")
        
        # Success criteria
        print("\n" + "="*60)
        print("SUCCESS CRITERIA EVALUATION")
        print("="*60)
        
        print(f"\n✓ Total E2E <2000ms (2 seconds): ", end="")
        if total_time < 2.0:
            print(f"✅ PASS ({total_time*1000:.1f}ms)")
        else:
            print(f"❌ FAIL ({total_time*1000:.1f}ms)")
        
        print(f"✓ Embedding <500ms: ", end="")
        if embed_time < 0.5:
            print(f"✅ PASS ({embed_time*1000:.1f}ms)")
        else:
            print(f"❌ FAIL ({embed_time*1000:.1f}ms)")
        
        print(f"✓ Search <100ms: ", end="")
        if search_time < 0.1:
            print(f"✅ PASS ({search_time*1000:.1f}ms)")
        else:
            print(f"⚠️  MARGINAL ({search_time*1000:.1f}ms)")
        
        # Performance tier
        print(f"\n📊 Performance Tier: ", end="")
        if total_time < 0.5:
            print("⭐⭐⭐ EXCEPTIONAL (<500ms)")
        elif total_time < 1.0:
            print("⭐⭐ EXCELLENT (<1s)")
        elif total_time < 2.0:
            print("⭐ GOOD (<2s)")
        else:
            print("⚠️  NEEDS IMPROVEMENT (>2s)")
        
        print("\n" + "="*60)
        print("BENCHMARK COMPLETE")
        print("="*60)
        
    except Exception as e:
        logger.error(f"Error during benchmark: {e}", exc_info=True)
        # Cleanup on error
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM servicenow_incidents WHERE incident_number = %s", 
                             (test_ticket['incident_number'],))
                conn.commit()
        except:
            pass
        raise


if __name__ == "__main__":
    benchmark_e2e_pipeline()
