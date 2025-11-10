# Testing & Validation Checklist

**Document Created:** 10 November 2025  
**Status:** No automated tests currently implemented  
**Priority:** HIGH - Critical for production readiness

---

## Current State Assessment

**Test Coverage:** 🔴 **0%** - No automated tests exist  
**Manual Testing:** 🟡 Partial - Basic functionality validated  
**CI/CD Pipeline:** 🔴 None  
**Test Documentation:** 🔴 None

**Critical Gap:** The application has NO automated tests, making it risky to deploy and difficult to refactor safely.

---

## 1. Authentication & Authorization Testing

### 1.1 JWT Token Lifecycle
**Priority:** 🔴 **P0 - Critical**  
**Difficulty:** ⭐⭐ Easy-Medium | **Time:** 4-6 hours

**What to Test:**
- ✅ Token generation on successful login
- ✅ Token includes correct user claims (id, email, role)
- ✅ Token expiration (7 days default)
- ✅ Token validation on protected endpoints
- ✅ Expired token rejection
- ✅ Invalid token rejection (malformed, wrong signature)
- ✅ Token refresh flow (if implemented)
- ✅ Logout invalidates token (if token blacklist exists)

**Test Implementation:**

```javascript
// backend-auth/tests/auth.test.js

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';  // Export app from server.js
import jwt from 'jsonwebtoken';

describe('Authentication API', () => {
  let testUserId;
  let authToken;
  
  // Test user credentials
  const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    full_name: 'Test User'
  };
  
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
      testUserId = res.body.user.id;
    });
    
    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });
    
    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test2@example.com' });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      authToken = res.body.token;
    });
    
    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });
      
      expect(res.status).toBe(401);
    });
    
    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        });
      
      expect(res.status).toBe(401);
    });
  });
  
  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUser.email);
    });
    
    it('should reject missing token', async () => {
      const res = await request(app)
        .get('/api/auth/verify');
      
      expect(res.status).toBe(401);
    });
    
    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid.token.here');
      
      expect(res.status).toBe(403);
    });
    
    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { id: testUserId, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }  // Already expired
      );
      
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.status).toBe(403);
    });
  });
});
```

**Setup Required:**
```bash
cd backend-auth
npm install --save-dev jest supertest @jest/globals
```

**package.json additions:**
```json
{
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
    "test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "transform": {},
    "extensionsToTreatAsEsm": [".js"]
  }
}
```

---

### 1.2 Role-Based Access Control (RBAC)
**Priority:** 🟡 **P1 - High** (Once implemented)  
**Difficulty:** ⭐⭐ Easy-Medium | **Time:** 3-4 hours

**What to Test:**
- ✅ Admin can access all endpoints
- ✅ Analyst can access read/write ticket endpoints
- ✅ Viewer can only read, no modifications
- ✅ Role validation in token claims
- ✅ Unauthorized role rejection (403)

**Test Cases:**
```javascript
describe('Role-Based Access Control', () => {
  let adminToken, analystToken, viewerToken;
  
  beforeAll(async () => {
    // Create users with different roles
    adminToken = await loginAs('admin@itsm.local', 'admin');
    analystToken = await loginAs('analyst@itsm.local', 'analyst');
    viewerToken = await loginAs('viewer@itsm.local', 'viewer');
  });
  
  it('admin can access settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
  
  it('analyst cannot access settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(403);
  });
  
  it('viewer cannot modify tickets', async () => {
    const res = await request(app)
      .patch('/api/tickets/INC0001')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ state: 'Closed' });
    expect(res.status).toBe(403);
  });
});
```

---

## 2. API Endpoint Testing

### 2.1 Python AI Backend Endpoints
**Priority:** 🔴 **P0 - Critical**  
**Difficulty:** ⭐⭐ Easy-Medium | **Time:** 8-12 hours

**What to Test:**
- ✅ Health check endpoint (authenticated & unauthenticated)
- ✅ Similarity search endpoint (POST /api/ai/similarity/search)
- ✅ Ticket family endpoint (GET /api/ai/similarity/tickets/:id/family)
- ✅ Embedding generation endpoint (POST /api/ai/similarity/embed)
- ✅ JWT validation in Python backend
- ✅ Error handling (invalid input, missing embeddings)
- ✅ CORS headers

**Test Implementation:**

