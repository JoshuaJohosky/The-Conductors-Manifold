import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * ManifoldViewer3D (stable + investor-demo friendly)
 * - Heightfield surface:
 *   - Y = normalized price + entropy + curvature (if present)
 * - Vertex colors from entropy gradient
 * - Click singularity markers -> popup
 * - Resizes to parent container
 */

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function entropyColor(t) {
  const x = clamp01(t);
  // deep blue -> cyan -> green -> yellow -> orange
  if (x < 0.25) {
    const k = x / 0.25;
    return new THREE.Color(0.0, 0.7 * k, 1.0);
  }
  if (x < 0.5) {
    const k = (x - 0.25) / 0.25;
    return new THREE.Color(0.0, 1.0, 1.0 - 1.0 * k);
  }
  if (x < 0.75) {
    const k = (x - 0.5) / 0.25;
    return new THREE.Color(1.0 * k, 1.0, 0.0);
  }
  const k = (x - 0.75) / 0.25;
  return new THREE.Color(1.0, 1.0 - 0.6 * k, 0.0);
}

function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });
}

const ManifoldViewer3D = ({ manifoldData }) => {
  // Refs (never conditional)
  const containerRef = useRef(null);

  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationRef = useRef(null);

  const manifoldGroupRef = useRef(null);
  const clickableRef = useRef([]); // singularity meshes

  // ✅ ONE state pair. Do not create any other “selected” variants.
  const [selectedSingularity, setSelectedSingularity] = useState(null);

  const hasData = useMemo(() => {
    return !!(
      manifoldData &&
      Array.isArray(manifoldData.prices) &&
      manifoldData.prices.length > 8 &&
      Array.isArray(manifoldData.local_entropy) &&
      manifoldData.local_entropy.length === manifoldData.prices.length
    );
  }, [manifoldData]);

  // ---- Init Three (once) ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c12);
    scene.fog = new THREE.Fog(0x0a0c12, 80, 260);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1500);
    camera.position.set(70, 58, 70);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(110, 160, 90);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x4cffb3, 0.35);
    rim.position.set(-90, 60, -70);
    scene.add(rim);

    // Grid
    const grid = new THREE.GridHelper(220, 44, 0x123040, 0x0d1822);
    grid.position.y = -6;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    scene.add(grid);

    // Resize
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

    // Raycast for singularities
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event) => {
      const cam = cameraRef.current;
      const r = rendererRef.current;
      if (!cam || !r) return;

      const rect = r.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cam);
      const hits = raycaster.intersectObjects(clickableRef.current, true);

      if (hits.length) {
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

      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  // ---- Build / rebuild on data change ----
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // remove old group
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

    const curvature =
      Array.isArray(manifoldData.curvature_array) &&
      manifoldData.curvature_array.length === prices.length
        ? manifoldData.curvature_array
        : null;

    const tension =
      Array.isArray(manifoldData.tension) && manifoldData.tension.length === prices.length
        ? manifoldData.tension
        : null;

    const timestamps =
      Array.isArray(manifoldData.timestamp) && manifoldData.timestamp.length === prices.length
        ? manifoldData.timestamp
        : null;

    const n = prices.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);

    const pMin = Math.min(...prices);
    const pMax = Math.max(...prices);
    const pRange = (pMax - pMin) || 1;

    const eMin = Math.min(...entropy);
    const eMax = Math.max(...entropy);
    const eRange = (eMax - eMin) || 1;

    const cMin = curvature ? Math.min(...curvature) : 0;
    const cMax = curvature ? Math.max(...curvature) : 1;
    const cRange = curvature ? ((cMax - cMin) || 1) : 1;

    // Size
    const sizeX = 120;
    const sizeZ = 120;

    // More “yesterday” vertical energy
    const priceAmp = 46;
    const entropyAmp = 18;
    const curvatureAmp = 10;

    const geo = new THREE.PlaneGeometry(sizeX, sizeZ, cols - 1, rows - 1);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      let idx = r * cols + c;
      if (idx >= n) idx = n - 1;

      const pN = (prices[idx] - pMin) / pRange;
      const eN = (entropy[idx] - eMin) / eRange;
      const cN = curvature ? (curvature[idx] - cMin) / cRange : 0;

      // Add a tiny ridge so it never looks “dead flat”
      const ridge = Math.sin((c / Math.max(1, cols - 1)) * Math.PI * 2) * 1.4
                  + Math.cos((r / Math.max(1, rows - 1)) * Math.PI * 2) * 1.1;

      const y =
        (pN - 0.5) * priceAmp +
        (eN - 0.5) * entropyAmp +
        (cN - 0.5) * curvatureAmp +
        ridge;

      pos.setY(i, y);

      const colr = entropyColor(eN);
      colors[i * 3 + 0] = colr.r;
      colors[i * 3 + 1] = colr.g;
      colors[i * 3 + 2] = colr.b;
    }

    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.attributes.color.needsUpdate = true;

    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.10,
      side: THREE.DoubleSide,
    });

    const surface = new THREE.Mesh(geo, mat);
    surface.receiveShadow = true;

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x132332, transparent: true, opacity: 0.16 })
    );

    const group = new THREE.Group();
    group.add(surface);
    group.add(wire);

    // Center group
    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    group.position.sub(center);

    // Attractors (rings)
    if (Array.isArray(manifoldData.attractors)) {
      manifoldData.attractors.forEach((a) => {
        if (!a || typeof a.price !== 'number') return;

        const yFromPrice = ((a.price - pMin) / pRange - 0.5) * priceAmp;
        const strength = typeof a.strength === 'number' ? a.strength : 0.6;

        const ringGeo = new THREE.RingGeometry(4.2, 5.0, 56);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x19ffb2,
          transparent: true,
          opacity: Math.max(0.18, Math.min(0.8, strength * 0.65)),
          side: THREE.DoubleSide,
        });

        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, yFromPrice, 0);
        group.add(ring);
      });
    }

    // Singularities (markers)
    if (Array.isArray(manifoldData.singularities)) {
      const markerGeo = new THREE.SphereGeometry(1.2, 20, 20);
      const glowGeo = new THREE.SphereGeometry(2.0, 20, 20);

      manifoldData.singularities.forEach((idx) => {
        if (typeof idx !== 'number' || idx < 0 || idx >= n) return;

        const rr = Math.floor(idx / cols);
        const cc = idx % cols;

        const x = (cc / Math.max(1, cols - 1) - 0.5) * sizeX;
        const z = (rr / Math.max(1, rows - 1) - 0.5) * sizeZ;

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
        marker.position.set(x, y + 2.0, z);

        const glow = new THREE.Mesh(
          glowGeo,
          new THREE.MeshBasicMaterial({ color: 0xff4b4b, transparent: true, opacity: 0.26 })
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

    scene.add(group);
    manifoldGroupRef.current = group;

    // Camera framing (closer so it fills like yesterday)
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const bbox = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 0.85;

      camera.position.set(dist, dist * 0.62, dist);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [hasData, manifoldData]);

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

// Inline styles (keeps you out of CSS hell tonight)
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
  width: 320,
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
