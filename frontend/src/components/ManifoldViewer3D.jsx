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
    const re