```python
# backend-python/tests/test_api.py

import pytest
from fastapi.testclient import TestClient
from app.main import app
import jwt
from datetime import datetime, timedelta

client = TestClient(app)

# Test JWT token
def create_test_token(user_id=1, email="test@example.com", role="admin"):
    """Create a valid JWT token for testing."""
    payload = {
        "id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, "your_jwt_secret", algorithm="HS256")

class TestHealthEndpoint:
    def test_health_check_no_auth(self):
        """Health check should work without authentication."""
        response = client.get("/api/ai/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.json()["authenticated"] == False
    
    def test_health_check_with_auth(self):
        """Health check should show user info when authenticated."""
        token = create_test_token()
        response = client.get(
            "/api/ai/health",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["authenticated"] == True
        assert "user" in response.json()

class TestSimilaritySearch:
    def test_search_requires_auth(self):
        """Similarity search should require authentication."""
        response = client.post(
            "/api/ai/similarity/search",
            json={"incident_number": "INC0010001"}
        )
        assert response.status_code == 403
    
    def test_search_with_valid_ticket(self):
        """Search should return similar tickets."""
        token = create_test_token()
        response = client.post(
            "/api/ai/similarity/search",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "incident_number": "INC0010001",
                "top_k": 5,
                "min_similarity": 0.7
            }
        )
        assert response.status_code == 200
        assert "results" in response.json()
        assert isinstance(response.json()["results"], list)
    
    def test_search_invalid_ticket(self):
        """Search with non-existent ticket should handle gracefully."""
        token = create_test_token()
        response = client.post(
            "/api/ai/similarity/search",
            headers={"Authorization": f"Bearer {token}"},
            json={"incident_number": "INVALID123"}
        )
        # Should return 404 or empty results, not crash
        assert response.status_code in [200, 404]
    
    def test_search_missing_parameters(self):
        """Search without incident_number should return 422."""
        token = create_test_token()
        response = client.post(
            "/api/ai/similarity/search",
            headers={"Authorization": f"Bearer {token}"},
            json={}
        )
        assert response.status_code == 422

class TestTicketFamily:
    def test_family_requires_auth(self):
        """Ticket family endpoint requires auth."""
        response = client.get("/api/ai/similarity/tickets/INC0010001/family")
        assert response.status_code == 403
    
    def test_family_with_valid_ticket(self):
        """Should return parent and children."""
        token = create_test_token()
        response = client.get(
            "/api/ai/similarity/tickets/INC0010001/family",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ticket" in data
        assert "parent" in data
        assert "children" in data

class TestEmbeddingGeneration:
    def test_embed_requires_auth(self):
        """Embedding endpoint requires auth."""
        response = client.post(
            "/api/ai/similarity/embed",
            json={"short_description": "Test ticket"}
        )
        assert response.status_code == 403
    
    def test_embed_generates_vector(self):
        """Should generate 768-dim embedding."""
        token = create_test_token()
        response = client.post(
            "/api/ai/similarity/embed",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "short_description": "Network connectivity issue",
                "description": "Users unable to connect"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "embedding" in data
        assert len(data["embedding"]) == 768
    
    def test_embed_empty_text(self):
        """Should reject empty text."""
        token = create_test_token()
        response = client.post(
            "/api/ai/similarity/embed",
            headers={"Authorization": f"Bearer {token}"},
            json={"short_description": ""}
        )
        assert response.status_code == 400
```

**Setup:**
```bash
cd backend-python
pip install pytest pytest-asyncio httpx
```

**pytest.ini:**
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

---

### 2.2 PostgREST API Validation
**Priority:** 🟡 **P1 - High**  
**Difficulty:** ⭐⭐ Easy-Medium | **Time:** 4-6 hours

**What to Test:**
- ✅ GET /servicenow_incidents returns tickets
- ✅ Filtering works (priority, state, category)
- ✅ Pagination parameters (offset, limit)
- ✅ Field selection (?select=field1,field2)
- ✅ Ordering (?order=opened_at.desc)
- ✅ Response format consistency
- ✅ CORS headers present

**Test Implementation:**

