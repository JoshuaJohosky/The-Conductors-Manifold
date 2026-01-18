/**
 * ManifoldViewer3D - 3D Visualization of the Market Manifold
 *
 * Renders price data as a living geometric surface where:
 * - Height = Price
 * - Color = Entropy/Curvature
 * - Peaks = Singularities
 * - Smooth valleys = Attractors
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ManifoldViewer3D = ({ manifoldData, width = 800, height = 600 }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);
  const cameraRef = useRef(null);
  const singularityObjectsRef = useRef([]);
  const [selectedSingularity, setSelectedSingularity] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(30, 40, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit controls for interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Add click event listener for singularity interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(singularityObjectsRef.current);

      if (intersects.length > 0) {
        const singularityData = intersects[0].object.userData;
        setSelectedSingularity(singularityData);
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add point light for drama
    const pointLight = new THREE.PointLight(0x00ffff, 1, 100);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('click', onMouseClick);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  // Update manifold geometry when data changes
  useEffect(() => {
    if (!manifoldData || !sceneRef.current) return;

    // Remove old mesh if exists
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current.material.dispose();
    }

    // Create manifold surface
    const manifoldMesh = createManifoldSurface(manifoldData);
    sceneRef.current.add(manifoldMesh);
    meshRef.current = manifoldMesh;

    // Add singularity markers
    singularityObjectsRef.current = addSingularityMarkers(manifoldData, sceneRef.current);

    // Add attractor indicators
    addAttractorIndicators(manifoldData, sceneRef.current);

  }, [manifoldData]);

  return (
    <div>
      <div ref={containerRef} className="manifold-3d-container" style={{ position: 'relative' }} />
      {manifoldData && (
        <div className="manifold-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)' }} />
            <span>Low Entropy → High Entropy</span>
          </div>
        </div>
      )}
      {selectedSingularity && (
        <div className="singularity-popup" style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, rgba(20, 0, 0, 0.95), rgba(40, 0, 0, 0.95))',
          border: '2px solid #ff0000',
          borderRadius: '12px',
          padding: '20px',
          color: '#fff',
          minWidth: '300px',
          maxWidth: '350px',
          zIndex: 1000,
          boxShadow: '0 0 30px rgba(255, 0, 0, 0.6), inset 0 0 20px rgba(255, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(255, 0, 0, 0.3)', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#ff0000', fontSize: '20px', fontWeight: 'bold', textShadow: '0 0 10px rgba(255, 0, 0, 0.5)' }}>
              ⚠️ SINGULARITY DETECTED
            </h3>
            <button
              onClick={() => setSelectedSingularity(null)}
              style={{
                background: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid #ff0000',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '18px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 0, 0, 0.4)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 0, 0, 0.2)'}
            >×</button>
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <div style={{ color: '#ff6666', fontWeight: 'bold' }}>Price:</div>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', color: '#fff' }}>
                ${selectedSingularity.price?.toFixed(2) || 'N/A'}
              </div>

              <div style={{ color: '#ff6666', fontWeight: 'bold' }}>Timestamp:</div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                {selectedSingularity.timestamp || 'Unknown'}
              </div>

              <div style={{ color: '#ff6666', fontWeight: 'bold' }}>Curvature:</div>
              <div style={{ fontFamily: 'monospace', color: '#ffaa00' }}>
                {typeof selectedSingularity.curvature === 'number' ? selectedSingularity.curvature.toFixed(6) : 'N/A'}
              </div>

              <div style={{ color: '#ff6666', fontWeight: 'bold' }}>Tension:</div>
              <div style={{ fontFamily: 'monospace', color: '#ff0000', fontWeight: 'bold' }}>
                {typeof selectedSingularity.tension === 'number' ? selectedSingularity.tension.toFixed(6) : 'N/A'}
              </div>

              <div style={{ color: '#ff6666', fontWeight: 'bold' }}>Entropy:</div>
              <div style={{ fontFamily: 'monospace', color: '#00ffff' }}>
                {typeof selectedSingularity.entropy === 'number' ? selectedSingularity.entropy.toFixed(4) : 'N/A'}
              </div>
            </div>

            <div style={{
              marginTop: '15px',
              padding: '12px',
              background: 'rgba(255, 0, 0, 0.15)',
              borderLeft: '4px solid #ff0000',
              borderRadius: '4px',
              fontSize: '13px',
              lineHeight: '1.5'
            }}>
              <div style={{ color: '#ff6666', fontWeight: 'bold', marginBottom: '5px' }}>⚡ Interpretation:</div>
              <div style={{ color: '#ddd' }}>
                Extreme tension point where the manifold geometry became unsustainable.
                This singularity marks a critical inflection where corrections occurred or remain imminent.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Create the 3D surface mesh representing the manifold
 */
