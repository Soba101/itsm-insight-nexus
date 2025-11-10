# Model Performance Testing - Quick Start Guide

**Date:** 10 November 2025
**Models to Test:**

- `text-embedding-embeddinggemma-300m-qat` (baseline, 300M parameters)
- `text-embedding-qwen3-embedding-8b` (challenger, 8B parameters)

## ✅ Pre-flight Checklist

### Status Check

- ✅ LM Studio running at http://localhost:1234
- ✅ Both models available in LM Studio
- ⏳ Docker containers status (check needed)
- ⏳ Database has tickets with embeddings (check needed)

## 🚀 Quick Start - Phase 1 Benchmarks

### Option A: Run All Benchmarks (Recommended)

```bash
# Make sure you're in the conda environment
conda activate itsm

# Run all Phase 1 benchmarks at once
docker exec itsm-python-backend python scripts/performance_eval/run_phase1_benchmarks.py
```

This will run all 5 benchmarks in sequence (~5-10 minutes) and give you a complete baseline.

### Option B: Run Individual Benchmarks

```bash
conda activate itsm

# 1. Embedding Speed (fastest, ~1-2 min)
docker exec itsm-python-backend python scripts/performance_eval/benchmark_embedding_speed.py

# 2. Similarity Search (~1-2 min)
docker exec itsm-python-backend python scripts/performance_eval/benchmark_similarity_search.py

# 3. End-to-End Pipeline (~1 min)
docker exec itsm-python-backend python scripts/performance_eval/benchmark_e2e_pipeline.py

# 4. Similarity Distribution (~2-3 min)
docker exec itsm-python-backend python scripts/performance_eval/analyze_similarity_distribution.py

# 5. Parent-Child Link Quality (~1 min)
docker exec itsm-python-backend python scripts/performance_eval/evaluate_parent_child_links.py
```

## 📊 Testing Both Models

### Model A: EmbeddingGemma-300m (Baseline)

1. **Select model in LM Studio**: `text-embedding-embeddinggemma-300m-qat`

2. **Run benchmarks and save results:**
   ```bash
   conda activate itsm
   docker exec itsm-python-backend python scripts/performance_eval/run_phase1_benchmarks.py | tee results_gemma_$(date +%Y%m%d_%H%M%S).txt
   ```

### Model B: Qwen3-8B (Challenger)

1. **Switch model in LM Studio**: `text-embedding-qwen3-embedding-8b`

2. **Update environment variable (if needed):**
   ```bash
   # Edit docker-compose.yml or .env to set:
   LM_STUDIO_MODEL=text-embedding-qwen3-embedding-8b

   # Restart python backend

   docker-compose restart python-backend

   ```

3. **Run benchmarks and save results:**
   ```bash

   conda activate itsm
   docker exec itsm-python-backend python scripts/performance_eval/run_phase1_benchmarks.py | tee results_qwen3_$(date +%Y%m%d_%H%M%S).txt

   ```

## 🔍 What to Look For

### Success Criteria - Phase 1

**Computational Performance:**
- ✅ Mean embedding latency <500ms per ticket
- ✅ Batch throughput >5 tickets/sec
- ✅ Similarity search <100ms (p95)
- ✅ End-to-end pipeline <2 seconds
- ✅ Memory usage <2GB

**Quality Metrics:**
- ✅ Same category mean similarity >0.60
- ✅ Different category mean similarity <0.50
- ✅ Separation gap >0.10
- ✅ Parent-child mean similarity >0.75
- ✅ Category agreement >70%

### Expected Trade-offs

**EmbeddingGemma-300m:**
- 🚀 Faster (150-300ms per ticket)
- 💾 Less memory (~500MB)
- 📊 Potentially lower accuracy

**Qwen3-8B:**
- 🐌 Slower (300-800ms per ticket)
- 💾 More memory (~2-4GB)
- 📊 Potentially higher accuracy

## 🛠️ Troubleshooting

### "No tickets with embeddings found"

First, populate embeddings:
```bash

docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100 --batch-size 10

```

### "No parent-child links found"

Generate relationships first:
```bash

docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --min-similarity 0.80 --dry-run

# If dry-run looks good, remove --dry-run flag

```

### "Connection refused to LM Studio"

1. Verify LM Studio is running:
   ```bash

   curl http://localhost:1234/v1/models

   ```

2. Check which model is loaded in LM Studio UI

3. Verify `LM_STUDIO_BASE_URL` in docker-compose.yml:
   ```yaml

   LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1

   ```

### Docker containers not running

```bash

# Start all services

cd /Users/don/DocumentsMac/Codes/itsm-insight-nexus
docker-compose up -d postgres postgrest python-backend embedding-worker

```

## 📝 Decision Framework

After running benchmarks for both models:

**Switch to Qwen3-8B if:**
- Precision@5 improves by >10%
- Latency remains <1s per ticket
- Memory usage is acceptable for your hardware

**Keep EmbeddingGemma-300m if:**
- Quality improvement <5%
- Latency >2s per ticket impacts UX
- Memory constraints are an issue

**Hybrid Approach if:**
- Qwen3 is more accurate but slower
- Use Gemma for real-time similarity searches
- Use Qwen3 for batch embedding generation overnight

## 📚 Next Steps After Phase 1

1. **Compare Results:**
   - Review both result files side-by-side
   - Document performance differences
   - Calculate quality vs speed trade-offs

2. **Phase 2 - Quality Validation** (optional, requires manual work):
   - Create ground truth dataset (50-100 tickets)
   - Run Precision@K evaluation
   - Evaluate clustering metrics
   - See `docs/Model-performance.md` Section 1.2-1.3

3. **Production Decision:**
   - Choose model based on decision criteria
   - Update docker-compose.yml with chosen model
   - Document the decision and rationale

## 🎯 Quick Commands Reference

```bash

# Activate environment

conda activate itsm

# Run all benchmarks

docker exec itsm-python-backend python scripts/performance_eval/run_phase1_benchmarks.py

# Check LM Studio

curl http://localhost:1234/v1/models

# Check docker services

docker ps --filter "name=itsm"

# Populate embeddings

docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100

# Create relationships

docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --min-similarity 0.80

```

## � Results Documentation

Save your results with:
```bash

# Create results directory

mkdir -p results/model-performance

# Run with timestamp

docker exec itsm-python-backend python scripts/performance_eval/run_phase1_benchmarks.py | tee results/model-performance/baseline_$(date +%Y%m%d_%H%M%S).txt

```

**Results are logged in:** `docs/model-results.md`

This document tracks:
- Complete benchmark results for each model
- Performance vs quality trade-offs
- Success criteria evaluations
- Recommendations and decision log

---

**Ready to start?** Run the pre-flight checklist, then execute Option A above! 🚀
