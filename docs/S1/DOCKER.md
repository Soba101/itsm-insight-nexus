# Docker Setup for ITSM Insight Nexus

This guide explains the Docker-based architecture for running PostgreSQL with pgvector, PostgREST API, Python AI backend, and supporting services.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- LM Studio running on host (for AI embeddings)

## Quick Start

### 1. Start All Services

```bash
# Start all backend services
docker compose up -d

# Or start specific services
docker compose up -d postgres postgrest pgadmin python-backend embedding-worker
```

### 2. Verify Services

```bash
# Check all containers are running
docker ps

# You should see:
# - itsm-postgres          (port 15432)
# - itsm-postgrest         (port 3000)
# - itsm-pgadmin          (port 5050)
# - itsm-python-backend   (port 8000)
# - itsm-embedding-worker (background)

# Check service logs
docker logs itsm-postgres
docker logs itsm-python-backend
docker logs itsm-embedding-worker
```

## Services Overview

### PostgreSQL 15 with pgvector (port 15432)

- **Image:** `pgvector/pgvector:pg15`
- **Container:** `itsm-postgres`
- **Database:** `itsm_db`
- **User:** `postgres`
- **Password:** `postgres`
- **External Port:** 15432 (to avoid conflicts with local Postgres on 5432)
- **Internal Port:** 5432
- **Features:**
  - Full ServiceNow incidents schema
  - pgvector extension for semantic search (768-dim embeddings)
  - HNSW indexes for fast similarity search
  - Automatic embedding queue triggers

**Initial Data:**

- Sample tickets loaded from `docker/init.sql`
- Migrations auto-applied from `docker/migrations/`

### PostgREST API (port 3000)

- **Image:** `postgrest/postgrest:latest`
- **Container:** `itsm-postgrest`
- **Purpose:** Auto-generated REST API from Postgres schema
- **Access:** <http://localhost:3000>
- **Endpoints:**
  - `GET /servicenow_incidents` - List all tickets
  - `GET /servicenow_incidents?incident_number=eq.INC0010001` - Filter tickets
  - `GET /embedding_queue` - View embedding queue status

**Example Queries:**

```bash
# Get all tickets
curl http://localhost:3000/servicenow_incidents

# Filter by priority
curl "http://localhost:3000/servicenow_incidents?priority=eq.1"

# Get single ticket
curl "http://localhost:3000/servicenow_incidents?incident_number=eq.INC0010001"
```

### Python AI Backend (port 8000)

- **Image:** Custom (built from `backend-python/Dockerfile`)
- **Container:** `itsm-python-backend`
- **Framework:** FastAPI
- **Purpose:** AI-powered similarity search and embeddings
- **Access:** <http://localhost:8000>
- **API Docs:** <http://localhost:8000/docs>

**Key Endpoints:**

- `POST /api/ai/similarity/search` - Find similar tickets
- `GET /api/ai/similarity/tickets/{id}/family` - Get parent/children
- `POST /api/ai/similarity/embed` - Generate embedding for text
- `GET /api/ai/health` - Health check

**Features:**

- JWT authentication (validates tokens from auth backend)
- Integrates with LM Studio for embeddings
- pgvector queries for similarity search
- Batch processing scripts included

### Embedding Worker (background)

- **Image:** Same as python-backend
- **Container:** `itsm-embedding-worker`
- **Command:** `python scripts/embedding_worker.py --interval 10 --batch-size 16`
- **Purpose:** Automatic background processing of embedding queue

**How It Works:**

1. Database trigger enqueues new/updated tickets
2. Worker polls queue every 10 seconds
3. Processes up to 16 tickets per batch
4. Generates embeddings via LM Studio
5. Updates tickets with embedding vectors
6. Marks queue entries as completed

**Monitoring:**

```bash
# View worker logs
docker logs -f itsm-embedding-worker

# Check queue status
docker exec itsm-postgres psql -U postgres -d itsm_db \
  -c "SELECT status, COUNT(*) FROM embedding_queue GROUP BY status;"
```

### pgAdmin 4 (port 5050)

- **Image:** `dpage/pgadmin4:latest`
- **Container:** `itsm-pgadmin`
- **Web Interface:** <http://localhost:5050>
- **Email:** `admin@localhost.com`
- **Password:** `admin`

**Purpose:** Visual database management and query tool

## Connecting to Services

### From Your Application

The frontend now supports Docker Postgres via PostgREST:

1. Open the app at <http://localhost:8080>
2. Login with `admin@itsm.local / admin123`
3. Navigate to **Settings**
4. Verify **Data Source** is set to "Local API (Docker Postgres)"
5. API Base URL should be `http://localhost:3000`

