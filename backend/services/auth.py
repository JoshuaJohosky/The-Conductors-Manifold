"""
Authentication and Authorization Service

Implements tiered access control for The Conductor's Manifold:
- Tier 1: Continuous Readout (basic access)
- Tier 2: Deep Analysis (advanced features)
- Tier 3: Targeted Insight (full API access)
"""

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from typing import Optional
import os
from enum import Enum


class AccessTier(Enum):
    """Access tier levels"""
    CONTINUOUS_READOUT = "continuous_readout"
    DEEP_ANALYSIS = "deep_analysis"
    TARGETED_INSIGHT = "targeted_insight"
    ADMIN = "admin"


# API Key configuration
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

# In production, store these in a database with hashed keys
# For now, use environment variables
API_KEYS = {
    os.getenv("TIER_1_KEY", "demo_continuous_readout_key"): AccessTier.CONTINUOUS_READOUT,
    os.getenv("TIER_2_KEY", "demo_deep_analysis_key"): AccessTier.DEEP_ANALYSIS,
    os.getenv("TIER_3_KEY", "demo_targeted_insight_key"): AccessTier.TARGETED_INSIGHT,
    os.getenv("ADMIN_KEY", "demo_admin_key"): AccessTier.ADMIN,
}


def get_access_tier(api_key: Optional[str]) -> AccessTier:
    """
    Determine access tier from API key.

    Args:
        api_key: API key from request header

    Returns:
        AccessTier enum

    Raises:
        HTTPException: If key is invalid
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required. Include X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    tier = API_KEYS.get(api_key)
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )

    return tier


async def require_tier(
    required_tier: AccessTier,
    api_key: str = Security(API_KEY_HEADER)
) -> AccessTier:
    """
    Dependency that requires a minimum access tier.

    Args:
        required_tier: Minimum tier required
        api_key: API key from header

    Returns:
        User's access tier

    Raises:
        HTTPException: If insufficient access
    """
    user_tier = get_access_tier(api_key)

    # Tier hierarchy
    tier_levels = {
        AccessTier.CONTINUOUS_READOUT: 1,
        AccessTier.DEEP_ANALYSIS: 2,
        AccessTier.TARGETED_INSIGHT: 3,
        AccessTier.ADMIN: 4
    }

    if tier_levels[user_tier] < tier_levels[required_tier]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Requires {required_tier.value} tier or higher."
        )

    return user_tier


async def require_continuous_readout(api_key: str = Security(API_KEY_HEADER)) -> AccessTier:
    """Require Continuous Readout tier (Tier 1+)"""
    return await require_tier(AccessTier.CONTINUOUS_READOUT, api_key)


async def require_deep_analysis(api_key: str = Security(API_KEY_HEADER)) -> AccessTier:
    """Require Deep Analysis tier (Tier 2+)"""
    return await require_tier(AccessTier.DEEP_ANALYSIS, api_key)


async def require_targeted_insight(api_key: str = Security(API_KEY_HEADER)) -> AccessTier:
    """Require Targeted Insight tier (Tier 3+)"""
    return await require_tier(AccessTier.TARGETED_INSIGHT, api_key)


async def require_admin(api_key: str = Security(API_KEY_HEADER)) -> AccessTier:
    """Require Admin access"""
    return await require_tier(AccessTier.ADMIN, api_key)


async def optional_auth(api_key: Optional[str] = Security(API_KEY_HEADER)) -> Optional[AccessTier]:
    """
    Optional authentication - returns tier if valid key provided, None otherwise.
    Useful for endpoints that offer enhanced features to authenticated users.
    """
    if not api_key:
        return None

    try:
        return get_access_tier(api_key)
    except HTTPException:
        return None


class RateLimiter:
    """
    Simple in-memory rate limiter.
    In production, use Redis for distributed rate limiting.
    """

    def __init__(self):
        self.requests = {}  # {api_key: [(timestamp, count)]}
        self.limits = {
            AccessTier.CONTINUOUS_READOUT: 100,  # 100 req/hour
            AccessTier.DEEP_ANALYSIS: 500,  # 500 req/hour
            AccessTier.TARGETED_INSIGHT: 2000,  # 2000 req/hour
            AccessTier.ADMIN: 10000  # 10000 req/hour
        }

    async def check_rate_limit(self, api_key: str, tier: AccessTier):
        """
        Check if request is within rate limit.

        Args:
            api_key: API key
            tier: Access tier

        Raises:
            HTTPException: If rate limit exceeded
        """
        import time

        current_time = time.time()
        hour_ago = current_time - 3600

        # Clean old entries
        if api_key in self.requests:
            self.requests[api_key] = [
                (ts, count) for ts, count in self.requests[api_key]
                if ts > hour_ago
            ]
        else:
            self.requests[api_key] = []

        # Count requests in last hour
        total_requests = sum(count for _, count in self.requests[api_key])

        limit = self.limits[tier]
        if total_requests >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Tier {tier.value}: {limit} requests/hour."
            )

        # Add current request
        self.requests[api_key].append((current_time, 1))


# Global rate limiter instance
rate_limiter = RateLimiter()


async def check_rate_limit(
    api_key: str = Security(API_KEY_HEADER),
    tier: AccessTier = None
):
    """
    Dependency to check rate limits.

    Args:
        api_key: API key from header
        tier: User's access tier (determined from key)
    """
    if not tier:
        tier = get_access_tier(api_key)

    await rate_limiter.check_rate_limit(api_key, tier)


# Export main functions
__all__ = [
    'AccessTier',
    'get_access_tier',
    'require_continuous_readout',
    'require_deep_analysis',
    'require_targeted_insight',
    'require_admin',
    'optional_auth',
    'check_rate_limit',
    'API_KEY_HEADER'
]
