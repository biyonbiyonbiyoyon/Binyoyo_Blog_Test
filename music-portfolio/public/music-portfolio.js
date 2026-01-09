document.addEventListener("DOMContentLoaded", () => {

  // --------------------
  // 1. ページ切替処理の初期化
  // --------------------
  setupPageNavigation();

  // --------------------
  // 2. Blog が最初から active の場合
  // --------------------
  if (document.getElementById("blog").classList.contains("active")) {
    loadMarkdown();
  }

  // --------------------
  // 3. 音楽再生機能の初期化
  // --------------------
  setupPlayStation();

  // --------------------
  // 4. 背景画像リスト取得
  // --------------------
  fetch("/api/images")
    .then(res => res.json())
    .then(list => window.imageList = list)
    .catch(() => window.imageList = []);
});

// ==================================================
// ページ切替処理
// ==================================================
function setupPageNavigation() {
  document.querySelectorAll(".nav").forEach(link => {
    link.addEventListener("click", handlePageChange);
  });
}

function handlePageChange(e) {
  e.preventDefault();

  const target = e.currentTarget.dataset.page;

  document.querySelectorAll(".page").forEach(p =>
    p.classList.remove("active")
  );

  document.getElementById(target).classList.add("active");

  if (target === "blog") loadMarkdown();
}

// ==================================================
// Musics 再生関連
// ==================================================
let currentAudio = null;
let audioContext, analyser, dataArray, source;
let audioList = [];

// --------------------
function setupPlayStation() {
  const playStation = document.getElementById("play-station");
  if (!playStation) return;

  // --------------------
  // 音源一覧取得
  // --------------------
  fetch("/api/musics")
    .then(res => res.json())
    .then(list => audioList = list)
    .catch(() => audioList = []);

  // --------------------
  // 再生開始
  // --------------------
  ["mousedown", "touchstart"].forEach(ev =>
    playStation.addEventListener(ev, startAudio)
  );

  // --------------------
  // 再生停止
  // --------------------
  ["mouseup", "mouseleave", "touchend"].forEach(ev =>
    playStation.addEventListener(ev, stopAudio)
  );
}

// --------------------
function startAudio() {
  if (currentAudio || !audioList.length) return;

  // ✅【ここだけ修正】
  // ファイル名に必ず /musics/ を付与
  const file = audioList[Math.floor(Math.random() * audioList.length)];
  const url = "/musics/" + file;

  currentAudio = new Audio(url);
  currentAudio.loop = true;
  currentAudio.play();

  document.body.classList.add("playing");

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  source = audioContext.createMediaElementSource(currentAudio);

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  analyser.fftSize = 64;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  requestAnimationFrame(updateBars);
}

// --------------------
function stopAudio() {
  if (!currentAudio) return;

  currentAudio.pause();
  currentAudio.currentTime = 0;

  if (audioContext && source) {
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {}
  }

  currentAudio = null;
  source = null;
  analyser = null;
  dataArray = null;

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  document.body.classList.remove("playing");
}

// --------------------
function updateBars() {
  if (!currentAudio || currentAudio.paused) return;

  analyser.getByteFrequencyData(dataArray);

  document.querySelectorAll(".bar").forEach((bar, i) => {
    const v = dataArray[i % dataArray.length];
    bar.style.height = `${3 + v / 8}px`;
    bar.style.opacity = 0.25 + (v / 255) * 0.75;
  });

  requestAnimationFrame(updateBars);
}

// ==================================================
// Markdown 読み込み
// ==================================================
async function loadMarkdown() {
  const container = document.getElementById("blog-content");
  if (!container) return;

  try {
    const response = await fetch("blog.md?ts=" + Date.now());
    const text = await response.text();
    const blocks = text.split(/^---$/m);

    container.innerHTML = "";

    blocks.forEach(block => {
      if (!block.trim()) return;

      const article = document.createElement("article");
      article.classList.add("markdown-block");

      const bg = document.createElement("div");
      bg.classList.add("background");

      if (window.imageList?.length) {
        bg.style.backgroundImage =
          `url('${window.imageList[Math.floor(Math.random() * window.imageList.length)]}')`;
      }

      const overlay = document.createElement("div");
      overlay.classList.add("overlay");

      const content = document.createElement("div");
      content.classList.add("content");
      content.innerHTML = marked.parse(block);

      article.append(bg, overlay, content);
      container.appendChild(article);
    });

  } catch (err) {
    container.innerHTML = `<p style="color:red">${err}</p>`;
  }
}
