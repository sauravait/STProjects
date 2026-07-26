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
  pulse(freq = 440, dur = 0.14, vol = 0.05) {
    if (!this.enabled) return;
    const ctx = this.getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur + 0.01);
  }
}

const audio = new AudioManager();
const TOTAL = 7;
let curScene = 0;
let speed = 1;

const $ = (id) => document.getElementById(id);
const svgWrap = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;max-height:360px" role="img" aria-hidden="true">${body}</svg>`;

function applySpeed(root) {
  if (!root) return;
  root.querySelectorAll('animate, animateTransform').forEach((node) => {
    const current = node.getAttribute('dur');
    if (!node.dataset.baseDur && current && /s$/.test(current)) node.dataset.baseDur = current;
    const base = node.dataset.baseDur;
    if (!base || !/s$/.test(base)) return;
    const seconds = parseFloat(base);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    node.setAttribute('dur', `${(seconds / speed).toFixed(2)}s`);
  });
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
    <rect x="212" y="130" width="160" height="32" fill="url(#water0)" opacity="0.9">
      <animate attributeName="y" values="130;135;130" dur="1.2s" repeatCount="indefinite"/>
    </rect>
    <circle cx="420" cy="180" r="52" fill="#0b1224" stroke="#38bdf8" stroke-width="4"/>
    <g transform="translate(420 180)">
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2.2s" repeatCount="indefinite"/>
      <path d="M0 0 L56 -9 L22 12 Z" fill="#67e8f9"/>
      <path d="M0 0 L-56 9 L-22 -12 Z" fill="#67e8f9"/>
      <path d="M0 0 L9 56 L-12 22 Z" fill="#38bdf8"/>
      <path d="M0 0 L-9 -56 L12 -22 Z" fill="#38bdf8"/>
      <circle r="8" fill="#e2e8f0"/>
    </g>
    <rect x="468" y="160" width="72" height="40" rx="8" fill="#1e293b" stroke="#22c55e"/>
    <circle cx="505" cy="180" r="8" fill="#22c55e">
      <animate attributeName="r" values="8;11;8" dur="0.6s" repeatCount="indefinite"/>
      <animate attributeName="fill" values="#22c55e;#4ade80;#22c55e" dur="0.6s" repeatCount="indefinite"/>
    </circle>
    <path d="M550 180 C560 165,570 195,580 180 C590 165,600 195,610 180" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="10 8">
      <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="0.8s" repeatCount="indefinite"/>
    </path>
    <text x="36" y="52" fill="#a5f3fc" font-size="14" data-label="1">Reservoir</text>
    <text x="252" y="122" fill="#a5f3fc" font-size="13" data-label="1">Penstock Flow</text>
    <text x="385" y="260" fill="#a5f3fc" font-size="13" data-label="1">Turbine</text>
    <text x="472" y="226" fill="#86efac" font-size="13" data-label="1">Generator</text>
  `);
}

function renderS1(el) {
  const bubbles = Array.from({ length: 18 }, (_, i) => {
    const x = 320 + i * 16;
    const y = 178 + (i % 4) * 8;
    return `<circle cx="${x}" cy="${y}" r="2.4" fill="#e0f2fe"><animate attributeName="cy" values="${y};${y - 30};${y}" dur="${0.9 + (i % 4) * 0.2}s" repeatCount="indefinite"/></circle>`;
  }).join('');
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#081a35"/>
    <path d="M0 40 L0 340 L260 340 L260 140 Q240 95 190 70 Z" fill="#1e3a8a" opacity="0.48"/>
    <rect x="252" y="90" width="22" height="190" fill="#64748b"/>
    <rect x="275" y="102" width="24" height="120" fill="#94a3b8">
      <animate attributeName="y" values="72;102;72" dur="2s" repeatCount="indefinite"/>
    </rect>
    <path d="M300 162 C350 150,410 180,470 170 C520 160,560 186,620 174 L620 230 L300 230 Z" fill="#38bdf8" opacity="0.86">
      <animate attributeName="d" dur="1s" repeatCount="indefinite"
        values="M300 162 C350 150,410 180,470 170 C520 160,560 186,620 174 L620 230 L300 230 Z;
                M300 166 C350 157,410 173,470 177 C520 167,560 180,620 178 L620 230 L300 230 Z;
                M300 162 C350 150,410 180,470 170 C520 160,560 186,620 174 L620 230 L300 230 Z"/>
    </path>
    ${bubbles}
    <text x="30" y="64" fill="#a5f3fc" font-size="14" data-label="1">Stored Head Water</text>
    <text x="272" y="86" fill="#f1f5f9" font-size="12" data-label="1">Intake Gate</text>
  `);
}

