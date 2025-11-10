# Embedding Model Performance Results

**Project:** ITSM Insight Nexus
**Evaluation Period:** November 2025
**Dataset:** 78 ServiceNow incidents with embeddings

---

## Test Configuration

**Hardware:**

- Platform: Docker on macOS (ARM64)
- LM Studio: http://localhost:1234
- Database: PostgreSQL 15 + pgvector

**Models Evaluated:**

1. `text-embedding-embeddinggemma-300m-qat` (300M parameters, baseline)
2. `text-embedding-qwen3-embedding-8b` (8B parameters, challenger) - *Pending*

---

## Model 1: EmbeddingGemma-300m-qat

**Test Date:** 10 November 2025, 06:03 UTC
**Test Duration:** 6.3 seconds
**Status:** ✅ All benchmarks completed successfully

### Performance Summary

| Metric Category | Status | Overall Rating |
|----------------|--------|----------------|
| Computational Performance | ✅ Pass | ⭐⭐⭐ Exceptional |
| Quality Metrics | ❌ Fail | ⚠️ Needs Improvement |
| Business Impact | ❌ Fail | ⚠️ Poor |

---

### 1. Computational Performance Metrics

#### 1.1 Embedding Speed Benchmark

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| Mean Latency | **26.2ms** ± 20.4ms | <500ms | ✅ **PASS** |
| Median Latency | 19.7ms | - | ✅ Excellent |
| Min Latency | 12.1ms | - | - |
| Max Latency | 86.3ms | - | - |

**Batch Throughput:**

| Batch Size | Throughput | Per-Ticket Latency |
|------------|------------|-------------------|
| 1 | 60.5 tickets/sec | 16.5ms |
| 4 | 78.3 tickets/sec | 12.8ms |
| 8 | 55.3 tickets/sec | 18.1ms |
| 16 | 76.9 tickets/sec | 13.0ms |
| 32 | 68.5 tickets/sec | 14.6ms |

**Aggregate:** 65.9 tickets/sec average ✅ (Target: >5)

**Memory Usage:** ⚠️ Not measured (psutil unavailable)

**Key Findings:**

- ⭐ **Extremely fast** embedding generation
- ⭐ Batch processing scales well (optimal at batch size 4-16)
- ⭐ Consistent low latency across ticket sizes

---

#### 1.2 Similarity Search Benchmark

| Top-K | Mean Latency | P95 Latency | Min | Max |
|-------|--------------|-------------|-----|-----|
| 5 | 1.3ms ± 0.3ms | 1.8ms | 1.1ms | 2.1ms |
| 10 | **1.2ms** ± 0.1ms | **1.4ms** | 1.1ms | 1.5ms |
| 20 | 1.2ms ± 0.0ms | 1.2ms | 1.1ms | 1.2ms |
| 50 | 1.2ms ± 0.0ms | 1.2ms | 1.1ms | 1.2ms |

**Index Status:** ❌ No HNSW index (using sequential scan)
**Performance Scaling:** ✅ Sub-linear (ratio: 0.91x from top-5 to top-50)

**Key Findings:**

- ⭐ **Exceptional** query performance even without index
- ⭐ Performance scales very well with larger K values
- 💡 HNSW index would further optimize but not critical
- ⚠️ Performance may degrade significantly with larger datasets (>1000 tickets)

---

#### 1.3 End-to-End Pipeline Benchmark

| Stage | Time | Percentage |
|-------|------|------------|
| Embedding Generation | 59.1ms | 86.1% |
| Database Storage | 6.6ms | 9.6% |
| Similarity Search | 2.9ms | 4.2% |
| **Total E2E** | **68.7ms** | 100% |

**Performance Tier:** ⭐⭐⭐ **EXCEPTIONAL** (<500ms)

**Test Ticket Results:**

- Top-1: INC0000003 (similarity: 0.6151)
- Top-2: INC0000036 (similarity: 0.5892)
- Top-3: INC0000002 (similarity: 0.5486)

