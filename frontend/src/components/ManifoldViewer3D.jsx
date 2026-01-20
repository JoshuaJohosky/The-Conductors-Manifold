import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * ManifoldViewer3D
 * - No conditional hooks
 * - Proper cleanup
 * - Click singularities to open the orange panel (like your "yesterday" screenshot)
 * - Handles multiple possible backend shapes safely
 */
export default function ManifoldViewer3D({ manifoldData, width = 1000, height = 700 }) {
  const containerRef = useRef(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);

  const rootGroupRef = useRef(null); // everything we add per-data-refresh goes in here
  const singularityMeshesRef = useRef([]); // for raycasting clicks

  const [selectedSingularity, setSelectedSingularity] = useState(null);

  const hasData = !!manifoldData;

  // ---------- Helpers to read data safely ----------
  const parsed = useMemo(() => {
    const d = manifoldData || {};

    const prices = Array.isArray(d.prices) ? d.prices : [];
    const localEntropy = Array.isArray(d.local_entropy) ? d.local_entropy : [];
    const curvature = Array.isArray(d.curvature_array) ? d.curvature_array : (Array.isArray(d.curvature) ? d.curvature : []);
    const tension = Array.isArray(d.tension) ? d.tension : [];
    const timestamps = Array.isArray(d.timestamp) ? d.timestamp : (Array.isArray(d.timestamps) ? d.timestamps : []);

    const singularities = Array.isArray(d.singularities) ? d.singularities : [];
    const attractors = Array.isArray(d.attractors) ? d.attractors : [];

    // Some backends return explicit surface points. Support common shapes:
    // - surface_points: [{x,y,z}, ...] or [[x,y,z], ...]
    // - manifold_points: same idea
    const surfacePointsRaw = d.surface_points || d.manifold_points || d.points || null;

    return {
      prices,
      localEntropy,
      curvature,
      tension,
      timestamps,
      singularities,
      attractors,
      surfacePointsRaw,
    };
  }, [manifoldData]);

  // ---------- Scene init (runs once) ----------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090f);
    scene.fog = new THREE.Fog(0x07090f, 50, 220);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    camera.position.set(45, 35, 45);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.6;
    controlsRef.current = controls;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(80, 120, 60);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x4de1ff, 0.35);
    rim.position.set(-80, 40, -60);
    scene.add(rim);

    // Helpers (subtle grid like your demo look)
    const grid = new THREE.GridHelper(140, 28, 0x1c2333, 0x0e1422);
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    grid.position.y = -8;
    scene.add(grid);

    // Root group for data-driven objects
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // Raycaster click handling for singularities
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((event.clientY - r.top) / r.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(singularityMeshesRef.current, true);

      if (!intersects.length) return;

      // bubble up to a parent that has userData.price
      let obj = intersects[0].object;
      while (obj && obj.parent && obj.userData && obj.userData.price == null) obj = obj.parent;

      if (obj?.userData?.price != null) {
        setSelectedSingularity({ ...obj.userData });
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

      // dispose everything we created
      try {
        controls.dispose();
      } catch (_) {}

      if (rootGroupRef.current) {
        scene.remove(rootGroupRef.current);
        disposeGroup(rootGroupRef.current);
      }

      scene.clear();

      try {
        renderer.dispose();
      } catch (_) {}

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [width, height]);

  // ---------- Update scene when manifoldData changes ----------
  useEffect(() => {
    const scene = sceneRef.current;
    const rootGroup = rootGroupRef.current;
    if (!scene || !rootGroup) return;

    // Clear previous data-driven objects
    singularityMeshesRef.current = [];
    while (rootGroup.children.length) {
      const child = rootGroup.children.pop();
      if (child) {
        rootGroup.remove(child);
        disposeObject(child);
      }
    }

    setSelectedSingularity(null);

    if (!hasData) return;

    // Build surface + overlays
    const surface = buildSurfaceMesh(parsed);
    rootGroup.add(surface);

    const rings = buildAttractorRings(parsed, surface.userData?._yScaleInfo);
    rings.forEach((r) => rootGroup.add(r));

    const singularityMarkers = buildSingularityMarkers(parsed, surface.userData?._yScaleInfo);
    singularityMarkers.forEach((m) => rootGroup.add(m));
    singularityMeshesRef.current = singularityMarkers;

    // If the backend returned only a few points, warn visually
    const n = parsed.prices.length || 0;
    if (n > 0 && n < 20) {
      rootGroup.add(buildTextBillboard(`⚠ Only ${n} points returned.\n3D will look flat.\nFix backend limit/series.`, 0xffaa00));
    }
  }, [hasData, parsed]);

  return (
    <div style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
      <div ref={containerRef} style={{ width: `${width}px`, height: `${height}px` }} />

      {!hasData && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#b7c6ff' }}>
          <div style={{ padding: 16, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, background: 'rgba(0,0,0,0.35)' }}>
            Loading Manifold…
          </div>
        </div>
      )}

      {selectedSingularity && (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelTitleStyle}>⚠ SINGULARITY DETECTED</div>
            <button type="button" onClick={() => setSelectedSingularity(null)} style={panelCloseStyle}>
              ×
            </button>
          </div>

          <div style={panelGridStyle}>
            <div style={panelLabelStyle}>Price</div>
            <div style={panelValueStyle}>
              {formatMoney(selectedSingularity.price)}
            </div>

            <div style={panelLabelStyle}>Timestamp</div>
            <div style={panelValueStyle}>
              {formatTimestamp(selectedSingularity.timestamp)}
            </div>

            <div style={panelLabelStyle}>Curvature</div>
            <div style={{ ...panelValueStyle, color: '#ffaa00' }}>
              {formatNumber(selectedSingularity.curvature)}
            </div>

            <div style={panelLabelStyle}>Tension</div>
            <div style={{ ...panelValueStyle, color: '#ff4d4d' }}>
              {formatNumber(selectedSingularity.tension)}
            </div>

            <div style={panelLabelStyle}>Entropy</div>
            <div style={{ ...panelValueStyle, color: '#2bf0ff' }}>
              {formatNumber(selectedSingularity.entropy)}
            </div>
          </div>

          <div style={panelFooterStyle}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Interpretation</div>
            <div style={{ color: '#ffd4d4', fontSize: 12, lineHeight: 1.35 }}>
              Extreme curvature / tension point where the manifold geometry destabilized.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------- Surface + Overlays -----------------

function buildSurfaceMesh(parsed) {
  // Preferred: explicit surface points (if backend provides them)
  const surfacePoints = normalizeSurfacePoints(parsed.surfacePointsRaw);
  if (surfacePoints.length >= 20) {
    return buildFromExplicitPoints(surfacePoints, parsed);
  }

  // Fallback: build from prices + entropy into a square-ish grid
  return buildFromSeries(parsed);
}

function buildFromExplicitPoints(points, parsed) {
  // points: [{x,y,z}, ...] or already normalized to Vector3-ish
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);

  const ent = parsed.localEntropy.length === points.length ? parsed.localEntropy : [];
  const entInfo = minMax(ent);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    positions[i * 3 + 0] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;

    const t = ent.length ? normalize(ent[i], entInfo.min, entInfo.max) : (i / Math.max(points.length - 1, 1));
    const c = entropyColor(t);
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // If backend doesn’t provide indices, render as points cloud-ish surface
  // (still looks better than a flat quad)
  const material = new THREE.PointsMaterial({ size: 0.25, vertexColors: true, transparent: true, opacity: 0.95 });
  const pts = new THREE.Points(geometry, material);
  pts.position.y -= 2;
  pts.userData._yScaleInfo = { pMin: 0, pRange: 1, yScale: 1 };
  return pts;
}

function buildFromSeries(parsed) {
  const prices = parsed.prices;
  const ent = parsed.localEntropy.length === prices.length ? parsed.localEntropy : new Array(prices.length).fill(0);

  const n = prices.length;
  const width = Math.max(2, Math.floor(Math.sqrt(n)));
  const height = Math.max(2, Math.ceil(n / width));

  const pInfo = minMax(prices);
  const eInfo = minMax(ent);

  // scaling: make visible vertical variation even if price range is small
  const yScale = 22;

  const vertices = [];
  const colors = [];

  for (let i = 0; i < n; i++) {
    const gx = i % width;
    const gz = Math.floor(i / width);

    const x = (gx - width / 2) * 2.2;
    const z = (gz - height / 2) * 2.2;

    const y = normalize(prices[i], pInfo.min, pInfo.max) * yScale;

    vertices.push(x, y, z);

    const t = normalize(ent[i], eInfo.min, eInfo.max);
    const c = entropyColor(t);
    colors.push(c.r, c.g, c.b);
  }

  // Create indices for triangles
  const indices = [];
  for (let r = 0; r < height - 1; r++) {
    for (let c = 0; c < width - 1; c++) {
      const a = r * width + c;
      const b = a + 1;
      const d = a + width;
      const e = d + 1;

      // Only add if inside n
      if (a < n && b < n && d < n) indices.push(a, b, d);
      if (b < n && d < n && e < n) indices.push(b, e, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.position.y = -6;

  // Add a subtle wire overlay for “yesterday” depth feel
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x1a2a44, transparent: true, opacity: 0.35 })
  );
  wire.position.copy(mesh.position);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(wire);

  // store y-scale info so singularities/attractors can map correctly
  group.userData._yScaleInfo = { pMin: pInfo.min, pRange: pInfo.max - pInfo.min || 1, yScale, yOffset: mesh.position.y };

  return group;
}

function buildSingularityMarkers(parsed, yScaleInfo) {
  const prices = parsed.prices;
  const singularities = parsed.singularities || [];
  const curvature = parsed.curvature || [];
  const tension = parsed.tension || [];
  const ent = parsed.localEntropy || [];
  const ts = parsed.timestamps || [];

  const markers = [];

  const n = prices.length;
  if (!n) return markers;

  // If the surface is a grid, match that same grid mapping
  const width = Math.max(2, Math.floor(Math.sqrt(n)));
  const height = Math.max(2, Math.ceil(n / width));

  const pMin = yScaleInfo?.pMin ?? Math.min(...prices);
  const pRange = yScaleInfo?.pRange ?? (Math.max(...prices) - pMin || 1);
  const yScale = yScaleInfo?.yScale ?? 22;
  const yOffset = yScaleInfo?.yOffset ?? -6;

  singularities.forEach((idx) => {
    if (idx == null || idx < 0 || idx >= n) return;

    const gx = idx % width;
    const gz = Math.floor(idx / width);

    const x = (gx - width / 2) * 2.2;
    const z = (gz - height / 2) * 2.2;

    const y = normalize(prices[idx], pMin, pMin + pRange) * yScale + yOffset + 1.2;

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0x5a0000, emissiveIntensity: 1.1, roughness: 0.35 })
    );
    core.position.set(x, y, z);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.22 })
    );
    core.add(glow);

    core.userData = {
      price: prices[idx],
      curvature: curvature[idx],
      tension: tension[idx],
      entropy: ent[idx],
      timestamp: ts[idx],
    };

    markers.push(core);
  });

  return markers;
}

