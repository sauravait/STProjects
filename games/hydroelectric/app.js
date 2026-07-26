'use strict';

class AudioManager {
  constructor() { this.enabled = false; this.ctx = null; }
  getCtx() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  pulse(freq = 440, dur = 0.18, vol = 0.06) {
    if (!this.enabled) return;
    const ctx = this.getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur + 0.02);
  }
}

const audio = new AudioManager();
let curScene = 0;
const TOTAL = 7;
let spd = 1;
let tl = null;
let loops = [];
let fanTween = null;

const $ = (id) => document.getElementById(id);
const killAll = () => {
  if (tl) { tl.kill(); tl = null; }
  loops.forEach(t => t && t.kill && t.kill());
  loops = [];
  fanTween = null;
};

function svgWrap(w, h, body) {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;max-height:360px" role="img" aria-hidden="true">${body}</svg>`;
}

function renderS0(el) {
  el.innerHTML = svgWrap(620, 340, `
    <defs>
      <linearGradient id="sky0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2d4f"/><stop offset="1" stop-color="#071126"/></linearGradient>
      <linearGradient id="water0" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#2563eb"/></linearGradient>
    </defs>
    <rect width="620" height="340" fill="url(#sky0)"/>
    <path d="M0 150 L210 110 L210 340 L0 340 Z" fill="#1e3a8a" opacity="0.45"/>
    <rect x="200" y="85" width="18" height="160" fill="#475569"/>
    <rect x="212" y="130" width="160" height="32" fill="url(#water0)" opacity="0.9"/>
    <circle id="s0-turbine" cx="420" cy="180" r="52" fill="#0b1224" stroke="#38bdf8" stroke-width="4"/>
    <g id="s0-blades" transform="translate(420 180)">
      <path d="M0 0 L56 -9 L22 12 Z" fill="#67e8f9"/>
      <path d="M0 0 L-56 9 L-22 -12 Z" fill="#67e8f9"/>
      <path d="M0 0 L9 56 L-12 22 Z" fill="#38bdf8"/>
      <path d="M0 0 L-9 -56 L12 -22 Z" fill="#38bdf8"/>
      <circle r="8" fill="#e2e8f0"/>
    </g>
    <rect x="468" y="160" width="72" height="40" rx="8" fill="#1e293b" stroke="#22c55e"/>
    <circle id="s0-gen" cx="505" cy="180" r="8" fill="#22c55e"/>
    <path id="s0-wave" d="M550 180 C560 165,570 195,580 180 C590 165,600 195,610 180" fill="none" stroke="#22c55e" stroke-width="3"/>
    <text x="36" y="52" fill="#a5f3fc" font-size="14" data-label="1">Reservoir</text>
    <text x="252" y="122" fill="#a5f3fc" font-size="13" data-label="1">Penstock Flow</text>
    <text x="385" y="260" fill="#a5f3fc" font-size="13" data-label="1">Turbine</text>
    <text x="472" y="226" fill="#86efac" font-size="13" data-label="1">Generator</text>
  `);
}
function animateS0() {
  killAll();
  tl = gsap.timeline();
  tl.fromTo('#s0-blades,#s0-gen,#s0-wave', { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.5 / spd, stagger: 0.12 / spd });
  loops.push(gsap.to('#s0-blades', { rotation: 360, transformOrigin: 'center', duration: 2.2 / spd, repeat: -1, ease: 'none' }));
  loops.push(gsap.to('#s0-wave', { strokeDasharray: '12 10', strokeDashoffset: -44, duration: 1 / spd, repeat: -1, ease: 'none' }));
  loops.push(gsap.to('#s0-gen', { r: 11, fill: '#4ade80', duration: 0.45 / spd, yoyo: true, repeat: -1 }));
}

