document.addEventListener("DOMContentLoaded", () => {

  // --------------------
  // 1. ページ切替処理の初期化
  // --------------------
  setupPageNavigation();

  // --------------------
  // 2. Blog が最初から active の場合は Markdown 読み込み
  // --------------------
  if (document.getElementById("blog").classList.contains("active")) {
    loadMarkdown();
  }

  // --------------------
  // 3. 音楽再生機能の初期化
  // --------------------
  setupPlayStation();

  // --------------------
  // 4. 画像リストを取得（ランダム背景用）
  // --------------------
  fetch("/api/images")
    .then(res => res.json())
    .then(list => {
      window.imageList = list; // グローバル変数に保存
    })
    .catch(() => window.imageList = []);
});

// ==================================================
// ページ切替処理
// ==================================================
function setupPageNavigation() {
  const links = document.querySelectorAll(".nav");
  if (!links.length) return;
  links.forEach(link => link.addEventListener("click", handlePageChange));
}

function handlePageChange(e) {
  e.preventDefault();
  const target = e.currentTarget.dataset.page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(target).classList.add("active");
  if (target === "blog") loadMarkdown();
}

// ==================================================
// Musics再生関連
// ==================================================
let currentAudio = null;
let audioContext, analyser, dataArray, source;
let audioList = [];
let barBaseHeights = [];

// --------------------
function setupPlayStation() {
  const playStation = document.getElementById("play-station");
  if (!playStation) return;

  // 音源リスト取得
  fetch("/api/musics")
    .then(res => res.json())
    .then(list => audioList = list)
    .catch(() => audioList = []);

  ["mousedown", "touchstart"].forEach(eventType => {
    playStation.addEventListener(eventType, startAudio);
  });

  ["mouseup", "mouseleave", "touchend"].forEach(eventType => {
    playStation.addEventListener(eventType, stopAudio);
  });

  const bars = Array.from(document.querySelectorAll("#play-station .bar"));
  barBaseHeights = bars.map(() => Math.random() * 15 + 3);
}

function startAudio() {
  if (currentAudio || !audioList.length) return;
  const url = audioList[Math.floor(Math.random() * audioList.length)];
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

function stopAudio() {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.currentTime = 0;

  if (audioContext && source) {
    try { source.disconnect(); analyser.disconnect(); } catch {}
  }

  currentAudio = null;
  source = null;
  analyser = null;
  dataArray = null;

  if (audioContext) { audioContext.close(); audioContext = null; }

  document.body.classList.remove("playing");
}

function updateBars() {
  if (!currentAudio || currentAudio.paused) return;
  const bars = document.querySelectorAll("#play-station .bar");
  analyser.getByteFrequencyData(dataArray);

  bars.forEach((bar, i) => {
    const value = dataArray[i % dataArray.length];
    const height = 3 + (value / 255) * 30;
    bar.style.height = height + "px";
    bar.style.opacity = 0.25 + (value / 255) * 0.75;
  });

  requestAnimationFrame(updateBars);
}

// ==================================================
// Markdown読み込み
// ==================================================
async function loadMarkdown() {
  const container = document.getElementById("blog-content");
  if (!container) return;

  try {
    const response = await fetch("blog.md?ts=" + Date.now());
    if (!response.ok) throw new Error("Markdownを読み込めませんでした");

    const text = await response.text();
    const blocks = text.split(/^---$/m);
    container.innerHTML = "";

    blocks.forEach(blockText => {
      if (!blockText.trim()) return;

      const html = marked.parse(blockText);
      const article = document.createElement("article");
      article.classList.add("markdown-block");

      // 背景画像ランダム
      const bgDiv = document.createElement("div");
      bgDiv.classList.add("background");
      const imgs = window.imageList && window.imageList.length ? window.imageList : [];
      if (imgs.length) {
        bgDiv.style.backgroundImage = `url('${imgs[Math.floor(Math.random() * imgs.length)]}')`;
      }

      const overlayDiv = document.createElement("div");
      overlayDiv.classList.add("overlay");

      const contentDiv = document.createElement("div");
      contentDiv.classList.add("content");
      contentDiv.innerHTML = html;

      article.appendChild(bgDiv);
      article.appendChild(overlayDiv);
      article.appendChild(contentDiv);
      container.appendChild(article);
    });

  } catch (err) {
    container.innerHTML = `<p style="color:red">${err}</p>`;
  }
}
