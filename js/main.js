document.addEventListener('DOMContentLoaded', () => {
  const els = {
    start: document.getElementById('btnStart'),
    send: document.getElementById('btnSend'),
    input: document.getElementById('textInput'),
    status: document.getElementById('status'),
    videoWrapper: document.getElementById('videoWrapper'),
    videoFrame: document.getElementById('videoFrame'),
    unmute: document.getElementById('btnUnmute'),
    closeVideo: document.getElementById('btnCloseVideo'),
    mic: document.getElementById('btnMic'),
    heygen: document.getElementById('btnHeygen'),
    container: document.getElementById('avatarContainer'),
    video: document.getElementById('avatarVideo'),
    stub: document.getElementById('avatarStub'),
    micStatus: document.getElementById('micStatus'),
    lastTranscript: document.getElementById('lastTranscript')
  };

  function speak(t){ try{ if('speechSynthesis' in window){ const u=new SpeechSynthesisUtterance(t); speechSynthesis.cancel(); speechSynthesis.speak(u);} }catch{} }
  function say(t,voice=false){ if(els.status) els.status.textContent=t; if(voice) speak(t); }

  const STATE = { IDLE:'idle', CHOICE:'choice', ASK_VIDEO:'ask_video', PLAYING:'playing' };
  const ctx = { session:false, state:STATE.IDLE, idle:null, rec:null, recOn:false, lowered:false, pending:null, heygen:false };

  function idle(){ clearTimeout(ctx.idle); ctx.idle = setTimeout(()=>say('Still there? (yes/no)', false), 20000); }
  function lower(b){ if(b){ els.container.classList.add('lowered'); } else { els.container.classList.remove('lowered'); } }

  function bgFromText(t){
    if(/harvard/i.test(t)) return "./public/harvard-university-title.jpg";
    if(/oxford/i.test(t))  return "./public/oxford-university-title.jpg";
    if(/stanford/i.test(t))return "./public/stanford-university-title.jpg";
    return "./public/default-image.jpg";
  }
  function maybeBG(t){ const img=bgFromText(t); els.container.style.background = `#000 url('${img}') center/cover no-repeat`; }

  const norm = s => (s||'').toLowerCase().trim().replace(/[^\w\s]/g,' ').replace(/\s+/g,' ');
  const isYes  = s => /\b(yes|yeah|yep|sure|ok|okay|y)\b/.test(s);
  const isNo   = s => /\b(no|nope|n)\b/.test(s);
  const isBoth = s => /\b(both|both modules|explain both)\b/.test(s);
  const isMod1 = s => /\b(module 1|module1|mod 1|mod1|m1|one|1|finance)\b/.test(s);
  const isMod2 = s => /\b(module 2|module2|mod 2|mod2|m2|two|2|procurement|payables)\b/.test(s);

  let interimTimer = null;
  function handleInterim(tx){
    // Fast reaction: throttle to 120ms to avoid spamming
    if(interimTimer) return;
    interimTimer = setTimeout(()=>{ interimTimer=null; },120);
    const s = norm(tx);
    if(/harvard|oxford|stanford|default/.test(s)) maybeBG(s);
    if(ctx.state===STATE.CHOICE && (isMod1(s)||isMod2(s)||isBoth(s))){
      handleFinal(tx);
    }
  }

  function startSession(){
    ctx.session = true; ctx.state = STATE.CHOICE; idle();
    say('Hi! I can walk you through Module 1 or Module 2, or both. Which would you like?', true);
  }
  function handleChoice(t){
    const s = norm(t);
    if(isBoth(s)){ ctx.pending='1'; ctx.state=STATE.ASK_VIDEO; say('Module 1 first. Play a quick video? yes or no?', true); return; }
    if(isMod1(s)){ ctx.pending='1'; ctx.state=STATE.ASK_VIDEO; say('Module 1. Play a quick video? yes or no?', true); return; }
    if(isMod2(s)){ ctx.pending='2'; ctx.state=STATE.ASK_VIDEO; say('Module 2. Play a quick video? yes or no?', true); return; }
    say('Please say "module 1", "module 2", or "both".', false);
  }
  function handleVideoConfirm(t){
    const s = norm(t);
    if(isYes(s)){ playVideo(ctx.pending==='1' ? 'dQw4w9WgXcQ' : 'tgbNymZ7vqY'); say('Playing the video.', false); return; }
    if(isNo(s)){ ctx.state=STATE.CHOICE; say('Okay. Choose Module 1, Module 2, or both.', false); return; }
    say('Please say yes or no.', false);
  }
  function playVideo(id){
    ctx.state = STATE.PLAYING; lower(true);
    els.videoWrapper.classList.remove('hidden');
    els.videoFrame.innerHTML = `<iframe id="yt" src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
  }
  function closeVideo(){
    els.videoFrame.innerHTML = '';
    els.videoWrapper.classList.add('hidden');
    lower(false);
    ctx.state = STATE.CHOICE;
    say('Video closed. Choose Module 1, Module 2, or both.', false);
  }
  function handleFinal(raw){
    const t = (raw||'').trim(); if(!t) return;
    idle(); maybeBG(t);

    if(!ctx.session){
      const s = norm(t);
      if(/\b(hello|hi|hey|start|begin)\b/.test(s)){ startSession(); }
      else say('Say "hello" to begin.', false);
      return;
    }
    if(ctx.state === STATE.CHOICE) return handleChoice(t);
    if(ctx.state === STATE.ASK_VIDEO) return handleVideoConfirm(t);
    if(ctx.state === STATE.PLAYING && /\b(close|stop)\b/.test(norm(t))) return closeVideo();
  }

  function initRec(){
    const C = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!C) return null;
    const r = new C();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = e=>{
      const res = e.results[e.results.length-1];
      const tx = res[0].transcript || '';
      const tEl = document.getElementById('lastTranscript'); if(tEl) tEl.textContent = tx.trim();
      if(res.isFinal) handleFinal(tx); else handleInterim(tx);
    };
    r.onstart = ()=>{ const sEl=document.getElementById('micStatus'); if(sEl) sEl.textContent='listening'; };
    r.onend = ()=>{ const sEl=document.getElementById('micStatus'); if(sEl) sEl.textContent='stopped'; if(ctx.recOn){ tryStartRec(); } };
    r.onerror = ev=>{ const sEl=document.getElementById('micStatus'); if(sEl) sEl.textContent='error'; console.warn('rec error', ev.error); ctx.recOn=false; if(els.mic) els.mic.textContent='Mic: Off'; };
    return r;
  }
  function tryStartRec(){
    try{ if(ctx.rec) ctx.rec.start(); const sEl=document.getElementById('micStatus'); if(sEl) sEl.textContent='listening'; }
    catch{ setTimeout(()=>{ try{ ctx.rec && ctx.rec.start(); }catch{} }, 200); }
  }
  function toggleMic(){
    if(!ctx.rec) ctx.rec = initRec();
    if(!ctx.rec){ alert('Mic not supported in this browser. Use Chrome.'); return; }
    ctx.recOn = !ctx.recOn;
    if(els.mic) els.mic.textContent = ctx.recOn ? 'Mic: On' : 'Mic: Off';
    if(ctx.recOn) tryStartRec(); else { try{ ctx.rec.stop(); }catch{} }
  }

  async function toggleHeygen(){
    try{
      if(!ctx.heygen){
        say('Starting HeyGen session...', false);
        const r = await fetch('/api/heygen/create-session', { method:'POST' });
        const j = await r.json();
        if(j && j.ok){
          ctx.heygen = true;
          els.heygen.textContent = 'HeyGen: On';
          els.video.style.display = 'block';
          els.stub.style.display = 'none';
        }else{
          say('Could not start HeyGen. Check API key.', false);
        }
      }else{
        await fetch('/api/heygen/stop-session', { method:'POST' });
        ctx.heygen = false;
        els.heygen.textContent = 'HeyGen: Off';
        els.video.pause(); els.video.removeAttribute('src'); els.video.style.display='none';
        els.stub.style.display = 'flex';
        say('HeyGen session stopped.', false);
      }
    }catch(e){ console.warn(e); say('HeyGen error. See console.', false); }
  }

  els.start?.addEventListener('click', startSession);
  els.send?.addEventListener('click', ()=>{ handleFinal(els.input.value); els.input.value=''; });
  els.input?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ handleFinal(els.input.value); els.input.value=''; } });
  els.unmute?.addEventListener('click', ()=>{ const f=document.getElementById('yt'); if(f) f.src=f.src.replace('mute=1','mute=0'); });
  els.closeVideo?.addEventListener('click', closeVideo);
  els.mic?.addEventListener('click', ()=> toggleMic());
  els.heygen?.addEventListener('click', ()=> toggleHeygen());
  document.querySelectorAll('[data-quick]').forEach(b=> b.addEventListener('click', ()=> handleFinal(b.getAttribute('data-quick'))));

  console.log('Ready: listeners attached ✅');
});
