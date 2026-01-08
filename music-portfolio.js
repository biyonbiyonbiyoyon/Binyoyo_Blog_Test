document.addEventListener("DOMContentLoaded", async () => {

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
  // 3. 音源リストを Node.js API から取得
  // --------------------
  await loadAudioList();

  // --------------------
  // 4. 音楽再生機能の初期化
  // --------------------
  setupPlayStation();
});


// ==================================================
// ページ切替処理
// ==================================================
function setupPageNavigation() {
  const links = document.querySelectorAll(".nav");
  if (!links.length) return;

  links.forEach(link => {
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

  if (target === "blog") {
    loadMarkdown();
  }
}

// ==================================================
// Musics 再生関連
// ==================================================
let currentAudio = null;
let audioContext, analyser, dataArray, source;

// 🔽 音源リスト（APIから取得）
let audioList = [];

// --------------------
// 音源リスト取得
// --------------------
async function loadAudioList() {
  try {
    audioList = await fetch("/api/musics").then(res => res.json());
  } catch (err) {
    console.error("音源リスト取得失敗", err);
    audioList = [];
  }
}

// バーDOM取得
function getBars() {
  return Array.from(document.querySelectorAll("#play-station .bar"));
}

let barBaseHeights = [];

// -------------------- 再生ボタン設定 --------------------
function setupPlayStation() {
  const playStation = document.getElementById("play-station");
  if (!playStation) return;

  ["mousedown", "touchstart"].forEach(type => {
    playStation.addEventListener(type, startAudio);
  });

  ["mouseup", "mouseleave", "touchend"].forEach(type => {
    playStation.addEventListener(type, stopAudio);
  });

  const bars = getBars();
  barBaseHeights = bars.map(() => Math.random() * 15 + 3);
}

// -------------------- 再生開始 --------------------
function startAudio() {
  if (currentAudio || !audioList.length) return;

  // 🔽 ランダム選択（Node.js対応）
  const file = audioList[Math.floor(Math.random() * audioList.length)];
  currentAudio = new Audio(`/musics/${file}`);
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

// -------------------- 再生停止 --------------------
function stopAudio() {
  if (!currentAudio) return;

  currentAudio.pause();
  currentAudio.currentTime = 0;

  if (audioContext && source) {
    try {
      source.disconnect();
      analyser.disconnect();
    } catch (e) {}
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

// -------------------- バー更新 --------------------
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
// Markdown 読み込み
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

      const bgDiv = document.createElement("div");
      bgDiv.classList.add("background");
      const imgList = [
        "images/bg1.png",
        "images/bg2.png",
        "images/bg3.png",
        "images/bg4.png"
      ];
      bgDiv.style.backgroundImage =
        `url('${imgList[Math.floor(Math.random() * imgList.length)]}')`;

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
