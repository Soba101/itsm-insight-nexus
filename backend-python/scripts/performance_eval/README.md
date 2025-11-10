# Backend Python Scripts

This directory contains utility scripts for the ITSM Insight Nexus backend.

## Model Performance Benchmarks

Comprehensive performance evaluation scripts for embedding models. See `docs/Model-performance.md` for detailed documentation.

### Phase 1: Quick Wins (5-10 minutes)

Run all Phase 1 benchmarks at once:

```bash
docker exec itsm-python-backend python scripts/run_phase1_benchmarks.py
```

Or run individual benchmarks:

1. **Embedding Speed Benchmark** - Measure embedding generation performance

   ```bash
   docker exec itsm-python-backend python scripts/benchmark_embedding_speed.py
   ```

2. **Similarity Search Benchmark** - Test pgvector query performance

   ```bash
   docker exec itsm-python-backend python scripts/benchmark_similarity_search.py
   ```

3. **End-to-End Pipeline Benchmark** - Measure complete workflow latency

   ```bash
   docker exec itsm-python-backend python scripts/benchmark_e2e_pipeline.py
   ```

4. **Similarity Distribution Analysis** - Analyze embedding discrimination

   ```bash
   docker exec itsm-python-backend python scripts/analyze_similarity_distribution.py
   ```

5. **Parent-Child Link Quality** - Evaluate relationship quality

   ```bash
   docker exec itsm-python-backend python scripts/evaluate_parent_child_links.py
   ```

### Prerequisites

Before running benchmarks:

1. Ensure LM Studio is running at `http://localhost:1234`
2. Database should have tickets with embeddings (run `populate_embeddings.py` first)
3. Docker containers should be running (`docker-compose up -d`)

### Expected Results

**Success Criteria (Phase 1):**

- ✅ Embedding latency <500ms per ticket
- ✅ Similarity search <100ms (p95)
- ✅ End-to-end pipeline <2 seconds
- ✅ Similarity separation gap >0.10
- ✅ Parent-child mean similarity >0.75

## Embedding & Relationship Scripts

### populate_embeddings.py

Generate embeddings for tickets that don't have them yet.

```bash
docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100 --batch-size 10
```

Options:

- `--limit N` - Process only N tickets (default: all)
- `--batch-size N` - Batch size for embedding generation (default: 10)
- `--dry-run` - Preview changes without committing

### establish_ticket_relationships.py

Create parent-child relationships between similar tickets.

```bash
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --min-similarity 0.80 --dry-run
```

Options:

- `--min-similarity X` - Minimum similarity threshold (default: 0.80)
- `--dry-run` - Preview relationships without saving
- `--limit N` - Process only N tickets

### embedding_worker.py

Background worker that processes the embedding queue.

```bash
docker exec itsm-python-backend python scripts/embedding_worker.py
```

This worker runs continuously and:

- Monitors the `embedding_queue` table
- Generates embeddings for new/updated tickets
- Updates the database with embeddings

## Model Comparison (Testing Multiple Models)

When testing multiple embedding models:

1. **Configure Model in Environment**

   ```bash
   # Edit .env or docker-compose.yml
   LM_STUDIO_MODEL=text-embedding-qwen3-embedding-8b
   # or
   LM_STUDIO_MODEL=text-embedding-embeddinggemma-300m-qat
   ```

2. **Run Benchmarks for Each Model**

   ```bash
   # Test Model A (Gemma)
   docker exec itsm-python-backend python scripts/run_phase1_benchmarks.py > results_gemma.txt

   # Switch model in LM Studio

   # Test Model B (Qwen3)

   docker exec itsm-python-backend python scripts/run_phase1_benchmarks.py > results_qwen3.txt

   ```

3. **Compare Results**
   Review the output files to compare:
   - Embedding speed (tokens/sec, latency)
   - Search performance
   - Similarity distribution
   - Quality metrics

## Troubleshooting

### "No tickets with embeddings found"

- Run `populate_embeddings.py` first to generate embeddings

### "Connection refused to LM Studio"

- Ensure LM Studio is running
- Check `LM_STUDIO_BASE_URL` in environment

### "No parent-child links found"

- Run `establish_ticket_relationships.py` first

### "Database connection error"

- Verify docker containers are running: `docker ps`
- Check database credentials in `.env`

## Next Steps

After completing Phase 1 benchmarks:

1. Review results against success criteria
2. Proceed to Phase 2 (Quality Validation) - requires manual labeling
3. Consider model comparison if results are suboptimal
4. See `docs/Model-performance.md` for full evaluation plan