function buildAttractorRings(parsed, yScaleInfo) {
  const prices = parsed.prices;
  const attractors = parsed.attractors || [];
  const rings = [];

  if (!prices.length || !attractors.length) return rings;

  const pMin = yScaleInfo?.pMin ?? Math.min(...prices);
  const pRange = yScaleInfo?.pRange ?? (Math.max(...prices) - pMin || 1);
  const yScale = yScaleInfo?.yScale ?? 22;
  const yOffset = yScaleInfo?.yOffset ?? -6;

  attractors.forEach((a) => {
    const price = a?.price;
    const strength = typeof a?.strength === 'number' ? a.strength : 0.6;
    if (price == null) return;

    const y = normalize(price, pMin, pMin + pRange) * yScale + yOffset + 0.3;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.35, 42),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: clamp(strength, 0.15, 1) * 0.55, side: THREE.DoubleSide })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, 0);

    rings.push(ring);
  });

  return rings;
}

// simple billboard warning (no fonts)
function buildTextBillboard(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.fillStyle = `#${new THREE.Color(color).getHexString()}`;
  ctx.font = 'bold 22px Arial';
  const lines = String(text).split('\n');
  lines.forEach((ln, i) => ctx.fillText(ln, 24, 60 + i * 28));

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(32, 16, 1);
  sprite.position.set(0, 12, 0);
  return sprite;
}

