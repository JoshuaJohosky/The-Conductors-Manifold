"""
The Conductor's Manifold - Main Entry Point

Run with: python -m backend.main
Or: uvicorn backend.main:app --reload
"""

from backend.api.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
