# Bundle Size Optimization Implementation Plan

**Date:** 6 November 2025
**Current Issue:** Single JS bundle is 1,469 KB (449 KB gzipped) - exceeds Vite's 500 KB recommendation
**Goal:** Reduce initial bundle size to <500 KB through code-splitting and lazy loading

---

## 📊 Current State Analysis

### Bundle Composition (Estimated)

```
Total Bundle: 1,469 KB (449 KB gzipped)

Major Contributors:
├─ React & React DOM         ~150 KB (base framework)
├─ Radix UI Components       ~300 KB (23+ component packages)
├─ Recharts                  ~200 KB (charting library)
├─ Cytoscape                 ~250 KB (graph visualization)
├─ React Query               ~50 KB  (data fetching)
├─ React Router              ~40 KB  (routing)
├─ Axios                     ~30 KB  (HTTP client)
├─ Supabase Client           ~100 KB (backend SDK)
├─ Date-fns                  ~50 KB  (date utilities)
├─ Form Libraries            ~80 KB  (react-hook-form, zod)
├─ Lucide Icons              ~100 KB (icon library)
└─ App Code & Other          ~119 KB (custom code, smaller libs)
```

### Current Loading Strategy

- **All routes loaded upfront** (no code-splitting)
- **All UI components bundled** (even unused ones)
- **Large libraries always loaded** (Recharts, Cytoscape)

---

## 🎯 Implementation Strategy

### Phase 1: Route-Based Code Splitting (High Impact)

**Difficulty:** ⭐⭐ Easy-Medium | **Impact:** 🚀🚀🚀 High | **Time:** 1-2 hours

Split application by routes so each page loads only what it needs.

#### Changes Required:

**File:** `src/App.tsx`

```typescript
// BEFORE: Direct imports
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import Insights from "./pages/Insights";
import Graph from "./pages/Graph";
import Settings from "./pages/Settings";

// AFTER: Lazy imports
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Insights = lazy(() => import("./pages/Insights"));
const Graph = lazy(() => import("./pages/Graph"));
const Settings = lazy(() => import("./pages/Settings"));

// Wrap routes in Suspense
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
    {/* ... other routes */}
  </Routes>
</Suspense>
```

**Expected Result:**

- Main bundle: ~800-900 KB (down from 1,469 KB)
- Dashboard chunk: ~100-150 KB
- Tickets chunk: ~100-150 KB
- Insights chunk: ~150-200 KB (includes Recharts)
- Graph chunk: ~250-300 KB (includes Cytoscape)
- Settings chunk: ~50-80 KB

**Risks:** Low - Standard React pattern with fallback UI

---

### Phase 2: Library-Specific Optimization (Medium Impact)

**Difficulty:** ⭐⭐⭐ Medium | **Impact:** 🚀🚀 Medium-High | **Time:** 2-3 hours

#### 2A. Optimize Heavy Libraries

**Cytoscape (250 KB)**

- Already isolated to Graph page (will benefit from Phase 1)
- Consider: Load only when user interacts with graph view

```typescript
// In GraphViewer.tsx
const [showGraph, setShowGraph] = useState(false);
const Cytoscape = lazy(() => import('cytoscape'));
```

**Recharts (200 KB)**

- Used in Dashboard and Insights pages
- Consider: Create shared chart chunk

```typescript
// src/components/charts/index.ts
export const ChartWrapper = lazy(() => import('./ChartWrapper'));
```

**Radix UI (300 KB total)**

- 23+ component packages loaded
- Review actual usage in each route
- Opportunity: Remove unused Radix components

```bash
# Audit unused Radix imports
npx depcheck
```

**Lucide Icons (100 KB)**

- Tree-shakeable but may not be optimized
- Action: Verify named imports are used (not default)

```typescript
// GOOD: Tree-shakeable
import { Search, Filter, X } from "lucide-react";

// BAD: Loads all icons
import * as Icons from "lucide-react";
```

#### 2B. Date-fns Optimization

