# ITSM Insight Nexus - Season 2 Roadmap

**Document Created:** 10 November 2025  
**Season 1 Status:** ✅ Complete (AI backend, embeddings, authentication, core UI)  
**Season 2 Goal:** Production-ready enterprise ITSM analytics platform with advanced AI features

---

## 📊 Season 1 Achievements

### ✅ Core Infrastructure
- Docker-based PostgreSQL 15 + pgvector for semantic search
- PostgREST API layer (port 3000)
- Express JWT authentication backend (port 3001)
- FastAPI Python AI backend (port 8000)
- LM Studio integration for local embeddings (768-dim)
- Background embedding worker with queue system
- Vite/React SPA with shadcn/ui components

### ✅ AI/ML Capabilities
- Semantic similarity search using pgvector
- Automatic embedding generation (EmbeddingGemma-300m-qat)
- Parent-child ticket relationship detection
- Ticket family visualization with Cytoscape.js
- Batch processing scripts for embeddings and relationships

### ✅ Frontend Features
- Dashboard with KPIs, trends, breakdowns
- Ticket table with filtering, sorting, CSV export
- Ticket drawer with metadata and similar tickets
- Graph visualization for ticket relationships
- Settings page for API configuration
- Dark/light theme support
- Responsive mobile layout

### ✅ UI/UX Improvements (10/10 Priority Items)
- Interactive chart tooltips
- KPI trend indicators (30-day delta)
- Bulk ticket selection and CSV export
- Action buttons in ticket drawer (Assign, Escalate, Close)
- Improved empty states for AI panels
- MTTR intelligent formatting (m/h/d/w)
- SLA color coding (green/yellow/red)
- Bar chart value labels
- Category and assignment data verified

---

## 🎯 Season 2 Priorities

### Priority Levels
- **P0** - Blockers for production deployment
- **P1** - High value, user-requested features
- **P2** - Quality of life improvements
- **P3** - Nice-to-have enhancements

---

## Epic 1: Production Readiness (P0)

**Goal:** Make the application secure, scalable, and deployment-ready

### 1.1 Role-Based Access Control (RBAC)
**Status:** Not Started | **Complexity:** ⭐⭐⭐ Medium | **Time:** 8-12 hours

**Current State:**
- Auth backend supports roles (admin, analyst, viewer)
- Frontend ignores role in `useAuth()` context
- All authenticated users can access Settings and modify configurations
- No permission checks on sensitive operations

**Requirements:**
- Implement role checks in `AuthContext`
- Create `usePermission()` hook for granular checks
- Restrict Settings page to admin role only
- Add role indicators in user menu
- Implement row-level security in PostgREST
- Add role-based navigation menu filtering
- Audit log for admin actions

**Files to Modify:**
- `src/contexts/AuthContext.tsx` - Add role checks
- `src/hooks/usePermission.ts` - New permission hook
- `src/pages/Settings.tsx` - Add role gate
- `src/components/AppLayout.tsx` - Filter nav by role
- `backend-auth/server.js` - Role validation endpoints
- `docker/migrations/004_rbac_policies.sql` - RLS policies

**Success Criteria:**
- Non-admin users see read-only Settings
- Analysts cannot modify system configuration
- Viewers cannot perform bulk operations
- Audit trail for admin actions

---

### 1.2 Complete Ticket Action Workflows
**Status:** Partial (UI ready, backend TODOs) | **Complexity:** ⭐⭐⭐ Medium | **Time:** 6-8 hours

**Current State:**
- Assign, Escalate, Close buttons exist in TicketDrawer
- All show "Coming soon" placeholder toasts
- TODOs in code: `src/components/TicketDrawer.tsx:28,47,66`
- Bulk actions exist but incomplete

**Requirements:**
- **Assign Ticket:**
  - API: `PATCH /servicenow_incidents/:id` (update assigned_to, assignment_group)
  - UI: Dialog with user/group selector dropdown
  - Real-time update in table and drawer
  
- **Escalate Ticket:**
  - API: Update priority and add escalation note
  - UI: Escalation reason input, automatic priority bump
  - Email notification (optional)
  
