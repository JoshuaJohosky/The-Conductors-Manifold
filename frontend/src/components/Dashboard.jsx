// frontend/src/components/Dashboard.jsx
/**
 * Main Dashboard Component
 *
 * Stable symbol handling (no request spam while typing) + correct interval mapping.
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
  return String(raw ?? '').trim().toUpperCase();
}

function getIntervalForFeed(feed, timescale) {
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

  // Input state (what user is typing)
  const [symbolInput, setSymbolInput] = useState('BTCUSDT');

  // Debounced / “committed” symbol used for API calls
  const [symbol, setSymbol] = useState('BTCUSDT');

  const [feed, setFeed] = useState('binanceus');
  const [timescale, setTimescale] = useState('daily');

  const [manifoldData, setManifoldData] = useState(null);
  const [pulseData, setPulseData] = useState(null);
  const [multiscaleData, setMultiscaleData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('3d'); // '3d' | 'metrics' | 'multiscale'

  const normalizedInput = useMemo(() => normalizeSymbol(symbolInput), [symbolInput]);
  const normalizedSymbol = useMemo(() => normalizeSymbol(symbol), [symbol]);
  const interval = useMemo(() => getIntervalForFeed(feed, timescale), [feed, timescale]);

  // Debounce typing -> commit symbol after user pauses
  useEffect(() => {
    const t = setTimeout(() => {
      const next = normalizeSymbol(symbolInput);
      if (next && next !== symbol) setSymbol(next);
    }, 600);

    return () => clearTimeout(t);
  }, [symbolInput, symbol]);

  const loadPulseData = useCallback(async () => {
    if (!normalizedSymbol) return;
    try {
      const data = await api.getManifoldPulse(normalizedSymbol, feed);
      setPulseData(data);
    } catch (error) {
      // keep last good pulse on screen
      console.error('Failed to load pulse data:', error);
    }
  }, [api, feed, normalizedSymbol]);

  const loadManifoldData = useCallback(async () => {
    if (!normalizedSymbol) return;
    setLoading(true);
    try {
      const data = await api.analyzeSymbol(normalizedSymbol, feed, interval, 100, timescale);
      setManifoldData(data);
      setView('3d');
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

  // Initial load when committed symbol/feed/timescale changes
  useEffect(() => {
    loadManifoldData();
    loadPulseData();
  }, [loadManifoldData, loadPulseData]);

  // Auto-refresh pulse (does NOT run while user is actively editing symbolInput)
  useEffect(() => {
    const typing = normalizeSymbol(symbolInput) !== normalizedSymbol;
    if (typing) return undefined;

    const id = setInterval(loadPulseData, 30000);
    return () => clearInterval(id);
  }, [loadPulseData, symbolInput, normalizedSymbol]);

  // Clear multiscale when symbol/feed changes
  useEffect(() => {
    setMultiscaleData(null);
  }, [normalizedSymbol, feed]);

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
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            placeholder="BTCUSDT"
            className="input-field"
            spellCheck="false"
            autoCapitalize="characters"
            autoCorrect="off"
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
          disabled={!manifoldData}
          title={!manifoldData ? 'Analyze first' : ''}
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

          {!loading && view === '3d' && (
            <div className="view-container" style={{ width: '100%', height: '100%' }}>
              <ManifoldViewer3D manifoldData={manifoldData} />
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

          {!loading && view !== '3d' && !manifoldData && (
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


// frontend/src/components/ManifoldViewer3D.jsx
/**
 * ManifoldViewer3D
 *
 * - Hooks are NEVER conditional (no ESLint hooks-rule errors)
 * - Responsive canvas (ResizeObserver)
 * - Builds a colored, displaced surface using prices + entropy + curvature/tension if present
 * - Singularity markers + attractor rings + click popup
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function minMax(arr) {
  if (!arr.length) return { min: 0, max: 1 };
  let min = arr[0];
  let max = arr[0];
  for (let i = 1; i < arr.length; i += 1) {
    const v = arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) max = min + 1;
  return { min, max };
}

function clamp01(t) {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function entropyColor(t) {
  // Blue -> Cyan -> Green -> Yellow -> Orange/Red
  const x = clamp01(t);
  if (x < 0.25) return new THREE.Color(0, x * 4, 1);
  if (x < 0.5) return new THREE.Color(0, 1, 1 - (x - 0.25) * 4);
  if (x < 0.75) return new THREE.Color((x - 0.5) * 4, 1, 0);
  return new THREE.Color(1, 1 - (x - 0.75) * 4, 0);
}

function buildSurfaceGeometry(data) {
  const prices = safeArray(data?.prices);
  const entropy = safeArray(data?.local_entropy);
  const curvature = safeArray(data?.curvature_array);
  const tension = safeArray(data?.tension);

  const n = prices.length;
  if (n < 4) return null;

  const widthSegs = Math.max(10, Math.floor(Math.sqrt(n)));
  const heightSegs = Math.max(10, Math.floor(n / widthSegs));

  const planeW = 34;
  const planeH = 24;
  const geometry = new THREE.PlaneGeometry(planeW, planeH, widthSegs - 1, heightSegs - 1);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const colorAttr = new THREE.Float32BufferAttribute(pos.count * 3, 3);

  const pMM = minMax(prices);
  const eMM = entropy.length ? minMax(entropy) : { min: 0, max: 1 };
  const cMM = curvature.length ? minMax(curvature) : { min: -1, max: 1 };
  const tMM = tension.length ? minMax(tension) : { min: -1, max: 1 };

  // Displacement scales tuned to “yesterday look”: a folded colorful surface, not a flat tile.
  const priceAmp = 12;
  const curveAmp = 6;
  const tensionAmp = 6;

  for (let i = 0; i < pos.count; i += 1) {
    const idx = Math.min(n - 1, Math.floor((i / pos.count) * n));

    const pNorm = (prices[idx] - pMM.min) / (pMM.max - pMM.min);
    const eNorm = entropy.length ? (entropy[idx] - eMM.min) / (eMM.max - eMM.min) : 0.5;
    const cNorm = curvature.length ? (curvature[idx] - cMM.min) / (cMM.max - cMM.min) : 0;
    const tNorm = tension.length ? (tension[idx] - tMM.min) / (tMM.max - tMM.min) : 0;

    // Height field: price + curvature + tension; also add mild “rippling” for depth.
    const ripple = Math.sin(i * 0.15) * 0.6 + Math.cos(i * 0.07) * 0.4;
    const y =
      (pNorm - 0.5) * priceAmp +
      (cNorm - 0.5) * curveAmp +
      (tNorm - 0.5) * tensionAmp +
      ripple;

    pos.setY(i, y);

    const col = entropyColor(eNorm);
    colorAttr.setXYZ(i, col.r, col.g, col.b);
  }

  geometry.setAttribute('color', colorAttr);
  geometry.computeVertexNormals();

  return { geometry, widthSegs, heightSegs, planeW, planeH, n, prices, pMM };
}

function buildSingularities(data, surfaceMeta) {
  const singularities = safeArray(data?.singularities);
  if (!singularities.length || !surfaceMeta) return [];

  const { widthSegs, heightSegs, planeW, planeH, n, prices, pMM } = surfaceMeta;
  const curvature = safeArray(data?.curvature_array);
  const tension = safeArray(data?.tension);
  const entropy = safeArray(data?.local_entropy);
  const timestamp = safeArray(data?.timestamp);

  // Map series index -> plane x/z using the same “grid-ish” mapping as geometry sampling
  const objects = [];
  const sphereGeo = new THREE.SphereGeometry(0.55, 18, 18);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.25 });

  singularities.forEach((rawIdx) => {
    const idx = Number(rawIdx);
    if (!Number.isFinite(idx) || idx < 0) return;

    const t = Math.min(1, idx / Math.max(1, n - 1));
    const gridIndex = Math.floor(t * (widthSegs * heightSegs - 1));
    const gx = gridIndex % widthSegs;
    const gz = Math.floor(gridIndex / widthSegs);

    const x = (gx / (widthSegs - 1) - 0.5) * planeW;
    const z = (gz / (heightSegs - 1) - 0.5) * planeH;

    const p = prices[Math.min(n - 1, idx)] ?? prices[Math.min(n - 1, Math.floor(t * (n - 1)))] ?? 0;
    const y = ((p - pMM.min) / (pMM.max - pMM.min) - 0.5) * 12 + 1.1;

    const core = new THREE.Mesh(sphereGeo, coreMat);
    core.position.set(x, y, z);
    core.userData = {
      price: p,
      curvature: curvature[idx],
      tension: tension[idx],
      entropy: entropy[idx],
      timestamp: timestamp[idx],
    };

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 18), glowMat);
    core.add(glow);

    objects.push(core);
  });

  return objects;
}

function buildAttractors(data, surfaceMeta) {
  const attractors = safeArray(data?.attractors);
  if (!attractors.length || !surfaceMeta) return [];

  const { pMM } = surfaceMeta;
  const rings = [];

  attractors.forEach((a) => {
    const price = Number(a?.price);
    const strength = Number(a?.strength ?? 0.6);
    if (!Number.isFinite(price)) return;

    const y = ((price - pMM.min) / (pMM.max - pMM.min) - 0.5) * 12 + 0.2;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: clamp01(strength) * 0.55,
        side: THREE.DoubleSide,
      })
    );

    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, 0);
    rings.push(ring);
  });

  return rings;
}

const popupStyle = {
  position: 'absolute',
  top: 18,
  right: 18,
  width: 320,
  background: 'rgba(20, 0, 0, 0.92)',
  border: '2px solid rgba(255, 77, 77, 0.95)',
  borderRadius: 12,
  padding: 14,
  zIndex: 20,
  color: '#fff',
  boxShadow: '0 0 20px rgba(255, 77, 77, 0.25)',
  backdropFilter: 'blur(4px)',
};

const ManifoldViewer3D = ({ manifoldData }) => {
  // Hooks MUST be unconditional
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animRef = useRef(0);

  const surfaceRef = useRef(null);
  const singularityRefs = useRef([]);
  const attractorRefs = useRef([]);

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(false);

  const surfaceMeta = useMemo(() => buildSurfaceGeometry(manifoldData), [manifoldData]);

  // Create scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 40, 140);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    camera.position.set(34, 28, 34);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 12;
    controls.maxDistance = 120;
    controlsRef.current = controls;

    // Lights tuned to match your “yesterday” vibe (bright surface, clear depth)
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(40, 80, 30);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x66aaff, 0.6);
    fill.position.set(-60, 35, -40);
    scene.add(fill);

    const grid = new THREE.GridHelper(80, 40, 0x224455, 0x112233);
    grid.position.y = -10;
    scene.add(grid);

    const resize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    setReady(true);

    return () => {
      setReady(false);
      ro.disconnect();
      cancelAnimationFrame(animRef.current);

      // Dispose scene
      try {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
            else obj.material.dispose?.();
          }
        });
      } catch (_) {
        // ignore dispose failures
      }

      controls.dispose();
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Click handling (singularities)
  useEffect(() => {
    const container = containerRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!container || !renderer || !camera) return undefined;

    const onPointerDown = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.set(mx, my);

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(singularityRefs.current, true);

      if (!hits.length) return;

      let obj = hits[0].object;
      if (!obj.userData?.price && obj.parent?.userData?.price) obj = obj.parent;

      if (obj.userData?.price) {
        setSelected({ ...obj.userData });
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    return () => renderer.domElement.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // Update surface + markers when data changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !ready) return;

    // remove old surface
    if (surfaceRef.current) {
      scene.remove(surfaceRef.current);
      surfaceRef.current.geometry?.dispose?.();
      surfaceRef.current.material?.dispose?.();
      surfaceRef.current = null;
    }

    // remove old singularities
    singularityRefs.current.forEach((o) => {
      scene.remove(o);
      o.geometry?.dispose?.();
      o.material?.dispose?.();
      if (o.children?.length) {
        o.children.forEach((c) => {
          c.geometry?.dispose?.();
          c.material?.dispose?.();
        });
      }
    });
    singularityRefs.current = [];

    // remove old attractors
    attractorRefs.current.forEach((o) => {
      scene.remove(o);
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
    attractorRefs.current = [];

    if (!surfaceMeta?.geometry) return;

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 18,
      transparent: true,
      opacity: 0.92,
    });

    const mesh = new THREE.Mesh(surfaceMeta.geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    surfaceRef.current = mesh;
    scene.add(mesh);

    // Markers
    const singObjs = buildSingularities(manifoldData, surfaceMeta);
    singObjs.forEach((o) => scene.add(o));
    singularityRefs.current = singObjs;

    const rings = buildAttractors(manifoldData, surfaceMeta);
    rings.forEach((o) => scene.add(o));
    attractorRefs.current = rings;
  }, [manifoldData, ready, surfaceMeta]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 520,
          borderRadius: 12,
          overflow: 'hidden',
          background: '#0a0a0f',
        }}
      />

      {!manifoldData && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255,255,255,0.75)',
            pointerEvents: 'none',
            fontSize: 14,
          }}
        >
          Loading manifold...
        </div>
      )}

      {selected && (
        <div style={popupStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, color: '#ff4d4d' }}>⚠️ SINGULARITY DETECTED</div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 18,
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div
            style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: '110px 1fr',
              gap: 6,
              fontSize: 13,
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Price:</div>
            <div style={{ color: '#fff' }}>
              {Number.isFinite(selected.price) ? `$${Number(selected.price).toFixed(2)}` : '—'}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Timestamp:</div>
            <div style={{ color: '#fff' }}>{selected.timestamp ?? '—'}</div>

            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Curvature:</div>
            <div style={{ color: '#ffaa00' }}>
              {Number.isFinite(selected.curvature) ? Number(selected.curvature).toFixed(6) : '—'}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Tension:</div>
            <div style={{ color: '#ff4d4d' }}>
              {Number.isFinite(selected.tension) ? Number(selected.tension).toFixed(6) : '—'}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Entropy:</div>
            <div style={{ color: '#66e0ff' }}>
              {Number.isFinite(selected.entropy) ? Number(selected.entropy).toFixed(6) : '—'}
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              background: 'rgba(255,77,77,0.08)',
              border: '1px solid rgba(255,77,77,0.25)',
              fontSize: 12,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Extreme tension point where the manifold geometry became unstable.
          </div>
        </div>
      )}
    </div>
  );
};

export default ManifoldViewer3D;
