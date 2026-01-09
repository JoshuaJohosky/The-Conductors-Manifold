"""
The Manifold Interpreter - Proprietary Methodology
© 2025 Joshua Johosky. All Rights Reserved.

This module implements the proprietary Manifold Interpreter framework for
reading markets as living geometric shapes with musical composition analysis.

Three Interconnected Layers:
1. The Geometric Manifold - Shape of belief that evolves under pressure
2. The Musical Composition - Conductor/Singer perspective
3. The Natural Structure - Elliott Waves & Fibonacci as attractors
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class ManifoldPhase(Enum):
    """Current phase of the manifold's evolution"""
    IMPULSE_LEG_SHARPENING = "impulse_leg_sharpening"  # Curvature tightening
    SINGULARITY_FORMING = "singularity_forming"  # Peak tension before collapse
    RICCI_FLOW_SMOOTHING = "ricci_flow_smoothing"  # Correction redistributing tension
    ATTRACTOR_CONVERGENCE = "attractor_convergence"  # Settling into basin
    STABLE_EQUILIBRIUM = "stable_equilibrium"  # Low tension, low entropy
    COMPRESSION_BUILDING = "compression_building"  # Tension accumulating


class ConductorReading(Enum):
    """Macro flow perspective - the entire composition"""
    CRESCENDO = "crescendo"  # Building toward climax
    DECRESCENDO = "decrescendo"  # Releasing from climax
    SUSTAINED_TENSION = "sustained_tension"  # Holding at intensity
    REST_PHASE = "rest_phase"  # Calm between movements
    TRANSITIONAL = "transitional"  # Moving between states


class SingerReading(Enum):
    """Micro flow perspective - internal geometry of each phrase"""
    RESONANT_STABLE = "resonant_stable"  # Note holds naturally
    TENSION_CRACKLING = "tension_crackling"  # About to break
    HARMONIOUS_FLOW = "harmonious_flow"  # Smooth movement
    DISSONANT_STRAIN = "dissonant_strain"  # Forced, unsustainable


@dataclass
class ManifoldInterpretation:
    """Complete interpretation in the Conductor's language"""

    # Phase diagnosis
    current_phase: ManifoldPhase
    phase_confidence: float

    # Dual perspective readings
    conductor_reading: ConductorReading
    singer_reading: SingerReading

    # Geometric description
    curvature_state: str  # "sharpening", "tight", "smoothing", "gentle"
    tension_description: str  # "accumulating", "extreme", "releasing", "minimal"
    entropy_state: str  # "frothy", "calm", "chaotic", "stable"

    # Elliott Wave context
    wave_position: Optional[str]  # "Wave 3 impulse", "Wave 4 correction", etc.

    # Fibonacci attractor analysis
    nearest_attractor: Optional[Tuple[float, str]]  # (price, description)
    attractor_pull_strength: float

    # Actionable interpretation
    market_narrative: str  # Human-readable story of what's happening
    tension_warning: Optional[str]  # Warning if singularity approaching

    # Raw metrics (for reference)
    curvature_value: float
    entropy_value: float
    tension_value: float