```python
# tests/test_postgrest.py

import requests
import pytest

BASE_URL = "http://localhost:3000"

class TestPostgRESTAPI:
    def test_get_all_tickets(self):
        """GET /servicenow_incidents returns data."""
        response = requests.get(f"{BASE_URL}/servicenow_incidents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "incident_number" in data[0]
    
    def test_filter_by_priority(self):
        """Filter by priority parameter."""
        response = requests.get(
            f"{BASE_URL}/servicenow_incidents",
            params={"priority": "eq.1"}
        )
        assert response.status_code == 200
        data = response.json()
        for ticket in data:
            assert ticket["priority"] == 1
    
    def test_pagination(self):
        """Pagination with offset and limit."""
        response = requests.get(
            f"{BASE_URL}/servicenow_incidents",
            params={"offset": 0, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 10
    
    def test_field_selection(self):
        """Select specific fields only."""
        response = requests.get(
            f"{BASE_URL}/servicenow_incidents",
            params={"select": "incident_number,priority,state"}
        )
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            assert "incident_number" in data[0]
            assert "priority" in data[0]
            assert "description" not in data[0]  # Not selected
    
    def test_ordering(self):
        """Order by field."""
        response = requests.get(
            f"{BASE_URL}/servicenow_incidents",
            params={
                "select": "incident_number,opened_at",
                "order": "opened_at.desc",
                "limit": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        # Check descending order
        dates = [ticket["opened_at"] for ticket in data]
        assert dates == sorted(dates, reverse=True)
```

---

## 3. Database Testing

### 3.1 Database Migrations
**Priority:** 🔴 **P0 - Critical**  
**Difficulty:** ⭐⭐ Easy-Medium | **Time:** 4-6 hours

**What to Test:**
- ✅ All migrations apply cleanly on fresh database
- ✅ Migrations are idempotent (can run multiple times)
- ✅ Foreign key constraints work correctly
- ✅ Triggers fire correctly
- ✅ Indexes are created
- ✅ pgvector extension loads

**Test Script:**

```bash
#!/bin/bash
# tests/test_migrations.sh

set -e

echo "Testing database migrations..."

# Create test database
docker exec itsm-postgres psql -U postgres -c "DROP DATABASE IF EXISTS itsm_test;"
docker exec itsm-postgres psql -U postgres -c "CREATE DATABASE itsm_test;"

# Apply migrations
for migration in docker/migrations/*.sql; do
    echo "Applying $migration..."
    docker exec -i itsm-postgres psql -U postgres -d itsm_test < "$migration"
done

# Verify schema
docker exec itsm-postgres psql -U postgres -d itsm_test -c "
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
"

# Verify pgvector
docker exec itsm-postgres psql -U postgres -d itsm_test -c "
    SELECT extname, extversion 
    FROM pg_extension 
    WHERE extname = 'vector';
"

# Verify triggers
docker exec itsm-postgres psql -U postgres -d itsm_test -c "
    SELECT trigger_name, event_manipulation, event_object_table
    FROM information_schema.triggers;
"

echo "✅ Migration tests passed"

# Cleanup
docker exec itsm-postgres psql -U postgres -c "DROP DATABASE itsm_test;"
```

---

### 3.2 Database Triggers
**Priority:** 🟡 **P1 - High**  
**Difficulty:** ⭐⭐⭐ Medium | **Time:** 6-8 hours

**What to Test:**
- ✅ Embedding queue trigger fires on INSERT/UPDATE
- ✅ Child incidents array updates when parent is assigned
- ✅ Trigger doesn't create infinite loops
- ✅ Trigger handles NULL values correctly
- ✅ Concurrent updates don't break triggers

**Test Implementation:**

```sql
-- tests/test_triggers.sql

-- Test embedding queue trigger
BEGIN;

-- Insert ticket without embedding
INSERT INTO servicenow_incidents (
    incident_number, short_description, description, priority, state
) VALUES (
    'TEST001', 'Test ticket', 'Test description', 3, 'New'
);

-- Check queue entry was created
SELECT EXISTS (
    SELECT 1 FROM embedding_queue 
    WHERE incident_number = 'TEST001' AND status = 'pending'
) AS queue_created;

-- Expected: true

ROLLBACK;

-- Test parent-child trigger
BEGIN;

-- Create parent ticket
INSERT INTO servicenow_incidents (
    incident_number, short_description, embedding
) VALUES (
    'PARENT001', 'Parent ticket', array_fill(0.5::float, ARRAY[768])::vector
);

-- Create child ticket
INSERT INTO servicenow_incidents (
    incident_number, short_description, embedding
) VALUES (
    'CHILD001', 'Child ticket', array_fill(0.5::float, ARRAY[768])::vector
);

-- Assign parent
UPDATE servicenow_incidents
SET parent_incident = 'PARENT001'
WHERE incident_number = 'CHILD001';

-- Check parent's child_incidents array updated
SELECT child_incidents FROM servicenow_incidents WHERE incident_number = 'PARENT001';
-- Expected: {'CHILD001'}

ROLLBACK;
```

