# Phase 2 Implementation Plan: Parent-Child Ticket Linking

**Created:** 8 November 2025  
**Goal:** Automatically link child tickets to parent tickets based on semantic similarity (>80%)

---

## Configuration

- **Linking Mode:** Automatic (threshold-based)
- **Similarity Threshold:** 0.8 (80%)
- **Vector Storage:** pgvector (PostgreSQL extension)
- **Batch Processing:** All existing servicenow_incidents
- **Model:** `sentence-transformers/all-mpnet-base-v2` (768-dim, ~420MB)

---

## Implementation Steps

### ✅ Step 1: Database Setup (pgvector + schema changes)
**Status:** ✅ **COMPLETE**  
**Actual Time:** 15 minutes

**Completed Tasks:**
- [x] Updated docker-compose.yml to use pgvector/pgvector:pg15 image
- [x] Created migration 002_add_ticket_relationships.sql
- [x] Added pgvector extension (version 0.8.1)
- [x] Added columns: parent_incident, child_incidents, similarity_score, embedding (vector768))
- [x] Added HNSW vector index for fast similarity search
- [x] Added trigger for automatic child_incidents array maintenance
- [x] Restarted Docker containers
- [x] Verified migration applied successfully

**Deliverables:**
- ✅ `docker-compose.yml` updated
- ✅ `docker/migrations/002_add_ticket_relationships.sql` created
- ✅ Database schema updated with vector support
- ✅ pgvector extension v0.8.1 installed

---

### ⏳ Step 2: Python Backend - Embedding Service
**Status:** Not Started  
**Estimated Time:** 1 hour

**Tasks:**
- [ ] Update requirements.txt (sentence-transformers, pgvector, torch)
- [ ] Create `app/services/embedding.py` - Embedding generation
- [ ] Create `app/services/similarity.py` - Similarity search
- [ ] Create `app/core/database.py` - Database connection with pgvector
- [ ] Add model loading with caching
- [ ] Test embedding generation locally

**Deliverables:**
- ML models downloaded and cached
- Embedding service functional
- Database connection with vector support

---

### ⏳ Step 3: API Endpoints
**Status:** Not Started  
**Estimated Time:** 1 hour

**Tasks:**
- [ ] Create `app/api/similarity.py` router
- [ ] Implement `POST /api/ai/find-similar-tickets`
- [ ] Implement `POST /api/ai/link-tickets` (automatic linking)
- [ ] Implement `GET /api/ai/ticket-family/{incident_number}`
- [ ] Implement `POST /api/ai/embed-tickets` (batch processing)
- [ ] Add endpoints to main.py
- [ ] Test with curl/httpx

**Deliverables:**
- 4 new API endpoints functional
- OpenAPI docs updated at /docs

---

### ⏳ Step 4: Batch Processing - Embed Existing Tickets
**Status:** Not Started  
**Estimated Time:** 30 minutes (+ model download time)

**Tasks:**
- [ ] Query all servicenow_incidents from database
- [ ] Generate embeddings for each ticket (description + short_description)
- [ ] Store embeddings in database
- [ ] For each ticket, find similar tickets (>0.8)
- [ ] Automatically link as child if similar parent found
- [ ] Log results (total processed, linked, errors)

**Deliverables:**
- All existing tickets embedded
- Parent-child relationships established
- Processing report

---

### ⏳ Step 5: Frontend Integration
**Status:** Not Started  
**Estimated Time:** 1.5 hours

**Tasks:**
- [ ] Update `src/lib/api.ts` - Add AI similarity methods
- [ ] Update `src/lib/types.ts` - Add ParentChild types
- [ ] Create `src/components/SimilarTicketsPanel.tsx`
- [ ] Update `src/components/TicketDrawer.tsx` - Show parent/children
- [ ] Update `src/components/TicketsTable.tsx` - Add parent indicator
- [ ] Test in browser

**Deliverables:**
- UI shows parent-child relationships
- Similar tickets panel functional
- Visual indicators for linked tickets

---

### ⏳ Step 6: Testing & Validation
**Status:** Not Started  
**Estimated Time:** 30 minutes

**Tasks:**
- [ ] Test with sample tickets
- [ ] Verify automatic linking works
- [ ] Check similarity scores
- [ ] Test ticket family retrieval
- [ ] Performance testing (query speed)
- [ ] Document API usage

**Deliverables:**
- All endpoints tested
- Performance metrics documented
- API examples in README

---

## Progress Summary

**Total Steps:** 6  
**Completed:** 0  
**In Progress:** 0  
**Not Started:** 6  

**Estimated Total Time:** 5 hours  
**Actual Time:** TBD

---

## Dependencies

### Python Packages
```txt
sentence-transformers==2.2.2
torch==2.1.0
psycopg2-binary==2.9.9
pgvector==0.2.3
```

### Docker Changes
- Postgres image: `postgres:15-alpine` → `pgvector/pgvector:pg15`

### Database Extensions
- pgvector (for vector similarity search)

---

## Success Criteria

- ✅ pgvector extension installed and working
- ✅ All existing tickets have embeddings
- ✅ Child tickets automatically linked to similar parents (>0.8 similarity)
- ✅ API returns similar tickets in <2 seconds
- ✅ Frontend displays parent-child relationships
- ✅ No duplicate parent linkages (one child = one parent)

---

## Next Action

**Starting Step 1:** Database Setup with pgvector

