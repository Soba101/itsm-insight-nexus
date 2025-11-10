# Embedding Model Performance Evaluation Plan

**Document Created:** 10 November 2025  
**Current Model:** EmbeddingGemma-300m-qat (768-dimensional, via LM Studio)  
**Models Under Test:**
- **text-embedding-qwen3-embedding-8b** (8B parameter model)
- **text-embedding-embeddinggemma-300m-qat** (300M parameter quantized model, baseline)

**Use Case:** ITSM ticket semantic similarity search and parent-child relationship detection

---

## Executive Summary

This document outlines a comprehensive plan to measure and evaluate the performance of embedding models used for ticket similarity detection. We will compare two models head-to-head: the larger Qwen3-8B model against the current EmbeddingGemma-300m baseline. Performance evaluation covers three dimensions: **Quality Metrics** (how accurate are the embeddings), **Computational Metrics** (how fast/efficient), and **Business Metrics** (real-world impact).

**Recommended Priority:**
1. **Phase 1 (Quick Wins):** Computational metrics - Easy to implement, immediate insights
2. **Phase 2 (Validation):** Quality metrics with manual labels - Medium effort, validates accuracy
3. **Phase 3 (Advanced):** Business metrics and A/B testing - Requires production data

---

## 1. Quality Metrics (Embedding Accuracy)

### 1.1 Similarity Score Distribution Analysis

**Goal:** Understand how well the model distinguishes between similar and dissimilar tickets.

**Metrics:**
- **Mean similarity score** for tickets with same category
- **Mean similarity score** for tickets with different categories
- **Separation gap:** Difference between related vs unrelated tickets
- **Score distribution histogram:** Identify thresholds for duplicate detection

**Implementation Difficulty:** ⭐ **Easy**  
**Time Estimate:** 2-4 hours

**Implementation:**

```python
# backend-python/scripts/analyze_similarity_distribution.py

import psycopg2
import numpy as np
import matplotlib.pyplot as plt
from pgvector.psycopg2 import register_vector
from app.core.database import get_db_connection

def analyze_similarity_distribution():
    """
    Analyze similarity score distributions to understand model behavior.
    """
    with get_db_connection() as conn:
        register_vector(conn)
        cursor = conn.cursor()
        
        # Get all tickets with embeddings
        cursor.execute("""
            SELECT incident_number, category, priority, embedding
            FROM servicenow_incidents
            WHERE embedding IS NOT NULL
            LIMIT 500  -- Sample for performance
        """)
        tickets = cursor.fetchall()
        
        same_category_scores = []
        diff_category_scores = []
        same_priority_scores = []
        diff_priority_scores = []
        
        # Compare each ticket with 10 random others
        for i, ticket_a in enumerate(tickets[:100]):
            for ticket_b in tickets[i+1:i+11]:
                # Calculate similarity
                cursor.execute("""
                    SELECT 1 - (embedding <=> %s::vector) AS similarity
                    FROM (SELECT %s::vector AS embedding) AS query
                """, (ticket_a[3], ticket_b[3]))
                
                similarity = cursor.fetchone()[0]
                
                # Categorize
                if ticket_a[1] == ticket_b[1]:  # Same category
                    same_category_scores.append(similarity)
                else:
                    diff_category_scores.append(similarity)
                
                if ticket_a[2] == ticket_b[2]:  # Same priority
                    same_priority_scores.append(similarity)
                else:
                    diff_priority_scores.append(similarity)
        
        # Statistics
        print("=== Similarity Distribution Analysis ===")
        print(f"\nSame Category:")
        print(f"  Mean: {np.mean(same_category_scores):.4f}")
        print(f"  Std:  {np.std(same_category_scores):.4f}")
        print(f"  Min:  {np.min(same_category_scores):.4f}")
        print(f"  Max:  {np.max(same_category_scores):.4f}")
        
        print(f"\nDifferent Category:")
        print(f"  Mean: {np.mean(diff_category_scores):.4f}")
        print(f"  Std:  {np.std(diff_category_scores):.4f}")
        
        print(f"\nSeparation Gap: {np.mean(same_category_scores) - np.mean(diff_category_scores):.4f}")
        
        # Histogram
        plt.figure(figsize=(12, 6))
        plt.hist(same_category_scores, bins=30, alpha=0.5, label='Same Category', color='green')
        plt.hist(diff_category_scores, bins=30, alpha=0.5, label='Different Category', color='red')
        plt.xlabel('Cosine Similarity')
        plt.ylabel('Frequency')
        plt.title('Similarity Distribution by Category')
        plt.legend()
        plt.savefig('similarity_distribution.png')
        print("\nHistogram saved to: similarity_distribution.png")

if __name__ == "__main__":
    analyze_similarity_distribution()
```

**Usage:**
```bash
docker exec itsm-python-backend python scripts/analyze_similarity_distribution.py
```