---

## 4. Frontend Testing

### 4.1 Component Unit Tests
**Priority:** 🟡 **P1 - High**  
**Difficulty:** ⭐⭐⭐ Medium | **Time:** 12-16 hours

**What to Test:**
- ✅ Components render without crashing
- ✅ Props are passed correctly
- ✅ User interactions trigger handlers
- ✅ Conditional rendering works
- ✅ Forms validate inputs
- ✅ Error states display correctly

**Test Implementation:**

```typescript
// src/components/__tests__/KpiCard.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KpiCard } from '../KpiCard';

describe('KpiCard', () => {
  it('renders title and value', () => {
    render(<KpiCard title="Total Tickets" value={150} />);
    expect(screen.getByText('Total Tickets')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });
  
  it('displays positive delta with green color', () => {
    render(<KpiCard title="Resolved" value={100} delta={15} />);
    const deltaElement = screen.getByText(/15/);
    expect(deltaElement).toHaveClass('text-green-500');
  });
  
  it('displays negative delta with red color', () => {
    render(<KpiCard title="Open" value={50} delta={-10} />);
    const deltaElement = screen.getByText(/10/);
    expect(deltaElement).toHaveClass('text-red-500');
  });
  
  it('shows tooltip on hover', async () => {
    render(<KpiCard title="MTTR" value={24} tooltip="Mean time to resolve" />);
    // Test tooltip interaction
  });
});
```

**Setup:**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**vite.config.ts additions:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

---

### 4.2 Integration Tests
**Priority:** 🟡 **P1 - High**  
**Difficulty:** ⭐⭐⭐⭐ Hard | **Time:** 16-24 hours

**What to Test:**
- ✅ Login flow end-to-end
- ✅ Data fetching and display
- ✅ Filtering updates URL and results
- ✅ Pagination navigates correctly
- ✅ Forms submit and show success/error
- ✅ Navigation between pages
- ✅ Protected route redirection

**Test Implementation:**

```typescript
// src/pages/__tests__/Tickets.integration.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Tickets from '../Tickets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Tickets Page Integration', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  it('loads and displays tickets', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Tickets />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check tickets are displayed
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
  
  it('filters tickets by priority', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Tickets />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    // Open priority filter
    const priorityFilter = screen.getByText(/priority/i);
    await user.click(priorityFilter);
    
    // Select P1
    await user.click(screen.getByText('1 - Critical'));
    
    // Wait for filtered results
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });
  });
  
  it('exports selected tickets to CSV', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Tickets />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    // Select first ticket
    const checkboxes = await screen.findAllByRole('checkbox');
    await user.click(checkboxes[1]); // First data checkbox
    
    // Click export
    const exportButton = screen.getByText(/export csv/i);
    await user.click(exportButton);
    
    // Verify download triggered (mock in setup)
  });
});
```

---

## 5. End-to-End (E2E) Testing

### 5.1 Critical User Flows
**Priority:** 🟡 **P1 - High**  
**Difficulty:** ⭐⭐⭐⭐ Hard | **Time:** 20-30 hours

**What to Test:**
- ✅ Complete login → dashboard → tickets flow
- ✅ Ticket search and filtering
- ✅ Similar tickets workflow
- ✅ Settings modification
- ✅ Graph visualization
- ✅ Error recovery

**Test Implementation (Playwright):**

```typescript
// e2e/login-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Login and Dashboard Flow', () => {
  test('user can login and view dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:8080/login');
    
    // Fill credentials
    await page.fill('input[type="email"]', 'admin@itsm.local');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click login
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify dashboard elements
    await expect(page.locator('text=Total Tickets')).toBeVisible();
    await expect(page.locator('text=Open Tickets')).toBeVisible();
    
    // Check KPI values loaded
    const totalTickets = page.locator('[data-testid="kpi-total"]');
    await expect(totalTickets).not.toBeEmpty();
  });
  
  test('invalid login shows error', async ({ page }) => {
    await page.goto('http://localhost:8080/login');
    
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // Error message appears
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible();
    
    // Still on login page
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Ticket Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:8080/login');
    await page.fill('input[type="email"]', 'admin@itsm.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });
  
  test('can view and filter tickets', async ({ page }) => {
    // Navigate to tickets
    await page.click('text=Tickets');
    await expect(page).toHaveURL(/.*tickets/);
    
    // Table loads
    await expect(page.locator('table')).toBeVisible();
    
    // Apply priority filter
    await page.click('button:has-text("Priority")');
    await page.click('text=1 - Critical');
    
    // Results update
    await page.waitForTimeout(1000); // Wait for API
    const rows = page.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });
  
  test('can view ticket details', async ({ page }) => {
    await page.goto('http://localhost:8080/tickets');
    
    // Click first ticket row
    await page.click('tbody tr:first-child');
    
    // Drawer opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Ticket Details')).toBeVisible();
    
    // Similar tickets section visible
    await expect(page.locator('text=Similar Tickets')).toBeVisible();
  });
});
```