**Key Findings:**

- ⭐ Complete workflow under 70ms is outstanding
- ⚠️ Bottleneck is embedding generation (86% of time)
- ⭐ Database operations are negligible overhead

---

### 2. Quality Metrics

#### 2.1 Similarity Distribution Analysis

**Dataset:** 78 tickets, 725 comparisons (232 same category, 493 different category)

| Comparison Type | Mean Similarity | Std Dev | Range |
|-----------------|-----------------|---------|-------|
| Same Category | **0.4933** | 0.0967 | 0.1429 - 0.6728 |
| Different Category | **0.5335** | 0.0816 | 0.1759 - 0.7484 |
| **Separation Gap** | **-0.0402** | - | - |

**Priority-Based Comparison:**

| Comparison Type | Mean Similarity | Separation Gap |
|-----------------|-----------------|----------------|
| Same Priority | 0.4827 | - |
| Different Priority | 0.5331 | -0.0504 |

**Success Criteria Evaluation:**

| Criterion | Target | Result | Status |
|-----------|--------|--------|--------|
| Same category mean | >0.60 | 0.4933 | ❌ **FAIL** |
| Different category mean | <0.50 | 0.5335 | ❌ **FAIL** |
| Separation gap | >0.10 | -0.0402 | ❌ **FAIL** |

**🚨 Critical Issue: INVERTED SEPARATION**

The model shows **negative separation** - tickets with different categories are scoring **higher similarity** than tickets with the same category. This indicates:

1. **Model cannot distinguish** between similar and dissimilar tickets
2. **Embeddings may not capture semantic meaning** relevant to ITSM categories
3. **Quality is inadequate** for production use despite excellent speed

**Potential Causes:**

- Model not fine-tuned for ITSM/technical support domain
- Category definitions too broad or inconsistent
- Insufficient training data for this use case
- Model architecture limitations (300M parameters may be too small)

---

#### 2.2 Parent-Child Link Quality

**Dataset:** 18 established parent-child relationships

**Similarity Statistics:**

| Metric | Value |
|--------|-------|
| Mean Similarity | **0.4971** |
| Median Similarity | 0.4907 |
| Std Dev | 0.0594 |
| Min Similarity | 0.4082 |
| Max Similarity | 0.6890 |

**Agreement Metrics:**

| Type | Agreement Rate | Target | Status |
|------|---------------|--------|--------|
| Category Agreement | **38.9%** (7/18) | >70% | ❌ **FAIL** |
| Priority Agreement | 38.9% (7/18) | - | ❌ Poor |

**Similarity Distribution:**

| Range | Count | Percentage |
|-------|-------|------------|
| 0.95-1.00 | 0 | 0.0% |
| 0.90-0.95 | 0 | 0.0% |
| 0.85-0.90 | 0 | 0.0% |
| 0.80-0.85 | 0 | 0.0% |
| 0.75-0.80 | 0 | 0.0% |
| <0.75 | **18** | **100.0%** |

**Top Categories:**

1. Inquiry / Help: 12 links (66.7%)
2. Software: 3 links (16.7%)
3. Hardware: 2 links (11.1%)
4. Unknown: 1 link (5.6%)

**Success Criteria Evaluation:**

| Criterion | Target | Result | Status |
|-----------|--------|--------|--------|
| Mean similarity | >0.80 | 0.4971 | ❌ **FAIL** |
| Category agreement | >70% | 38.9% | ❌ **FAIL** |
| Optimal range (0.80-0.95) | >50% | 0.0% | ❌ **FAIL** |

**Overall Link Quality:** ⚠️ **NEEDS IMPROVEMENT**

**Key Findings:**

- 🚨 **All relationships are weak** (no links >0.75 similarity)
- ❌ Poor category coherence in relationships
- ⚠️ Current threshold (0.80) is too high for this model
- 💡 Relationships are essentially random given low similarity scores

---

### 3. Aggregate Assessment

#### Performance vs Quality Trade-off

