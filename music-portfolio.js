document.addEventListener("DOMContentLoaded", () => {

  // --------------------
  // 1. ページ切替処理の初期化
  //   - ここで nav のクリックイベントをまとめて登録
  //   - 画面表示の切替は handlePageChange() に委譲
  // --------------------
  setupPageNavigation();

  // --------------------
  // 2. Blog が最初から active の場合は Markdown 読み込み
  //   - Top 以外から開かれたケースでも安全
  // --------------------
  if (document.getElementById("blog").classList.contains("active")) {
    loadMarkdown();
  }

  // --------------------
  // 3. 音楽再生機能の初期化
  // --------------------
  setupPlayStation();
});


// ==================================================
// ページ切替処理
// ==================================================

// ---------------------------------------
// nav 要素のクリックイベント登録
// ---------------------------------------
function setupPageNavigation() {

  const links = document.querySelectorAll(".nav");
  if (!links.length) return;

  links.forEach(link => {
    link.addEventListener("click", handlePageChange);
  });
}


// ---------------------------------------
// 実際のページ切替ロジック
// ---------------------------------------
function handlePageChange(e) {
  e.preventDefault();

  // クリックされた nav の data-page を参照
  const target = e.currentTarget.dataset.page;

  // すべて非表示
  document.querySelectorAll(".page").forEach(p =>
    p.classList.remove("active")
  );

  // 対象のみ表示
  document.getElementById(target).classList.add("active");

  // Blog の場合だけ Markdown 読み込み
  if (target === "blog") {
    loadMarkdown();
  }
}

// -------------------- Musics再生関連 --------------------
let currentAudio = null;

// AudioContext 全体
let audioContext = null;

// Web Audio ノード
let source = null;
let masterGain = null;
let analyser = null;
let dataArray = null;


// 音源リスト（ランダム再生）
const audioList = [
  "musics/track1.mp3",
  "musics/track2.mp3",
  "musics/track3.mp3"
];

// バーDOM取得（非表示でも取得できるようにする関数）
function getBars() { return Array.from(document.querySelectorAll("#play-station .bar")); }

// バーの基準高さ（ランダム初期値）
let barBaseHeights = [];

// AudioContext を“準備する関数”を作る
function setupAudioGraph() {

  // 既に作成済みなら再利用
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // master（最終出力用）
  masterGain = audioContext.createGain();
  masterGain.gain.value = 1; // まだ音量はそのまま

  // 解析用（既存のバー描画で使用）
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  // 配線
  //
  // source(未接続) → master → analyser → destination
  //
  masterGain.connect(analyser);
  analyser.connect(audioContext.destination);
}


// -------------------- 再生ボタンイベント設定 --------------------
function setupPlayStation() {
  const playStation = document.getElementById("play-station");
  if (!playStation) return;

  // --------------------
  // 再生開始イベントの登録
  // mousedown と touchstart の両方で startAudio を呼ぶ
  // ループ化することで重複コードを削減
  // --------------------
  ["mousedown", "touchstart"].forEach(eventType => {
    playStation.addEventListener(eventType, startAudio);
  });

  // --------------------
  // 再生停止イベントの登録
  // mouseup, mouseleave, touchend で stopAudio を呼ぶ
  // 同様にループ化して可読性向上
  // --------------------
  ["mouseup", "mouseleave", "touchend"].forEach(eventType => {
    playStation.addEventListener(eventType, stopAudio);
  });

  // --------------------
  // バーの初期ランダム高さ設定
  // 音楽再生バーのアニメーション基準をランダムに決定
  // --------------------
  const bars = getBars();
  barBaseHeights = bars.map(() => Math.random() * 15 + 3);
}

// -------------------- 再生開始 --------------------
function startAudio() {
  if (currentAudio) return; // 二重再生防止

  // 音源をランダム選択
  const url = audioList[Math.floor(Math.random() * audioList.length)];
  currentAudio = new Audio(url);
  currentAudio.loop = true;
  currentAudio.play();

  document.body.classList.add("playing"); // CSSでバー表示

  // Web Audio API設定（バーの音量解析用）
 // まずは基礎グラフを準備
setupAudioGraph();

// AudioElement を Web Audio に接続
source = audioContext.createMediaElementSource(currentAudio);

// 配線：
// source → masterGain（→ analyser → destination は済） 
source.connect(masterGain);


  // アニメーション開始
  requestAnimationFrame(updateBars);
}

// -------------------- 再生停止 --------------------
function stopAudio() {
  if (!currentAudio) return;

  // --- 再生停止 ---
  currentAudio.pause();
  currentAudio.currentTime = 0;

  // --- Web Audio接続解除 ---
  if (audioContext && source) {
    try {
      source.disconnect();
      analyser.disconnect();
    } catch (e) {
      // 既に切断済みでもエラーにしない
    }
  }

  // --- 状態を完全リセット ---
  currentAudio = null;
  source = null;
  analyser = null;
  dataArray = null;

  // AudioContext は都度閉じる（管理をシンプルにする）
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  // --- UI更新 ---
  document.body.classList.remove("playing");
}


// -------------------- バー更新 --------------------
function updateBars() {
  if (!currentAudio || currentAudio.paused) return;

  const bars = document.querySelectorAll("#play-station .bar");
  analyser.getByteFrequencyData(dataArray); // 音量データ取得

  // 各バーに高さ・透明度を反映
  bars.forEach((bar, i) => {
    const value = dataArray[i % dataArray.length]; // 周波数データ
    const height = 3 + (value / 255) * 30;        // 高さ計算
    bar.style.height = height + "px";
    bar.style.opacity = 0.25 + (value / 255) * 0.75;
  });

  requestAnimationFrame(updateBars); // ループ
}

// -------------------- Markdown読み込み --------------------
async function loadMarkdown() {
  const container = document.getElementById("blog-content");
  if (!container) return;

  try {
    const response = await fetch("blog.md?ts=" + Date.now());
    if (!response.ok) throw new Error("Markdownを読み込めませんでした");

    const text = await response.text();

    // ---で分割してブロック単位に表示
    const blocks = text.split(/^---$/m);
    container.innerHTML = ""; // 初期コンテンツ削除

    blocks.forEach(blockText => {
      if (!blockText.trim()) return;

      // Markdown→HTML変換
      const html = marked.parse(blockText);

      // 記事ブロック作成
      const article = document.createElement("article");
      article.classList.add("markdown-block");

      // 背景画像ランダム設定
      const bgDiv = document.createElement("div");
      bgDiv.classList.add("background");
      const imgList = ["images/bg1.png","images/bg2.png","images/bg3.png","images/bg4.png"];
      bgDiv.style.backgroundImage = `url('${imgList[Math.floor(Math.random()*imgList.length)]}')`;

      // オーバーレイ（グラデーション＋光）
      const overlayDiv = document.createElement("div");
      overlayDiv.classList.add("overlay");

      // コンテンツ挿入
      const contentDiv = document.createElement("div");
      contentDiv.classList.add("content");
      contentDiv.innerHTML = html;

      // DOM構築
      article.appendChild(bgDiv);
      article.appendChild(overlayDiv);
      article.appendChild(contentDiv);
      container.appendChild(article);
    });
  } catch(err) {
    // 読み込み失敗時
    container.innerHTML = `<p style="color:red">${err}</p>`;
  }
}