// ----------------- Disposal -----------------

function disposeGroup(group) {
  group.traverse((obj) => disposeObject(obj));
}

function disposeObject(obj) {
  if (!obj) return;
  if (obj.geometry) obj.geometry.dispose?.();
  if (obj.material) {
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
    else obj.material.dispose?.();
  }
  if (obj.texture) obj.texture.dispose?.();
}

// ----------------- Utilities -----------------

function normalizeSurfacePoints(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];

  // [[x,y,z], ...]
  if (raw.length && Array.isArray(raw[0]) && raw[0].length >= 3) {
    return raw
      .map((p) => ({ x: Number(p[0]) || 0, y: Number(p[1]) || 0, z: Number(p[2]) || 0 }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
  }

  // [{x,y,z}, ...]
  if (raw.length && typeof raw[0] === 'object') {
    return raw
      .map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0, z: Number(p.z) || 0 }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
  }

  return [];
}

function minMax(arr) {
  if (!arr || !arr.length) return { min: 0, max: 1 };
  let min = Infinity;
  let max = -Infinity;
  for (const v of arr) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  return { min, max };
}

function normalize(v, min, max) {
  const denom = (max - min) || 1;
  return clamp((v - min) / denom, 0, 1);
}

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

// "Yesterday" style color ramp: blue -> cyan -> green -> yellow -> orange
function entropyColor(t) {
  const tt = clamp(t, 0, 1);
  // Use HSL sweep that matches your neon palette
  const hue = (0.62 - tt * 0.55); // ~blue(0.62) down to orange-ish(0.07)
  const col = new THREE.Color();
  col.setHSL(hue, 0.95, 0.55);
  return col;
}

