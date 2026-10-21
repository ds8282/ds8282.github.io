(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const store = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 90) : ms));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const pad = (n) => String(n).padStart(2,'0');
  function el(tag, cls, text){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }

  const vis = new Map();
  const visIO = new IntersectionObserver(es => es.forEach(e => { const r = vis.get(e.target); if (r){ r.on = e.isIntersecting; r.cb && r.cb(e.isIntersecting); } }), { rootMargin:'80px 0px' });
  function watch(node, cb){ const r = { on:false, cb }; vis.set(node, r); visIO.observe(node); return r; }
  function once(node, cb, rootMargin='0px 0px -20% 0px'){ const io = new IntersectionObserver(es => { if (es.some(e=>e.isIntersecting)){ io.disconnect(); cb(); } }, { rootMargin }); io.observe(node); }

  const now = new Date();
  const dFmt = now.toLocaleDateString('en-US',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
  ['#opened','#sig-date','#rep-date'].forEach(s => $(s).textContent = dFmt);
  $('#cert-date').textContent = now.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});

  (() => {
    const seed = 'DS-2027'; let x = 2, bars = '';
    for (let i = 0; i < 46; i++) {
      const c = seed.charCodeAt(i % seed.length) * (i + 7), w = (c % 3) + 1, gap = ((c >> 2) % 3) + 1.5;
      if (x + w > 218) break;
      bars += `<rect x="${x}" y="0" width="${w}" height="40" fill="#16181C"/>`; x += w + gap;
    }
    $('#barcode').innerHTML = bars;
  })();

  let toastT;
  function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true,3000); }

  let soundOn = false, actx = null;
  $('#snd-btn').addEventListener('click', (e) => {
    soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', soundOn); $('#snd-state').textContent = soundOn ? 'On' : 'Off';
    if (soundOn && !actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(err){} }
  });
  function thud(){
    if (!soundOn || !actx) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(42,t+.18);
    g.gain.setValueAtTime(.9,t); g.gain.exponentialRampToValueAtTime(.001,t+.32); o.connect(g).connect(actx.destination); o.start(t); o.stop(t+.34);
    const len = actx.sampleRate*.06, buf = actx.createBuffer(1,len,actx.sampleRate), d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
    const n = actx.createBufferSource(), ng = actx.createGain(); ng.gain.value=.35; n.buffer=buf; n.connect(ng).connect(actx.destination); n.start(t);
  }
  function blip(freq=880, dur=.05, vol=.08){
    if (!soundOn || !actx) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type='square'; o.frequency.value=freq; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t+dur+.02);
  }

  const pageStart = Date.now();
  let startedAt = null;
  const seenPhases = new Set();
  function fmtDur(ms){ const s=Math.floor(ms/1000); return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`; }
  function tick(){
    if (startedAt) $('#hud-status').textContent = `Active · T+${fmtDur(Date.now()-startedAt)}`;
    $('#m-time').textContent = fmtDur(Date.now() - (startedAt || pageStart));
  }
  setInterval(tick, 1000); tick();

  /* PHASE 00 */
  const hold = $('#hold'), ring = $('#ring'), C = 2*Math.PI*67, HOLD_MS = 1200;
  ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C;
  let progress = 0, holding = false, last = 0, raf = 0, authorized = false;
  function loop(ts){
    const dt = last ? ts - last : 16; last = ts;
    progress = Math.max(0, Math.min(1, progress + (holding ? dt/HOLD_MS : -dt/(HOLD_MS*.5))));
    ring.style.strokeDashoffset = C*(1-progress);
    if (progress >= 1 && !authorized) { authorize(); return; }
    if (holding || progress > 0) raf = requestAnimationFrame(loop); else { last = 0; raf = 0; }
  }
  function hStart(){ if (authorized) return; holding = true; $('#hold-lbl').innerHTML='<span>Authorizing</span><b>Hold…</b>'; if (!raf){ last=0; raf=requestAnimationFrame(loop);} }
  function hStop(){ if (authorized) return; holding = false; $('#hold-lbl').innerHTML='<span>Hold to</span><b>Authorize</b>'; if (!raf){ last=0; raf=requestAnimationFrame(loop);} }
  hold.addEventListener('pointerdown', (e)=>{ e.preventDefault(); hold.setPointerCapture?.(e.pointerId); hStart(); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>hold.addEventListener(ev, hStop));
  hold.addEventListener('keydown', (e)=>{ if ((e.key===' '||e.key==='Enter') && !e.repeat){ e.preventDefault(); hStart(); } });
  hold.addEventListener('keyup', (e)=>{ if (e.key===' '||e.key==='Enter'){ e.preventDefault(); hStop(); } });
  hold.addEventListener('contextmenu', (e)=>e.preventDefault());
  function authorize(){
    authorized = true; holding = false; cancelAnimationFrame(raf); hold.disabled = true;
    $('#hold-lbl').innerHTML = '<span>Engagement</span><b>Active</b>';
    const t = new Date();
    const txt = t.toLocaleDateString('en-US',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase() + ' · ' + t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false});
    $('#stamp-time').textContent = txt;
    const st = $('#stamp'); st.hidden = false;
    if (!reduced){ st.classList.add('slam'); setTimeout(()=>{ const sh=$('#p00'); sh.classList.remove('shake'); void sh.offsetWidth; sh.classList.add('shake'); thud(); }, 260); } else thud();
    $('#sig-mark').textContent = 'Signed, ' + txt;
    $('#proceed').hidden = false; $('#hold-hint').textContent = 'Authorization logged';
    startedAt = Date.now(); tick(); $('#hud').dataset.live = '1';
    $('#announce').textContent = 'Engagement authorized. Phase 01 is next.';
  }

  /* PHASE 01 */
  let briefCleared = 0, briefTotal = 0;
  (() => {
    const memo = $('#memo'), lens = $('#lens'), root = document.documentElement, rds = $$('.rd', memo);
    briefTotal = rds.length; let finished = false;
    $('#rd-total').textContent = briefTotal; $('#m-brief').textContent = `0/${briefTotal}`;
    function clear(r){
      if (r.classList.contains('clear')) return;
      r.classList.add('clear'); briefCleared++;
      $('#rd-count').textContent = briefCleared; $('#m-brief').textContent = `${briefCleared}/${briefTotal}`;
      if (briefCleared === briefTotal && !finished) finish();
    }
    function finish(){
      finished = true; const b = $('#declass-all'); b.disabled = true; b.textContent = 'Declassified';
      $('#lens-hint').textContent = 'Brief fully reviewed';
      const s = $('#declass-stamp'); s.hidden = false; if (!reduced) s.classList.add('slam');
      setTimeout(thud, reduced ? 0 : 220);
      $('#announce').textContent = 'Subject brief fully declassified.'; toast(`Brief declassified · ${briefTotal}/${briefTotal}`);
    }
    $('#declass-all').addEventListener('click', () => rds.filter(r => !r.classList.contains('clear')).forEach((r,i) => reduced ? clear(r) : setTimeout(() => clear(r), i*45)));
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let px = 0, py = 0, queued = false;
      const frame = () => {
        queued = false; root.style.setProperty('--lx', px+'px'); root.style.setProperty('--ly', py+'px');
        for (const r of rds) { if (r.classList.contains('clear')) continue;
          for (const b of r.getClientRects()) if (px > b.left-10 && px < b.right+10 && py > b.top-6 && py < b.bottom+6) { clear(r); break; } }
      };
      memo.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        px = e.clientX; py = e.clientY; memo.classList.add('lensing'); lens.classList.add('on');
        if (!queued){ queued = true; requestAnimationFrame(frame); }
      });
      memo.addEventListener('pointerleave', () => { memo.classList.remove('lensing'); lens.classList.remove('on'); root.style.setProperty('--lx','-9999px'); root.style.setProperty('--ly','-9999px'); });
    } else {
      $('#lens-hint').textContent = 'Scroll to declassify';
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ setTimeout(() => clear(en.target), 120); io.unobserve(en.target); } }), { rootMargin:'0px 0px -35% 0px', threshold:1 });
      rds.forEach(r => io.observe(r));
    }
    const badge = $('#badge');
    badge.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = badge.getBoundingClientRect(), x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
      badge.style.setProperty('--hx', (x*100).toFixed(1)+'%'); badge.style.setProperty('--hy', (y*100).toFixed(1)+'%');
      if (!reduced) badge.style.transform = `perspective(900px) rotateY(${((x-.5)*12).toFixed(2)}deg) rotateX(${((.5-y)*9).toFixed(2)}deg)`;
    });
    badge.addEventListener('pointerleave', () => { badge.style.transform = ''; });
  })();

  /* CRT boot */
  once($('#band'), () => { if (reduced) return; const c = $('#crt'); c.classList.add('on'); blip(1400,.08,.05); setTimeout(()=>c.classList.remove('on'), 900); }, '0px 0px -55% 0px');

  /* PHASE 02 */
  (() => {
    const cv = $('#heat'), ctx = cv.getContext('2d'), zone = cv.parentElement;
    const OPEN = [22,53,443,445,1337,5432,8443], TOTAL = 65535;
    let W=0, H=0, cell=2, cols=1, dpr=1, scanned = TOTAL, sweepRaf = 0;
    const cBase = css('--con-cell'), cDone = '#1B2531', cOpen = css('--teal'), cDim = css('--con-dim'), fMono = css('--f-mono');
    function geom(){
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = zone.clientWidth; H = zone.clientHeight + 48;
      cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      cell = Math.max(2, Math.floor(Math.sqrt((W*H)/TOTAL)));
      cols = Math.max(1, Math.floor(W / cell));
    }
    function drawCells(from, to, color){
      ctx.fillStyle = color; const s = cell - (cell > 3 ? 1 : .5);
      for (let i = from; i < to; i++){ const x = (i % cols)*cell, y = Math.floor(i/cols)*cell; if (y > H) break; ctx.fillRect(x, y, s, s); }
    }
    function drawOpen(upto){
      ctx.font = `500 10px ${fMono}`; ctx.textBaseline = 'middle';
      for (const p of OPEN){ const i = p-1; if (i >= upto) continue;
        const x = (i % cols)*cell, y = Math.floor(i/cols)*cell;
        ctx.fillStyle = cOpen; ctx.shadowColor = cOpen; ctx.shadowBlur = 8; ctx.fillRect(x-1, y-1, cell+2, cell+2); ctx.shadowBlur = 0;
        ctx.fillStyle = cDim; ctx.fillText(String(p), x + cell + 4, y + cell/2);
      }
    }
    function full(){ geom(); ctx.clearRect(0,0,W,H); drawCells(0, TOTAL, scanned >= TOTAL ? cDone : cBase); if (scanned < TOTAL) drawCells(0, scanned, cDone); drawOpen(scanned); }
    const rows = $$('.port', $('#scan'));
    async function run(){
      if (sweepRaf) cancelAnimationFrame(sweepRaf);
      rows.forEach(r => { r.classList.add('probing'); $('.st', r).textContent = '…'; });
      $('#scan-foot').textContent = 'Scanning 65,535 ports…'; $('#rescan').disabled = true;
      scanned = 0; full();
      const DUR = reduced ? 1 : 2400, t0 = performance.now();
      await new Promise(res => {
        const step = (ts) => {
          const k = Math.min(1, Math.max(0, (ts - t0)/DUR)), target = Math.floor(TOTAL*k);
          drawCells(scanned, target, cDone);
          OPEN.forEach((p, idx) => { if (p-1 >= scanned && p-1 < target){ const r = rows[idx]; r.classList.remove('probing'); $('.st', r).textContent = 'open'; blip(700 + idx*90); } });
          scanned = target; drawOpen(scanned);
          if (k < 1) sweepRaf = requestAnimationFrame(step); else { sweepRaf = 0; res(); }
        };
        sweepRaf = requestAnimationFrame(step);
      });
      rows.forEach(r => { r.classList.remove('probing'); $('.st', r).textContent = 'open'; });
      $('#scan-foot').textContent = `Nmap done: 1 IP address (1 host up) scanned in ${(Math.max(DUR,100)/1000).toFixed(1)}s · 7 open · 65,528 closed`;
      $('#rescan').disabled = false;
    }
    full();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(full, 150); });
    once($('#scan'), run, '0px 0px -25% 0px');
    $('#rescan').addEventListener('click', run);
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) rows.forEach(d => {
      d.addEventListener('mouseenter', () => { if (!d.open){ d.open = true; d.dataset.hover = '1'; } });
      d.addEventListener('mouseleave', () => { if (d.dataset.hover){ d.open = false; delete d.dataset.hover; } });
      $('summary', d).addEventListener('click', (e) => { if (d.dataset.hover){ e.preventDefault(); delete d.dataset.hover; } });
    });
  })();

  /* timeline "now" */
  (() => {
    const start = new Date(2024, 8, 1), months = (now.getFullYear()-start.getFullYear())*12 + (now.getMonth()-start.getMonth()) + now.getDate()/31;
    $('#tl-now').style.left = Math.max(0, Math.min(100, months/34*100)).toFixed(2)+'%';
  })();

  /* CASE A */
  (() => {
    const list = $('#a-stream'), nodes = $$('.node', $('#simA')), out = $('#a-out'), go = $('#a-go');
    const benign = [['GetObject','role/analytics-reader','us-east-1'],['ListBuckets','user/analyst-ops','us-east-1'],['DescribeInstances','role/ops-automation','us-west-2'],['AssumeRole','role/ci-deployer','us-east-1'],['GetCallerIdentity','user/analyst-ops','us-west-2'],['PutObject','role/log-shipper','us-east-1'],['ConsoleLogin','user/dev-oncall','us-east-1'],['ListRoles','role/audit-reader','us-west-2']];
    let busy = false, bi = 0;
    const ts = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
    function add(ev, who, region, sevTxt, sevCls, rowCls, animate=true){
      const li = el('li', rowCls || ''); if (animate) li.classList.add('new');
      li.append(el('span','t',ts()));
      const e = el('span','e'); e.append(document.createTextNode(ev+' '), el('i',null,`${who} · ${region}`)); li.append(e);
      li.append(el('span', 'sev '+(sevCls||''), sevTxt));
      list.prepend(li); while (list.children.length > 6) list.lastChild.remove();
    }
    for (let i = 0; i < 6; i++){ const b = benign[(bi++) % benign.length]; add(b[0], b[1], b[2], 'info', '', '', false); }
    const v = watch($('#simA'));
    setInterval(() => { if (v.on && !busy && !document.hidden){ const b = benign[(bi++) % benign.length]; add(b[0], b[1], b[2], 'info'); } }, 1600);
    function setNode(i, cls, txt){ nodes[i].classList.remove('hot','ok'); if (cls) nodes[i].classList.add(cls); $('.ns', nodes[i]).textContent = txt; }
    function reset(){ if (busy) return; nodes.forEach((n,i)=>setNode(i,'','idle')); out.innerHTML = '<span class="k">pipeline status:</span> healthy · watching IAM events in us-east-1, us-west-2'; go.textContent = 'Attempt privilege escalation'; }
    go.addEventListener('click', async () => {
      if (busy) return; busy = true; go.disabled = true; nodes.forEach((n,i)=>setNode(i,'','idle')); out.textContent = '';
      add('AttachUserPolicy', 'user/intern-tmp', 'us-east-1', 'critical', 'crit', 'bad'); blip(320,.12,.1);
      setNode(0,'hot','event logged'); out.textContent = '> AttachUserPolicy · AdministratorAccess → user/intern-tmp'; await sleep(600);
      setNode(1,'hot','rule iam-priv-esc matched'); out.textContent += '\n> EventBridge rule matched: iam-priv-esc'; await sleep(600);
      setNode(2,'hot','DetachUserPolicy…'); out.textContent += '\n> Lambda iam-guard invoked · detaching policy'; await sleep(650);
      setNode(2,'ok','policy detached'); add('DetachUserPolicy', 'lambda/iam-guard', 'us-east-1', 'remediated', 'ok', 'good'); blip(980,.06);
      setNode(3,'hot','CRITICAL alert sent'); await sleep(550);
      setNode(3,'ok','alert delivered'); setNode(4,'ok','incident resolved'); setNode(0,'ok','event logged'); setNode(1,'ok','rule matched');
      out.innerHTML = '';
      const lines = [['{',''],['  "severity": ','"CRITICAL",'],['  "event": ','"AttachUserPolicy",'],['  "principal": ','"user/intern-tmp",'],['  "policy": ','"AdministratorAccess",'],['  "action": ','"policy detached automatically",'],['  "incident_ref": ','"DEV{pr1v35c_d3t3ct3d_r3m3d14t3d}"'],['}','']];
      lines.forEach(([k,val],i) => { out.append(el('span','k',k)); out.append(el('span', i===6 ? 'f' : 'v', val)); out.append(document.createTextNode('\n')); });
      out.append(el('span','mini-stamp','Remediated'));
      $('#announce').textContent = 'Privilege escalation detected and remediated.';
      go.disabled = false; go.textContent = 'Run again'; busy = false;
    });
    $('#a-reset').addEventListener('click', reset);
  })();

  /* CASE B */
  (() => {
    const mon = $('#b-mon'), go = $('#b-go'), log = $('#b-log'), file = $('#b-file'), body = $('#b-body'), vers = $('#b-vers');
    let on = false, ver = 1, busy = false;
    const S = (k) => $(`[data-s="${k}"]`, $('#simB'));
    mon.addEventListener('click', () => { if (busy) return; on = !on; mon.setAttribute('aria-checked', on); $('#b-mon-l').textContent = 'Reference monitor: ' + (on ? 'on' : 'off'); });
    function line(txt, cls){ const li = el('li', cls||'', txt); log.append(li); while (log.children.length > 5) log.firstChild.remove(); }
    function resetSteps(){ $$('.step', $('#simB')).forEach(s => s.className = 'step'); }
    go.addEventListener('click', async () => {
      if (busy) return; busy = true; go.disabled = true; resetSteps(); log.innerHTML = ''; file.className = 'file'; body.textContent = `Q3 numbers · v${ver}`;
      if (!on){
        S('a0').classList.add('go'); S('b0').classList.add('go'); line('[A] check write permission → allowed'); line('[B] check write permission → allowed'); await sleep(700);
        S('b1').classList.add('warn'); line('[B] permissions changed between check and use', 'warn'); await sleep(700);
        S('a1').classList.add('go'); S('a2').classList.add('go'); S('b2').classList.add('bad'); blip(260,.15,.1);
        line('[B] stale check reused · unauthorized write accepted', 'bad'); body.textContent = `Q3 numbers · v${ver}\n<<< tampered by thread B >>>`; file.className = 'file bad';
        await sleep(300); line('RESULT: TOCTOU race won by the attacker. No version to roll back to.', 'bad');
      } else {
        S('a0').classList.add('go'); line('[monitor] thread A acquires lock'); S('b0').classList.add('warn'); line('[B] waiting on lock…', 'warn'); await sleep(700);
        S('a1').classList.add('go'); S('a2').classList.add('go'); ver++; body.textContent = `Q3 numbers · v${ver}`;
        vers.append(el('span','vcard new','v'+ver)); while (vers.children.length > 6) vers.firstChild.remove();
        line(`[monitor] snapshot v${ver} saved · lock released`, 'ok'); blip(980,.06); await sleep(700);
        S('b1').classList.add('bad'); S('b2').classList.add('bad'); line('[monitor] DENIED: unauthorized write by thread B', 'bad'); file.className = 'file good';
        await sleep(300); line(`RESULT: file intact at v${ver}. Mandatory access control held.`, 'ok');
      }
      busy = false; go.disabled = false; go.textContent = 'Run again';
    });
  })();

  /* CASE C */
  (() => {
    const cv = $('#radar'), ctx = cv.getContext('2d'), list = $('#c-hosts');
    const H = [['www',20,.42,'ok'],['mail',48,.7,'ok'],['vpn',75,.55,'ok'],['api',100,.32,'ok'],['jenkins',122,.8,'vuln'],['staging',150,.6,'vuln'],['cdn',172,.45,'ok'],['backup-old',198,.86,'vuln'],['sso',218,.36,'ok'],['grafana',240,.72,'shadow'],['docs',262,.5,'ok'],['test-portal',285,.82,'vuln'],['status',305,.4,'ok'],['legacy-ftp',322,.66,'vuln'],['git',338,.58,'shadow'],['dev',356,.28,'shadow']]
      .map(([n,a,r,t]) => ({ name:n+'.target.lab', a:a*Math.PI/180, r, t, shadow: t==='shadow' || /backup|test|legacy/.test(n), found:true }));
    const col = { ok:css('--teal'), shadow:css('--amber'), vuln:css('--crit') }, line = css('--con-line'), dim = css('--con-dim'), fMono = css('--f-mono');
    let S = 300, dpr = 1, angle = -Math.PI/2, running = false, rafId = 0, lastTs = 0, swept = 0;
    function size(){ dpr = Math.min(2, devicePixelRatio || 1); S = cv.clientWidth || 300; cv.width = S*dpr; cv.height = S*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    function renderList(){
      list.innerHTML = '';
      const f = H.filter(h=>h.found);
      f.forEach(h => { const li = el('li'); li.append(el('span',null,h.name)); li.append(el('span', 'sev ' + (h.t==='vuln'?'crit':h.t==='shadow'?'warn':''), h.t==='vuln'?'vuln':h.t==='shadow'?'shadow':'up')); list.append(li); });
      $('#c-n').textContent = f.length; $('#c-s').textContent = f.filter(h=>h.shadow).length; $('#c-v').textContent = f.filter(h=>h.t==='vuln').length;
    }
    function draw(ts){
      const c = S/2, R = S/2 - 6; ctx.clearRect(0,0,S,S);
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let i=1;i<=4;i++){ ctx.beginPath(); ctx.arc(c,c,R*i/4,0,Math.PI*2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(c-R,c); ctx.lineTo(c+R,c); ctx.moveTo(c,c-R); ctx.lineTo(c,c+R); ctx.stroke();
      for (let k=0;k<14;k++){ ctx.beginPath(); ctx.moveTo(c,c); ctx.arc(c,c,R,angle-(k+1)*.045,angle-k*.045); ctx.closePath(); ctx.fillStyle = `rgba(63,216,200,${.16*(1-k/14)})`; ctx.fill(); }
      ctx.strokeStyle = col.ok; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c,c); ctx.lineTo(c+Math.cos(angle)*R, c+Math.sin(angle)*R); ctx.stroke();
      const t = (ts||0)/1000;
      for (const h of H){ if (!h.found) continue;
        const x = c + Math.cos(h.a)*R*h.r, y = c + Math.sin(h.a)*R*h.r;
        ctx.fillStyle = col[h.t]; ctx.beginPath(); ctx.arc(x,y,h.t==='ok'?3:4,0,Math.PI*2); ctx.fill();
        if (h.t==='vuln'){ ctx.strokeStyle = col.vuln; ctx.globalAlpha = reduced ? .6 : .35 + .35*Math.sin(t*4 + h.a); ctx.beginPath(); ctx.arc(x,y,8 + (reduced?0:2*Math.sin(t*4+h.a)),0,Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; }
      }
      ctx.fillStyle = dim; ctx.font = `10px ${fMono}`; ctx.fillText('*.target.lab', 8, S-10);
    }
    function frame(ts){
      const dt = lastTs ? Math.min(64, ts - lastTs) : 16; lastTs = ts;
      if (running){
        const prev = swept; swept += dt * (Math.PI*2/3200); angle = -Math.PI/2 + swept;
        for (const h of H){ if (h.found) continue; let rel = (h.a + Math.PI/2) % (Math.PI*2); if (rel < 0) rel += Math.PI*2; if (rel > prev && rel <= swept){ h.found = true; blip(h.t==='vuln'?300:h.t==='shadow'?520:900,.04,.05); renderList(); } }
        if (swept >= Math.PI*2){ running = false; H.forEach(h=>h.found=true); renderList(); $('#c-go').disabled = false; }
      } else angle += dt * (Math.PI*2/9000);
      draw(ts);
      rafId = (v.on && !document.hidden) ? requestAnimationFrame(frame) : 0;
    }
    const v = watch($('#simC'), (on) => { if (on && !rafId && !reduced){ lastTs = 0; rafId = requestAnimationFrame(frame); } });
    function scan(){
      if (reduced){ H.forEach(h=>h.found=true); renderList(); draw(0); return; }
      H.forEach(h=>h.found=false); renderList(); swept = 0; angle = -Math.PI/2; running = true; $('#c-go').disabled = true;
      if (!rafId){ lastTs = 0; rafId = requestAnimationFrame(frame); }
    }
    size(); renderList(); draw(0);
    addEventListener('resize', () => { size(); draw(0); });
    once($('#simC'), scan, '0px 0px -25% 0px');
    $('#c-go').addEventListener('click', scan);
  })();

  /* CASE D */
  (() => {
    const R = [150,118,86,54], names = ['RBAC','Application whitelisting','RAM-based sandbox','Behavioral anomaly detection'];
    const SC = {
      stuxnet:{ title:'Stuxnet', deg:-140, stop:1, vector:'Infected USB media drops unsigned executables onto the engineering workstation.', why:'The payload runs under a legitimate operator session, so RBAC alone cannot see it. Application whitelisting only lets approved binaries execute, so the dropper never runs.' },
      ukraine:{ title:'2015 Ukrainian grid attack', deg:-35, stop:2, vector:'Hijacked operator sessions on remote-access tools, followed by a KillDisk wiper trying to break out of the HMI and destroy the host.', why:'Stolen credentials and approved remote tools pass the first two layers. The RAM-based sandbox keeps the session inside the kiosk and throws away every write on reboot, so the wiper has nothing persistent to destroy.' },
      oldsmar:{ title:'Oldsmar water treatment breach', deg:55, stop:3, vector:'A remote session through a legitimate tool raises the sodium hydroxide setpoint from 100 ppm to 11,100 ppm.', why:'The session looks valid to RBAC, the tool is whitelisted and the action stays inside the sandbox. Behavioral anomaly detection flags a 111x setpoint jump that no operator would make.' }
    };
    const dot = $('#d-dot'), trail = $('#d-trail'), burst = $('#d-burst'), circles = R.map((_,i)=>$('#r'+i));
    let anim = 0;
    function show(key, animate){
      const s = SC[key]; cancelAnimationFrame(anim);
      $$('[data-sc]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sc === key));
      $('#d-title').textContent = s.title; $('#d-vector').textContent = s.vector; $('#d-why').textContent = s.why;
      const ul = $('#d-layers'); ul.innerHTML = '';
      names.forEach((n,i) => { const li = el('li'); li.append(el('span',null,n)); li.append(el('span', 'sev ' + (i<s.stop?'warn':i===s.stop?'ok':''), i<s.stop?'passed':i===s.stop?'stopped here':'not reached')); ul.append(li); });
      circles.forEach(c => c.classList.remove('held','passed'));
      burst.setAttribute('opacity', 0);
      const a = s.deg*Math.PI/180, r0 = 172, r1 = R[s.stop] + 3, ux = Math.cos(a), uy = Math.sin(a);
      trail.setAttribute('x1', 170+ux*r0); trail.setAttribute('y1', 170+uy*r0);
      const place = (r) => { dot.setAttribute('cx', 170+ux*r); dot.setAttribute('cy', 170+uy*r); trail.setAttribute('x2', 170+ux*r); trail.setAttribute('y2', 170+uy*r); };
      const finish = () => {
        circles.forEach((c,i) => { if (i < s.stop) c.classList.add('passed'); if (i === s.stop) c.classList.add('held'); });
        burst.setAttribute('cx', 170+ux*r1); burst.setAttribute('cy', 170+uy*r1);
        if (animate && !reduced){ const t0 = performance.now(); const b = (ts) => { const k = Math.min(1,Math.max(0,(ts-t0)/500)); burst.setAttribute('r', 6+16*k); burst.setAttribute('opacity', 1-k); if (k<1) requestAnimationFrame(b); }; requestAnimationFrame(b); thud(); }
      };
      if (!animate || reduced){ place(r1); finish(); return; }
      const t0 = performance.now(), D = 1400;
      const step = (ts) => {
        const k = Math.min(1,Math.max(0,(ts-t0)/D)), e = 1 - Math.pow(1-k, 2.2), r = r0 + (r1-r0)*e; place(r);
        circles.forEach((c,i) => { if (i < s.stop && r < R[i]) c.classList.add('passed'); });
        if (k < 1) anim = requestAnimationFrame(step); else finish();
      };
      anim = requestAnimationFrame(step);
    }
    $$('[data-sc]').forEach(b => b.addEventListener('click', () => show(b.dataset.sc, true)));
    show('stuxnet', false);
  })();

  /* CASE E */
  (() => {
    const cv = $('#waves'), ctx = cv.getContext('2d');
    const N = 260, acc = [], eda = [], tmp = [];
    let stressed = false, level = .32, temp = .62, spike = 0, ph = 0, W = 600, Hh = 190, dpr = 1, rafId = 0, stressTimer = 0;
    const cText = css('--con-text'), cTeal = css('--teal'), cAmber = css('--amber'), cDim = css('--con-dim'), cLine = css('--con-line'), fMono = css('--f-mono');
    function size(){ dpr = Math.min(2, devicePixelRatio||1); W = cv.clientWidth || 600; Hh = cv.clientHeight || 190; cv.width = W*dpr; cv.height = Hh*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    function sample(){
      ph += 1;
      level += ((stressed ? .74 : .32) - level) * .012;
      temp += ((stressed ? .42 : .62) - temp) * .006;
      if (stressed && Math.random() < .03) spike = .22;
      spike *= .94;
      acc.push(.5 + (Math.random()-.5) * (stressed ? .55 : .22) + .08*Math.sin(ph*.21));
      eda.push(Math.min(.98, level + spike + (Math.random()-.5)*.02));
      tmp.push(temp + .015*Math.sin(ph*.03) + (Math.random()-.5)*.008);
      [acc,eda,tmp].forEach(a => { while (a.length > N) a.shift(); });
    }
    function lane(arr, y0, h, color, label){
      ctx.strokeStyle = cLine; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y0+h); ctx.lineTo(W, y0+h); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath();
      arr.forEach((v,i) => { const x = W - (arr.length-1-i)*(W/(N-1)), y = y0 + h - v*h*.9 - h*.05; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }); ctx.stroke();
      ctx.fillStyle = cDim; ctx.font = `10px ${fMono}`; ctx.fillText(label, 10, y0 + 14);
    }
    function draw(){ ctx.clearRect(0,0,W,Hh); const h = Hh/3; lane(acc,0,h,cText,'ACC'); lane(eda,h,h,cTeal,'EDA'); lane(tmp,2*h,h,cAmber,'SKIN TEMP'); }
    let lastVerdict = null;
    const tree = $('#e-tree');
    function classify(){
      const edaHigh = level + spike > .55, tempDrop = temp < .52, verdict = edaHigh && tempDrop ? 'stressed' : 'calm';
      $('#e-r').textContent = edaHigh ? 'yes' : 'no'; $('#e-t').textContent = edaHigh ? (tempDrop ? 'yes' : 'no') : '—';
      $('#e-l').textContent = verdict.toUpperCase();
      $$('div', tree).forEach(d => d.classList.remove('on'));
      $('[data-n="root"]', tree).classList.add('on'); if (edaHigh) $('[data-n="temp"]', tree).classList.add('on'); $('[data-n="leaf"]', tree).classList.add('on');
      if (verdict !== lastVerdict){ lastVerdict = verdict; const v = $('#e-verdict'); v.classList.toggle('stressed', verdict==='stressed'); v.innerHTML = '<small>Classification</small>' + (verdict==='stressed' ? 'Stressed' : 'Calm'); }
    }
    function setStress(s){ stressed = s; clearTimeout(stressTimer); if (s) stressTimer = setTimeout(() => { setStress(false); if (reduced){ level = .32; temp = .62; for (let i=0;i<N;i++) sample(); draw(); classify(); } }, 6500); }
    for (let i=0;i<N;i++) sample();
    function frame(){ sample(); sample(); draw(); classify(); rafId = (v.on && !document.hidden) ? requestAnimationFrame(frame) : 0; }
    const v = watch($('#simE'), (on) => { if (on && !rafId && !reduced) rafId = requestAnimationFrame(frame); });
    size(); draw(); classify();
    addEventListener('resize', () => { size(); draw(); });
    $('#e-go').addEventListener('click', () => {
      setStress(true);
      if (reduced){ level = .74; temp = .42; for (let i=0;i<N;i++) sample(); draw(); classify(); }
    });
    setInterval(() => { if (v.on && !stressed && !reduced && Math.random() < .5) setStress(true); }, 9000);
  })();

  /* PHASE 06 printing */
  once($('#p06'), () => {
    if (reduced) return;
    $$('#p06 .pl').forEach((n,i) => { n.style.animationDelay = (i*140)+'ms'; n.classList.add('printing'); });
    let k = 0; const iv = setInterval(() => { blip(180 + (k%3)*20, .03, .03); if (++k > 12) clearInterval(iv); }, 110);
  }, '0px 0px -10% 0px');

  /* scroll spy */
  (() => {
    const ids = ['p00','p01','p02','p03','p04','p05','p06'], links = $$('.phases a');
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; const id = en.target.id;
      links.forEach(a => a.getAttribute('href') === '#'+id ? a.setAttribute('aria-current','step') : a.removeAttribute('aria-current'));
      seenPhases.add(id); links.forEach(a => { if (seenPhases.has(a.getAttribute('href').slice(1))) a.classList.add('seen'); });
      $('#m-phases').textContent = `${seenPhases.size}/7`;
    }), { rootMargin:'-40% 0px -55% 0px' });
    ids.forEach(id => io.observe(document.getElementById(id)));
  })();

  /* recruiter mode */
  function setRecruiter(on, fromUser){
    $('#engagement').hidden = on; $('#recruiter').hidden = !on; $('#rec-btn').setAttribute('aria-pressed', on);
    store.set('ds-recruiter', on ? '1' : '0');
    if (fromUser){ scrollTo(0,0); const t = on ? $('#r-name') : $('#name'); t.setAttribute('tabindex','-1'); t.focus({preventScroll:true}); }
  }
  $('#rec-btn').addEventListener('click', ()=>setRecruiter($('#recruiter').hidden, true));
  $('#note-rec').addEventListener('click', ()=>setRecruiter(true, true));
  $('#r-exit').addEventListener('click', ()=>setRecruiter(false, true));
  if (location.hash === '#recruiter' || store.get('ds-recruiter') === '1') setRecruiter(true, false);

  /* copy */
  function copyText(v, anchor){
    const ok = () => toast('Email copied');
    const fallback = () => {
      const prev = anchor && anchor.previousElementSibling, node = prev && prev.classList.contains('email') ? prev : (anchor && anchor.previousSibling);
      if (!node) { toast(v); return; }
      const r=document.createRange(); r.selectNodeContents(node); const s=getSelection(); s.removeAllRanges(); s.addRange(r); toast('Selected. Press Ctrl/Cmd+C');
    };
    try { navigator.clipboard.writeText(v).then(ok, fallback); } catch(e){ fallback(); }
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copyText(b.dataset.copy, b); });

  /* resume export */
  function exportResume(){
    const a = document.createElement('a');
    a.href = 'Dev_Sheth_Resume.pdf'; a.download = 'Dev_Sheth_Resume.pdf';
    document.body.append(a); a.click(); a.remove();
    toast('Report exported · Dev_Sheth_Resume.pdf'); return true;
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-resume]')) exportResume(); });

  /* flags */
  const FLAG_HASHES = ['61b9fd74e010323a99d877b4cb65dbbb96466d63124f206ecdd88ff48423a2b6','08a4a0792560e0edb059499e6d63583b837026611f7bd69ffc885d9dd753ea43','3bb6256d9aebe598742871d8f0811e621cc04a90806a7a63db8254e2a98a28cc','7ca13c2072574630beccc57576c18fededd4be7175438a165f687d334a035a5d','5cf39d8e6210a4bda3840958f12fdedecfd0f291bb1bd33486a5f982e32928a6'];
  let found = [];
  try { found = JSON.parse(store.get('ds-flags') || '[]').filter(i => Number.isInteger(i) && i>=0 && i<5); } catch(e){ found = []; }
  function renderFlags(){
    $('#flag-count').textContent = `${found.length}/5`; $('#m-flags').textContent = `${found.length}/5`;
    $$('.flag-slots i').forEach((n,i)=>n.classList.toggle('on', found.includes(i)));
  }
  renderFlags();
  async function sha256(s){ const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
  async function submitFlag(v){
    v = (v||'').trim();
    if (!/^DEV\{.+\}$/.test(v)) return { s:'format' };
    let h; try { h = await sha256(v); } catch(e){ return { s:'nohash' }; }
    const i = FLAG_HASHES.indexOf(h); if (i < 0) return { s:'miss' };
    if (found.includes(i)) return { s:'dup' };
    found.push(i); store.set('ds-flags', JSON.stringify(found)); renderFlags(); toast(`Flag captured · ${found.length}/5`); blip(1200,.08,.08);
    if (found.length === 5) setTimeout(openCert, 500);
    return { s:'ok', n:found.length };
  }
  const MSG = { format:'Format is DEV{...}', nohash:'Hashing is unavailable in this browser.', miss:'No match. Hash rejected.', dup:'Already captured.' };
  const pop = $('#flag-pop'), fb = $('#flag-btn');
  fb.addEventListener('click', ()=>{ const open = pop.hidden; pop.hidden = !open; fb.setAttribute('aria-expanded', open); if (open) $('#flag-input').focus(); });
  document.addEventListener('pointerdown', (e)=>{ if (!pop.hidden && !pop.contains(e.target) && !fb.contains(e.target)){ pop.hidden=true; fb.setAttribute('aria-expanded','false'); } });
  $('#flag-form').addEventListener('submit', async (e)=>{
    e.preventDefault(); const msg = $('#flag-msg'), r = await submitFlag($('#flag-input').value);
    msg.className = 'flag-msg ' + (r.s==='ok'||r.s==='dup' ? 'ok' : 'no');
    msg.textContent = r.s==='ok' ? `Flag ${r.n} of 5 captured.` : MSG[r.s];
    if (r.s==='ok') $('#flag-input').value='';
  });

  /* certificate */
  let lastFocus = null;
  function openCert(){ const t = document.getElementById('term-ov'); if (t && !t.hidden) t.hidden = true; lastFocus = document.activeElement; $('#cert-ov').hidden = false; $('#cert-x').focus(); thud(); }
  function closeCert(){ $('#cert-ov').hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $('#cert-x').addEventListener('click', closeCert);
  $('#cert-ov').addEventListener('click', (e) => { if (e.target.id === 'cert-ov') closeCert(); });

  /* terminal */
  const ov = $('#term-ov'), outEl = $('#term-out'), inp = $('#term-input');
  const hist = []; let hIdx = 0, termBooted = false;
  function out(text, cls){ const d = el('div', cls||null, text); outEl.append(d); outEl.scrollTop = outEl.scrollHeight; return d; }
  function outLink(label, href){ const d = el('div'); const a = el('a', null, label); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; d.append(a); outEl.append(d); outEl.scrollTop = outEl.scrollHeight; }
  function outCopy(){ const d = el('div', null, 'shethdevhiren@gmail.com'); const b = el('button', null, 'copy'); b.type='button'; b.dataset.copy='shethdevhiren@gmail.com'; d.append(b); outEl.append(d); outEl.scrollTop = outEl.scrollHeight; }
  function openTerm(){
    lastFocus = document.activeElement; ov.hidden = false;
    if (!termBooted){ termBooted = true; out('DS-2027 operator terminal · type help for commands', 'd'); }
    setTimeout(() => inp.focus(), 0);
  }
  function closeTerm(){ ov.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function goto(id){ closeTerm(); setRecruiter(false, false); document.getElementById(id).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
  const PH = { '00':'p00','01':'p01','02':'p02','03':'p03','04':'p04','05':'p05','06':'p06', '0':'p00','1':'p01','2':'p02','3':'p03','4':'p04','5':'p05','6':'p06', rules:'p00', recon:'p01', scan:'p02', skills:'p02', enum:'p03', experience:'p03', exploit:'p04', projects:'p04', persistence:'p05', report:'p06', contact:'p06' };
  async function run(raw){
    const cmd = raw.trim(); if (!cmd) return;
    out('reviewer@ds-2027:~$ ' + cmd, 'p'); hist.push(cmd); hIdx = hist.length;
    const lc = cmd.toLowerCase(), parts = lc.split(/\s+/), c0 = parts[0], arg = parts.slice(1).join(' ');
    if (lc === 'help') {
      out('whoami            who you are, who the target is\nls [-a]           list files\nls projects       list case files\ncat <file>        read a file\nexport            save the resume PDF\ncontact           email, LinkedIn, GitHub\nopen github|linkedin\ngoto <00-06>      jump to a phase\nflags             flag progress\nsubmit DEV{...}   log a flag\nrecruiter         switch to Recruiter Mode\nsudo hire dev     you know what this does\nhistory · clear · exit', 'd');
    } else if (lc === 'whoami') {
      out(`reviewer · authorization: ${authorized ? 'granted' : 'pending (hold the button in Phase 00)'}`); out('target: Dev Sheth · M.S. Cybersecurity, NYU Tandon · graduating May 2027', 'd');
    } else if (lc === 'ls') { out('projects/  resume.pdf  notes.txt');
    } else if (/^ls -(a|la|al)$/.test(lc)) { out('.  ..  .flag  projects/  resume.pdf  notes.txt');
    } else if (lc === 'ls projects' || lc === 'ls projects/') {
      out('04-A  aws-iam-security-monitor/\n04-B  secure-reference-monitor/\n04-C  network-recon-vuln-assessment/\n04-D  scada-kiosk-hardening/\n04-E  multimodal-stress-detection/'); out('goto 04 to run them', 'd');
    } else if (lc === 'cat notes.txt') { out('Hidden files exist. Try ls -a.', 'w');
    } else if (lc === 'cat .flag') { out('DEV{5ud0_h1r3_d3v}', 'g'); out('submit it with: submit DEV{...}', 'd');
    } else if (lc === 'cat resume.pdf' || lc === 'cat resume') {
      out('Dev Sheth · Brooklyn, NY\nM.S. Cybersecurity, NYU Tandon (2025–2027) · GPA 3.7\nTA, Cloud Security (CS-GY 9223) · ~60 students\nBuilt: AWS IAM threat detection, TOCTOU-safe reference monitor, SCADA hardening\nPublished: Springer BIDA 2025 · 93.77% accuracy'); out('binary file truncated · run export to save the PDF', 'd');
    } else if (lc === 'export') { out('exporting resume.pdf…', 'd'); exportResume();
    } else if (lc === 'contact') { outCopy(); outLink('linkedin.com/in/devsheth9 ↗', 'https://www.linkedin.com/in/devsheth9'); outLink('github.com/ds8282 ↗', 'https://github.com/ds8282');
    } else if (lc === 'open github') { outLink('github.com/ds8282 ↗', 'https://github.com/ds8282');
    } else if (lc === 'open linkedin') { outLink('linkedin.com/in/devsheth9 ↗', 'https://www.linkedin.com/in/devsheth9');
    } else if (c0 === 'goto' || c0 === 'cd') { const id = PH[arg.replace(/^phase\s*/,'')]; if (id) goto(id); else out('usage: goto 00-06', 'e');
    } else if (c0 === 'nmap') { out('scan results are in Phase 02', 'd'); goto('p02');
    } else if (lc === 'flags') {
      out(`${found.length}/5 flags captured`, found.length === 5 ? 'g' : '');
      if (found.length < 5) out('hints: view the source · open devtools · declassify the brief · run case 04-A · ls -a', 'd');
      else { const b = el('button', null, 'show certificate'); b.type='button'; b.onclick = () => { closeTerm(); openCert(); }; const d = el('div'); d.append(b); outEl.append(d); }
    } else if (c0 === 'submit') { const r = await submitFlag(cmd.slice(6)); out(r.s==='ok' ? `flag ${r.n} of 5 captured` : MSG[r.s], r.s==='ok' ? 'g' : r.s==='dup' ? 'w' : 'e');
    } else if (lc === 'recruiter') { closeTerm(); setRecruiter(true, true);
    } else if (lc === 'sudo hire dev') {
      out('[sudo] password for reviewer: ********', 'd'); await sleep(450);
      out('verifying authorization… ok', 'd'); await sleep(450);
      out('privilege granted. escalation logged as a feature.', 'g'); thud(); await sleep(300);
      out('next step: email Dev and schedule the interview'); outCopy(); outLink('linkedin.com/in/devsheth9 ↗', 'https://www.linkedin.com/in/devsheth9');
    } else if (c0 === 'sudo') { out('reviewer is not in the sudoers file. This incident will be reported.', 'e');
    } else if (c0 === 'rm') { out('Permission denied. This dossier is read-only, but nice instinct.', 'e');
    } else if (lc === 'history') { out(hist.map((h,i)=>`${String(i+1).padStart(3)}  ${h}`).join('\n'), 'd');
    } else if (lc === 'clear') { outEl.innerHTML = '';
    } else if (lc === 'exit' || lc === 'quit') { closeTerm();
    } else { out(`command not found: ${c0}. Type help.`, 'e'); }
  }
  $('#term-form').addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value; inp.value = ''; run(v); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp'){ e.preventDefault(); if (hIdx > 0){ hIdx--; inp.value = hist[hIdx]; } }
    if (e.key === 'ArrowDown'){ e.preventDefault(); if (hIdx < hist.length){ hIdx++; inp.value = hist[hIdx] || ''; } }
  });
  $('#term-btn').addEventListener('click', openTerm);
  $('#term-x').addEventListener('click', closeTerm);
  ov.addEventListener('click', (e) => { if (e.target === ov) closeTerm(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      if (!ov.hidden){ closeTerm(); return; }
      if (!$('#cert-ov').hidden){ closeCert(); return; }
      if (!pop.hidden){ pop.hidden = true; fb.setAttribute('aria-expanded','false'); fb.focus(); return; }
    }
    const ae = document.activeElement, typing = ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable);
    if (!typing && ov.hidden && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))){ e.preventDefault(); openTerm(); }
  });

  /* tab-away hook */
  const baseTitle = document.title;
  document.addEventListener('visibilitychange', ()=>{ document.title = document.hidden ? '⚠ Session idle: target still hireable' : baseTitle; });

  /* console greeting */
  console.log('%c' + [' ____  ____','|  _ \\/ ___|   DEV SHETH // ENGAGEMENT FILE DS-2027','| | | \\___ \\   You opened DevTools. That is exactly what I would do.','| |_| |___) |','|____/|____/   Flag for the curious: DEV{d3vt00ls_0p3r4t0r}'].join('\n'), 'font-family:monospace;color:#3FD8C8;background:#0A0D12;padding:8px 12px;line-height:1.4');
  console.log('%cPress / on the page for the terminal. Submit flags with: submit DEV{...}', 'font-family:monospace;color:#7D8A99');
})();
