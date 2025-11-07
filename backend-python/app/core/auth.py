"""
JWT authentication middleware for ITSM AI Backend.
Validates JWT tokens issued by the Node.js backend.
"""
import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Optional
from app.core.config import get_settings

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


async def validate_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict:
    """
    FastAPI dependency for JWT validation.
    
    Args:
        credentials: HTTP Bearer credentials from request
        
    Returns:
        Decoded token payload with user information
        
    Raises:
        HTTPException: If token is invalid
    """
    token = credentials.credentials
    return jwt_validator.decode_token(token)


async def get_current_user(token_data: Dict = Security(validate_token)) -> Dict:
    """
    Extract current user from validated token.
    
    Args:
        token_data: Decoded token payload
        
    Returns:
        User information dictionary
    """
    return {
        "id": token_data.get("id"),
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