**Setup:**
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 6. Performance Testing

### 6.1 Load Testing
**Priority:** 🟡 **P2 - Medium**  
**Difficulty:** ⭐⭐⭐ Medium | **Time:** 8-12 hours

**What to Test:**
- ✅ API response times under load (100, 500, 1000 concurrent users)
- ✅ Database connection pool behavior
- ✅ Memory leaks under sustained load
- ✅ Embedding generation throughput
- ✅ Similarity search performance at scale

**Test Implementation (k6):**

```javascript
// tests/load/api-load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% failure rate
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Test ticket list endpoint
  const listRes = http.get(`${BASE_URL}/servicenow_incidents?limit=20`);
  check(listRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
  
  // Test filtered query
  const filterRes = http.get(`${BASE_URL}/servicenow_incidents?priority=eq.1&limit=10`);
  check(filterRes, {
    'filtered status is 200': (r) => r.status === 200,
  });
  
  sleep(1);
}
```

**Run:**
```bash
k6 run tests/load/api-load-test.js
```

---

## 7. Security Testing

### 7.1 Vulnerability Scanning
**Priority:** 🔴 **P0 - Critical**  
**Difficulty:** ⭐ Very Easy | **Time:** 1-2 hours

**What to Test:**
- ✅ SQL injection vulnerabilities
- ✅ XSS vulnerabilities
- ✅ Authentication bypass attempts
- ✅ Rate limiting effectiveness
- ✅ CORS misconfiguration
- ✅ Dependency vulnerabilities

**Tools & Commands:**

```bash
# Frontend dependency audit
npm audit
npm audit fix

# Backend dependency audit
cd backend-auth && npm audit
cd backend-python && pip-audit

# OWASP ZAP automated scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:8080

# SQL injection testing (manual with sqlmap)
sqlmap -u "http://localhost:3000/servicenow_incidents?incident_number=INC001" \
  --batch --random-agent

# JWT security check
python3 -c "import jwt; jwt.decode('YOUR_TOKEN', verify=False)"
# Should NOT contain sensitive data in payload
```

---

### 7.2 Penetration Testing Checklist
**Priority:** 🟡 **P1 - High**  
**Difficulty:** ⭐⭐⭐ Medium | **Time:** 4-8 hours

**Manual Tests:**

```bash
# Test 1: JWT token manipulation
# Try modifying user ID in token
# Expected: Signature validation fails

# Test 2: SQL injection in filters
curl "http://localhost:3000/servicenow_incidents?priority=1'; DROP TABLE users; --"
# Expected: PostgREST sanitizes input

# Test 3: XSS in ticket descriptions
# Create ticket with: <script>alert('XSS')</script>
# Expected: React escapes HTML

# Test 4: CSRF token validation
# Make state-changing request without CSRF token
# Expected: Request rejected

# Test 5: Rate limiting
for i in {1..100}; do
  curl http://localhost:3001/api/auth/login \
    -d '{"email":"test@example.com","password":"wrong"}' &
done
# Expected: Requests blocked after threshold

# Test 6: Authorization bypass
# Try accessing admin endpoints with analyst token
curl -H "Authorization: Bearer ANALYST_TOKEN" \
  http://localhost:3001/api/admin/users
# Expected: 403 Forbidden
```

---

## 8. Data Integrity Testing

### 8.1 Schema Validation
**Priority:** 🟡 **P1 - High**  
**Difficulty:** ⭐⭐ Easy-Medium | **Time:** 4-6 hours

**What to Test:**
- ✅ All required fields are NOT NULL
- ✅ Foreign key constraints enforced
- ✅ Enum values validated
- ✅ Date fields have valid timestamps
- ✅ Embedding vectors are correct dimension (768)
- ✅ Priority values in range (1-5)

**Test Queries:**

