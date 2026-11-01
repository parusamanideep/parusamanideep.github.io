(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  $('#year').textContent = new Date().getFullYear();

  /* ---------------- Boot loader ---------------- */
  const loader = $('.loader');
  const bootLines = [
    '> powering rails ........ 3V3 OK',
    '> clock PLL ............. LOCKED',
    '> RF front-end .......... n78 READY',
    '> handshake gNB ......... ATTACHED',
    '> loading portfolio ..... 100%'
  ];
  function finishBoot() {
    loader.classList.add('done');
    document.body.classList.remove('loading');
    document.body.classList.add('ready');
    scrambleAll();
    startTyping();
  }
  if (reduced) {
    finishBoot();
  } else {
    document.body.classList.add('loading');
    const log = $('.loader-log');
    const bar = $('.loader-bar span');
    let i = 0;
    const step = () => {
      if (i < bootLines.length) {
        log.textContent += (i ? '\n' : '') + bootLines[i];
        i++;
        bar.style.width = (i / bootLines.length) * 100 + '%';
        setTimeout(step, 190);
      } else {
        setTimeout(finishBoot, 250);
      }
    };
    step();
  }

  /* ---------------- Text scramble ---------------- */
  const glyphs = '!<>-_\\/[]{}=+*^?#01ΛΣΩ';
  function scramble(el, keep) {
    if (el._busy) return; el._busy = true;
    const target = el.dataset.text;
    let frame = 0;
    const queue = [...target].map((ch, i) => ({ ch, start: Math.floor(Math.random() * 12) + i, end: Math.floor(Math.random() * 18) + 18 + i * 2 }));
    const tick = () => {
      let out = '', done = 0;
      for (const q of queue) {
        if (frame >= q.end) { out += q.ch; done++; }
        else if (frame >= q.start) out += glyphs[Math.floor(Math.random() * glyphs.length)];
        else out += q.ch === ' ' ? ' ' : ' ';
      }
      el.textContent = out;
      frame++;
      if (done < queue.length) requestAnimationFrame(tick); else el._busy = false;
    };
    tick();
  }
  function scrambleAll() { if (!reduced) $$('.scramble').forEach(scramble); }
  $$('.scramble').forEach(el => el.addEventListener('mouseenter', () => !reduced && scramble(el, true)));

  /* ---------------- Typed roles ---------------- */
  const roles = ['Electronics Design Engineer', '5G & Wireless Enthusiast', 'PCB & Embedded Systems Builder', 'Signal Processing Explorer'];
  function startTyping() {
    const el = $('.typed');
    if (reduced) { el.textContent = roles[0]; return; }
    let r = 0, c = 0, del = false;
    const loop = () => {
      const word = roles[r];
      c += del ? -1 : 1;
      el.textContent = word.slice(0, c);
      let wait = del ? 35 : 70;
      if (!del && c === word.length) { del = true; wait = 1700; }
      else if (del && c === 0) { del = false; r = (r + 1) % roles.length; wait = 350; }
      setTimeout(loop, wait);
    };
    setTimeout(loop, 700);
  }

  /* ---------------- PCB trace hero background ---------------- */
  (function pcb() {
    const canvas = $('#pcb');
    const ctx = canvas.getContext('2d');
    const dim = document.createElement('canvas');
    const bright = document.createElement('canvas');
    const mask = document.createElement('canvas');
    let W, H, traces = [], pulses = [], mouse = { x: -999, y: -999, tx: -999, ty: -999 };
    const G = 28; // grid
    const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

    function build() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      for (const c of [canvas, dim, bright, mask]) { c.width = W * DPR; c.height = H * DPR; }
      const cols = Math.ceil(W / G), rows = Math.ceil(H / G);
      const used = new Set();
      traces = [];
      const count = Math.floor((cols * rows) / 9);
      for (let n = 0; n < count; n++) {
        let x = Math.floor(Math.random() * cols), y = Math.floor(Math.random() * rows);
        if (used.has(x + ',' + y)) continue;
        let d = Math.floor(Math.random() * 4) * 2; // start orthogonal
        const pts = [[x, y]];
        used.add(x + ',' + y);
        const len = 4 + Math.floor(Math.random() * 14);
        for (let s = 0; s < len; s++) {
          if (Math.random() < 0.22) d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8; // 45° bend
          const nx = x + dirs[d][0], ny = y + dirs[d][1];
          const key = nx + ',' + ny;
          if (nx < 0 || ny < 0 || nx > cols || ny > rows || used.has(key)) break;
          used.add(key); x = nx; y = ny; pts.push([x, y]);
        }
        if (pts.length > 2) traces.push(pts.map(([a, b]) => [a * G + G / 2, b * G + G / 2]));
      }
      // precompute lengths
      traces = traces.map(p => {
        const segs = []; let total = 0;
        for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); segs.push(l); total += l; }
        return { p, segs, total };
      });
      paint(dim.getContext('2d'), 'rgba(90,130,220,0.22)', 'rgba(90,130,220,0.35)');
      paint(bright.getContext('2d'), 'rgba(0,229,255,0.85)', 'rgba(0,229,255,1)');
    }

    function paint(c, stroke, via) {
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      c.clearRect(0, 0, W, H);
      c.lineWidth = 1.4; c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = stroke;
      for (const t of traces) {
        c.beginPath(); c.moveTo(...t.p[0]);
        for (const pt of t.p) c.lineTo(...pt);
        c.stroke();
      }
      for (const t of traces) {
        for (const pt of [t.p[0], t.p[t.p.length - 1]]) {
          c.beginPath(); c.arc(pt[0], pt[1], 3.2, 0, Math.PI * 2);
          c.strokeStyle = via; c.stroke();
        }
      }
    }

    function pointAt(t, dist) {
      let d = Math.max(0, Math.min(dist, t.total));
      for (let i = 0; i < t.segs.length; i++) {
        if (d <= t.segs[i]) { const k = d / t.segs[i], a = t.p[i], b = t.p[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
        d -= t.segs[i];
      }
      return t.p[t.p.length - 1];
    }

    function spawn(near) {
      if (!traces.length) return;
      let t = traces[Math.floor(Math.random() * traces.length)];
      if (near) {
        let best = Infinity;
        for (const tr of traces) { const d = Math.hypot(tr.p[0][0] - near.x, tr.p[0][1] - near.y); if (d < best && Math.random() < 0.9) { best = d; t = tr; } }
      }
      const hue = Math.random() < 0.75 ? '0,229,255' : (Math.random() < 0.5 ? '139,92,255' : '182,255,59');
      pulses.push({ t, d: 0, v: 1.6 + Math.random() * 2.4, hue });
    }

    function frame() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(dim, 0, 0);
      // flashlight around mouse
      mouse.x += (mouse.tx - mouse.x) * 0.12; mouse.y += (mouse.ty - mouse.y) * 0.12;
      if (mouse.x > -500) {
        const m = mask.getContext('2d');
        m.setTransform(1, 0, 0, 1, 0, 0);
        m.globalCompositeOperation = 'source-over';
        m.clearRect(0, 0, mask.width, mask.height);
        const g = m.createRadialGradient(mouse.x * DPR, mouse.y * DPR, 0, mouse.x * DPR, mouse.y * DPR, 200 * DPR);
        g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g; m.fillRect(0, 0, mask.width, mask.height);
        m.globalCompositeOperation = 'source-in';
        m.drawImage(bright, 0, 0);
        ctx.drawImage(mask, 0, 0);
      }
      // pulses
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.d += p.v;
        const tail = 46;
        for (let k = 0; k < 8; k++) {
          const [x, y] = pointAt(p.t, p.d - (k * tail) / 8);
          const a = (1 - k / 8) * 0.9;
          ctx.fillStyle = `rgba(${p.hue},${a})`;
          ctx.beginPath(); ctx.arc(x, y, 2.4 - k * 0.2, 0, Math.PI * 2); ctx.fill();
        }
        const [hx, hy] = pointAt(p.t, p.d);
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
        g.addColorStop(0, `rgba(${p.hue},0.6)`); g.addColorStop(1, `rgba(${p.hue},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.fill();
        if (p.d - tail > p.t.total) pulses.splice(i, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
      if (pulses.length < 26 && Math.random() < 0.18) spawn();
      if (running) requestAnimationFrame(frame);
    }

    let running = false;
    build();
    if (reduced) { ctx.drawImage(dim, 0, 0); return; }
    const io = new IntersectionObserver(([e]) => {
      const was = running; running = e.isIntersecting;
      if (running && !was) requestAnimationFrame(frame);
    });
    io.observe(canvas);
    const hero = $('.hero');
    hero.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; if (mouse.x < -500) { mouse.x = mouse.tx; mouse.y = mouse.ty; } });
    hero.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = mouse.x = mouse.y = -999; });
    hero.addEventListener('click', e => { const r = canvas.getBoundingClientRect(); for (let i = 0; i < 6; i++) spawn({ x: e.clientX - r.left, y: e.clientY - r.top }); });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  })();

  /* ---------------- Oscilloscope widget ---------------- */
  (function scope() {
    const c = $('#scope'); if (!c || reduced) return;
    const ctx = c.getContext('2d');
    let w, h, t = 0;
    const size = () => { w = c.clientWidth; h = c.clientHeight; c.width = w * DPR; c.height = h * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
    size(); window.addEventListener('resize', size);
    const draw = () => {
      requestAnimationFrame(draw);
      if (!w || !h || c.offsetParent === null) return; // hidden on small screens
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,160,255,0.12)'; ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += w / 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y <= h; y += h / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const trace = (fn, color, width) => {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.shadowColor = color; ctx.shadowBlur = 8;
        for (let x = 0; x <= w; x += 2) { const y = h / 2 + fn(x) * h * 0.36; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.shadowBlur = 0;
      };
      // AM-modulated carrier + baseband
      trace(x => Math.sin(x * 0.32 - t * 6) * (0.55 + 0.4 * Math.sin(x * 0.03 - t)) + (Math.random() - 0.5) * 0.06, '#00e5ff', 1.4);
      trace(x => Math.sign(Math.sin(x * 0.045 - t * 1.2)) * 0.22 - 0.0, 'rgba(182,255,59,0.8)', 1.2);
      t += 0.016;
    };
    draw();
  })();

  /* ---------------- QAM constellation lab ---------------- */
  (function lab() {
    const c = $('#constellation'); if (!c) return;
    const ctx = c.getContext('2d');
    const slider = $('#snr');
    let M = 16, snr = +slider.value, ideal = [], pts = [], size = 0, visible = false;
    const recent = [];

    function setM(m) {
      M = m; ideal = [];
      const k = Math.sqrt(M);
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) ideal.push([(2 * i - (k - 1)), (2 * j - (k - 1))]);
      const es = ideal.reduce((s, [a, b]) => s + a * a + b * b, 0) / M;
      const norm = Math.sqrt(es);
      ideal = ideal.map(([a, b]) => [a / norm, b / norm]);
      pts = []; recent.length = 0;
      $('#lab-mod').textContent = M === 4 ? 'QPSK' : M + '-QAM';
      $('#bps').textContent = Math.log2(M);
    }
    function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function resize() { size = c.clientWidth; c.width = size * DPR; c.height = size * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    function updateSnr() {
      snr = +slider.value;
      const p = ((snr - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty('--p', p + '%');
      $('#snr-val').textContent = snr + ' dB SNR';
      $('#lab-snr').textContent = 'SNR ' + snr + ' dB';
    }

    function addSymbols(n) {
      const sigma = Math.sqrt(1 / Math.pow(10, snr / 10) / 2);
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * M);
        const [a, b] = ideal[idx];
        const x = a + gauss() * sigma, y = b + gauss() * sigma;
        // nearest decision
        let best = 0, bd = Infinity;
        for (let k = 0; k < M; k++) { const d = (ideal[k][0] - x) ** 2 + (ideal[k][1] - y) ** 2; if (d < bd) { bd = d; best = k; } }
        const err = best !== idx;
        pts.push({ x, y, life: 1, err });
        recent.push(err ? 1 : 0);
        if (recent.length > 1500) recent.shift();
      }
      if (pts.length > 900) pts.splice(0, pts.length - 900);
    }

    function draw() {
      const s = size, half = s / 2, scale = s * 0.3;
      ctx.clearRect(0, 0, s, s);
      // axes / grid
      ctx.strokeStyle = 'rgba(120,160,255,0.10)'; ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) { const v = (s / 8) * i; ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, s); ctx.moveTo(0, v); ctx.lineTo(s, v); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(120,160,255,0.35)';
      ctx.beginPath(); ctx.moveTo(half, 10); ctx.lineTo(half, s - 10); ctx.moveTo(10, half); ctx.lineTo(s - 10, half); ctx.stroke();
      ctx.fillStyle = 'rgba(139,151,184,0.8)'; ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('I', s - 20, half - 8); ctx.fillText('Q', half + 8, 34);
      // received points
      ctx.globalCompositeOperation = 'lighter';
      for (const p of pts) {
        p.life -= 0.004;
        const px = half + p.x * scale, py = half - p.y * scale;
        ctx.fillStyle = p.err ? `rgba(255,79,216,${0.9 * p.life})` : `rgba(0,229,255,${0.75 * p.life})`;
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      pts = pts.filter(p => p.life > 0);
      // ideal symbols
      ctx.strokeStyle = 'rgba(182,255,59,0.9)'; ctx.lineWidth = 1.5;
      const r = M === 64 ? 3 : 5;
      for (const [a, b] of ideal) {
        const px = half + a * scale, py = half - b * scale;
        ctx.beginPath(); ctx.moveTo(px - r, py); ctx.lineTo(px + r, py); ctx.moveTo(px, py - r); ctx.lineTo(px, py + r); ctx.stroke();
      }
    }

    let last = 0;
    function loop(ts) {
      if (!visible) return;
      addSymbols(M === 64 ? 14 : 9);
      draw();
      if (ts - last > 300) {
        last = ts;
        const ser = recent.length ? (recent.reduce((a, b) => a + b, 0) / recent.length) * 100 : 0;
        $('#ser').textContent = ser.toFixed(ser < 10 ? 1 : 0) + '%';
      }
      requestAnimationFrame(loop);
    }

    $$('#mod button').forEach(b => b.addEventListener('click', () => {
      $$('#mod button').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('on'); b.setAttribute('aria-checked', 'true');
      setM(+b.dataset.m);
    }));
    slider.addEventListener('input', () => { updateSnr(); recent.length = 0; });

    setM(16); updateSnr(); resize();
    window.addEventListener('resize', resize);
    if (reduced) { addSymbols(600); draw(); return; }
    new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) requestAnimationFrame(loop); }).observe(c);
  })();

  /* ---------------- Scroll reveal ---------------- */
  const revealIO = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      $$('.meter', e.target).forEach(m => {
        $('i', m).style.width = m.dataset.level + '%';
        countUp($('span', m), +m.dataset.level);
      });
      revealIO.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  function countUp(el, to) {
    const t0 = performance.now(), dur = 1600;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.dataset.val = Math.round(to * e) + '%';
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- Scroll-driven: progress, nav, timeline ---------------- */
  const nav = $('.nav'), progress = $('.scroll-progress');
  const tl = $('.timeline'), tlFill = $('.timeline-line span');
  const sections = $$('main section[id]');
  const links = $$('.nav-links a');
  let lastY = 0, ticking = false;
  function onScroll() {
    const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (!nav.classList.contains('open')) nav.classList.toggle('hidden', y > lastY && y > 400);
    lastY = y;
    const r = tl.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (innerHeight * 0.65 - r.top) / r.height));
    tlFill.style.height = k * 100 + '%';
    let cur = '';
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = s.id;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------------- Mobile nav ---------------- */
  const toggle = $('.nav-toggle');
  toggle.addEventListener('click', () => { const o = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', o); });
  links.forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));

  /* ---------------- Pointer effects ---------------- */
  if (finePointer && !reduced) {
    document.body.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor-dot'), ring = $('.cursor-ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    (function follow() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(follow); })();
    document.addEventListener('pointerover', e => cur.classList.toggle('hover', !!e.target.closest('a, button, input, .card, .feature')));

    // magnetic buttons
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });

    // 3D tilt + glow
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg)`;
        card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
  // spotlight on feature cards (works for touch too)
  $$('.spotlight').forEach(f => f.addEventListener('pointermove', e => {
    const r = f.getBoundingClientRect();
    f.style.setProperty('--mx', e.clientX - r.left + 'px'); f.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* ---------------- Copy email ---------------- */
  const toast = $('.toast');
  function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
  $('.copy-email').addEventListener('click', async e => {
    const email = e.currentTarget.dataset.email;
    try { await navigator.clipboard.writeText(email); showToast('✓ Email copied to clipboard'); }
    catch { showToast(email); }
  });
})();
