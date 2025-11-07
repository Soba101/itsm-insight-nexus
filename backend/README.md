# ITSM Backend Authentication API

Backend API server for ITSM Insight Nexus authentication using Docker Postgres.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

The `.env` file is already configured with default Docker Postgres credentials.

If needed, you can modify:
- `PORT` - API server port (default: 3001)
- `JWT_SECRET` - Secret key for JWT tokens (change in production!)
- `DB_*` - Database connection settings

### 3. Run Database Migration

Make sure Docker Postgres is running (`docker-compose up -d`), then:

```bash
node run-migration.js
```

This will:
- Create the `users` and `password_reset_tokens` tables
- Create a test admin user

### 4. Start the Server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

## Test Credentials

After running the migration:

```
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
```
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
```
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
