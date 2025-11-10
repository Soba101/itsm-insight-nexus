# Validation and Error Handling Guide

This document describes the validation and error handling patterns implemented across the ITSM Insight Nexus application.

## Overview

The application implements comprehensive validation and error handling at multiple layers:

1. **Frontend Validation** (TypeScript/React)
2. **Backend-Auth Validation** (Node.js/Express)
3. **Backend-Python Validation** (FastAPI/Pydantic)

## Frontend Validation

### Validation Utilities (`src/lib/validation.ts`)

The validation module provides runtime type checking and data validation:

```typescript
import { validateData, ticketSchema, isValidEmail } from '@/lib/validation';

// Validate email
if (!isValidEmail(email)) {
  // Handle invalid email
}

// Validate API response
const validatedTicket = validateData(apiResponse, ticketSchema);
```

#### Available Validators

- `isValidUrl(url: string)`: Validates URL format
- `isValidEmail(email: string)`: Validates email format
- `validatePassword(password: string)`: Checks password strength
- `sanitizeInput(input: string)`: Prevents XSS attacks
- `validateFormInput(value, fieldName, required)`: General form validation

#### Validation Schemas

- `ticketSchema`: Validates ticket data structure
- `kpiSchema`: Validates KPI data
- `systemSettingsSchema`: Validates system settings
- `userPreferencesSchema`: Validates user preferences

### Error Handling (`src/lib/errorHandling.ts`)

Custom error classes and handlers:

```typescript
import { ApiError, ValidationError, handleApiError } from '@/lib/errorHandling';

try {
  // API call
} catch (error) {
  const message = handleApiError(error);
  toast.error(message);
}
```

#### Error Classes

- `ApiError`: API-related errors with status codes
- `ValidationError`: Input validation errors
- `AuthenticationError`: Authentication failures
- `NetworkError`: Network connectivity issues

#### Utilities

- `handleApiError(error)`: Convert errors to user-friendly messages
- `logError(error, context)`: Safe error logging
- `withErrorHandling(fn, context)`: Wrap functions with error handling
- `retryWithBackoff(fn, maxRetries)`: Retry failed operations

### Error Boundaries (`src/components/ErrorBoundary.tsx`)

React error boundaries catch and handle component errors:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary onError={(error, info) => logToService(error, info)}>
  <YourComponent />
</ErrorBoundary>
```

### Configuration Validation (`src/lib/configValidation.ts`)

Validates application settings:

```typescript
import { validateSettings, loadSettings } from '@/lib/configValidation';

// Load and validate settings
const settings = loadSettings('itsm-settings');

// Validate before saving
saveSettings('itsm-settings', newSettings);
```

### Logging (`src/lib/logger.ts`)

Production-safe logging:

```typescript
import { logger } from '@/lib/logger';

logger.debug('Debug message'); // Only in development
logger.info('Info message');   // Only in development
logger.warn('Warning');         // Always logged
logger.error('Error', error);   // Always logged
logger.api('GET', '/api/tickets', data); // Only in development
```

## Backend-Auth Validation (Node.js)

### Validation Middleware (`backend-auth/validation.js`)

Input validation and sanitization:

```javascript
import { validateRegistration, validateLogin } from './validation.js';

app.post('/api/auth/register', validateRegistration, async (req, res) => {
  // Validated and sanitized input in req.body
});
```

#### Available Validators

- `validateRegistration`: Validates registration input (email, password, full_name)
- `validateLogin`: Validates login input (email, password)
- `validatePasswordReset`: Validates password reset requests
- `validatePasswordUpdate`: Validates password updates
- `rateLimit(maxRequests, windowMs)`: Rate limiting middleware

#### Password Requirements

Passwords must:
- Be at least 8 characters long
- Contain at least one uppercase letter
- Contain at least one lowercase letter
- Contain at least one number

#### Rate Limiting

Authentication endpoints are protected with rate limiting:
- Maximum 10 requests per minute per IP address
- Returns 429 (Too Many Requests) when exceeded

### Error Handling

```javascript
import { errorHandler } from './validation.js';

// Add at the end of middleware chain
app.use(errorHandler);
```

## Backend-Python Validation (FastAPI)

### Validation Schemas (`backend-python/app/core/validation.py`)

Pydantic models for request validation:

```python
from app.core.validation import SimilaritySearchRequest, validate_request_data

# Automatic validation with Pydantic
@app.post("/api/similarity/search")
async def search(request: SimilaritySearchRequest):
    # request is already validated
    pass
