# Implementation Plan: Topics, Duplicates & Graph Features

## Overview

This document outlines the implementation plan to enable Topics Panel (NLP analysis), Duplicates Panel (similarity detection), and Graph Viewer (relationship mapping) using the Docker Postgres database.

## Current State

### ✅ Working Features

- Tickets listing (all 10 tickets from Docker Postgres)
- KPIs (calculated from ticket data)
- Trend charts (ticket creation over time)
- Breakdown charts (priority, category, assignment group)

### ⚠️ Not Yet Implemented

- **Topics Panel** - Returns empty array `[]`
- **Duplicates Panel** - Returns empty array `[]`
- **Graph Viewer** - Returns empty graph `{ nodes: [], edges: [] }`

## Architecture Options

### Option A: Python Backend API (Recommended)

**Pros:**

- Full control over ML/NLP processing
- Can use established libraries (scikit-learn, spaCy, NetworkX)
- Easy to add new features
- RESTful API integrates seamlessly with existing PostgREST

**Cons:**

- Requires additional service in Docker
- More complex deployment

**Tech Stack:**

- FastAPI or Flask
- scikit-learn (TF-IDF, clustering)
- spaCy (NLP)
- NetworkX (graph analysis)

### Option B: PostgreSQL Functions + PostgREST

**Pros:**

- No additional services needed
- Leverages existing PostgreSQL extensions
- PostgREST automatically exposes functions

**Cons:**

- Limited ML capabilities
- Complex SQL for advanced analysis
- Harder to maintain

**Tech Stack:**

- PostgreSQL with pg_trgm extension (similarity)
- Custom PL/pgSQL functions
- PostgREST RPC calls

### Option C: Pre-computed Results in Database

**Pros:**

- Fastest query performance
- Simple to implement initially
- Good for demos/testing

**Cons:**

- Requires background jobs to update
- Not real-time
- More database storage

**Tech Stack:**

- New tables: `nlp_topics`, `duplicate_clusters`, `ticket_relationships`
- Scheduled jobs (cron or task queue)
- Same API endpoints, different data source

---

## Recommended Approach: Option A + C Hybrid

**Phase 1: Pre-computed Results (Quick Win)**

- Add database tables for pre-computed results
- Populate with sample/initial data
- Update API to query these tables
- Timeline: 1-2 hours

**Phase 2: Python Backend Service**

- Build FastAPI service for ML processing
- Implement actual NLP and similarity algorithms
- Add background jobs to populate tables
- Timeline: 4-8 hours

---

## Phase 1: Database Schema & Sample Data

### 1.1 Create Database Tables

```sql
-- Topics table (NLP analysis results)
CREATE TABLE public.nlp_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  keywords TEXT[],
  count INTEGER NOT NULL,
  sample_ticket_ids TEXT[],
  confidence NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Duplicate clusters table
CREATE TABLE public.duplicate_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id TEXT NOT NULL UNIQUE,
  ticket_ids TEXT[] NOT NULL,
  similarity_score NUMERIC(3,2),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ticket relationships table (for graph)
CREATE TABLE public.ticket_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_ticket_id TEXT NOT NULL,
  target_ticket_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('duplicate', 'related', 'parent', 'child', 'blocks')),
  weight NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_ticket_id, target_ticket_id, relationship_type)
);

-- Indexes
CREATE INDEX idx_nlp_topics_count ON public.nlp_topics(count DESC);
CREATE INDEX idx_duplicate_clusters_cluster_id ON public.duplicate_clusters(cluster_id);
CREATE INDEX idx_ticket_relationships_source ON public.ticket_relationships(source_ticket_id);
CREATE INDEX idx_ticket_relationships_target ON public.ticket_relationships(target_ticket_id);
```

### 1.2 Populate Sample Data

