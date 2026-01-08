// ==============================
// Three.js 最小表示構成
// ==============================

let scene, camera, renderer, model;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    1,
    0.1,
    1000
  );
  camera.position.set(0, 1, 3);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(300, 300);
  renderer.setPixelRatio(window.devicePixelRatio);

  // 左下固定
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.left = "20px";
  renderer.domElement.style.bottom = "20px";
  renderer.domElement.style.zIndex = "10";

  document.body.appendChild(renderer.domElement);

  // ライト
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(2, 5, 5);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  // モデル読み込み
  const loader = new THREE.GLTFLoader();
  loader.load(
    "/models/music_olb.glb", // ← ファイル名を変更
    (gltf) => {
      model = gltf.scene;
      scene.add(model);
    }
  );
}

function animate() {
  requestAnimationFrame(animate);

  if (model) {
    model.rotation.y += 0.005; // 仮回転
  }

  renderer.render(scene, camera);
}
