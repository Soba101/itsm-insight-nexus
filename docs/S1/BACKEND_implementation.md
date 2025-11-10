You are a senior backend engineer. Generate a production-grade backend service named “ITSM Insight Nexus Backend”.

Goals

1. Ingest and classify IT support tickets (category, priority, sentiment).
2. Perform hybrid retrieval (BM25 + FAISS embeddings) over knowledge base documents.
3. Provide RAG-style answers with citations.
4. Integrate cleanly with an existing React + Vite frontend at http://localhost:8080.

Tech

- Language: Python 3.11
- Framework: FastAPI
- Vector DB: local FAISS (IndexFlatIP)
- Search: BM25 via rank_bm25
- Embeddings: sentence-transformers (BGE-small-en or all-MiniLM-L6-v2)
- Classifier: Hugging Face Transformers (loadable binary / on-disk)
- RAG generator: OpenAI-compatible client with API key via env var (no hardcoding)
- Storage: Dockerized PostgreSQL for tickets, users, and documents
- Tasks: background ingestion using asyncio
- Container: Dockerfile + docker-compose
- Observability: structured JSON logging + Prometheus metrics
- Tests: pytest + httpx, >80% coverage on critical APIs

Architecture

- app/api: FastAPI routers for /tickets, /nlp, /kb, /rag
- app/models: SQLModel ORM for tickets, users, docs, chunks
- app/services: classifier, sentiment, embedding, search, rag
- app/core: config, auth, logging, metrics
- app/tasks: background ingestion, embedding index maintenance
- app/retrieval: BM25 and FAISS hybrid retrieval logic
- app/rag: context assembly + generator wrapper

API

- GET /health → {status:"ok"}
- POST /tickets/ingest {subject, body, metadata} → {ticket_id, predicted_category, priority, sentiment, confidence}
- POST /nlp/classify {text}
- POST /nlp/sentiment {text}
- POST /kb/documents (multipart PDF/text upload)
- GET /kb/search?q=... → hybrid ranked chunks
- POST /rag/answer {question, top_k} → {answer, citations:[{doc_id,chunk_id,score}]}

Auth

- Simple API key in header: x-api-key
- API key lookup in Postgres table api_keys
- Minimal roles: admin, user
- Rate limiting middleware (per API key)

Data Flow

1. Ticket ingestion → classify via local HF model → sentiment via transformer → store in Postgres.
2. Document upload → chunk (800–1200 tokens) → embed → store metadata in Postgres → index vectors in FAISS + text in BM25.
3. Query → hybrid retrieve → top-k merge (0.65 semantic + 0.35 lexical) → assemble context → pass to generator.
4. Generator → OpenAI-compatible client → response + citations.

Storage

- Postgres schema for tickets, users, documents, chunks
- FAISS index + BM25 corpus persisted under /data
- Alembic migrations included

Config (.env)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres
API_KEYS=devkey123
MODEL_DIR=.models
EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=
COMBINE_WEIGHT=0.65

Docker + Compose

- backend service: FastAPI on port 8000
- postgres service: same as UI stack
- optional prometheus service

CORS
allow_origins=[“http://localhost:8080”]

Quality

- Ruff, Black, isort, mypy strict
- pytest fixtures for DB + FAISS
- CI via GitHub Actions: lint, type, test

Deliverables

- Full backend source tree per structure above
- Dockerfile, docker-compose.yml
- README.md with setup + API examples
- OpenAPI served at /docs
- Seed script to populate sample tickets and docs
- Tests all passing via `pytest -q`

Acceptance Criteria

- `docker compose up --build` runs backend and postgres
- `GET /health` returns ok
- Upload a doc → appears in /kb/search
- POST /tickets/ingest → returns classified, prioritized, and sentiment-analyzed ticket
- POST /rag/answer → returns grounded answer with citations