**Data Flow:**

- Frontend → PostgREST (`http://localhost:3000/servicenow_incidents`)
- PostgREST → Postgres (`itsm-postgres:5432`)
- AI features → Python Backend (`http://localhost:8000`)

### From pgAdmin

1. Open <http://localhost:5050> in browser
2. Login: `admin@localhost.com` / `admin`
3. Click "Add New Server"
4. **General tab:**
   - Name: `ITSM Local`
5. **Connection tab:**
   - Host: `itsm-postgres` ⚠️ (use container name, not localhost)
   - Port: `5432` ⚠️ (internal port, not 15432)
   - Database: `itsm_db`
   - Username: `postgres`
   - Password: `postgres`

**Why `itsm-postgres`?** pgAdmin runs inside Docker and uses the Docker network where containers are accessible by their names.

### From Host Machine (psql, scripts)

```bash
# Connect with psql
psql -h localhost -p 15432 -U postgres -d itsm_db

# Or use environment variables
export PGHOST=localhost
export PGPORT=15432
export PGDATABASE=itsm_db
export PGUSER=postgres
export PGPASSWORD=postgres
psql
```

**From Python Scripts:**

```python
import psycopg2
conn = psycopg2.connect(
    host="localhost",
    port=15432,
    database="itsm_db",
    user="postgres",
    password="postgres"
)
```

## Useful Commands

### Service Management

```bash
# Start all services
docker compose up -d

# Start specific services
docker compose up -d postgres postgrest python-backend

# Stop all services
docker compose down

# Stop and remove volumes (deletes all data)
docker compose down -v

# Restart a service
docker compose restart python-backend

# Rebuild and restart after code changes
docker compose up -d --build python-backend
```

### Logs and Debugging

```bash
# View logs for a service
docker logs itsm-postgres
docker logs itsm-python-backend
docker logs itsm-embedding-worker

# Follow logs in real-time
docker logs -f itsm-embedding-worker

# View last 100 lines
docker logs --tail 100 itsm-python-backend
```

### Database Operations

```bash
# Connect with psql
docker exec -it itsm-postgres psql -U postgres -d itsm_db

# Run SQL query directly
docker exec itsm-postgres psql -U postgres -d itsm_db -c "SELECT COUNT(*) FROM servicenow_incidents;"

# Check embedding queue status
docker exec itsm-postgres psql -U postgres -d itsm_db \
  -c "SELECT status, COUNT(*) FROM embedding_queue GROUP BY status;"

# Backup database
docker exec itsm-postgres pg_dump -U postgres itsm_db > backup.sql

# Restore database
docker exec -i itsm-postgres psql -U postgres -d itsm_db < backup.sql
```

### AI Backend Operations

```bash
# Test AI backend health
curl http://localhost:8000/api/ai/health

# Populate embeddings for all tickets
docker exec itsm-python-backend python scripts/populate_embeddings.py

# Populate with limit
docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100 --batch-size 8

# Establish ticket relationships
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --dry-run

# Access Python backend shell
docker exec -it itsm-python-backend bash
```

### System Monitoring

```bash
# Check container status
docker ps

# Check resource usage
docker stats

# Inspect container details
docker inspect itsm-postgres

# Check container health
docker inspect --format='{{.State.Health.Status}}' itsm-python-backend
```

docker exec -it itsm-postgres psql -U postgres -d itsm_db

# Restart containers

docker-compose restart

# Rebuild (if you change docker/init.sql)

docker-compose down -v
docker-compose up -d --build

```

## Database Schema

The `docker/init.sql` script creates:
- `public.tickets` table with all columns matching the Supabase schema
- Indexes on status, priority, type, opened_at, service
- Trigger for automatic `updated_at` timestamp updates
- Sample ticket data (INC001, INC002, etc.)

## Troubleshooting

**Port 5432 already in use:**
```bash

# Check what's using the port

lsof -i :5432

# Stop local Postgres if running

brew services stop postgresql

```

**Permission errors:**
```bash

# Reset volumes

docker-compose down -v
docker-compose up -d

```

**Can't connect from pgAdmin:**
- Use `host.docker.internal` instead of `localhost` for the host
- Or use the container name `postgres` if pgAdmin is in the same Docker network

## Next Steps

If you want to use this Docker database with your React app, you'll need to:
1. Add a REST API layer (PostgREST, custom backend, or similar)
2. Update `src/lib/api.ts` to use the new API endpoint
3. Update `.env` to point to `http://localhost:3000` (or your API URL)

For now, you can use the "Mock Data" toggle in Settings to develop the frontend without a live database connection.
