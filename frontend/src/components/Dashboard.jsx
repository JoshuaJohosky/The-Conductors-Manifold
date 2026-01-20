/**
 * Main Dashboard Component
 * The Conductor's interface for observing the manifold in real-time.
 */

import React, { useState, useEffect } from 'react';
import ManifoldViewer3D from './ManifoldViewer3D';
import ManifoldPulse from './ManifoldPulse';
import MetricsPanel from './MetricsPanel';
import TimeframeSelector from './TimeframeSelector';
import MultiscaleView from './MultiscaleView';
import { useManifoldAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [feed, setFeed] = useState('binanceus');
  const [timescale, setTimescale] = useState('daily');

  const [manifoldData, setManifoldData] = useState(null);
  const [pulseData, setPulseData] = useState(null);
  const [multiscaleData, setMultiscaleData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('3d'); // '3d' | 'metrics' | 'multiscale'

  const api = useManifoldAPI();

  // ---- Data Loading ----

  useEffect(() => {
    const timer = setTimeout(() => {
      loadManifoldData();
      loadPulseData();
    }, 800);
    return () => clearTimeout(timer);
  }, [symbol, feed, timescale]);

  useEffect(() => {
    const interval = setInterval(loadPulseData, 30000);
    return () => clearInterval(interval);
  }, [symbol, feed]);

  const loadManifoldData = async () => {
    setLoading(true);
    try {
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
      };

      const interval = intervalMap[feed]?.[timescale] || '1d';

      const data = await api.analyzeSymbol(
        symbol,
        feed,
        interval,
        100,
        timescale
      );

      setManifoldData(data);
    } catch (err) {
      console.error('Failed to load manifold data:', err);
      setManifoldData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPulseData = async () => {
    try {
      const data = await api.getManifoldPulse(symbol, feed);
      setPulseData(data);
    } catch (err) {
      console.error('Failed to load pulse data:', err);
    }
  };

  const loadMultiscaleData = async () => {
    setLoading(true);
    try {
      const data = await api.analyzeMultiscale(symbol, feed);
      setMultiscaleData(data);
      setView('multiscale');
    } catch (err) {
      console.error('Failed to load multiscale data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Render ----

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1 className="title">The Conductor&apos;s Manifold [v1.3 LIVE]</h1>
        <p className="subtitle">
          Real-Time Geometric Interpretation · Stocks · Crypto
        </p>
      </header>

      {/* Controls */}
      <div className="controls-bar">
        <div className="control-group">
          <label>Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
        </div>

        <div className="control-group">
          <label>Feed</label>
          <select value={feed} onChange={(e) => setFeed(e.target.value)}>
            <option value="binanceus">Binance.US</option>
            <option value="alphavantage">Alpha Vantage</option>
          </select>
        </div>

        <TimeframeSelector current={timescale} onSelect={setTimescale} />

        <button onClick={loadManifoldData} disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>

        <button onClick={loadMultiscaleData}>Multi-Scale</button>
      </div>

      {/* View Selector */}
      <div className="view-selector">
        <button
          className={view === '3d' ? 'active' : ''}
          onClick={() => setView('3d')}
        >
          3D
        </button>
        <button
          className={view === 'metrics' ? 'active' : ''}
          onClick={() => setView('metrics')}
        >
          Metrics
        </button>
        <button
          className={view === 'multiscale' ? 'active' : ''}
          onClick={() => setView('multiscale')}
        >
          Multiscale
        </button>
      </div>

      {/* Content */}
      <div className="main-content">
        {pulseData && (
          <div className="pulse-sidebar">
            <ManifoldPulse data={pulseData} />
          </div>
        )}

        <div className="primary-view">
          {loading && (
            <div className="loading-overlay">
              <p>Analyzing the manifold…</p>
            </div>
          )}

          {!loading && view === '3d' && manifoldData && (
            <ManifoldViewer3D
              manifoldData={manifoldData}
              width={1000}
              height={700}
            />
          )}

          {!loading && view === 'metrics' && manifoldData && (
            <MetricsPanel data={manifoldData} />
          )}

          {!loading && view === 'multiscale' && multiscaleData && (
            <MultiscaleView data={multiscaleData} />
          )}

          {!loading && !manifoldData && (
            <div className="empty-state">
              <h2>Enter a symbol and press Analyze</h2>
            </div>
          )}
        </div>
      </div>

      <footer className="dashboard-footer">
        © 2025 Joshua Johosky
      </footer>
    </div>
  );
};

export default Dashboard;
