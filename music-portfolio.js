document.addEventListener("DOMContentLoaded", () => {

  setupPageNavigation();

  if (document.getElementById("blog").classList.contains("active")) {
    loadMarkdown();
  }

  setupPlayStation();
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
let dryGain = null;
let fxGain = null;
let masterGain = null;
let analyser = null;
let dataArray = null;

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
// Audio Graph（共通終点）
// ==================================================
function setupAudioGraph() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // マスター出力
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.8; // 全体音量は控えめ

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
// 再生開始（BitCrusher弱 + コンプレッサー + 原音50%混合）
// ==================================================
async function startAudio() {

  if (currentAudio) return;

  const url = audioList[Math.floor(Math.random() * audioList.length)];
  currentAudio = new Audio(url);
  currentAudio.loop = true;

  setupAudioGraph();
  await audioContext.resume();

  // source
  if (source) try { source.disconnect(); } catch {}
  source = audioContext.createMediaElementSource(currentAudio);

  // ==================================================
  // Gain分け（原音 / FX）
  // ==================================================
  dryGain = audioContext.createGain();
  dryGain.gain.value = 0.5; // 原音50%

  fxGain = audioContext.createGain();
  fxGain.gain.value = 0.5; // FX音50%

  // ==================================================
  // FXノード生成（控えめ）
  // ==================================================
  const fxNodes = [];

  // Low-Pass
  const lp = audioContext.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3000 + Math.random() * 300; // 微小カット
  fxNodes.push(lp);

  // High-Pass
  const hp = audioContext.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 100 + Math.random() * 300; // 微小
  fxNodes.push(hp);

  // BitCrusher
  const bc = audioContext.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255 * 2 - 1;
    curve[i] = Math.round(x * 16) / 16; // 弱め
  }
  bc.curve = curve;
  bc.oversample = "2x";
  fxNodes.push(bc);

  // Pitch
  const pitch = audioContext.createBiquadFilter();
  pitch.type = "allpass";
  const semitone = [-1, 0, 1][Math.floor(Math.random() * 3)];
  pitch.detune.value = semitone * 50; // 微小揺れ
  fxNodes.push(pitch);

  // ==================================================
  // コンプレッサー（ピーク抑制）
  // ==================================================
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-10, audioContext.currentTime);
  compressor.knee.setValueAtTime(5, audioContext.currentTime);
  compressor.ratio.setValueAtTime(3, audioContext.currentTime);
  compressor.attack.setValueAtTime(0.01, audioContext.currentTime);
  compressor.release.setValueAtTime(0.3, audioContext.currentTime);

  // ==================================================
  // 接続
  // ==================================================
  // 原音側
  source.connect(dryGain);
  dryGain.connect(masterGain);

  // FX側
  let previous = source;
  fxNodes.forEach(node => {
    previous.connect(node);
    previous = node;
  });
  previous.connect(fxGain);
  fxGain.connect(compressor);
  compressor.connect(masterGain);

  // ==================================================
  // 再生速度固定
  // ==================================================
  currentAudio.playbackRate = 1.0;

  // 再生開始
  await currentAudio.play();

  document.body.classList.add("playing");
  requestAnimationFrame(updateBars);
}


// ==================================================
// 再生停止
// ==================================================
function stopAudio() {
  if (!currentAudio) return;

  currentAudio.pause();
  currentAudio.currentTime = 0;

  [source, dryGain, fxGain, masterGain, analyser].forEach(node => {
    if (node) try { node.disconnect(); } catch {}
  });

  currentAudio = null;
  source = null;
  dryGain = null;
  fxGain = null;
  masterGain = null;
  analyser = null;

  document.body.classList.remove("playing");
}


// ==================================================
// バー描画
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
