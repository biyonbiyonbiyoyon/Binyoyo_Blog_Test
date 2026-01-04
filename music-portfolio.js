document.addEventListener("DOMContentLoaded", () => {

  setupPageNavigation();

  if (document.getElementById("blog").classList.contains("active")) {
    loadMarkdown();
  }

  setupPlayStation();
  setupLowPassUI(); // ← UIは残すが現在はランダムFXとは連動しない
});


// ==================================================
// ページ切替
// ==================================================
function setupPageNavigation() {
  const links = document.querySelectorAll(".nav");
  if (!links.length) return;

  links.forEach(link => link.addEventListener("click", handlePageChange));
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
// Audio / Musics
// ==================================================
let currentAudio = null;
let audioContext = null;

let source = null;
let masterGain = null;
let analyser = null;
let dataArray = null;

let lowPass = null;
let highPass = null;

const audioList = [
  "musics/track1.mp3",
  "musics/track2.mp3",
  "musics/track3.mp3"
];

function getBars() {
  return Array.from(document.querySelectorAll("#play-station .bar"));
}

let barBaseHeights = [];


// ==================================================
// Audio Graph（基礎構築）
// ==================================================
function setupAudioGraph() {

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  masterGain = audioContext.createGain();
  masterGain.gain.value = 1;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  masterGain.connect(analyser);
  analyser.connect(audioContext.destination);
}



// ==================================================
// 再生ボタン
// ==================================================
function setupPlayStation() {
  const playStation = document.getElementById("play-station");
  if (!playStation) return;

  ["mousedown", "touchstart"].forEach(ev =>
    playStation.addEventListener(ev, startAudio)
  );

  ["mouseup", "mouseleave", "touchend"].forEach(ev =>
    playStation.addEventListener(ev, stopAudio)
  );

  const bars = getBars();
  barBaseHeights = bars.map(() => Math.random() * 15 + 3);
}



// ==================================================
// ローパス UI（いまは FX ランダムとは独立）
// ==================================================
function setupLowPassUI() {
  const slider = document.getElementById("lp-filter");
  const display = document.getElementById("lp-value");

  if (!slider || !display) return;

  display.textContent = slider.value + " Hz";

  slider.addEventListener("input", () => {
    display.textContent = slider.value + " Hz";
  });
}



// ==================================================
// ▶️ 再生：ランダムFX
// ==================================================
async function startAudio() {

  if (currentAudio) return;

  const url = audioList[Math.floor(Math.random() * audioList.length)];
  currentAudio = new Audio(url);
  currentAudio.loop = true;

  setupAudioGraph();
  await audioContext.resume();

  source = audioContext.createMediaElementSource(currentAudio);

  // ------------------------------
  // ★ 効果ノードを全部用意
  // ------------------------------
  const fx = {};

  // ローパス
  fx.lowPass = audioContext.createBiquadFilter();
  fx.lowPass.type = "lowpass";
  fx.lowPass.frequency.value = 800;

  // ハイパス
  fx.highPass = audioContext.createBiquadFilter();
  fx.highPass.type = "highpass";
  fx.highPass.frequency.value = 300;

  // ローファイ（簡易 bit crusher）
  fx.bitCrusher = audioContext.createWaveShaper();
  fx.bitCrusher.curve = new Float32Array(256).map((_, i) =>
    ((i / 255) * 2 - 1) > 0 ? 0.25 : -0.25
  );

  // ピッチ（速度に依存しないっぽい揺れ表現）
  fx.pitch = audioContext.createBiquadFilter();
  fx.pitch.type = "allpass";

  // ------------------------------
  // ★ ランダムでチェーン構築
  // ------------------------------
  const chain = [source];

  function maybe(node, prob = 0.5) {
    if (Math.random() < prob) {
      chain[chain.length - 1].connect(node);
      chain.push(node);
    }
  }

  maybe(fx.lowPass, 0.7);
  maybe(fx.highPass, 0.5);
  maybe(fx.bitCrusher, 0.5);
  maybe(fx.pitch, 0.6);

  chain[chain.length - 1].connect(masterGain);

  // ------------------------------
  // 速度ランダム
  // ------------------------------
  const speedOptions = [0.6, 0.8, 1.0, 1.2, 1.5];
  currentAudio.playbackRate =
    speedOptions[Math.floor(Math.random() * speedOptions.length)];

  // ピッチ（半音単位）
  const semitone = [-7, -5, -2, 0, 2, 5, 7][Math.floor(Math.random() * 7)];
  fx.pitch.detune = { value: semitone * 100 };

  // ------------------------------
  // 再生開始
  // ------------------------------
  await currentAudio.play();

  document.body.classList.add("playing");
  requestAnimationFrame(updateBars);
}



// ==================================================
// 停止
// ==================================================
function stopAudio() {

  if (!currentAudio) return;

  currentAudio.pause();
  currentAudio.currentTime = 0;

  if (source) {
    try { source.disconnect(); } catch {}
  }

  currentAudio = null;
  source = null;

  document.body.classList.remove("playing");
}



// ==================================================
// ビジュアライザ
// ==================================================
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
// Blog
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
      const imgList = ["images/bg1.png","images/bg2.png","images/bg3.png","images/bg4.png"];
      bgDiv.style.backgroundImage =
        `url('${imgList[Math.floor(Math.random()*imgList.length)]}')`;

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

  } catch(err) {
    container.innerHTML = `<p style="color:red">${err}</p>`;
  }
}
