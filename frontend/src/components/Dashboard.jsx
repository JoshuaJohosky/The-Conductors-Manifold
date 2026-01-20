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
  const [view, setView] = useState('3d');

  const api = useManifoldAPI();

  // Load manifold
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

      let interval = intervalMap[feed]?.[timescale];
      if (!interval) interval = '1d';

      console.log(`Fetching ${symbol} | feed=${feed} | interval=${interval} | timescale=${timescale}`);

      const data = await api.analyzeSymbol(symbol, feed, interval, 100, timescale);
      console.log('Fetched manifold data:', data);
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

  useEffect(() => { loadPulseData(); }, [symbol, feed]);
  useEffect(() => { setMultiscaleData(null); }, [symbol, feed]);
  useEffect(() => { const interval = setInterval(loadPulseData, 30000); return () => clearInterval(interval); }, [symbol, feed]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>The Conductor's Manifold [v1.3 LIVE]</h1>
          <p>Real-Time Geometric Interpretation · Stocks (Alpha Vantage) · Crypto (Binance.US)</p>
        </div>
      </header>

      <div className="controls-bar">
        <div className="control-group">
          <label>Symbol</label>
          <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        </div>
        <div className="control-group">
          <label>Data Feed</label>
          <select value={feed} onChange={(e) => setFeed(e.target.value)}>
            <option value="binanceus">Binance.US (Crypto)</option>
            <option value="alphavantage">Alpha Vantage (Stocks)</option>
          </select>
        </div>
        <div className="control-group">
          <label>Timescale</label>
          <TimeframeSelector current={timescale} onSelect={setTimescale} />
        </div>

        <button onClick={loadManifoldData} disabled={loading}>{loading ? 'Analyzing…' : 'Analyze'}</button>
        <button onClick={loadMultiscaleData} disabled={loading}>Multi-Scale</button>
      </div>

      <div className="view-selector">
        <button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>3D Manifold</button>
        <button className={view === 'metrics' ? 'active' : ''} onClick={() => setView('metrics')}>Metrics</button>
        <button className={view === 'multiscale' ? 'active' : ''} onClick={() => setView('multiscale')}>Multi-Scale</button>
      </div>

      <div className="main-content">
        {pulseData && <ManifoldPulse data={pulseData} />}
        <div className="primary-view">
          {loading && <p>Analyzing the manifold…</p>}
          {!loading && view === '3d' && manifoldData && <ManifoldViewer3D manifoldData={manifoldData} width={1000} height={700} />}
          {!loading && view === 'metrics' && manifoldData && <MetricsPanel data={manifoldData} />}
          {!loading && view === 'multiscale' && multiscaleData && <MultiscaleView data={multiscaleData} />}
          {!loading && view === '3d' && !manifoldData && <p>Enter a symbol and press Analyze to begin</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