- **Close Ticket:**
  - API: Update state to "Closed", resolution_code, close_notes
  - UI: Confirmation dialog with resolution dropdown and notes
  - Prevent closing if required fields missing
  
- **Bulk Operations:**
  - Complete assign/close/delete actions from `Tickets.tsx`
  - Progress indicator for batch operations
  - Success/failure summary toast

**Files to Modify:**
- `src/components/TicketDrawer.tsx` - Wire up actions
- `src/pages/Tickets.tsx` - Complete bulk handlers
- `src/lib/api.ts` - Add update/close methods
- `backend-auth/server.js` - Add ticket mutation endpoints (if not using PostgREST directly)

**Success Criteria:**
- Assign workflow updates database and UI instantly
- Escalate creates audit trail
- Close validates required fields
- Bulk actions show progress and results

---

### 1.3 Error Handling & Resilience
**Status:** Basic (200 vs error, no retry) | **Complexity:** ⭐⭐ Easy-Medium | **Time:** 4-6 hours

**Current State:**
- React Query handles basic errors
- No retry logic on transient failures
- No offline state detection
- Error messages are generic
- No global error boundary

**Requirements:**
- Add React Error Boundary for uncaught errors
- Implement intelligent retry logic in React Query
- Detect offline state and show banner
- Service-specific error messages (API vs AI backend)
- Log errors to monitoring service (optional: Sentry)
- Graceful degradation when AI backend is offline

**Files to Modify:**
- `src/App.tsx` - Add error boundary
- `src/components/ErrorBoundary.tsx` - New component
- `src/lib/api.ts` - Enhanced error handling
- `src/hooks/useOnlineStatus.ts` - New hook

**Success Criteria:**
- App doesn't crash on unexpected errors
- Users see helpful error messages
- Transient network failures auto-retry
- Offline state is communicated clearly

---

### 1.4 Performance Optimization
**Status:** Bundle size warning | **Complexity:** ⭐⭐⭐ Medium | **Time:** 6-10 hours

**Current State:**
- Single 1,469 KB bundle (449 KB gzipped)
- Vite warns: "chunk size exceeds 500kb"
- All routes loaded upfront
- Heavy libraries (Cytoscape 250kb, Recharts 200kb) always loaded

**Plan Reference:** `docs/BUNDLE_OPTIMIZATION_PLAN.md`

**Implementation:**
- **Phase 1:** Route-based code splitting with lazy loading
- **Phase 2:** Library-specific optimization (Cytoscape, Recharts isolation)
- **Phase 3:** Vite manual chunks configuration
- **Phase 4:** Icon tree-shaking and dynamic imports for modals

**Expected Result:**
- Main bundle: <500 KB
- Route chunks: 100-300 KB each
- Faster initial load time
- Better browser caching

---

### 1.5 Security Hardening
**Status:** Basic (JWT only) | **Complexity:** ⭐⭐⭐ Medium | **Time:** 4-6 hours

**Requirements:**
- Input sanitization on all forms
- SQL injection protection (verify PostgREST + prepared statements)
- XSS protection (verify React escaping)
- CSRF tokens for state-changing operations
- Rate limiting on auth endpoints
- Helmet.js security headers (Express backend)
- Secure cookie configuration
- Environment variable validation on startup

**Files to Modify:**
- `backend-auth/server.js` - Add helmet, rate limiting
- `src/lib/api.ts` - CSRF token handling
- `.env.production.example` - Security-focused template

---

## Epic 2: Advanced AI Features (P1)

**Goal:** Deliver intelligent analytics that provide actionable insights

### 2.1 NLP Topic Extraction
**Status:** UI stub ("Coming soon") | **Complexity:** ⭐⭐⭐⭐ Medium-Hard | **Time:** 10-15 hours

**Current State:**
- `TopicsPanel.tsx` shows placeholder
- No backend implementation
- No topic model trained

