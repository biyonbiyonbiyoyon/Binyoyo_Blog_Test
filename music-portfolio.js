document.addEventListener("DOMContentLoaded", () => {

  setupPageNavigation();

  if (document.getElementById("blog").classList.contains("active")) {
    loadMarkdown();
  }

  setupPlayStation();
  setupLowPassUI();
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
// Audio Graph 構築
// ==================================================
function setupAudioGraph() {

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // master
  masterGain = audioContext.createGain();
  masterGain.gain.value = 1;

  // ローパス（かなり極端）
  lowPass = audioContext.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 400;
  lowPass.Q.value = 12;

  // ハイパス（ほぼ素通し）
  highPass = audioContext.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 20;

  // 解析
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  // 配線
  //
  // source → lowPass → highPass → masterGain → analyser → speakers
  //
  lowPass.connect(highPass);
  highPass.connect(masterGain);
  masterGain.connect(analyser);
  analyser.connect(audioContext.destination);
}



// ==================================================
// 再生ボタン（トグルではない）
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
// ローパス UI
// ==================================================
function setupLowPassUI() {

  const slider = document.getElementById("lp-filter");
  const display = document.getElementById("lp-value");

  if (!slider || !display) return;

  display.textContent = slider.value + " Hz";

  slider.addEventListener("input", () => {
    if (!audioContext || !lowPass) return;

    lowPass.frequency.value = parseFloat(slider.value);
    display.textContent = slider.value + " Hz";
  });
}



// ==================================================
// 再生開始
// ==================================================
async function startAudio() {

  if (currentAudio) return;

  const url = audioList[Math.floor(Math.random() * audioList.length)];
  currentAudio = new Audio(url);
  currentAudio.loop = true;

  // ---- Audio Graph を準備してから resume
  setupAudioGraph();
  await audioContext.resume();

  // ---- Web Audio に取り込む
  source = audioContext.createMediaElementSource(currentAudio);

  // source → lowPass（その先はすでに接続済み）
  source.connect(lowPass);

  // ---- 再生
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

  if (audioContext && source) {
    try {
      source.disconnect();
    } catch {}
  }

  currentAudio = null;
  source = null;

  // AudioContext / filters / analyser は残す
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
