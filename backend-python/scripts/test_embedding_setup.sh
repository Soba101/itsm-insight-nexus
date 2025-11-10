#!/bin/bash
# Test script for the new embedding model configuration

set -e

echo "🔍 ITSM Embedding Model Test Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check LM Studio
echo "📋 Step 1: Checking LM Studio availability..."
if curl -s http://localhost:1234/v1/models > /dev/null 2>&1; then
    echo -e "${GREEN}✅ LM Studio is running${NC}"
    MODEL_INFO=$(curl -s http://localhost:1234/v1/models | python3 -m json.tool 2>/dev/null)
    echo "Available models:"
    echo "$MODEL_INFO"
else
    echo -e "${RED}❌ LM Studio is not running${NC}"
    echo ""
    echo -e "${YELLOW}Please start LM Studio:${NC}"
    echo "1. Open LM Studio application"
    echo "2. Load the model: text-embedding-qwen3-embedding-8b"
    echo "3. Start the local server on port 1234"
    echo "4. Run this script again"
    exit 1
fi

echo ""

# Step 2: Check Python backend
echo "📋 Step 2: Checking Python backend status..."
if docker ps | grep -q itsm-python-backend; then
    echo -e "${GREEN}✅ Python backend is running${NC}"
else
    echo -e "${RED}❌ Python backend is not running${NC}"
    echo "Starting Python backend..."
    docker compose up -d python-backend
    echo "Waiting for backend to start..."
    sleep 5
fi

echo ""

# Step 3: Test embedding generation
echo "📋 Step 3: Testing embedding generation..."
docker exec itsm-python-backend python -c "
from app.services.embedding import get_model_info, generate_embedding
import json

# Test 1: Get model info
print('=== Model Configuration ===')
info = get_model_info()
print(json.dumps(info, indent=2))

# Test 2: Generate a test embedding
print('\n=== Test Embedding Generation ===')
text = 'Server is down and users cannot access the application'
try:
    embedding = generate_embedding(text)
    print(f'Text: {text}')
    print(f'Embedding dimension: {len(embedding)}')
    print(f'First 5 values: {embedding[:5]}')
    print('\n✅ Embedding generation successful!')
except Exception as e:
    print(f'\n❌ Failed: {e}')
    exit(1)
" && echo -e "\n${GREEN}✅ All tests passed!${NC}" || echo -e "\n${RED}❌ Tests failed${NC}"

echo ""

# Step 4: Test batch embedding
echo "📋 Step 4: Testing batch embedding..."
docker exec itsm-python-backend python -c "
from app.services.embedding import generate_embeddings_batch
import time

texts = [
    'Cannot log into the application',
    'System is running slow',
    'Need password reset',
    'Application error when submitting form'
]

print(f'Testing batch embedding with {len(texts)} texts...')
start = time.time()
try:
    embeddings = generate_embeddings_batch(texts, batch_size=2)
    elapsed = time.time() - start
    print(f'✅ Generated {len(embeddings)} embeddings in {elapsed:.2f}s')
    print(f'Average: {elapsed/len(embeddings):.2f}s per embedding')
except Exception as e:
    print(f'❌ Failed: {e}')
    exit(1)
" && echo -e "${GREEN}✅ Batch embedding test passed!${NC}" || echo -e "${RED}❌ Batch embedding test failed${NC}"

echo ""
echo "=================================="
echo "🎉 All embedding tests completed!"
echo "=================================="