```
Speed:    ⭐⭐⭐⭐⭐ (5/5) - Exceptional
Quality:  ⭐☆☆☆☆ (1/5) - Poor
Overall:  ⭐⭐☆☆☆ (2/5) - Not Production Ready
```

#### Pros ✅

- Extremely fast embedding generation (26ms avg)
- Excellent batch throughput (65+ tickets/sec)
- Sub-millisecond similarity search
- Exceptional end-to-end performance (<70ms)
- Low resource requirements (300M parameters)
- Scales well with batch sizes

#### Cons ❌

- **Cannot distinguish similar vs dissimilar tickets** (inverted separation)
- **Weak semantic understanding** of ITSM domain
- All parent-child links are low quality (<0.75)
- Poor category and priority agreement
- Unsuitable for duplicate detection
- Unsuitable for automatic relationship creation

---

### 4. Recommendations

#### Immediate Actions:

1. ✅ **Test Qwen3-8B model** - Larger model may capture semantics better
2. ⚠️ **Do NOT use for production** - Quality is inadequate
3. 💡 **Lower relationship threshold** to 0.50-0.60 (though still problematic)
4. 📊 **Investigate category definitions** - May be too inconsistent

#### Model Selection Criteria:

**EmbeddingGemma-300m should be replaced if:**

- Qwen3-8B shows positive separation gap (>0.10)
- Category agreement improves to >60%
- Mean similarity for same-category >0.60

**Keep EmbeddingGemma-300m only if:**

- Speed is critical and quality can be compromised
- Use case doesn't require semantic similarity
- Alternative uses (e.g., simple text matching)

#### Further Investigation:

1. **Data quality audit** - Review category assignments
2. **Domain mismatch analysis** - Model may not understand ITSM terminology
3. **Alternative models** - Consider domain-specific or fine-tuned models
4. **Hybrid approach** - Fast model for initial filtering, accurate model for ranking

---

### 5. Benchmark Execution Details

**Environment:**

- Container: `itsm-python-backend` (healthy)
- Python: 3.11
- pgvector: 0.2.3
- PostgreSQL: 15
- Dataset size: 78 incidents

**Benchmark Scripts:**

- `benchmark_embedding_speed.py` - 1.6s ✅
- `benchmark_similarity_search.py` - 0.2s ✅
- `benchmark_e2e_pipeline.py` - 0.3s ✅
- `analyze_similarity_distribution.py` - 0.1s ✅
- `evaluate_parent_child_links.py` - 0.1s ✅

**Output saved to:** `results_phase1_20251110_060332.txt`

---

## Model 2: Qwen3-8B

**Test Date:** 10 November 2025, 07:54 UTC
**Test Duration:** 33.5 seconds
**Status:** ⚠️ Partial completion (dimension mismatch error)

**Critical Issue:** 🚨 Model produces **4096-dimensional embeddings**, but database schema expects 768 dimensions. E2E pipeline test failed due to this mismatch.

### Performance Summary

| Metric Category | Status | Overall Rating |
|----------------|--------|----------------|
| Computational Performance | ⚠️ Mixed | ⭐⭐☆☆☆ Slow |
| Quality Metrics | ❌ Fail | ⚠️ Same as Gemma (No Improvement) |
| Business Impact | ❌ Fail | ⚠️ Poor |

---

### 1. Computational Performance Metrics

#### 1.1 Embedding Speed Benchmark

| Metric | Result | Target | Status | vs Gemma |
|--------|--------|--------|--------|----------|
| Mean Latency | **436.1ms** ± 287.0ms | <500ms | ✅ **PASS** | 🔴 16.6x slower |
| Median Latency | 335.6ms | - | ⚠️ Acceptable | 🔴 17.0x slower |
| Min Latency | 256.9ms | - | - | 🔴 21.2x slower |
| Max Latency | 1264.0ms | - | - | 🔴 14.6x slower |

**Batch Throughput:**