**Requirements:**
- **Backend:**
  - Implement LDA or BERTopic for topic modeling
  - Extract keywords from ticket descriptions
  - Cluster tickets by topic
  - API: `POST /api/ai/topics/extract` (batch), `GET /api/ai/topics` (results)
  
- **Frontend:**
  - Topic cloud visualization (word size = frequency)
  - Click topic → filter tickets by that topic
  - Topic trends over time (line chart)
  - "View All Tickets" for each topic

**Files to Create/Modify:**
- `backend-python/app/services/topic_extraction.py` - New service
- `backend-python/app/api/topics.py` - New router
- `src/components/TopicsPanel.tsx` - Wire to real API
- `src/pages/Insights.tsx` - Add filter integration

**Dependencies:**
- Python: `scikit-learn` or `bertopic`, `spacy`
- Consider: Cache results, recompute on schedule

**Success Criteria:**
- Identifies 8-12 common topics across tickets
- Topics are human-readable (not "topic_1", "topic_2")
- Clicking topic filters ticket table
- Updates weekly or on-demand

---

### 2.2 Duplicate Detection (Beyond Similarity)
**Status:** UI stub, similarity exists | **Complexity:** ⭐⭐⭐ Medium | **Time:** 6-8 hours

**Current State:**
- Parent-child linking based on similarity threshold
- `DuplicatesPanel.tsx` shows placeholder
- No UI for reviewing potential duplicates

**Requirements:**
- **Backend:**
  - Endpoint to find all ticket clusters (similarity ≥ 0.85)
  - Return: cluster ID, tickets in cluster, average similarity
  - Suggest merge actions
  
- **Frontend:**
  - Show duplicate clusters as cards
  - Each card lists: tickets, similarity scores, actions
  - "Review" → opens side-by-side comparison modal
  - "Merge" → mark as duplicates, link to parent
  - "Dismiss" → remember decision, don't show again

**Files to Create/Modify:**
- `backend-python/app/api/duplicates.py` - New endpoint
- `src/components/DuplicatesPanel.tsx` - Wire to API
- `src/components/DuplicateReviewModal.tsx` - New modal
- `docker/migrations/005_duplicate_decisions.sql` - Track dismissed clusters

**Success Criteria:**
- Identifies 5-10 duplicate clusters in demo data
- Merge action updates database
- Dismissed clusters don't reappear

---

### 2.3 Sentiment Analysis
**Status:** Not Started | **Complexity:** ⭐⭐⭐⭐ Hard | **Time:** 12-16 hours

**Requirements:**
- Analyze caller tone in ticket descriptions (positive, neutral, negative, urgent)
- Display sentiment icon/badge in ticket table and drawer
- Filter by sentiment in ticket page
- Alert dashboard when high volume of negative sentiment detected
- Sentiment trend over time (line chart)

**Implementation:**
- Use: Hugging Face sentiment model (distilbert-base-uncased-finetuned-sst-2)
- Store: `sentiment_score` (0-1) and `sentiment_label` in DB
- Generate: On embedding creation (same pipeline)

**New Columns:**
```sql
ALTER TABLE servicenow_incidents
ADD COLUMN sentiment_score NUMERIC(3,2),
ADD COLUMN sentiment_label VARCHAR(20),
ADD COLUMN sentiment_analyzed_at TIMESTAMP;
```

---

### 2.4 Ticket Classification & Auto-tagging
**Status:** Not Started | **Complexity:** ⭐⭐⭐⭐ Hard | **Time:** 15-20 hours

**Requirements:**
- Automatically classify tickets by category if missing
- Suggest priority based on description keywords
- Auto-tag tickets with relevant labels (network, security, access, etc.)
- Confidence scores for suggestions
- Admin can approve/reject suggestions to improve model

**Approach:**
- Train classifier on existing labeled data (category, priority)
- Use BERT or zero-shot classification
- Active learning: improve from corrections

---

## Epic 3: Enhanced User Experience (P1-P2)

### 3.1 Pagination & Filtering Improvements
**Status:** Basic | **Complexity:** ⭐⭐ Easy-Medium | **Time:** 4-6 hours

