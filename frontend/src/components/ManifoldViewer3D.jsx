import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function ManifoldViewer3D({ manifoldData, width = 800, height = 600 }) {
  const containerRef = useRef(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);

  const surfaceRef = useRef(null);
  const singularityRefs = useRef([]);

  const [selected, setSelected] = useState(null);

  const parsed = useMemo(() => normalizeManifoldData(manifoldData), [manifoldData]);

  // --- init three once (and when width/height change) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // clean previous renderer if hot-reloading / remount
    if (rendererRef.current?.domElement && rendererRef.current.domElement.parentElement) {
      rendererRef.current.domElement.parentElement.removeChild(rendererRef.current.domElement);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(30, 40, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(50, 100, 50);
    dir.castShadow = true;
    scene.add(dir);

    // subtle grid
    const grid = new THREE.GridHelper(120, 24, 0x1d1d1d, 0x121212);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);

    // click picking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((event.clientY - r.top) / r.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const candidates = singularityRefs.current.filter(Boolean);
      if (!candidates.length) return;

      const hits = raycaster.intersectObjects(candidates, true);
      if (!hits.length) return;

      let obj = hits[0].object;
      while (obj && !obj.userData?.__singularity && obj.parent) obj = obj.parent;

      if (obj?.userData?.__singularity) {
        setSelected({ ...obj.userData.payload });
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      controls.dispose();

      // dispose scene children
      disposeScene(scene);

      renderer.dispose();
      if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      surfaceRef.current = null;
      singularityRefs.current = [];
    };
  }, [width, height]);

  // --- update geometry when data changes ---
  useEffect(() => {
    if (!parsed.ok) return;
    const scene = sceneRef.current;
    if (!scene) return;

    // remove old surface + singularities + attractors (tagged)
    removeTagged(scene, '__surface');
    removeTagged(scene, '__singularity');
    removeTagged(scene, '__attractor');

    // surface
    const surface = buildSurfaceMesh(parsed);
    surface.userData.__surface = true;
    scene.add(surface);
    surfaceRef.current = surface;

    // singularities
    const singularities = buildSingularityMarkers(parsed);
    singularityRefs.current = singularities;
    singularities.forEach((m) => scene.add(m));

    // attractors
    const attractors = buildAttractors(parsed);
    attractors.forEach((a) => scene.add(a));
  }, [parsed]);

  if (!parsed.ok) {
    return (
      <div style={{ color: 'white', padding: 16 }}>
        {parsed.message || 'No manifold data yet. Click Analyze.'}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={containerRef} style={{ width, height }} />
      {selected && (
        <div style={popupStyle}>
          <div style={headerStyle}>
            <div style={titleStyle}>⚠️ SINGULARITY DETECTED</div>
            <button style={closeButtonStyle} onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
          </div>
          <div style={gridStyle}>
            <div style={labelStyle}>Price:</div>
            <div style={valueStyle}>${safeFixed(selected.price, 2)}</div>

            <div style={labelStyle}>Curvature:</div>
            <div style={valueWarnStyle}>{safeFixed(selected.curvature, 6)}</div>

            <div style={labelStyle}>Tension:</div>
            <div style={valueHotStyle}>{safeFixed(selected.tension, 6)}</div>

            <div style={labelStyle}>Entropy:</div>
            <div style={valueCoolStyle}>{safeFixed(selected.entropy, 6)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- helpers ----------------------- */

function normalizeManifoldData(data) {
  if (!data || typeof data !== 'object') return { ok: false, message: 'No manifold data yet. Click Analyze.' };

  // canonical keys used by your backend
  const prices = Array.isArray(data.prices) ? data.prices : null;

  // tolerate alternate shapes
  const localEntropy =
    Array.isArray(data.local_entropy) ? data.local_entropy :
    Array.isArray(data.entropy) ? data.entropy :
    Array.isArray(data.localEntropy) ? data.localEntropy :
    null;

  if (!prices || prices.length < 4) return { ok: false, message: 'Backend returned no usable price series.' };

  const n = prices.length;

  const singularities = Array.isArray(data.singularities) ? data.singularities : [];
  const curvature = Array.isArray(data.curvature_array) ? data.curvature_array : Array.isArray(data.curvature) ? data.curvature : new Array(n).fill(0);
  const tension = Array.isArray(data.tension) ? data.tension : new Array(n).fill(0);
  const timestamp = Array.isArray(data.timestamp) ? data.timestamp : Array.isArray(data.timestamps) ? data.timestamps : null;

  const attractors = Array.isArray(data.attractors) ? data.attractors : [];

  const entropy = localEntropy && localEntropy.length === n ? localEntropy : new Array(n).fill(0);

  return {
    ok: true,
    n,
    prices,
    entropy,
    singularities,
    curvature,
    tension,
    timestamp,
    attractors,
  };
}

function buildSurfaceMesh(parsed) {
  const { prices, entropy, n } = parsed;

  const w = Math.ceil(Math.sqrt(n));
  const h = Math.ceil(n / w);

  const pMin = arrayMin(prices);
  const pMax = arrayMax(prices);
  const pRange = pMax - pMin || 1;

  const eMin = arrayMin(entropy);
  const eMax = arrayMax(entropy);
  const eRange = eMax - eMin || 1;

  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);

  for (let i = 0; i < n; i++) {
    const x = (i % w) * 2 - w;
    const z = Math.floor(i / w) * 2 - h;
    const y = ((prices[i] - pMin) / pRange) * 20;

    const pi = i * 3;
    positions[pi] = x;
    positions[pi + 1] = y;
    positions[pi + 2] = z;

    const t = (entropy[i] - eMin) / eRange;
    const c = entropyColor(clamp01(t));
    colors[pi] = c.r;
    colors[pi + 1] = c.g;
    colors[pi + 2] = c.b;
  }

  const indices = [];
  for (let row = 0; row < h - 1; row++) {
    for (let col = 0; col < w - 1; col++) {
      const a = row * w + col;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      if (a < n && b < n && c < n && d < n) indices.push(a, b, c, b, d, c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    shininess: 20,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  return mesh;
}

function buildSingularityMarkers(parsed) {
  const { singularities, prices, curvature, tension, entropy, timestamp, n } = parsed;
  if (!Array.isArray(singularities) || !singularities.length) return [];

  const w = Math.ceil(Math.sqrt(n));
  const h = Math.ceil(n / w);

  const pMin = arrayMin(prices);
  const pMax = arrayMax(prices);
  const pRange = pMax - pMin || 1;

  const objs = [];
  const coreGeom = new THREE.SphereGeometry(0.75, 16, 16);
  const glowGeom = new THREE.SphereGeometry(1.15, 16, 16);

  for (const idx of singularities) {
    if (typeof idx !== 'number' || idx < 0 || idx >= prices.length) continue;

    const x = (idx % w) * 2 - w;
    const z = Math.floor(idx / w) * 2 - h;
    const y = ((prices[idx] - pMin) / pRange) * 20;

    const core = new THREE.Mesh(coreGeom, new THREE.MeshBasicMaterial({ color: 0xff2b2b }));
    core.position.set(x, y + 1.0, z);

    const glow = new THREE.Mesh(
      glowGeom,
      new THREE.MeshBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0.25 })
    );
    core.add(glow);

    core.userData.__singularity = true;
    core.userData.payload = {
      price: prices[idx],
      curvature: curvature?.[idx],
      tension: tension?.[idx],
      entropy: entropy?.[idx],
      timestamp: timestamp?.[idx],
      index: idx,
    };

    objs.push(core);
  }

  return objs;
}

function buildAttractors(parsed) {
  const { attractors, prices } = parsed;
  if (!Array.isArray(attractors) || !attractors.length) return [];

  const pMin = arrayMin(prices);
  const pMax = arrayMax(prices);
  const pRange = pMax - pMin || 1;

  const objs = [];

  for (const a of attractors) {
    if (!a || typeof a.price !== 'number') continue;
    const strength = typeof a.strength === 'number' ? a.strength : 0.5;

    const y = ((a.price - pMin) / pRange) * 20;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 2.6, 48),
      new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: clamp01(strength) * 0.6,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.userData.__attractor = true;

    objs.push(ring);
  }

  return objs;
}

function removeTagged(scene, tagKey) {
  const toRemove = [];
  scene.traverse((o) => {
    if (o?.userData?.[tagKey]) toRemove.push(o);
  });

  for (const o of toRemove) {
    if (o.parent) o.parent.remove(o);
    disposeObject(o);
  }
}

function disposeScene(scene) {
  const toDispose = [];
  scene.traverse((o) => toDispose.push(o));
  toDispose.reverse().forEach((o) => {
    if (o.parent) o.parent.remove(o);
    disposeObject(o);
  });
}

function disposeObject(o) {
  if (!o) return;
  if (o.geometry) o.geometry.dispose?.();
  if (o.material) {
    if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
    else o.material.dispose?.();
  }
}

function arrayMin(arr) {
  let m = Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] < m) m = arr[i];
  return m === Infinity ? 0 : m;
}

function arrayMax(arr) {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m === -Infinity ? 0 : m;
}

function clamp01(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function entropyColor(t) {
  if (t < 0.25) return { r: 0, g: t * 4, b: 1 };
  if (t < 0.5) return { r: 0, g: 1, b: 1 - (t - 0.25) * 4 };
  if (t < 0.75) return { r: (t - 0.5) * 4, g: 1, b: 0 };
  return { r: 1, g: 1 - (t - 0.75) * 4, b: 0 };
}

function safeFixed(v, digits) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return v.toFixed(digits);
}

/* ----------------------- popup styles ----------------------- */

const popupStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: 'rgba(20, 0, 0, 0.95)',
  border: '2px solid #ff2b2b',
  borderRadius: 12,
  padding: 16,
  zIndex: 1000,
  color: 'white',
  width: 280,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 80, 80, 0.25)',
  paddingBottom: 8,
  marginBottom: 10,
};

const titleStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: '#ff2b2b',
  letterSpacing: 0.3,
};

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 20,
  lineHeight: 1,
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '92px 1fr',
  gap: 6,
  fontSize: 13,
};

const labelStyle = { color: '#ff8a8a', fontWeight: 700 };
const valueStyle = { color: '#ffffff' };
const valueWarnStyle = { color: '#ffaa00' };
const valueHotStyle = { color: '#ff3b3b' };
const valueCoolStyle = { color: '#66ccff' };
