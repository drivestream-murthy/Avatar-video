import './style.css'

document.addEventListener('DOMContentLoaded', async () => {
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

  // Load KB (in Vite, static assets can be imported or fetched relative to root)
  let KB=[]; try{ const r = await fetch('/kb.json'); KB = await r.json(); } catch {}

  // State machine
  const STATE = { IDLE:'idle', CHOICE:'choice', ASK_NAME:'ask_name', ASK_VIDEO:'ask_video', PLAYING:'playing' };
  const ctx = { started:false, state:STATE.IDLE, name:null, university:null, rec:null, recOn:false, heygen:false };

  const say = (t, voice=false) => {
    if(els.status) els.status.textContent = t;
    if(voice && 'speechSynthesis' in window){ try{ speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(t)); }catch{} }
  };

  const norm = s => (s||'').toLowerCase().trim().replace(/[^\w\s]/g,' ').replace(/\s+/g,' ');
  const yes = s => /\b(yes|yeah|yep|sure|ok|okay|y)\b/.test(s);
  const no  = s => /\b(no|nope|n)\b/.test(s);
  const mod1= s => /\b(module 1|module1|mod 1|mod1|m1|one|1|finance)\b/.test(s);
  const mod2= s => /\b(module 2|module2|mod 2|mod2|m2|two|2|procurement|payables)\b/.test(s);
  const both= s => /\b(both|both modules|explain both)\b/.test(s);

  function parseNameAndUniversity(s){
    const nameMatch = s.match(/\b(my name is|i am|i'm|this is)\s+([a-z]+(?:\s+[a-z]+){0,2})/i);
    const uniMatch  = s.match(/\b(harvard university|oxford university|stanford university)\b/i);
    const name = nameMatch ? nameMatch[2].trim().replace(/\b\w/g, c=>c.toUpperCase()) : null;
    const uni  = uniMatch ? uniMatch[0].toLowerCase() : null;
    return { name, uni };
  }

  function bgFromUni(u){
    if(!u) return '/default-image.jpg';
    if(/harvard/.test(u)) return '/harvard-university-title.jpg';
    if(/oxford/.test(u))  return '/oxford-university-title.jpg';
    if(/stanford/.test(u))return '/stanford-university-title.jpg';
    return '/default-image.jpg';
  }
  function setBGbyText(t){
    const { uni } = parseNameAndUniversity(t);
    if(uni){ ctx.university = uni; }
    els.container.style.background = `#000 url('${bgFromUni(ctx.university)}') center/cover no-repeat`;
  }

  function answerFromKB(s){
    const q = norm(s);
    for(const item of KB){
      const key = norm(item.q);
      if(q.includes(key)) return item.a;
    }
    return null;
  }

  function ensureStarted(){
    if(ctx.started) return;
    ctx.started = true;
    if(!ctx.rec) ctx.rec = initRec();
    if(ctx.rec && !ctx.recOn){ ctx.recOn = true; tryStartRec(); els.mic.textContent='Mic: On'; }
    say("Hello! How are you today? What's your name and university?", true);
    ctx.state = STATE.ASK_NAME;
  }

  function handleHello(){ ensureStarted(); }

  function handleChoice(s){
    if(both(s)){ ctx.state = STATE.ASK_VIDEO; say('We can start with Module 1. Play a quick video? yes or no?', true); return; }
    if(mod1(s)){ ctx.state = STATE.ASK_VIDEO; say('Module 1. Play a quick video? yes or no?', true); return; }
    if(mod2(s)){ ctx.state = STATE.ASK_VIDEO; say('Module 2. Play a quick video? yes or no?', true); return; }
    const kb = answerFromKB(s); if(kb){ say(kb, true); return; }
    say('Please say "module 1", "module 2", or "both". You can also ask about Drivestream services.', false);
  }

  function handleAskName(s){
    const { name, uni } = parseNameAndUniversity(s);
    if(name && !ctx.name) ctx.name = name;
    if(uni) ctx.university = uni;
    setBGbyText(s);
    if(ctx.name && ctx.university){
      say(`Nice to meet you, ${ctx.name}! Background set for ${ctx.university}. Would you like Module 1, Module 2, or both?`, true);
      ctx.state = STATE.CHOICE;
    }else if(ctx.name && !ctx.university){
      say(`Nice to meet you, ${ctx.name}! Which university are you from?`, true);
    }else if(!ctx.name && ctx.university){
      say(`Great, background set. What's your name?`, true);
    }else{
      say(`Could you tell me your name and university?`, true);
    }
  }

  function handleAskVideo(s){
    if(yes(s)){ playVideo('dQw4w9WgXcQ'); say('Playing the video.', false); return; }
    if(no(s)){ ctx.state=STATE.CHOICE; say('Okay. Choose Module 1, Module 2, or both.', false); return; }
    say('Please say yes or no.', false);
  }

  function playVideo(id){
    ctx.state = STATE.PLAYING;
    els.videoWrapper.classList.remove('hidden');
    els.videoFrame.innerHTML = `<iframe id="yt" src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
  }
  function closeVideo(){
    els.videoFrame.innerHTML = '';
    els.videoWrapper.classList.add('hidden');
    ctx.state = STATE.CHOICE;
    say('Video closed. Would you like Module 1, Module 2, or both?', true);
  }

  function handleFinal(raw){
    const t = (raw||'').trim(); if(!t) return;
    setBGbyText(t);
    if(/\b(close|stop)\s+(video|player)\b/i.test(t)){ closeVideo(); return; }

    const s = norm(t);
    if(/\b(hello|hi|hey|start|begin)\b/.test(s)) return handleHello();

    if(ctx.state !== STATE.PLAYING){
      const { name, uni } = parseNameAndUniversity(t);
      if(name) ctx.name = name;
      if(uni) ctx.university = uni;
    }

    if(ctx.state === STATE.IDLE) ensureStarted();
    else if(ctx.state === STATE.ASK_NAME) handleAskName(t);
    else if(ctx.state === STATE.CHOICE) handleChoice(t);
    else if(ctx.state === STATE.ASK_VIDEO) handleAskVideo(t);
  }

  let interimTimer = null;
  function handleInterim(tx){
    if(interimTimer) return;
    interimTimer = setTimeout(()=>{ interimTimer=null; }, 100);
    setBGbyText(tx);
    const s = norm(tx);
    if(/\b(hello|hi|hey)\b/.test(s)) ensureStarted();
    if(ctx.state===STATE.CHOICE && (mod1(s)||mod2(s)||both(s))) handleFinal(tx);
    if(/\bclose (video|player)\b/.test(s)) closeVideo();
  }

  // Mic
  function initRec(){
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!R) return null;
    const r = new R();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e)=>{
      const res = e.results[e.results.length-1];
      const tx = res[0].transcript || '';
      const out = document.getElementById('lastTranscript'); if(out) out.textContent = tx.trim();
      if(res.isFinal) handleFinal(tx); else handleInterim(tx);
    };
    r.onend = ()=>{ if(ctx.recOn){ tryStartRec(); } if(els.micStatus) els.micStatus.textContent='listening'; };
    r.onstart = ()=>{ if(els.micStatus) els.micStatus.textContent='listening'; };
    r.onerror = (ev)=>{ if(els.micStatus) els.micStatus.textContent='error'; console.warn('ASR error', ev.error); };
    return r;
  }
  function tryStartRec(){
    try{ if(ctx.rec) ctx.rec.start(); }catch{ setTimeout(()=>{ try{ ctx.rec && ctx.rec.start(); }catch{} }, 300); }
  }
  function forceStartOnce(){ if(!ctx.started) ensureStarted(); }
  function toggleMic(){
    if(!ctx.rec) ctx.rec = initRec();
    if(!ctx.rec){ alert('Mic not supported in this browser. Use Chrome.'); return; }
    ctx.recOn = !ctx.recOn;
    els.mic.textContent = ctx.recOn ? 'Mic: On' : 'Mic: Off';
    if(ctx.recOn) tryStartRec(); else { try{ ctx.rec.stop(); }catch{} }
  }

  // HeyGen toggle (stubbed, no credits used)
  async function toggleHeygen(){
    try{
      if(!ctx.heygen){
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
      }
    }catch(e){ console.warn(e); }
  }

  // Events
  els.start?.addEventListener('click', forceStartOnce);
  els.send?.addEventListener('click', ()=>{ handleFinal(els.input.value); els.input.value=''; });
  els.input?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ handleFinal(els.input.value); els.input.value=''; } });
  els.unmute?.addEventListener('click', ()=>{ const f=document.getElementById('yt'); if(f) f.src=f.src.replace('mute=1','mute=0'); });
  els.closeVideo?.addEventListener('click', closeVideo);
  els.mic?.addEventListener('click', ()=> toggleMic());
  els.heygen?.addEventListener('click', ()=> toggleHeygen());
  document.querySelectorAll('[data-quick]').forEach(b=> b.addEventListener('click', ()=> handleFinal(b.getAttribute('data-quick'))));

  // Small user gesture primes audio permissions
  window.addEventListener('click', ()=>{ if(!ctx.started){ ensureStarted(); } }, { once:true });

  say('Ready. Click Start or just say "hello".', false);
});
