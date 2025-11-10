# ITSM AI Backend

Python FastAPI backend service providing AI-powered features for the ITSM Insight Nexus application.

## Features

### ✅ Implemented (Production)

- **JWT Authentication** - Validates tokens from Node.js auth backend
- **Semantic Embeddings** - 768-dimensional vectors via LM Studio (EmbeddingGemma-300m-qat)
- **Similarity Search** - pgvector-powered ticket matching with cosine distance
- **Parent-Child Linking** - Automatic duplicate detection (similarity threshold: 0.75-0.85)
- **Automatic Embeddings** - Background worker with PostgreSQL queue system
- **Batch Processing** - Efficient bulk embedding generation
- **Health Checks** - Monitoring endpoints for service status
- **CORS Enabled** - Works with Vite dev server and production builds

### 🔄 Planned Features

- **Ticket Classification** - Auto-categorize incidents by type
- **Sentiment Analysis** - Understand caller tone from descriptions
- **RAG Knowledge Base** - Q&A with citations from historical tickets
- **Priority Prediction** - ML model to suggest priority levels
- **SLA Prediction** - Forecast resolution times

## System Architecture

```text
Frontend (port 8080)
        ↓
   [JWT Token]
        ↓
AI Backend (port 8000) ←→ LM Studio (port 1234)
        ↓                      ↓
    PostgreSQL 15         Embeddings API
    + pgvector
        ↑
        ↓
Embedding Worker (background)
```

**Key Components:**

- **FastAPI Application** (`app/main.py`) - REST API with JWT middleware
- **Similarity Service** (`app/services/similarity.py`) - pgvector queries
- **Embedding Service** (`app/services/embedding.py`) - LM Studio integration
- **Database Pool** (`app/core/database.py`) - Shared psycopg2 connection pool
- **Queue Worker** (`scripts/embedding_worker.py`) - Background processing
- **Batch Scripts** (`scripts/populate_embeddings.py`, `scripts/establish_ticket_relationships.py`)

## Quick Start

### Prerequisites

- Docker Desktop running
- Node.js auth backend running (port 3001)
- PostgreSQL with pgvector running (via docker-compose)
- **LM Studio** running on host with embedding model loaded

### Running with Docker (Recommended)

```bash
# From project root
docker compose up -d python-backend embedding-worker

# Or start all services
docker compose up -d

# Verify services
docker ps
docker logs itsm-python-backend
docker logs itsm-embedding-worker
```

The AI backend will be available at <http://localhost:8000>

### Running Locally (Development)

```bash
# Install dependencies
cd backend-python
pip install -r requirements.txt

# Configure environment (see Configuration section)
cp .env.example .env
# Edit .env with correct values

# Run the server
uvicorn app.main:app --reload --port 8000

# In separate terminal, run worker
python scripts/embedding_worker.py --interval 10 --batch-size 16
```

## API Endpoints

### Health Check

**GET** `/api/ai/health`

No authentication required. Returns service status.

```bash
curl http://localhost:8000/api/ai/health
```

Response:

```json
{
  "status": "ok",
  "service": "itsm-ai-backend",
  "version": "1.0.0",
  "authenticated": false
}
```

**With Authentication:**

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/ai/health
```

Response:

```json
{
  "status": "ok",
  "service": "itsm-ai-backend",
  "version": "1.0.0",
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "admin@itsm.local",
    "role": "admin"
  }
}
```

### Similarity Search

**POST** `/api/ai/similarity/search`

Find similar tickets using semantic embeddings.

```bash
curl -X POST http://localhost:8000/api/ai/similarity/search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_number": "INC0010048",
    "top_k": 5,
    "min_similarity": 0.7
  }'
```

Response:

```json
{
  "model_name": "text-embedding-embeddinggemma-300m-qat",
  "embedding_dimension": 768,
  "query_incident": "INC0010048",
  "generated_embedding": true,
  "results": [
    {
      "incident_number": "INC0010050",
      "short_description": "Similar issue...",
      "similarity_score": 0.92,
      "already_has_parent": false
    }
  ]
}
```

### Ticket Family (Parent-Child)

**GET** `/api/ai/similarity/tickets/{incident_number}/family`

Get parent ticket and all related children.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/ai/similarity/tickets/INC0010048/family
```