**Expected Output:**
- Separation gap >0.10 indicates good discrimination
- Histogram shows clear bimodal distribution

**Success Criteria:**
- ✅ Same category mean similarity >0.60
- ✅ Different category mean similarity <0.50
- ✅ Separation gap >0.10

---

### 1.2 Manual Labeling & Precision@K

**Goal:** Measure how many of the top-K similar tickets are actually relevant (human-validated).

**Metrics:**
- **Precision@K:** Of top K results, how many are truly similar?
- **Recall@K:** Of all similar tickets, how many are in top K?
- **Mean Reciprocal Rank (MRR):** Position of first relevant result

**Implementation Difficulty:** ⭐⭐⭐ **Medium** (requires human labeling)  
**Time Estimate:** 8-12 hours (including labeling)

**Process:**
1. **Sample Selection:** Pick 50-100 representative tickets
2. **Ground Truth Creation:** For each ticket, manually label 5-10 truly similar tickets
3. **Model Prediction:** Get top-10 similar tickets from model
4. **Evaluation:** Compare predicted vs ground truth

**Implementation:**

```python
# backend-python/scripts/evaluate_precision_at_k.py

import json
import psycopg2
from typing import List, Dict
from app.core.database import get_db_connection
from app.services.similarity import find_similar_tickets
from pgvector.psycopg2 import register_vector

def load_ground_truth(filepath: str) -> Dict[str, List[str]]:
    """
    Load manually labeled similar tickets.
    
    Format: {
        "INC0010001": ["INC0010005", "INC0010012", ...],
        "INC0010002": ["INC0010008", ...],
        ...
    }
    """
    with open(filepath, 'r') as f:
        return json.load(f)

def precision_at_k(predicted: List[str], ground_truth: List[str], k: int) -> float:
    """Calculate precision@k."""
    predicted_at_k = set(predicted[:k])
    relevant = set(ground_truth)
    true_positives = predicted_at_k & relevant
    return len(true_positives) / k if k > 0 else 0.0

def recall_at_k(predicted: List[str], ground_truth: List[str], k: int) -> float:
    """Calculate recall@k."""
    predicted_at_k = set(predicted[:k])
    relevant = set(ground_truth)
    true_positives = predicted_at_k & relevant
    return len(true_positives) / len(relevant) if len(relevant) > 0 else 0.0

def mean_reciprocal_rank(predicted: List[str], ground_truth: List[str]) -> float:
    """Calculate MRR - position of first relevant result."""
    relevant = set(ground_truth)
    for i, pred in enumerate(predicted, 1):
        if pred in relevant:
            return 1.0 / i
    return 0.0

async def evaluate_precision_at_k(ground_truth_file: str):
    """
    Evaluate model performance using manually labeled data.
    """
    ground_truth = load_ground_truth(ground_truth_file)
    
    with get_db_connection() as conn:
        register_vector(conn)
        
        results = {
            'precision@5': [],
            'precision@10': [],
            'recall@5': [],
            'recall@10': [],
            'mrr': []
        }
        
        for query_ticket, relevant_tickets in ground_truth.items():
            # Get embedding for query ticket
            cursor = conn.cursor()
            cursor.execute("""
                SELECT embedding FROM servicenow_incidents
                WHERE incident_number = %s
            """, (query_ticket,))
            
            result = cursor.fetchone()
            if not result or not result[0]:
                print(f"Warning: {query_ticket} has no embedding")
                continue
            
            query_embedding = result[0]
            
            # Find similar tickets
            similar = await find_similar_tickets(
                conn, query_embedding, top_k=10, min_similarity=0.0
            )
            
            predicted_ids = [t['incident_number'] for t in similar]
            
            # Calculate metrics
            results['precision@5'].append(precision_at_k(predicted_ids, relevant_tickets, 5))
            results['precision@10'].append(precision_at_k(predicted_ids, relevant_tickets, 10))
            results['recall@5'].append(recall_at_k(predicted_ids, relevant_tickets, 5))
            results['recall@10'].append(recall_at_k(predicted_ids, relevant_tickets, 10))
            results['mrr'].append(mean_reciprocal_rank(predicted_ids, relevant_tickets))
        
        # Print results
        print("=== Precision@K Evaluation ===")
        print(f"Test Set Size: {len(ground_truth)}")
        print(f"\nPrecision@5:  {np.mean(results['precision@5']):.4f} ± {np.std(results['precision@5']):.4f}")
        print(f"Precision@10: {np.mean(results['precision@10']):.4f} ± {np.std(results['precision@10']):.4f}")
        print(f"Recall@5:     {np.mean(results['recall@5']):.4f} ± {np.std(results['recall@5']):.4f}")
        print(f"Recall@10:    {np.mean(results['recall@10']):.4f} ± {np.std(results['recall@10']):.4f}")
        print(f"MRR:          {np.mean(results['mrr']):.4f} ± {np.std(results['mrr']):.4f}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(evaluate_precision_at_k("data/ground_truth_similar_tickets.json"))
```