| Batch Size | Throughput | Per-Ticket Latency | vs Gemma |
|------------|------------|-------------------|----------|
| 1 | 3.7 tickets/sec | 272.2ms | 🔴 -93.9% |
| 4 | 3.3 tickets/sec | 300.5ms | 🔴 -95.8% |
| 8 | 3.0 tickets/sec | 328.6ms | 🔴 -94.6% |
| 16 | 3.2 tickets/sec | 309.2ms | 🔴 -95.8% |
| 32 | 2.7 tickets/sec | 364.5ms | 🔴 -96.1% |

**Aggregate:** 2.9 tickets/sec average ❌ (Target: >5, Gemma: 65.9)

**Embedding Dimension:** 4096 (vs Gemma: 768) - **5.3x larger vectors**

**Key Findings:**

- 🔴 **Significantly slower** than Gemma (16-21x slower single ticket)
- 🔴 **Poor batch throughput** - fails target by 40%
- ⚠️ Still passes <500ms target but barely
- 🔴 **Much larger embeddings** (4096-dim) increases storage/compute needs
- ⚠️ First embedding has warmup penalty (1264ms)

---

#### 1.2 Similarity Search Benchmark

| Top-K | Mean Latency | P95 Latency | Min | Max | vs Gemma |
|-------|--------------|-------------|-----|-----|----------|
| 5 | 1.3ms ± 0.2ms | 1.8ms | 1.1ms | 1.9ms | ≈ Same |
| 10 | **1.4ms** ± 0.4ms | **2.1ms** | 1.2ms | 2.5ms | ≈ Same |
| 20 | 1.8ms ± 0.5ms | 2.7ms | 1.4ms | 2.8ms | ≈ Same |
| 50 | 1.2ms ± 0.0ms | 1.2ms | 1.2ms | 1.3ms | ≈ Same |

**Index Status:** ❌ No HNSW index (using sequential scan)
**Performance Scaling:** ✅ Sub-linear (ratio: 0.91x)

**Key Findings:**

- ⭐ Search performance equivalent to Gemma despite 5.3x larger vectors
- ⭐ Small dataset (78 tickets) masks performance difference
- ⚠️ Likely to show degradation on larger datasets
- 💡 Larger vectors = more computation per comparison

---

#### 1.3 End-to-End Pipeline Benchmark

**Status:** ❌ **FAILED** - Dimension mismatch error

| Stage | Time | Status |
|-------|------|--------|
| Embedding Generation | 664.8ms | ✅ Completed (vs Gemma: 59.1ms) |
| Database Storage | - | ❌ Failed (4096 dims vs 768 expected) |
| Similarity Search | - | ⏭️ Skipped |
| **Total E2E** | **N/A** | ❌ Failed |

**Error:** `psycopg2.errors.DataException: expected 768 dimensions, not 4096`

**Key Findings:**

- 🔴 **11.3x slower** embedding generation vs Gemma
- 🚨 **Incompatible with current schema** - requires database migration
- ⚠️ Would fail production deployment without schema changes
- 💾 **5.3x more storage** required per embedding

---

### 2. Quality Metrics

#### 2.1 Similarity Distribution Analysis

**Dataset:** 78 tickets with old Gemma embeddings (Qwen3 not stored due to dimension mismatch)

⚠️ **Note:** Quality metrics are still based on Gemma embeddings since Qwen3 embeddings couldn't be stored.

| Comparison Type | Mean Similarity | Std Dev | Range |
|-----------------|-----------------|---------|-------|
| Same Category | **0.4933** | 0.0967 | 0.1429 - 0.6728 |
| Different Category | **0.5335** | 0.0816 | 0.1759 - 0.7484 |
| **Separation Gap** | **-0.0402** | - | - |

**Success Criteria Evaluation:**

| Criterion | Target | Result | Status |
|-----------|--------|--------|--------|
| Same category mean | >0.60 | 0.4933 | ❌ **FAIL** |
| Different category mean | <0.50 | 0.5335 | ❌ **FAIL** |
| Separation gap | >0.10 | -0.0402 | ❌ **FAIL** |

