document.addEventListener("DOMContentLoaded", () => {
  setupPageNavigation();
  if(document.getElementById("blog").classList.contains("active")) loadMarkdown();
  setupPlayStation();
  setupFXToggle();
});

let fxEnabled = false;
let currentAudio=null;
let audioContext=null;
let source=null;
let masterGain=null;
let analyser=null;
let dataArray=null;

const audioList=["musics/track1.mp3","musics/track2.mp3","musics/track3.mp3"];

function setupFXToggle(){
  const btn=document.getElementById("fx-toggle-btn");
  if(!btn) return;
  btn.addEventListener("click",()=>{
    fxEnabled=!fxEnabled;
    btn.textContent = fxEnabled?"FX ON":"FX OFF";
    if(currentAudio){ stopAudio(); startAudio(); }
  });
}

// ================= ページ切替 =================
function setupPageNavigation(){
  const links=document.querySelectorAll(".nav");
  if(!links.length) return;
  links.forEach(link=>link.addEventListener("click",handlePageChange));
}
function handlePageChange(e){
  e.preventDefault();
  const target=e.currentTarget.dataset.page;
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(target).classList.add("active");
  if(target==="blog") loadMarkdown();
}

// ================= Audio Graph =================
function setupAudioGraph(){
  if(!audioContext) audioContext=new (window.AudioContext||window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain=0.8;

  analyser = audioContext.createAnalyser();
  analyser.fftSize=64;
  dataArray=new Uint8Array(analyser.frequencyBinCount);

  masterGain.connect(analyser);
  analyser.connect(audioContext.destination);
}

// ================= 再生ボタン =================
function setupPlayStation(){
  const playStation=document.getElementById("play-station");
  if(!playStation) return;

  ["mousedown","touchstart"].forEach(ev => playStation.addEventListener(ev,startAudio));
  ["mouseup","mouseleave","touchend"].forEach(ev => playStation.addEventListener(ev,stopAudio));
}

// ================= 再生開始 =================
async function startAudio(){
  if(currentAudio) return;

  const url = audioList[Math.floor(Math.random()*audioList.length)];
  currentAudio = new Audio(url);
  currentAudio.loop=true;

  setupAudioGraph();
  await audioContext.resume();

  if(source) try{ source.disconnect(); }catch{}
  source = audioContext.createMediaElementSource(currentAudio);

  if(fxEnabled){
    const lp = audioContext.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=3000;
    const hp = audioContext.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=100;
    const bc = audioContext.createWaveShaper();
    const curve=new Float32Array(256); for(let i=0;i<256;i++){ const x=i/255*2-1; curve[i]=Math.round(x*32)/32; }
    bc.curve=curve; bc.oversample="2x";

    source.connect(lp);
    lp.connect(hp);
    hp.connect(bc);
    bc.connect(masterGain);
  } else {
    source.connect(masterGain);
  }

  currentAudio.playbackRate=1.0;
  await currentAudio.play();
  document.body.classList.add("playing");
  requestAnimationFrame(updateBars);
}

// ================= 再生停止 =================
function stopAudio(){
  if(!currentAudio) return;
  currentAudio.pause();
  currentAudio.currentTime=0;
  if(source) try{ source.disconnect(); }catch{}
  currentAudio=null; source=null;
  document.body.classList.remove("playing");
}

// ================= バーアニメーション =================
function updateBars(){
  if(!currentAudio || currentAudio.paused) return;
  const bars = document.querySelectorAll("#play-station .bar");
  analyser.getByteFrequencyData(dataArray);

  bars.forEach((bar,i)=>{
    const value = dataArray[i % dataArray.length];
    const height = 3 + (value/255)*30;
    bar.style.height=height+"px";
    bar.style.opacity=0.25+(value/255)*0.75;
  });

  requestAnimationFrame(updateBars);
}

// ================= Blog =================
async function loadMarkdown(){
  const container=document.getElementById("blog-content");
  if(!container) return;
  try{
    const response=await fetch("blog.md?ts="+Date.now());
    if(!response.ok) throw new Error("Markdownを読み込めませんでした");
    const text=await response.text();
    const blocks=text.split(/^---$/m);
    container.innerHTML="";
    blocks.forEach(blockText=>{
      if(!blockText.trim()) return;
      const html=marked.parse(blockText);
      const article=document.createElement("article");
      article.classList.add("markdown-block");
      const bgDiv=document.createElement("div"); bgDiv.classList.add("background");
      const imgList=["images/bg1.png","images/bg2.png","images/bg3.png","images/bg4.png"];
      bgDiv.style.backgroundImage=`url('${imgList[Math.floor(Math.random()*imgList.length)]}')`;
      const overlayDiv=document.createElement("div"); overlayDiv.classList.add("overlay");
      const contentDiv=document.createElement("div"); contentDiv.classList.add("content"); contentDiv.innerHTML=html;
      article.appendChild(bgDiv); article.appendChild(overlayDiv); article.appendChild(contentDiv);
      container.appendChild(article);
    });
  }catch(err){ container.innerHTML=`<p style="color:red">${err}</p>`; }
}