**Ground Truth File Example:**
```json
{
  "INC0010001": ["INC0010005", "INC0010012", "INC0010023"],
  "INC0010002": ["INC0010008", "INC0010015"],
  "INC0010003": ["INC0010006", "INC0010009", "INC0010017", "INC0010024"]
}
```

**Labeling Process:**
1. Export 50 tickets: `SELECT incident_number, short_description, description FROM servicenow_incidents LIMIT 50`
2. For each ticket, read description and find 3-5 similar tickets from the dataset
3. Record in JSON format
4. Run evaluation script

**Success Criteria:**
- ✅ Precision@5 >0.60 (60% of top 5 are relevant)
- ✅ Precision@10 >0.40
- ✅ MRR >0.70 (first relevant in top 3 on average)

---

### 1.3 Cluster Quality Metrics

**Goal:** Measure how well embeddings cluster similar tickets together.

**Metrics:**
- **Silhouette Score:** How well-separated are clusters? (range: -1 to 1, higher is better)
- **Davies-Bouldin Index:** Lower is better (tight, well-separated clusters)
- **Calinski-Harabasz Score:** Higher is better (dense, well-separated clusters)

**Implementation Difficulty:** ⭐⭐ **Easy-Medium**  
**Time Estimate:** 3-5 hours

**Implementation:**

```python
# backend-python/scripts/evaluate_clustering.py

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from app.core.database import get_db_connection
from pgvector.psycopg2 import register_vector

def evaluate_clustering():
    """
    Evaluate embedding quality using clustering metrics.
    """
    with get_db_connection() as conn:
        register_vector(conn)
        cursor = conn.cursor()
        
        # Fetch embeddings and categories
        cursor.execute("""
            SELECT embedding, category, priority
            FROM servicenow_incidents
            WHERE embedding IS NOT NULL
            LIMIT 1000
        """)
        
        data = cursor.fetchall()
        embeddings = np.array([row[0] for row in data])
        categories = [row[1] for row in data]
        priorities = [row[2] for row in data]
        
        # Determine number of clusters (unique categories)
        unique_categories = len(set(categories))
        n_clusters = max(5, unique_categories)
        
        # Perform KMeans clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        cluster_labels = kmeans.fit_predict(embeddings)
        
        # Calculate metrics
        silhouette = silhouette_score(embeddings, cluster_labels)
        davies_bouldin = davies_bouldin_score(embeddings, cluster_labels)
        calinski_harabasz = calinski_harabasz_score(embeddings, cluster_labels)
        
        print("=== Clustering Quality Metrics ===")
        print(f"Number of Clusters: {n_clusters}")
        print(f"Number of Samples:  {len(embeddings)}")
        print(f"\nSilhouette Score:        {silhouette:.4f}  (higher is better, range: -1 to 1)")
        print(f"Davies-Bouldin Index:    {davies_bouldin:.4f}  (lower is better)")
        print(f"Calinski-Harabasz Score: {calinski_harabasz:.2f}  (higher is better)")
        
        # Category purity per cluster
        print("\n=== Cluster Purity by Category ===")
        for i in range(n_clusters):
            cluster_categories = [categories[j] for j in range(len(cluster_labels)) if cluster_labels[j] == i]
            if cluster_categories:
                most_common = max(set(cluster_categories), key=cluster_categories.count)
                purity = cluster_categories.count(most_common) / len(cluster_categories)
                print(f"Cluster {i}: {len(cluster_categories)} tickets, purity={purity:.2f} ({most_common})")

if __name__ == "__main__":
    evaluate_clustering()
```

**Success Criteria:**
- ✅ Silhouette Score >0.30 (acceptable clustering)
- ✅ Cluster purity >0.60 (most tickets in cluster share same category)

---

## 2. Computational Performance Metrics

### 2.1 Embedding Generation Speed

**Goal:** Measure how fast embeddings are generated.

**Metrics:**
- **Tokens per second:** Throughput of LM Studio
- **Latency per ticket:** Time to embed one ticket description
- **Batch throughput:** Tickets embedded per minute
- **Memory usage:** RAM consumed during embedding

**Implementation Difficulty:** ⭐ **Very Easy**  
**Time Estimate:** 1-2 hours

**Implementation:**

