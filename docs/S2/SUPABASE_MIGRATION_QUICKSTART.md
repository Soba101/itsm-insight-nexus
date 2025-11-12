# Supabase Migration - Quick Reference Guide

## Migration Overview

```
Current Stack                    Target Stack
═════════════                    ════════════

┌─────────────────┐             ┌─────────────────┐
│  React Frontend │             │  React Frontend │
│   (port 8080)   │             │   (port 8080)   │
└────────┬────────┘             └────────┬────────┘
         │                               │
    ┌────┴────┬────────┬────────┐       │
    ↓         ↓        ↓        ↓       ↓
┌────────┐ ┌──────┐ ┌─────┐ ┌──────┐  │
│ Auth   │ │ Post │ │ AI  │ │ LM   │  │
│ :3001  │ │ gREST│ │:8000│ │Studio│  │
│        │ │ :3000│ │     │ │:1234 │  │
└───┬────┘ └──┬───┘ └──┬──┘ └──┬───┘  │
    │         │        │       │       │
    └─────────┴────────┴───────┘       │
              ↓                         ↓
    ┌──────────────────┐     ┌──────────────────────┐
    │   Docker         │     │    Supabase          │
    │   PostgreSQL     │     │    (Managed Postgres)│
    │   + pgvector     │     │    + Auth + Realtime │
    └──────────────────┘     └──────────────────────┘
                                       ↑
                                       │
                                  ┌────┴────┐
                                  │   AI    │
                                  │ :8000   │
                                  │ + Worker│
                                  └─────────┘
```

## Timeline & Difficulty

| Phase | Duration | Difficulty | Risk | Status |
|-------|----------|------------|------|--------|
| 1. Database Schema & Data | 1-2 weeks | 🟡 Medium | 🟡 Medium | ⬜ Not Started |
| 2. Authentication System | 1 week | 🔴 High | 🔴 High | ⬜ Not Started |
| 3. API Integration | 1 week | 🟢 Low | 🟢 Low | ⬜ Not Started |
| 4. AI Backend Integration | 2 weeks | 🔴 High | 🔴 High | ⬜ Not Started |
| 5. Frontend Migration | 1 week | 🟢 Low | 🟢 Low | ⬜ Not Started |
| 6. Testing & Validation | 1 week | 🟡 Medium | 🟡 Medium | ⬜ Not Started |
| 7. Deployment & Cutover | 2-3 days | 🔴 High | 🔴 Critical | ⬜ Not Started |
| **TOTAL** | **7-9 weeks** | **🔴 High** | **🔴 High** | ⬜ **0% Complete** |

## Critical Risks

### 🔴 Critical Risks

1. **Data Loss During Migration**
   - **Impact:** Catastrophic
   - **Probability:** 5%
   - **Mitigation:** Multiple backups, validation scripts, keep Docker DB running for 1 month

2. **Authentication System Failure**
   - **Impact:** Severe (users locked out)
   - **Probability:** 15%
   - **Mitigation:** Maintain Docker auth as backup, 24/7 support, admin override

### 🟡 High Risks

3. **Vector Search Performance Degradation**
   - **Impact:** High (AI features slow)
   - **Probability:** 20%
   - **Mitigation:** Extensive benchmarking, index tuning, caching layer

4. **Embedding Worker Reliability**
   - **Impact:** Medium (embeddings delayed)
   - **Probability:** 25%
   - **Mitigation:** Dead letter queue, retry logic, monitoring alerts

5. **Connection Pool Exhaustion**
   - **Impact:** High (API unavailable)
   - **Probability:** 30%
   - **Mitigation:** Use Supabase pooler, monitor connections, circuit breaker

## Key Decisions

### ✅ What We're Keeping
- Python FastAPI AI backend (too complex for edge functions)
- LM Studio for embeddings (local control)
- Current database schema structure
- Existing UI/UX

### ❌ What We're Replacing
- Docker PostgreSQL → Supabase managed Postgres
- Custom JWT auth → Supabase Auth
- PostgREST → Supabase client SDK
- Manual user management → Supabase Auth UI

### 🤔 Optional Additions
- Real-time dashboard updates (Supabase Realtime)
- OAuth providers (Google, GitHub login)
- Edge Functions (if FastAPI proves unnecessary)
- File storage (Supabase Storage)

## Cost Comparison