**Current Issues:**
- Pagination always shows pages 1-5
- No "total count" displayed
- No per-page size selector
- Can't jump to last page
- Filters reset on page navigation

**Requirements:**
- Show total count: "Showing 1-20 of 1,247 tickets"
- Per-page selector: 10, 25, 50, 100
- Jump to page input
- Better page number display (current, ±2, first, last)
- Persist filters in URL query params
- "Clear all filters" button

**Files to Modify:**
- `src/pages/Tickets.tsx` - Enhanced pagination logic
- `src/components/FilterBar.tsx` - URL sync

---

### 3.2 Advanced Search
**Status:** Basic text search only | **Complexity:** ⭐⭐⭐ Medium | **Time:** 6-8 hours

**Requirements:**
- **Semantic Search:**
  - "Find tickets like this one" button in drawer
  - Natural language queries: "network issues last week"
  - Uses AI backend similarity endpoint
  
- **Search Syntax:**
  - Field-specific: `priority:1`, `assigned:john@company.com`
  - Boolean: `network AND outage NOT resolved`
  - Date ranges: `opened:last-7-days`
  
- **Search History:**
  - Save last 10 searches
  - Quick access dropdown
  
- **Saved Searches:**
  - Name and save filter combinations
  - Share with team members

**Files to Create/Modify:**
- `src/components/SearchBar.tsx` - New advanced search UI
- `src/lib/searchParser.ts` - Parse search syntax
- `backend-python/app/api/search.py` - Semantic search endpoint

---

### 3.3 Ticket Activity Timeline
**Status:** Not Started | **Complexity:** ⭐⭐ Easy-Medium | **Time:** 4-6 hours

**Requirements:**
- Show timeline in TicketDrawer:
  - Created → Assigned → In Progress → Resolved → Closed
  - Work notes and comments
  - Status changes with timestamps
  - Who performed each action
  
- Activity types:
  - Status changes
  - Assignments
  - Priority changes
  - Comments
  - Attachments (future)

**Database:**
- Create `ticket_activity` table
- Trigger to log all changes to servicenow_incidents

---

### 3.4 Dashboard Customization
**Status:** Fixed layout | **Complexity:** ⭐⭐⭐ Medium | **Time:** 8-12 hours

**Requirements:**
- Drag-and-drop widget reordering
- Show/hide widgets
- Widget size adjustment
- Save layout per user
- Dashboard templates: "Manager View", "Analyst View", "Executive View"
- Export dashboard as PDF/image

**Implementation:**
- Use: react-grid-layout
- Store: `dashboard_layouts` table with user preferences

---

## Epic 4: Reporting & Export (P2)

### 4.1 Advanced Reports
**Status:** CSV export only | **Complexity:** ⭐⭐⭐ Medium | **Time:** 10-12 hours

**Requirements:**
- **Built-in Reports:**
  - SLA compliance by service
  - MTTR by category
  - Ticket volume trends
  - Agent performance
  - Customer satisfaction (if data available)
  
- **Custom Report Builder:**
  - Select: fields, filters, grouping
  - Visualizations: table, bar, line, pie
  - Schedule: daily, weekly, monthly email
  
- **Export Formats:**
  - PDF (with charts)
  - Excel (formatted)
  - CSV (raw data)
  - JSON (API integration)

---

### 4.2 Scheduled Exports & Emails
**Status:** Not Started | **Complexity:** ⭐⭐⭐⭐ Hard | **Time:** 12-16 hours

**Requirements:**
- Schedule dashboard snapshots
- Email reports to stakeholders
- Alert rules: "Email me when >50 P1 tickets open"
- Webhook integrations (Slack, Teams)

**Tech Stack:**
- Python: APScheduler or Celery
- Email: SendGrid or AWS SES
- Queue: Redis for job scheduling

---

## Epic 5: Integration & Extensibility (P2-P3)

### 5.1 ServiceNow Live Sync
**Status:** One-time import | **Complexity:** ⭐⭐⭐⭐ Hard | **Time:** 15-20 hours

