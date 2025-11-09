# Scripts Directory

Utility scripts for ServiceNow integration, data loading, and AI embeddings.

## Overview

This directory contains Python scripts for:
- Fetching incidents from ServiceNow API
- Loading data into Docker PostgreSQL
- Generating embeddings for semantic search
- Establishing ticket relationships

## Setup

### Install Dependencies

```bash
# Activate conda environment
conda activate itsm

# Install Python packages
pip install -r scripts/requirements.txt
```

### Environment Variables

Scripts read from `.env` in project root. Required variables:

```env
# ServiceNow API
SERVICENOW_INSTANCE_URL="https://dev305874.service-now.com"
SERVICENOW_USERNAME="admin"
SERVICENOW_PASSWORD="your_password"
SERVICENOW_AUTH_TYPE="basic"

# Docker Postgres (external connection from host)
DB_HOST="localhost"
DB_PORT="15432"
DB_NAME="itsm_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
```

## Scripts

### ServiceNow Integration

#### `fetch_servicenow_incidents.py`

Fetches incidents from ServiceNow Table API with complete field data.

**Usage:**

```bash
# Fetch all incidents to JSON file
python scripts/fetch_servicenow_incidents.py > data/servicenow_incidents_full.json

# Or redirect to custom file
python scripts/fetch_servicenow_incidents.py > data/incidents_$(date +%Y%m%d).json
```

**Includes:**
- All incident fields (number, short_description, description, priority, state, etc.)
- caller_id, assignment_group
- impact, urgency
- Timestamps (opened_at, sys_created_on, etc.)

#### `insert_servicenow_incidents.py`

Loads ServiceNow incidents from JSON into PostgreSQL `servicenow_incidents` table.

**Usage:**

```bash
# Load from default file
python scripts/insert_servicenow_incidents.py

# Specify custom file
python scripts/insert_servicenow_incidents.py --file data/custom_incidents.json
```

**Requirements:**
- Docker Postgres running on port 15432
- JSON file in ServiceNow Table API format
- `psycopg2-binary` package installed

#### `test_servicenow_api.sh`

Quick test script to verify ServiceNow API connectivity.

**Usage:**

```bash
chmod +x scripts/test_servicenow_api.sh
./scripts/test_servicenow_api.sh
```

### AI / Embeddings (Docker Backend)

These scripts run inside the `itsm-python-backend` container:

#### Populate Embeddings

Generate embeddings for tickets that don't have them yet:

```bash
# Process all tickets without embeddings
docker exec itsm-python-backend python scripts/populate_embeddings.py

# Limit to first 100 tickets
docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100

# Use smaller batch size (default 16)
docker exec itsm-python-backend python scripts/populate_embeddings.py --batch-size 8

# Dry run (preview without making changes)
docker exec itsm-python-backend python scripts/populate_embeddings.py --dry-run
```

**What it does:**
1. Queries tickets without embeddings
2. Processes in configurable batches
3. Generates 768-dim vectors via LM Studio
4. Stores embeddings in PostgreSQL with pgvector

#### Establish Ticket Relationships

Create parent-child relationships based on similarity:

```bash
# Preview relationships (dry run)
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --dry-run

# Apply relationships with default threshold (0.75)
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py

# Use higher similarity threshold
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --min-similarity 0.85

# Limit processing
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --limit 50
```

**How it works:**
1. Finds tickets without parents
2. Searches for older similar tickets using pgvector
3. Assigns most similar ticket as parent (if above threshold)
4. Database triggers update child_incidents arrays automatically

**Recommended workflow:**
```bash
# 1. Generate embeddings first
docker exec itsm-python-backend python scripts/populate_embeddings.py

# 2. Preview relationships
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --dry-run

# 3. Apply relationships
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py

# 4. View in Graph page of application
```

#### Embedding Worker (Background)

The `embedding_worker.py` script runs continuously as a Docker service:

```bash
# Check worker status
docker logs -f itsm-embedding-worker

# Restart worker
docker compose restart embedding-worker

# Run manually (for testing)
docker exec itsm-python-backend python scripts/embedding_worker.py --interval 10 --batch-size 16
```

## Data Flow

```
1. ServiceNow → fetch_servicenow_incidents.py → data/*.json
2. JSON → insert_servicenow_incidents.py → PostgreSQL servicenow_incidents
3. New tickets → DB trigger → embedding_queue
4. embedding_worker.py → processes queue → generates embeddings
5. establish_ticket_relationships.py → creates parent-child links
6. Frontend → AI Backend → pgvector queries → similarity results
```

## Troubleshooting

### ServiceNow API Issues

```bash
# Test connectivity
./scripts/test_servicenow_api.sh

# Check credentials in .env
cat .env | grep SERVICENOW
```

### Database Connection Issues

```bash
# Verify Docker Postgres is running
docker ps | grep itsm-postgres

# Test connection
psql -h localhost -p 15432 -U postgres -d itsm_db -c "SELECT 1"
```

### Embedding Issues

```bash
# Check LM Studio is running
curl http://localhost:1234/v1/models

# View Python backend logs
docker logs itsm-python-backend

# Check queue status
docker exec itsm-postgres psql -U postgres -d itsm_db \
  -c "SELECT status, COUNT(*) FROM embedding_queue GROUP BY status;"
```

### MCP Server Configuration

To configure the ServiceNow MCP server to use environment variables:

1. Make the launcher script executable:
   ```bash
   chmod +x scripts/launch_servicenow_mcp.sh
   ```

2. Update your `mcp.json` (or copy from `mcp.json.template`):
   ```json
   "ServiceNow": {
     "command": "/Users/don/DocumentsMac/Codes/itsm-insight-nexus/scripts/launch_servicenow_mcp.sh",
     "args": [],
     "type": "stdio"
   }
   ```

3. The launcher script will automatically load variables from `.env` before starting the MCP server.

## Security Notes

- **Never commit `.env` file to git** - it's already in `.gitignore`
- The `mcp.json` template no longer contains hardcoded credentials
- All sensitive data is stored in `.env` file only
