"""
Mobile API v2 - Read-Only Endpoints for Mobile Clients

This API surface provides:
- Multi-scale projections and price targets
- Interpretation in mobile-friendly format
- Model quality indicators
- Server-side enforced read-only access

All endpoints require mobile_viewer scope and reject non-GET requests.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import numpy as np

from backend.services.mobile_auth import (
    AuthenticatedUser,
    get_mobile_user,
    require_scope,
    check_rate_limit,
    filter_by_tenant
)
from backend.core.manifold_engine import (
    ManifoldEngine,
    MultiScaleAnalyzer,
    TimeScale,
    ManifoldMetrics
)
from backend.core.manifold_interpreter import (
    ManifoldInterpreter,
    ManifoldInterpretation,
    ManifoldPhase,
    ConductorReading,
    SingerReading
)
from backend.services.data_ingestion import DataIngestionService


# Initialize services
manifold_engine = ManifoldEngine()
multiscale_analyzer = MultiScaleAnalyzer()
manifold_interpreter = ManifoldInterpreter()
data_service = DataIngestionService()

# Create router with v2 prefix
router = APIRouter(
    prefix="/api/v2/mobile",
    tags=["Mobile API v2"],
    responses={
        401: {"description": "API key required"},
        403: {"description": "Insufficient permissions or read-only violation"},
        429: {"description": "Rate limit exceeded"}
    }
)


class HorizonScale(str, Enum):
    """Available analysis horizons for mobile"""
    MICRO = "micro"      # 1H - Ultra-short
    SHORT = "short"      # 4H - Intraday
    MEDIUM = "medium"    # 1D - Daily
    LONG = "long"        # 1W - Weekly
    MACRO = "macro"      # 1M - Monthly


# Scale mapping to backend TimeScale
HORIZON_TO_TIMESCALE = {
    HorizonScale.MICRO: TimeScale.INTRADAY,
    HorizonScale.SHORT: TimeScale.INTRADAY,
    HorizonScale.MEDIUM: TimeScale.DAILY,
    HorizonScale.LONG: TimeScale.WEEKLY,
    HorizonScale.MACRO: TimeScale.MONTHLY
}

HORIZON_TO_INTERVAL = {
    HorizonScale.MICRO: "1h",
    HorizonScale.SHORT: "4h",
    HorizonScale.MEDIUM: "1d",
    HorizonScale.LONG: "1w",
    HorizonScale.MACRO: "1M"
}


def calculate_model_quality(metrics: ManifoldMetrics) -> Dict[str, Any]:
    """
    Calculate model quality indicators for mobile display.

    Returns confidence metrics based on:
    - Data consistency (std deviation of recent values)
    - Signal clarity (separation of attractor levels)
    - Sample sufficiency (data points available)
    """
    # Data consistency - lower variance = higher quality
    curvature_std = float(np.std(metrics.curvature[-20:]))
    tension_std = float(np.std(metrics.tension[-20:]))
    consistency_score = max(0, min(100, int(100 * (1 / (1 + curvature_std + tension_std)))))

    # Signal clarity - distinct attractors = clearer signals
    if len(metrics.attractors) >= 2:
        attractor_prices = [a[0] for a in metrics.attractors[:3]]
        price_range = max(attractor_prices) - min(attractor_prices)
        avg_price = np.mean(metrics.prices)
        separation = price_range / avg_price if avg_price > 0 else 0
        clarity_score = min(100, int(separation * 1000))
    else:
        clarity_score = 50

    # Sample sufficiency
    sample_score = min(100, int(len(metrics.prices) / 2))

    # Overall quality
    overall = int((consistency_score * 0.4 + clarity_score * 0.3 + sample_score * 0.3))

    return {
        "overall": overall,
        "consistency": consistency_score,
        "signal_clarity": clarity_score,
        "sample_sufficiency": sample_score,
        "grade": "A" if overall >= 80 else "B" if overall >= 60 else "C" if overall >= 40 else "D"
    }


def calculate_price_projections(
    metrics: ManifoldMetrics,
    current_price: float,
    horizon: HorizonScale
) -> Dict[str, Any]:
    """
    Calculate projected price range and targets based on manifold analysis.

    Uses attractors as targets and tension/entropy for range estimation.
    """
    # Base volatility estimate from local entropy
    volatility = float(metrics.local_entropy[-1]) / 10  # Normalize

    # Adjust range based on horizon
    horizon_multipliers = {
        HorizonScale.MICRO: 0.5,
        HorizonScale.SHORT: 1.0,
        HorizonScale.MEDIUM: 2.0,
        HorizonScale.LONG: 4.0,
        HorizonScale.MACRO: 8.0
    }
    multiplier = horizon_multipliers.get(horizon, 1.0)

    # Calculate range based on volatility and tension
    tension_factor = 1 + abs(float(metrics.tension[-1])) * 0.2
    range_pct = volatility * multiplier * tension_factor * 100

    # Price range
    low_range = current_price * (1 - range_pct / 100)
    high_range = current_price * (1 + range_pct / 100)

    # Targets from attractors
    targets = []
    for price, strength in sorted(metrics.attractors, key=lambda x: -x[1])[:5]:
        distance_pct = (price - current_price) / current_price * 100
        targets.append({
            "price": round(float(price), 2),
            "strength": round(float(strength), 2),
            "distance_pct": round(distance_pct, 2),
            "direction": "above" if price > current_price else "below"
        })

    # Bias direction based on tension sign
    current_tension = float(metrics.tension[-1])
    if current_tension > 0.5:
        bias = "bullish"
        confidence = min(100, int(current_tension * 50))
    elif current_tension < -0.5:
        bias = "bearish"
        confidence = min(100, int(abs(current_tension) * 50))
    else:
        bias = "neutral"
        confidence = int(50 - abs(current_tension) * 30)

    return {
        "current_price": round(current_price, 2),
        "projected_range": {
            "low": round(low_range, 2),
            "high": round(high_range, 2),
            "range_pct": round(range_pct, 2)
        },
        "targets": targets,
        "directional_bias": {
            "direction": bias,
            "confidence": confidence
        },
        "horizon": horizon.value,
        "timestamp": datetime.utcnow().isoformat()
    }


def generate_interpretation_text(interpretation: ManifoldInterpretation) -> Dict[str, str]:
    """
    Generate mobile-friendly interpretation text using the repo's
    forensic labels and geometry language.
    """
    # Phase description mapping
    phase_descriptions = {
        ManifoldPhase.IMPULSE_LEG_SHARPENING: (
            "Impulse Phase",
            "The manifold is sharpening - curvature intensifying as directional conviction builds. "
            "Like a singer approaching a crescendo, the geometry is tightening."
        ),
        ManifoldPhase.SINGULARITY_FORMING: (
            "Singularity Alert",
            "Critical tension detected. The manifold cannot sustain this shape - "
            "expect Ricci flow (corrective redistribution) as the geometry cools."
        ),
        ManifoldPhase.RICCI_FLOW_SMOOTHING: (
            "Correction Phase",
            "Ricci flow in progress - the manifold is smoothing, redistributing tension. "
            "Psychological heat dissipating as the surface relaxes."
        ),
        ManifoldPhase.ATTRACTOR_CONVERGENCE: (
            "Convergence Phase",
            "The manifold is settling toward a natural attractor basin. "
            "Like water finding its level, price seeks geometric equilibrium."
        ),
        ManifoldPhase.STABLE_EQUILIBRIUM: (
            "Equilibrium Phase",
            "Stable manifold state. Low tension, calm entropy. "
            "The singer holds the note naturally - sustainable geometry."
        ),
        ManifoldPhase.COMPRESSION_BUILDING: (
            "Compression Building",
            "Directional pressure accumulating without release. "
            "The manifold stores tension - watch for sharp curvature when it breaks."
        )
    }

    phase_title, phase_detail = phase_descriptions.get(
        interpretation.current_phase,
        ("Transitional", "The manifold is reorganizing its geometric structure.")
    )

    # Conductor perspective
    conductor_descriptions = {
        ConductorReading.CRESCENDO: "Building toward climax - orchestral intensity rising",
        ConductorReading.DECRESCENDO: "Releasing from climax - energy dissipating",
        ConductorReading.SUSTAINED_TENSION: "Holding at intensity - dramatic pause",
        ConductorReading.REST_PHASE: "Rest between movements - calm interlude",
        ConductorReading.TRANSITIONAL: "Moving between states - composition evolving"
    }

    # Singer perspective
    singer_descriptions = {
        SingerReading.RESONANT_STABLE: "Note holds naturally - sustainable pitch",
        SingerReading.TENSION_CRACKLING: "Voice straining - about to break",
        SingerReading.HARMONIOUS_FLOW: "Smooth melodic flow - natural movement",
        SingerReading.DISSONANT_STRAIN: "Forced, unsustainable - resolve imminent"
    }

    return {
        "phase_title": phase_title,
        "phase_detail": phase_detail,
        "conductor_view": conductor_descriptions.get(
            interpretation.conductor_reading,
            "Observing the composition"
        ),
        "singer_view": singer_descriptions.get(
            interpretation.singer_reading,
            "Feeling the internal geometry"
        ),
        "curvature": interpretation.curvature_state,
        "tension": interpretation.tension_description,
        "entropy": interpretation.entropy_state,
        "wave_context": interpretation.wave_position or "Transitional structure",
        "narrative": interpretation.market_narrative,
        "warning": interpretation.tension_warning
    }


# ============== API ENDPOINTS ==============

@router.get("/health")
async def health_check():
    """Health check endpoint - no auth required"""
    return {
        "status": "healthy",
        "api_version": "v2",
        "service": "The Conductor's Manifold Mobile API",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/projections/{symbol}")
async def get_projections(
    symbol: str,
    horizon: HorizonScale = Query(HorizonScale.MEDIUM, description="Analysis horizon"),
    feed: str = Query("binanceus", description="Data feed"),
    user: AuthenticatedUser = Depends(check_rate_limit)
) -> Dict[str, Any]:
    """
    Get price projections for a symbol at the specified horizon.

    Returns projected price range, targets, directional bias, and model quality.
    This is the primary mobile endpoint for price projection output.
    """
    try:
        # Fetch data with appropriate interval for horizon
        interval = HORIZON_TO_INTERVAL.get(horizon, "1d")
        market_data = await data_service.fetch_data(feed, symbol, interval, 100)

        if not market_data:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        data_arrays = data_service.to_numpy(market_data)

        # Analyze manifold
        timescale = HORIZON_TO_TIMESCALE.get(horizon, TimeScale.DAILY)
        metrics = manifold_engine.analyze(
            prices=data_arrays['prices'],
            timestamps=data_arrays['timestamps'],
            timescale=timescale,
            volume=data_arrays['volume']
        )

        # Get current price
        current_price = await data_service.get_current_price(feed, symbol)

        # Calculate projections
        projections = calculate_price_projections(metrics, current_price, horizon)

        # Calculate model quality
        quality = calculate_model_quality(metrics)

        return {
            "symbol": symbol,
            "feed": feed,
            "projections": projections,
            "model_quality": quality,
            "tenant_id": user.tenant_id,
            "cached": False
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Projection calculation failed: {str(e)}")


@router.get("/interpretation/{symbol}")
async def get_interpretation(
    symbol: str,
    horizon: HorizonScale = Query(HorizonScale.MEDIUM, description="Analysis horizon"),
    feed: str = Query("binanceus", description="Data feed"),
    user: AuthenticatedUser = Depends(check_rate_limit)
) -> Dict[str, Any]:
    """
    Get the Conductor's interpretation for a symbol.

    Returns plain-language interpretation using the repo's forensic labels
    and geometric terminology. Includes conductor/singer perspectives,
    phase diagnosis, and actionable narrative.
    """
    try:
        interval = HORIZON_TO_INTERVAL.get(horizon, "1d")
        market_data = await data_service.fetch_data(feed, symbol, interval, 100)

        if not market_data:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        data_arrays = data_service.to_numpy(market_data)

        # Analyze manifold
        timescale = HORIZON_TO_TIMESCALE.get(horizon, TimeScale.DAILY)
        metrics = manifold_engine.analyze(
            prices=data_arrays['prices'],
            timestamps=data_arrays['timestamps'],
            timescale=timescale,
            volume=data_arrays['volume']
        )

        # Get interpretation
        interpretation = manifold_interpreter.interpret(metrics)

        # Generate mobile-friendly text
        text = generate_interpretation_text(interpretation)

        return {
            "symbol": symbol,
            "horizon": horizon.value,
            "interpretation": text,
            "confidence": round(float(interpretation.phase_confidence) * 100, 1),
            "metrics": {
                "curvature": round(float(interpretation.curvature_value), 4),
                "entropy": round(float(interpretation.entropy_value), 2),
                "tension": round(float(interpretation.tension_value), 4)
            },
            "attractor": {
                "price": interpretation.nearest_attractor[0] if interpretation.nearest_attractor else None,
                "description": interpretation.nearest_attractor[1] if interpretation.nearest_attractor else None,
                "pull_strength": round(float(interpretation.attractor_pull_strength), 2)
            } if interpretation.nearest_attractor else None,
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interpretation failed: {str(e)}")


@router.get("/multiscale/{symbol}")
async def get_multiscale_analysis(
    symbol: str,
    feed: str = Query("binanceus", description="Data feed"),
    user: AuthenticatedUser = Depends(check_rate_limit)
) -> Dict[str, Any]:
    """
    Get multi-scale analysis across all horizons.

    Returns projections and interpretation for each scale,
    allowing users to see fractal consistency across timeframes.
    """
    try:
        # Fetch data for multi-scale analysis
        market_data = await data_service.fetch_data(feed, symbol, "1d", 200)

        if not market_data:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        data_arrays = data_service.to_numpy(market_data)

        # Get current price
        current_price = await data_service.get_current_price(feed, symbol)

        # Analyze across all scales
        multiscale_results = multiscale_analyzer.analyze_multiscale(
            prices=data_arrays['prices'],
            timestamps=data_arrays['timestamps']
        )

        # Build response for each scale
        scales = {}
        for horizon in [HorizonScale.MICRO, HorizonScale.SHORT, HorizonScale.MEDIUM, HorizonScale.LONG]:
            timescale = HORIZON_TO_TIMESCALE.get(horizon, TimeScale.DAILY)
            if timescale in multiscale_results:
                metrics = multiscale_results[timescale]

                # Calculate projections
                projections = calculate_price_projections(metrics, current_price, horizon)

                # Get interpretation
                interpretation = manifold_interpreter.interpret(metrics)
                text = generate_interpretation_text(interpretation)

                # Model quality
                quality = calculate_model_quality(metrics)

                scales[horizon.value] = {
                    "projections": projections,
                    "interpretation": {
                        "phase": text["phase_title"],
                        "summary": text["phase_detail"][:200],  # Truncate for mobile
                        "conductor": text["conductor_view"],
                        "singer": text["singer_view"],
                        "warning": text["warning"]
                    },
                    "quality": quality
                }

        return {
            "symbol": symbol,
            "feed": feed,
            "current_price": round(current_price, 2),
            "scales": scales,
            "fractal_analysis": {
                "consistency": _calculate_fractal_consistency(scales),
                "dominant_phase": _get_dominant_phase(scales)
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-scale analysis failed: {str(e)}")


@router.get("/pulse/{symbol}")
async def get_pulse(
    symbol: str,
    feed: str = Query("binanceus", description="Data feed"),
    user: AuthenticatedUser = Depends(check_rate_limit)
) -> Dict[str, Any]:
    """
    Get quick pulse check - lightweight endpoint for frequent polling.

    Returns essential metrics only: price, phase, tension level, nearest attractor.
    Optimized for mobile battery and bandwidth.
    """
    try:
        market_data = await data_service.fetch_data(feed, symbol, "1d", 50)

        if not market_data:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        data_arrays = data_service.to_numpy(market_data)

        # Quick analysis
        metrics = manifold_engine.analyze(
            data_arrays['prices'],
            data_arrays['timestamps'],
            volume=data_arrays['volume']
        )

        # Get current price
        current_price = await data_service.get_current_price(feed, symbol)

        # Find nearest attractor
        nearest = min(metrics.attractors, key=lambda a: abs(a[0] - current_price))
        distance_pct = (nearest[0] - current_price) / current_price * 100

        # Determine phase (simplified)
        tension = float(metrics.tension[-1])
        entropy = float(metrics.local_entropy[-1])

        if abs(tension) > 1.5:
            phase = "high_tension"
        elif entropy > 5:
            phase = "chaotic"
        elif abs(tension) < 0.5 and entropy < 3:
            phase = "stable"
        else:
            phase = "transitional"

        return {
            "symbol": symbol,
            "price": round(current_price, 2),
            "phase": phase,
            "tension": round(tension, 3),
            "entropy": round(entropy, 2),
            "nearest_attractor": {
                "price": round(float(nearest[0]), 2),
                "distance_pct": round(distance_pct, 2)
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pulse check failed: {str(e)}")


@router.get("/symbols")
async def list_available_symbols(
    feed: str = Query("binanceus", description="Data feed"),
    user: AuthenticatedUser = Depends(get_mobile_user)
) -> Dict[str, Any]:
    """List commonly available symbols for the selected feed"""
    symbols_by_feed = {
        "binanceus": [
            {"symbol": "BTCUSDT", "name": "Bitcoin", "type": "crypto"},
            {"symbol": "ETHUSDT", "name": "Ethereum", "type": "crypto"},
            {"symbol": "SOLUSDT", "name": "Solana", "type": "crypto"},
            {"symbol": "XRPUSDT", "name": "XRP", "type": "crypto"},
            {"symbol": "ADAUSDT", "name": "Cardano", "type": "crypto"},
            {"symbol": "DOGEUSDT", "name": "Dogecoin", "type": "crypto"},
        ],
        "alphavantage": [
            {"symbol": "AAPL", "name": "Apple", "type": "stock"},
            {"symbol": "MSFT", "name": "Microsoft", "type": "stock"},
            {"symbol": "GOOGL", "name": "Google", "type": "stock"},
            {"symbol": "AMZN", "name": "Amazon", "type": "stock"},
            {"symbol": "TSLA", "name": "Tesla", "type": "stock"},
            {"symbol": "NVDA", "name": "NVIDIA", "type": "stock"},
        ],
        "coingecko": [
            {"symbol": "bitcoin", "name": "Bitcoin", "type": "crypto"},
            {"symbol": "ethereum", "name": "Ethereum", "type": "crypto"},
            {"symbol": "solana", "name": "Solana", "type": "crypto"},
        ]
    }

    return {
        "feed": feed,
        "symbols": symbols_by_feed.get(feed, []),
        "note": "Enter custom symbols directly - these are suggestions"
    }


# ============== TEST ENDPOINT FOR WRITE REJECTION ==============

@router.post("/test-write")
async def test_write_endpoint(
    user: AuthenticatedUser = Depends(get_mobile_user)
):
    """
    Test endpoint to verify read-only enforcement.
    This should ALWAYS return 403 Forbidden for mobile_viewer role.
    """
    # This line should never execute for mobile_viewer
    return {"error": "This should not be reachable for read-only users"}


@router.put("/test-write")
async def test_put_endpoint(
    user: AuthenticatedUser = Depends(get_mobile_user)
):
    """Test PUT - should be rejected for mobile_viewer"""
    return {"error": "This should not be reachable for read-only users"}


@router.delete("/test-write")
async def test_delete_endpoint(
    user: AuthenticatedUser = Depends(get_mobile_user)
):
    """Test DELETE - should be rejected for mobile_viewer"""
    return {"error": "This should not be reachable for read-only users"}


# ============== HELPER FUNCTIONS ==============

def _calculate_fractal_consistency(scales: Dict) -> int:
    """Calculate how consistent the phase is across scales"""
    if not scales:
        return 0

    phases = [s.get("interpretation", {}).get("phase", "") for s in scales.values()]
    if not phases:
        return 0

    # Count most common phase
    from collections import Counter
    counter = Counter(phases)
    most_common_count = counter.most_common(1)[0][1] if counter else 0

    return int((most_common_count / len(phases)) * 100)


def _get_dominant_phase(scales: Dict) -> str:
    """Get the most common phase across scales"""
    if not scales:
        return "unknown"

    phases = [s.get("interpretation", {}).get("phase", "") for s in scales.values()]
    if not phases:
        return "unknown"

    from collections import Counter
    counter = Counter(phases)
    return counter.most_common(1)[0][0] if counter else "unknown"


# Export router
__all__ = ['router']
