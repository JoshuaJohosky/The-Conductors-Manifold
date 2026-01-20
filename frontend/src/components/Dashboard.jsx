// frontend/src/components/Dashboard.jsx
/**
 * Main Dashboard Component
 *
 * The Conductor's interface for observing the manifold in real-time.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import ManifoldViewer3D from './ManifoldViewer3D';
import ManifoldPulse from './ManifoldPulse';
import MetricsPanel from './MetricsPanel';
import TimeframeSelector from './TimeframeSelector';
import MultiscaleView from './MultiscaleView';

import { useManifoldAPI } from '../services/api';
import './Dashboard.css';

function normalizeSymbol(raw) {
  return String(raw || '').trim().toUpperCase();
}

function getIntervalForFeed(feed, timescale) {
  // Backend expects real exchange interval values, not UI labels
  const intervalMap = {
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
    coingecko: {
      intraday: '1h',
      daily: '1d',
      weekly: '1w',
      monthly: '1M',
    },
  };

  return intervalMap[feed]?.[timescale] ?? '1d';
}

const Dashboard = () => {
  const api = useManifoldAPI();

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [feed, setFeed] = useState('binanceus');
  const [timescale, setTimescale] = useState('daily');

  const [manifoldData, setManifoldData] = useState(null);
  const [pulseData, setPulseData] = useState(null);
  const [multiscaleData, setMultiscaleData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('3d'); // '3d' | 'metrics' | 'multiscale'

  const normalizedSymbol = useMemo(() => normalizeSymbol(symbol), [symbol]);
  const interval = useMemo(() => getIntervalForFeed(feed, timescale), [feed, timescale]);

  const loadPulseData = useCallback(async () => {
    if (!normalizedSymbol) return;
    try {
      const data = await api.getManifoldPulse(normalizedSymbol, feed);
      setPulseData(data);
    } catch (error) {
      console.error('Failed to load pulse data:', error);
    }
  }, [api, feed, normalizedSymbol]);

  const loadManifoldData = useCallback(async () => {
    if (!normalizedSymbol) return;
    setLoading(true);
    try {
      // analyzeSymbol(symbol, feed, interval, limit, timescale)
      const data = await api.analyzeSymbol(normalizedSymbol, feed, interval, 100, timescale);
      setManifoldData(data);
    } catch (error) {
      console.error('Failed to load manifold data:', error);
      setManifoldData(null);
    } finally {
      setLoading(false);
    }
  }, [api, feed, interval, normalizedSymbol, timescale]);

  const loadMultiscaleData = useCallback(async () => {
    if (!normalizedSymbol) return;
    setLoading(true);
    try {
      const data = await api.analyzeMultiscale(normalizedSymbol, feed);
      setMultiscaleData(data);
      setView('multiscale');
    } catch (error) {
      console.error('Failed to load multiscale data:', error);
      setMultiscaleData(null);
    } finally {
      setLoading(false);
    }
  }, [api, feed, normalizedSymbol]);

  // Debounced initial fetch (avoid rate limiting while typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadManifoldData();
      loadPulseData();
    }, 800);

    return () => clearTimeout(timer);
  }, [loadManifoldData, loadPulseData]);

  // Clear multiscale when symbol/feed changes
  useEffect(() => {
    setMultiscaleData(null);
  }, [normalizedSymbol, feed]);

  // Auto-refresh pulse every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadPulseData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadPulseData]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="title">The Conductor&apos;s Manifold</h1>
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
            value={normalizedSymbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTCUSDT"
            className="input-field"
          />
        </div>

        <div className="control-group">
          <label>Data Feed</label>
          <select value={feed} onChange={(e) => setFeed(e.target.value)} className="select-field">
            <option value="alphavantage">Alpha Vantage (US Stocks)</option>
            <option value="binanceus">Binance.US (Crypto)</option>
            <option value="coingecko">CoinGecko (Crypto)</option>
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
        <button
          className={`view-btn ${view === '3d' ? 'active' : ''}`}
          onClick={() => setView('3d')}
          type="button"
        >
          3D Manifold
        </button>
        <button
          className={`view-btn ${view === 'metrics' ? 'active' : ''}`}
          onClick={() => setView('metrics')}
          type="button"
        >
          Metrics
        </button>
        <button
          className={`view-btn ${view === 'multiscale' ? 'active' : ''}`}
          onClick={() => setView('multiscale')}
          type="button"
          disabled={!multiscaleData}
          title={!multiscaleData ? 'Click Multi-Scale to generate' : ''}
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

          {!loading && view === '3d' && manifoldData && (
            <div className="view-container">
              <ManifoldViewer3D manifoldData={manifoldData} width={1000} height={700} />
            </div>
          )}

          {!loading && view === 'metrics' && manifoldData && (
            <div className="view-container">
              <MetricsPanel data={manifoldData} />
            </div>
          )}

          {!loading && view === 'multiscale' && multiscaleData && (
            <div className="view-container">
              <MultiscaleView data={multiscaleData} />
            </div>
          )}

          {!loading && !manifoldData && (
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
};

export default Dashboard;