```python
# backend-python/scripts/benchmark_embedding_speed.py

import time
import psutil
import numpy as np
from app.services.embedding import generate_embedding, generate_embeddings_batch
from app.core.database import get_db_connection

def benchmark_embedding_speed():
    """
    Benchmark embedding generation performance.
    """
    # Sample texts of varying lengths
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT short_description || ' ' || COALESCE(description, '')
            FROM servicenow_incidents
            LIMIT 100
        """)
        texts = [row[0] for row in cursor.fetchall()]
    
    print("=== Embedding Generation Benchmark ===")
    
    # Single embedding latency
    single_latencies = []
    for text in texts[:10]:
        start = time.time()
        _ = generate_embedding(text)
        latency = time.time() - start
        single_latencies.append(latency)
        token_count = len(text.split())
        print(f"Tokens: {token_count:4d} | Latency: {latency*1000:.1f}ms | Tokens/sec: {token_count/latency:.1f}")
    
    print(f"\nMean Latency: {np.mean(single_latencies)*1000:.1f}ms ± {np.std(single_latencies)*1000:.1f}ms")
    
    # Batch throughput
    print("\n=== Batch Throughput ===")
    batch_sizes = [1, 4, 8, 16, 32]
    for batch_size in batch_sizes:
        batch = texts[:batch_size]
        start = time.time()
        _ = generate_embeddings_batch(batch)
        elapsed = time.time() - start
        throughput = batch_size / elapsed
        print(f"Batch Size: {batch_size:2d} | Time: {elapsed:.2f}s | Throughput: {throughput:.1f} tickets/sec")
    
    # Memory usage
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024
    print(f"\nMemory Usage: {memory_mb:.1f} MB")

if __name__ == "__main__":
    benchmark_embedding_speed()
```

**Usage:**
```bash
docker exec itsm-python-backend python scripts/benchmark_embedding_speed.py
```

**Expected Baseline (LM Studio on M1 Mac):**
- Latency: 150-300ms per ticket
- Throughput: 3-6 tickets/second (single thread)
- Memory: ~500MB for model

**Success Criteria:**
- ✅ Mean latency <500ms per ticket
- ✅ Batch throughput >5 tickets/second
- ✅ Memory usage <2GB

---

### 2.2 Similarity Search Speed

**Goal:** Measure how fast pgvector can search for similar tickets.

**Metrics:**
- **Query latency:** Time to find top-10 similar tickets
- **Index efficiency:** HNSW vs sequential scan performance
- **Scalability:** Performance with 1K, 10K, 100K tickets

**Implementation Difficulty:** ⭐ **Very Easy**  
**Time Estimate:** 2-3 hours

**Implementation:**

```python
# backend-python/scripts/benchmark_similarity_search.py

import time
import numpy as np
from app.core.database import get_db_connection
from pgvector.psycopg2 import register_vector

def benchmark_similarity_search():
    """
    Benchmark pgvector similarity search performance.
    """
    with get_db_connection() as conn:
        register_vector(conn)
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM servicenow_incidents WHERE embedding IS NOT NULL")
        total_count = cursor.fetchone()[0]
        
        # Get sample embeddings
        cursor.execute("""
            SELECT embedding FROM servicenow_incidents
            WHERE embedding IS NOT NULL
            LIMIT 20
        """)
        sample_embeddings = [row[0] for row in cursor.fetchall()]
        
        print("=== Similarity Search Benchmark ===")
        print(f"Total Tickets with Embeddings: {total_count}")
        
        # Test different K values
        k_values = [5, 10, 20, 50]
        for k in k_values:
            latencies = []
            for embedding in sample_embeddings[:10]:
                start = time.time()
                cursor.execute("""
                    SELECT incident_number, (1 - (embedding <=> %s::vector)) AS similarity
                    FROM servicenow_incidents
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """, (embedding, embedding, k))
                cursor.fetchall()
                latency = time.time() - start
                latencies.append(latency)
            
            print(f"Top-{k:2d}: {np.mean(latencies)*1000:.1f}ms ± {np.std(latencies)*1000:.1f}ms")
        
        # Check if HNSW index is being used
        cursor.execute("""
            EXPLAIN (FORMAT JSON) 
            SELECT incident_number, (1 - (embedding <=> %s::vector)) AS similarity
            FROM servicenow_incidents
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT 10
        """, (sample_embeddings[0], sample_embeddings[0]))
        
        explain_result = cursor.fetchone()[0]
        print("\n=== Query Plan ===")
        print(explain_result)
        
        # Check if index scan is used
        if "Index Scan" in str(explain_result):
            print("\n✅ HNSW index is being used (fast)")
        else:
            print("\n⚠️  Sequential scan detected (slow, create index)")

if __name__ == "__main__":
    benchmark_similarity_search()
```

**Success Criteria:**
- ✅ Top-10 search <50ms (with HNSW index)
- ✅ HNSW index is active
- ✅ Performance scales sub-linearly with dataset size

---

### 2.3 End-to-End Pipeline Performance

**Goal:** Measure total time from ticket creation to similarity results.

**Metrics:**
- **Time to embed:** New ticket → embedding stored
- **Time to link:** Embedding → parent assigned
- **Time to query:** User requests similar tickets → results displayed
- **Queue backlog:** Tickets waiting for embedding

