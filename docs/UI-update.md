# UI Update Implementation Plan

## Objective

Enhance user confidence, accessibility, and productivity across core ITSM Insight Nexus surfaces by addressing the prioritized UI/UX gaps documented in `docs/UI-findings.md`.

## Guiding Principles

- Preserve existing authentication and data flows while uplifting presentation and feedback.
- Maintain parity between Docker/PostgREST and Supabase data paths.
- Favor incremental, testable changes with measurable UX outcomes (page load, error recovery time, task completion cues).

## Workstreams & Tasks

### 1. Authentication Refinement

- **A1. Brand Header**: Add lightweight product header band (logo/wordmark) inside login/signup/forgot password cards; extend theme tokens for brand accent.
- **A2. Inline Validation**: Implement per-field error states with helper text, red borders, and `aria-live` feedback; ensure focus lands on error banner via refs.
- **A3. Password Usability**: Add visibility toggle, caps-lock detection, and requirements hint; reuse in signup page.
- **A4. Accessibility Sweep**: Mark decorative icons `aria-hidden="true"`, add `role="alert"` to status banners, ensure success states include text cues beyond color.
- **A5. Trust Signals**: Introduce optional SSO placeholders or security badges; link to enterprise onboarding docs.

### 2. App Shell & Navigation

- **S1. Navigation Expansion**: Update sidebar config to include Insights and Graph routes (with beta badge option); ensure icons present.
- **S2. Command Surface**: Prototype global search or command palette entry point; hook into existing ticket filter logic where possible.
- **S3. Status Indicators**: Add API/AI backend connection chips near header utilities, reading from existing health-check endpoints.

### 3. Dashboard Prioritization

- **D1. Attention Strip**: Create alert row summarizing SLA breaches or anomalies before KPI grid.
- **D2. Filter Persistence**: Persist dashboard filters to URL/localStorage and render active filter chips with clear-all control.
- **D3. Graph Query UX**: Wrap ticket ID input with validation messaging, example chips, and explicit empty/error states.
- **D4. AI Panel States**: Visually differentiate “Coming soon”/empty data with lab styling and explanatory copy.

### 4. Tickets Workflow Enhancements

- **T1. Bulk Action Toolbar**: Expose sticky toolbar once rows selected; wire assign/close/export to appropriate handlers with confirmation modals.
- **T2. Pagination Upgrade**: Display total counts, page size selector, and quick-jump; coordinate with backend query params.
- **T3. Drawer Actions**: Replace placeholder toasts with API integrations, optimistic updates, and audit trail hooks.
- **T4. Accessibility Labels**: Add SR-friendly text for priority/status badges and selection checkboxes.
- **T5. Empty State**: Provide actionable empty state with clear filters button and ETL guidance.

### 5. Insights Activation

- **I1. Filter Controls**: Reuse `FilterBar` subset for timeframe/service scoping.
- **I2. Productive CTAs**: Replace disabled buttons with documentation links and enablement guidance.
- **I3. Action Hooks**: Add follow-up actions per topic/cluster (open ticket list, export summary).

### 6. Graph Experience

- **G1. Guidance Panel**: Surface recent/recommended ticket IDs and instructions alongside search form.
- **G2. Robust States**: Implement explicit empty/error messaging with retry.
- **G3. Interaction Toolkit**: Add legend, zoom-to-fit control, and node click to open ticket drawer.

### 7. Settings Hardening

- **SE1. Role Guard**: Enforce admin-only access and disable inputs for non-admins.
- **SE2. Field Validation**: Validate URLs/tokens client-side before enabling save; highlight unsaved changes per card.
- **SE3. Scoped Actions**: Split save/test controls per settings card; add diagnostic panel for AI backend failures.

### 8. Global Accessibility & Visual Polish

- **GLO1. Elevation & Spacing**: Update card shadows, spacing scale, and button contrast to reinforce hierarchy.
- **GLO2. Theming Tokens**: Define brand accent colors in Tailwind config and apply consistently across CTAs.
- **GLO3. QA Checklist**: Draft automated/manual accessibility checklist (axe + screen-reader smoke test).

## Dependencies

- Brand assets or interim wordmark from design team.
- Confirmation of API endpoints for health checks and ticket mutations.
- Role metadata surface from Auth provider (e.g., extend `auth-user`).
- Product decision on SSO provider roadmap (placeholder messaging until available).

## Risk Mitigation

- Release workstreams behind feature flags or environment toggles where feasible.
- Coordinate with backend team for bulk action APIs to avoid blocking UI release.
- Schedule accessibility review before merging cross-cutting visual changes.

## Acceptance Criteria

- Lighthouse accessibility score ≥ 95 on login and dashboard.
- Error states announced via screen readers during user testing.
- Sidebar lists all shipped routes; command palette prototype passes usability walkthrough.
- Tickets bulk actions execute and reflect status updates without reload.
- Settings page enforces admin-only edits with field-level validation feedback.

## Rollout & Validation

1. Implement feature branches per workstream; add Storybook snapshots for new components where applicable.
2. Run regression suite, visual regression tests, and axe scans pre-merge.
3. Conduct stakeholder review session highlighting key UX improvements.
4. Deploy to staging, capture before/after metrics (task completion time, error recovery).
5. Publish changelog entry summarizing UI updates and guidance for end users.
