/**
 * ManifoldPulse - Real-time health indicator for the manifold
 *
 * Shows current state: entropy, tension, attractors, recent singularities
 */

import React from 'react';
import './ManifoldPulse.css';

const ManifoldPulse = ({ data }) => {
  if (!data || !data.pulse) return null;

  const { pulse, symbol, timestamp } = data;

  const getStateColor = (state) => {
    const colors = {
      stable: '#00ff00',
      transitional: '#ffff00',
      chaotic: '#ff9900',
      high_tension: '#ff0000',
      compressed: '#ff00ff'
    };
    return colors[state] || '#888888';
  };

  const getLevelColor = (level) => {
    const colors = {
      low: '#00ff00',
      medium: '#ffff00',
      high: '#ff0000'
    };
    return colors[level] || '#888888';
  };

  return (
    <div className="manifold-pulse">
      <div className="pulse-header">
        <h2>Manifold Pulse</h2>
        <div className="pulse-symbol">{symbol}</div>
        <div className="pulse-timestamp">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Overall State */}
      <div className="pulse-state" style={{ borderColor: getStateColor(pulse.manifold_state) }}>
        <div className="state-indicator" style={{ backgroundColor: getStateColor(pulse.manifold_state) }}></div>
        <div className="state-label">{pulse.manifold_state.replace('_', ' ').toUpperCase()}</div>
      </div>

      {/* Current Price */}
      <div className="pulse-metric">
        <div className="metric-label">Current Price</div>
        <div className="metric-value price">${pulse.current_price.toLocaleString()}</div>
      </div>

      {/* Entropy */}
      <div className="pulse-metric">
        <div className="metric-label">Entropy</div>
        <div className="metric-row">
          <div className="metric-value">{pulse.entropy.toFixed(2)}</div>
          <div
            className="level-badge"
            style={{ backgroundColor: getLevelColor(pulse.entropy_level) }}
          >
            {pulse.entropy_level}
          </div>
        </div>
        <div className="metric-bar">
          <div
            className="metric-bar-fill"
            style={{
              width: `${Math.min(pulse.entropy / 10 * 100, 100)}%`,
              backgroundColor: getLevelColor(pulse.entropy_level)
            }}
          ></div>
        </div>
        <div className="metric-description">
          {pulse.entropy_level === 'low' && 'Market is calm and stable'}
          {pulse.entropy_level === 'medium' && 'Normal volatility'}
          {pulse.entropy_level === 'high' && 'High chaos and uncertainty'}
        </div>
      </div>

      {/* Tension */}
      <div className="pulse-metric">
        <div className="metric-label">Tension</div>
        <div className="metric-row">
          <div className="metric-value">{pulse.tension.toFixed(2)}</div>
          <div
            className="level-badge"
            style={{ backgroundColor: getLevelColor(pulse.tension_level) }}
          >
            {pulse.tension_level}
          </div>
        </div>
        <div className="metric-bar">
          <div
            className="metric-bar-fill"
            style={{
              width: `${Math.min(Math.abs(pulse.tension) / 3 * 100, 100)}%`,
              backgroundColor: getLevelColor(pulse.tension_level)
            }}
          ></div>
        </div>
        <div className="metric-description">
          {pulse.tension_level === 'low' && 'Minimal pressure buildup'}
          {pulse.tension_level === 'medium' && 'Moderate directional pressure'}
          {pulse.tension_level === 'high' && 'Extreme tension - correction likely'}
        </div>
      </div>

      {/* Nearest Attractor */}
      <div className="pulse-metric attractor">
        <div className="metric-label">Nearest Attractor</div>
        <div className="attractor-info">
          <div className="attractor-price">
            ${pulse.nearest_attractor.price.toLocaleString()}
          </div>
          <div className="attractor-distance">
            {pulse.nearest_attractor.distance_pct > 0 ? '+' : ''}
            {pulse.nearest_attractor.distance_pct.toFixed(2)}% away
          </div>
        </div>
        <div className="attractor-description">
          Natural resting point where manifold stabilizes
        </div>
      </div>

      {/* Recent Singularities */}
      <div className="pulse-metric singularities">
        <div className="metric-label">Recent Singularities</div>
        <div className="singularity-count">
          <div className="count-number">{pulse.recent_singularities}</div>
          <div className="count-label">detected</div>
        </div>
        <div className="metric-description">
          {pulse.recent_singularities === 0 && 'No extreme events detected'}
          {pulse.recent_singularities > 0 && pulse.recent_singularities <= 2 && 'Minor corrections occurred'}
          {pulse.recent_singularities > 2 && 'Multiple extreme tension points'}
        </div>
      </div>

      {/* Interpretation */}
      <div className="pulse-interpretation">
        <div className="interpretation-title">Conductor's Interpretation</div>
        <div className="interpretation-text">
          {getInterpretation(pulse)}
        </div>
      </div>
    </div>
  );
};

/**
 * Generate human-readable interpretation of the manifold state
 */
function getInterpretation(pulse) {
  const { manifold_state, entropy_level, tension_level, recent_singularities } = pulse;

  if (manifold_state === 'stable') {
    return 'The manifold is in a calm, stable state. Low entropy and tension indicate equilibrium. The system is resting near a natural attractor.';
  }

  if (manifold_state === 'high_tension') {
    return 'Extreme tension detected. The manifold is stretched and a Ricci flow (correction) is likely imminent. Monitor for singularity formation.';
  }

  if (manifold_state === 'compressed') {
    return 'The manifold is compressed with high tension but low chaos. This represents focused directional pressure awaiting release.';
  }

  if (manifold_state === 'chaotic') {
    return 'High entropy indicates chaotic movement without clear structure. The manifold is experiencing turbulent flow with unpredictable micro-movements.';
  }

  if (manifold_state === 'transitional') {
    if (recent_singularities > 0) {
      return 'The manifold is transitioning after recent singularity events. Tension is redistributing through Ricci flow. Watch for attractor convergence.';
    }
    return 'The manifold is in a transitional state between equilibrium points. Neither stable nor chaotic, it is actively seeking a new attractor.';
  }

  return 'The manifold is evolving. Observe curvature patterns across multiple timeframes for structural clarity.';
}

export default ManifoldPulse;