🚨 **Critical:** Cannot properly evaluate Qwen3 quality due to dimension mismatch. Results above are from old Gemma embeddings.

---

#### 2.2 Parent-Child Link Quality

**Dataset:** 18 established relationships (still using Gemma embeddings)

⚠️ **Note:** Same limitation - testing old Gemma embeddings, not new Qwen3.

| Metric | Value |
|--------|-------|
| Mean Similarity | **0.4971** |
| Category Agreement | **38.9%** (7/18) |
| Links in optimal range (0.80-0.95) | **0.0%** |

**Status:** ❌ Same poor results as Gemma (no improvement measurable)

---

### 3. Aggregate Assessment

#### Performance vs Quality Trade-off

```
Speed:    ⭐⭐☆☆☆ (2/5) - Very Slow (16x slower than Gemma)
Quality:  ❓❓❓❓❓ (N/A) - Cannot measure (dimension mismatch)
Overall:  ❌❌❌❌❌ (0/5) - Not Compatible
```

#### Pros ✅

- Passes <500ms embedding target (barely)
- Larger model *should* capture more semantic information (untested)
- Search performance comparable to Gemma on small dataset

#### Cons ❌

- **16-21x slower** embedding generation
- **Fails batch throughput target** (2.9 vs 5.0 required)
- **Incompatible dimensions** with current database schema
- **5.3x larger storage** requirements (4096 vs 768 dims)
- **Cannot be tested properly** without database migration
- **No quality improvement measured** (testing old embeddings)
- **Likely worse performance** on larger datasets

---

### 4. Critical Blockers

#### Dimension Mismatch 🚨

**Problem:** Qwen3-8B produces 4096-dimensional embeddings, database schema is fixed at 768 dimensions.

**Required Changes:**

1. Alter database schema: `ALTER TABLE servicenow_incidents ALTER COLUMN embedding TYPE vector(4096);`
2. Re-embed all existing tickets with Qwen3
3. Update all similarity thresholds (different dimensionality)
4. Recreate HNSW indexes
5. Test quality metrics with new embeddings

**Impact:**

- ~2-3 hours migration time for 78 tickets
- Weeks for full production dataset
- Breaking change - requires downtime
- Need to backup and potentially roll back

#### Performance Concerns 🔴

Even if dimension issue resolved:

- **16x slower** embedding generation unacceptable for real-time use
- **Fails throughput target** by 40%
- **Larger vectors** = more storage, memory, compute
- Would require architecture changes (async processing, caching, etc.)

---

### 5. Recommendations

#### ❌ Do NOT Use Qwen3-8B

**Reasons:**