**Implementation Difficulty:** ⭐⭐ **Easy-Medium**  
**Time Estimate:** 3-4 hours

**Implementation:**

```python
# backend-python/scripts/benchmark_e2e_pipeline.py

import time
from datetime import datetime
from app.core.database import get_db_connection
from app.services.embedding import generate_embedding
from app.services.similarity import find_similar_tickets
from pgvector.psycopg2 import register_vector

async def benchmark_e2e_pipeline():
    """
    Benchmark end-to-end pipeline performance.
    """
    test_ticket = {
        'incident_number': 'TEST_E2E_001',
        'short_description': 'Network connectivity issue',
        'description': 'Users unable to access internal servers. Intermittent connection drops observed.'
    }
    
    print("=== End-to-End Pipeline Benchmark ===")
    
    # Step 1: Embed
    start_embed = time.time()
    text = f"{test_ticket['short_description']} {test_ticket['description']}"
    embedding = generate_embedding(text)
    embed_time = time.time() - start_embed
    print(f"1. Embedding Generation: {embed_time*1000:.1f}ms")
    
    # Step 2: Store
    with get_db_connection() as conn:
        register_vector(conn)
        cursor = conn.cursor()
        
        start_store = time.time()
        cursor.execute("""
            INSERT INTO servicenow_incidents 
            (incident_number, short_description, description, embedding, embedding_model, embedded_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (incident_number) DO UPDATE
            SET embedding = EXCLUDED.embedding
        """, (
            test_ticket['incident_number'],
            test_ticket['short_description'],
            test_ticket['description'],
            embedding,
            'test-model',
            datetime.now()
        ))
        conn.commit()
        store_time = time.time() - start_store
        print(f"2. Database Storage:     {store_time*1000:.1f}ms")
        
        # Step 3: Find Similar
        start_search = time.time()
        similar = await find_similar_tickets(conn, embedding, top_k=10)
        search_time = time.time() - start_search
        print(f"3. Similarity Search:    {search_time*1000:.1f}ms")
        
        # Cleanup
        cursor.execute("DELETE FROM servicenow_incidents WHERE incident_number = %s", (test_ticket['incident_number'],))
        conn.commit()
    
    total_time = embed_time + store_time + search_time
    print(f"\nTotal E2E Time: {total_time*1000:.1f}ms")
    print(f"Target SLA: <2000ms")
    
    if total_time < 2.0:
        print("✅ PASS - Within SLA")
    else:
        print("❌ FAIL - Exceeds SLA")

if __name__ == "__main__":
    import asyncio
    asyncio.run(benchmark_e2e_pipeline())
```

**Success Criteria:**
- ✅ Total E2E <2 seconds
- ✅ Embedding <500ms
- ✅ Search <100ms

---

## 3. Business Impact Metrics

### 3.1 Duplicate Detection Accuracy

**Goal:** Measure how well the model identifies actual duplicate tickets.

**Metrics:**
- **True Positive Rate (TPR):** Of actual duplicates, how many were caught?
- **False Positive Rate (FPR):** How many non-duplicates were flagged?
- **Optimal threshold:** What similarity score balances precision/recall?

**Implementation Difficulty:** ⭐⭐⭐ **Medium** (requires labeled duplicates)  
**Time Estimate:** 6-8 hours

**Process:**
1. Export known duplicate tickets (if available from ServiceNow)
2. Calculate similarity scores for known duplicates
3. Calculate similarity scores for random non-duplicate pairs
4. Plot ROC curve to find optimal threshold

**Implementation:**

