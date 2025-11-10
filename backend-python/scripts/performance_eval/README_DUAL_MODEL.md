# Dual-Model A/B Testing Setup

This directory contains scripts for comparing the **Gemma-768** and **Qwen3-4096** embedding models side-by-side.

## Architecture

The system now supports **dual embedding columns**:

- `embedding` (768-dim) - EmbeddingGemma-300m-qat model with HNSW index
- `embedding_4096` (4096-dim) - Qwen3-8B model **without index** (pgvector dimension limit)

⚠️ **Note**: pgvector 0.5.x limits indexes to 2000 dimensions. The 4096-dim column uses brute-force search, which is acceptable for <10K tickets (queries still complete in milliseconds).

## Quick Start

### 1. Populate Qwen3 Embeddings

Switch LM Studio to Qwen3 model and populate the `embedding_4096` column:

```bash
# Update docker-compose.yml to use Qwen3
cd /Users/don/DocumentsMac/Codes/itsm-insight-nexus

# Edit docker-compose.yml: 
# LM_STUDIO_MODEL=text-embedding-qwen3-embedding-8b

# Restart backend to pick up new model
docker compose restart python-backend embedding-worker

# Populate embeddings (use --limit 100 for testing)
docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100 --batch-size 8
```

### 2. Compare Model Quality

Run the comparison script to measure separation gap for both models:

```bash
docker exec itsm-python-backend python scripts/performance_eval/compare_models.py
```

This will show:
- Same-category vs different-category similarity for each model
- Separation gap (higher = better)
- Recommendation on which model to use

### 3. Test API with Model Selection

Query the similarity API with different models:

```bash
# Using Gemma (768-dim)
curl -X POST http://localhost:8000/api/ai/similarity/search \
  -H "Content-Type: application/json" \
  -d '{
    "incident_number": "INC0000001",
    "model": "gemma",
    "top_k": 5
  }'

# Using Qwen3 (4096-dim)
curl -X POST http://localhost:8000/api/ai/similarity/search \
  -H "Content-Type: application/json" \
  -d '{
    "incident_number": "INC0000001",
    "model": "qwen3",
    "top_k": 5
  }'
```

## Model Comparison Results

### Performance Trade-offs

| Model | Dimensions | Embedding Speed | Index Type | Search Speed |
|-------|------------|----------------|------------|--------------|
| Gemma-768 | 768 | ~26ms (fast) | HNSW | <1ms indexed |
| Qwen3-4096 | 4096 | ~436ms (16x slower) | None | ~5-10ms brute force |

### Quality Metrics (Target)

- **Separation Gap**: >0.10 (excellent), >0.05 (good), <0.0 (failed)
- **Same-category similarity**: >0.60 (target)
- **Different-category similarity**: <0.50 (target)

## Migration Path

### Option A: Keep Both Models

Maintain dual columns for A/B testing and gradually transition:

```sql
-- Frontend can specify which model to use
SELECT ... WHERE model = 'gemma' OR model = 'qwen3'
```

### Option B: Migrate to Qwen3

If Qwen3 shows better quality, migrate fully:

```sql
-- Drop old column
ALTER TABLE servicenow_incidents DROP COLUMN embedding;

-- Rename new column
ALTER TABLE servicenow_incidents RENAME COLUMN embedding_4096 TO embedding;

-- Update to pgvector 0.7+ and create HNSW index
CREATE INDEX idx_embedding ON servicenow_incidents 
USING hnsw (embedding vector_cosine_ops);
```

### Option C: Upgrade pgvector

To get indexed searches for 4096 dimensions:

1. Upgrade pgvector to 0.7.0+ (supports HNSW up to 16,000 dims)
2. Create HNSW index on `embedding_4096`
3. Benchmark performance improvement

## Files Modified

- `docker/migrations/004_add_4096_embedding_column.sql` - Migration script
- `backend-python/scripts/embedding_worker.py` - Auto-detects dimension, routes to correct column
- `backend-python/app/api/similarity.py` - Added `model` parameter (gemma/qwen3)
- `backend-python/app/services/similarity.py` - Added `embedding_column` parameter
- `backend-python/scripts/performance_eval/compare_models.py` - Quality comparison script

## Troubleshooting

### "No embeddings found in embedding_4096"

You need to populate the column first:

```bash
# Make sure LM Studio is using Qwen3
# Check docker-compose.yml: LM_STUDIO_MODEL=text-embedding-qwen3-embedding-8b

docker compose restart python-backend
docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100
```

### "Dimension mismatch" errors

The worker auto-detects dimensions and routes to the correct column:
- 768-dim → `embedding`
- 4096-dim → `embedding_4096`

Make sure `LM_STUDIO_MODEL` env var matches your LM Studio model.

### Slow Qwen3 queries

Expected behavior - 4096-dim uses brute-force search (no index). Still acceptable for:
- Background processing (embedding worker)
- <10K tickets (queries in 5-10ms)

For production at scale, upgrade to pgvector 0.7+ for HNSW indexing.
