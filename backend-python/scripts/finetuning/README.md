# Fine-tuning all-MiniLM-L6-v2 for ITSM Ticket Similarity

This directory contains scripts for fine-tuning the **all-MiniLM-L6-v2** embedding model using contrastive learning with pseudo-labeled training data from your ITSM tickets.

**Important Note**: LM Studio models (like Gemma) cannot be directly fine-tuned via this approach. Instead, we train a similar-sized model (all-MiniLM-L6-v2) that you can use locally without LM Studio.

## 📋 Overview

Fine-tuning improves the embedding model's ability to identify similar ITSM tickets by training it on your specific ticket data. Since we don't have manually labeled data, we use **weak supervision**:
- **Positive pairs (similar)**: Tickets from the same category
- **Negative pairs (dissimilar)**: Tickets from different categories

## 🚀 Quick Start

### Step 1: Generate Training Pairs

Extract tickets from the database and create training pairs:

```bash
# Inside Docker container
docker exec -it itsm-python-backend python scripts/finetuning/generate_training_pairs.py

# Or if running locally with conda
conda activate itsm
python backend-python/scripts/finetuning/generate_training_pairs.py
```

This creates `data/training_pairs.json` with positive and negative pairs.

### Step 2: Install Dependencies

The fine-tuning requires `sentence-transformers` and `torch`:

```bash
# Add to requirements.txt (already done if you see this)
pip install sentence-transformers torch

# Or in Docker, rebuild the container after adding to requirements.txt
docker-compose build python-backend
```

### Step 3: Fine-tune the Model

Train the model with your ticket pairs:

```bash
# Basic training (3 epochs, default settings)
docker exec -it itsm-python-backend python scripts/finetuning/finetune_all_minilm.py

# Custom training parameters
docker exec -it itsm-python-backend python scripts/finetuning/finetune_all_minilm.py \
  --epochs 5 \
  --batch-size 32 \
  --learning-rate 2e-5
```

**⚠️ Important Notes:**
- Training on CPU is slow (20-60 min). GPU recommended.
- This trains **all-MiniLM-L6-v2** (384-dim embeddings)
- **LM Studio models cannot be directly fine-tuned** via Python
- After training, use the fine-tuned model locally instead of LM Studio

### Step 4: Use the Fine-tuned Model

After training, the model is saved to `scripts/finetuning/models/all-minilm-finetuned/`.

To use it in your application, you have two options:

**Option A: Replace in-app embedding generation**
Update `app/services/embedding_service.py` to load the local fine-tuned model instead of calling LM Studio.

**Option B: Hybrid approach**
Keep LM Studio for Gemma/Qwen models, but use fine-tuned all-MiniLM for comparison or specific use cases.

## 📊 Expected Results

After fine-tuning, you should see:
- **Improved separation gap** between same-category and different-category similarities
- **Higher recall** - more same-category pairs identified as similar
- **Better F1 Score** - balanced precision and recall

Run the evaluation scripts to compare:

```bash
# Before fine-tuning
docker exec itsm-python-backend python scripts/performance_eval/compare_models.py

# After fine-tuning (need to integrate fine-tuned model first)
# Results will show improved metrics
```

## 🔧 Configuration

### Training Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--epochs` | 3 | Number of training epochs |
| `--batch-size` | 16 | Training batch size |
| `--learning-rate` | 2e-5 | Learning rate for optimizer |
| `--output-dir` | `models/all-minilm-finetuned` | Output directory |

### Data Generation

Edit `generate_training_pairs.py` to adjust:
- `max_pairs_per_category`: Limit pairs per category (default: 50)
- Category filtering: Add logic to exclude/include specific categories

## 📁 Output Files

```
scripts/finetuning/
├── data/
│   └── training_pairs.json          # Generated training pairs
├── models/
│   └── all-minilm-finetuned/
│       ├── config.json               # Model configuration
│       ├── pytorch_model.bin         # Fine-tuned weights
│       ├── tokenizer_config.json     # Tokenizer config
│       └── training_metadata.json    # Training run metadata
```

## 🐛 Troubleshooting

### Error: "sentence-transformers not installed"

```bash
# Install in container
docker exec -it itsm-python-backend pip install sentence-transformers torch

# Or add to requirements.txt and rebuild
echo "sentence-transformers==2.2.2" >> backend-python/requirements.txt
echo "torch>=2.0.0" >> backend-python/requirements.txt
docker-compose build python-backend
```

### Error: "No training data found"

Run `generate_training_pairs.py` first to create the training pairs.

### Training is very slow

- **Use GPU**: Training on CPU takes 10-20x longer
- **Reduce batch size**: Use `--batch-size 8` on limited memory
- **Reduce epochs**: Start with `--epochs 1` for testing

### Out of memory

Reduce batch size:
```bash
python scripts/finetuning/finetune_gemma.py --batch-size 8
```

## 📚 Further Improvements

1. **Add priority as a signal**: Weight positive pairs by priority similarity
2. **Use resolution text**: Fine-tune specifically on resolution similarity
3. **Active learning**: Manually label a small set for validation
4. **Multi-task learning**: Train on category prediction + similarity jointly
5. **Hard negative mining**: Use challenging negative examples

## 🔗 References

- [Sentence Transformers Documentation](https://www.sbert.net/)
- [Contrastive Learning Guide](https://www.sbert.net/docs/training/overview.html)
- [Fine-tuning Best Practices](https://www.sbert.net/examples/training/sts/README.html)
