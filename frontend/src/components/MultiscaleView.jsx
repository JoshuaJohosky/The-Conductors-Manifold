/**
 * MultiscaleView - Fractal Consistency Across Timeframes
 *
 * Shows the manifold at multiple scales simultaneously:
 * - 1H (Ultra-short: High-frequency microstructure)
 * - 4H (Short: Intraday flows)
 * - 1D (Medium: Daily rhythm)
 * - 1W (Long: Weekly institutional patterns)
 *
 * Observe how attractors and singularities echo across scales.
 */

import React from 'react';
import './MultiscaleView.css';

const MultiscaleView = ({ data }) => {
  if (!data || !data.scales) {
    return (
      <div className="multiscale-empty">
        <h2>No multi-scale data available</h2>
        <p>Click "Multi-Scale" button to analyze across timeframes</p>
      </div>
    );
  }

  const { scales } = data;
  const timeframes = ['1H', '4H', '1D', '1W'];

  return (
    <div className="multiscale-container">
      <div className="multiscale-header">
        <h2>Multi-Scale Manifold Analysis</h2>
        <p className="subtitle">Fractal patterns echo across temporal scales</p>
      </div>

      <div className="scales-grid">
        {timeframes.map((tf) => {
          const scaleData = scales[tf];
          if (!scaleData) return null;

          // Extract metrics - they're nested under "metrics" key
          const metricsObj = scaleData.metrics || scaleData;
          const curvature = metricsObj.curvature || 0;
          const entropy = metricsObj.entropy || 0;
          const phase = metricsObj.phase || 'UNKNOWN';
          const pylonStrength = metricsObj.pylon_strength || 0;

          return (
            <div key={tf} className="scale-panel">
              <div className="scale-header">
                <h3>{tf} Timeframe</h3>
                <span className={`phase-badge phase-${phase.toLowerCase().replace(/\s/g, '-')}`}>
                  {phase}
                </span>
              </div>

              <div className="scale-metrics">
                <div className="metric-row">
                  <span className="metric-label">Curvature:</span>
                  <span className="metric-value">{typeof curvature === 'number' ? curvature.toFixed(4) : curvature}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Entropy:</span>
                  <span className="metric-value">{typeof entropy === 'number' ? entropy.toFixed(2) : entropy}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Pylon Strength:</span>
                  <span className="metric-value">{pylonStrength}%</span>
                </div>
              </div>

              {scaleData.attractors && scaleData.attractors.length > 0 && (
                <div className="scale-attractors">
                  <div className="attractor-label">Attractors:</div>
                  {scaleData.attractors.slice(0, 3).map((attr, idx) => (
                    <div key={idx} className="attractor-item">
                      ${attr.price?.toFixed(2)} (strength: {attr.strength?.toFixed(2)})
                    </div>
                  ))}
                </div>
              )}

              {scaleData.singularities && scaleData.singularities.length > 0 && (
                <div className="scale-singularities">
                  <div className="singularity-label">Singularities:</div>
                  {scaleData.singularities.slice(0, 2).map((sing, idx) => (
                    <div key={idx} className="singularity-item">
                      ${sing.price?.toFixed(2)} ({sing.type})
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fractal-analysis">
        <h3>Fractal Consistency Analysis</h3>
        <div className="consistency-grid">
          <div className="consistency-item">
            <strong>Pattern Echo:</strong>
            <p>Observe how the {(scales['1D']?.metrics || scales['1D'])?.phase || 'phase'} pattern at daily scale
               echoes in the {(scales['1H']?.metrics || scales['1H'])?.phase || 'micro'} structure at hourly scale.</p>
          </div>
          <div className="consistency-item">
            <strong>Attractor Alignment:</strong>
            <p>When attractors align across scales, the manifold exhibits strong temporal coherence -
               institutional positions reinforcing retail flows.</p>
          </div>
          <div className="consistency-item">
            <strong>Scale Divergence:</strong>
            <p>Divergence between scales indicates transition periods where the manifold is
               reorganizing its geometric structure.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiscaleView;

