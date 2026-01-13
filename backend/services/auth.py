"""
Authentication Service - Simplified

Single master key approach for MVP testing.
Upgrade to tiered system later when monetizing.
"""

from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
import os
from dotenv import load_dotenv

load_dotenv()

# Define the header key
api_key_header = APIKeyHeader(name="X-CONDUCTOR-KEY", auto_error=False)

# Get the Master Key from environment or use a fallback for local dev
MASTER_KEY = os.getenv("CONDUCTOR_API_KEY", "conductor_dev_secret")

async def get_api_key(api_key_header: str = Security(api_key_header)):
    """
    Validates the API Key from the request header.
    """
    if api_key_header == MASTER_KEY:
        return api_key_header

    # If key is missing or wrong
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="ACCESS DENIED: INVALID CONDUCTOR CREDENTIALS"
    )
