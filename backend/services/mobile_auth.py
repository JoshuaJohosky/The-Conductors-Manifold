"""
Mobile Authentication Service - Role-Based Access Control

Implements server-side read-only enforcement for mobile clients.
The mobile_viewer scope is restricted to GET requests only.
"""

from fastapi import Security, HTTPException, status, Request, Depends
from fastapi.security import APIKeyHeader
from typing import Optional, Literal
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import os
import secrets
import hashlib
import json
from dotenv import load_dotenv

load_dotenv()


class UserRole(str, Enum):
    """User roles with different access levels"""
    ADMIN = "admin"  # Full access
    ANALYST = "analyst"  # Read + limited write
    MOBILE_VIEWER = "mobile_viewer"  # Read-only, mobile API only
    DEMO = "demo"  # Rate-limited read-only


@dataclass
class AuthenticatedUser:
    """Represents an authenticated user/session"""
    user_id: str
    tenant_id: str
    role: UserRole
    scopes: list[str]
    created_at: datetime
    expires_at: Optional[datetime] = None


# API key header for mobile clients
mobile_api_key_header = APIKeyHeader(name="X-MOBILE-API-KEY", auto_error=False)
tenant_header = APIKeyHeader(name="X-TENANT-ID", auto_error=False)

# Environment configuration
MOBILE_API_SECRET = os.getenv("MOBILE_API_SECRET", "mobile_dev_secret_change_in_prod")
DEMO_API_KEY = os.getenv("DEMO_API_KEY", "demo_mobile_key")

# In-memory store for development (use Redis/DB in production)
_mobile_sessions: dict[str, AuthenticatedUser] = {}
_api_keys: dict[str, dict] = {
    # Default demo key for testing
    "demo_mobile_key": {
        "user_id": "demo_user",
        "tenant_id": "demo_tenant",
        "role": UserRole.DEMO,
        "scopes": ["read:manifold", "read:interpretation", "read:projections"]
    }
}


def generate_mobile_api_key(
    user_id: str,
    tenant_id: str,
    role: UserRole = UserRole.MOBILE_VIEWER
) -> str:
    """
    Generate a new mobile API key for a user.

    Args:
        user_id: Unique user identifier
        tenant_id: Tenant/organization identifier
        role: User role (defaults to mobile_viewer)

    Returns:
        API key string
    """
    # Generate secure random key
    raw_key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(f"{raw_key}{MOBILE_API_SECRET}".encode()).hexdigest()[:16]
    api_key = f"cm_{key_hash}_{raw_key[:16]}"  # cm = conductor mobile

    # Define scopes based on role
    scopes_by_role = {
        UserRole.ADMIN: ["read:*", "write:*"],
        UserRole.ANALYST: ["read:*", "write:alerts"],
        UserRole.MOBILE_VIEWER: ["read:manifold", "read:interpretation", "read:projections"],
        UserRole.DEMO: ["read:manifold", "read:interpretation", "read:projections"]
    }

    # Store key metadata
    _api_keys[api_key] = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "scopes": scopes_by_role.get(role, []),
        "created_at": datetime.utcnow().isoformat()
    }

    return api_key


def validate_api_key(api_key: str) -> Optional[AuthenticatedUser]:
    """Validate an API key and return user info if valid"""
    if api_key not in _api_keys:
        return None

    key_data = _api_keys[api_key]
    return AuthenticatedUser(
        user_id=key_data["user_id"],
        tenant_id=key_data["tenant_id"],
        role=key_data["role"] if isinstance(key_data["role"], UserRole) else UserRole(key_data["role"]),
        scopes=key_data["scopes"],
        created_at=datetime.fromisoformat(key_data.get("created_at", datetime.utcnow().isoformat()))
    )


async def get_mobile_user(
    request: Request,
    api_key: Optional[str] = Security(mobile_api_key_header),
    tenant_id: Optional[str] = Security(tenant_header)
) -> AuthenticatedUser:
    """
    Dependency to get authenticated mobile user.

    Validates API key and enforces read-only for mobile_viewer role.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mobile API key required. Set X-MOBILE-API-KEY header.",
            headers={"WWW-Authenticate": "ApiKey"}
        )

    user = validate_api_key(api_key)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )

    # Enforce read-only for mobile_viewer and demo roles
    if user.role in [UserRole.MOBILE_VIEWER, UserRole.DEMO]:
        if request.method not in ["GET", "HEAD", "OPTIONS"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Mobile viewer role is read-only. {request.method} requests are not permitted."
            )

    # Validate tenant_id matches if provided
    if tenant_id and tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant ID mismatch"
        )

    return user


def require_scope(required_scope: str):
    """Dependency factory to require a specific scope"""
    async def check_scope(user: AuthenticatedUser = Depends(get_mobile_user)):
        # Check for wildcard scopes
        if "read:*" in user.scopes or "write:*" in user.scopes:
            return user

        # Check for specific scope
        if required_scope not in user.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Scope '{required_scope}' required"
            )
        return user

    return check_scope


# Utility functions for tenant isolation
def filter_by_tenant(data: dict, tenant_id: str) -> dict:
    """Filter data to only include tenant-specific information"""
    # For now, pass through - in production this would filter DB queries
    return data


class RateLimiter:
    """Simple in-memory rate limiter for mobile API"""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self._requests: dict[str, list[datetime]] = {}

    def check_rate_limit(self, key: str) -> bool:
        """Check if request is within rate limit"""
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)

        if key not in self._requests:
            self._requests[key] = []

        # Clean old requests
        self._requests[key] = [t for t in self._requests[key] if t > minute_ago]

        # Check limit
        if len(self._requests[key]) >= self.requests_per_minute:
            return False

        # Record request
        self._requests[key].append(now)
        return True


rate_limiter = RateLimiter(requests_per_minute=120)


async def check_rate_limit(user: AuthenticatedUser = Depends(get_mobile_user)):
    """Rate limit dependency for mobile API"""
    # Demo users get stricter limits
    limit = 30 if user.role == UserRole.DEMO else 120

    limiter = RateLimiter(requests_per_minute=limit)
    key = f"{user.tenant_id}:{user.user_id}"

    if not rate_limiter.check_rate_limit(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait before making more requests."
        )

    return user


# Export
__all__ = [
    'UserRole',
    'AuthenticatedUser',
    'get_mobile_user',
    'require_scope',
    'generate_mobile_api_key',
    'validate_api_key',
    'check_rate_limit',
    'filter_by_tenant'
]