**Requirements:**
- Real-time webhook receiver from ServiceNow
- Incremental updates (only changed tickets)
- Bidirectional sync (write back to ServiceNow)
- Conflict resolution strategy
- Sync status dashboard

**Files to Create:**
- `backend-python/app/api/webhooks.py` - Webhook receiver
- `scripts/sync_servicenow.py` - Scheduled sync job

---

### 5.2 Third-Party Integrations
**Status:** Not Started | **Complexity:** ⭐⭐⭐ Medium | **Time:** Variable

**Candidates:**
- **Slack:** Post ticket updates to channels
- **Microsoft Teams:** Notification bot
- **PagerDuty:** Escalation integration
- **Jira:** Sync with dev tickets
- **Confluence:** KB article suggestions

---

## Epic 6: Testing & Documentation (P2)

### 6.1 Automated Testing
**Status:** None | **Complexity:** ⭐⭐⭐⭐ Hard | **Time:** 20-30 hours

**Requirements:**
- **Frontend:**
  - Unit tests: Components with Vitest
  - Integration tests: User flows with Testing Library
  - E2E tests: Critical paths with Playwright
  
- **Backend:**
  - Python: pytest for API endpoints
  - Node: Jest for auth backend
  - Load testing: Locust or k6

**Coverage Goal:** 70%+ for critical paths

---

### 6.2 API Documentation
**Status:** FastAPI auto-docs only | **Complexity:** ⭐⭐ Easy | **Time:** 4-6 hours

**Requirements:**
- OpenAPI spec for all backends
- Postman collection
- Example requests/responses
- Authentication guide
- Webhook documentation
- SDK generation (optional)

---

## Epic 7: Deployment & DevOps (P1)

### 7.1 Production Deployment
**Status:** Docker Compose dev only | **Complexity:** ⭐⭐⭐⭐ Hard | **Time:** 12-20 hours

**Options:**

**Option A: Cloud VM (AWS EC2, Azure VM)**
- Docker Compose + Nginx reverse proxy
- Systemd for service management
- Let's Encrypt SSL
- Backups to S3

**Option B: Container Orchestration (Kubernetes, ECS)**
- Helm charts
- Auto-scaling
- Load balancing
- Managed database (RDS)

**Option C: Serverless (Vercel + Supabase + Cloud Functions)**
- Frontend: Vercel
- Backend: Cloud Run (Python), Cloud Functions (Node)
- Database: Supabase Cloud

**Requirements:**
- SSL/TLS certificates
- Environment variable management
- Database backups (daily)
- Monitoring and logs
- CDN for static assets
- CI/CD pipeline

---

### 7.2 Monitoring & Observability
**Status:** None | **Complexity:** ⭐⭐⭐ Medium | **Time:** 8-12 hours

**Requirements:**
- **Application Monitoring:**
  - Uptime checks (all services)
  - API response times
  - Error rates
  - Database query performance
  
- **Infrastructure Monitoring:**
  - CPU, memory, disk usage
  - Docker container health
  - Network bandwidth
  
- **Logging:**
  - Centralized logs (ELK, Loki)
  - Log levels properly configured
  - Structured logging (JSON)
  
- **Alerting:**
  - Email/SMS on critical errors
  - Slack/Teams notifications
  - PagerDuty for on-call

**Tools:**
- Prometheus + Grafana
- CloudWatch (AWS)
- Datadog or New Relic (managed)

---

## Epic 8: Mobile & Accessibility (P3)

### 8.1 Progressive Web App (PWA)
**Status:** Not Started | **Complexity:** ⭐⭐ Easy-Medium | **Time:** 4-6 hours

**Requirements:**
- Service worker for offline support
- Install as native app (iOS, Android)
- Push notifications for ticket updates
- Offline queue for actions (sync when online)

---

### 8.2 Accessibility (WCAG 2.1 AA)
**Status:** Partial (shadcn has some) | **Complexity:** ⭐⭐⭐ Medium | **Time:** 10-15 hours