```typescript
// BEFORE: Large locale imports
import { format } from "date-fns";

// AFTER: Use smaller alternatives or tree-shake
import format from "date-fns/format";
```

**Expected Result:** Additional 50-100 KB reduction

**Risks:** Medium - Requires testing to ensure no regressions

---

### Phase 3: Vite Build Configuration (Low-Medium Impact)

**Difficulty:** ⭐⭐ Easy-Medium | **Impact:** 🚀 Low-Medium | **Time:** 1 hour

#### Update `vite.config.ts`

```typescript
export default defineConfig(({ mode }) => ({
  // ... existing config
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor splitting
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            // ... frequently used UI components
          ],
          'charts': ['recharts'],
          'graph': ['cytoscape'],
          'forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'data': ['@tanstack/react-query', 'axios'],
          'backend': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Adjust warning threshold
    sourcemap: mode === 'development' ? true : false,
  },
}));
```

**Benefits:**

- Better browser caching (vendor chunks change less)
- Parallel loading of chunks
- Smaller incremental updates

**Expected Result:** Better chunk distribution, improved cache hit rate

**Risks:** Low - Standard Vite configuration

---

### Phase 4: Advanced Optimizations (Optional)

**Difficulty:** ⭐⭐⭐⭐ Medium-Hard | **Impact:** 🚀 Variable | **Time:** 3-5 hours

#### 4A. Dynamic Imports for Modals/Drawers

```typescript
// TicketDrawer.tsx - only load when opened
const TicketDetailView = lazy(() => import('./TicketDetailView'));
```

#### 4B. Icon Optimization

```typescript
// Create custom icon subset if using many Lucide icons
// Or switch to SVG sprites for frequently used icons
```

#### 4C. Component Library Analysis

```bash
# Analyze bundle with vite-plugin-visualizer
npm install --save-dev rollup-plugin-visualizer
```

Add to `vite.config.ts`:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  react(),
  visualizer({ open: true, gzipSize: true }),
],
```

#### 4D. Remove Unused Dependencies

```bash
# Identify unused packages
npx depcheck

# Example candidates for review:
# - @radix-ui packages not used in UI
# - Duplicate date/time libraries
# - Unused form components
```

**Expected Result:** Additional 50-150 KB reduction

**Risks:** Medium - Requires thorough testing

---

## 📋 Implementation Checklist

### Phase 1: Route Splitting (RECOMMENDED START)

- [ ] Create `PageLoader` component for Suspense fallback
- [ ] Convert page imports to `lazy()` in `App.tsx`
- [ ] Wrap Routes in `Suspense` boundary
- [ ] Test navigation between routes
- [ ] Verify error boundaries work with lazy loading
- [ ] Build and measure bundle sizes
- [ ] Test in production mode (`npm run build && npm run preview`)

### Phase 2: Library Optimization

- [ ] Audit Radix UI usage with `depcheck`
- [ ] Verify Lucide icons use named imports
- [ ] Review Recharts usage (can it be deferred?)
- [ ] Test date-fns tree-shaking
- [ ] Remove unused dependencies
- [ ] Re-build and measure impact

### Phase 3: Build Config

- [ ] Add `manualChunks` configuration
- [ ] Test chunk loading in browser Network tab
- [ ] Verify cache behavior with repeated visits
- [ ] Adjust `chunkSizeWarningLimit` if appropriate
- [ ] Document chunk strategy in README

### Phase 4: Advanced (Optional)

- [ ] Install and run bundle visualizer
- [ ] Identify largest remaining chunks
- [ ] Lazy-load modal/drawer content
- [ ] Consider icon sprite system
- [ ] Measure final bundle size

---

## 🎯 Success Metrics

### Target Bundle Sizes

```
Initial Load (Target):
├─ Main chunk:          < 300 KB (currently ~1,470 KB)
├─ React vendor:        < 150 KB
├─ UI vendor:           < 150 KB
└─ Total initial:       < 600 KB ✅