function createManifoldSurface(data) {
  const { prices, curvature, local_entropy, timestamp } = data;
  const n = prices.length;

  // Create geometry
  const geometry = new THREE.BufferGeometry();

  // Create surface vertices
  const width = Math.ceil(Math.sqrt(n));
  const height = Math.ceil(n / width);
  const vertices = [];
  const colors = [];

  // Normalize data
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const priceRange = priceMax - priceMin;

  const entropyMin = Math.min(...local_entropy);
  const entropyMax = Math.max(...local_entropy);
  const entropyRange = entropyMax - entropyMin;

  // Generate vertices and colors
  for (let i = 0; i < n; i++) {
    const x = (i % width) * 2 - width;
    const z = Math.floor(i / width) * 2 - height;

    // Normalize price to height
    const y = ((prices[i] - priceMin) / priceRange) * 20;

    vertices.push(x, y, z);

    // Color by entropy (blue = low, red = high)
    const entropyNorm = (local_entropy[i] - entropyMin) / (entropyRange || 1);
    const color = getEntropyColor(entropyNorm);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  // Create indices for triangular mesh
  const indices = [];
  for (let i = 0; i < height - 1; i++) {
    for (let j = 0; j < width - 1; j++) {
      const a = i * width + j;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;

      if (a < n && b < n && c < n && d < n) {
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Create material with vertex colors
  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    flatShading: false,
    shininess: 30,
    transparent: true,
    opacity: 0.9
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Add visual markers for singularities
 */
function addSingularityMarkers(data, scene) {
  const { singularities, prices, timestamp, curvature_array, tension, local_entropy } = data;
  const singularityObjects = [];

  console.log('Singularity data structure:', {
    singularities,
    pricesLength: prices?.length,
    timestampLength: timestamp?.length,
    curvatureArrayLength: curvature_array?.length,
    tensionLength: tension?.length,
    localEntropyLength: local_entropy?.length
  });

  singularities.forEach((idx) => {
    if (idx >= prices.length) return;

    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);
    const priceRange = priceMax - priceMin;

    const width = Math.ceil(Math.sqrt(prices.length));
    const x = (idx % width) * 2 - width;
    const z = Math.floor(idx / width) * 2 - Math.ceil(prices.length / width);
    const y = ((prices[idx] - priceMin) / priceRange) * 20;

    // Create pulsing sphere at singularity
    const geometry = new THREE.SphereGeometry(0.8, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y + 1, z);

    // Extract actual values from arrays - backend sends arrays, not single values
    const actualPrice = prices[idx];
    const actualTimestamp = timestamp[idx];
    const actualCurvature = curvature_array?.[idx];
    const actualTension = tension?.[idx];
    const actualEntropy = local_entropy?.[idx];

    console.log(`Singularity ${idx}:`, {
      price: actualPrice,
      timestamp: actualTimestamp,
      curvature: actualCurvature,
      tension: actualTension,
      entropy: actualEntropy
    });

    // Store singularity data in userData for click interaction
    sphere.userData = {
      index: idx,
      price: actualPrice,
      timestamp: actualTimestamp ? new Date(actualTimestamp * 1000).toLocaleString() : 'Unknown',
      curvature: actualCurvature,
      tension: actualTension,
      entropy: actualEntropy
    };

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sphere.add(glow);

    scene.add(sphere);
    singularityObjects.push(sphere);
  });

  return singularityObjects;
}

/**
 * Add visual indicators for attractors
 */
function addAttractorIndicators(data, scene) {
  const { attractors, prices } = data;

  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const priceRange = priceMax - priceMin;

  attractors.forEach(({ price, strength }) => {
    const y = ((price - priceMin) / priceRange) * 20;

    // Create ring at attractor level
    const geometry = new THREE.RingGeometry(2, 2.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: strength * 0.6
    });

    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;

    scene.add(ring);

    // Add vertical line
    const lineGeometry = new THREE.BufferGeometry();
    const lineVertices = new Float32Array([
      0, 0, 0,
      0, y, 0
    ]);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: strength * 0.4
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
  });
}

/**
 * Map entropy value to color
 */
function getEntropyColor(normalized) {
  // Blue (low) -> Cyan -> Green -> Yellow -> Red (high)
  if (normalized < 0.25) {
    const t = normalized / 0.25;
    return {
      r: 0,
      g: t,
      b: 1
    };
  } else if (normalized < 0.5) {
    const t = (normalized - 0.25) / 0.25;
    return {
      r: 0,
      g: 1,
      b: 1 - t
    };
  } else if (normalized < 0.75) {
    const t = (normalized - 0.5) / 0.25;
    return {
      r: t,
      g: 1,
      b: 0
    };
  } else {
    const t = (normalized - 0.75) / 0.25;
    return {
      r: 1,
      g: 1 - t,
      b: 0
    };
  }
}

export default ManifoldViewer3D;