```python
# backend-python/scripts/evaluate_duplicate_detection.py

import numpy as np
from sklearn.metrics import roc_curve, auc
import matplotlib.pyplot as plt
from app.core.database import get_db_connection
from pgvector.psycopg2 import register_vector

def evaluate_duplicate_detection(labeled_duplicates_file: str):
    """
    Evaluate duplicate detection performance using labeled data.
    
    Format of labeled_duplicates_file (JSON):
    {
        "duplicates": [
            ["INC0010001", "INC0010005"],
            ["INC0010002", "INC0010008"]
        ],
        "non_duplicates": [
            ["INC0010001", "INC0010003"],
            ["INC0010002", "INC0010004"]
        ]
    }
    """
    import json
    with open(labeled_duplicates_file, 'r') as f:
        data = json.load(f)
    
    with get_db_connection() as conn:
        register_vector(conn)
        cursor = conn.cursor()
        
        # Calculate similarity scores
        y_true = []
        y_scores = []
        
        # Positive examples (duplicates)
        for pair in data['duplicates']:
            cursor.execute("""
                SELECT 
                    a.embedding,
                    b.embedding,
                    1 - (a.embedding <=> b.embedding) AS similarity
                FROM servicenow_incidents a, servicenow_incidents b
                WHERE a.incident_number = %s AND b.incident_number = %s
            """, (pair[0], pair[1]))
            
            result = cursor.fetchone()
            if result:
                y_true.append(1)
                y_scores.append(result[2])
        
        # Negative examples (non-duplicates)
        for pair in data['non_duplicates']:
            cursor.execute("""
                SELECT 1 - (a.embedding <=> b.embedding) AS similarity
                FROM servicenow_incidents a, servicenow_incidents b
                WHERE a.incident_number = %s AND b.incident_number = %s
            """, (pair[0], pair[1]))
            
            result = cursor.fetchone()
            if result:
                y_true.append(0)
                y_scores.append(result[0])
        
        # Calculate ROC curve
        fpr, tpr, thresholds = roc_curve(y_true, y_scores)
        roc_auc = auc(fpr, tpr)
        
        print("=== Duplicate Detection Evaluation ===")
        print(f"Positive Examples: {sum(y_true)}")
        print(f"Negative Examples: {len(y_true) - sum(y_true)}")
        print(f"ROC AUC: {roc_auc:.4f}")
        
        # Find optimal threshold (Youden's J statistic)
        j_scores = tpr - fpr
        optimal_idx = np.argmax(j_scores)
        optimal_threshold = thresholds[optimal_idx]
        
        print(f"\nOptimal Threshold: {optimal_threshold:.4f}")
        print(f"  TPR at threshold: {tpr[optimal_idx]:.4f}")
        print(f"  FPR at threshold: {fpr[optimal_idx]:.4f}")
        
        # Test common thresholds
        for threshold in [0.75, 0.80, 0.85, 0.90]:
            idx = np.argmin(np.abs(thresholds - threshold))
            print(f"\nAt threshold {threshold:.2f}:")
            print(f"  TPR (Recall): {tpr[idx]:.4f}")
            print(f"  FPR: {fpr[idx]:.4f}")
        
        # Plot ROC curve
        plt.figure(figsize=(8, 6))
        plt.plot(fpr, tpr, label=f'ROC curve (AUC = {roc_auc:.2f})')
        plt.plot([0, 1], [0, 1], 'k--', label='Random')
        plt.scatter([fpr[optimal_idx]], [tpr[optimal_idx]], c='red', s=100, 
                   label=f'Optimal ({optimal_threshold:.2f})')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('Duplicate Detection ROC Curve')
        plt.legend()
        plt.savefig('duplicate_detection_roc.png')
        print("\nROC curve saved to: duplicate_detection_roc.png")

if __name__ == "__main__":
    evaluate_duplicate_detection("data/labeled_duplicates.json")
```

**Success Criteria:**
- ✅ ROC AUC >0.85
- ✅ TPR >0.80 at threshold 0.80
- ✅ FPR <0.10 at optimal threshold

---

### 3.2 Parent-Child Link Quality

**Goal:** Measure accuracy of automatic parent-child assignments.

**Metrics:**
- **Link acceptance rate:** How many auto-links are kept by users?
- **Average similarity of linked tickets:** Are we linking very similar tickets?
- **Category/priority agreement:** Do linked tickets share same attributes?

**Implementation Difficulty:** ⭐⭐ **Easy-Medium**  
**Time Estimate:** 3-4 hours

**Implementation:**

```python
# backend-python/scripts/evaluate_parent_child_links.py

from app.core.database import get_db_connection

def evaluate_parent_child_links():
    """
    Evaluate quality of established parent-child relationships.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get all parent-child pairs
        cursor.execute("""
            SELECT 
                child.incident_number AS child_id,
                child.category AS child_category,
                child.priority AS child_priority,
                parent.incident_number AS parent_id,
                parent.category AS parent_category,
                parent.priority AS parent_priority,
                child.similarity_score
            FROM servicenow_incidents child
            JOIN servicenow_incidents parent ON child.parent_incident = parent.incident_number
            WHERE child.parent_incident IS NOT NULL
        """)
        
        links = cursor.fetchall()
        
        print("=== Parent-Child Link Quality ===")
        print(f"Total Links: {len(links)}")
        
        # Similarity score distribution
        similarity_scores = [link[6] for link in links if link[6]]
        if similarity_scores:
            import numpy as np
            print(f"\nSimilarity Score Statistics:")
            print(f"  Mean: {np.mean(similarity_scores):.4f}")
            print(f"  Std:  {np.std(similarity_scores):.4f}")
            print(f"  Min:  {np.min(similarity_scores):.4f}")
            print(f"  Max:  {np.max(similarity_scores):.4f}")
        
        # Category agreement
        same_category = sum(1 for link in links if link[1] == link[4])
        category_agreement = same_category / len(links) if links else 0
        print(f"\nCategory Agreement: {category_agreement:.2%} ({same_category}/{len(links)})")
        
        # Priority agreement
        same_priority = sum(1 for link in links if link[2] == link[5])
        priority_agreement = same_priority / len(links) if links else 0
        print(f"Priority Agreement: {priority_agreement:.2%} ({same_priority}/{len(links)})")
        
        # Distribution by similarity buckets
        buckets = {
            '0.95-1.00': 0,
            '0.90-0.95': 0,
            '0.85-0.90': 0,
            '0.80-0.85': 0,
            '0.75-0.80': 0,
            '<0.75': 0
        }
        
        for score in similarity_scores:
            if score >= 0.95:
                buckets['0.95-1.00'] += 1
            elif score >= 0.90:
                buckets['0.90-0.95'] += 1
            elif score >= 0.85:
                buckets['0.85-0.90'] += 1
            elif score >= 0.80:
                buckets['0.80-0.85'] += 1
            elif score >= 0.75:
                buckets['0.75-0.80'] += 1
            else:
                buckets['<0.75'] += 1
        
        print("\nSimilarity Distribution:")
        for bucket, count in buckets.items():
            percentage = (count / len(similarity_scores) * 100) if similarity_scores else 0
            print(f"  {bucket}: {count:4d} ({percentage:5.1f}%)")

if __name__ == "__main__":
    evaluate_parent_child_links()
```

