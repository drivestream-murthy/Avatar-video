/* global LivekitClient */
const statusEl   = document.getElementById('status');
const bgEl       = document.getElementById('bg');
const dock       = document.getElementById('videoDock');
const frame      = document.getElementById('contentFrame');
const liveVideo  = document.getElementById('liveVideo');
const unmuteHint = document.getElementById('unmuteHint');

if (!window.LivekitClient) { console.error('LivekitClient not found'); statusEl.textContent='Failed to load LiveKit.'; }

const UNI_BG = {
  harvard:  './assets/harvard-university-title.jpg',
  oxford:   './assets/oxford-university-title.jpg',
  stanford: './assets/stanford-university-title.jpg',
  default:  './assets/default-image.jpg'
};

const YT = {
  module1: 'https://www.youtube.com/embed/rWET1Jb0408?rel=0&modestbranding=1&autoplay=1',
  module2: 'https://www.youtube.com/embed/I2oQuBRNiHs?rel=0&modestbranding=1&autoplay=1'
};

let room, sessionId, mediaStream;
let listening=false, pending=null;

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const setStatus=(t)=>statusEl.textContent=t;

async function api(path, body){
  const res = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) });
  let data=null; try{ data=await res.json(); }catch{}
  if(!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}
async function talk(text){ if(!sessionId) return; await api('/api/task', { session_id: sessionId, text }); }

function setUniversityBg(txt){
  const t=(txt||'').toLowerCase();
  let key='default';
  if(t.includes('harvard')) key='harvard';
  else if(t.includes('oxford')) key='oxford';
  else if(t.includes('stanford')) key='stanford';
  bgEl.style.backgroundImage=`url("${UNI_BG[key]}")`; return key;
}
function showVideo(src){ dock.style.display='block'; frame.src=src; }
function hideVideo(){ frame.src='about:blank'; dock.style.display='none'; }

async function ensureAudio(){
  try{ liveVideo.muted=false; await liveVideo.play(); unmuteHint.style.display='none'; }
  catch{ unmuteHint.style.display='grid'; const unlock=async()=>{ unmuteHint.style.display='none'; liveVideo.muted=false; try{ await liveVideo.play(); }catch{}; window.removeEventListener('pointerdown', unlock, {capture:true}); }; window.addEventListener('pointerdown', unlock, {capture:true, once:true}); }
}

async function startAvatar(){
  setStatus('Starting in 2s…'); await sleep(2000);
  setStatus('Creating session…'); const info=await api('/api/session'); sessionId=info.session_id;
  setStatus('Connecting…'); room=new LivekitClient.Room(); await room.connect(info.url, info.access_token);
  mediaStream=new MediaStream(); liveVideo.srcObject=mediaStream;
  room.on(LivekitClient.RoomEvent.TrackSubscribed,(track)=>{ if(track.kind==='video'||track.kind==='audio'){ mediaStream.addTrack(track.mediaStreamTrack); } });
  await sleep(300); await ensureAudio();
  await talk("Hi there! How are you? I hope you're doing good.");
  await sleep(700);
  await talk("What is your name, and where are you studying? You can say, 'I'm Alex from Oxford University.'");
  startMic();
}

function startMic(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR||listening) return;
  const rec=new SR(); rec.lang='en-US'; rec.interimResults=false; rec.continuous=true;
  rec.onresult=async (e)=>{ const txt=e.results[e.results.length-1][0].transcript.trim(); await route(txt); };
  rec.onend=()=>{ if(listening) rec.start(); };
  navigator.mediaDevices.getUserMedia({audio:true}).then(()=>{ listening=true; rec.start(); }).catch(()=>{});
}

async function route(text){
  if(!text) return;
  const uni=setUniversityBg(text);
  if(uni!=='default'){ await talk(`Nice to meet you! ${uni[0].toUpperCase()+uni.slice(1)} University sounds awesome.`); await sleep(400); await talk("We have two ERP modules. Module 1: Finance & Accounting. Module 2: Human Resources. Which one would you like?"); return; }
  const t=text.toLowerCase();
  if(t.includes('module 1')||t.includes('finance')||t.includes('accounting')){ await talk("ERP Module 1 — Finance & Accounting focuses on recording, summarizing, and reporting transactions using financial statements."); await sleep(500); await talk("Would you like to watch a short video now? Say Yes or No."); pending='m1'; return; }
  if(t.includes('module 2')||t.includes('hr')||t.includes('human resources')){ await talk("ERP Module 2 — Human Resources covers the employee lifecycle: hiring, onboarding, payroll, performance, and compliance."); await sleep(500); await talk("Would you like to watch a short video now? Say Yes or No."); pending='m2'; return; }
  if(t==='yes'||t.includes('play')||t.includes('show')){ if(pending==='m1') showVideo(YT.module1); else if(pending==='m2') showVideo(YT.module2); else await talk("Please choose Module 1 or Module 2 first."); return; }
  if(t==='no'||t.includes('skip')){ hideVideo(); await talk("Okay. Would you like Module 1 or Module 2 next?"); return; }
  if(t.includes('close video')||t.includes('hide video')){ hideVideo(); await talk("Closed. Would you like Module 1 or Module 2 next?"); return; }
  await talk("You can say your university to change the background, or choose Module 1 or Module 2.");
}

startAvatar().catch(err=>{ console.error(err); setStatus('Failed to start. See console.'); });
