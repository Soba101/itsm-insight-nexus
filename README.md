# ITSM Insight Nexus

AI-powered IT Service Management analytics platform with semantic ticket similarity search and automated parent-child linking.

## 🚀 Features

### Core Functionality

- 📊 **Real-time Dashboard** - KPIs, trends, and ticket distribution
- 🎫 **Ticket Management** - Advanced filtering and search
- 📈 **Analytics & Insights** - Priority breakdown, state analysis
- 🔐 **JWT Authentication** - Secure user management
- 🌓 **Dark/Light Mode** - System preference aware

### AI-Powered Features (NEW)

- 🤖 **Semantic Similarity Search** - Find related tickets using 768-dim embeddings
- 🔗 **Automatic Parent-Child Linking** - Duplicate detection with 0.8+ similarity threshold
- ⚡ **Background Embedding Worker** - Automatic queue-based processing
- 📦 **Batch Processing** - Efficient bulk embedding generation
- 🎯 **LM Studio Integration** - Local embeddings (no external API costs)

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

- **Embeddings**: LM Studio + EmbeddingGemma-300m-qat (768 dimensions)
- **Vector Search**: pgvector with HNSW indexing
- **Similarity**: Cosine distance with 0.8 threshold
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
2. Download model: `text-embedding-embeddinggemma-300m-qat` (768-dim)
3. Start local server on port 1234
4. Verify: `curl http://localhost:1234/v1/models`

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

### 6. Initialize AI Features (First Time)

```bash
# Generate embeddings for existing tickets
docker exec itsm-python-backend python scripts/populate_embeddings.py

# Establish parent-child relationships
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --dry-run
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py

# The embedding worker will automatically process new tickets going forward
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
    "top_k": 5,
    "min_similarity": 0.7
  }'

# Get ticket family (parent + children)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/ai/similarity/tickets/INC0010048/family
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
  -d '{"model": "text-embedding-embeddinggemma-300m-qat", "input": "test"}'
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

Current embedding model: **EmbeddingGemma-300m-qat**

**Speed:** ⭐⭐⭐⭐⭐ Exceptional (26ms avg embedding, 1.2ms search)
**Quality:** ⭐☆☆☆☆ Poor (negative separation gap, 38.9% category agreement)
**Status:** ⚠️ Not recommended for production

See `docs/model-results.md` for detailed benchmarks and testing Qwen3-8B alternative.
