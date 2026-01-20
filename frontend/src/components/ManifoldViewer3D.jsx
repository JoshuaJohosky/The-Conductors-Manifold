// frontend/src/components/ManifoldViewer3D.jsx
/**
 * ManifoldViewer3D
 *
 * Renders a 3D manifold surface from backend data using Three.js.
 * Designed to be resilient: never renders a blank view silently.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const DEFAULT_BG = 0x05060a;

function normalizeArray(arr, fallback = []) {
  return Array.isArray(arr) ? arr : fallback;
}

function minMax(values) {
  if (!values.length) return { min: 0, max: 1 };
  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i += 1) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { min, max: min + 1 };
  return { min, max };
}

function entropyColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.25) return new THREE.Color(0, clamped * 4, 1);
  if (clamped < 0.5) return new THREE.Color(0, 1, 1 - (clamped - 0.25) * 4);
  if (clamped < 0.75) return new THREE.Color((clamped - 0.5) * 4, 1, 0);
  return new THREE.Color(1, 1 - (clamped - 0.75) * 4, 0);
}

function buildSurfaceGeometry({ prices, entropy }) {
  const n = prices.length;

  // Make a guaranteed visible fallback if data is insufficient
  if (n < 4) {
    const geom = new THREE.PlaneGeometry(40, 40, 20, 20);
    const pos = geom.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getY(i); // plane uses x/y; we remap below in mesh transform
      const y = Math.sin(x * 0.15) * 2 + Math.cos(z * 0.15) * 2;
      pos.setZ(i, y);
    }
    geom.computeVertexNormals();
    return geom;
  }

  const width = Math.ceil(Math.sqrt(n));
  const height = Math.ceil(n / width);

  const { min: pMin, max: pMax } = minMax(prices);
  const { min: eMin, max: eMax } = minMax(entropy);

  const pRange = pMax - pMin || 1;
  const eRange = eMax - eMin || 1;

  const vertices = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);

  const xScale = 1.8;
  const zScale = 1.8;
  const yScale = 22;

  for (let i = 0; i < n; i += 1) {
    const gx = i % width;
    const gz = Math.floor(i / width);

    const x = (gx - width / 2) * xScale;
    const z = (gz - height / 2) * zScale;
    const y = ((prices[i] - pMin) / pRange) * yScale;

    vertices[i * 3 + 0] = x;
    vertices[i * 3 + 1] = y;
    vertices[i * 3 + 2] = z;

    const t = (entropy[i] - eMin) / eRange;
    const c = entropyColor(t);

    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const indices = [];
  for (let r = 0; r < height - 1; r += 1) {
    for (let c = 0; c < width - 1; c += 1) {
      const a = r * width + c;
      const b = a + 1;
      const d = a + width;
      const e = d + 1;

      if (a < n && b < n && d < n && e < n) {
        indices.push(a, b, d, b, e, d);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function addSingularities(scene, data, widthHint) {
  const singularities = normalizeArray(data?.singularities, []);
  const prices = normalizeArray(data?.prices, []);
  const curvature = normalizeArray(data?.curvature_array, []);
  const tension = normalizeArray(data?.tension, []);
  const entropy = normalizeArray(data?.local_entropy, []);
  const timestamp = normalizeArray(data?.timestamp, []);

  if (!singularities.length || !prices.length) return [];

  const width = widthHint || Math.ceil(Math.sqrt(prices.length));
  const height = Math.ceil(prices.length / width);

  const { min: pMin, max: pMax } = minMax(prices);
  const pRange = pMax - pMin || 1;

  const group = new THREE.Group();
  const objs = [];

  const sphereGeom = new THREE.SphereGeometry(0.7, 16, 16);
  const glowGeom = new THREE.SphereGeometry(1.2, 16, 16);

  singularities.forEach((idx) => {
    if (typeof idx !== 'number') return;
    if (idx < 0 || idx >= prices.length) return;

    const gx = idx % width;
    const gz = Math.floor(idx / width);

    const x = (gx - width / 2) * 1.8;
    const z = (gz - height / 2) * 1.8;
    const y = ((prices[idx] - pMin) / pRange) * 22;

    const sphere = new THREE.Mesh(
      sphereGeom,
      new THREE.MeshBasicMaterial({ color: 0xff3344 })
    );
    sphere.position.set(x, y + 1.2, z);
    sphere.userData = {
      price: prices[idx],
      curvature: curvature[idx],
      tension: tension[idx],
      entropy: entropy[idx],
      timestamp: timestamp[idx],
    };

    const glow = new THREE.Mesh(
      glowGeom,
      new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.25 })
    );
    sphere.add(glow);

    group.add(sphere);
    objs.push(sphere);
  });

  scene.add(group);
  return objs;
}

function addAttractors(scene, data) {
  const attractors = normalizeArray(data?.attractors, []);
  const prices = normalizeArray(data?.prices, []);
  if (!attractors.length || !prices.length) return;

  const { min: pMin, max: pMax } = minMax(prices);
  const pRange = pMax - pMin || 1;

  attractors.forEach((a) => {
    if (!a || typeof a.price !== 'number') return;
    const strength = typeof a.strength === 'number' ? a.strength : 0.5;

    const y = ((a.price - pMin) / pRange) * 22;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.7, 48),
      new THREE.MeshBasicMaterial({ color: 0x22ff66, transparent: true, opacity: Math.max(0.12, strength * 0.5) })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, 0);
    scene.add(ring);
  });
}

const ManifoldViewer3D = ({ manifoldData, width = 1000, height = 700 }) => {
  // Hooks MUST be unconditional (eslint rule)
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const surfaceRef = useRef(null);
  const singularityRefs = useRef([]);
  const rafRef = useRef(null);

  const [selectedSingularity, setSelectedSingularity] = useState(null);

  const prepared = useMemo(() => {
    const prices = normalizeArray(manifoldData?.prices, []);
    const entropy = normalizeArray(manifoldData?.local_entropy, prices.map(() => 0));
    return { prices, entropy, n: prices.length };
  }, [manifoldData]);

  // Mount Three scene once
  useEffect(() => {
    const mountNode = containerRef.current;
    if (!mountNode) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULT_BG);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(35, 35, 35);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rendererRef.current = renderer;

    mountNode.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 10, 0);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(80, 120, 60);
    scene.add(key);

    const grid = new THREE.GridHelper(120, 60);
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    scene.add(grid);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((event.clientY - r.top) / r.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(singularityRefs.current, true);
      if (!hits.length) return;

      let target = hits[0].object;
      if (!target.userData?.price && target.parent?.userData?.price) target = target.parent;
      if (target.userData?.price) setSelectedSingularity({ ...target.userData });
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);

      controls.dispose();

      // Remove and dispose
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });

      renderer.dispose();

      if (mountNode.contains(renderer.domElement)) mountNode.removeChild(renderer.domElement);
    };
  }, [width, height]);

  // Rebuild surface + markers when data changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old surface
    if (surfaceRef.current) {
      scene.remove(surfaceRef.current);
      surfaceRef.current.geometry.dispose();
      surfaceRef.current.material.dispose();
      surfaceRef.current = null;
    }

    // Clear old markers (singularities/attractors)
    singularityRefs.current.forEach((obj) => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) obj.material.dispose?.();
    });
    singularityRefs.current = [];

    // Remove old rings/lines by name
    const toRemove = [];
    scene.traverse((child) => {
      if (child.name === 'attractor-ring') toRemove.push(child);
    });
    toRemove.forEach((obj) => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) obj.material.dispose?.();
    });

    // Build new
    const geometry = buildSurfaceGeometry({ prices: prepared.prices, entropy: prepared.entropy });

    const material = new THREE.MeshPhongMaterial({
      vertexColors: prepared.n >= 4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      shininess: 18,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // If fallback plane, rotate so it sits like the real manifold (x/z)
    // PlaneGeometry is x/y; we used z displacement above.
    mesh.rotation.x = -Math.PI / 2;

    surfaceRef.current = mesh;
    scene.add(mesh);

    // Add singularities/attractors if present
    const widthHint = prepared.n ? Math.ceil(Math.sqrt(prepared.n)) : 0;
    singularityRefs.current = addSingularities(scene, manifoldData, widthHint);

    // Attractor rings with name so we can cleanup reliably
    const attractors = normalizeArray(manifoldData?.attractors, []);
    const prices = normalizeArray(manifoldData?.prices, []);
    if (attractors.length && prices.length) {
      const { min: pMin, max: pMax } = minMax(prices);
      const pRange = pMax - pMin || 1;
      attractors.forEach((a) => {
        if (!a || typeof a.price !== 'number') return;
        const strength = typeof a.strength === 'number' ? a.strength : 0.5;
        const y = ((a.price - pMin) / pRange) * 22;

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(2.2, 2.7, 48),
          new THREE.MeshBasicMaterial({
            color: 0x22ff66,
            transparent: true,
            opacity: Math.max(0.12, strength * 0.5),
          })
        );
        ring.name = 'attractor-ring';
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, y, 0);
        scene.add(ring);
      });
    }
  }, [manifoldData, prepared]);

  // Resize on prop changes
  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }, [width, height]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={containerRef} style={{ width, height }} />
      {!manifoldData && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', opacity: 0.85 }}>
          Loading Manifold…
        </div>
      )}

      {selectedSingularity && (
        <div style={popupStyle}>
          <div style={headerStyle}>
            <h3 style={titleStyle}>⚠️ SINGULARITY</h3>
            <button type="button" onClick={() => setSelectedSingularity(null)} style={closeButtonStyle}>
              ×
            </button>
          </div>
          <div style={gridStyle}>
            <div style={labelStyle}>Price:</div>
            <div style={valueStyle}>${Number(selectedSingularity.price || 0).toFixed(2)}</div>

            <div style={labelStyle}>Curvature:</div>
            <div style={{ ...valueStyle, color: '#ffaa00' }}>
              {Number(selectedSingularity.curvature || 0).toFixed(6)}
            </div>

            <div style={labelStyle}>Tension:</div>
            <div style={{ ...valueStyle, color: '#ff4d4d' }}>
              {Number(selectedSingularity.tension || 0).toFixed(6)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const popupStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: 'rgba(15, 0, 0, 0.92)',
  border: '2px solid #ff3344',
  borderRadius: 12,
  padding: 16,
  zIndex: 1000,
  color: '#fff',
  minWidth: 260,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 51, 68, 0.35)',
  paddingBottom: 8,
  marginBottom: 10,
};

const titleStyle = { margin: 0, color: '#ff3344', fontSize: 16, letterSpacing: 0.3 };

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 22,
  lineHeight: '22px',
};

const gridStyle = { display: 'grid', gridTemplateColumns: '90px 1fr', gap: 6 };
const labelStyle = { color: '#ff9aa5', fontWeight: 700, fontSize: 13 };
const valueStyle = { color: '#fff', fontWeight: 600, fontSize: 13 };

export default ManifoldViewer3D;