**Success Criteria:**
- ✅ Mean similarity >0.80 for linked tickets
- ✅ Category agreement >70%
- ✅ Most links in 0.80-0.95 range (not too strict, not too loose)

---

## 4. Production Monitoring Dashboard

### 4.1 Real-Time Metrics Dashboard

**Goal:** Continuous monitoring of model performance in production.

**Metrics to Track:**
- Embedding generation rate (tickets/hour)
- Average similarity score of similar ticket queries
- Queue backlog size
- API response times (p50, p95, p99)
- Error rates

**Implementation Difficulty:** ⭐⭐⭐⭐ **Hard**  
**Time Estimate:** 12-16 hours

**Tools:**
- Prometheus for metrics collection
- Grafana for visualization
- Custom Python exporters

**Dashboard Panels:**
1. **Embedding Pipeline Health**
   - Tickets embedded per hour
   - Queue size over time
   - Worker uptime

2. **Query Performance**
   - Similarity search latency (p95, p99)
   - Requests per minute
   - Cache hit rate

3. **Model Quality**
   - Daily mean similarity scores
   - Distribution shifts
   - Threshold alerts

**Implementation:** (High-level, detailed implementation in separate DevOps epic)

```python
# backend-python/app/monitoring/metrics.py

from prometheus_client import Counter, Histogram, Gauge

# Counters
embeddings_generated = Counter('embeddings_generated_total', 'Total embeddings generated')
similarity_searches = Counter('similarity_searches_total', 'Total similarity searches')

# Histograms
embedding_latency = Histogram('embedding_latency_seconds', 'Embedding generation latency')
search_latency = Histogram('similarity_search_latency_seconds', 'Similarity search latency')
similarity_score_dist = Histogram('similarity_score_distribution', 'Distribution of similarity scores')

# Gauges
queue_size = Gauge('embedding_queue_size', 'Current embedding queue size')
model_memory_mb = Gauge('model_memory_mb', 'Model memory usage in MB')
```

---

## 5. A/B Testing & Model Comparison

### 5.1 Compare Different Models

**Goal:** Evaluate alternative embedding models against current baseline.

**Primary Comparison:**
- **Model A (Baseline):** `text-embedding-embeddinggemma-300m-qat` (768-dim, 300M parameters, quantized)
  - Smaller, faster, lower resource requirements
  - Current production model
- **Model B (Challenger):** `text-embedding-qwen3-embedding-8b` (dimensions TBD, 8B parameters)
  - Larger, potentially more accurate
  - Higher computational cost

**Additional Candidates for Future Testing:**
- `all-MiniLM-L6-v2` (384-dim, smaller/faster)
- `text-embedding-ada-002` (OpenAI, 1536-dim, cloud API)
- `bge-large-en-v1.5` (1024-dim, SOTA)

**Implementation Difficulty:** ⭐⭐⭐⭐ **Hard**  
**Time Estimate:** 16-24 hours (per model comparison)

**Comparison Methodology:**

1. **Parallel Embedding Generation**
   - Generate embeddings for same dataset with both models
   - Store in separate columns: `embedding` (Gemma) vs `embedding_qwen` (Qwen3)
   
2. **Side-by-Side Metrics**
   - Run all Phase 1 & 2 metrics for both models
   - Compare on identical test sets
   - Create comparison tables

3. **Key Comparison Dimensions**
   - **Quality:** Precision@K, MRR, clustering metrics, duplicate detection ROC AUC
   - **Speed:** Embedding latency, tokens/sec, memory usage
   - **Size:** Model disk size, RAM requirements
   - **Cost:** Compute time per 1000 tickets