function renderS1(el) {
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#081a35"/>
    <path d="M0 40 L0 340 L260 340 L260 140 Q240 95 190 70 Z" fill="#1e3a8a" opacity="0.48"/>
    <rect x="252" y="90" width="22" height="190" fill="#64748b"/>
    <rect id="s1-gate" x="275" y="102" width="24" height="120" fill="#94a3b8"/>
    <path id="s1-water" d="M300 162 C350 150,410 180,470 170 C520 160,560 186,620 174 L620 230 L300 230 Z" fill="#38bdf8" opacity="0.86"/>
    <g id="s1-bubbles">${Array.from({ length: 18 }, (_, i) => `<circle cx="${320 + i * 16}" cy="${178 + (i % 4) * 8}" r="2.4" fill="#e0f2fe"/>`).join('')}</g>
    <text x="30" y="64" fill="#a5f3fc" font-size="14" data-label="1">Stored Head Water</text>
    <text x="272" y="86" fill="#f1f5f9" font-size="12" data-label="1">Intake Gate</text>
  `);
}
function animateS1() {
  killAll();
  tl = gsap.timeline();
  tl.fromTo('#s1-gate', { y: -40 }, { y: 0, duration: 0.8 / spd, ease: 'power2.out' })
    .fromTo('#s1-water', { opacity: 0.2 }, { opacity: 0.9, duration: 0.55 / spd }, '<0.2');
  loops.push(gsap.to('#s1-water', { y: 4, duration: 0.6 / spd, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  loops.push(gsap.to('#s1-bubbles circle', { y: -26, opacity: 0.2, duration: 1.2 / spd, repeat: -1, stagger: 0.06 / spd, ease: 'none' }));
}

function renderS2(el) {
  const drops = Array.from({ length: 28 }, (_, i) => {
    const x = 145 + i * 15;
    const y = i % 2 ? 146 : 182;
    return `<circle class="drop" cx="${x}" cy="${y}" r="3" fill="#bae6fd"/>`;
  }).join('');
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#07152e"/>
    <rect x="74" y="112" width="470" height="110" rx="54" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
    <rect x="84" y="122" width="450" height="90" rx="45" fill="#0f172a"/>
    <g id="s2-flow">${drops}</g>
    <circle id="s2-gauge" cx="560" cy="70" r="38" fill="#0f172a" stroke="#22d3ee" stroke-width="3"/>
    <line id="s2-needle" x1="560" y1="70" x2="586" y2="70" stroke="#22d3ee" stroke-width="4" stroke-linecap="round"/>
    <text x="560" y="75" fill="#67e8f9" font-size="11" text-anchor="middle" data-label="1">PSI</text>
    <text x="214" y="246" fill="#a5f3fc" font-size="13" data-label="1">Pressurized Penstock</text>
  `);
}
function animateS2() {
  killAll();
  loops.push(gsap.to('#s2-flow .drop', {
    attr: { cx: '+=420' }, duration: 1.8 / spd, repeat: -1, stagger: 0.05 / spd, ease: 'none',
    modifiers: { cx: x => (parseFloat(x) > 530 ? 130 : parseFloat(x)).toString() }
  }));
  loops.push(gsap.to('#s2-needle', { rotation: 22, transformOrigin: '560px 70px', duration: 0.55 / spd, yoyo: true, repeat: -1 }));
  loops.push(gsap.to('#s2-gauge', { stroke: '#67e8f9', duration: 0.55 / spd, yoyo: true, repeat: -1 }));
}

