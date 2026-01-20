import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ManifoldViewer3D = ({ manifoldData, width = 1000, height = 700 }) => {
  // ---- Hooks MUST be unconditional ----
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const singularityObjectsRef = useRef([]);
  const [selectedSingularity, setSelectedSingularity] = useState(null);

  // ---- Scene Init (runs once) ----
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0b);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 2000);
    camera.position.set(35, 40, 35);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(50, 80, 40);
    scene.add(light);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(singularityObjectsRef.current, true);
      if (hits.length && hits[0].object.userData?.price) {
        setSelectedSingularity(hits[0].object.userData);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onClick);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onClick);
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, [width, height]);

  // ---- Manifold Update ----
  useEffect(() => {
    if (!manifoldData || !sceneRef.current) return;

    // Clear old geometry
    singularityObjectsRef.current.forEach(o => sceneRef.current.remove(o));
    singularityObjectsRef.current = [];
    if (meshRef.current) sceneRef.current.remove(meshRef.current);

    const mesh = buildManifold(manifoldData);
    sceneRef.current.add(mesh);
    meshRef.current = mesh;

    singularityObjectsRef.current = addSingularities(manifoldData, sceneRef.current);
    addAttractors(manifoldData, sceneRef.current);
  }, [manifoldData]);

  // ---- Render ----
  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={containerRef} />
      {!manifoldData && (
        <div style={{ color: '#aaa', position: 'absolute', top: 20, left: 20 }}>
          Waiting for manifold data…
        </div>
      )}
      {selectedSingularity && (
        <div style={popupStyle}>
          <h3>⚠ Singularity</h3>
          <p>Price: ${selectedSingularity.price?.toFixed(2)}</p>
          <p>Curvature: {selectedSingularity.curvature?.toFixed(4)}</p>
          <p>Tension: {selectedSingularity.tension?.toFixed(4)}</p>
          <button onClick={() => setSelectedSingularity(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default ManifoldViewer3D;

/* ---------------- HELPERS ---------------- */

function buildManifold(data) {
  const { prices, local_entropy } = data;
  const geo = new THREE.BufferGeometry();
  const w = Math.ceil(Math.sqrt(prices.length));
  const verts = [];
  const colors = [];

  const pMin = Math.min(...prices);
  const pMax = Math.max(...prices);

  prices.forEach((p, i) => {
    const x = (i % w) * 2;
    const z = Math.floor(i / w) * 2;
    const y = ((p - pMin) / (pMax - pMin)) * 25;
    verts.push(x, y, z);

    const e = local_entropy[i] || 0;
    colors.push(1 - e, e, 0);
  });

  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    })
  );
}

function addSingularities(data, scene) {
  const objs = [];
  data.singularities?.forEach((i) => {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff3300 })
    );
    s.userData = {
      price: data.prices[i],
      curvature: data.curvature_array?.[i],
      tension: data.tension?.[i],
    };
    scene.add(s);
    objs.push(s);
  });
  return objs;
}

function addAttractors(data, scene) {
  data.attractors?.forEach(a => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2, 2.6, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
  });
}

const popupStyle = {
  position: 'absolute',
  right: 20,
  top: 20,
  background: '#200',
  color: '#fff',
  padding: 15,
  borderRadius: 10,
};
