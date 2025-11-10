"""
Run All Phase 1 Benchmarks - Execute all quick-win performance tests.

This script runs all Phase 1 benchmarks in sequence and generates a summary report.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import subprocess
import time
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def run_benchmark(script_name, description):
    """Run a single benchmark script and capture results."""
    print("\n" + "="*80)
    print(f"🚀 Running: {description}")
    print("="*80)
    
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    
    try:
        start_time = time.time()
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=False,
            text=True,
            check=True
        )
        elapsed = time.time() - start_time
        
        print(f"\n✅ {description} completed in {elapsed:.1f}s")
        return True, elapsed
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {description} failed with return code {e.returncode}")
        return False, 0
    except Exception as e:
        print(f"\n❌ {description} failed with error: {e}")
        return False, 0


def main():
    """Run all Phase 1 benchmarks."""
    print("\n" + "="*80)
    print("🎯 MODEL PERFORMANCE EVALUATION - PHASE 1: QUICK WINS")
    print("="*80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nThis will run 5 benchmark scripts to establish baseline performance metrics.")
    print("Estimated time: 5-10 minutes")
    print("="*80)
    
    benchmarks = [
        ("benchmark_embedding_speed.py", "Embedding Speed Benchmark"),
        ("benchmark_similarity_search.py", "Similarity Search Benchmark"),
        ("benchmark_e2e_pipeline.py", "End-to-End Pipeline Benchmark"),
        ("analyze_similarity_distribution.py", "Similarity Distribution Analysis"),
        ("evaluate_parent_child_links.py", "Parent-Child Link Quality Evaluation"),
    ]
    
    results = []
    total_start = time.time()
    
    for script_name, description in benchmarks:
        success, elapsed = run_benchmark(script_name, description)
        results.append((description, success, elapsed))
        
        # Short pause between benchmarks
        if script_name != benchmarks[-1][0]:
            time.sleep(1)
    
    total_elapsed = time.time() - total_start
    
    # Summary Report
    print("\n" + "="*80)
    print("📊 PHASE 1 BENCHMARK SUMMARY")
    print("="*80)
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total Time: {total_elapsed:.1f}s ({total_elapsed/60:.1f} minutes)")
    
    print("\n" + "-"*80)
    print("Results:")
    print("-"*80)
    
    passed = 0
    failed = 0
    
    for description, success, elapsed in results:
        status = "✅ PASS" if success else "❌ FAIL"
        time_str = f"{elapsed:.1f}s" if elapsed > 0 else "N/A"
        print(f"  {status} | {description:45s} | {time_str}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "-"*80)
    print(f"Summary: {passed} passed, {failed} failed out of {len(results)} benchmarks")
    print("-"*80)
    
    if failed == 0:
        print("\n🎉 All Phase 1 benchmarks completed successfully!")
        print("\n📝 Next Steps:")
        print("  1. Review the output above for any performance concerns")
        print("  2. Compare results against success criteria in the documentation")
        print("  3. Consider proceeding to Phase 2 (Quality Validation)")
        print("     - Requires manual labeling of 50-100 tickets")
        print("     - See docs/Model-performance.md for details")
    else:
        print("\n⚠️  Some benchmarks failed. Please review the errors above.")
        print("Common issues:")
        print("  - LM Studio not running (check http://localhost:1234)")
        print("  - Database connection issues (check docker-compose services)")
        print("  - No embeddings in database (run populate_embeddings.py first)")
    
    print("\n" + "="*80)
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