class ManifoldInterpreter:
    """
    The Conductor's Manifold Interpreter

    Transforms raw metrics into interpretive readings using the proprietary
    framework of geometric manifolds, musical composition, and natural structure.
    """

    def __init__(self):
        # Fibonacci ratios as natural attractors (gravitational basins)
        self.fibonacci_ratios = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.618]

        # Thresholds calibrated for the Manifold methodology
        self.singularity_threshold = 2.0  # When curvature becomes "too tight"
        self.high_tension_threshold = 1.5  # When tension needs release
        self.high_entropy_threshold = 6.0  # When market is "frothy"

    def interpret(self, metrics, price_context: Optional[Dict] = None) -> ManifoldInterpretation:
        """
        Main interpretation method: Reads the manifold and returns diagnosis.

        Args:
            metrics: ManifoldMetrics from the engine
            price_context: Optional dict with swing_high, swing_low for Fibonacci

        Returns:
            ManifoldInterpretation with complete reading
        """
        # Extract current state
        current_curvature = float(metrics.curvature[-1])
        current_entropy = float(metrics.local_entropy[-1])
        current_tension = float(metrics.tension[-1])
        current_price = float(metrics.prices[-1])

        # Diagnose phase
        phase = self._diagnose_phase(
            current_curvature,
            current_entropy,
            current_tension,
            metrics.singularities,
            metrics.ricci_flow[-1]
        )

        # Get dual perspective readings
        conductor = self._conductor_perspective(metrics)
        singer = self._singer_perspective(current_curvature, current_tension, current_entropy)

        # Describe geometric state
        curvature_state = self._describe_curvature(current_curvature, metrics.curvature)
        tension_description = self._describe_tension(current_tension)
        entropy_state = self._describe_entropy(current_entropy)

        # Fibonacci attractor analysis
        attractor_info = self._analyze_fibonacci_attractors(
            current_price,
            metrics.attractors,
            price_context
        )

        # Elliott Wave position (simplified - could be enhanced)
        wave_position = self._estimate_wave_position(phase, metrics)

        # Generate narrative
        narrative = self._compose_narrative(
            phase,
            conductor,
            singer,
            curvature_state,
            tension_description,
            entropy_state
        )

        # Tension warning
        warning = self._generate_warning(phase, current_tension, len(metrics.singularities))

        return ManifoldInterpretation(
            current_phase=phase,
            phase_confidence=self._calculate_confidence(metrics),
            conductor_reading=conductor,
            singer_reading=singer,
            curvature_state=curvature_state,
            tension_description=tension_description,
            entropy_state=entropy_state,
            wave_position=wave_position,
            nearest_attractor=attractor_info['nearest'],
            attractor_pull_strength=attractor_info['pull_strength'],
            market_narrative=narrative,
            tension_warning=warning,
            curvature_value=current_curvature,
            entropy_value=current_entropy,
            tension_value=current_tension
        )

    def _diagnose_phase(
        self,
        curvature: float,
        entropy: float,
        tension: float,
        singularities: List[int],
        ricci_flow: float
    ) -> ManifoldPhase:
        """
        Diagnose the current phase of manifold evolution.

        This is the core of the Conductor's method: determining whether we're in
        an impulse (sharpening curvature) or correction (Ricci flow smoothing).
        """
        abs_curvature = abs(curvature)
        abs_tension = abs(tension)
        abs_ricci = abs(ricci_flow)

        # Singularity forming - extreme tension and curvature
        if abs_curvature > self.singularity_threshold and abs_tension > self.high_tension_threshold:
            return ManifoldPhase.SINGULARITY_FORMING

        # Ricci flow smoothing - high Ricci flow magnitude indicates correction
        if abs_ricci > 0.5 and abs_tension > 0.5:
            return ManifoldPhase.RICCI_FLOW_SMOOTHING

        # Impulse leg sharpening - increasing curvature with building tension
        if abs_curvature > 0.5 and abs_tension > 0.7 and abs_ricci < 0.3:
            return ManifoldPhase.IMPULSE_LEG_SHARPENING

        # Compression building - tension accumulating without high curvature
        if abs_tension > 1.0 and abs_curvature < 0.5:
            return ManifoldPhase.COMPRESSION_BUILDING

        # Stable equilibrium - low everything
        if abs_curvature < 0.3 and abs_tension < 0.5 and entropy < 4.0:
            return ManifoldPhase.STABLE_EQUILIBRIUM

        # Default: attractor convergence
        return ManifoldPhase.ATTRACTOR_CONVERGENCE

    def _conductor_perspective(self, metrics) -> ConductorReading:
        """
        Conductor reads the entire composition: macro flow of all instruments.

        Feels the crescendo of an impulse or decrescendo of correction.
        """
        # Look at recent trend in tension and curvature
        recent_tension = metrics.tension[-20:]
        recent_curvature = metrics.curvature[-20:]

        tension_trend = np.mean(np.diff(recent_tension))
        curvature_trend = np.mean(np.diff(recent_curvature))

        current_tension = abs(metrics.tension[-1])
        current_entropy = metrics.local_entropy[-1]

        # Building toward climax
        if tension_trend > 0 and curvature_trend > 0:
            return ConductorReading.CRESCENDO

        # Releasing from climax
        if tension_trend < 0 and current_tension > 1.0:
            return ConductorReading.DECRESCENDO

        # Holding at intensity
        if current_tension > 1.0 and abs(tension_trend) < 0.1:
            return ConductorReading.SUSTAINED_TENSION

        # Calm between movements
        if current_tension < 0.5 and current_entropy < 4.0:
            return ConductorReading.REST_PHASE

        return ConductorReading.TRANSITIONAL

    def _singer_perspective(
        self,
        curvature: float,
        tension: float,
        entropy: float
    ) -> SingerReading:
        """
        Singer feels the internal geometry: knows when a note is about to crack.

        This is the felt sense of resonance vs. dissonance.
        """
        abs_curvature = abs(curvature)
        abs_tension = abs(tension)

        # About to crack - extreme tension
        if abs_tension > 1.5 or abs_curvature > 2.0:
            return SingerReading.TENSION_CRACKLING

        # Forced, unsustainable
        if abs_tension > 1.0 and entropy > 6.0:
            return SingerReading.DISSONANT_STRAIN

        # Smooth, natural flow
        if abs_curvature < 0.5 and abs_tension < 0.7 and entropy < 5.0:
            return SingerReading.HARMONIOUS_FLOW

        # Stable, holding naturally
        if abs_tension < 0.5 and entropy < 4.0:
            return SingerReading.RESONANT_STABLE

        return SingerReading.HARMONIOUS_FLOW

    def _describe_curvature(self, current: float, history: np.ndarray) -> str:
        """Describe curvature in the Manifold language"""
        abs_current = abs(current)
        recent_trend = np.mean(np.diff(history[-10:]))

        if abs_current > 1.5:
            return "tight - singularity imminent"
        elif abs_current > 0.8:
            if recent_trend > 0:
                return "sharpening - psychological heat accumulating"
            else:
                return "loosening - tension releasing"
        elif abs_current > 0.3:
            return "moderate - normal flow"
        else:
            return "gentle - calm surface"

    def _describe_tension(self, tension: float) -> str:
        """Describe tension in the Manifold language"""
        abs_tension = abs(tension)

        if abs_tension > 2.0:
            return "extreme - structure cannot hold"
        elif abs_tension > 1.5:
            return "critical - collapse imminent"
        elif abs_tension > 1.0:
            return "high - pressure building"
        elif abs_tension > 0.5:
            return "accumulating - directional pressure"
        else:
            return "minimal - relaxed state"

    def _describe_entropy(self, entropy: float) -> str:
        """Describe entropy in the Manifold language"""
        if entropy > 7.0:
            return "chaotic - panic/euphoria"
        elif entropy > 6.0:
            return "frothy - unstable belief"
        elif entropy > 4.0:
            return "elevated - active movement"
        elif entropy > 2.0:
            return "calm - stable belief"
        else:
            return "crystalline - locked structure"

    def _analyze_fibonacci_attractors(
        self,
        current_price: float,
        attractors: List[Tuple[float, float]],
        price_context: Optional[Dict]
    ) -> Dict:
        """
        Analyze Fibonacci levels as natural attractors (gravitational basins).

        These aren't just "levels" - they're mathematical endpoints the manifold
        is pulled toward as it cools and settles.
        """
        if not attractors:
            return {
                'nearest': None,
                'pull_strength': 0.0
            }

        # Find nearest attractor
        nearest = min(attractors, key=lambda a: abs(a[0] - current_price))
        distance_pct = abs(nearest[0] - current_price) / current_price * 100

        # Pull strength weakens with distance
        pull_strength = nearest[1] * (1.0 / (1.0 + distance_pct))

        # Describe the attractor
        if distance_pct < 1.0:
            description = f"converging on basin at ${nearest[0]:,.2f}"
        elif current_price > nearest[0]:
            description = f"above attractor at ${nearest[0]:,.2f} ({distance_pct:.1f}% away)"
        else:
            description = f"below attractor at ${nearest[0]:,.2f} ({distance_pct:.1f}% away)"

        return {
            'nearest': (nearest[0], description),
            'pull_strength': pull_strength
        }

    def _estimate_wave_position(self, phase: ManifoldPhase, metrics) -> Optional[str]:
        """
        Estimate Elliott Wave position.

        Elliott Waves are the names we give to different phases of curvature.
        Impulse = waves 1,3,5. Correction = waves 2,4, or A,B,C.
        """
        if phase == ManifoldPhase.IMPULSE_LEG_SHARPENING:
            return "Impulse wave (1, 3, or 5) - curvature sharpening"
        elif phase == ManifoldPhase.RICCI_FLOW_SMOOTHING:
            return "Corrective wave (2, 4, or A-B-C) - Ricci flow smoothing"
        elif phase == ManifoldPhase.SINGULARITY_FORMING:
            return "Wave peak - singularity forming"
        elif phase == ManifoldPhase.STABLE_EQUILIBRIUM:
            return "Wave 4 consolidation or end of correction"

        return "Transitional - between wave structures"

    def _compose_narrative(
        self,
        phase: ManifoldPhase,
        conductor: ConductorReading,
        singer: SingerReading,
        curvature_state: str,
        tension_description: str,
        entropy_state: str
    ) -> str:
        """
        Compose the human-readable narrative of what's happening.

        This is the Interpreter's synthesis: telling the market's story.
        """
        narratives = {
            ManifoldPhase.IMPULSE_LEG_SHARPENING: (
                f"The manifold is in an impulse leg. Curvature is {curvature_state}, "
                f"with tension {tension_description}. The Conductor senses a {conductor.value}, "
                f"while the Singer feels the note is {singer.value}. "
                f"Psychological heat is accumulating as the surface sharpens."
            ),
            ManifoldPhase.SINGULARITY_FORMING: (
                f"A singularity is forming. The manifold has reached {tension_description} tension "
                f"with {curvature_state} curvature. The structure cannot hold this shape - "
                f"a collapse and Ricci flow smoothing are imminent. "
                f"The Singer feels the note {singer.value}."
            ),
            ManifoldPhase.RICCI_FLOW_SMOOTHING: (
                f"The manifold is undergoing Ricci flow - a smoothing process where "
                f"tension redistributes across the surface. Entropy is {entropy_state} as "
                f"the structure 'burns off' excess psychological heat. "
                f"The Conductor reads this as {conductor.value}."
            ),
            ManifoldPhase.ATTRACTOR_CONVERGENCE: (
                f"The manifold is converging toward a natural attractor. "
                f"Curvature is {curvature_state} with {tension_description} tension. "
                f"The surface is settling into a gravitational basin, seeking equilibrium."
            ),
            ManifoldPhase.STABLE_EQUILIBRIUM: (
                f"The manifold rests in stable equilibrium. Entropy is {entropy_state}, "
                f"tension is {tension_description}, and curvature is {curvature_state}. "
                f"The Singer feels {singer.value}. This is a rest phase between movements."
            ),
            ManifoldPhase.COMPRESSION_BUILDING: (
                f"Compression is building. The manifold shows {tension_description} tension "
                f"without high curvature - directional pressure is accumulating "
                f"before the next sharp movement. The Conductor senses {conductor.value}."
            ),
        }

        return narratives.get(phase, "The manifold is in transition between states.")

    def _generate_warning(
        self,
        phase: ManifoldPhase,
        tension: float,
        singularity_count: int
    ) -> Optional[str]:
        """Generate warning if singularity is approaching"""
        if phase == ManifoldPhase.SINGULARITY_FORMING:
            return "⚠️ SINGULARITY FORMING: The manifold cannot sustain this curvature. Expect sharp Ricci flow (correction) as tension redistributes."

        if abs(tension) > self.high_tension_threshold:
            return "⚠️ HIGH TENSION: The structure is stretched. Watch for singularity formation or sudden release."

        if singularity_count > 2:
            return "⚠️ MULTIPLE SINGULARITIES: The manifold has experienced repeated extreme events. Structure may be unstable."

        return None

    def _calculate_confidence(self, metrics) -> float:
        """Calculate confidence in the phase diagnosis"""
        # Higher confidence when metrics are clear and consistent
        recent_curvature_std = np.std(metrics.curvature[-10:])
        recent_tension_std = np.std(metrics.tension[-10:])

        # Lower std = higher confidence (more consistent signal)
        curvature_confidence = 1.0 / (1.0 + recent_curvature_std)
        tension_confidence = 1.0 / (1.0 + recent_tension_std)

        return (curvature_confidence + tension_confidence) / 2


# Export
__all__ = [
    'ManifoldInterpreter',
    'ManifoldInterpretation',
    'ManifoldPhase',
    'ConductorReading',
    'SingerReading'
]
