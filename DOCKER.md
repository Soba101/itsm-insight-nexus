# Docker Setup for ITSM Insight Nexus

This guide explains how to run a local Postgres database using Docker as an alternative to Supabase.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

1. **Start the database:**
   ```bash
   docker-compose up -d
   ```

2. **Verify containers are running:**
   ```bash
   docker ps
   ```
   You should see `itsm-postgres` and `itsm-pgadmin` containers.

3. **Check database logs:**
   ```bash
   docker logs itsm-postgres
   ```

## What's Included

- **PostgreSQL 15** (port 15432)
  - Database: `itsm_db`
  - User: `postgres`
  - Password: `postgres`
  - Contains the same schema and sample data as Supabase
  - **Note:** Using port 15432 to avoid conflicts with local Postgres on 5432

- **pgAdmin 4** (optional, port 5050)
  - Web interface: <http://localhost:5050>
  - Email: `admin@localhost.com`
  - Password: `admin`

## Connecting to the Database

### From pgAdmin

1. Open <http://localhost:5050> in your browser
2. Login with `admin@localhost.com` / `admin`
3. Click "Add New Server"
4. **General tab:**
   - Name: `ITSM Local` (or any name you like)
5. **Connection tab:**
   - Host name/address: `itsm-postgres` ⚠️ **Use the container name, NOT localhost**
   - Port: `5432` ⚠️ **Use internal port 5432, NOT 15432**
   - Maintenance database: `itsm_db`
   - Username: `postgres`
   - Password: `postgres`
6. Click "Save"

**Important:** pgAdmin runs inside Docker, so it connects to Postgres using the Docker network. The container name `itsm-postgres` is the hostname on that network.

### From your application

The React app currently uses the Supabase client (`src/integrations/supabase/client.ts`), which won't work with raw Postgres. You have two options:

**Option 1: Use Mock Data (simplest)**
- Go to Settings in the app
- Enable "Use Mock Data"
- This bypasses the database entirely

**Option 2: Add a REST API layer**
- You could add PostgREST to `docker-compose.yml` to provide a REST API
- Or build a custom backend API (Node.js/Express, Python/FastAPI, etc.)
- Update `src/lib/api.ts` to point to your API

## Useful Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# Stop and remove all data
docker-compose down -v

# View logs
docker logs itsm-postgres
docker logs itsm-pgadmin

# Connect with psql CLI
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
