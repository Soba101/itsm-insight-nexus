/**
 * API error handling utilities
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Handles API errors and returns user-friendly messages
 */
export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof ValidationError) {
    return `Validation error: ${error.message}`;
  }

  if (error instanceof AuthenticationError) {
    return 'Please log in to continue';
  }

  if (error instanceof NetworkError) {
    return 'Unable to connect to the server. Please check your connection.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

/**
 * Logs errors appropriately based on environment
 */
export const logError = (error: unknown, context?: string): void => {
  const prefix = context ? `[${context}]` : '[Error]';
  
  if (process.env.NODE_ENV === 'development') {
    console.error(prefix, error);
  } else {
    // In production, you might want to send to error tracking service
    // Example: Sentry.captureException(error);
    console.error(prefix, error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Wraps an async function with error handling
 */
export const withErrorHandling = <T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: string
): T => {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw error;
    }
  }) as T;
};

/**
 * Checks if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof NetworkError) return true;
  if (error instanceof Error) {
    return error.message.includes('network') || 
           error.message.includes('fetch') ||
           error.message.includes('ECONNREFUSED');
  }
  return false;
};

/**
 * Checks if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  if (error instanceof AuthenticationError) return true;
  if (error instanceof ApiError) {
    return error.statusCode === 401 || error.statusCode === 403;
  }
  return false;
};

/**
 * Retries a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i < maxRetries - 1 && isNetworkError(error)) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
};