**Requirements:**
- Keyboard navigation for all actions
- Screen reader tested (NVDA, JAWS)
- ARIA labels on all interactive elements
- Color contrast ratios meet AA standard
- Focus indicators visible
- Skip links for main content
- Forms have proper labels and error messages
- Alt text for all images/icons

**Audit Tools:**
- axe DevTools
- Lighthouse accessibility score >90

---

## Priority Implementation Order

### Phase 1: Production MVP (8-10 weeks)
1. ✅ RBAC (1.1)
2. ✅ Complete ticket actions (1.2)
3. ✅ Error handling (1.3)
4. ✅ Performance optimization (1.4)
5. ✅ Security hardening (1.5)
6. ✅ Pagination improvements (3.1)
7. ✅ Production deployment (7.1)

### Phase 2: AI Enhancement (6-8 weeks)
8. NLP Topic extraction (2.1)
9. Duplicate detection UI (2.2)
10. Sentiment analysis (2.3)
11. Advanced search (3.2)
12. Monitoring setup (7.2)

### Phase 3: Enterprise Features (8-10 weeks)
13. Dashboard customization (3.4)
14. Advanced reports (4.1)
15. Ticket timeline (3.3)
16. Scheduled exports (4.2)
17. Testing suite (6.1)

### Phase 4: Integration & Scale (6-8 weeks)
18. ServiceNow live sync (5.1)
19. Third-party integrations (5.2)
20. PWA (8.1)
21. Accessibility improvements (8.2)

---

## Success Metrics

### Technical
- ✅ Bundle size <500 KB (main chunk)
- ✅ Lighthouse score >90 (performance, accessibility)
- ✅ <2s initial page load
- ✅ <500ms API response time (p95)
- ✅ 99.9% uptime
- ✅ Zero critical security vulnerabilities

### User Experience
- ✅ <3 clicks to complete common tasks
- ✅ Zero data loss events
- ✅ <1% error rate on actions
- ✅ Users can complete workflows without training

### AI/ML
- ✅ >80% accuracy on topic extraction
- ✅ >90% duplicate detection precision
- ✅ <3s similarity search response time
- ✅ Sentiment analysis correlates with ticket priority

---

## Dependencies & Risks

### Technical Dependencies
- LM Studio availability (local model)
- Supabase for auth (or migrate to self-hosted)
- Docker infrastructure
- Python ML libraries (torch, transformers)

### Risks
- **High:** LM Studio local model may not scale (consider cloud embeddings API)
- **Medium:** Large bundle size impacts mobile users
- **Medium:** No test coverage increases regression risk
- **Low:** ServiceNow API changes breaking sync

### Mitigation
- Evaluate cloud embedding APIs (OpenAI, Cohere) as LM Studio alternative
- Implement bundle optimization before adding more features
- Add tests incrementally starting with critical paths
- Version lock ServiceNow API, monitor changelog

---

## Resources & Team

### Recommended Team (Full-time)
- 1x Full-stack developer (React + Python)
- 1x Backend developer (Python/FastAPI + ML)
- 0.5x DevOps engineer
- 0.5x UX designer
- 0.25x QA engineer

### Timeline
- **Phase 1 (MVP):** 2-3 months
- **Phase 2 (AI):** 2 months
- **Phase 3 (Enterprise):** 2-3 months
- **Phase 4 (Integration):** 2 months

**Total:** 8-10 months to feature-complete enterprise platform

---

## Conclusion

Season 1 delivered a solid foundation with core features, AI-powered similarity search, and a modern UI. Season 2 focuses on:

1. **Production Readiness** - Security, performance, error handling
2. **Advanced AI** - Topic extraction, sentiment, better duplicate detection
3. **Enterprise UX** - Customization, reporting, advanced workflows
4. **Integration** - Live sync, third-party tools, webhooks
5. **Scale & Quality** - Testing, monitoring, deployment automation

The roadmap is ambitious but achievable with the right team and prioritization. Focus on Phase 1 for production launch, then iterate based on user feedback.

**Next Action:** Start Epic 1.1 (RBAC) - most critical for secure production deployment.