On-Demand Chunks:
├─ Dashboard:           ~150 KB
├─ Tickets:             ~150 KB
├─ Insights + Charts:   ~250 KB
├─ Graph + Cytoscape:   ~300 KB
└─ Settings:            ~80 KB
```

### Performance Goals

- **First Contentful Paint (FCP):** < 1.5s on 3G
- **Time to Interactive (TTI):** < 3.5s on 3G
- **Lighthouse Score:** > 90 (Performance)

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lazy loading failures | High | Add error boundaries around lazy components |
| Slower page transitions | Medium | Use optimistic UI, preload likely routes |
| Development complexity | Low | Document pattern in README, use TypeScript |
| Cache invalidation issues | Medium | Use content-hash in filenames (default in Vite) |
| Broken production build | High | Test production build before deploy: `npm run build && npm run preview` |

---

## 🔧 Testing Strategy

### 1. Development Testing

```bash
# Activate environment
conda activate itsm

# Build and preview
npm run build && npm run preview
```

### 2. Bundle Analysis

```bash
# After adding visualizer plugin
npm run build
# Opens interactive bundle map in browser
```

### 3. Manual Testing

- [ ] Navigate to each route (Dashboard, Tickets, Insights, Graph, Settings)
- [ ] Check Network tab for chunk loading
- [ ] Verify mock data mode works
- [ ] Test with live Supabase connection
- [ ] Test slow 3G throttling in Chrome DevTools
- [ ] Verify no console errors

### 4. Lighthouse Audit

```bash
# In Chrome DevTools
# Lighthouse > Performance > Generate Report
```

---

## 📈 Expected Outcomes

### Immediate (Phase 1)

- **Bundle size:** 1,469 KB → ~800 KB (45% reduction)
- **Gzipped:** 449 KB → ~250 KB (44% reduction)
- **Initial load time:** Improved by 30-40%

### With Phase 2

- **Bundle size:** ~800 KB → ~600-700 KB (additional 15-20%)
- **Tree-shaking:** Better optimization of libraries
- **Cache efficiency:** Improved for returning users

### With Phase 3

- **Better caching:** Vendor chunks cached separately
- **Parallel loading:** Multiple chunks load simultaneously
- **Faster updates:** Only app code chunk changes on updates

---

## 🎓 Difficulty Rating

### Overall Project Difficulty: ⭐⭐⭐ (3/5) - Medium

**Breakdown:**

- **Phase 1 (Route Splitting):** ⭐⭐ Easy-Medium
  - Standard React pattern
  - Well-documented approach
  - Low risk of breaking changes

- **Phase 2 (Library Optimization):** ⭐⭐⭐ Medium
  - Requires dependency analysis
  - May need code refactoring
  - Testing required for regressions

- **Phase 3 (Build Config):** ⭐⭐ Easy-Medium
  - Configuration-only changes
  - Well-documented Vite feature
  - Minimal code changes

- **Phase 4 (Advanced):** ⭐⭐⭐⭐ Medium-Hard
  - Deep optimization techniques
  - Requires performance profiling
  - Higher complexity, lower guaranteed ROI

### Recommended Approach

**Start with Phase 1** - It provides the biggest impact (45% reduction) with the least risk and complexity. This alone will resolve the Vite warning.

**Then assess:** After Phase 1, measure actual performance in production. Only proceed with Phases 2-4 if load times are still problematic.

---

## 📚 References

- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)
- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
- [Rollup Manual Chunks](https://rollupjs.org/configuration-options/#output-manualchunks)
- [Web.dev Bundle Size](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

---

## 🚀 Quick Start Command

```bash
# Activate conda environment
conda activate itsm

# Create PageLoader component
# Edit src/App.tsx with lazy imports
# Test build
npm run build

# Verify chunks created
ls -lh dist/assets/

# Test in browser
npm run preview
```

---

**Next Steps:** Implement Phase 1 first, measure results, then decide if additional phases are needed based on actual performance metrics.