### Generate Embedding

**POST** `/api/ai/similarity/embed`

Generate embedding for custom text.

```bash
curl -X POST http://localhost:8000/api/ai/similarity/embed \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "short_description": "Network connectivity issue",
    "description": "Unable to access internal servers"
  }'
```

### Status (Protected)

**GET** `/api/ai/status`

Requires authentication. Returns detailed service status.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/ai/status
```

### API Documentation

Interactive API documentation available at:

- **Swagger UI**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>

## Configuration

Environment variables are configured in `backend-python/.env`:

```env
# JWT Secret (MUST match backend-auth/.env)
JWT_SECRET=921ded1a3143d5745e14587d2a1877ce52179acda540d13d8d63ceefad62ef4b15049201ade10f636f6e95d85ed813fa8086e89c7c5c71d4d14c218fb14d4fd4

# Database Connection (Docker internal network)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres

# Service Configuration
SERVICE_NAME=itsm-ai-backend
SERVICE_VERSION=1.0.0
LOG_LEVEL=INFO

# Performance Tuning
OMP_NUM_THREADS=2
MKL_NUM_THREADS=2
OPENBLAS_NUM_THREADS=2
```

**Important Notes:**

- **JWT_SECRET** must be identical to `backend-auth/.env` for token validation
- **DB_HOST=postgres** when running in Docker (uses container name)
- **DB_HOST=localhost** and **DB_PORT=15432** when running locally
- LM Studio connection is automatic via `http://host.docker.internal:1234/v1` (configured in code)

**docker-compose.yml automatically passes these variables** to the containers, so you typically don't need to modify `.env` unless changing defaults.

## Embedding System

### Embedding Architecture

The system uses a **queue-based architecture** for automatic embedding generation:

1. **Database Trigger** - New tickets are automatically queued
2. **Background Worker** - Processes queue every 10 seconds
3. **LM Studio Integration** - Generates 768-dim embeddings locally
4. **pgvector Storage** - Stores embeddings for fast similarity search

### Components

#### Embedding Worker

Runs as a separate container (`itsm-embedding-worker`) that:

- Polls `embedding_queue` table every 10 seconds
- Processes up to 16 tickets per batch
- Generates embeddings via LM Studio API
- Updates tickets with embedding vectors
- Marks queue entries as completed

#### Batch Population Script

For bulk processing existing tickets:

```bash
# Populate all tickets without embeddings
docker exec itsm-python-backend python scripts/populate_embeddings.py

# Limit to first 100 tickets
docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100

# Use smaller batch size
docker exec itsm-python-backend python scripts/populate_embeddings.py --batch-size 8

# Dry run (check what would be processed)
docker exec itsm-python-backend python scripts/populate_embeddings.py --dry-run
```

#### Relationship Establishment Script

After embeddings are generated, establish parent-child relationships:

```bash
# Establish relationships for all tickets (similarity >= 0.75)
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py

# Use custom similarity threshold
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --min-similarity 0.80

# Limit to first 100 tickets
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --limit 100

# Dry run (preview what would be done)
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --dry-run
```

**How it works:**

- Finds tickets without parents that have embeddings
- For each ticket, searches for older similar tickets
- Assigns the most similar ticket as parent (if above threshold)
- Database triggers automatically update child_incidents arrays
- Creates parent-child hierarchies for visualization

**Recommended workflow:**

1. Run `populate_embeddings.py` to generate embeddings
2. Run `establish_ticket_relationships.py --dry-run` to preview
3. Run `establish_ticket_relationships.py` to apply relationships
4. View relationships in the Graph page

#### Database Schema

