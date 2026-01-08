// ==================================================
// Three.js / GLTFLoader（ES Modules）
// 左下に常駐する 3D モデル表示
// 将来的に「音に反応」させる前提構成
// ==================================================

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

// --------------------
// Three.js 基本オブジェクト
// --------------------
let scene;
let camera;
let renderer;
let model;

// --------------------
// DOM 読み込み完了後に初期化
// --------------------
document.addEventListener("DOMContentLoaded", () => {
  initThree();
  animate();
});

// ==================================================
// 初期化処理
// ==================================================
function initThree() {

  // -------- シーン --------
  scene = new THREE.Scene();

  // -------- カメラ --------
  camera = new THREE.PerspectiveCamera(
    45,     // 視野角
    1,      // 正方形表示
    0.1,    // near
    1000    // far
  );
  camera.position.set(0, 1, 3);

  // -------- レンダラー --------
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });

  renderer.setSize(300, 300);
  renderer.setPixelRatio(window.devicePixelRatio);

  // 画面左下に固定
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.left = "20px";
  renderer.domElement.style.bottom = "20px";
  renderer.domElement.style.zIndex = "10";

  document.body.appendChild(renderer.domElement);

  // -------- ライト --------
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(2, 5, 5);
  scene.add(light);

  // -------- モデル読み込み --------
  const loader = new GLTFLoader();
  loader.load(
    "/models/your-model.glb", // ← 実際のファイル名に変更
    (gltf) => {
      model = gltf.scene;
      scene.add(model);
    },
    undefined,
    (err) => console.error("GLB load error:", err)
  );
}

// ==================================================
// アニメーションループ
// ==================================================
function animate() {
  requestAnimationFrame(animate);

  // モデルが読み込まれていれば回転
  if (model) {
    model.rotation.y += 0.005;
  }

  renderer.render(scene, camera);
}
