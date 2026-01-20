/**
 * ManifoldViewer3D - 3D Visualization of the Market Manifold
 * VERSION: SF-DEMO-READY (Fixed Hook Order + Raycaster Logic)
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ManifoldViewer3D = ({ manifoldData, width = 800, height = 600 }) => {
  // 1. ALL HOOKS MUST BE AT THE TOP - NO EXCEPTIONS
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);
  const cameraRef = useRef(null);
  const singularityObjectsRef = useRef([]);
  const [selectedSingularity, setSelectedSingularity] = useState(null);

  // 2. MAIN SCENE INITIALIZATION
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return; // Hook itself is NOT conditional, only the logic inside

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(30, 40, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    currentContainer.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(singularityObjectsRef.current, true);

      if (intersects.length > 0) {
        let target = intersects[0].object;
        // Bubble up to parent if we hit the glow child
        if (!target.userData.price && target.parent && target.parent.userData.price) {
          target = target.parent;
        }
        if (target.userData && target.userData.price) {
          setSelectedSingularity({...target.userData});
        }
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    scene.add(new THREE.AmbientLight(0x404040, 2));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener('click', onMouseClick);
      if (currentContainer && renderer.domElement) {
        currentContainer.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  // 3. GEOMETRY UPDATER
  useEffect(() => {
    if (!manifoldData || !sceneRef.current) return;

    // Traverse and clean old objects
    const toRemove = [];
    sceneRef.current.traverse((child) => {
      if (child.isMesh && child !== meshRef.current && !child.isGridHelper) {
        toRemove.push(child);
      }
      if (child.isLine) toRemove.push(child);
    });
    
    toRemove.forEach(obj => {
      sceneRef.current.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });

    const manifoldMesh = createManifoldSurface(manifoldData);
    sceneRef.current.add(manifoldMesh);
    meshRef.current = manifoldMesh;

    singularityObjectsRef.current = addSingularityMarkers(manifoldData, sceneRef.current);
    addAttractorIndicators(manifoldData, sceneRef.current);
  }, [manifoldData]);

  // 4. THE RENDER REMAINS DOWN HERE
  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} className="manifold-3d-container" />
      
      {selectedSingularity && (
        <div className="singularity-popup" style={popupStyle}>
          <div style={headerStyle}>
            <h3 style={titleStyle}>⚠️ SINGULARITY DETECTED</h3>
            <button onClick={() => setSelectedSingularity(null)} style={closeButtonStyle}>×</button>
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <div style={gridStyle}>
              <div style={labelStyle}>Price:</div>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#fff' }}>
                ${selectedSingularity.price?.toFixed(2)}
              </div>
              <div style={labelStyle}>Timestamp:</div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>{selectedSingularity.timestamp}</div>
              <div style={labelStyle}>Curvature:</div>
              <div style={{ color: '#ffaa00' }}>{selectedSingularity.curvature?.toFixed(6)}</div>
              <div style={labelStyle}>Tension:</div>
              <div style={{ color: '#ff0000', fontWeight: 'bold' }}>{selectedSingularity.tension?.toFixed(6)}</div>
              <div style={labelStyle}>Entropy:</div>
              <div style={{ color: '#00ffff' }}>{selectedSingularity.entropy?.toFixed(4)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helpers ---
function createManifoldSurface(data) {
  const { prices, local_entropy } = data;
  const n = prices.length;
  const geometry = new THREE.BufferGeometry();
  const width = Math.ceil(Math.sqrt(n));
  const height = Math.ceil(n / width);
  const vertices = [];
  const colors = [];

  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const priceRange = (priceMax - priceMin) || 1;
  const entropyMin = Math.min(...local_entropy);
  const entropyMax = Math.max(...local_entropy);
  const entropyRange = (entropyMax - entropyMin) || 1;

  for (let i = 0; i < n; i++) {
    const x = (i % width) * 2 - width;
    const z = Math.floor(i / width) * 2 - height;
    const y = ((prices[i] - priceMin) / priceRange) * 20;
    vertices.push(x, y, z);
    const norm = (local_entropy[i] - entropyMin) / entropyRange;
    const c = getEntropyColor(norm);
    colors.push(c.r, c.g, c.b);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const indices = [];
  for (let i = 0; i < height - 1; i++) {
    for (let j = 0; j < width - 1; j++) {
      const a = i * width + j;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      if (a < n && b < n && c < n && d < n) {
        indices.push(a, b, c, b, d, c);
      }
    }
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
}

function addSingularityMarkers(data, scene) {
  const { singularities, prices, timestamp, curvature_array, tension, local_entropy } = data;
  const objects = [];
  const width = Math.ceil(Math.sqrt(prices.length));
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const priceRange = (priceMax - priceMin) || 1;

  singularities.forEach((idx) => {
    if (idx >= prices.length) return;
    const x = (idx % width) * 2 - width;
    const z = Math.floor(idx / width) * 2 - Math.ceil(prices.length / width);
    const y = ((prices[idx] - priceMin) / priceRange) * 20;

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    sphere.position.set(x, y + 1, z);
    sphere.userData = {
      price: prices[idx],
      timestamp: timestamp[idx] ? new Date(timestamp[idx] * 1000).toLocaleString() : 'Unknown',
      curvature: curvature_array?.[idx],
      tension: tension?.[idx],
      entropy: local_entropy?.[idx]
    };

    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 }));
    sphere.add(glow);
    scene.add(sphere);
    objects.push(sphere);
  });
  return objects;
}

function addAttractorIndicators(data, scene) {
  const { attractors, prices } = data;
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const priceRange = (priceMax - priceMin) || 1;
  attractors.forEach(({ price, strength }) => {
    const y = ((price - priceMin) / priceRange) * 20;
    const ring = new THREE.Mesh(new THREE.RingGeometry(2, 2.5, 32), new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: strength }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    scene.add(ring);
  });
}

function getEntropyColor(t) {
  if (t < 0.25) return { r: 0, g: t * 4, b: 1 };
  if (t < 0.5) return { r: 0, g: 1, b: 1 - (t - 0.25) * 4 };
  if (t < 0.75) return { r: (t - 0.5) * 4, g: 1, b: 0 };
  return { r: 1, g: 1 - (t - 0.75) * 4, b: 0 };
}

const popupStyle = { position: 'absolute', top: '20px', right: '20px', background: 'rgba(20, 0, 0, 0.9)', border: '2px solid #ff0000', borderRadius: '12px', padding: '20px', color: '#fff', zIndex: 1000, backdropFilter: 'blur(10px)', boxShadow: '0 0 30px rgba(255, 0, 0, 0.6)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #500' };
const titleStyle = { margin: 0, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.5)' };
const closeButtonStyle = { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' };
const gridStyle = { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' };
const labelStyle = { color: '#ff6666', fontWeight: 'bold' };

export default ManifoldViewer3D;