```sql
-- Embedding columns in servicenow_incidents
embedding vector(768)          -- 768-dimensional embedding
embedding_model TEXT            -- Model identifier
embedded_at TIMESTAMP          -- When embedded
parent_incident TEXT           -- Parent ticket reference
child_incidents TEXT[]         -- Array of child ticket IDs
similarity_score NUMERIC(3,2)  -- Similarity to parent (0.00-1.00)

-- Queue table
embedding_queue
  id SERIAL PRIMARY KEY
  incident_number TEXT UNIQUE
  status TEXT                  -- pending, processing, completed, failed
  created_at TIMESTAMP
  retries INT
  last_error TEXT
```

### LM Studio Setup

The backend connects to a local LM Studio instance running the **EmbeddingGemma-300m-qat** model:

1. Install [LM Studio](https://lmstudio.ai)
2. Download embedding model: `text-embedding-embeddinggemma-300m-qat`
3. Start local server (default: `http://127.0.0.1:1234`)
4. Model is accessed via OpenAI-compatible API

**Benefits:**

- ✅ No external API costs
- ✅ No data leaves your machine
- ✅ Fast inference (~200ms per ticket)
- ✅ 768-dimensional embeddings
- ✅ Better quality than traditional similarity methods

## Testing

### Test Health Endpoint

```bash
# Unauthenticated
curl http://localhost:8000/api/ai/health

# With authentication (after logging in to frontend)
# 1. Login to http://localhost:8080
# 2. Get token from browser localStorage: auth-token
# 3. Use in curl:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/ai/health
```

### Test from Frontend

1. Login to the application
2. Open browser console
3. Run:

```javascript
const token = localStorage.getItem('auth-token');
fetch('http://localhost:8000/api/ai/health', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```

## Project Structure

### Backend Structure

```text
backend-python/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── core/
│   │   ├── auth.py          # JWT validation
│   │   ├── config.py        # Settings management
│   │   └── database.py      # PostgreSQL connection pool
│   ├── api/
│   │   └── similarity.py    # Similarity search endpoints
│   └── services/
│       ├── embedding.py     # LM Studio integration
│       └── similarity.py    # pgvector queries
├── scripts/
│   ├── populate_embeddings.py   # Batch embedding script
│   └── embedding_worker.py      # Background queue worker
├── .env                     # Environment variables
├── Dockerfile
├── requirements.txt
└── README.md
```

## Integration with Frontend

The frontend settings page includes AI backend configuration:

```typescript
// Settings stored in localStorage "itsm-settings"
{
  "apiBaseUrl": "http://localhost:3000",  // PostgREST
  "aiBackendUrl": "http://localhost:8000", // AI Backend
  "aiEnabled": true
}
```

## Troubleshooting

### Port 8000 already in use

```bash
# Find process using port 8000
lsof -i :8000

# Kill it or use different port in docker-compose.yml
```

### JWT validation fails

- Ensure `JWT_SECRET` in `backend-python/.env` matches `backend-auth/.env`
- Check token hasn't expired (login again)
- Verify token is included in Authorization header: `Bearer <token>`

### CORS errors

- Verify frontend URL is in CORS allowed origins (app/main.py)
- Check browser console for specific CORS error
- Ensure credentials: true in both frontend and backend CORS config

### Container won't start

```bash
# Check logs
docker logs itsm-python-backend

# Rebuild
docker compose build python-backend
docker compose up python-backend
```

## Development

### Adding New Endpoints

```python
# app/main.py or app/api/routes.py
@app.post("/api/ai/classify")
async def classify_ticket(
    text: str,
    user: Dict = Depends(get_current_user)
):
    # Implementation here
    return {"category": "Network", "confidence": 0.95}
```

### Running Tests

```bash
# Install test dependencies
pip install pytest httpx

# Run tests (when implemented)
pytest
```

## Next Steps (Phase 3)

1. **Frontend Integration** - Add similarity search UI
2. **Parent-Child Suggestions** - Show duplicate warnings on ticket creation
3. **Ticket Classification** - Auto-categorize based on embeddings
4. **Sentiment Analysis** - Understand caller urgency/tone
5. **RAG Knowledge Base** - Searchable solution database

## Support

For issues or questions:

- Check logs: `docker logs itsm-python-backend`
- Review API docs: <http://localhost:8000/docs>
- See main project README
- Check embedding worker: `docker logs itsm-embedding-worker`
