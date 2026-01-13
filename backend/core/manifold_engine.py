"""
The Conductor's Manifold - Core Mathematical Engine

This module implements the geometric analysis framework for interpreting
complex systems as living manifolds.

© 2025 Joshua Johosky. All Rights Reserved.
"""

import numpy as np
from scipy import signal, stats
from scipy.ndimage import gaussian_filter1d
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class TimeScale(Enum):
    """Temporal scales for multi-timeframe analysis"""
    MONTHLY = "monthly"
    WEEKLY = "weekly"
    DAILY = "daily"
    INTRADAY = "intraday"


@dataclass
class ManifoldMetrics:
    """Container for manifold analysis results"""
    timestamp: np.ndarray
    prices: np.ndarray
    curvature: np.ndarray
    entropy: float
    local_entropy: np.ndarray
    singularities: List[int]
    attractors: List[Tuple[float, float]]  # (price, strength)
    ricci_flow: np.ndarray
    tension: np.ndarray
    timescale: TimeScale


class ManifoldEngine:
    """
    Core engine for manifold geometric analysis of market data.

    Treats price data as a geometric manifold where:
    - Curvature represents rate of change acceleration
    - Entropy measures chaos/stability
    - Singularities are extreme tension points
    - Attractors are natural resting zones
    """

    def __init__(self, sensitivity: float = 1.0):
        """
        Initialize the manifold engine.

        Args:
            sensitivity: Multiplier for detection thresholds (default: 1.0)
        """
        self.sensitivity = sensitivity

    def analyze(
        self,
        prices: np.ndarray,
        timestamps: Optional[np.ndarray] = None,
        timescale: TimeScale = TimeScale.DAILY,
        volume: Optional[np.ndarray] = None
    ) -> ManifoldMetrics:
        """
        Perform complete manifold analysis on price data.

        Args:
            prices: Array of price values
            timestamps: Optional timestamps (generates sequential if None)
            timescale: Temporal scale of analysis
            volume: Optional volume data for weighted calculations

        Returns:
            ManifoldMetrics containing all calculated properties
        """
        if timestamps is None:
            timestamps = np.arange(len(prices))

        # Calculate geometric properties
        curvature = self.calculate_curvature(prices)
        entropy = self.calculate_global_entropy(prices)
        local_entropy = self.calculate_local_entropy(prices)
        tension = self.calculate_tension(prices, volume)

        # Detect critical points
        singularities = self.detect_singularities(curvature, tension)
        attractors = self.find_attractors(prices, volume)

        # Analyze flow dynamics
        ricci_flow = self.calculate_ricci_flow(curvature, tension)

        return ManifoldMetrics(
            timestamp=timestamps,
            prices=prices,
            curvature=curvature,
            entropy=entropy,
            local_entropy=local_entropy,
            singularities=singularities,
            attractors=attractors,
            ricci_flow=ricci_flow,
            tension=tension,
            timescale=timescale
        )

    def calculate_curvature(self, prices: np.ndarray, smooth_window: int = 5) -> np.ndarray:
        """
        Calculate the curvature of the price manifold.

        Curvature represents how sharply the market is bending - rapid
        acceleration indicates building tension.

        Mathematical approach:
        - First derivative: velocity (rate of price change)
        - Second derivative: acceleration (curvature)
        - Gaussian smoothing to reduce noise

        Args:
            prices: Price array
            smooth_window: Window size for smoothing

        Returns:
            Array of curvature values
        """
        # Normalize prices to prevent scale issues
        normalized = (prices - np.mean(prices)) / (np.std(prices) + 1e-8)

        # Calculate first derivative (velocity)
        velocity = np.gradient(normalized)

        # Calculate second derivative (acceleration/curvature)
        curvature = np.gradient(velocity)

        # Smooth to reduce noise while preserving peaks
        if smooth_window > 1:
            curvature = gaussian_filter1d(curvature, sigma=smooth_window/3)

        return curvature

    def calculate_global_entropy(self, prices: np.ndarray, bins: int = 50) -> float:
        """
        Calculate Shannon entropy of the price distribution.

        High entropy = chaotic, high-variance market
        Low entropy = calm, stable market

        Args:
            prices: Price array
            bins: Number of bins for histogram

        Returns:
            Entropy value
        """
        returns = np.diff(prices) / (prices[:-1] + 1e-8)
        hist, _ = np.histogram(returns, bins=bins, density=True)
        hist = hist[hist > 0]  # Remove zero bins
        entropy = -np.sum(hist * np.log2(hist + 1e-8))
        return float(entropy)

    def calculate_local_entropy(
        self,
        prices: np.ndarray,
        window: int = 20
    ) -> np.ndarray:
        """
        Calculate rolling local entropy over a sliding window.

        Reveals regions of chaos vs stability within the manifold.

        Args:
            prices: Price array
            window: Rolling window size

        Returns:
            Array of local entropy values
        """
        n = len(prices)
        local_entropy = np.zeros(n)

        for i in range(window, n):
            window_prices = prices[i-window:i]
            returns = np.diff(window_prices) / (window_prices[:-1] + 1e-8)

            # Calculate entropy of this window
            hist, _ = np.histogram(returns, bins=min(10, window//2), density=True)
            hist = hist[hist > 0]
            if len(hist) > 0:
                local_entropy[i] = -np.sum(hist * np.log2(hist + 1e-8))

        # Fill initial values with first calculated entropy
        if window < n:
            local_entropy[:window] = local_entropy[window]

        return local_entropy

    def calculate_tension(
        self,
        prices: np.ndarray,
        volume: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Calculate accumulated tension in the manifold.

        Tension builds from sustained directional pressure and
        represents stored energy awaiting release.

        Args:
            prices: Price array
            volume: Optional volume for weighting

        Returns:
            Array of tension values
        """
        # Calculate returns
        returns = np.diff(prices, prepend=prices[0]) / (prices + 1e-8)

        # Calculate cumulative directional pressure
        momentum = np.cumsum(returns)

        # Calculate distance from local equilibrium (moving average)
        ma_short = gaussian_filter1d(prices, sigma=5)
        ma_long = gaussian_filter1d(prices, sigma=20)
        distance_from_equilibrium = np.abs(prices - ma_long) / (ma_long + 1e-8)

        # Combine momentum and distance for tension
        tension = np.abs(momentum) * distance_from_equilibrium

        # Weight by volume if available
        if volume is not None:
            volume_normalized = volume / (np.mean(volume) + 1e-8)
            tension *= volume_normalized

        # Normalize
        tension = (tension - np.mean(tension)) / (np.std(tension) + 1e-8)

        return tension

    def detect_singularities(
        self,
        curvature: np.ndarray,
        tension: np.ndarray,
        threshold: float = 2.0
    ) -> List[int]:
        """
        Detect singularities - extreme points where the manifold cannot
        sustain itself and correction is imminent.

        Singularities occur when both curvature and tension exceed
        critical thresholds simultaneously.

        Args:
            curvature: Curvature array
            tension: Tension array
            threshold: Standard deviations above mean for detection

        Returns:
            List of indices where singularities occur
        """
        # Normalize both metrics
        curv_norm = np.abs(curvature) / (np.std(curvature) + 1e-8)
        tens_norm = np.abs(tension) / (np.std(tension) + 1e-8)

        # Combined singularity score
        singularity_score = curv_norm * tens_norm

        # Detect peaks above threshold
        threshold_adjusted = threshold * self.sensitivity
        peaks, properties = signal.find_peaks(
            singularity_score,
            height=threshold_adjusted,
            distance=10  # Minimum distance between singularities
        )

        return peaks.tolist()

    def find_attractors(
        self,
        prices: np.ndarray,
        volume: Optional[np.ndarray] = None,
        num_attractors: int = 5
    ) -> List[Tuple[float, float]]:
        """
        Identify natural attractors - price levels where the manifold
        tends to rest and stabilize.

        Uses density-based clustering to find price zones with high
        "gravitational pull" (frequent visitation).

        Args:
            prices: Price array
            volume: Optional volume data
            num_attractors: Maximum number of attractors to return

        Returns:
            List of (price_level, strength) tuples
        """
        # Create histogram of price levels
        hist, bin_edges = np.histogram(prices, bins=50)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

        # Weight by volume if available
        if volume is not None:
            # Create volume-weighted histogram
            weighted_hist = np.zeros_like(hist, dtype=float)
            for price, vol in zip(prices, volume):
                bin_idx = np.digitize(price, bin_edges) - 1
                if 0 <= bin_idx < len(weighted_hist):
                    weighted_hist[bin_idx] += vol
            hist = weighted_hist

        # Find peaks in the histogram (high-density zones)
        peaks, properties = signal.find_peaks(
            hist,
            prominence=np.std(hist) * 0.5,
            distance=3
        )

        # Get top attractors by strength
        if len(peaks) > 0:
            strengths = hist[peaks]
            # Normalize strengths
            strengths = strengths / np.max(strengths)

            # Sort by strength and take top N
            sorted_indices = np.argsort(strengths)[::-1][:num_attractors]
            attractors = [
                (float(bin_centers[peaks[i]]), float(strengths[i]))
                for i in sorted_indices
            ]
        else:
            # Fallback: use current price as attractor
            attractors = [(float(prices[-1]), 1.0)]

        return attractors

    def calculate_ricci_flow(
        self,
        curvature: np.ndarray,
        tension: np.ndarray,
        dt: float = 0.1
    ) -> np.ndarray:
        """
        Calculate Ricci flow - the smoothing process that redistributes
        tension and corrects extreme curvature.

        Inspired by geometric Ricci flow, this measures how quickly
        the manifold is "relaxing" from high-tension states.

        Args:
            curvature: Curvature array
            tension: Tension array
            dt: Time step for flow calculation

        Returns:
            Array of Ricci flow values (rate of smoothing)
        """
        # Ricci flow proportional to curvature gradient
        # High curvature → strong smoothing flow
        flow = -dt * curvature * (1 + tension)

        # Calculate the gradient of flow (acceleration of smoothing)
        flow_gradient = np.gradient(flow)

        # Smooth the flow to get overall smoothing trend
        ricci_flow = gaussian_filter1d(flow_gradient, sigma=3)

        return ricci_flow


class MultiScaleAnalyzer:
    """
    Analyzes manifolds across multiple timeframes for fractal consistency.

    The framework's power comes from observing how patterns repeat
    across scales - monthly folds echo in daily vibrations.
    """

    def __init__(self):
        self.engine = ManifoldEngine()

    def analyze_multiscale(
        self,
        prices: np.ndarray,
        timestamps: np.ndarray,
        scales: List[TimeScale] = None
    ) -> Dict[TimeScale, ManifoldMetrics]:
        """
        Perform analysis across multiple temporal scales.

        Args:
            prices: Full resolution price data
            timestamps: Corresponding timestamps
            scales: List of scales to analyze (uses all if None)

        Returns:
            Dictionary mapping TimeScale to ManifoldMetrics
        """
        if scales is None:
            scales = list(TimeScale)

        results = {}

        for scale in scales:
            # Resample data to appropriate resolution
            resampled_prices, resampled_times = self._resample(
                prices, timestamps, scale
            )

            # Analyze at this scale
            metrics = self.engine.analyze(
                resampled_prices,
                resampled_times,
                timescale=scale
            )
            results[scale] = metrics

        return results

    def _resample(
        self,
        prices: np.ndarray,
        timestamps: np.ndarray,
        scale: TimeScale
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Resample data to the appropriate timeframe.

        For MVP, uses simple downsampling. Production version would
        use proper OHLC aggregation from raw tick data.
        """
        # Define downsampling factors
        factors = {
            TimeScale.MONTHLY: 20,
            TimeScale.WEEKLY: 5,
            TimeScale.DAILY: 1,
            TimeScale.INTRADAY: 1  # Assume data is already intraday
        }

        factor = factors[scale]
        if factor > 1:
            # Simple downsampling - take every Nth point
            indices = np.arange(0, len(prices), factor)
            return prices[indices], timestamps[indices]

        return prices, timestamps
