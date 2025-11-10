# Complete Setup Guide - ITSM Insight Nexus

This guide covers the full setup process for the ITSM Insight Nexus platform with AI-powered features.

## Prerequisites

- **Docker Desktop** - For running PostgreSQL, PostgREST, and AI services
- **Node.js 18+** - For frontend and auth backend
- **Conda environment** - Recommended for dependency isolation (`itsm`)
- **LM Studio** - For local AI embeddings (download from [lmstudio.ai](https://lmstudio.ai))

## Architecture Overview

```
Frontend (Vite:8080)
        ↓
    ┌───────────┬──────────────┬─────────────┐
    ↓           ↓              ↓             ↓
Auth API    PostgREST      AI Backend    LM Studio
(Node:3001) (REST:3000)    (FastAPI:8000) (Embed:1234)
    ↓           ↓              ↓             ↓
    └───────────┴──────────────┴─────────────┘
                ↓
        PostgreSQL 15 + pgvector
                ↓
        Embedding Worker (Background)
```

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd itsm-insight-nexus

# Activate conda environment (prevents dependency conflicts)
conda activate itsm

# Install frontend dependencies
npm install
```

### 2. Setup LM Studio (AI Embeddings)

This is required for semantic similarity search:

1. Download and install [LM Studio](https://lmstudio.ai)
2. In LM Studio, download the model: **text-embedding-embeddinggemma-300m-qat**
3. Start the local server:
   - Click "Local Server" tab
   - Port: **1234** (default)
   - Load the embedding model
   - Click "Start Server"
4. Verify it's running:
   ```bash
   curl http://localhost:1234/v1/models
   ```

### 3. Start Docker Services

```bash
# Start all backend services
docker compose up -d postgres postgrest pgadmin python-backend embedding-worker

# Verify all containers are running
docker ps

# You should see:
# - itsm-postgres          (port 15432)
# - itsm-postgrest         (port 3000)
# - itsm-pgadmin          (port 5050)
# - itsm-python-backend   (port 8000)
# - itsm-embedding-worker (background)
```

### 4. Setup Authentication Backend

```bash
# Navigate to auth backend directory
cd backend-auth

# Install dependencies
npm install

# Run database migration (creates users and password_reset_tokens tables)
node run-migration.js

# Start the auth API server
npm run dev
```

This starts the JWT authentication service on **http://localhost:3001**

**Keep this terminal running**, or use a process manager like PM2.

### 5. Start Frontend Development Server

```bash
# Open a new terminal
# Navigate back to project root
cd /path/to/itsm-insight-nexus

# Activate conda if not already active
conda activate itsm

# Start Vite dev server
npm run dev
```

Frontend will be available at **http://localhost:8080**

### 6. Login to Application

Open http://localhost:8080 in your browser and log in with:

- **Email:** `admin@itsm.local`
- **Password:** `admin123`

### 7. Initialize AI Features (First Time Only)

After first login, populate embeddings for existing tickets:

```bash
# Generate embeddings for all tickets (may take a few minutes)
docker exec itsm-python-backend python scripts/populate_embeddings.py

# Optional: limit to first 100 tickets for testing
docker exec itsm-python-backend python scripts/populate_embeddings.py --limit 100

# Establish parent-child relationships based on similarity
# First, preview what will be done
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --dry-run

# Then apply the relationships
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py

# The embedding worker will automatically process new tickets going forward
```

---

## Environment Configuration

All services are now configured via environment variables and Docker Compose. The main configuration files are:

### Frontend Root `.env`

```bash
# Supabase (LEGACY - not currently used)
VITE_SUPABASE_PROJECT_ID="..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="..."

# Backend API (ACTIVE)
VITE_API_BASE_URL=http://localhost:3001

# ServiceNow Integration (for scripts)
SERVICENOW_INSTANCE_URL="https://your-instance.service-now.com"
SERVICENOW_USERNAME="admin"
SERVICENOW_PASSWORD="your_password"
SERVICENOW_AUTH_TYPE="basic"

# Docker Postgres Connection (for scripts)
DB_HOST="localhost"
DB_PORT="15432"
DB_NAME="itsm_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
```

### Backend Auth `backend-auth/.env`

```bash
# Server Configuration
PORT=3001
JWT_SECRET=921ded1a3143d5745e14587d2a1877ce52179acda540d13d8d63ceefad62ef4b15049201ade10f636f6e95d85ed813fa8086e89c7c5c71d4d14c218fb14d4fd4

# Database (connects to Docker Postgres from host)
DB_HOST=localhost
DB_PORT=15432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### Python Backend `backend-python/.env`

```bash
# JWT Secret (MUST match backend-auth/.env)
JWT_SECRET=921ded1a3143d5745e14587d2a1877ce52179acda540d13d8d63ceefad62ef4b15049201ade10f636f6e95d85ed813fa8086e89c7c5c71d4d14c218fb14d4fd4

# Database (connects to Postgres container via Docker network)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres

# Service Info
SERVICE_NAME=itsm-ai-backend
SERVICE_VERSION=1.0.0
LOG_LEVEL=INFO
```

**Important Notes:**

- `JWT_SECRET` must be identical in both backend-auth and backend-python
- Backend-auth uses `DB_HOST=localhost` and `DB_PORT=15432` (external)
- Python backend uses `DB_HOST=postgres` and `DB_PORT=5432` (Docker network)
- LM Studio connection is automatic via `http://host.docker.internal:1234/v1`

---

## Architecture

```
┌─────────────────┐      HTTP       ┌──────────────────┐
│   Frontend      │ ────────────>   │   Backend API    │
│   (Vite/React)  │     (3001)      │   (Express)      │
│   Port 8080     │                 │   Port 3001      │
└─────────────────┘                 └──────────────────┘
                                             │
                                             │ SQL
                                             ▼
                                    ┌──────────────────┐
                                    │   PostgreSQL     │
                                    │   Port 15432     │
                                    └──────────────────┘
```

### Authentication Flow

1. User submits email/password via Login page
2. Frontend sends POST to `http://localhost:3001/api/auth/login`
3. Backend verifies credentials against `users` table in Postgres
4. Backend returns JWT token + user data
5. Frontend stores token in localStorage
6. Subsequent requests include token in `Authorization` header
7. Backend validates token for protected endpoints

---

## Database Schema

### `users` table

```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR) - bcrypt hashed
- full_name (VARCHAR)
- role (VARCHAR) - 'admin', 'analyst', 'viewer'
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### `password_reset_tokens` table

```sql
- id (UUID, PK)
- user_id (UUID, FK -> users.id)
- token (VARCHAR, UNIQUE)
- expires_at (TIMESTAMP)
- used (BOOLEAN)
- created_at (TIMESTAMP)
```

---

## Development Workflow

### Daily Workflow

1. **Start Docker:**
   ```bash
   docker-compose up -d
   ```

2. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend (new terminal):**
   ```bash
   conda activate itsm
   npm run dev
   ```

### Stopping Services

```bash
# Stop frontend: Ctrl+C in terminal

# Stop backend: Ctrl+C in terminal

# Stop Docker:
docker-compose down
```

---

## Troubleshooting

### "Connection refused" errors

- Make sure Docker is running: `docker ps`
- Check if PostgreSQL is up: `docker-compose ps`
- Verify port 15432 is not in use

### "Password authentication failed"

- Check `backend/.env` has correct credentials
- Default: user=postgres, password=postgres
- Restart backend after changing .env

### Backend won't start

- Check if port 3001 is available
- Make sure you ran `node run-migration.js` first
- Check `backend/.env` exists

### Can't log in

- Make sure backend is running on port 3001
- Check browser console for API errors
- Verify test user exists:
  ```bash
  cd backend
  node run-migration.js
  ```

### Frontend shows "Access token required"

- Clear localStorage: Browser DevTools → Application → Local Storage → Clear
- Sign out and sign in again
- Check backend is running

---

## Creating New Users

### Via API (Recommended)

Use the signup page at http://localhost:8080/signup

### Via Database (Admin)

```sql
-- Connect to Postgres (pgAdmin or psql)
-- Password must be bcrypt hashed
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
  'user@example.com',
  '$2a$10$hashed_password_here',
  'John Doe',
  'analyst'
);
```

To generate a bcrypt hash:

```javascript
// In backend directory
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 10));"
```

---

## Security Notes

- **JWT_SECRET:** Change in production!
- **Passwords:** Hashed with bcrypt (salt rounds: 10)
- **Tokens:** Expire in 7 days
- **HTTPS:** Use HTTPS in production
- **CORS:** Configured for localhost in development

---

## Next Steps

- [ ] Configure email for password reset
- [ ] Add role-based access control
- [ ] Implement user profile editing
- [ ] Add OAuth providers (Google, GitHub)
- [ ] Enable 2FA
- [ ] Add session timeout warnings
- [ ] Implement audit logging