function renderS2(el) {
  const drops = Array.from({ length: 24 }, (_, i) => {
    const x = 140 + i * 16;
    const y = i % 2 ? 146 : 184;
    const dur = (1.2 + (i % 5) * 0.1).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="3" fill="#bae6fd"><animate attributeName="cx" from="${x}" to="530" dur="${dur}s" repeatCount="indefinite"/></circle>`;
  }).join('');
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#07152e"/>
    <rect x="74" y="112" width="470" height="110" rx="54" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
    <rect x="84" y="122" width="450" height="90" rx="45" fill="#0f172a"/>
    ${drops}
    <circle cx="560" cy="70" r="38" fill="#0f172a" stroke="#22d3ee" stroke-width="3">
      <animate attributeName="stroke" values="#22d3ee;#67e8f9;#22d3ee" dur="0.8s" repeatCount="indefinite"/>
    </circle>
    <line x1="560" y1="70" x2="586" y2="70" stroke="#22d3ee" stroke-width="4" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="0 560 70;22 560 70;0 560 70" dur="0.8s" repeatCount="indefinite"/>
    </line>
    <text x="560" y="75" fill="#67e8f9" font-size="11" text-anchor="middle" data-label="1">PSI</text>
    <text x="214" y="246" fill="#a5f3fc" font-size="13" data-label="1">Pressurized Penstock</text>
  `);
}

function renderS3(el) {
  const blades = Array.from({ length: 8 }, (_, i) => `<path d="M0 0 L64 10 L16 18 Z" fill="${i % 2 ? '#67e8f9' : '#22d3ee'}" transform="rotate(${i * 45})"/>`).join('');
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#061226"/>
    <path d="M0 152 C80 146,140 188,208 174 C266 162,314 180,362 170" stroke="#38bdf8" stroke-width="42" fill="none" opacity="0.8" stroke-dasharray="30 22">
      <animate attributeName="stroke-dashoffset" from="0" to="-90" dur="0.8s" repeatCount="indefinite"/>
    </path>
    <circle cx="420" cy="172" r="76" fill="#111827" stroke="#22d3ee" stroke-width="4"/>
    <g transform="translate(420 172)">
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.1s" repeatCount="indefinite"/>
      ${blades}
      <circle r="12" fill="#e2e8f0"/>
    </g>
    <rect x="490" y="166" width="88" height="12" rx="6" fill="#94a3b8">
      <animate attributeName="x" values="490;498;490" dur="0.2s" repeatCount="indefinite"/>
    </rect>
    <text x="378" y="270" fill="#a5f3fc" font-size="13" data-label="1">Runner Blades</text>
    <text x="520" y="160" fill="#cbd5e1" font-size="12" data-label="1">Drive Shaft</text>
  `);
}

function renderS4(el) {
  const wave = Array.from({ length: 44 }, (_, i) => `${i ? 'L' : 'M'}${350 + i * 6} ${172 + Math.sin(i / 3) * 26}`).join(' ');
  const coils = Array.from({ length: 6 }, (_, i) => `<rect x="${110 + i * 30}" y="120" width="18" height="108" rx="9" fill="none" stroke="#22c55e" stroke-width="3"><animate attributeName="stroke" values="#22c55e;#86efac;#22c55e" dur="${0.7 + i * 0.1}s" repeatCount="indefinite"/></rect>`).join('');
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#07152c"/>
    <rect x="82" y="94" width="228" height="160" rx="16" fill="#0f172a" stroke="#22c55e" stroke-width="3"/>
    <g transform="translate(196 174)">
      <animateTransform attributeName="transform" type="rotate" from="0 196 174" to="360 196 174" dur="1.25s" repeatCount="indefinite"/>
      <circle cx="196" cy="174" r="52" fill="#1e293b" stroke="#22d3ee" stroke-width="4" transform="translate(-196 -174)"/>
      <rect x="190" y="126" width="12" height="96" rx="6" fill="#67e8f9"/>
      <rect x="148" y="168" width="96" height="12" rx="6" fill="#67e8f9"/>
    </g>
    ${coils}
    <path d="${wave}" fill="none" stroke="#4ade80" stroke-width="3" stroke-dasharray="16 10">
      <animate attributeName="stroke-dashoffset" from="0" to="-70" dur="0.85s" repeatCount="indefinite"/>
    </path>
    <text x="148" y="274" fill="#bbf7d0" font-size="12" data-label="1">Rotor + Stator</text>
    <text x="396" y="248" fill="#86efac" font-size="12" data-label="1">AC Waveform</text>
  `);
}

