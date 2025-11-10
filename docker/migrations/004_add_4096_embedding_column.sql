-- Migration: Add 4096-dimension embedding column for Qwen3 model
-- Purpose: Enable A/B testing between Gemma (768-dim) and Qwen3 (4096-dim)
-- Date: 2025-11-10
-- Note: pgvector 0.5.x has 2000 dimension limit for indexes. Upgrade to 0.7+ for higher dimensions.

-- Add new column for 4096-dimensional embeddings
ALTER TABLE servicenow_incidents 
ADD COLUMN IF NOT EXISTS embedding_4096 vector(4096);

-- NOTE: Cannot create index yet - pgvector 0.5.x limits indexes to 2000 dimensions
-- Option 1: Upgrade to pgvector 0.7.0+ which supports HNSW up to 16,000 dimensions
-- Option 2: Use brute-force search (slower but exact, acceptable for <10K tickets)
-- Option 3: Reduce dimensions via PCA to 2000 (loses information)

-- For now: Create a partial index on smaller subset for testing
-- CREATE INDEX IF NOT EXISTS idx_embedding_4096_sample 
-- ON servicenow_incidents (incident_number)
-- WHERE embedding_4096 IS NOT NULL;

-- Add comment to document the dual-column strategy
COMMENT ON COLUMN servicenow_incidents.embedding IS 
'768-dimensional embeddings from EmbeddingGemma-300m-qat model (HNSW indexed)';

COMMENT ON COLUMN servicenow_incidents.embedding_4096 IS 
'4096-dimensional embeddings from Qwen3-8B model for A/B testing. NO INDEX - brute force search due to pgvector dimension limit. Upgrade to pgvector 0.7+ for indexing.';

-- Note: Both columns can coexist. Worker will populate based on LM_STUDIO_MODEL env var.
-- Use embedding_4096 column when querying with model='qwen3' parameter.
-- Performance: 10K tickets without index should still be fast enough for A/B testing (milliseconds).


