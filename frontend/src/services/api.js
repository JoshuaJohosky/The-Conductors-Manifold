/**
 * API Service for The Conductor's Manifold
 *
 * Handles all communication with the backend API and WebSocket connections.
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

/**
 * Main API client class
 */
class ManifoldAPIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Analyze a symbol
  async analyzeSymbol(symbol, feed = 'binance', interval = '1d', limit = 100, timescale = 'daily') {
    return this.request(
      `/api/v1/analyze/${symbol}?feed=${feed}&interval=${interval}&limit=${limit}&timescale=${timescale}`
    );
  }

  // Multi-scale analysis
  async analyzeMultiscale(symbol, feed = 'binance', limit = 200) {
    return this.request(
      `/api/v1/multiscale/${symbol}?feed=${feed}&limit=${limit}`
    );
  }

  // Get attractors
  async getAttractors(symbol, feed = 'binance', limit = 100) {
    return this.request(
      `/api/v1/attractors/${symbol}?feed=${feed}&limit=${limit}`
    );
  }

  // Get singularities
  async getSingularities(symbol, feed = 'binance', limit = 100) {
    return this.request(
      `/api/v1/singularities/${symbol}?feed=${feed}&limit=${limit}`
    );
  }

  // Get manifold pulse
  async getManifoldPulse(symbol, feed = 'binance') {
    return this.request(
      `/api/v1/pulse/${symbol}?feed=${feed}`
    );
  }

  // Create WebSocket connection for real-time updates
  connectRealtime(symbol, feed = 'binance', onMessage, onError) {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/realtime/${symbol}?feed=${feed}`);

    ws.onopen = () => {
      console.log(`WebSocket connected for ${symbol}`);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected for ${symbol}`);
    };

    return ws;
  }
}

/**
 * React hook for using the Manifold API
 */
export const useManifoldAPI = () => {
  const [client] = useState(() => new ManifoldAPIClient());
  return client;
};

/**
 * React hook for real-time manifold data
 */
export const useRealtimeManifold = (symbol, feed = 'binance') => {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const client = useManifoldAPI();

  useEffect(() => {
    if (!symbol) return;

    const ws = client.connectRealtime(
      symbol,
      feed,
      (message) => {
        if (message.type === 'connected') {
          setConnected(true);
        } else if (message.type === 'update') {
          setData(message.data);
        }
      },
      (err) => {
        setError(err);
        setConnected(false);
      }
    );

    return () => {
      ws.close();
      setConnected(false);
    };
  }, [symbol, feed]);

  return { data, connected, error };
};

/**
 * React hook for polling manifold pulse
 */
export const useManifoldPulse = (symbol, feed = 'binance', interval = 30000) => {
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const client = useManifoldAPI();

  const fetchPulse = useCallback(async () => {
    if (!symbol) return;

    setLoading(true);
    try {
      const data = await client.getManifoldPulse(symbol, feed);
      setPulse(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [symbol, feed, client]);

  useEffect(() => {
    fetchPulse();

    if (interval > 0) {
      const timer = setInterval(fetchPulse, interval);
      return () => clearInterval(timer);
    }
  }, [fetchPulse, interval]);

  return { pulse, loading, error, refetch: fetchPulse };
};

/**
 * Export singleton client for non-hook usage
 */
export const manifestClient = new ManifoldAPIClient();

export default ManifoldAPIClient;
