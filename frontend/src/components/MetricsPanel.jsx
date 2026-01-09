/**
 * MetricsPanel - Detailed metrics view for manifold analysis
 */

import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './MetricsPanel.css';

const MetricsPanel = ({ data }) => {
  if (!data) return null;

  // Prepare chart data
  const chartData = data.timestamp.map((time, idx) => ({
    time: new Date(time * 1000).toLocaleTimeString(),
    price: data.prices[idx],
    curvature: data.curvature[idx],
    entropy: data.local_entropy[idx],
    tension: data.tension[idx],
    ricci_flow: data.ricci_flow[idx]
  }));

  // Calculate statistics
  const stats = {
    price: {
      current: data.prices[data.prices.length - 1],
      high: Math.max(...data.prices),
      low: Math.min(...data.prices),
      change: ((data.prices[data.prices.length - 1] - data.prices[0]) / data.prices[0] * 100).toFixed(2)
    },
    curvature: {
      current: data.curvature[data.curvature.length - 1].toFixed(3),
      max: Math.max(...data.curvature.map(Math.abs)).toFixed(3),
      avg: (data.curvature.reduce((a, b) => a + Math.abs(b), 0) / data.curvature.length).toFixed(3)
    },
    entropy: {
      current: data.entropy.toFixed(2),
      local: data.local_entropy[data.local_entropy.length - 1].toFixed(2)
    },
    tension: {
      current: data.tension[data.tension.length - 1].toFixed(3),
      max: Math.max(...data.tension.map(Math.abs)).toFixed(3)
    }
  };

  return (
    <div className="metrics-panel">
      <h2>Manifold Metrics</h2>

      {/* Price Statistics */}
      <div className="metrics-section">
        <h3>Price Action</h3>
        <div className="metrics-grid">
          <div className="metric-box">
            <div className="metric-label">Current</div>
            <div className="metric-value price">${stats.price.current.toLocaleString()}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Change</div>
            <div className={`metric-value ${stats.price.change >= 0 ? 'positive' : 'negative'}`}>
              {stats.price.change >= 0 ? '+' : ''}{stats.price.change}%
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">High</div>
            <div className="metric-value">${stats.price.high.toLocaleString()}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Low</div>
            <div className="metric-value">${stats.price.low.toLocaleString()}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
            <Area type="monotone" dataKey="price" stroke="#00ff00" fill="#00ff0033" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Curvature Analysis */}
      <div className="metrics-section">
        <h3>Curvature (Market Acceleration)</h3>
        <div className="metrics-grid">
          <div className="metric-box">
            <div className="metric-label">Current</div>
            <div className="metric-value">{stats.curvature.current}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Max (abs)</div>
            <div className="metric-value">{stats.curvature.max}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Average</div>
            <div className="metric-value">{stats.curvature.avg}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
            <Legend />
            <Line type="monotone" dataKey="curvature" stroke="#00ffff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Entropy Analysis */}
      <div className="metrics-section">
        <h3>Entropy (Chaos Level)</h3>
        <div className="metrics-grid">
          <div className="metric-box">
            <div className="metric-label">Global</div>
            <div className="metric-value">{stats.entropy.current}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Local (Current)</div>
            <div className="metric-value">{stats.entropy.local}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
            <Area type="monotone" dataKey="entropy" stroke="#ff9900" fill="#ff990033" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tension Analysis */}
      <div className="metrics-section">
        <h3>Tension (Pressure Buildup)</h3>
        <div className="metrics-grid">
          <div className="metric-box">
            <div className="metric-label">Current</div>
            <div className="metric-value">{stats.tension.current}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Max (abs)</div>
            <div className="metric-value">{stats.tension.max}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
            <Line type="monotone" dataKey="tension" stroke="#ff0000" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Ricci Flow */}
      <div className="metrics-section">
        <h3>Ricci Flow (Smoothing Process)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
            <Line type="monotone" dataKey="ricci_flow" stroke="#ff00ff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Singularities */}
      <div className="metrics-section">
        <h3>Singularities Detected</h3>
        <div className="singularities-list">
          {data.singularities.length > 0 ? (
            data.singularities.map((idx, i) => (
              <div key={i} className="singularity-item">
                <span className="singularity-icon">🔴</span>
                <span>Index: {idx}</span>
                <span>Price: ${data.prices[idx]?.toLocaleString()}</span>
                <span>Curvature: {data.curvature[idx]?.toFixed(3)}</span>
              </div>
            ))
          ) : (
            <div className="no-singularities">No singularities detected</div>
          )}
        </div>
      </div>

      {/* Attractors */}
      <div className="metrics-section">
        <h3>Attractors (Support/Resistance)</h3>
        <div className="attractors-list">
          {data.attractors.map((attractor, i) => (
            <div key={i} className="attractor-item">
              <span className="attractor-icon">🟢</span>
              <span className="attractor-price">${attractor.price.toLocaleString()}</span>
              <div className="attractor-strength-bar">
                <div
                  className="attractor-strength-fill"
                  style={{ width: `${attractor.strength * 100}%` }}
                ></div>
              </div>
              <span className="attractor-strength">{(attractor.strength * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
