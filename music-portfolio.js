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
  setupLowPassUI();   // ← ここ追加

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



// ==================================================
// Musics 再生まわり（Web Audio ベース）
// ==================================================

// 再生中の <audio> インスタンス
let currentAudio = null;

// AudioContext（Web Audio 全体）
let audioContext = null;

// Web Audio ノード
let source = null;       // AudioElement → Web Audio 変換ノード
let masterGain = null;   // すべての最終出力（ここにエフェクトを挟んでいく）
let analyser = null;     // バー描画用
let dataArray = null;

// 音源リスト（ランダム再生）
const audioList = [
  "musics/track1.mp3",
  "musics/track2.mp3",
  "musics/track3.mp3"
];

// バーDOM取得（再描画ごとに取得する）
function getBars() {
  return Array.from(document.querySelectorAll("#play-station .bar"));
}

// バーの基準高さ（初期化用）
let barBaseHeights = [];

// フィルター（順番を入れ替えられるように個別で持つ）
let lowPass = null;
let highPass = null;


// ==================================================
// Audio Graph（基礎配線のみ）
// 今後：ここにエフェクトを少しずつ挟んでいく
// ==================================================
function setupAudioGraph() {

  // 既に作成済みなら再利用
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

// master（最終出力用）
masterGain = audioContext.createGain();
masterGain.gain.value = 1;

// ------------------------------
// ローパスフィルター
// 例：周波数より上をカット
// ------------------------------
lowPass = audioContext.createBiquadFilter();
lowPass.type = "lowpass";
lowPass.frequency.value = 18000;  // まだ軽くかける程度

// ------------------------------
// ハイパスフィルター
// 例：低音をカット
// ------------------------------
highPass = audioContext.createBiquadFilter();
highPass.type = "highpass";
highPass.frequency.value = 20;    // ほぼ素通し（後で操作）

// 解析用
analyser = audioContext.createAnalyser();
analyser.fftSize = 64;
dataArray = new Uint8Array(analyser.frequencyBinCount);

// --------------------------------------
// Audio Graph
//
// source → lowPass → highPass → masterGain → analyser → speakers
// --------------------------------------
lowPass.connect(highPass);
highPass.connect(masterGain);
masterGain.connect(analyser);
analyser.connect(audioContext.destination);

}



// ==================================================
// 再生ボタンのイベント登録
// ==================================================
function setupPlayStation() {
  const playStation = document.getElementById("play-station");
  if (!playStation) return;

  // 再生開始
  ["mousedown", "touchstart"].forEach(eventType => {
    playStation.addEventListener(eventType, startAudio);
  });

  // 再生停止
  ["mouseup", "mouseleave", "touchend"].forEach(eventType => {
    playStation.addEventListener(eventType, stopAudio);
  });

  // バーの初期ランダム高さを設定
  const bars = getBars();
  barBaseHeights = bars.map(() => Math.random() * 15 + 3);
}

// ==================================================
// ローパス UI 制御
// ==================================================
function setupLowPassUI() {

  const slider = document.getElementById("lp-filter");
  const display = document.getElementById("lp-value");

  if (!slider || !display) return;

  // 初期表示
  display.textContent = slider.value + " Hz";

  slider.addEventListener("input", () => {

    // AudioContext 未初期化なら何もしない
    if (!audioContext || !lowPass) return;

    // スライダーの値を反映
    lowPass.frequency.value = parseFloat(slider.value);

    display.textContent = slider.value + " Hz";
  });
}



// ==================================================
// 再生開始
// ==================================================
function startAudio() {
  if (currentAudio) return; // 二重再生防止

  // ランダムで音源を選択
  const url = audioList[Math.floor(Math.random() * audioList.length)];
  currentAudio = new Audio(url);
  currentAudio.loop = true;
  currentAudio.play();

  document.body.classList.add("playing");

  // --------------------------------------
  // Web Audio 側の準備
  // 1) グラフ（土台）を構築
  // 2) 再生する Audio を接続
  // --------------------------------------
  setupAudioGraph();

  // AudioElement → Web Audio に取り込む
  //
  // ※ MediaElementSource は
  //   「同じ Audio に対して 1 回のみ」生成可能
  //   今回は毎回新しい Audio を作っているので安全
  source = audioContext.createMediaElementSource(currentAudio);

  // source → masterGain
  // （その先は setupAudioGraph() 側で接続済み）
  source.connect(lowPass);

  // アニメーション開始
  requestAnimationFrame(updateBars);
}



// ==================================================
// 再生停止
// ==================================================
function stopAudio() {
  if (!currentAudio) return;

  // --- 再生停止 ---
  currentAudio.pause();
  currentAudio.currentTime = 0;

  // --- Web Audio 接続解除 ---
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
  masterGain = null;
  dataArray = null;

  // AudioContext は都度閉じる（管理をシンプルに）
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  document.body.classList.remove("playing");
}



// ==================================================
// バー更新（音量解析 → 視覚化）
// ==================================================
function updateBars() {
  if (!currentAudio || currentAudio.paused) return;

  const bars = document.querySelectorAll("#play-station .bar");
  analyser.getByteFrequencyData(dataArray); // 音量データ取得

  bars.forEach((bar, i) => {
    const value = dataArray[i % dataArray.length]; // 周波数データ
    const height = 3 + (value / 255) * 30;        // 高さ計算
    bar.style.height = height + "px";
    bar.style.opacity = 0.25 + (value / 255) * 0.75;
  });

  requestAnimationFrame(updateBars);
}



// ==================================================
// Blog（Markdown読み込み）
// ==================================================
async function loadMarkdown() {
  const container = document.getElementById("blog-content");
  if (!container) return;

  try {
    // キャッシュ回避（更新を即反映）
    const response = await fetch("blog.md?ts=" + Date.now());
    if (!response.ok) throw new Error("Markdownを読み込めませんでした");

    const text = await response.text();

    // --- で分割してブロック単位に表示
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
