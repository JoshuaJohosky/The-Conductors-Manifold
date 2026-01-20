import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * ManifoldViewer3D
 * - Renders a heightfield surface using:
 *   - Y height: blend of normalized price + entropy + curvature (if present)
 *   - Color: entropy gradient
 * - Adds:
 *   - Singularity markers (click to open popup)
 *   - Attractor rings (green)
 * - Resizes to parent container automatically (no weird square/diamond canvas)
 */
const ManifoldViewer3D = ({ manifoldData }) => {
  // ---- Refs (always declared unconditionally) ----
  const containerRef = useRef(null);

  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationRef = useRef(null);

  const manifoldGroupRef = useRef(null);
  const clickableRef = useRef([]); // singularities for raycast

  const [selectedSingularity, setSelectedSingularity] = useState(null);

  // ---- Helpers ----
  const hasData = useMemo(() => {
    return !!(
      manifoldData &&
      Array.isArray(manifoldData.prices) &&
      manifoldData.prices.length > 3 &&
      Array.isArray(manifoldData.local_entropy) &&
      manifoldData.local_entropy.length === manifoldData.prices.length
    );
  }, [manifoldData]);

  // Entropy -> color gradient (cyan/blue -> green -> yellow -> orange/red)
  const getEntropyColor = (t) => {
    const clamp = (x) => Math.max(0, Math.min(1, x));
    const x = clamp(t);

    // Piecewise gradient
    if (x < 0.25) {
      // deep blue -> cyan
      const k = x / 0.25;
      return new THREE.Color(0.0, 0.7 * k, 1.0);
    }
    if (x < 0.5) {
      // cyan -> green
      const k = (x - 0.25) / 0.25;
      return new THREE.Color(0.0, 1.0, 1.0 - 1.0 * k);
    }
    if (x < 0.75) {
      // green -> yellow
      const k = (x - 0.5) / 0.25;
      return new THREE.Color(1.0 * k, 1.0, 0.0);
    }
    // yellow -> orange/red
    const k = (x - 0.75) / 0.25;
    return new THREE.Color(1.0, 1.0 - 0.6 * k, 0.0);
  };

  const disposeObject = (obj) => {
    if (!obj) return;
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
  };

  // ---- Init Three scene (once) ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c12);
    scene.fog = new THREE.Fog(0x0a0c12, 60, 220);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(55, 55, 55);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Make canvas fill container
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.6;
    controlsRef.current = controls;

    // Lights (yesterday vibe: crisp but not blown out)
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(90, 140, 70);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x4cffb3, 0.35);
    rim.position.set(-80, 50, -60);
    scene.add(rim);

    // Subtle grid
    const grid = new THREE.GridHelper(200, 40, 0x123040, 0x0d1822);
    grid.position.y = -2;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);

    // Resize observer
    const resize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);
    resize();

    // Raycast click for singularities
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event) => {
      if (!rendererRef.current || !cameraRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const hits = raycaster.intersectObjects(clickableRef.current, true);
      if (hits.length) {
        // marker spheres store userData on the parent mesh
        let o = hits[0].object;
        while (o && !o.userData?.kind && o.parent) o = o.parent;

        if (o?.userData?.kind === 'singularity') {
          setSelectedSingularity({ ...o.userData.payload });
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Animate
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);

      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      ro.disconnect();

      if (manifoldGroupRef.current) {
        scene.remove(manifoldGroupRef.current);
        disposeObject(manifoldGroupRef.current);
        manifoldGroupRef.current = null;
      }

      clickableRef.current = [];

      controls.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  // ---- Build / rebuild the manifold whenever data changes ----
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old
    if (manifoldGroupRef.current) {
      scene.remove(manifoldGroupRef.current);
      disposeObject(manifoldGroupRef.current);
      manifoldGroupRef.current = null;
    }
    clickableRef.current = [];
    setSelectedSingularity(null);

    if (!hasData) return;

    const prices = manifoldData.prices;
    const entropy = manifoldData.local_entropy;

    const curvature = Array.isArray(manifoldData.curvature_array) && manifoldData.curvature_array.length === prices.length
      ? manifoldData.curvature_array
      : null;

    const tension = Array.isArray(manifoldData.tension) && manifoldData.tension.length === prices.length
      ? manifoldData.tension
      : null;

    const timestamps = Array.isArray(manifoldData.timestamp) && manifoldData.timestamp.length === prices.length
      ? manifoldData.timestamp
      : null;

    // Grid sizing
    const n = prices.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);

    // Normalization ranges
    const pMin = Math.min(...prices);
    const pMax = Math.max(...prices);
    const pRange = (pMax - pMin) || 1;

    const eMin = Math.min(...entropy);
    const eMax = Math.max(...entropy);
    const eRange = (eMax - eMin) || 1;

    const cMin = curvature ? Math.min(...curvature) : 0;
    const cMax = curvature ? Math.max(...curvature) : 1;
    const cRange = curvature ? ((cMax - cMin) || 1) : 1;

    // Geometry (Plane with segments)
    const sizeX = 90;
    const sizeZ = 90;
    const geo = new THREE.PlaneGeometry(sizeX, sizeZ, cols - 1, rows - 1);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);

    // “Yesterday-like” height: price + entropy + curvature micro-structure
    // (tuned so it looks like a living surface, not a flat tile)
    const priceAmp = 26;
    const entropyAmp = 10;
    const curvatureAmp = 6;

    for (let i = 0; i < pos.count; i++) {
      // Map plane vertex i -> data index
      // PlaneGeometry vertices are row-major
      const r = Math.floor(i / cols);
      const c = i % cols;
      const idx = r * cols + c;

      if (idx >= n) {
        // If last row isn't full, pull from last data point for continuity
        const last = n - 1;
        const pN = (prices[last] - pMin) / pRange;
        const eN = (entropy[last] - eMin) / eRange;
        const cN = curvature ? (curvature[last] - cMin) / cRange : 0;

        const y = (pN - 0.5) * priceAmp + (eN - 0.5) * entropyAmp + (cN - 0.5) * curvatureAmp;
        pos.setY(i, y);

        const color = getEntropyColor(eN);
        col[i * 3 + 0] = color.r;
        col[i * 3 + 1] = color.g;
        col[i * 3 + 2] = color.b;
        continue;
      }

      const pN = (prices[idx] - pMin) / pRange;
      const eN = (entropy[idx] - eMin) / eRange;
      const cN = curvature ? (curvature[idx] - cMin) / cRange : 0;

      const y =
        (pN - 0.5) * priceAmp +
        (eN - 0.5) * entropyAmp +
        (cN - 0.5) * curvatureAmp;

      pos.setY(i, y);

      const color = getEntropyColor(eN);
      col[i * 3 + 0] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.45,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    // Wireframe edge hint (subtle)
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x132332, transparent: true, opacity: 0.18 })
    );

    // Group
    const group = new THREE.Group();
    group.add(mesh);
    group.add(wire);

    // Center group at origin
    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    group.position.sub(center);

    // Add attractors (rings) if present
    if (Array.isArray(manifoldData.attractors)) {
      manifoldData.attractors.forEach((a) => {
        if (!a || typeof a.price !== 'number') return;

        const yFromPrice = ((a.price - pMin) / pRange - 0.5) * priceAmp;

        const strength = typeof a.strength === 'number' ? a.strength : 0.6;
        const ringGeo = new THREE.RingGeometry(3.5, 4.2, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x19ffb2,
          transparent: true,
          opacity: Math.max(0.15, Math.min(0.75, strength * 0.6)),
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = yFromPrice;
        ring.position.x = 0;
        ring.position.z = 0;

        group.add(ring);
      });
    }

    // Singularities (clickable markers)
    if (Array.isArray(manifoldData.singularities)) {
      const singularities = manifoldData.singularities;
      const markerGeo = new THREE.SphereGeometry(1.05, 18, 18);
      const glowGeo = new THREE.SphereGeometry(1.8, 18, 18);

      singularities.forEach((idx) => {
        if (typeof idx !== 'number' || idx < 0 || idx >= n) return;

        // Convert idx -> plane x/z
        const r = Math.floor(idx / cols);
        const c = idx % cols;

        // Convert grid cell -> plane coordinates
        const x = (c / Math.max(1, cols - 1) - 0.5) * sizeX;
        const z = (r / Math.max(1, rows - 1) - 0.5) * sizeZ;

        const pN = (prices[idx] - pMin) / pRange;
        const eN = (entropy[idx] - eMin) / eRange;
        const cN = curvature ? (curvature[idx] - cMin) / cRange : 0;

        const y =
          (pN - 0.5) * priceAmp +
          (eN - 0.5) * entropyAmp +
          (cN - 0.5) * curvatureAmp;

        const marker = new THREE.Mesh(
          markerGeo,
          new THREE.MeshBasicMaterial({ color: 0xff4b4b })
        );
        marker.position.set(x, y + 1.2, z);

        const glow = new THREE.Mesh(
          glowGeo,
          new THREE.MeshBasicMaterial({ color: 0xff4b4b, transparent: true, opacity: 0.28 })
        );
        marker.add(glow);

        marker.userData = {
          kind: 'singularity',
          payload: {
            index: idx,
            price: prices[idx],
            entropy: entropy[idx],
            curvature: curvature ? curvature[idx] : null,
            tension: tension ? tension[idx] : null,
            timestamp: timestamps ? timestamps[idx] : null,
          },
        };

        group.add(marker);
        clickableRef.current.push(marker);
      });
    }

    // Add to scene
    scene.add(group);
    manifoldGroupRef.current = group;

    // Make camera “yesterday-like” framing
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const bbox = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 1.25;

      camera.position.set(dist, dist * 0.95, dist);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [hasData, manifoldData]);

  // ---- Render ----
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {!hasData && (
        <div style={emptyOverlay}>
          <div style={{ opacity: 0.9 }}>Waiting for data…</div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
            Click <b>Analyze</b> to render the manifold.
          </div>
        </div>
      )}

      {selectedSingularity && (
        <div style={popupStyle}>
          <div style={popupHeader}>
            <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>⚠ SINGULARITY DETECTED</div>
            <button
              type="button"
              onClick={() => setSelectedSingularity(null)}
              style={closeBtn}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div style={popupGrid}>
            <div style={lbl}>Price</div>
            <div style={val}>${Number(selectedSingularity.price).toFixed(2)}</div>

            <div style={lbl}>Timestamp</div>
            <div style={val}>
              {selectedSingularity.timestamp ? String(selectedSingularity.timestamp) : '—'}
            </div>

            <div style={lbl}>Curvature</div>
            <div style={{ ...val, color: '#ffaa00' }}>
              {selectedSingularity.curvature == null ? '—' : Number(selectedSingularity.curvature).toFixed(6)}
            </div>

            <div style={lbl}>Tension</div>
            <div style={{ ...val, color: '#ff4b4b' }}>
              {selectedSingularity.tension == null ? '—' : Number(selectedSingularity.tension).toFixed(6)}
            </div>

            <div style={lbl}>Entropy</div>
            <div style={{ ...val, color: '#33ddff' }}>
              {selectedSingularity.entropy == null ? '—' : Number(selectedSingularity.entropy).toFixed(6)}
            </div>
          </div>

          <div style={popupNote}>
            Extreme tension point where the manifold geometry became unstable.
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Styles (inline so you don’t fight CSS right now) ----
const emptyOverlay = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(5, 6, 10, 0.35)',
  color: 'rgba(230,230,235,0.92)',
  pointerEvents: 'none',
};

const popupStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  width: 300,
  background: 'rgba(20, 7, 7, 0.92)',
  border: '2px solid rgba(255, 75, 75, 0.95)',
  boxShadow: '0 0 30px rgba(255, 75, 75, 0.18)',
  borderRadius: 14,
  padding: 14,
  color: '#fff',
  zIndex: 50,
};

const popupHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
};

const closeBtn = {
  width: 30,
  height: 30,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: '28px',
};

const popupGrid = {
  display: 'grid',
  gridTemplateColumns: '90px 1fr',
  gap: 6,
  fontSize: 13,
};

const lbl = { opacity: 0.75, fontWeight: 700, color: 'rgba(255,170,170,0.85)' };
const val = { opacity: 0.95, fontWeight: 700 };

const popupNote = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: '1px solid rgba(255,255,255,0.12)',
  fontSize: 12,
  opacity: 0.85,
};

export default ManifoldViewer3D;
