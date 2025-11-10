# BetterAuth Implementation Plan

**Status:** Draft

---

## 1. Objectives & Success Criteria

- Replace the custom Express-based auth layer with BetterAuth-managed authentication while preserving existing login, sign-up, and password reset flows in the React app.
- Maintain compatibility with Postgres user data (for analytics/permissions) and ensure JWTs or session tokens are consumable by the FastAPI backend and PostgREST.
- Reduce operational burden (password policies, email delivery, MFA, auditing) by leveraging BetterAuth features.
- Success is defined by: seamless end-to-end login/signup in staging, parity for Settings and protected routes, and no regressions in AI/backend endpoints that rely on authenticated requests.

## 2. Scope Overview

- **In:** React `AuthProvider`, login/signup forms, password reset flows, token persistence, backend authentication middleware, Postgres schema alignment, email delivery configuration.
- **Out:** Authorization (role-based access) enhancements beyond mirroring existing roles, deep integration with BetterAuth analytics, production CDN setup.

## 3. High-Level Architecture Changes

1. **BetterAuth Tenant Setup**
   - Create project/tenant, configure environment variables (client ID/secret, issuer URL).
   - Enable email/password provider; evaluate magic links or OAuth as optional add-ons.
2. **Frontend Updates**
   - Replace `src/contexts/AuthContext.tsx` logic with BetterAuth SDK hooks (`useSession`, `signIn`, `signOut`).
   - Update forms (`src/pages/Login.tsx`, `SignUp.tsx`, `ForgotPassword.tsx`) to call BetterAuth endpoints instead of custom `/api/auth/*` routes.
   - Persist session via BetterAuth cookies or token storage; ensure React Query headers pull from new provider.
3. **Backend Changes**
   - Remove `backend-auth` Express server or gate it behind migration toggle.
   - In FastAPI (`app/core/auth.py`), validate BetterAuth issued tokens (configure JWKS/JWT issuer + audience).
   - Update PostgREST configuration to trust BetterAuth JWTs (`PGRST_JWT_SECRET`/`PGRST_JWT_AUD` if using JWT) or route through FastAPI proxy.
4. **Database Alignment**
   - Decide whether to keep local `users` table in Postgres as authoritative or mirror from BetterAuth via webhooks.
   - If syncing, create migration for `betterauth_users` table with mapping fields (user_id, email, role, metadata).
5. **Email/MFA**
   - Configure BetterAuth email sender (custom SMTP or BetterAuth default) so password reset and verification flows work.
   - Document MFA rollout plan (optional Phase 2).

## 4. Detailed Work Breakdown

### Phase 1 – Planning & Environment (0.5 day)

- Register BetterAuth project, capture domain, callback URLs, API keys.
- Create `.env` entries: `BETTERAUTH_CLIENT_ID`, `BETTERAUTH_CLIENT_SECRET`, `BETTERAUTH_ISSUER`, `BETTERAUTH_REDIRECT_URI`.
- Decide on session mode (cookie vs JWT) and token lifespan; document requirements for FastAPI/PostgREST.

### Phase 2 – Frontend Integration (1-2 days)

- Install BetterAuth React SDK.
- Refactor `AuthProvider` to delegate sign-in/up/reset to BetterAuth.
- Update user persistence: remove manual localStorage token writes; store session via SDK.
- Ensure ProtectedRoute checks new auth state; adjust `useAuth()` hooks accordingly.
- Validate forms and error handling with BetterAuth response schema.

### Phase 3 – Backend Authentication (1-1.5 days)

- Remove dependencies on `backend-auth` server.
- Update FastAPI token validation (JWKS fetch, caching, audience checks).
- Adjust embedding worker or scripts if they rely on older JWTs (service tokens may need to be minted via BetterAuth machine-to-machine flow).
- Update PostgREST configuration and regenerate `itsm-settings` default `authToken` usage.

### Phase 4 – Data & Roles (1 day)

- Map BetterAuth user metadata to existing `role` field; define sync strategy (webhook -> FastAPI endpoint -> Postgres update).
- Implement webhook handler (FastAPI route) for user created/updated/deleted events.
- Migrate existing users: script to import `users` table into BetterAuth tenant or prompt re-registration.

### Phase 5 – Testing & Rollout (1 day)

- Write manual test plan covering login, signup, password reset, token refresh, and AI endpoints (`/api/ai/similarity/*`).
- Update automated smoke tests (if any) or add Cypress/Playwright scenario for login flow.
- Stage deployment (if available), gather user acceptance feedback, plan cutover.

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token validation mismatch (FastAPI/PostgREST) | Auth failures across API | Configure JWKS/Audience early, add observability/logging. |
| Existing users need password resets | Support load | Pre-announce migration, provide one-time reset links or import passwords via BetterAuth API (if supported). |
| Loss of local development offline ability | Dev friction | Offer dev mode toggle: local Express auth or BetterAuth sandbox; document environment switch. |
| Embedding worker service tokens | Worker fails to fetch similarity endpoints | Mint BetterAuth machine credentials or bypass auth for internal Docker network. |

## 6. Deliverables

- Updated frontend auth context/hooks and pages.
- FastAPI/PostgREST configuration supporting BetterAuth tokens.
- Migration or archival of `backend-auth/` service.
- Documentation updates (`README.md`, `docs/SETUP_GUIDE.md`, new `docs/betterauth-migration.md`).
- Rollback plan (feature flag to revert to Express auth if issues surface).

## 7. Post-Migration Follow-up

- Evaluate enabling MFA, social logins, and usage analytics.
- Monitor BetterAuth rates/quota; plan for paid tier if required.
- Remove deprecated code paths after stabilization window (1-2 sprints).