**Process:**
1. Generate embeddings with alternative model
2. Store in separate column (`embedding_model_b`)
3. Run all quality metrics for both models
4. Compare head-to-head on same test set
5. Measure computational cost difference

**Expected Trade-offs:**
- **Qwen3-8B:** Higher accuracy, slower inference, more memory (~16GB)
- **EmbeddingGemma-300m:** Faster inference, lower memory (~2GB), potentially lower accuracy

**Decision Criteria:**
- If Qwen3 improves Precision@5 by >10% and latency <1s per ticket → **Switch to Qwen3**
- If Qwen3 improves Precision@5 by <5% or latency >2s per ticket → **Keep Gemma**
- If mixed results → **Hybrid approach** (Gemma for real-time, Qwen3 for batch jobs)

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2)
**Difficulty:** ⭐ Easy | **Time:** 8-12 hours

Priority tasks that give immediate insights:
1. ✅ Similarity distribution analysis (1.1)
2. ✅ Embedding speed benchmark (2.1)
3. ✅ Similarity search benchmark (2.2)
4. ✅ E2E pipeline benchmark (2.3)
5. ✅ Parent-child link quality (3.2)

**Deliverables:**
- Baseline performance numbers documented
- Bottlenecks identified
- Optimization opportunities clear

---

### Phase 2: Quality Validation (Week 3-4)
**Difficulty:** ⭐⭐⭐ Medium | **Time:** 12-16 hours

Deeper evaluation requiring manual work:
1. ✅ Create ground truth dataset (50-100 tickets)
2. ✅ Precision@K evaluation (1.2)
3. ✅ Clustering metrics (1.3)
4. ✅ Duplicate detection evaluation (3.1)

**Deliverables:**
- Confidence in model accuracy
- Optimal similarity thresholds
- Known failure modes documented

---

### Phase 3: Production Readiness (Week 5-8)
**Difficulty:** ⭐⭐⭐⭐ Hard | **Time:** 20-30 hours

Long-term monitoring and optimization:
1. ✅ Prometheus metrics integration (4.1)
2. ✅ Grafana dashboard (4.1)
3. ✅ Alerting rules (4.1)
4. ⏳ A/B test framework (5.1)

**Deliverables:**
- Production monitoring dashboard
- Automated performance alerts
- Model comparison framework ready

---

## Success Criteria Summary

### Minimum Viable Performance (MVP)
- ✅ Similarity search <100ms (p95)
- ✅ Embedding generation <500ms per ticket
- ✅ Precision@5 >0.50
- ✅ Parent-child links have >0.75 mean similarity
- ✅ Category agreement >60%

### Production-Ready Performance
- ✅ Similarity search <50ms (p95)
- ✅ Embedding generation <300ms per ticket
- ✅ Precision@5 >0.60, Precision@10 >0.40
- ✅ Parent-child links have >0.80 mean similarity
- ✅ Category agreement >70%
- ✅ ROC AUC >0.85 for duplicate detection

### Exceptional Performance
- ✅ Similarity search <30ms (p95)
- ✅ Embedding generation <200ms per ticket
- ✅ Precision@5 >0.70, Precision@10 >0.50
- ✅ MRR >0.80
- ✅ Parent-child links have >0.85 mean similarity
- ✅ Category agreement >80%
- ✅ ROC AUC >0.90

---

## Appendix: Quick Start Commands

```bash
# Phase 1: Computational Benchmarks (run these first)
docker exec itsm-python-backend python scripts/benchmark_embedding_speed.py
docker exec itsm-python-backend python scripts/benchmark_similarity_search.py
docker exec itsm-python-backend python scripts/benchmark_e2e_pipeline.py

# Phase 1: Quality Analysis
docker exec itsm-python-backend python scripts/analyze_similarity_distribution.py
docker exec itsm-python-backend python scripts/evaluate_parent_child_links.py

# Phase 2: Advanced Evaluation (requires manual labeling first)
docker exec itsm-python-backend python scripts/evaluate_precision_at_k.py
docker exec itsm-python-backend python scripts/evaluate_clustering.py
docker exec itsm-python-backend python scripts/evaluate_duplicate_detection.py
```

---

## Next Steps

1. **Immediate:** Run Phase 1 benchmarks to establish baseline
2. **This Week:** Label 50 tickets for ground truth (2-3 hours manual work)
3. **Next Week:** Run Phase 2 quality metrics
4. **This Month:** Set up Prometheus/Grafana monitoring

**Estimated Total Effort:**
- Phase 1: 8-12 hours
- Phase 2: 12-16 hours
- Phase 3: 20-30 hours
- **Total: 40-58 hours (~1-1.5 months part-time)**

---

**Document Owner:** AI/ML Team  
**Last Updated:** 10 November 2025  
**Next Review:** After Phase 1 completion
