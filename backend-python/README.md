# ITSM AI Backend

Python FastAPI backend service providing AI-powered features for the ITSM Insight Nexus application.

## Features (Phase 1)

- ✅ **JWT Authentication** - Validates tokens from Node.js backend
- ✅ **Health Check** - `/api/ai/health` endpoint
- ✅ **CORS Enabled** - Works with Vite dev server
- ✅ **Docker Support** - Containerized deployment

## Features (Planned)

- 🔄 **Ticket Classification** - Auto-categorize incidents
- 🔄 **Sentiment Analysis** - Understand caller tone
- 🔄 **Duplicate Detection** - Find similar tickets
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

### Status (Protected)

**GET** `/api/ai/status`

Requires authentication. Returns detailed service status.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/ai/status
```

### API Documentation

Interactive API documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Configuration

Environment variables are configured in `.env`:

```env
```bash
# Example .env for backend-python
JWT_SECRET=<same as backend-auth/.env>
DB_HOST=postgres
DB_PORT=5432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres
SERVICE_VERSION=1.0.0
```
```

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

```
backend-python/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── core/
│   │   ├── auth.py          # JWT validation
│   │   └── config.py        # Settings management
│   └── api/                 # Future: API routes
├── .env                     # Environment variables
├── .gitignore
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

## Next Steps (Phase 2)

1. Implement ticket classification endpoint
2. Add sentiment analysis
3. Integrate with ServiceNow data
4. Add batch processing for existing tickets

## Support

For issues or questions:
- Check logs: `docker logs itsm-python-backend`
- Review API docs: http://localhost:8000/docs
- See main project README
