// ==============================
// Three.js 最小構成 3Dモデル表示 (ES Modules対応)
// ==============================

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

window.addEventListener("DOMContentLoaded", init);

function init() {

  const container = document.getElementById("model-container");
  if (!container) return;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.2, 3);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(2, 4, 3);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  // GLTF Loader
  const loader = new GLTFLoader();
  loader.load(
    "/models/music_olb.glb",
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      model.scale.set(1, 1, 1);
      model.position.y = -0.5;

      animate(model);
    },
    undefined,
    (err) => {
      console.error("GLB load error", err);
    }
  );

  // Animation Loop
  function animate(model) {
    requestAnimationFrame(() => animate(model));
    model.rotation.y += 0.005;
    renderer.render(scene, camera);
  }

  // Window Resize
  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}
