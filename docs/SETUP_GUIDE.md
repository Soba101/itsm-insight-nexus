# Complete Setup Guide - ITSM Insight Nexus

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- Conda environment (itsm)

## Step-by-Step Setup

### 1. Start Docker Postgres

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 15432
- PostgREST on port 3000
- pgAdmin on port 5050

### 2. Setup Backend (Authentication API)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run database migration (creates users table)
node run-migration.js

# Start the backend server
npm run dev
```

Backend will run on **http://localhost:3001**

### 3. Setup Frontend

```bash
# Navigate back to root
cd ..

# Activate conda environment
conda activate itsm

# Install dependencies (if not already done)
npm install

# Start frontend dev server
npm run dev
```

Frontend will run on **http://localhost:8080**

### 4. Login

Open http://localhost:8080 and log in with:
- **Email:** `admin@itsm.local`
- **Password:** `admin123`

---

## Environment Configuration

### Frontend (`.env`)
```bash
# Backend API
VITE_API_BASE_URL=http://localhost:3001

# Database (for scripts/admin tools)
DB_HOST=localhost
DB_PORT=15432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### Backend (`backend/.env`)
```bash
# Server
PORT=3001
JWT_SECRET=change-this-to-a-secure-random-string-in-production

# Database
DB_HOST=localhost
DB_PORT=15432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres
```

---

## Architecture

```
┌─────────────────┐      HTTP       ┌──────────────────┐
│   Frontend      │ ────────────>   │   Backend API    │
│   (Vite/React)  │     (3001)      │   (Express)      │
│   Port 8080     │                 │   Port 3001      │
└─────────────────┘                 └──────────────────┘
                                             │
                                             │ SQL
                                             ▼
                                    ┌──────────────────┐
                                    │   PostgreSQL     │
                                    │   Port 15432     │
                                    └──────────────────┘
```

### Authentication Flow

1. User submits email/password via Login page
2. Frontend sends POST to `http://localhost:3001/api/auth/login`
3. Backend verifies credentials against `users` table in Postgres
4. Backend returns JWT token + user data
5. Frontend stores token in localStorage
6. Subsequent requests include token in `Authorization` header
7. Backend validates token for protected endpoints

---

## Database Schema

### `users` table
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR) - bcrypt hashed
- full_name (VARCHAR)
- role (VARCHAR) - 'admin', 'analyst', 'viewer'
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### `password_reset_tokens` table
```sql
- id (UUID, PK)
- user_id (UUID, FK -> users.id)
- token (VARCHAR, UNIQUE)
- expires_at (TIMESTAMP)
- used (BOOLEAN)
- created_at (TIMESTAMP)
```

---

## Development Workflow

### Daily Workflow

1. **Start Docker:**
   ```bash
   docker-compose up -d
   ```

2. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend (new terminal):**
   ```bash
   conda activate itsm
   npm run dev
   ```

### Stopping Services

```bash
# Stop frontend: Ctrl+C in terminal

# Stop backend: Ctrl+C in terminal

# Stop Docker:
docker-compose down
```

---

## Troubleshooting

### "Connection refused" errors
- Make sure Docker is running: `docker ps`
- Check if PostgreSQL is up: `docker-compose ps`
- Verify port 15432 is not in use

### "Password authentication failed"
- Check `backend/.env` has correct credentials
- Default: user=postgres, password=postgres
- Restart backend after changing .env

### Backend won't start
- Check if port 3001 is available
- Make sure you ran `node run-migration.js` first
- Check `backend/.env` exists

### Can't log in
- Make sure backend is running on port 3001
- Check browser console for API errors
- Verify test user exists:
  ```bash
  cd backend
  node run-migration.js
  ```

### Frontend shows "Access token required"
- Clear localStorage: Browser DevTools → Application → Local Storage → Clear
- Sign out and sign in again
- Check backend is running

---

## Creating New Users

### Via API (Recommended)
Use the signup page at http://localhost:8080/signup

### Via Database (Admin)
```sql
-- Connect to Postgres (pgAdmin or psql)
-- Password must be bcrypt hashed
INSERT INTO users (email, password_hash, full_name, role) 
VALUES (
  'user@example.com',
  '$2a$10$hashed_password_here',
  'John Doe',
  'analyst'
);
```

To generate a bcrypt hash:
```javascript
// In backend directory
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 10));"
```

---

## Security Notes

- **JWT_SECRET:** Change in production!
- **Passwords:** Hashed with bcrypt (salt rounds: 10)
- **Tokens:** Expire in 7 days
- **HTTPS:** Use HTTPS in production
- **CORS:** Configured for localhost in development

---

## Next Steps

- [ ] Configure email for password reset
- [ ] Add role-based access control
- [ ] Implement user profile editing
- [ ] Add OAuth providers (Google, GitHub)
- [ ] Enable 2FA
- [ ] Add session timeout warnings
- [ ] Implement audit logging