function renderS5(el) {
  const pulses = [230, 260, 290].map((x, i) => `<circle cx="${x}" cy="167" r="5" fill="#22d3ee"><animate attributeName="cx" from="${x}" to="530" dur="${1.3 + i * 0.2}s" repeatCount="indefinite"/></circle>`).join('');
  const city = [
    { x: 540, y: 170, w: 26, h: 70 },
    { x: 572, y: 154, w: 36, h: 86 },
    { x: 518, y: 186, w: 18, h: 54 }
  ].map((b, i) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#334155"><animate attributeName="fill" values="#334155;#0ea5e9;#334155" dur="${0.8 + i * 0.2}s" repeatCount="indefinite"/></rect>`).join('');
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#06132a"/>
    <rect x="64" y="122" width="150" height="90" rx="12" fill="#1e293b" stroke="#22d3ee" stroke-width="3"/>
    <rect x="96" y="140" width="28" height="54" fill="none" stroke="#67e8f9" stroke-width="3"/>
    <rect x="152" y="132" width="36" height="70" fill="none" stroke="#22d3ee" stroke-width="3"/>
    <line x1="214" y1="167" x2="336" y2="167" stroke="#22d3ee" stroke-width="5"/>
    <g>
      <path d="M362 240 L386 100 L410 240" stroke="#cbd5e1" stroke-width="4" fill="none"><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1s" repeatCount="indefinite"/></path>
      <path d="M452 240 L476 96 L500 240" stroke="#cbd5e1" stroke-width="4" fill="none"><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.1s" repeatCount="indefinite"/></path>
    </g>
    <line x1="330" y1="126" x2="532" y2="126" stroke="#38bdf8" stroke-width="4"/>
    <line x1="330" y1="150" x2="532" y2="150" stroke="#38bdf8" stroke-width="4"/>
    <line x1="330" y1="174" x2="532" y2="174" stroke="#38bdf8" stroke-width="4"/>
    ${city}
    ${pulses}
    <text x="76" y="112" fill="#a5f3fc" font-size="12" data-label="1">Step-Up Transformer</text>
    <text x="432" y="86" fill="#a5f3fc" font-size="12" data-label="1">Transmission</text>
    <text x="540" y="254" fill="#a5f3fc" font-size="12" data-label="1">City Load</text>
  `);
}

function renderS6(el) {
  const blades = Array.from({ length: 6 }, (_, i) => `<path d="M0 0 L52 8 L14 14 Z" fill="${i % 2 ? '#67e8f9' : '#22d3ee'}" transform="rotate(${i * 60})"/>`).join('');
  el.innerHTML = svgWrap(620, 340, `
    <rect width="620" height="340" fill="#07142b"/>
    <rect x="70" y="130" width="220" height="20" rx="10" fill="#0f172a" stroke="#22d3ee"/>
    <rect id="s6-flowbar" x="72" y="132" width="152" height="16" rx="8" fill="#22d3ee"/>
    <circle cx="398" cy="172" r="62" fill="#111827" stroke="#22d3ee" stroke-width="4"/>
    <g id="s6-fan" transform="translate(398 172)">
      <animateTransform id="s6-spin" attributeName="transform" type="rotate" from="0" to="360" dur="1.3s" repeatCount="indefinite"/>
      ${blades}
    </g>
    <rect x="486" y="132" width="82" height="80" rx="8" fill="#1e293b" stroke="#22c55e"/>
    <circle id="s6-led" cx="526" cy="172" r="9" fill="#22c55e">
      <animate attributeName="r" values="9;12;9" dur="0.6s" repeatCount="indefinite"/>
    </circle>
    <text x="78" y="118" fill="#a5f3fc" font-size="12" data-label="1">Gate Flow</text>
    <text x="356" y="262" fill="#a5f3fc" font-size="12" data-label="1">Turbine Speed</text>
    <text x="488" y="224" fill="#86efac" font-size="12" data-label="1">MW Output</text>
  `);
}

const RENDERERS = [renderS0, renderS1, renderS2, renderS3, renderS4, renderS5, renderS6];

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
  curScene = Math.max(0, Math.min(TOTAL - 1, idx));
  const next = $('scene-' + curScene);
  if (next) next.classList.add('active');
  const vis = $('vis-' + curScene);
  if (vis) {
    RENDERERS[curScene](vis);
    applySpeed(vis);
  }
  if (audio.enabled) audio.pulse(320 + curScene * 40);
  updateUI();
  updateMetrics();
}

function initBg() {
  const canvas = $('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const points = [];
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 65; i++) {
    points.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2 + 0.5, vy: -(Math.random() * 0.35 + 0.08), vx: (Math.random() - 0.5) * 0.2, a: Math.random() * 0.35 + 0.05 });
  }
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,211,238,${p.a})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
      if (p.x < -5) p.x = canvas.width + 5;
      if (p.x > canvas.width + 5) p.x = -5;
    }
    requestAnimationFrame(draw);
  };
  draw();
}

function updateMetrics() {
  const slider = $('flow-slider');
  if (!slider) return;
  const flow = Number(slider.value);
  const rpm = Math.round(flow * 4.5);
  const mw = Math.round(flow * 1.8);
  $('m-flow').textContent = `${flow}%`;
  $('m-rpm').textContent = String(rpm);
  $('m-mw').textContent = `${mw} MW`;

  const bar = $('s6-flowbar');
  if (bar) bar.setAttribute('width', String(Math.max(40, flow * 2.1)));

  const led = $('s6-led');
  if (led) led.setAttribute('fill', flow > 70 ? '#4ade80' : '#22c55e');

  const spin = $('s6-spin');
  if (spin) {
    const dur = Math.max(0.55, (2.2 - flow / 50) / speed);
    spin.setAttribute('dur', `${dur.toFixed(2)}s`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('btn-prev').addEventListener('click', () => { if (curScene > 0) goTo(curScene - 1); });
  $('btn-next').addEventListener('click', () => { if (curScene < TOTAL - 1) goTo(curScene + 1); });
  $('btn-replay').addEventListener('click', () => goTo(curScene));
  $('speed-sel').addEventListener('change', (e) => {
    speed = Math.max(0.5, Math.min(2, Number(e.target.value) || 1));
    goTo(curScene);
  });

  $('tog-labels').addEventListener('change', (e) => document.body.classList.toggle('hide-labels', !e.target.checked));
  $('tog-subtitles').addEventListener('change', (e) => document.body.classList.toggle('hide-subtitles', !e.target.checked));
  $('tog-sound').addEventListener('change', (e) => {
    audio.enabled = e.target.checked;
    if (audio.enabled) audio.pulse(520, 0.12);
  });

  $('flow-slider').addEventListener('input', updateMetrics);

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
  goTo(0);
});
