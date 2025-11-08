# ITSM AI Backend

Python FastAPI backend service providing AI-powered features for the ITSM Insight Nexus application.

## Features (Phase 1 - Complete)

- ✅ **JWT Authentication** - Validates tokens from Node.js backend
- ✅ **Health Check** - `/api/ai/health` endpoint
- ✅ **CORS Enabled** - Works with Vite dev server
- ✅ **Docker Support** - Containerized deployment

## Features (Phase 2 - Complete)

- ✅ **Semantic Embeddings** - 768-dimensional vectors via LM Studio
- ✅ **Similarity Search** - pgvector-powered ticket matching
- ✅ **Parent-Child Linking** - Automatic duplicate detection
- ✅ **Automatic Embeddings** - Background worker with queue system
- ✅ **Batch Processing** - Efficient bulk embedding generation

## Features (Planned)

- 🔄 **Ticket Classification** - Auto-categorize incidents
- 🔄 **Sentiment Analysis** - Understand caller tone
- 🔄 **RAG Knowledge Base** - Q&A with citations

## Quick Start

### Prerequisites

- Docker Desktop running
- Node.js backend running (port 3001)
- Postgres database running (via docker-compose)

### Running with Docker (Recommended)

```bash
# From project root
docker compose up python-backend

# Or start all services
docker compose up
```

The service will be available at http://localhost:8000

### Running Locally (Development)

```bash
# Install dependencies
cd backend-python
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
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

Environment variables are configured in `.env`:

```env
# Example .env for backend-python
JWT_SECRET=<same as backend-auth/.env>
DB_HOST=postgres
DB_PORT=5432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres
SERVICE_VERSION=1.0.0

# LM Studio Configuration
LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
LM_STUDIO_MODEL=text-embedding-embeddinggemma-300m-qat
```

## Embedding System

### Architecture

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

## Architecture

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