function renderS3(el) {
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#061226"/>
    <path id="s3-jet" d="M0 152 C80 146,140 188,208 174 C266 162,314 180,362 170" stroke="#38bdf8" stroke-width="42" fill="none" opacity="0.8"/>
    <circle cx="420" cy="172" r="76" fill="#111827" stroke="#22d3ee" stroke-width="4"/>
    <g id="s3-runner" transform="translate(420 172)">
      ${Array.from({ length: 8 }, (_, i) => `<path d="M0 0 L64 10 L16 18 Z" fill="${i % 2 ? '#67e8f9' : '#22d3ee'}" transform="rotate(${i * 45})"/>`).join('')}
      <circle r="12" fill="#e2e8f0"/>
    </g>
    <rect id="s3-shaft" x="490" y="166" width="88" height="12" rx="6" fill="#94a3b8"/>
    <text x="378" y="270" fill="#a5f3fc" font-size="13" data-label="1">Runner Blades</text>
    <text x="520" y="160" fill="#cbd5e1" font-size="12" data-label="1">Drive Shaft</text>
  `);
}
function animateS3() {
  killAll();
  loops.push(gsap.to('#s3-runner', { rotation: 360, transformOrigin: 'center', duration: 1.1 / spd, repeat: -1, ease: 'none' }));
  loops.push(gsap.to('#s3-jet', { strokeDasharray: '28 20', strokeDashoffset: -96, duration: 0.8 / spd, repeat: -1, ease: 'none' }));
  loops.push(gsap.to('#s3-shaft', { x: '+=8', duration: 0.14 / spd, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
}

function renderS4(el) {
  const wave = Array.from({ length: 40 }, (_, i) => {
    const x = 350 + i * 6;
    const y = 172 + Math.sin(i / 3) * 26;
    return `${i ? 'L' : 'M'}${x} ${y}`;
  }).join(' ');
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#07152c"/>
    <rect x="82" y="94" width="228" height="160" rx="16" fill="#0f172a" stroke="#22c55e" stroke-width="3"/>
    <g id="s4-rotor" transform="translate(196 174)">
      <circle r="52" fill="#1e293b" stroke="#22d3ee" stroke-width="4"/>
      <rect x="-6" y="-48" width="12" height="96" rx="6" fill="#67e8f9"/>
      <rect x="-48" y="-6" width="96" height="12" rx="6" fill="#67e8f9"/>
    </g>
    <g id="s4-coils">
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${110 + i * 30}" y="120" width="18" height="108" rx="9" fill="none" stroke="#22c55e" stroke-width="3"/>`).join('')}
    </g>
    <path id="s4-sine" d="${wave}" fill="none" stroke="#4ade80" stroke-width="3"/>
    <text x="148" y="274" fill="#bbf7d0" font-size="12" data-label="1">Rotor + Stator</text>
    <text x="396" y="248" fill="#86efac" font-size="12" data-label="1">AC Waveform</text>
  `);
}
function animateS4() {
  killAll();
  loops.push(gsap.to('#s4-rotor', { rotation: 360, transformOrigin: 'center', duration: 1.25 / spd, repeat: -1, ease: 'none' }));
  loops.push(gsap.to('#s4-coils rect', { stroke: '#86efac', duration: 0.25 / spd, yoyo: true, repeat: -1, stagger: 0.08 / spd }));
  loops.push(gsap.to('#s4-sine', { strokeDasharray: '16 12', strokeDashoffset: -70, duration: 0.9 / spd, repeat: -1, ease: 'none' }));
}

function renderS5(el) {
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#06132a"/>
    <rect x="64" y="122" width="150" height="90" rx="12" fill="#1e293b" stroke="#22d3ee" stroke-width="3"/>
    <rect x="96" y="140" width="28" height="54" fill="none" stroke="#67e8f9" stroke-width="3"/>
    <rect x="152" y="132" width="36" height="70" fill="none" stroke="#22d3ee" stroke-width="3"/>
    <line x1="214" y1="167" x2="336" y2="167" stroke="#22d3ee" stroke-width="5"/>
    <g id="s5-towers">
      <path d="M362 240 L386 100 L410 240" stroke="#cbd5e1" stroke-width="4" fill="none"/>
      <path d="M452 240 L476 96 L500 240" stroke="#cbd5e1" stroke-width="4" fill="none"/>
    </g>
    <line x1="330" y1="126" x2="532" y2="126" stroke="#38bdf8" stroke-width="4"/>
    <line x1="330" y1="150" x2="532" y2="150" stroke="#38bdf8" stroke-width="4"/>
    <line x1="330" y1="174" x2="532" y2="174" stroke="#38bdf8" stroke-width="4"/>
    <g id="s5-city">
      <rect x="540" y="170" width="26" height="70" fill="#334155"/>
      <rect x="572" y="154" width="36" height="86" fill="#475569"/>
      <rect x="518" y="186" width="18" height="54" fill="#1e293b"/>
    </g>
    <g id="s5-pulses">
      <circle cx="230" cy="167" r="5" fill="#22d3ee"/>
      <circle cx="260" cy="167" r="5" fill="#22d3ee"/>
      <circle cx="290" cy="167" r="5" fill="#22d3ee"/>
    </g>
    <text x="76" y="112" fill="#a5f3fc" font-size="12" data-label="1">Step-Up Transformer</text>
    <text x="432" y="86" fill="#a5f3fc" font-size="12" data-label="1">Transmission</text>
    <text x="540" y="254" fill="#a5f3fc" font-size="12" data-label="1">City Load</text>
  `);
}
function animateS5() {
  killAll();
  loops.push(gsap.to('#s5-pulses circle', {
    attr: { cx: '+=300' }, duration: 1.2 / spd, repeat: -1, stagger: 0.2 / spd, ease: 'none',
    modifiers: { cx: x => (parseFloat(x) > 530 ? 230 : parseFloat(x)).toString() }
  }));
  loops.push(gsap.to('#s5-city rect', { fill: '#0ea5e9', duration: 0.5 / spd, yoyo: true, repeat: -1, stagger: 0.1 / spd }));
  loops.push(gsap.to('#s5-towers', { y: -3, duration: 0.55 / spd, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
}

function renderS6(el) {
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#07142b"/>
    <rect x="70" y="130" width="220" height="20" rx="10" fill="#0f172a" stroke="#22d3ee"/>
    <rect id="s6-flowbar" x="72" y="132" width="152" height="16" rx="8" fill="#22d3ee"/>
    <circle id="s6-wheel" cx="398" cy="172" r="62" fill="#111827" stroke="#22d3ee" stroke-width="4"/>
    <g id="s6-fan" transform="translate(398 172)">
      ${Array.from({ length: 6 }, (_, i) => `<path d="M0 0 L52 8 L14 14 Z" fill="${i % 2 ? '#67e8f9' : '#22d3ee'}" transform="rotate(${i * 60})"/>`).join('')}
    </g>
    <rect x="486" y="132" width="82" height="80" rx="8" fill="#1e293b" stroke="#22c55e"/>
    <circle id="s6-led" cx="526" cy="172" r="9" fill="#22c55e"/>
    <text x="78" y="118" fill="#a5f3fc" font-size="12" data-label="1">Gate Flow</text>
    <text x="356" y="262" fill="#a5f3fc" font-size="12" data-label="1">Turbine Speed</text>
    <text x="488" y="224" fill="#86efac" font-size="12" data-label="1">MW Output</text>
  `);
}
function animateS6() {
  killAll();
  fanTween = gsap.to('#s6-fan', { rotation: 360, transformOrigin: 'center', duration: 1.3 / spd, repeat: -1, ease: 'none' });
  loops.push(fanTween);
  loops.push(gsap.to('#s6-led', { r: 12, duration: 0.45 / spd, yoyo: true, repeat: -1 }));
}

const SCENES = [
  { render: renderS0, animate: animateS0 },
  { render: renderS1, animate: animateS1 },
  { render: renderS2, animate: animateS2 },
  { render: renderS3, animate: animateS3 },
  { render: renderS4, animate: animateS4 },
  { render: renderS5, animate: animateS5 },
  { render: renderS6, animate: animateS6 },
];

function updateUI() {
  const pct = ((curScene + 1) / TOTAL) * 100;
  $('progress-bar').style.width = `${pct}%`;
  $('progress-bar').setAttribute('aria-valuenow', String(curScene + 1));
  $('scene-counter').textContent = `${curScene + 1} / ${TOTAL}`;
  $('btn-prev').disabled = curScene === 0;
  $('btn-next').disabled = curScene === TOTAL - 1;
  document.querySelectorAll('.dot-btn').forEach((btn, i) => btn.classList.toggle('active', i === curScene));
}

function goTo(idx) {
  const prev = $('scene-' + curScene);
  if (prev) prev.classList.remove('active');
  killAll();
  curScene = Math.max(0, Math.min(TOTAL - 1, idx));
  const next = $('scene-' + curScene);
  if (next) next.classList.add('active');
  const vis = $('vis-' + curScene);
  if (vis) SCENES[curScene].render(vis);
  requestAnimationFrame(() => requestAnimationFrame(() => SCENES[curScene].animate()));
  if (audio.enabled) audio.pulse(320 + curScene * 40, 0.09, 0.03);
  updateUI();
}

function initBg() {
  const canvas = $('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const points = [];
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 65; i++) {
    points.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vy: -(Math.random() * 0.35 + 0.08),
      vx: (Math.random() - 0.5) * 0.2,
      a: Math.random() * 0.35 + 0.05
    });
  }
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,211,238,${p.a})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
      if (p.x < -5) p.x = canvas.width + 5;
      if (p.x > canvas.width + 5) p.x = -5;
    });
    requestAnimationFrame(draw);
  };
  draw();
}

function wireControlScene() {
  const slider = $('flow-slider');
  if (!slider) return;
  const update = () => {
    const flow = Number(slider.value);
    const rpm = Math.round(flow * 4.5);
    const mw = Math.round(flow * 1.8);
    $('m-flow').textContent = `${flow}%`;
    $('m-rpm').textContent = String(rpm);
    $('m-mw').textContent = `${mw} MW`;
    const bar = document.getElementById('s6-flowbar');
    if (bar) bar.setAttribute('width', String(Math.max(40, flow * 2.1)));
    if (curScene === 6) {
      if (fanTween) fanTween.timeScale(Math.max(0.6, flow / 55) * spd);
      gsap.to('#s6-led', { fill: flow > 70 ? '#4ade80' : '#22c55e', duration: 0.2 });
    }
  };
  slider.addEventListener('input', update);
  update();
}

document.addEventListener('DOMContentLoaded', () => {
  $('btn-prev').addEventListener('click', () => { if (curScene > 0) goTo(curScene - 1); });
  $('btn-next').addEventListener('click', () => { if (curScene < TOTAL - 1) goTo(curScene + 1); });
  $('btn-replay').addEventListener('click', () => goTo(curScene));
  $('speed-sel').addEventListener('change', (e) => { spd = parseFloat(e.target.value); goTo(curScene); });

  $('tog-labels').addEventListener('change', (e) => document.body.classList.toggle('hide-labels', !e.target.checked));
  $('tog-subtitles').addEventListener('change', (e) => document.body.classList.toggle('hide-subtitles', !e.target.checked));
  $('tog-sound').addEventListener('change', (e) => {
    audio.enabled = e.target.checked;
    if (audio.enabled) audio.pulse(520, 0.12, 0.05);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && curScene < TOTAL - 1) goTo(curScene + 1);
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && curScene > 0) goTo(curScene - 1);
    if (e.key.toLowerCase() === 'r') goTo(curScene);
  });

  const dotNav = $('dot-nav');
  for (let i = 0; i < TOTAL; i++) {
    const btn = document.createElement('button');
    btn.className = 'dot-btn';
    btn.title = i === 0 ? 'Overview' : `Step ${i}`;
    btn.setAttribute('aria-label', btn.title);
    btn.addEventListener('click', () => goTo(i));
    dotNav.appendChild(btn);
  }

  initBg();
  wireControlScene();
  goTo(0);
});