```sql
-- Sample NLP Topics (based on existing tickets)
INSERT INTO public.nlp_topics (topic, keywords, count, sample_ticket_ids, confidence)
VALUES
  ('Email Issues', ARRAY['email', 'spam', 'filter', 'message'], 3, ARRAY['INC001', 'INC007'], 0.85),
  ('Network Problems', ARRAY['network', 'vpn', 'connection', 'slow'], 2, ARRAY['INC002', 'INC005'], 0.92),
  ('Database Performance', ARRAY['database', 'cpu', 'timeout', 'slow'], 2, ARRAY['PRB001', 'INC008'], 0.88),
  ('Authentication', ARRAY['login', 'authentication', 'access', 'password'], 1, ARRAY['INC004'], 0.79),
  ('Application Performance', ARRAY['application', 'crm', 'slow', 'response'], 1, ARRAY['INC006'], 0.81);

-- Sample Duplicate Clusters
INSERT INTO public.duplicate_clusters (cluster_id, ticket_ids, similarity_score, reason)
VALUES
  ('CLUSTER-001', ARRAY['INC001', 'INC007'], 0.75, 'Both relate to email service issues'),
  ('CLUSTER-002', ARRAY['INC002', 'INC005'], 0.68, 'Both involve network connectivity problems'),
  ('CLUSTER-003', ARRAY['PRB001', 'INC008'], 0.82, 'Both are database performance issues');

-- Sample Ticket Relationships (for graph)
INSERT INTO public.ticket_relationships (source_ticket_id, target_ticket_id, relationship_type, weight)
VALUES
  ('INC001', 'INC007', 'related', 0.75),
  ('INC007', 'INC001', 'related', 0.75),
  ('INC002', 'INC005', 'duplicate', 0.68),
  ('INC005', 'INC002', 'duplicate', 0.68),
  ('PRB001', 'INC008', 'related', 0.82),
  ('INC008', 'PRB001', 'parent', 0.90),
  ('INC004', 'INC006', 'related', 0.45),
  ('CHG001', 'INC003', 'related', 0.60);
```

### 1.3 Update API Implementation

**File: `src/lib/api.ts`**

Replace current empty implementations with database queries:

```typescript
async getTopics(filters: Filters): Promise<NLPTopic[]> {
  const settings = getSettings();

  if (settings.dataSource === "supabase") {
    const { data, error } = await supabase
      .from("nlp_topics")
      .select("*")
      .order("count", { ascending: false })
      .limit(5);

    if (error) throw error;
    return (data || []) as NLPTopic[];
  }

  // Docker/PostgREST mode
  const instance = createAxiosInstance();
  const response = await instance.get("/nlp_topics", {
    params: {
      order: "count.desc",
      limit: 5,
    },
  });

  return response.data;
},

async getDuplicates(filters: Filters): Promise<DuplicateCluster[]> {
  const settings = getSettings();

  if (settings.dataSource === "supabase") {
    const { data, error } = await supabase
      .from("duplicate_clusters")
      .select("*")
      .order("similarity_score", { ascending: false });

    if (error) throw error;
    return (data || []) as DuplicateCluster[];
  }

  // Docker/PostgREST mode
  const instance = createAxiosInstance();
  const response = await instance.get("/duplicate_clusters", {
    params: {
      order: "similarity_score.desc",
    },
  });

  return response.data;
},

async getGraphLinks(ticketId: string): Promise<GraphData> {
  const settings = getSettings();

  if (settings.dataSource === "supabase") {
    // Get all relationships for this ticket
    const { data: relationships, error } = await supabase
      .from("ticket_relationships")
      .select("*")
      .or(`source_ticket_id.eq.${ticketId},target_ticket_id.eq.${ticketId}`);

    if (error) throw error;

    // Get all related tickets
    const ticketIds = new Set<string>();
    ticketIds.add(ticketId);
    relationships?.forEach(rel => {
      ticketIds.add(rel.source_ticket_id);
      ticketIds.add(rel.target_ticket_id);
    });

    const { data: tickets } = await supabase
      .from("tickets")
      .select("ticket_id, short_desc, priority, status")
      .in("ticket_id", Array.from(ticketIds));

    // Build graph structure
    const nodes = tickets?.map(t => ({
      id: t.ticket_id,
      label: t.ticket_id,
      title: t.short_desc,
      group: t.priority,
    })) || [];

    const edges = relationships?.map(rel => ({
      from: rel.source_ticket_id,
      to: rel.target_ticket_id,
      label: rel.relationship_type,
      weight: rel.weight,
    })) || [];

    return { nodes, edges };
  }

  // Docker/PostgREST mode
  const instance = createAxiosInstance();

  // Get relationships
  const relResponse = await instance.get("/ticket_relationships", {
    params: {
      or: `(source_ticket_id.eq.${ticketId},target_ticket_id.eq.${ticketId})`,
    },
  });

  // Get ticket IDs
  const ticketIds = new Set<string>();
  ticketIds.add(ticketId);
  relResponse.data.forEach((rel: any) => {
    ticketIds.add(rel.source_ticket_id);
    ticketIds.add(rel.target_ticket_id);
  });

  // Get tickets
  const ticketsResponse = await instance.get("/tickets", {
    params: {
      ticket_id: `in.(${Array.from(ticketIds).join(',')})`,
      select: "ticket_id,short_desc,priority,status",
    },
  });

  // Build graph
  const nodes = ticketsResponse.data.map((t: any) => ({
    id: t.ticket_id,
    label: t.ticket_id,
    title: t.short_desc,
    group: t.priority,
  }));

  const edges = relResponse.data.map((rel: any) => ({
    from: rel.source_ticket_id,
    to: rel.target_ticket_id,
    label: rel.relationship_type,
    weight: rel.weight,
  }));

  return { nodes, edges };
},
```

