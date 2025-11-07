"""
JWT authentication middleware for ITSM AI Backend.
Validates JWT tokens issued by the Node.js backend.
"""
from jose import jwt, JWTError
import logging
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)

security = HTTPBearer()


class JWTValidator:
    """JWT token validation."""
    
    def __init__(self):
        self.settings = get_settings()
        self.secret = self.settings.jwt_secret
        self.algorithm = self.settings.jwt_algorithm
    
    def decode_token(self, token: str) -> Dict:
        """
        Decode and validate JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )


jwt_validator = JWTValidator()


async def validate_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """
    Validate JWT token and return decoded data.
    Raises HTTPException if token is invalid.
    """
    if not credentials:
        logger.warning("No credentials provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    try:
        token = credentials.credentials
        settings = get_settings()
        logger.info(f"Attempting to decode token. First 20 chars: {token[:20]}...")
        logger.info(f"Using JWT_SECRET: {settings.jwt_secret[:20]}...")
        
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        logger.info(f"Token validated successfully! Payload: {payload}")
        return payload
    except JWTError as e:
        logger.error(f"JWT error: {type(e).__name__} - {str(e)}")
        logger.error(f"Token that failed: {token[:50]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    except Exception as e:
        logger.error(f"Unexpected token validation error: {type(e).__name__} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )


async def get_current_user(token_data: Dict = Security(validate_token)) -> Dict:
    """
    Extract current user from validated token.
    
    Args:
        token_data: Decoded token payload
        
    Returns:
        User information dictionary
    """
    # Node backend uses UUID strings for id, keep as-is
    return {
        "id": token_data.get("id"),  # Can be UUID string or int
        "email": token_data.get("email"),
        "role": token_data.get("role", "user"),
    }


async def validate_token_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(
        HTTPBearer(auto_error=False)
    )
) -> Optional[Dict]:
    """
    Optional JWT validation (doesn't require auth).
    
    Args:
        credentials: HTTP Bearer credentials from request (optional)
        
    Returns:
        Decoded token payload if provided, None otherwise
    """
    if not credentials:
        return None
    
    try:
        return jwt_validator.decode_token(credentials.credentials)
    except HTTPException:
        return None
