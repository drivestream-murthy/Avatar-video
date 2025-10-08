import { StreamingAvatar, StreamingEvents, TaskType, AvatarQuality } from "https://cdn.jsdelivr.net/npm/@heygen/streaming-avatar/+esm";

const tokenResp = await fetch('/token'); const tokenJson = await tokenResp.json();
if (!tokenJson || !tokenJson.token) { alert('Failed to get HeyGen session token. Check HEYGEN_API_KEY.'); throw new Error('Missing token'); }

const avatar = new StreamingAvatar({ token: tokenJson.token });
const knowledgeBase = [
  "You are a friendly training assistant. Keep replies under 3 sentences.",
  "Start every session by asking: 1) What is your name? 2) Where are you studying?",
  "If the user mentions a university, acknowledge it briefly."
].join(" ");

await avatar.createStartAvatar({ avatarName: "default", quality: AvatarQuality.High, knowledgeBase });

avatar.on(StreamingEvents.STREAM_READY, (ev) => {
  const stream = ev.detail.stream;
  const videoEl = document.createElement('video');
  videoEl.autoplay = true; videoEl.playsInline = true; videoEl.muted = true;
  videoEl.srcObject = stream;
  document.getElementById('avatar').appendChild(videoEl);
});

await avatar.speak({ text: "Hello! What is your name, and where are you studying?", task_type: TaskType.REPEAT });

const UNI_BG = {
  "stanford": "https://images.unsplash.com/photo-1508175554791-0da3b70a5a53?q=80&w=1080&auto=format&fit=crop",
  "harvard":  "https://images.unsplash.com/photo-1598748904158-7d7f79aa9a3a?q=80&w=1080&auto=format&fit=crop",
  "mit":      "https://images.unsplash.com/photo-1602109681330-4b1d73ad9b88?q=80&w=1080&auto=format&fit=crop"
};
function tryApplyUniversityBg(text){
  const q = text.toLowerCase();
  const key = Object.keys(UNI_BG).find(k => q.includes(k));
  if (key) { document.getElementById('stage').style.backgroundImage = `url(${UNI_BG[key]})`; return key; }
  return null;
}

const urlRx = /(https?:\/\/\S+\.(mp4|webm))(\?[^\s]*)?$|https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})|https?:\/\/youtu\.be\/([\w-]{11})/i;
let ytPlayer, ytReady=false;
window.onYouTubeIframeAPIReady=()=>{ ytReady=true; ytPlayer=new YT.Player('ytPlayer',{events:{onStateChange:(e)=>{
  if(e.data===YT.PlayerState.ENDED){ document.getElementById('ytWrap').classList.add('hidden'); document.getElementById('avatar').classList.remove('min');
    avatar.speak({ text:"Video finished. What would you like to do next?", task_type: TaskType.REPEAT }); }}}}); };

function showVideoFromUrl(u){
  const m=u.match(urlRx), vidWrap=document.getElementById('vidWrap'), ytWrap=document.getElementById('ytWrap'), vid=document.getElementById('vid');
  if(!m) return false; document.getElementById('avatar').classList.add('min');
  if(m[1]){ ytWrap.classList.add('hidden'); vidWrap.classList.remove('hidden'); vid.src=u; vid.play().catch(()=>{});
    vid.onended=()=>{ vidWrap.classList.add('hidden'); document.getElementById('avatar').classList.remove('min');
      avatar.speak({ text:"Video finished. What would you like to do next?", task_type: TaskType.REPEAT }); }; return true; }
  const ytId=m[3]||m[4]; if(ytId&&ytReady&&ytPlayer){ vidWrap.classList.add('hidden'); ytWrap.classList.remove('hidden'); ytPlayer.loadVideoById(ytId); return true; }
  else if(ytId){ alert("YouTube player not ready yet. Try again in a second."); return false; }
  return false;
}

document.getElementById('ask').addEventListener('submit', async (e)=>{
  e.preventDefault(); const input=document.getElementById('text'); const txt=input.value.trim(); input.value=''; if(!txt) return;
  const uni=tryApplyUniversityBg(txt); if(uni){ await avatar.speak({ text:`Great! Updating your background to ${uni}.`, task_type: TaskType.REPEAT }); }
  if(urlRx.test(txt)){ const ok=showVideoFromUrl(txt); if(ok){ await avatar.speak({ text:"Playing the video above. I will continue after it ends.", task_type: TaskType.REPEAT }); return; } }
  await avatar.speak({ text: txt, task_type: TaskType.TALK });
});
