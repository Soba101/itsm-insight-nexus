"""
Error handling middleware and utilities for Python backend
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging
from typing import Union

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base API error class"""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ValidationException(APIError):
    """Validation error"""
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY)


class AuthenticationException(APIError):
    """Authentication error"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


class NotFoundException(APIError):
    """Resource not found error"""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class DatabaseException(APIError):
    """Database error"""
    def __init__(self, message: str = "Database error occurred"):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """
    Handler for custom API errors
    """
    logger.error(f"API Error: {exc.message} - Status: {exc.status_code}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "status_code": exc.status_code,
        }
    )


async def validation_exception_handler(
    request: Request, 
    exc: Union[RequestValidationError, ValidationError]
) -> JSONResponse:
    """
    Handler for Pydantic validation errors
    """
    logger.warning(f"Validation error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": exc.errors() if hasattr(exc, 'errors') else str(exc),
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler for unhandled exceptions
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    # Don't expose internal error details in production
    import os
    is_development = os.getenv("ENVIRONMENT", "production") == "development"
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            **({"details": str(exc)} if is_development else {}),
        }
    )


def log_error(error: Exception, context: str = "") -> None:
    """
    Log error with context
    
    Args:
        error: Exception to log
        context: Additional context information
    """
    prefix = f"[{context}]" if context else ""
    logger.error(f"{prefix} {type(error).__name__}: {str(error)}", exc_info=True)


def handle_database_error(error: Exception) -> None:
    """
    Handle database errors
    
    Args:
        error: Database exception
        
    Raises:
        DatabaseException: Wrapped database error
    """
    log_error(error, "Database")
    raise DatabaseException("A database error occurred. Please try again later.")


def handle_external_api_error(error: Exception, service_name: str = "External API") -> None:
    """
    Handle errors from external API calls
    
    Args:
        error: Exception from external API
        service_name: Name of the external service
        
    Raises:
        APIError: Wrapped external API error
    """
    log_error(error, service_name)
    raise APIError(
        f"Error communicating with {service_name}. Please try again later.",
        status.HTTP_503_SERVICE_UNAVAILABLE
    )
