"""
The Conductor's Manifold - FastAPI Backend

Main API server with REST endpoints and WebSocket support.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
from datetime import datetime
import asyncio
import json
import numpy as np

from backend.core.manifold_engine import (
    ManifoldEngine,
    MultiScaleAnalyzer,
    TimeScale,
    ManifoldMetrics
)
from backend.services.data_ingestion import (
    DataIngestionService,
    AlphaVantageDataFeed,
    BinanceDataFeed,
    MarketData
)


# Initialize FastAPI app
app = FastAPI(
    title="The Conductor's Manifold API",
    description="Real-time geometric analysis of complex systems",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
manifold_engine = ManifoldEngine()
multiscale_analyzer = MultiScaleAnalyzer()
data_service = DataIngestionService()

# WebSocket connection manager
class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Remove dead connections
                self.active_connections.remove(connection)


manager = ConnectionManager()


# Initialize data feeds on startup
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    # Register data feeds (use environment variables in production)
    data_service.register_feed(
        "alphavantage",
        AlphaVantageDataFeed(api_key="demo")
    )
    data_service.register_feed(
        "binance",
        BinanceDataFeed()
    )
    print("✨ The Conductor's Manifold API is online")


# Helper functions
def metrics_to_dict(metrics: ManifoldMetrics) -> dict:
    """Convert ManifoldMetrics to JSON-serializable dict"""
    return {
        "timestamp": metrics.timestamp.tolist(),
        "prices": metrics.prices.tolist(),
        "curvature": metrics.curvature.tolist(),
        "entropy": float(metrics.entropy),
        "local_entropy": metrics.local_entropy.tolist(),
        "singularities": metrics.singularities,
        "attractors": [
            {"price": float(p), "strength": float(s)}
            for p, s in metrics.attractors
        ],
        "ricci_flow": metrics.ricci_flow.tolist(),
        "tension": metrics.tension.tolist(),
        "timescale": metrics.timescale.value
    }


# REST API Endpoints

@app.get("/")
async def root():
    """API health check"""
    return {
        "service": "The Conductor's Manifold",
        "status": "online",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/v1/analyze/{symbol}")
async def analyze_symbol(
    symbol: str,
    feed: str = "binance",
    interval: str = "1d",
    limit: int = 100,
    timescale: str = "daily"
):
    """
    Analyze a symbol and return manifold metrics.

    Args:
        symbol: Trading symbol (e.g., 'BTCUSDT' for Binance, 'AAPL' for stocks)
        feed: Data feed to use ('binance' or 'alphavantage')
        interval: Time interval for data
        limit: Number of data points to analyze
        timescale: Analysis timescale ('daily', 'weekly', 'monthly', 'intraday')

    Returns:
        Complete manifold analysis results
    """
    try:
        # Fetch market data
        market_data = await data_service.fetch_data(feed, symbol, interval, limit)

        if not market_data:
            raise HTTPException(status_code=404, detail="No data found for symbol")

        # Convert to numpy
        data_arrays = data_service.to_numpy(market_data)

        # Perform manifold analysis
        metrics = manifold_engine.analyze(
            prices=data_arrays['prices'],
            timestamps=data_arrays['timestamps'],
            timescale=TimeScale(timescale),
            volume=data_arrays['volume']
        )

        # Convert to JSON-serializable format
        result = metrics_to_dict(metrics)
        result['symbol'] = symbol
        result['feed'] = feed

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/v1/multiscale/{symbol}")
async def analyze_multiscale(
    symbol: str,
    feed: str = "binance",
    interval: str = "1d",
    limit: int = 200
):
    """
    Perform multi-timeframe manifold analysis.

    Analyzes the symbol across monthly, weekly, daily, and intraday scales
    to reveal fractal consistency and cross-scale patterns.

    Returns:
        Dictionary of analyses for each timescale
    """
    try:
        # Fetch market data with more points for multi-scale
        market_data = await data_service.fetch_data(feed, symbol, interval, limit)

        if not market_data:
            raise HTTPException(status_code=404, detail="No data found for symbol")

        # Convert to numpy
        data_arrays = data_service.to_numpy(market_data)

        # Perform multi-scale analysis
        results = multiscale_analyzer.analyze_multiscale(
            prices=data_arrays['prices'],
            timestamps=data_arrays['timestamps']
        )

        # Convert all metrics to JSON
        response = {
            "symbol": symbol,
            "feed": feed,
            "scales": {}
        }

        for scale, metrics in results.items():
            response["scales"][scale.value] = metrics_to_dict(metrics)

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-scale analysis failed: {str(e)}")


@app.get("/api/v1/attractors/{symbol}")
async def get_attractors(
    symbol: str,
    feed: str = "binance",
    limit: int = 100
):
    """
    Get current attractor zones for a symbol.

    Attractors are natural resting points where the manifold tends to stabilize.
    These can be used as support/resistance levels.

    Returns:
        List of attractor price levels with strength indicators
    """
    try:
        market_data = await data_service.fetch_data(feed, symbol, "1d", limit)
        data_arrays = data_service.to_numpy(market_data)

        attractors = manifold_engine.find_attractors(
            data_arrays['prices'],
            data_arrays['volume']
        )

        return {
            "symbol": symbol,
            "current_price": float(data_arrays['prices'][-1]),
            "attractors": [
                {
                    "price": float(p),
                    "strength": float(s),
                    "distance_pct": float((p - data_arrays['prices'][-1]) / data_arrays['prices'][-1] * 100)
                }
                for p, s in attractors
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/singularities/{symbol}")
async def get_singularities(
    symbol: str,
    feed: str = "binance",
    limit: int = 100
):
    """
    Detect recent singularities (extreme tension points).

    Singularities indicate where the manifold reached unsustainable
    extremes and corrections occurred or are imminent.

    Returns:
        List of recent singularity events with context
    """
    try:
        market_data = await data_service.fetch_data(feed, symbol, "1d", limit)
        data_arrays = data_service.to_numpy(market_data)

        metrics = manifold_engine.analyze(
            data_arrays['prices'],
            data_arrays['timestamps'],
            volume=data_arrays['volume']
        )

        # Get singularity details
        singularities = []
        for idx in metrics.singularities:
            if idx < len(market_data):
                singularities.append({
                    "timestamp": market_data[idx].timestamp.isoformat(),
                    "price": float(metrics.prices[idx]),
                    "curvature": float(metrics.curvature[idx]),
                    "tension": float(metrics.tension[idx]),
                    "entropy": float(metrics.local_entropy[idx])
                })

        return {
            "symbol": symbol,
            "singularities": singularities,
            "count": len(singularities)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/pulse/{symbol}")
async def get_manifold_pulse(
    symbol: str,
    feed: str = "binance"
):
    """
    Get the current 'pulse' of the manifold - a quick health check.

    Returns key indicators:
    - Current entropy level (chaos vs stability)
    - Tension level
    - Distance to nearest attractor
    - Recent singularity count

    This is ideal for the "Continuous Readout" subscription tier.
    """
    try:
        market_data = await data_service.fetch_data(feed, symbol, "1d", 100)
        data_arrays = data_service.to_numpy(market_data)

        metrics = manifold_engine.analyze(
            data_arrays['prices'],
            data_arrays['timestamps'],
            volume=data_arrays['volume']
        )

        # Calculate pulse indicators
        current_price = float(data_arrays['prices'][-1])
        current_entropy = float(metrics.local_entropy[-1])
        current_tension = float(metrics.tension[-1])

        # Find nearest attractor
        nearest_attractor = min(
            metrics.attractors,
            key=lambda a: abs(a[0] - current_price)
        )
        distance_to_attractor = abs(nearest_attractor[0] - current_price)

        # Count recent singularities (last 20% of data)
        recent_threshold = int(len(metrics.singularities) * 0.8)
        recent_singularities = [s for s in metrics.singularities if s >= recent_threshold]

        return {
            "symbol": symbol,
            "timestamp": datetime.now().isoformat(),
            "pulse": {
                "current_price": current_price,
                "entropy": current_entropy,
                "entropy_level": "high" if current_entropy > 5 else "medium" if current_entropy > 3 else "low",
                "tension": current_tension,
                "tension_level": "high" if abs(current_tension) > 1.5 else "medium" if abs(current_tension) > 0.5 else "low",
                "nearest_attractor": {
                    "price": float(nearest_attractor[0]),
                    "distance": float(distance_to_attractor),
                    "distance_pct": float(distance_to_attractor / current_price * 100)
                },
                "recent_singularities": len(recent_singularities),
                "manifold_state": self._interpret_state(current_entropy, current_tension)
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    def _interpret_state(self, entropy: float, tension: float) -> str:
        """Interpret the overall manifold state"""
        if abs(tension) > 1.5:
            return "high_tension" if entropy > 5 else "compressed"
        elif entropy > 5:
            return "chaotic"
        elif abs(tension) < 0.5 and entropy < 3:
            return "stable"
        else:
            return "transitional"


# WebSocket endpoint for real-time updates
@app.websocket("/ws/realtime/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str, feed: str = "binance"):
    """
    WebSocket endpoint for real-time manifold updates.

    Streams continuous analysis updates as new data arrives.
    """
    await manager.connect(websocket)

    try:
        # Send initial state
        await websocket.send_json({
            "type": "connected",
            "symbol": symbol,
            "timestamp": datetime.now().isoformat()
        })

        # Real-time update loop
        while True:
            # Fetch latest data and analyze
            market_data = await data_service.fetch_data(feed, symbol, "1m", 100, use_cache=False)
            data_arrays = data_service.to_numpy(market_data)

            metrics = manifold_engine.analyze(
                data_arrays['prices'],
                data_arrays['timestamps'],
                volume=data_arrays['volume']
            )

            # Send update
            update = {
                "type": "update",
                "symbol": symbol,
                "timestamp": datetime.now().isoformat(),
                "data": metrics_to_dict(metrics)
            }

            await websocket.send_json(update)

            # Wait before next update
            await asyncio.sleep(60)  # Update every minute

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
