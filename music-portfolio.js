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
// Audio Graph（共通の終点だけ用意）
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
// 再生開始（ランダム FX 版 改良版）
// ==================================================
async function startAudio() {

  if (currentAudio) return;

  const url = audioList[Math.floor(Math.random() * audioList.length)];
  currentAudio = new Audio(url);
  currentAudio.loop = true;

  setupAudioGraph();
  await audioContext.resume();

  // source（Web Audio に取り込む）
  if (source) {
    try { source.disconnect(); } catch {}
  }
  source = audioContext.createMediaElementSource(currentAudio);

  // ------------------------------------------------
  // FXノード生成
  // ------------------------------------------------
  const fx = {};

  // ローパス
  fx.lowPass = audioContext.createBiquadFilter();
  fx.lowPass.type = "lowpass";
  fx.lowPass.frequency.value = 600;

  // ハイパス
  fx.highPass = audioContext.createBiquadFilter();
  fx.highPass.type = "highpass";
  fx.highPass.frequency.value = Math.random() * 5000 + 200;

  // ローファイ
  fx.bitCrusher = audioContext.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255 * 2 - 1;
    curve[i] = Math.round(x * 3) / 3;
  }
  fx.bitCrusher.curve = curve;
  fx.bitCrusher.oversample = "4x"; // 追加: 音が出るように

  // ピッチ
  fx.pitch = audioContext.createBiquadFilter();
  fx.pitch.type = "allpass";

  // ------------------------------------------------
  // ランダム接続（ON/OFFで制御して安定化）
  // ------------------------------------------------
  const allNodes = [fx.lowPass, fx.highPass, fx.bitCrusher, fx.pitch];
  let previous = source;

  allNodes.forEach(node => {
    if (Math.random() > 0.5) { // 50%で接続
      previous.connect(node);
      previous = node;
    }
  });

  previous.connect(masterGain);

  console.log("FX nodes connected:", allNodes.filter(n => n !== previous).map(n => n.type || "bitcrusher"));

  // ------------------------------------------------
  // 再生速度（ランダム）
  // ------------------------------------------------
  const speeds = [0.6, 0.8, 1.0, 1.2, 1.5];
  currentAudio.playbackRate = speeds[Math.floor(Math.random() * speeds.length)];

  // ------------------------------------------------
  // ピッチ（半音ランダム）
  // ------------------------------------------------
  const semitone = [-12, -7, -5, -2, 0, 2, 5, 7, 12][Math.floor(Math.random() * 9)];
  fx.pitch.detune.value = semitone * 100;

  // 再生
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

  if (source) try { source.disconnect(); } catch {}
  if (masterGain) try { masterGain.disconnect(); } catch {}
  if (analyser) try { analyser.disconnect(); } catch {}

  currentAudio = null;
  source = null;
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


// ==================================================
// ユーティリティ（シャッフル）
// ==================================================
function shuffle(arr) {
  return arr
    .map(v => [Math.random(), v])
    .sort((a,b)=>a[0]-b[0])
    .map(v=>v[1]);
}
