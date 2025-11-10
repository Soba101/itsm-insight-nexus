# Backend Integration Guide

Target project: Vite + React + TypeScript UI in this repo.
Existing services: `docker-compose.yml` sets up Postgres and pgAdmin.
Goal: integrate a FastAPI backend that provides ticket classification, sentiment, hybrid search, and RAG.

## 1) Backend service

Create a sibling folder at repo root: `backend/` with the FastAPI app.
Expose:

- `GET /health`
- `POST /tickets/ingest`
- `POST /nlp/classify`
- `POST /nlp/sentiment`
- `POST /kb/documents` (multipart)
- `GET /kb/search`
- `POST /rag/answer`

Enable CORS for the UI dev server:

```py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Environment variables (.env in `backend/`):

```
API_KEYS=devkey123
MODEL_DIR=.models
EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
COMBINE_WEIGHT=0.65
```

## 2) Frontend config

Add to UI `.env.local`:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_KEY=devkey123
```

Never commit secrets to `.env`. Copy keys to `.env.local` only.

## 3) API client (UI)

Create `src/lib/backend.ts`:

```ts
const BASE = import.meta.env.VITE_API_BASE_URL;
const KEY = import.meta.env.VITE_API_KEY;

function headers(extra: Record<string,string> = {}) {
  return {
    "Content-Type": "application/json",
    "x-api-key": KEY ?? "",
    ...extra,
  };
}

async function http<T>(path: string, init: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export type IngestReq = { subject: string; body: string; metadata?: Record<string,unknown> };
export type IngestResp = { ticket_id: string; predicted_category: string; priority: string; sentiment: {label:string, score:number}; confidence: number };

export const ingestTicket = (p: IngestReq) =>
  http<IngestResp>("/tickets/ingest", { method: "POST", headers: headers(), body: JSON.stringify(p) });

export type ClassifyResp = { category: string; priority: string; confidence: number };
export const classify = (text: string) =>
  http<ClassifyResp>("/nlp/classify", { method: "POST", headers: headers(), body: JSON.stringify({ text }) });

export type SentimentResp = { label: string; score: number };
export const sentiment = (text: string) =>
  http<SentimentResp>("/nlp/sentiment", { method: "POST", headers: headers(), body: JSON.stringify({ text }) });

export type KBSearchItem = { doc_id: string; chunk_id: string; text: string; score: number; source?: string };
export const kbSearch = (q: string, top_k = 10) =>
  http<KBSearchItem[]>("/kb/search?q=" + encodeURIComponent(q) + "&top_k=" + top_k, { method: "GET", headers: headers() });

export type RAGResp = { answer: string; citations: { doc_id: string; chunk_id: string; score: number }[] };
export const ragAnswer = (question: string, top_k = 8) =>
  http<RAGResp>("/rag/answer", { method: "POST", headers: headers(), body: JSON.stringify({ question, top_k }) });

export async function kbUpload(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/kb/documents`, { method: "POST", headers: { "x-api-key": KEY ?? "" }, body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return await res.json();
}
```

## 4) UI wiring

- Ticket create or edit screen: after user enters subject + description, call `ingestTicket` to show predicted category, priority, and sentiment. Let users accept or override.
- Knowledge Base page: add a file input that posts to `kbUpload`. After upload, show a toast with doc id.
- Search page: add a text input and show results from `kbSearch`.
- Assistant page: question box that calls `ragAnswer`, render `answer` plus citation chips.

Minimal example component:

```tsx
import { useState } from "react";
import { ingestTicket } from "@/lib/backend";

export function SmartIntake() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await ingestTicket({ subject, body });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {/* inputs omitted for brevity */}
      <button type="submit" disabled={loading}>Analyze</button>
      {result && (
        <div className="text-sm">
          <div>Category: {result.predicted_category}</div>
          <div>Priority: {result.priority}</div>
          <div>Sentiment: {result.sentiment.label} ({Math.round(result.sentiment.score*100)}%)</div>
        </div>
      )}
    </form>
  );
}
```

## 5) Compose

Extend your existing `docker-compose.yml` to run the backend and the UI:

```yaml
services:
  backend:
    build: ./backend
    container_name: itsm-backend
    ports: ["8000:8000"]
    env_file:
      - ./backend/.env
    volumes:
      - ./backend:/app
      - models_cache:/app/.models
      - kb_data:/app/.kb
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 3s
      retries: 5

  frontend:
    build:
      context: ./itsm-insight-nexus
      dockerfile: ./docker/Dockerfile.ui
    container_name: itsm-ui
    ports: ["8080:8080"]
    environment:
      - VITE_API_BASE_URL=http://backend:8000
      - VITE_API_KEY=${VITE_API_KEY:-devkey123}
    depends_on:
      backend:
        condition: service_healthy

  postgres:
    # keep your existing config...

  pgadmin:
    # keep your existing config...

volumes:
  models_cache:
  kb_data:
  postgres_data:
  pgadmin_data:
```

Add `docker/Dockerfile.ui` in the UI repo:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
EXPOSE 8080
CMD ["npm","run","preview","--","--host","0.0.0.0","--port","8080"]
```

## 6) Local run

```bash
# from repo root
docker compose up --build
# UI: http://localhost:8080
# Backend: http://localhost:8000
```

## 7) Security and secrets

- Move real credentials out of `.env` at repo root. Use `.env.local` and do not commit it.
- Configure the backend API key and CORS. Use HTTPS in production behind a reverse proxy.
- Rotate any exposed credentials immediately.

## 8) Optional: connect to ServiceNow or Supabase

- On ticket creation in Supabase, trigger the backend ingestion via a webhook to `/tickets/ingest`.
- To sync ServiceNow incidents, set up a poller in the backend or a ServiceNow outbound REST message to the backend.

## 9) Smoke tests

- `GET /health` returns `{status:"ok"}`
- Upload a PDF in the KB page and verify it appears in search.
- In Smart Intake, paste a ticket. You should see category, priority, and sentiment.
- Ask a question on Assistant. You get an answer and citations.
