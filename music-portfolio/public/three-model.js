// ==============================
// Three.js 最小構成 3Dモデル表示 (ES Modules対応)
// デバッグ用ログ追加版
// ==============================

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

window.addEventListener("DOMContentLoaded", init);

function init() {
  console.log("init called"); // ✅ initが呼ばれたか確認

  const container = document.getElementById("model-container");
  if (!container) {
    console.error("#model-container が見つかりません");
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width === 0 || height === 0) {
    console.warn("#model-container のサイズが 0 です", width, height);
  } else {
    console.log("#model-container size:", width, height);
  }

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 1.2, 3);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(2, 4, 3);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  // GLTF Loader
  const loader = new GLTFLoader();
  console.log("Loading GLB..."); // ✅ ローダー呼び出し確認
  loader.load(
    "/models/music_olb.glb",
    (gltf) => {
      console.log("GLB loaded successfully!"); // ✅ 成功時
      const model = gltf.scene;
      scene.add(model);

      model.scale.set(1, 1, 1);
      model.position.y = -0.5;

      animate();
    },
    (xhr) => {
      console.log(`GLB progress: ${(xhr.loaded / xhr.total) * 100}%`);
    },
    (err) => {
      console.error("GLB load error", err);
    }
  );

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    // model が scene にある場合だけ回転させる
    const model = scene.children.find(obj => obj.type === "Group");
    if (model) {
      model.rotation.y += 0.005;
    }

    renderer.render(scene, camera);
  }

  // Window Resize
  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) {
      console.warn("Resize: container size is 0", w, h);
      return;
    }
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    console.log("Resized:", w, h);
  });
}