```
Current (Self-Hosted)
├─ VPS/EC2: $50-100/month
├─ DevOps time: ~5hrs/week
└─ Total: ~$100/month + overhead

Supabase (Recommended: Pro Tier)
├─ Supabase Pro: $25/month
├─ Frontend hosting: $0-20/month
├─ DevOps time: ~1hr/week
└─ Total: ~$45/month

💰 Savings: ~$60/month + 80% less DevOps time
```

## Migration Phases - Detailed Breakdown

### Phase 1: Database Schema & Data (1-2 weeks)

**Tasks:**
- [ ] Create Supabase project (production tier)
- [ ] Add pgvector extension
- [ ] Migrate schema (servicenow_incidents, embedding_queue, ticket_relationships)
- [ ] Create vector indexes (ivfflat for 768-dim and 4096-dim embeddings)
- [ ] Export data from Docker PostgreSQL
- [ ] Import data to Supabase (batched for large datasets)
- [ ] Validate data integrity (row counts, embeddings, relationships)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Test vector similarity search performance

**Deliverables:**
- `supabase/migrations/20251112000000_complete_schema_migration.sql`
- Data validation report
- Performance benchmark results

### Phase 2: Authentication System (1 week)

**Tasks:**
- [ ] Create user_profiles table (synced with auth.users)
- [ ] Write user migration script (Python)
- [ ] Migrate existing users to Supabase Auth
- [ ] Send password reset emails to all users
- [ ] Update AuthContext.tsx to use Supabase Auth
- [ ] Update login/register/reset password pages
- [ ] Test all auth flows (login, logout, password reset, token refresh)
- [ ] Update Python backend JWT verification
- [ ] Maintain Docker auth as backup for 1 week

**Deliverables:**
- `backend-python/scripts/migrate_users_to_supabase.py`
- Updated `src/contexts/AuthContext.tsx`
- User migration communication emails

### Phase 3: API Integration (1 week)

**Tasks:**
- [ ] Remove PostgREST axios calls from api.ts
- [ ] Use Supabase client SDK for all queries
- [ ] Update all API methods (getKPIs, getBreakdown, etc.)
- [ ] Remove dataSource toggle from Settings page
- [ ] Test all API endpoints
- [ ] Update error handling for Supabase errors
- [ ] Remove unused dependencies (axios for PostgREST)

**Deliverables:**
- Refactored `src/lib/api.ts`
- Updated `src/pages/Settings.tsx`

### Phase 4: AI Backend Integration (2 weeks)

**Tasks:**
- [ ] Update database.py to use Supabase connection
- [ ] Configure connection pooler vs direct connection
- [ ] Test pgvector similarity search
- [ ] Update embedding_worker.py to use Supabase client
- [ ] Implement RLS bypass with service role key
- [ ] Create monitoring for queue health
- [ ] Benchmark vector search performance (Docker vs Supabase)
- [ ] Tune ivfflat index parameters if needed
- [ ] Test AI endpoints (similarity search, ticket family, duplicates)
- [ ] Implement retry logic and error handling

**Deliverables:**
- Updated `backend-python/app/core/database.py`
- Updated `backend-python/scripts/embedding_worker.py`
- Performance comparison report
- Connection testing script

### Phase 5: Frontend Migration (1 week)

**Tasks:**
- [ ] Remove Docker-specific code from frontend
- [ ] Simplify Settings page (remove apiBaseUrl, dataSource)
- [ ] Test all dashboard components
- [ ] (Optional) Add real-time subscriptions
- [ ] Update environment variables
- [ ] Test production build
- [ ] Update documentation

**Deliverables:**
- Cleaned-up frontend code
- (Optional) `src/hooks/useRealtimeTickets.ts`
- Updated documentation

### Phase 6: Testing & Validation (1 week)

**Tasks:**
- [ ] Functional testing (all features)
- [ ] Performance testing (load tests, benchmarks)
- [ ] Security audit (RLS, auth, injection)
- [ ] User Acceptance Testing (UAT with 5-10 users)
- [ ] Bug fixes
- [ ] Documentation review

**Deliverables:**
- Test report
- Performance benchmarks
- Security audit report
- UAT feedback summary
- Bug list and resolutions

### Phase 7: Deployment & Cutover (2-3 days)

**Saturday 2 AM - 8 AM Cutover Window**

