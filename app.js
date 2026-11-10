/* Farheen & Ashfaq — wedding invitation, v2 */
(() => {
  'use strict';

  const WEDDING_UTC = Date.UTC(2026, 10, 27, 14, 30);          // Fri 27 Nov 2026, 8:00 pm Colombo (UTC+5:30)
  const RSVP_PHONE = '94776613293';
  const VENUE = 'The Grand Ballroom, Marino Beach Hotel, Colombo';
  const FILM = 'assets/opening.mp4';
  const FILM_BYTES = 3400000;                                   // used only if the server sends no length
  const PAPER_AT = 4.7;                                         // seconds: from here the film is plain ivory paper
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- the guest's name, from ?g=<base64url> or ?to=<name> ---------- */
  function guestFromUrl() {
    const q = new URLSearchParams(location.search);
    let name = '';
    try {
      if (q.get('g')) {
        let b = q.get('g').replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        name = new TextDecoder().decode(Uint8Array.from(atob(b), c => c.charCodeAt(0)));
      } else if (q.get('to')) {
        name = q.get('to');
      }
    } catch (e) { name = ''; }
    return name.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70);
  }
  const guest = guestFromUrl();
  if (guest) {
    $$('[data-guest]').forEach(el => { el.textContent = guest; });
    $('#rName').value = guest;
  }
  function fitName() {                       // shrink long names until they sit on one line
    $$('[data-guest]').forEach(el => {
      el.style.fontSize = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 1 && size > 15) { size -= 1; el.style.fontSize = size + 'px'; }
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitName);
  addEventListener('resize', fitName);

  /* ---------- small paper sounds, made on the fly (no audio files) ---------- */
  let ac = null;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function noise(ctx, dur) {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; return src;
  }
  function crackSound(delay = 0) {
    const ctx = audio(); if (!ctx) return;
    const t = ctx.currentTime + delay;
    const n = noise(ctx, .16), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = .9;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.4, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .14);
    n.connect(bp).connect(g).connect(ctx.destination); n.start(t);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(60, t + .1);
    og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.25, t + .005); og.gain.exponentialRampToValueAtTime(.0001, t + .12);
    o.connect(og).connect(ctx.destination); o.start(t); o.stop(t + .13);
  }
  function paperSound(delay = 0, dur = .9, vol = .16) {
    const ctx = audio(); if (!ctx) return;
    const t = ctx.currentTime + delay;
    const n = noise(ctx, dur), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(700, t); bp.frequency.linearRampToValueAtTime(1500, t + dur); bp.Q.value = .6;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(bp).connect(g).connect(ctx.destination); n.start(t);
  }

  /* ---------- tilt: the gold foil catches the light as the phone or mouse moves ---------- */
  const card = $('#heroCard'), tip = $('#tiltTip');
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let sensor = false, base = null, pointer = false;
  function listenTilt() {
    addEventListener('deviceorientation', e => {
      if (e.gamma == null || e.beta == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      sensor = true;
      target.x = clamp((e.gamma - base.g) / 25, -1, 1);
      target.y = clamp((e.beta - base.b) / 25, -1, 1);
    });
  }
  if (card) {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') {        // iPhone asks first; do it only when the guest taps the hint
    tip.classList.add('ask');
    $('.for-touch', tip).textContent = 'Tap here, then tilt your phone and the gold catches the light';
    tip.addEventListener('click', () => {
      D.requestPermission().then(s => { if (s === 'granted') listenTilt(); }).catch(() => {});
      tip.classList.remove('ask');
      $('.for-touch', tip).textContent = 'Tilt your phone and the gold catches the light';
    }, { once: true });
  } else if (D) listenTilt();
  card.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = card.getBoundingClientRect();
    pointer = true;
    target.x = ((e.clientX - r.left) / r.width - .5) * 2;
    target.y = ((e.clientY - r.top) / r.height - .5) * 2;
  });
  card.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; });
  function tiltLoop() {
    cur.x += (target.x - cur.x) * .12;
    cur.y += (target.y - cur.y) * .12;
    const live = sensor || pointer;
    card.classList.toggle('auto', !live);
    if (live) {
      card.style.setProperty('--ry', (cur.x * 9).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-cur.y * 7).toFixed(2) + 'deg');
      card.style.setProperty('--fx', (50 + cur.x * 48).toFixed(1) + '%');
      card.style.setProperty('--fy', (50 + cur.y * 48).toFixed(1) + '%');
      card.style.setProperty('--gx', (50 - cur.x * 40).toFixed(1) + '%');
      card.style.setProperty('--gy', (30 - cur.y * 30).toFixed(1) + '%');
    }
    requestAnimationFrame(tiltLoop);
  }
  requestAnimationFrame(tiltLoop);
  }

  /* ---------- falling petals ---------- */
  const cv = $('#petals'), cx = cv.getContext('2d');
  let petals = [], pw = 0, ph = 0, petalsOn = false, lastT = 0;
  function sizePetals() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    pw = innerWidth; ph = innerHeight;
    cv.width = pw * dpr; cv.height = ph * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function newPetal(anywhere) {
    const s = 7 + Math.random() * 9;
    return {
      x: Math.random() * pw, y: anywhere ? Math.random() * ph : -30, s,
      vy: 14 + Math.random() * 20 + s, vx: -6 + Math.random() * 12,
      rot: Math.random() * 6.28, vr: (-.5 + Math.random()) * 1.1,
      ph: Math.random() * 6.28, sw: 14 + Math.random() * 22, fl: .6 + Math.random() * 1.2,
      tone: Math.random() < .22 ? 1 : 0, a: .55 + Math.random() * .4,
    };
  }
  function drawPetals(t) {
    if (!petalsOn) return;
    const dt = Math.min(.05, (t - lastT) / 1000 || 0); lastT = t;
    cx.clearRect(0, 0, pw, ph);
    for (const p of petals) {
      p.y += p.vy * dt; p.ph += dt * p.fl; p.rot += p.vr * dt;
      p.x += (p.vx + Math.sin(p.ph) * p.sw) * dt;
      if (p.y > ph + 30 || p.x < -40 || p.x > pw + 40) Object.assign(p, newPetal(false));
      cx.save();
      cx.translate(p.x, p.y); cx.rotate(p.rot); cx.scale(1, .45 + .55 * Math.abs(Math.cos(p.ph * 1.3)));
      cx.globalAlpha = p.a;
      cx.shadowColor = 'rgba(110, 90, 50, .28)'; cx.shadowBlur = 6; cx.shadowOffsetY = 3;
      const g = cx.createLinearGradient(-p.s, 0, p.s, 0);
      if (p.tone) { g.addColorStop(0, '#c9cdb4'); g.addColorStop(1, '#aab092'); }
      else { g.addColorStop(0, '#fffdf7'); g.addColorStop(1, '#f1e6d2'); }
      cx.fillStyle = g;
      cx.beginPath();
      cx.moveTo(-p.s, 0);
      cx.bezierCurveTo(-p.s * .5, -p.s * .75, p.s * .6, -p.s * .7, p.s, 0);
      cx.bezierCurveTo(p.s * .6, p.s * .7, -p.s * .5, p.s * .75, -p.s, 0);
      cx.fill();
      cx.restore();
    }
    requestAnimationFrame(drawPetals);
  }
  function startPetals() {
    if (reduced || petalsOn) return;
    sizePetals();
    petals = Array.from({ length: innerWidth < 700 ? 11 : 20 }, () => newPetal(true));
    petalsOn = true; lastT = performance.now();
    requestAnimationFrame(drawPetals);
  }
  addEventListener('resize', () => { if (petalsOn) sizePetals(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) petalsOn = false;
    else if (petals.length && !petalsOn && !reduced) { petalsOn = true; lastT = performance.now(); requestAnimationFrame(drawPetals); }
  });

  /* ---------- the paper drifts a little as the page scrolls ---------- */
  const bdImg = $('.backdrop-img'), veil = $('.backdrop-veil'), heroIn = $('.hero-in');
  let scrollQueued = false;
  function onScroll() {
    scrollQueued = false;
    const y = scrollY, vh = innerHeight;
    document.body.classList.toggle('scrolled', y > vh * .55);
    veil.style.setProperty('--veil', clamp((y - vh * .35) / (vh * .6), 0, 1) * .5);
    if (reduced) return;
    const max = document.documentElement.scrollHeight - vh || 1;
    bdImg.style.transform = `translate3d(0, ${(-y / max * 8).toFixed(2)}%, 0)`;
    if (y < vh * 1.1) {
      heroIn.style.transform = `translate3d(0, ${(y * .22).toFixed(1)}px, 0)`;
      heroIn.style.opacity = clamp(1 - y / (vh * .7), 0, 1).toFixed(3);
    }
  }
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- the envelope: load the film, wait for the tap, play, reveal ---------- */
  const gate = $('#gate'), film = $('#film'), sealHit = $('#sealHit'), skipBtn = $('#skip');
  let started = false, revealed = false, blobUrl = null, filmReady = false;

  function reveal(instant) {
    if (revealed) return;
    revealed = true;
    scrollTo(0, 0);
    document.body.classList.remove('locked');
    document.body.classList.add('ready');
    $('#page').removeAttribute('aria-hidden');
    startPetals();
    onScroll();
    const drop = () => { gate.remove(); if (blobUrl) URL.revokeObjectURL(blobUrl); };
    if (instant) return drop();
    gate.classList.add('done');
    setTimeout(drop, reduced ? 0 : 1300);
  }

  function arm() { gate.classList.add('armed'); }

  function setProgress(f) {
    $('#loaderBar').style.strokeDashoffset = (352 * (1 - f)).toFixed(1);
    $('#loaderPct').textContent = Math.round(f * 100) + '%';
  }

  async function loadFilm() {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 20000);
      const res = await fetch(FILM, { signal: ctl.signal });
      if (!res.ok || !res.body) throw new Error('no film');
      const total = +res.headers.get('content-length') || FILM_BYTES;
      const reader = res.body.getReader();
      const chunks = []; let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        setProgress(Math.min(.98, got / total));
      }
      clearTimeout(timer);
      blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
      await new Promise((ok, bad) => {
        film.addEventListener('loadeddata', ok, { once: true });
        film.addEventListener('error', bad, { once: true });
        setTimeout(ok, 2500);
        film.src = blobUrl;
        film.load();
      });
      filmReady = true;
    } catch (e) { filmReady = false; }                          // no film: the tap simply fades to the invitation
    setProgress(1);
    arm();
  }

  function open() {
    if (started) return;
    started = true;
    if (!filmReady || reduced) { paperSound(0, .8, .12); return reveal(); }
    gate.classList.add('playing');
    crackSound(1.45);
    paperSound(1.7, 1.3, .12);
    const fail = setTimeout(() => reveal(), 9000);
    const watch = () => {
      if (revealed) return;
      if (film.currentTime >= PAPER_AT || film.ended) { clearTimeout(fail); return reveal(); }
      requestAnimationFrame(watch);
    };
    const p = film.play();
    if (p && p.catch) p.catch(() => { clearTimeout(fail); reveal(); });
    requestAnimationFrame(watch);
  }
  sealHit.addEventListener('click', open);
  skipBtn.addEventListener('click', () => { if (!started) { started = true; reveal(); } });

  /* ---------- countdown ---------- */
  const pad = n => String(n).padStart(2, '0');
  function setNum(id, v) {
    const el = $(id), s = String(v);
    if (el.textContent === s) return;
    el.textContent = s;
    el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  }
  function tick() {
    const ms = WEDDING_UTC - Date.now();
    if (ms <= 0) { $('#countdown').hidden = true; $('#cdDone').hidden = false; return; }
    const s = Math.floor(ms / 1000);
    setNum('#cdD', Math.floor(s / 86400));
    setNum('#cdH', pad(Math.floor(s % 86400 / 3600)));
    setNum('#cdM', pad(Math.floor(s % 3600 / 60)));
    setNum('#cdS', pad(s % 60));
  }
  tick(); setInterval(tick, 1000);

  /* ---------- calendar ---------- */
  const title = 'Wedding of Farheen & Ashfaq';
  const details = 'Dinner at 8:00 pm, In shaa Allah. R.S.V.P 077 661 3293.';
  $('#gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(title)
    + '&dates=20261127T143000Z/20261127T173000Z'
    + '&details=' + encodeURIComponent(details)
    + '&location=' + encodeURIComponent(VENUE);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Farheen and Ashfaq//Wedding//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', 'UID:farheen-ashfaq-20261127@invitation', 'DTSTAMP:20261110T000000Z',
    'DTSTART:20261127T143000Z', 'DTEND:20261127T173000Z',
    'SUMMARY:' + title, 'LOCATION:' + VENUE.replace(/,/g, '\\,'), 'DESCRIPTION:' + details.replace(/,/g, '\\,'),
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + title, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  $('#ics').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);

  /* ---------- RSVP through WhatsApp ---------- */
  let guests = 1;
  const out = $('#guests');
  $('#minus').addEventListener('click', () => { guests = Math.max(1, guests - 1); out.textContent = guests; });
  $('#plus').addEventListener('click', () => { guests = Math.min(12, guests + 1); out.textContent = guests; });
  $$('input[name=att]').forEach(r => r.addEventListener('change', () => {
    $('#countWrap').classList.toggle('off', $('input[name=att]:checked').value === 'no');
  }));
  $('#rsvpForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#rName').value.trim();
    if (!name) { $('#formErr').hidden = false; $('#rName').focus(); return; }
    $('#formErr').hidden = true;
    const yes = $('input[name=att]:checked').value === 'yes';
    const msg = $('#rMsg').value.trim();
    const lines = [
      'Assalamu alaikum! RSVP for the wedding of Farheen & Ashfaq (Fri 27.11.2026)',
      '',
      'Name: ' + name,
      yes ? 'Attending: Yes, joyfully accepts' : 'Attending: Regretfully declines',
    ];
    if (yes) lines.push('Number of guests: ' + guests);
    if (msg) lines.push('', 'Message: ' + msg);
    location.href = 'https://wa.me/' + RSVP_PHONE + '?text=' + encodeURIComponent(lines.join('\n'));
  });

  /* ---------- full card view ---------- */
  const lb = $('#lightbox');
  const openLb = () => { lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbClose').focus(); };
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; };
  $('#openCard').addEventListener('click', openLb);
  $('#lbClose').addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* ---------- scroll reveal + dock highlight ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));

  const links = $$('.dock a');
  const spy = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['card', 'date', 'venue', 'rsvp'].forEach(id => spy.observe(document.getElementById(id)));

  /* ---------- start: load the film ---------- */
  let opened = false;                       // the envelope shows on every visit; only ?open=1 skips it
  try { opened = new URLSearchParams(location.search).get('open') === '1'; } catch (e) {}
  if (opened) { started = true; reveal(true); }
  else loadFilm();
})();
