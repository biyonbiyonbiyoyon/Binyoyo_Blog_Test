// ==============================
// Three.js 最小構成 3Dモデル表示
// ==============================

window.addEventListener("DOMContentLoaded", init);

function init() {

  // --------------------
  // DOM 取得
  // --------------------
  const container = document.getElementById("model-container");
  if (!container) return;

  // --------------------
  // Scene / Camera / Renderer
  // --------------------
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.2, 3);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });

  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  container.appendChild(renderer.domElement);

  // --------------------
  // Light
  // --------------------
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(2, 4, 3);
  scene.add(light);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  // --------------------
  // GLTF Loader
  // --------------------
  const loader = new THREE.GLTFLoader();

  loader.load(
    "/models/music_olb.glb",   // ← あなたの glb 名に合わせて変更
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

  // --------------------
  // Animation Loop
  // --------------------
  function animate(model) {
    requestAnimationFrame(() => animate(model));
    model.rotation.y += 0.005;
    renderer.render(scene, camera);
  }

  // --------------------
  // Resize
  // --------------------
  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}