---

## Phase 2: Python ML Service (Optional, Future)

### 2.1 Service Architecture

```
docker-compose.yml additions:
  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_URL=postgresql://postgres:postgres@postgres:5432/itsm_db
    depends_on:
      - postgres
```

### 2.2 FastAPI Endpoints

```python
# ml-service/main.py

@app.post("/analyze/topics")
async def analyze_topics():
    """Run NLP analysis on all tickets and update topics table"""
    # TF-IDF vectorization
    # Topic modeling (LDA or NMF)
    # Update nlp_topics table
    pass

@app.post("/analyze/duplicates")
async def find_duplicates():
    """Find similar tickets using cosine similarity"""
    # TF-IDF vectorization
    # Calculate pairwise similarity
    # Cluster similar tickets
    # Update duplicate_clusters table
    pass

@app.post("/analyze/relationships")
async def build_relationships():
    """Build ticket relationship graph"""
    # Analyze parent_id, related_ticket_id fields
    # Find semantic relationships
    # Update ticket_relationships table
    pass
```

### 2.3 Background Jobs

```python
# Run analysis periodically
@app.on_event("startup")
@repeat_every(seconds=3600)  # Every hour
async def scheduled_analysis():
    await analyze_topics()
    await find_duplicates()
    await build_relationships()
```

---

## Implementation Steps

### Step 1: Add Schema (15 min)

1. Create `docker/add_nlp_tables.sql`
2. Run: `docker exec -i itsm-postgres psql -U postgres -d itsm_db < docker/add_nlp_tables.sql`

### Step 2: Add Sample Data (10 min)

1. Create `docker/populate_nlp_data.sql`
2. Run: `docker exec -i itsm-postgres psql -U postgres -d itsm_db < docker/populate_nlp_data.sql`

### Step 3: Update API (30 min)

1. Update `src/lib/api.ts` - implement `getTopics()`, `getDuplicates()`, `getGraphLinks()`
2. Test with PostgREST: `curl http://localhost:3000/nlp_topics`

### Step 4: Verify in UI (5 min)

1. Restart dev server
2. Check Dashboard - Topics and Duplicates panels should show data
3. Test Graph Viewer with ticket IDs: INC001, INC002, etc.

### Step 5: (Optional) Python ML Service (4-8 hours)

1. Create `ml-service/` directory
2. Implement FastAPI endpoints
3. Add to docker-compose.yml
4. Test background jobs

---

## Testing Plan

### Manual Testing

1. **Topics Panel**
   - Should show 5 topics
   - Click on topic to see sample tickets

2. **Duplicates Panel**
   - Should show 3 clusters
   - Display similarity scores
   - Show ticket IDs in each cluster

3. **Graph Viewer**
   - Enter "INC001" - should show relationships
   - Enter "INC008" - should show parent PRB001
   - Verify nodes are clickable

### API Testing

```bash
# Test topics endpoint
curl http://localhost:3000/nlp_topics

# Test duplicates endpoint
curl http://localhost:3000/duplicate_clusters

# Test relationships endpoint
curl "http://localhost:3000/ticket_relationships?source_ticket_id=eq.INC001"
```

---

## Timeline Estimate

- **Phase 1 (Database + Basic Implementation)**: 1-2 hours
  - Schema creation: 15 min
  - Sample data: 10 min
  - API updates: 30-45 min
  - Testing: 15 min

- **Phase 2 (Python ML Service)**: 4-8 hours (optional)
  - FastAPI setup: 1 hour
  - NLP implementation: 2-3 hours
  - Similarity detection: 1-2 hours
  - Graph analysis: 1-2 hours
  - Integration & testing: 1 hour

---

## Success Criteria

✅ Topics Panel displays real topics from database
✅ Duplicates Panel shows potential duplicate tickets
✅ Graph Viewer renders relationship network
✅ All features work with both Supabase and Docker data sources
✅ PostgREST automatically exposes new tables
✅ No mock data remaining in codebase

---

## Future Enhancements

1. **Real-time Analysis**: Trigger ML jobs on ticket creation/update
2. **Advanced NLP**: Use transformers (BERT) for better topic extraction
3. **Similarity Threshold**: User-configurable sensitivity
4. **Graph Filters**: Filter by relationship type, priority
5. **Export Features**: Download topics, clusters, graph data
6. **Metrics Dashboard**: Show analysis quality metrics

---

## Next Steps

Ready to proceed? I recommend starting with **Phase 1** to get immediate results:

1. Run: `Create docker/add_nlp_tables.sql` - I'll generate the schema
2. Run: `Create docker/populate_nlp_data.sql` - I'll generate sample data
3. Update: `src/lib/api.ts` - I'll implement the API calls
4. Test in browser

Would you like me to generate these files now?
