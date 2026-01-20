import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const DEFAULT_BG = 0x07070a;

export default function ManifoldViewer3D({ manifoldData, width = 1000, height = 700 }) {
  // Hooks MUST be unconditional (eslint rule)
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);

  const meshRef = useRef(null);
  const singularityObjectsRef = useRef([]);
  const [selectedSingularity, setSelectedSingularity] = useState(null);

  // Precompute bounds helpers for nicer camera/scale
  const stats = useMemo(() => {
    const prices = manifoldData?.prices || [];
    const entropy = manifoldData?.local_entropy || [];
    if (!prices.length) return null;

    const pMin = Math.min(...prices);
    const pMax = Math.max(...prices);
    const pRange = pMax - pMin || 1;

    const eMin = entropy.length ? Math.min(...entropy) : 0;
    const eMax = entropy.length ? Math.max(...entropy) : 1;
    const eRange = eMax - eMin || 1;

    return { pMin, pMax, pRange, eMin, eMax, eRange, n: prices.length };
  }, [manifoldData]);

  // --- Init Three scene ONCE ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULT_BG);
    scene.fog = new THREE.Fog(DEFAULT_BG, 60, 220);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1500);
    camera.position.set(40, 35, 40);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.9;
    controlsRef.current = controls;

    // Lighting (makes it look way less “flat”)
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(60, 120, 30);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x88aaff, 0.55);
    rim.position.set(-80, 50, -60);
    scene.add(rim);

    // Helpers (grid)
    const grid = new THREE.GridHelper(160, 40, 0x223344, 0x121820);
    grid.position.y = -2;
    scene.add(grid);

    // Raycaster for singularity clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((event.clientY - r.top) / r.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(singularityObjectsRef.current, true);
      if (!intersects.length) return;

      let target = intersects[0].object;
      // if we clicked the glow child, bubble up
      if (!target.userData?.price && target.parent?.userData?.price) target = target.parent;

      if (target.userData?.price) {
        setSelectedSingularity({ ...target.userData });
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Animate loop
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);

      controls.dispose();

      // dispose scene objects
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });

      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [width, height]);

  // --- Update scene when manifoldData changes ---
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !manifoldData || !stats) return;

    // Clear old mesh + markers
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (Array.isArray(meshRef.current.material)) meshRef.current.material.forEach((m) => m.dispose());
      else meshRef.current.material.dispose();
      meshRef.current = null;
    }

    singularityObjectsRef.current.forEach((o) => scene.remove(o));
    singularityObjectsRef.current = [];

    // Build new
    const surface = createManifoldSurface(manifoldData, stats);
    scene.add(surface);
    meshRef.current = surface;

    const markers = addSingularityMarkers(manifoldData, stats);
    markers.forEach((m) => scene.add(m));
    singularityObjectsRef.current = markers;

    addAttractorIndicators(scene, manifoldData, stats);

    // Fit camera nicer
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const box = new THREE.Box3().setFromObject(surface);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      controls.target.copy(center);

      const maxDim = Math.max(size.x, size.y, size.z) || 40;
      camera.position.set(center.x + maxDim * 0.9, center.y + maxDim * 0.55, center.z + maxDim * 0.9);
      camera.lookAt(center);
      controls.update();
    }
  }, [manifoldData, stats]);

  // UI
  return (
    <div style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        }}
      />

      {!manifoldData && (
        <div style={{ position: 'absolute', top: 14, left: 14, color: '#fff', opacity: 0.85 }}>
          Loading manifold…
        </div>
      )}

      {selectedSingularity && (
        <div style={popupStyle}>
          <div style={headerStyle}>
            <div style={{ fontWeight: 800, color: '#ff4d4d' }}>⚠️ SINGULARITY</div>
            <button style={closeButtonStyle} onClick={() => setSelectedSingularity(null)} type="button">
              ×
            </button>
          </div>

          <div style={gridStyle}>
            <div style={labelStyle}>Price</div>
            <div style={{ color: '#fff' }}>
              {typeof selectedSingularity.price === 'number' ? `$${selectedSingularity.price.toFixed(2)}` : '—'}
            </div>

            <div style={labelStyle}>Curvature</div>
            <div style={{ color: '#ffaa00' }}>
              {typeof selectedSingularity.curvature === 'number' ? selectedSingularity.curvature.toFixed(6) : '—'}
            </div>

            <div style={labelStyle}>Tension</div>
            <div style={{ color: '#ff6666' }}>
              {typeof selectedSingularity.tension === 'number' ? selectedSingularity.tension.toFixed(6) : '—'}
            </div>

            <div style={labelStyle}>Entropy</div>
            <div style={{ color: '#9ad0ff' }}>
              {typeof selectedSingularity.entropy === 'number' ? selectedSingularity.entropy.toFixed(6) : '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Geometry + Markers ----------

function createManifoldSurface(data, stats) {
  const prices = data.prices || [];
  const entropy = data.local_entropy || [];

  const n = prices.length;
  const w = Math.ceil(Math.sqrt(n));
  const h = Math.ceil(n / w);
  const spacing = 2.0;

  const vertices = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);

  // Height exaggeration: make it pop even if BTC is “flat”
  const HEIGHT = 28;

  for (let i = 0; i < n; i++) {
    const xi = i % w;
    const zi = Math.floor(i / w);

    const x = (xi - (w - 1) / 2) * spacing;
    const z = (zi - (h - 1) / 2) * spacing;

    const y = ((prices[i] - stats.pMin) / stats.pRange) * HEIGHT;

    vertices[i * 3 + 0] = x;
    vertices[i * 3 + 1] = y;
    vertices[i * 3 + 2] = z;

    const e = entropy[i] ?? 0;
    const t = (e - stats.eMin) / stats.eRange;
    const c = getEntropyColor(clamp01(t));

    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const indices = [];
  for (let zi = 0; zi < h - 1; zi++) {
    for (let xi = 0; xi < w - 1; xi++) {
      const a = zi * w + xi;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      if (a < n && b < n && c < n && d < n) {
        indices.push(a, b, c, b, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
    emissive: new THREE.Color(0x05070a),
    emissiveIntensity: 0.35,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  return mesh;
}

function addSingularityMarkers(data, stats) {
  const singularities = data.singularities || [];
  const prices = data.prices || [];
  const curvature = data.curvature_array || [];
  const tension = data.tension || [];
  const entropy = data.local_entropy || [];
  const timestamps = data.timestamp || [];

  const n = prices.length;
  const w = Math.ceil(Math.sqrt(n));
  const h = Math.ceil(n / w);
  const spacing = 2.0;
  const HEIGHT = 28;

  const markers = [];

  singularities.forEach((idx) => {
    if (idx == null || idx < 0 || idx >= n) return;

    const xi = idx % w;
    const zi = Math.floor(idx / w);

    const x = (xi - (w - 1) / 2) * spacing;
    const z = (zi - (h - 1) / 2) * spacing;
    const y = ((prices[idx] - stats.pMin) / stats.pRange) * HEIGHT;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xff3b3b })
    );
    sphere.position.set(x, y + 1.2, z);

    sphere.userData = {
      price: prices[idx],
      curvature: curvature[idx],
      tension: tension[idx],
      entropy: entropy[idx],
      timestamp: timestamps[idx],
    };

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.28 })
    );
    sphere.add(glow);

    markers.push(sphere);
  });

  return markers;
}

function addAttractorIndicators(scene, data, stats) {
  const attractors = data.attractors || [];
  const prices = data.prices || [];
  if (!attractors.length || !prices.length) return;

  const HEIGHT = 28;

  attractors.forEach((a) => {
    const price = a?.price;
    const strength = a?.strength ?? 0.5;
    if (typeof price !== 'number') return;

    const y = ((price - stats.pMin) / stats.pRange) * HEIGHT;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.7, 40),
      new THREE.MeshBasicMaterial({
        color: 0x39ff88,
        transparent: true,
        opacity: clamp01(strength) * 0.55,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    scene.add(ring);
  });
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function getEntropyColor(t) {
  // blue -> cyan -> yellow -> orange
  if (t < 0.25) return { r: 0.15, g: t * 3.6, b: 1.0 };
  if (t < 0.5) return { r: 0.1, g: 1.0, b: 1.0 - (t - 0.25) * 3.6 };
  if (t < 0.75) return { r: (t - 0.5) * 3.6, g: 1.0, b: 0.12 };
  return { r: 1.0, g: 1.0 - (t - 0.75) * 3.6, b: 0.1 };
}

// ---------- Popup styles ----------
const popupStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  width: 260,
  background: 'rgba(10,10,14,0.92)',
  border: '1px solid rgba(255,80,80,0.55)',
  borderRadius: 14,
  padding: 14,
  zIndex: 1000,
  color: 'white',
  boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  paddingBottom: 8,
  marginBottom: 10,
};

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 22,
  lineHeight: 1,
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '92px 1fr',
  gap: 6,
  fontSize: 13,
};

const labelStyle = {
  color: 'rgba(255,255,255,0.65)',
  fontWeight: 700,
};