```

#### Available Schemas

- `SimilaritySearchRequest`: Validates similarity search parameters
- `EmbeddingRequest`: Validates embedding generation requests
- `TicketRelationshipRequest`: Validates relationship requests

#### Validation Functions

- `validate_similarity_threshold(threshold)`: Validates threshold (0.0-1.0)
- `validate_top_k(top_k)`: Validates top_k parameter (1-100)
- `validate_model_name(model)`: Validates model name (qwen3, gemma)

### Error Handlers (`backend-python/app/core/error_handlers.py`)

Custom exception handlers:

```python
from app.core.error_handlers import APIError, ValidationException

# Raise custom errors
if not valid:
    raise ValidationException("Invalid input")

# Errors are automatically caught and formatted
```

#### Error Classes

- `APIError`: Base API error
- `ValidationException`: Validation errors (422)
- `AuthenticationException`: Auth errors (401)
- `NotFoundException`: Not found errors (404)
- `DatabaseException`: Database errors (500)

## Best Practices

### Input Validation

1. **Always validate user input** at the entry point
2. **Use type-safe validation** (Zod for TypeScript, Pydantic for Python)
3. **Sanitize input** to prevent XSS and injection attacks
4. **Provide clear error messages** to users

### Error Handling

1. **Use try-catch blocks** for all async operations
2. **Log errors** with appropriate context
3. **Don't expose internal errors** to users in production
4. **Use error boundaries** in React components
5. **Handle network errors** gracefully with retry logic

### Security

1. **Use parameterized queries** to prevent SQL injection
2. **Implement rate limiting** on authentication endpoints
3. **Validate JWT tokens** on protected routes
4. **Sanitize all user input** before processing
5. **Use HTTPS** in production
6. **Keep dependencies updated** to fix security vulnerabilities

### Logging

1. **Use the logger utility** instead of console.log
2. **Log errors with context** for debugging
3. **Don't log sensitive information** (passwords, tokens)
4. **Use appropriate log levels** (debug, info, warn, error)
5. **Send errors to monitoring service** in production

## Testing Validation

### Frontend Tests

```typescript
import { isValidEmail, validatePassword } from '@/lib/validation';

describe('Validation', () => {
  it('validates email correctly', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid')).toBe(false);
  });

  it('validates password strength', () => {
    const result = validatePassword('Weak1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at least 8 characters');
  });
});
```

### Backend Tests

```python
import pytest
from app.core.validation import SimilaritySearchRequest

def test_similarity_search_validation():
    # Valid request
    valid = SimilaritySearchRequest(
        incident_number="INC0010001",
        model="qwen3",
        top_k=5
    )
    assert valid.incident_number == "INC0010001"
    
    # Invalid request
    with pytest.raises(ValidationError):
        SimilaritySearchRequest(
            incident_number="",
            top_k=200  # Out of range
        )
```

## Migration Guide

To use the new validation system in existing code:

### Frontend

```typescript
// Before
try {
  const response = await api.getTickets();
  // Use response
} catch (error) {
  console.error('Error:', error);
  toast.error('Failed to load tickets');
}

// After
import { handleApiError, logError } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';

try {
  const response = await api.getTickets();
  // Use response
} catch (error) {
  logError(error, 'getTickets');
  const message = handleApiError(error);
  toast.error(message);
}
```

### Backend-Auth

```javascript
// Before
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  // Process login
});

// After
import { validateLogin, authRateLimit } from './validation.js';

app.post('/api/auth/login', authRateLimit, validateLogin, async (req, res) => {
  const { email, password } = req.body; // Already validated
  // Process login
});
```

### Backend-Python

```python
# Before
@app.post("/api/similarity/search")
async def search(request: dict):
    incident_number = request.get("incident_number")
    # Process search

# After
from app.core.validation import SimilaritySearchRequest

@app.post("/api/similarity/search")
async def search(request: SimilaritySearchRequest):
    # request is already validated
    # Access request.incident_number, request.model, etc.
```

## Troubleshooting

### Validation Errors

If you encounter validation errors:

1. Check the error message for specific field issues
2. Verify input format matches schema requirements
3. Check for required fields
4. Ensure data types are correct

### Type Errors

If TypeScript complains about types:

1. Import the correct types from validation modules
2. Use type assertions if necessary
3. Update schemas to match actual data structure

### Rate Limiting

If hitting rate limits:

1. Reduce request frequency
2. Implement client-side throttling
3. Contact admin to adjust limits if necessary

## Future Improvements

- [ ] Add comprehensive test suite for all validators
- [ ] Implement automatic API documentation from schemas
- [ ] Add request/response logging middleware
- [ ] Integrate with error tracking service (e.g., Sentry)
- [ ] Add performance monitoring
- [ ] Implement circuit breakers for external services
- [ ] Add input fuzzing for security testing
