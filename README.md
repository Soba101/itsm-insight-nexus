# ITSM Insight Nexus

AI-powered IT Service Management analytics platform with semantic ticket similarity search and automated parent-child linking.

## 🚀 Features

### Core Functionality

- 📊 **Real-time Dashboard** - KPIs, backlog trends, and ticket distribution
- 🎫 **Ticket Management** - Advanced filtering, pagination, and saved defaults
- 🧭 **Configurable Settings** - Tabbed System/My Preferences/Account experience with connection tests
- 🔐 **JWT Authentication** - Secure user management with password reset
- 🌓 **Dark/Light Mode** - System preference aware and user-overridable

### AI-Powered Features (NEW)

- 🤖 **Semantic Similarity Search** - Qwen3-4096 (default) or Gemma-768 embeddings selectable per request
- 🔗 **Ticket Family Graphs** - Automatic parent/child/grandchild linking with similarity scores
- ⚡ **Background Embedding Worker** - Queue-driven processing with dual-column support
- 📦 **Batch & Benchmark Scripts** - Populate embeddings, establish relationships, and compare models
- 🎯 **LM Studio Integration** - Local embeddings with switchable models (Gemma ↔ Qwen3)

## Project info

**URL**: <https://lovable.dev/projects/a7dbc2fd-31d6-402a-873b-95b57c9d75b0>

## How can I edit this code?

There are several ways of editing your application.

### Use Lovable