1. 🚨 **Incompatible** with current infrastructure
2. 🔴 **Too slow** for production use (16x slower)
3. ❌ **Fails performance targets**
4. 💾 **5x more storage** cost
5. ❓ **Unproven quality improvement** (couldn't test)
6. 🔧 **Requires major migration** effort

#### ❌ Do NOT Use EmbeddingGemma-300m Either

**Reasons:**

1. 🚨 **Inverted separation gap** - fundamentally broken
2. ❌ **Cannot distinguish** similar vs dissimilar
3. ❌ **Poor quality** across all metrics

---

### 6. Alternative Approaches

#### Recommended Next Steps:

1. **Test smaller, domain-appropriate models:**
   - `all-MiniLM-L6-v2` (384-dim, 22M params) - faster than Gemma
   - `bge-small-en-v1.5` (384-dim, optimized for retrieval)
   - `gte-small` (384-dim, good semantic understanding)

2. **Consider fine-tuning:**
   - Fine-tune smaller model on ITSM tickets
   - Domain-specific training could fix semantic issues
   - Maintains speed advantage

3. **Hybrid approach:**
   - Fast model (Gemma) for initial filtering
   - Slower accurate model for final ranking
   - Best of both worlds

4. **Investigate data quality:**
   - Audit category assignments
   - Check for inconsistent labeling
   - May need data cleaning before model testing

#### Model Selection Criteria Updated:

**Must Have:**

- Positive separation gap (>0.10)
- Same-category similarity >0.60
- Dimensions ≤1024 (for reasonable performance)
- Embedding speed <200ms per ticket
- Batch throughput >10 tickets/sec

**Nice to Have:**

- <100ms embedding latency
- Pre-trained on technical/support domain
- Active development/community

---

### 7. Benchmark Execution Details

**Environment:**

- Container: `itsm-python-backend` (healthy)
- Python: 3.11
- Model: Qwen3-8B (4096 dimensions)
- Dataset size: 78 incidents

**Benchmark Scripts:**

- `benchmark_embedding_speed.py` - 28.1s ✅
- `benchmark_similarity_search.py` - 0.2s ✅
- `benchmark_e2e_pipeline.py` - Failed ❌ (dimension mismatch)
- `analyze_similarity_distribution.py` - 0.1s ✅ (old embeddings)
- `evaluate_parent_child_links.py` - 0.1s ✅ (old embeddings)

**Output saved to:** `results_qwen3_20251110_075449.txt`

---

## Model 2: Qwen3-8B (Pending)

**Status:** 🔄 Not yet tested
**Expected test date:** TBD

**Expectations:**

- Slower embedding speed (300-800ms estimate)
- Higher memory usage (~2-4GB)
- Potentially better quality metrics
- Target: Positive separation gap >0.10

**Will update after testing...**

---

---

## Comparison Matrix

**Last Updated:** 10 November 2025

| Metric | EmbeddingGemma-300m | Qwen3-8B | Winner |
|--------|---------------------|----------|--------|
| **Embedding Speed** | 26.2ms ⭐⭐⭐⭐⭐ | 436.1ms ⭐⭐☆☆☆ | 🏆 **Gemma** (16.6x faster) |
| **Batch Throughput** | 65.9 tix/sec ⭐⭐⭐⭐⭐ | 2.9 tix/sec ⭐☆☆☆☆ | 🏆 **Gemma** (22.7x faster) |
| **Similarity Search** | 1.2ms ⭐⭐⭐⭐⭐ | 1.4ms ⭐⭐⭐⭐⭐ | ≈ Tie |
| **E2E Pipeline** | 68.7ms ⭐⭐⭐⭐⭐ | Failed ❌ | 🏆 **Gemma** |
| **Embedding Dimensions** | 768 | 4096 | 🏆 **Gemma** (5.3x smaller) |
| **Storage per Ticket** | ~3KB | ~16KB | 🏆 **Gemma** (5.3x less) |
| **Separation Gap** | -0.04 ❌ | N/A ❓ | ⚠️ Both Poor |
| **Same-Category Similarity** | 0.49 ❌ | N/A ❓ | ⚠️ Both Poor |
| **Category Agreement** | 38.9% ❌ | N/A ❓ | ⚠️ Both Poor |
| **Link Quality** | 0.50 ❌ | N/A ❓ | ⚠️ Both Poor |
| **Meets Speed Target** | ✅ Yes | ⚠️ Barely | 🏆 **Gemma** |
| **Meets Quality Target** | ❌ No | ❓ Unknown | ⚠️ Neither |
| **Production Ready** | ❌ No | ❌ No | ⚠️ Neither |
| **Database Compatible** | ✅ Yes | ❌ No | 🏆 **Gemma** |
| **Migration Required** | ✅ None | ❌ Major | 🏆 **Gemma** |
| **Overall Score** | 2/10 | 1/10 | 🏆 **Gemma** (barely) |

### Score Breakdown

**EmbeddingGemma-300m:**

- Speed: 5/5 ⭐⭐⭐⭐⭐
- Quality: 0/5 ☆☆☆☆☆
- Compatibility: 5/5 ⭐⭐⭐⭐⭐
- **Total: 10/15 (67%)** - Fast but useless

**Qwen3-8B:**

- Speed: 2/5 ⭐⭐☆☆☆
- Quality: 0/5 ❓❓❓❓❓ (untestable)
- Compatibility: 0/5 ❌❌❌❌❌
- **Total: 2/15 (13%)** - Incompatible and slow

---

## Comparison Matrix (After Testing Both Models)

*To be populated after Qwen3-8B testing*

| Metric | EmbeddingGemma-300m | Qwen3-8B | Winner |
|--------|---------------------|----------|--------|
| Embedding Speed | 26.2ms | TBD | - |
| Similarity Search | 1.2ms | TBD | - |
| E2E Pipeline | 68.7ms | TBD | - |
| Separation Gap | -0.04 ❌ | TBD | - |
| Category Agreement | 38.9% ❌ | TBD | - |
| Link Quality | 0.50 ❌ | TBD | - |
| **Recommendation** | ❌ Not suitable | TBD | - |

---

## Decision Log

### 10 November 2025 06:03 - Initial Evaluation (EmbeddingGemma-300m)

**Decision:** Do not deploy EmbeddingGemma-300m to production

**Rationale:**

1. Quality metrics fail all success criteria
2. Inverted separation gap is a critical flaw
3. Model cannot distinguish similar/dissimilar content
4. Speed advantage is irrelevant if quality is poor

**Next Steps:**

1. ✅ Test Qwen3-8B model
2. Compare results
3. Make final model selection
4. If both fail, investigate alternative models or fine-tuning

---

### 10 November 2025 07:54 - Qwen3-8B Evaluation

**Decision:** Do NOT deploy Qwen3-8B to production

**Rationale:**

1. 🚨 **Incompatible dimensions** (4096 vs 768) - requires major migration
2. 🔴 **16-21x slower** than Gemma - unacceptable performance
3. ❌ **Fails throughput target** by 40%
4. 💾 **5.3x more storage** required
5. ❓ **Quality unproven** - couldn't complete testing due to errors
6. 🔧 **Migration effort** not justified without proven quality gains

**Performance Comparison:**

- Gemma: 26ms/ticket, 65.9 tix/sec, 768-dim
- Qwen3: 436ms/ticket, 2.9 tix/sec, 4096-dim
- **Verdict:** Qwen3 worse in every measurable way

---

### 10 November 2025 08:00 - Final Assessment

**Decision:** ❌ REJECT both models for production use

**Summary:**

- **EmbeddingGemma-300m:** Fast but fundamentally broken quality
- **Qwen3-8B:** Slow, incompatible, and unproven quality

**Critical Finding:**
🚨 The inverted separation gap suggests a **fundamental problem** with either:

1. The models themselves (not suitable for ITSM domain)
2. The data quality (inconsistent categorization)
3. The evaluation methodology (wrong similarity metrics)

**Required Actions:**

1. 🔍 **Audit data quality** - Review category assignments for consistency
2. 🎯 **Test domain-appropriate models:**
   - `all-MiniLM-L6-v2` (384-dim, fast, general purpose)
   - `bge-small-en-v1.5` (384-dim, optimized for retrieval)
   - `sentence-transformers/all-mpnet-base-v2` (768-dim, balanced)
3. 🔧 **Consider fine-tuning** - Train on ITSM-specific data
4. 📊 **Validate categories** - Ensure tickets are labeled correctly

**Timeline:**

- Data audit: 2-3 days
- Alternative model testing: 1 week
- Fine-tuning exploration: 2-4 weeks

**Budget Impact:**

- Continue using keyword search (no AI features)
- Delay semantic similarity launch until suitable model found
- Consider commercial embedding APIs (OpenAI, Cohere) as backup

**Sign-off:** **Don** - Engineering Lead
**Status:** **Blocked** - Awaiting alternative model evaluation or data quality fixes

---

**Document Version:** 2.0
**Last Updated:** 10 November 2025, 08:00 UTC
**Status:** Both models tested, both rejected, alternatives needed
