"""
ITSM Insight Nexus - AI Backend Service
FastAPI application with JWT authentication and health check endpoint.
"""
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Optional
import logging

from app.core.config import get_settings
from app.core.auth import get_current_user, validate_token_optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="ITSM AI Backend",
    description="AI-powered ticket classification, sentiment analysis, and RAG capabilities",
    version=settings.service_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",  # Vite dev server
        "http://localhost:5173",  # Alternative Vite port
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logger.info(f"🚀 Starting {settings.service_name} v{settings.service_version}")
    logger.info(f"📝 Log level: {settings.log_level}")
    logger.info(f"🔐 JWT authentication enabled")
    logger.info(f"📊 API docs available at /docs")


@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown information."""
    logger.info(f"🛑 Shutting down {settings.service_name}")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running",
        "docs": "/docs",
        "health": "/api/ai/health",
    }


@app.get("/api/ai/health", tags=["Health"], status_code=status.HTTP_200_OK)
async def health_check(
    user: Optional[Dict] = Depends(validate_token_optional)
):
    """
    Health check endpoint.
    
    This endpoint can be called with or without authentication.
    If a valid JWT token is provided, it returns user information.
    
    Returns:
        Health status and service information
    """
    response = {
        "status": "ok",
        "service": settings.service_name,
        "version": settings.service_version,
        "authenticated": user is not None,
    }
    
    # Include user info if authenticated
    if user:
        response["user"] = {
            "id": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role"),
        }
        logger.info(f"Health check from authenticated user: {user.get('email')}")
    else:
        logger.info("Health check from unauthenticated request")
    
    return response


@app.get("/api/ai/status", tags=["Health"])
async def status_check(user: Dict = Depends(get_current_user)):
    """
    Protected status endpoint (requires authentication).
    
    Args:
        user: Current authenticated user
        
    Returns:
        Detailed status information for authenticated users
    """
    logger.info(f"Status check requested by: {user.get('email')}")
    
    return {
        "status": "operational",
        "service": settings.service_name,
        "version": settings.service_version,
        "features": {
            "classification": "planned",
            "sentiment": "planned",
            "duplicates": "planned",
            "rag": "planned",
        },
        "user": user,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "service": settings.service_name,
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower()
    )