```sql
-- Test required fields
SELECT COUNT(*) FROM servicenow_incidents WHERE incident_number IS NULL;
-- Expected: 0

-- Test foreign key constraint
INSERT INTO servicenow_incidents (incident_number, parent_incident)
VALUES ('TEST001', 'NONEXISTENT');
-- Expected: Error - parent doesn't exist

-- Test embedding dimension
SELECT incident_number FROM servicenow_incidents
WHERE embedding IS NOT NULL
  AND array_length(embedding::float[], 1) != 768;
-- Expected: 0 rows

-- Test priority range
SELECT incident_number, priority FROM servicenow_incidents
WHERE priority NOT IN (1,2,3,4,5);
-- Expected: 0 rows

-- Test orphaned children (parent doesn't exist)
SELECT child.incident_number
FROM servicenow_incidents child
LEFT JOIN servicenow_incidents parent ON child.parent_incident = parent.incident_number
WHERE child.parent_incident IS NOT NULL
  AND parent.incident_number IS NULL;
-- Expected: 0 rows
```

---

## 9. Implementation Priority & Roadmap

### Phase 1: Critical Tests (2-3 weeks)
**Must-have before production**

1. ✅ Authentication tests (JWT, login/logout) - 6 hours
2. ✅ API endpoint tests (Python backend) - 12 hours
3. ✅ Database migration tests - 6 hours
4. ✅ Security audit (npm/pip audit) - 2 hours
5. ✅ E2E critical flows (login, tickets) - 10 hours

**Total: ~36 hours (1 week full-time)**

---

### Phase 2: Quality Assurance (3-4 weeks)
**Important for stability**

6. ✅ Component unit tests (major components) - 16 hours
7. ✅ Database trigger tests - 8 hours
8. ✅ PostgREST API tests - 6 hours
9. ✅ Integration tests (page flows) - 16 hours
10. ✅ Load testing (basic scenarios) - 8 hours

**Total: ~54 hours (1.5 weeks full-time)**

---

### Phase 3: Comprehensive Coverage (4-6 weeks)
**Nice-to-have for excellence**

11. ✅ Full E2E test suite - 20 hours
12. ✅ Performance benchmarking - 12 hours
13. ✅ Security penetration tests - 8 hours
14. ✅ RBAC tests (once implemented) - 4 hours
15. ✅ Accessibility tests - 8 hours

**Total: ~52 hours (1.5 weeks full-time)**

---

## 10. CI/CD Pipeline Setup

### 10.1 GitHub Actions Workflow
**Priority:** 🟡 **P1 - High**  
**Difficulty:** ⭐⭐ Easy-Medium | **Time:** 6-8 hours

**Implementation:**

```yaml
# .github/workflows/test.yml

name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-auth-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: itsm_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./backend-auth
        run: npm ci
      
      - name: Run tests
        working-directory: ./backend-auth
        run: npm test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: itsm_test
          DB_USER: postgres
          DB_PASSWORD: postgres
          JWT_SECRET: test-secret-key
  
  backend-python-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: pgvector/pgvector:pg15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: itsm_test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        working-directory: ./backend-python
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx
      
      - name: Run tests
        working-directory: ./backend-python
        run: pytest
  
  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Build
        run: npm run build
  
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start services
        run: docker compose up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Summary: Test Coverage Goals

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| **Backend Auth** | 0% | 80% | 🔴 P0 |
| **Backend Python** | 0% | 80% | 🔴 P0 |
| **Frontend Components** | 0% | 70% | 🟡 P1 |
| **Integration Tests** | 0% | 60% | 🟡 P1 |
| **E2E Critical Flows** | 0% | 100% | 🔴 P0 |
| **Security Tests** | 0% | 100% | 🔴 P0 |
| **Performance Tests** | 0% | Basic | 🟡 P2 |

**Estimated Total Effort:** 142 hours (~4-5 weeks full-time)

---

## Next Immediate Actions

1. **This Week:**
   - Set up Jest for backend-auth tests
   - Set up pytest for backend-python tests
   - Write authentication flow tests
   - Run npm/pip audit

2. **Next Week:**
   - Implement API endpoint tests
   - Test database migrations
   - Set up basic E2E with Playwright
   - Document test results

3. **This Month:**
   - Achieve 60%+ backend test coverage
   - Complete critical E2E flows
   - Set up CI/CD pipeline
   - Security audit and fixes

**Goal:** Production-ready test coverage within 4-6 weeks.