```
02:00 - FREEZE: Maintenance mode
02:15 - EXPORT: Final data export
02:45 - IMPORT: Load to Supabase
04:00 - VALIDATE: Data integrity
04:30 - MIGRATE: Users & auth
05:00 - DEPLOY: Frontend + backend
05:30 - SMOKE TEST: Critical paths
06:00 - MONITOR: Watch for errors
07:00 - ANNOUNCE: Go-live
08:00 - STANDBY: Extended monitoring
```

**Rollback Plan:** 60 minutes to revert if needed

**Deliverables:**
- Deployment runbook
- Post-deployment monitoring report
- Success/failure communication

## Resource Requirements

### Team
- **Lead Developer:** Full-time, 8 weeks
- **Backend Developer:** Full-time, 6 weeks
- **Frontend Developer:** Full-time, 4 weeks
- **DevOps Engineer:** Part-time, 2 weeks
- **QA Engineer:** Part-time, 3 weeks
- **Product Owner:** Part-time, throughout

### Budget
- **Supabase Pro:** $25/month (start immediately for testing)
- **Frontend Hosting:** $0-20/month
- **Monitoring Tools:** $0-26/month (Sentry)
- **Total:** ~$45/month ongoing

### Tools
- Supabase account & CLI
- PostgreSQL client (psql/pgAdmin)
- LM Studio (unchanged)
- Node.js 18+, Python 3.11+
- Docker (for legacy system in parallel)

## Success Metrics

### Technical (Must-Have)
- [ ] ✅ Zero data loss: 100% records migrated
- [ ] ✅ Auth works: All users can login
- [ ] ✅ AI functional: Similarity search works
- [ ] ✅ Performance: p95 < 500ms
- [ ] ✅ No critical bugs

### Business
- [ ] User satisfaction ≥ 4.0/5.0
- [ ] <5% support ticket increase
- [ ] Zero unplanned downtime (first month)
- [ ] Easier developer onboarding

## Rollback Triggers

| Condition | Action | Timeline |
|-----------|--------|----------|
| <5% users affected | Fix forward | Next release |
| 5-20% users affected | Urgent patch or rollback | 4 hours |
| >20% locked out or data issue | Immediate rollback | 1 hour |
| Security breach | Emergency rollback | 30 minutes |

## Next Steps

### Immediate (This Week)
1. [ ] Review this plan with stakeholders
2. [ ] Get executive approval
3. [ ] Create Supabase account (free tier for testing)
4. [ ] Set up staging Supabase project
5. [ ] Test basic migration with sample data

### Short-Term (Next 2 Weeks)
1. [ ] Assign team members
2. [ ] Create detailed task breakdown in project management tool
3. [ ] Set up development environment
4. [ ] Begin Phase 1: Schema migration on staging

### Long-Term (2-3 Months)
1. [ ] Complete all phases
2. [ ] Production deployment
3. [ ] Monitor and optimize
4. [ ] Decommission Docker stack

## Questions & Concerns

**Q: Why not use Supabase Edge Functions instead of FastAPI?**
A: FastAPI backend handles complex ML operations (embeddings, vector search, relationship detection) that are better suited for a dedicated service with GPU access. Edge Functions have 10s timeout and limited compute.

**Q: What if Supabase performance is worse than Docker?**
A: We expect 20-80% slower queries due to network latency, but this is acceptable for the benefits. If not, we can:
- Use Supabase region closest to API
- Implement Redis caching
- Optimize queries and indexes
- Upgrade to dedicated Supabase instance

**Q: Can we rollback after 1 week?**
A: Yes, but more complex. Keep Docker database for 1 month minimum. After that, rollback requires restoring from Supabase backups.

**Q: What about compliance/data sovereignty?**
A: Supabase offers region selection (US, EU, Asia). Check your compliance requirements. For strict on-premise needs, consider self-hosted Supabase (open-source).

## References

- [Main Implementation Plan](./SUPABASE_MIGRATION_PLAN.md) (detailed, 1000+ lines)
- [Supabase Documentation](https://supabase.com/docs)
- [pgvector on Supabase](https://supabase.com/docs/guides/ai/vector-databases)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

---

**Status:** ⬜ Draft - Awaiting Approval  
**Last Updated:** November 12, 2025  
**Document Owner:** Technical Lead