function formatNumber(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(6);
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `$${v.toFixed(2)}`;
}

function formatTimestamp(t) {
  if (!t) return '—';
  // handle ISO strings or epoch seconds/ms
  const num = Number(t);
  const d = Number.isFinite(num)
    ? new Date(num > 2e12 ? num : (num > 2e9 ? num * 1000 : num)) // heuristic
    : new Date(String(t));
  if (Number.isNaN(d.getTime())) return String(t);
  return d.toLocaleString();
}

// ----------------- Panel Styling -----------------

const panelStyle = {
  position: 'absolute',
  top: 20,
  right: 20,
  width: 320,
  background: 'rgba(35, 10, 10, 0.92)',
  border: '2px solid rgba(255, 120, 0, 0.85)',
  boxShadow: '0 0 18px rgba(255, 80, 0, 0.35)',
  borderRadius: 14,
  padding: 14,
  color: '#fff',
  zIndex: 20,
};

const panelHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: 10,
  borderBottom: '1px solid rgba(255, 120, 0, 0.25)',
  marginBottom: 10,
};

const panelTitleStyle = {
  fontWeight: 800,
  letterSpacing: 0.5,
  color: '#ff8a2a',
  fontSize: 14,
};

const panelCloseStyle = {
  border: 'none',
  background: 'transparent',
  color: '#fff',
  fontSize: 22,
  cursor: 'pointer',
  lineHeight: 1,
};

const panelGridStyle = {
  display: 'grid',
  gridTemplateColumns: '110px 1fr',
  gap: 8,
  fontSize: 13,
};

const panelLabelStyle = {
  color: 'rgba(255, 190, 150, 0.85)',
  fontWeight: 700,
};

const panelValueStyle = {
  color: '#ffffff',
  textAlign: 'right',
};

const panelFooterStyle = {
  marginTop: 12,
  paddingTop: 10,
  borderTop: '1px solid rgba(255, 120, 0, 0.18)',
};
