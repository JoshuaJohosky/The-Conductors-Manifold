/**
 * Main Dashboard Component
 *
 * The Conductor's interface for observing the manifold in real-time.
 */

import React, { useEffect, useMemo, useState } from 'react';
import ManifoldViewer3D from './ManifoldViewer3D';
import ManifoldPulse from './ManifoldPulse';
import MetricsPanel from './MetricsPanel';
import TimeframeSelector from './TimeframeSelector';
import MultiscaleView from './MultiscaleView';
import { useManifoldAPI } from '../services/api';
import './Dashboard.css';

const INTERVAL_MAP = {
  binanceus: {
    intraday: '1h',
    daily: '1d',
    weekly: '1w',
    monthly: '1M',
  },
  alphavantage: {
    intraday: '60min',
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
  },
};

export default function Dashboard() {
  const api = useManifoldAPI();

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [feed, setFeed] = useState('binanceus');
  const [timescale, setTimescale] = useState('daily');

  const [manifoldData, setManifoldData] = useState(null);
  const [pulseData, setPulseData] = useState(null);
  const [multiscaleData, setMultiscaleData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('3d'); // '3d' | 'metrics' | 'multiscale'
  const [errorText, setErrorText] = useState('');

  const interval = useMemo(() => {
    return INTERVAL_MAP[feed]?.[timescale] ?? (feed === 'alphavantage' ? 'daily' : '1d');
  }, [feed, timescale]);

  const loadManifoldData = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const data = await api.analyzeSymbol(symbol, feed, interval, 100, timescale);
      setManifoldData(data);
      setView('3d');
    } catch (err) {
      setManifoldData(null);
      setErrorText(err?.message || 'Failed to load manifold data');
      // eslint-disable-next-line no-console
      console.error('Failed to load manifold data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPulseData = async () => {
    try {
      const data = await api.getManifoldPulse(symbol, feed);
      setPulseData(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load pulse data:', err);
    }
  };

  const loadMultiscaleData = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const data = await api.analyzeMultiscale(symbol, feed);
      setMultiscaleData(data);
      setView('multiscale');
    } catch (err) {
      setMultiscaleData(null);
      setErrorText(err?.message || 'Failed to load multiscale data');
      // eslint-disable-next-line no-console
      console.error('Failed to load multiscale data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load pulse on change + refresh every 30s
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!alive) return;
      await loadPulseData();
    };

    const t = setTimeout(run, 300);
    const iv = setInterval(run, 30000);

    return () => {
      alive = false;
      clearTimeout(t);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, feed]);

  // Auto-analyze like "yesterday" (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      loadManifoldData();
    }, 650);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, feed, timescale, interval]);

  // Clear multiscale when symbol/feed changes
  useEffect(() => {
    setMultiscaleData(null);
  }, [symbol, feed]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="title">The Conductor&apos;s Manifold [v1.3 LIVE]</h1>
          <p className="subtitle">
            Real-Time Geometric Interpretation · Stocks (Alpha Vantage) · Crypto (Binance.US)
          </p>
        </div>
      </header>

      <div className="controls-bar">
        <div className="control-group">
          <label>Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="BTCUSDT"
            className="input-field"
          />
        </div>

        <div className="control-group">
          <label>Data Feed</label>
          <select value={feed} onChange={(e) => setFeed(e.target.value)} className="select-field">
            <option value="binanceus">Binance.US (Crypto)</option>
            <option value="alphavantage">Alpha Vantage (US Stocks)</option>
          </select>
        </div>

        <div className="control-group">
          <label>Timescale</label>
          <TimeframeSelector current={timescale} onSelect={setTimescale} />
        </div>

        <button onClick={loadManifoldData} className="btn-primary" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>

        <button onClick={loadMultiscaleData} className="btn-secondary" disabled={loading}>
          Multi-Scale
        </button>
      </div>

      <div className="view-selector">
        <button className={`view-btn ${view === '3d' ? 'active' : ''}`} onClick={() => setView('3d')}>
          3D Manifold
        </button>
        <button className={`view-btn ${view === 'metrics' ? 'active' : ''}`} onClick={() => setView('metrics')}>
          Metrics
        </button>
        <button
          className={`view-btn ${view === 'multiscale' ? 'active' : ''}`}
          onClick={() => setView('multiscale')}
        >
          Multi-Scale
        </button>
      </div>

      <div className="main-content">
        {pulseData && (
          <div className="pulse-sidebar">
            <ManifoldPulse data={pulseData} />
          </div>
        )}

        <div className="primary-view">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>Analyzing the manifold...</p>
            </div>
          )}

          {!loading && errorText && (
            <div className="empty-state">
              <h2>Manifold load failed</h2>
              <p>{errorText}</p>
              <p style={{ opacity: 0.8 }}>
                Current request: <code>{symbol}</code> · <code>{feed}</code> · interval <code>{interval}</code> ·
                timescale <code>{timescale}</code>
              </p>
            </div>
          )}

          {!loading && !errorText && view === '3d' && manifoldData && (
            <div className="view-container">
              <ManifoldViewer3D manifoldData={manifoldData} width={1000} height={700} />
            </div>
          )}

          {!loading && !errorText && view === 'metrics' && manifoldData && (
            <div className="view-container">
              <MetricsPanel data={manifoldData} />
            </div>
          )}

          {!loading && !errorText && view === 'multiscale' && multiscaleData && (
            <div className="view-container">
              <MultiscaleView data={multiscaleData} />
            </div>
          )}

          {!loading && !errorText && view === '3d' && !manifoldData && (
            <div className="empty-state">
              <h2>Enter a symbol and press Analyze to begin</h2>
              <p>Observe the market as a living geometric manifold</p>
            </div>
          )}
        </div>
      </div>

      <footer className="dashboard-footer">
        <p>© 2025 Joshua Johosky. All Rights Reserved.</p>
        <p className="disclaimer">For authorized use only. See LICENSE.md for terms.</p>
      </footer>
    </div>
  );
}