Simply visit the [Lovable Project](https://lovable.dev/projects/a7dbc2fd-31d6-402a-873b-95b57c9d75b0) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

### Use your preferred IDE

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

### Edit a file directly in GitHub

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

### Use GitHub Codespaces

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

### Frontend

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### Backend

- **Authentication**: Node.js + Express (port 3001)
- **AI/ML**: Python + FastAPI (port 8000)
- **Database**: PostgreSQL 15 + pgvector (port 15432)
- **API Layer**: PostgREST (port 3000)

### AI/ML Stack

- **Embeddings**: LM Studio + `text-embedding-qwen3-embedding-8b` (4096-dim default) with optional `text-embedding-embeddinggemma-300m-qat`
- **Vector Search**: pgvector (HNSW on 768-dim column, brute-force on 4096-dim)
- **Similarity**: Cosine distance with configurable threshold (defaults to 0.8)
- **Queue System**: PostgreSQL triggers + Python worker

## 🏗️ Architecture

```text
Frontend (Vite + React)
         ↓
    ┌─────────┬──────────┬─────────────┐
    ↓         ↓          ↓             ↓
Auth API   PostgREST   AI Backend   LM Studio
(Node.js)  (REST)      (FastAPI)    (Embeddings)
    ↓         ↓          ↓             ↓
    └─────────┴──────────┴─────────────┘
              ↓
        PostgreSQL + pgvector
              ↓
    Embedding Worker (Background)
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a7dbc2fd-31d6-402a-873b-95b57c9d75b0) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop
- [LM Studio](https://lmstudio.ai) (for AI embeddings)
- Conda environment (recommended: `conda activate itsm`)

### 1. Setup Environment

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd itsm-insight-nexus

# Activate conda environment
conda activate itsm

# Install frontend dependencies
npm install
```

### 2. Setup LM Studio (for AI features)

1. Download and install [LM Studio](https://lmstudio.ai)
2. Load the **recommended** model `text-embedding-qwen3-embedding-8b` (4096-dim)
3. Optional: also download `text-embedding-embeddinggemma-300m-qat` (768-dim) for A/B testing
4. Start the local server on port `1234` and keep LM Studio running before hitting AI endpoints
5. Verify models are exposed: `curl http://localhost:1234/v1/models`

### 3. Start All Services

```bash
# Start database, API layer, and AI backend
docker compose up -d postgres postgrest pgadmin python-backend embedding-worker

# Verify all containers are running
docker ps

# Check service health
docker logs itsm-postgres
docker logs itsm-python-backend
docker logs itsm-embedding-worker
```

`docker-compose.yml` defaults `LM_STUDIO_MODEL` to `text-embedding-qwen3-embedding-8b`; adjust it (and restart backend + worker) if you switch models in LM Studio.

### 4. Setup Authentication Backend

```bash
# Navigate to auth backend
cd backend-auth

# Install dependencies
npm install

# Run database migration (creates users table)
node run-migration.js

# Start auth API server (port 3001)
npm run dev
```

Keep this terminal running or use a process manager.

### 5. Start Frontend

```bash
# From project root (new terminal)
npm run dev

# Access at http://localhost:8080
# Default login: admin@itsm.local / admin123
```

After logging in, open **Settings → System** to confirm API endpoints, test connections, and adjust My Preferences (theme, default page, similarity threshold, etc.).

### 6. Initialize AI Features (First Time)

```bash
# Generate embeddings for existing tickets (auto-detects model dimension)
docker exec itsm-python-backend python scripts/populate_embeddings.py --batch-size 8

# Establish parent-child relationships (dry run recommended first)
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --dry-run
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py

# (Optional) Compare Gemma vs Qwen3 quality metrics
docker exec itsm-python-backend python scripts/performance_eval/compare_models.py

# The embedding worker will automatically process new/updated tickets going forward
```

### Services Overview

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 8080 | Vite dev server |
| Auth API | 3001 | JWT authentication |
| PostgREST | 3000 | Database REST API |
| AI Backend | 8000 | Similarity search |
| LM Studio | 1234 | Embedding generation |
| PostgreSQL | 15432 | Main database |
| pgAdmin | 5050 | Database management |

## ⚙️ Settings & Data Sources

- Tabbed Settings page (System, My Preferences, Account) persists to `localStorage` keys `itsm-settings` and `itsm-user-preferences` until backend APIs land.
- System tab manages data sources (`docker` PostgREST vs `supabase`) with confirmation dialog and automatic reload after save.
- Connection test buttons verify Data Source, Auth API, and AI Backend; badges reflect latest status and require LM Studio/backends to be running.
- My Preferences tab controls theme, default dashboard page, ticket filters, page size, similarity threshold, and feature toggles for duplicates/graphs.
- Import/export buttons allow JSON backups of settings and preferences; `Cmd/Ctrl+S` saves changes, and Reset restores defaults.

## 📚 Documentation & Resources

- **Setup Guide**: `docs/SETUP_GUIDE.md`
- **Docker Guide**: `docs/DOCKER.md`
- **Backend Implementation**: `docs/BACKEND_implementation.md`
- **Auth Phase 1**: `docs/AUTH_PHASE1_COMPLETE.md`
- **Python Backend**: `backend-python/README.md`
- **Scripts**: `scripts/README.md`

## 🧪 Testing Similarity Search

```bash
# Get JWT token (login to frontend first, check localStorage)
TOKEN="your_jwt_token_here"

# Search for similar tickets
curl -X POST http://localhost:8000/api/ai/similarity/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_number": "INC0010048",
    "model": "qwen3",  # or "gemma"
    "top_k": 5,
    "min_similarity": 0.7
  }'

# Get ticket family (parent + children)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/ai/similarity/tickets/INC0010048/family
```

> ℹ️ Omit `model` to default to **qwen3** (`embedding_4096`). Specify `"gemma"` to query the 768-dimension column.

```

## 🔧 Troubleshooting

### Container Issues

```bash
# Restart all services
docker compose restart

# Rebuild specific service
docker compose up -d --build python-backend

# Check logs
docker logs itsm-postgres
docker logs itsm-python-backend
docker logs itsm-embedding-worker
```

### Embedding Worker Not Processing

```bash
# Check queue status
docker exec itsm-postgres psql -U postgres -d itsm_db \
  -c "SELECT status, COUNT(*) FROM embedding_queue GROUP BY status;"

# Manually trigger worker
docker exec itsm-python-backend python scripts/populate_embeddings.py
```

### LM Studio Connection Issues

```bash
# Test LM Studio API
curl http://localhost:1234/v1/models

# Check if model is loaded
curl -X POST http://localhost:1234/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "text-embedding-qwen3-embedding-8b", "input": "test"}'

# Swap the model name to `text-embedding-embeddinggemma-300m-qat` if you are testing the 768-dimension baseline.
```

## 🤝 Contributing

This project uses Lovable for rapid development. Changes can be made via:

1. **Lovable Platform** - Commits automatically
2. **Local IDE** - Push changes to sync
3. **GitHub Directly** - Edit files in browser

## 📚 Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Complete installation instructions
- **[Docker Guide](docs/DOCKER.md)** - Container configuration and troubleshooting
- **[Model Performance](docs/Model-performance.md)** - Evaluation methodology
- **[Model Results](docs/model-results.md)** - Benchmark results and comparisons
- **[Quick Start Testing](QUICKSTART_MODEL_TESTING.md)** - Model testing guide

## 📊 Model Performance

Current recommended embedding model: **text-embedding-qwen3-embedding-8b** (4096 dim)

| Metric | Gemma-768 | Qwen3-4096 |
| --- | --- | --- |
| Separation gap | +0.0326 (weak) | **+0.0947 (good)** |
| Same-category similarity | 0.496 | **0.591** |
| Different-category similarity | 0.464 | 0.497 |
| Embedding latency | **~26 ms** | ~436 ms |
| Search latency | **<1 ms (HNSW)** | ~5–10 ms (brute force) |

Use Gemma when you need rapid embedding generation with indexed search; use Qwen3 for materially better quality. Run `docker exec itsm-python-backend python scripts/performance_eval/compare_models.py` after changing LM Studio models to validate on your dataset.

See `docs/model-results.md` and `docs/DUAL_MODEL_SETUP_COMPLETE.md` for detailed benchmarks.
