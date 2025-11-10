# ITSM Backend Authentication API

JWT-based authentication API for ITSM Insight Nexus using Docker PostgreSQL.

## Overview

This Express.js backend provides:

- User registration and login with JWT tokens
- Password reset functionality
- Token validation middleware
- PostgreSQL-based user management

**Port:** 3001
**Database:** Docker Postgres (itsm_db) on port 15432

## Setup

### 1. Prerequisites

- Docker Postgres running (`docker compose up -d postgres`)
- Node.js 18+ installed

### 2. Install Dependencies

```bash
cd backend-auth
npm install
```

### 3. Configure Environment

Create or verify `backend-auth/.env`:

```bash
# Server Configuration
PORT=3001
JWT_SECRET=921ded1a3143d5745e14587d2a1877ce52179acda540d13d8d63ceefad62ef4b15049201ade10f636f6e95d85ed813fa8086e89c7c5c71d4d14c218fb14d4fd4

# Database Connection (from host to Docker)
DB_HOST=localhost
DB_PORT=15432
DB_NAME=itsm_db
DB_USER=postgres
DB_PASSWORD=postgres
```

**Important:**

- `JWT_SECRET` must match the one in `backend-python/.env` for AI backend authentication
- Use `DB_HOST=localhost` and `DB_PORT=15432` (external Docker port)

### 4. Run Database Migration

Ensure Docker Postgres is running, then:

```bash
node run-migration.js
```

This will:

- Create `users` table with columns: id, email, password_hash, full_name, role, is_active, created_at, updated_at
- Create `password_reset_tokens` table
- Seed test admin user

### 5. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will run on <http://localhost:3001>

## Test Credentials

After running the migration, you can log in with:

```text
Email: admin@itsm.local
Password: admin123
```

## API Endpoints

### POST `/api/auth/register`

Register a new user.

```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

### POST `/api/auth/login`

Login and get JWT token.

```json
{
  "email": "admin@itsm.local",
  "password": "admin123"
}
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@itsm.local",
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

### POST `/api/auth/forgot-password`

Request password reset.

```json
{
  "email": "user@example.com"
}
```

### POST `/api/auth/update-password`

Update password (requires authentication).

Headers:

```text
Authorization: Bearer <token>
```

Body:

```json
{
  "password": "newpassword123"
}
```

### GET `/api/auth/verify`

Verify token and get user data.

Headers:

```text
Authorization: Bearer <token>
```

### GET `/api/health`

Health check endpoint.

## Database Schema

### users table

- `id` - UUID primary key
- `email` - VARCHAR(255) unique
- `password_hash` - VARCHAR(255)
- `full_name` - VARCHAR(255)
- `role` - VARCHAR(50) ('admin', 'analyst', 'viewer')
- `is_active` - BOOLEAN
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### password_reset_tokens table

- `id` - UUID primary key
- `user_id` - UUID foreign key to users
- `token` - VARCHAR(255) unique
- `expires_at` - TIMESTAMP
- `used` - BOOLEAN
- `created_at` - TIMESTAMP

## Development

```bash
# Run with auto-reload
npm run dev

# Run in production
npm start
```

## Security Notes

- JWT tokens expire in 7 days
- Passwords are hashed using bcrypt (salt rounds: 10)
- **Change JWT_SECRET in production!**
- Password reset tokens expire in 1 hour
