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
  // Soft triad "chime" used on scene changes for a polished feel.
  chime(root = 330) {
    if (!this.enabled) return;
    [0, 4, 7].forEach((semi, i) => {
      const f = root * Math.pow(2, semi / 12);
      setTimeout(() => this.pulse(f, 0.5, 0.035), i * 70);
    });
  }
}

const audio = new AudioManager();
const TOTAL = 7;
let curScene = 0;
let speed = 1;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (id) => document.getElementById(id);
const VBW = 640;
const VBH = 400;
const svgWrap = (body, defs = '') => `<svg viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block" role="img" aria-hidden="true"><defs>${SHARED_DEFS}${defs}</defs>${body}</svg>`;

// Shared gradients / filters reused across scenes.
const SHARED_DEFS = `
  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7dd3fc"/><stop offset="0.5" stop-color="#38bdf8"/><stop offset="1" stop-color="#1d4ed8"/>
  </linearGradient>
  <linearGradient id="waterFlow" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#2563eb"/>
  </linearGradient>
  <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0c355c"/><stop offset="1" stop-color="#061024"/>
  </linearGradient>
  <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#cbd5e1"/><stop offset="0.5" stop-color="#94a3b8"/><stop offset="1" stop-color="#475569"/>
  </linearGradient>
  <linearGradient id="copperGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#b45309"/>
  </linearGradient>
  <radialGradient id="glowAqua" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#67e8f9" stop-opacity="0.9"/><stop offset="1" stop-color="#67e8f9" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowGreen" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#4ade80" stop-opacity="0.9"/><stop offset="1" stop-color="#4ade80" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/>
  </radialGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="3"/>
  </filter>
  <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="4" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="glowStrong" x="-120%" y="-120%" width="340%" height="340%">
    <feGaussianBlur stdDeviation="7" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="drop" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#020617" flood-opacity="0.55"/>
  </filter>`;

// Standard atmospheric backdrop shared by every scene (depth + vignette).
const VIGNETTE = `<rect width="640" height="400" fill="url(#vignette)" pointer-events="none"/>`;

// Spinning wrapper: outer group translates to the pivot, inner group rotates
// around its own origin so translate is never overwritten by animateTransform.
function spin(cx, cy, dur, inner, groupId, animId) {
  return `<g transform="translate(${cx} ${cy})">
    <g${groupId ? ` id="${groupId}"` : ''}>
      <animateTransform${animId ? ` id="${animId}"` : ''} attributeName="transform" type="rotate" from="0" to="360" dur="${dur}s" repeatCount="indefinite"/>
      ${inner}
    </g>
  </g>`;
}

// Curved Francis-style runner blades centered on origin.
function runnerBlades(r, n, cA, cB) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * 360) / n;
    return `<path d="M0 0 Q ${r * 0.5} ${-r * 0.18} ${r} ${-r * 0.04} Q ${r * 0.58} ${r * 0.14} ${r * 0.18} ${r * 0.3} Z" fill="${i % 2 ? cA : cB}" transform="rotate(${a})"/>`;
  }).join('');
}

function applySpeed(root) {
  if (!root) return;
  root.querySelectorAll('animate, animateTransform, animateMotion').forEach((node) => {
    if (reduceMotion) { node.setAttribute('repeatCount', '1'); node.setAttribute('dur', '0.001s'); return; }
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
  el.innerHTML = svgWrap(`
    <rect width="640" height="400" fill="url(#skyGrad)"/>
    <path d="M0 150 L120 78 L230 150 L360 66 L520 150 L640 96 L640 400 L0 400 Z" fill="#0e223c" opacity="0.55"/>

    <!-- Reservoir tank -->
    <rect x="26" y="96" width="150" height="236" rx="12" fill="#0b1e38" stroke="#1e3a8a" stroke-width="2"/>
    <clipPath id="resClip0"><rect x="30" y="118" width="142" height="210" rx="9"/></clipPath>
    <g clip-path="url(#resClip0)">
      <rect x="30" y="118" width="142" height="220" fill="url(#waterGrad)"/>
      <path d="M30 130 Q 66 118 102 130 T 172 130 L172 338 L30 338 Z" fill="#7dd3fc" opacity="0.35">
        <animate attributeName="d" dur="3.4s" repeatCount="indefinite"
          values="M30 130 Q 66 118 102 130 T 172 130 L172 338 L30 338 Z;
                  M30 128 Q 66 140 102 128 T 172 128 L172 338 L30 338 Z;
                  M30 130 Q 66 118 102 130 T 172 130 L172 338 L30 338 Z"/>
      </path>
    </g>

    <!-- Dam wall -->
    <path d="M170 96 L196 96 L206 336 L170 336 Z" fill="url(#metalGrad)" stroke="#334155"/>

    <!-- Penstock pipe (metal casing + animated water) -->
    <path d="M188 236 L300 312 L332 312" fill="none" stroke="url(#metalGrad)" stroke-width="30" stroke-linecap="round"/>
    <path d="M188 236 L300 312 L332 312" fill="none" stroke="url(#waterFlow)" stroke-width="17" stroke-linecap="round" stroke-dasharray="20 16">
      <animate attributeName="stroke-dashoffset" from="0" to="-72" dur="0.9s" repeatCount="indefinite"/>
    </path>

    <!-- Powerhouse -->
    <rect x="314" y="250" width="200" height="120" rx="14" fill="#0c1c34" stroke="#22d3ee" stroke-width="1.5" opacity="0.95"/>

    <!-- Turbine -->
    <circle cx="372" cy="312" r="40" fill="url(#glowAqua)"/>
    <circle cx="372" cy="312" r="34" fill="#0b1224" stroke="#38bdf8" stroke-width="4" filter="url(#glow)"/>
    ${spin(372, 312, 2, runnerBlades(30, 8, '#67e8f9', '#38bdf8') + '<circle r="7" fill="#e2e8f0"/>')}

    <!-- Shaft to generator -->
    <rect x="406" y="306" width="30" height="12" rx="6" fill="url(#metalGrad)"/>

    <!-- Generator -->
    <rect x="434" y="278" width="66" height="68" rx="10" fill="#12233c" stroke="#22c55e" stroke-width="2" filter="url(#drop)"/>
    <circle cx="467" cy="312" r="16" fill="url(#glowGreen)"/>
    <circle cx="467" cy="312" r="9" fill="#22c55e" filter="url(#glow)">
      <animate attributeName="r" values="8;11;8" dur="0.7s" repeatCount="indefinite"/>
      <animate attributeName="fill" values="#22c55e;#4ade80;#22c55e" dur="0.7s" repeatCount="indefinite"/>
    </circle>

    <!-- Transmission line + pulses to grid -->
    <line x1="500" y1="312" x2="600" y2="200" stroke="#22c55e" stroke-width="3" opacity="0.5"/>
    <line x1="500" y1="312" x2="600" y2="200" stroke="#4ade80" stroke-width="3" stroke-dasharray="6 12" filter="url(#glow)">
      <animate attributeName="stroke-dashoffset" from="0" to="-54" dur="0.7s" repeatCount="indefinite"/>
    </line>
    <path d="M580 210 L600 150 L620 210" fill="none" stroke="#94a3b8" stroke-width="3"/>
    <line x1="576" y1="176" x2="624" y2="176" stroke="#94a3b8" stroke-width="2.5"/>
    <line x1="583" y1="192" x2="617" y2="192" stroke="#94a3b8" stroke-width="2.5"/>

    ${VIGNETTE}
    <text x="34" y="86" fill="#a5f3fc" font-size="14" font-weight="700" data-label="1">Reservoir</text>
    <text x="214" y="248" fill="#a5f3fc" font-size="12.5" data-label="1">Penstock</text>
    <text x="330" y="366" fill="#a5f3fc" font-size="12.5" data-label="1">Turbine</text>
    <text x="452" y="366" fill="#86efac" font-size="12.5" data-label="1">Generator</text>
    <text x="566" y="140" fill="#bbf7d0" font-size="12.5" data-label="1">To Grid</text>
  `);
}

function renderS1(el) {
  const bubbles = Array.from({ length: 16 }, (_, i) => {
    const x = 330 + i * 18;
    const y = 250 + (i % 4) * 9;
    const dur = (0.9 + (i % 4) * 0.25).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="2.4" fill="#e0f2fe" opacity="0.85"><animate attributeName="cy" values="${y};${y - 22};${y}" dur="${dur}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.9;0.4" dur="${dur}s" repeatCount="indefinite"/></circle>`;
  }).join('');
  el.innerHTML = svgWrap(`
    <rect width="640" height="400" fill="#07182f"/>
    <path d="M0 70 L0 400 L300 400 L300 168 Q 252 96 150 74 Z" fill="#122a49" opacity="0.6"/>

    <!-- Reservoir water -->
    <clipPath id="resClip1"><rect x="0" y="120" width="300" height="260"/></clipPath>
    <g clip-path="url(#resClip1)">
      <rect x="0" y="120" width="300" height="260" fill="url(#waterGrad)"/>
      <path d="M0 134 Q 60 120 120 134 T 300 134 L300 380 L0 380 Z" fill="#7dd3fc" opacity="0.3">
        <animate attributeName="d" dur="3s" repeatCount="indefinite"
          values="M0 134 Q 60 120 120 134 T 300 134 L300 380 L0 380 Z;
                  M0 132 Q 60 146 120 132 T 300 132 L300 380 L0 380 Z;
                  M0 134 Q 60 120 120 134 T 300 134 L300 380 L0 380 Z"/>
      </path>
    </g>

    <!-- Dam wall + moving gate -->
    <rect x="292" y="96" width="30" height="248" fill="url(#metalGrad)" stroke="#334155"/>
    <rect x="298" y="120" width="18" height="150" rx="3" fill="#cbd5e1" stroke="#94a3b8">
      <animate attributeName="y" values="120;80;120" dur="3.4s" repeatCount="indefinite"/>
      <animate attributeName="height" values="150;110;150" dur="3.4s" repeatCount="indefinite"/>
    </rect>
    <line x1="307" y1="72" x2="307" y2="120" stroke="#64748b" stroke-width="4">
      <animate attributeName="y2" values="120;80;120" dur="3.4s" repeatCount="indefinite"/>
    </line>

    <!-- Intake tunnel -->
    <rect x="300" y="238" width="340" height="92" fill="#0a1a30" stroke="#1e3a5f"/>
    <path d="M300 260 C 370 250 440 276 512 266 C 560 260 600 280 640 272 L640 322 L300 322 Z" fill="url(#waterFlow)" opacity="0.88">
      <animate attributeName="d" dur="1.1s" repeatCount="indefinite"
        values="M300 260 C 370 250 440 276 512 266 C 560 260 600 280 640 272 L640 322 L300 322 Z;
                M300 264 C 370 256 440 270 512 274 C 560 264 600 274 640 276 L640 322 L300 322 Z;
                M300 260 C 370 250 440 276 512 266 C 560 260 600 280 640 272 L640 322 L300 322 Z"/>
    </path>
    ${bubbles}

    ${VIGNETTE}
    <text x="40" y="108" fill="#a5f3fc" font-size="14" font-weight="700" data-label="1">Stored Head Water</text>
    <text x="300" y="66" fill="#f1f5f9" font-size="12.5" data-label="1">Intake Gate</text>
    <text x="486" y="316" fill="#a5f3fc" font-size="12.5" data-label="1">To Penstock →</text>
  `);
}

function renderS2(el) {
  // Particles accelerate down the sloped penstock: linear path from (70,96) -> (470,300).
  const drops = Array.from({ length: 22 }, (_, i) => {
    const t0 = i / 22;
    const dur = (1.5 + (i % 4) * 0.15).toFixed(2);
    const off = ((i % 3) - 1) * 10;
    const r = (2.4 + (i % 3) * 0.6).toFixed(1);
    // begin offset spreads particles along the pipe
    const begin = (-t0 * Number(dur)).toFixed(2);
    return `<circle r="${r}" fill="#bae6fd" opacity="0.9">
      <animateMotion path="M70 96 L470 300" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 1 1"/>
      <animate attributeName="opacity" values="0.4;1;0.5" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="translate" values="0 ${off};0 ${-off};0 ${off}" dur="0.6s" repeatCount="indefinite" additive="sum"/>
    </circle>`;
  }).join('');
  el.innerHTML = svgWrap(`
    <rect width="640" height="400" fill="#07152e"/>

    <!-- Penstock casing (sloped) -->
    <path d="M60 78 L484 296" fill="none" stroke="url(#metalGrad)" stroke-width="52" stroke-linecap="round"/>
    <path d="M60 78 L484 296" fill="none" stroke="#0f1e36" stroke-width="40" stroke-linecap="round"/>
    <path d="M60 78 L484 296" fill="none" stroke="url(#waterFlow)" stroke-width="30" stroke-linecap="round" opacity="0.35"/>
    ${drops}
    <!-- casing rib bands -->
    ${Array.from({ length: 5 }, (_, i) => {
      const t = 0.15 + i * 0.17;
      const x = 60 + (484 - 60) * t;
      const y = 78 + (296 - 78) * t;
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="27" fill="none" stroke="#64748b" stroke-width="2" opacity="0.5"/>`;
    }).join('')}

    <!-- Turbine entry nozzle -->
    <path d="M470 276 L520 300 L520 336 L470 320 Z" fill="#1e293b" stroke="#22d3ee" stroke-width="2"/>
    <circle cx="524" cy="318" r="8" fill="url(#glowAqua)"/>

    <!-- Pressure gauge -->
    <circle cx="556" cy="92" r="44" fill="#0f172a" stroke="#22d3ee" stroke-width="3"/>
    <circle cx="556" cy="92" r="44" fill="url(#glowAqua)" opacity="0.25"/>
    ${Array.from({ length: 7 }, (_, i) => {
      const a = (-120 + i * 40) * Math.PI / 180;
      const x1 = 556 + Math.cos(a) * 34, y1 = 92 + Math.sin(a) * 34;
      const x2 = 556 + Math.cos(a) * 40, y2 = 92 + Math.sin(a) * 40;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#67e8f9" stroke-width="2"/>`;
    }).join('')}
    <line x1="556" y1="92" x2="556" y2="58" stroke="#f87171" stroke-width="3.5" stroke-linecap="round" filter="url(#glow)">
      <animateTransform attributeName="transform" type="rotate" values="-70 556 92; 70 556 92; -70 556 92" dur="2.4s" repeatCount="indefinite"/>
    </line>
    <circle cx="556" cy="92" r="5" fill="#e2e8f0"/>
    <text x="556" y="126" fill="#67e8f9" font-size="11" font-weight="700" text-anchor="middle" data-label="1">HEAD PSI</text>

    ${VIGNETTE}
    <text x="150" y="196" fill="#a5f3fc" font-size="13" font-weight="700" transform="rotate(27 150 196)" data-label="1">Pressurized Penstock</text>
    <text x="470" y="356" fill="#a5f3fc" font-size="12" data-label="1">Turbine Entry</text>
  `);
}

function renderS3(el) {
  // Water jet particles striking the runner.
  const jet = Array.from({ length: 14 }, (_, i) => {
    const dur = (0.7 + (i % 3) * 0.1).toFixed(2);
    const begin = (-(i / 14) * Number(dur)).toFixed(2);
    const y = 200 + ((i % 5) - 2) * 6;
    return `<circle r="${(3 - (i % 2)).toFixed(1)}" fill="#bae6fd">
      <animate attributeName="cx" from="60" to="252" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="${y};${200};200" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.9;1;0.2" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    </circle>`;
  }).join('');
  el.innerHTML = svgWrap(`
    <rect width="640" height="400" fill="#061226"/>

    <!-- Feed pipe + jet nozzle -->
    <rect x="0" y="184" width="66" height="32" rx="6" fill="url(#metalGrad)"/>
    <path d="M66 184 L92 196 L92 204 L66 216 Z" fill="#1e293b" stroke="#22d3ee"/>
    ${jet}

    <!-- Runner glow + housing -->
    <circle cx="330" cy="200" r="108" fill="url(#glowAqua)" opacity="0.5"/>
    <circle cx="330" cy="200" r="92" fill="#0d1830" stroke="#1e3a5f" stroke-width="10" filter="url(#drop)"/>
    <circle cx="330" cy="200" r="80" fill="#111c33" stroke="#22d3ee" stroke-width="3" filter="url(#glow)"/>

    <!-- Spinning runner (correct pivot) -->
    ${spin(330, 200, 1, runnerBlades(72, 12, '#67e8f9', '#22d3ee') + '<circle r="16" fill="#e2e8f0"/><circle r="8" fill="#94a3b8"/>')}

    <!-- Drive shaft to generator with subtle vibration -->
    <rect x="422" y="192" width="150" height="16" rx="8" fill="url(#metalGrad)">
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.5;0 1.5;0 0" dur="0.4s" repeatCount="indefinite"/>
    </rect>
    <circle cx="560" cy="200" r="20" fill="#1e293b" stroke="#64748b" stroke-width="3"/>
    ${spin(560, 200, 1, '<line x1="0" y1="0" x2="0" y2="-16" stroke="#94a3b8" stroke-width="3"/><line x1="0" y1="0" x2="14" y2="8" stroke="#94a3b8" stroke-width="3"/>')}

    ${VIGNETTE}
    <text x="12" y="176" fill="#a5f3fc" font-size="12" data-label="1">Water Jet</text>
    <text x="288" y="316" fill="#a5f3fc" font-size="13" font-weight="700" data-label="1">Runner Blades</text>
    <text x="472" y="180" fill="#cbd5e1" font-size="12" data-label="1">Drive Shaft →</text>
  `);
}

function renderS4(el) {
  const cx = 210, cy = 200;
  // Stator coils arranged around the rotor.
  const coils = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30) * Math.PI / 180;
    const x = cx + Math.cos(a) * 108;
    const y = cy + Math.sin(a) * 108;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${i * 30})">
      <rect x="-9" y="-16" width="18" height="32" rx="6" fill="none" stroke="url(#copperGrad)" stroke-width="4"/>
      <rect x="-9" y="-16" width="18" height="32" rx="6" fill="none" stroke="#4ade80" stroke-width="2">
        <animate attributeName="stroke-opacity" values="0.15;1;0.15" dur="1.4s" begin="${(i * 0.1).toFixed(2)}s" repeatCount="indefinite"/>
      </rect>
    </g>`;
  }).join('');
  // AC output waveform (moving).
  const wave = Array.from({ length: 60 }, (_, i) => `${i ? 'L' : 'M'}${380 + i * 4} ${200 - Math.sin(i / 4) * 46}`).join(' ');
  el.innerHTML = svgWrap(`
    <rect width="640" height="400" fill="#07152c"/>

    <!-- Stator housing -->
    <circle cx="${cx}" cy="${cy}" r="140" fill="url(#glowGreen)" opacity="0.25"/>
    <circle cx="${cx}" cy="${cy}" r="128" fill="#0c1c30" stroke="#166534" stroke-width="3" filter="url(#drop)"/>
    ${coils}
    <circle cx="${cx}" cy="${cy}" r="86" fill="#0a1424" stroke="#22c55e" stroke-width="2"/>

    <!-- Rotating flux field lines -->
    ${spin(cx, cy, 1.4, Array.from({ length: 4 }, (_, i) => `<ellipse rx="78" ry="30" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 8" opacity="0.4" transform="rotate(${i * 45})"/>`).join(''))}

    <!-- Rotor: spinning bar magnet with N/S poles -->
    ${spin(cx, cy, 1.4, `
      <rect x="-24" y="-72" width="48" height="72" rx="10" fill="#ef4444" filter="url(#glow)"/>
      <rect x="-24" y="0" width="48" height="72" rx="10" fill="#3b82f6" filter="url(#glow)"/>
      <text x="0" y="-40" fill="#fff" font-size="24" font-weight="800" text-anchor="middle">N</text>
      <text x="0" y="52" fill="#fff" font-size="24" font-weight="800" text-anchor="middle">S</text>
      <circle r="12" fill="#e2e8f0"/>
    `)}

    <!-- Brushes / output tap -->
    <line x1="${cx + 86}" y1="${cy}" x2="368" y2="${cy}" stroke="#94a3b8" stroke-width="4"/>

    <!-- AC waveform panel -->
    <rect x="368" y="120" width="256" height="160" rx="12" fill="#08182e" stroke="#166534" stroke-width="1.5" filter="url(#drop)"/>
    <line x1="380" y1="200" x2="620" y2="200" stroke="#1e3a2f" stroke-width="1.5"/>
    <path d="${wave}" fill="none" stroke="#4ade80" stroke-width="3" stroke-dasharray="14 10" filter="url(#glow)">
      <animate attributeName="stroke-dashoffset" from="0" to="-72" dur="0.9s" repeatCount="indefinite"/>
    </path>
    <circle r="5" fill="#bbf7d0" filter="url(#glow)">
      <animateMotion path="${wave}" dur="1.6s" repeatCount="indefinite"/>
    </circle>

    ${VIGNETTE}
    <text x="${cx}" y="360" fill="#bbf7d0" font-size="13" font-weight="700" text-anchor="middle" data-label="1">Rotor + Stator</text>
    <text x="496" y="304" fill="#86efac" font-size="12.5" text-anchor="middle" data-label="1">AC Output</text>
  `);
}

function renderS5(el) {
  // Traveling energy pulses along the transmission wires.
  const wireY = [150, 178, 206];
  const pulses = wireY.map((y, i) => {
    const dur = (1.6 + i * 0.2).toFixed(2);
    return `<circle r="5.5" fill="#67e8f9" filter="url(#glow)">
      <animate attributeName="cx" from="250" to="600" dur="${dur}s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="${y};${y};${y}" dur="${dur}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.2;1;0.2" dur="${dur}s" repeatCount="indefinite"/>
    </circle>`;
  }).join('');
  const tower = (x) => `
    <path d="M${x - 34} 300 L${x} 128 L${x + 34} 300" fill="none" stroke="#cbd5e1" stroke-width="4"/>
    <path d="M${x - 22} 232 L${x + 22} 232" stroke="#cbd5e1" stroke-width="3"/>
    <path d="M${x - 28} 268 L${x + 28} 268" stroke="#cbd5e1" stroke-width="3"/>
    <path d="M${x - 12} 172 L${x + 12} 172" stroke="#cbd5e1" stroke-width="3"/>
    <circle cx="${x}" cy="150" r="3" fill="#94a3b8"/>`;
  const city = [
    { x: 556, y: 220, w: 26, h: 100 }, { x: 588, y: 190, w: 34, h: 130 },
    { x: 526, y: 246, w: 22, h: 74 }
  ].map((b, i) => {
    const windows = Array.from({ length: Math.floor(b.h / 20) }, (_, r) =>
      `<rect x="${b.x + 5}" y="${b.y + 8 + r * 18}" width="6" height="8" fill="#0ea5e9"><animate attributeName="opacity" values="0.3;1;0.3" dur="${(1 + (i + r) % 3 * 0.4).toFixed(1)}s" repeatCount="indefinite"/></rect>`
    ).join('');
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3" fill="#1e293b" stroke="#334155"/>${windows}`;
  }).join('');
  el.innerHTML = svgWrap(`
    <rect width="640" height="400" fill="#06132a"/>

    <!-- Step-up transformer -->
    <rect x="40" y="150" width="170" height="110" rx="14" fill="#12233c" stroke="#22d3ee" stroke-width="2.5" filter="url(#drop)"/>
    <g stroke="url(#copperGrad)" stroke-width="3" fill="none">
      <rect x="78" y="176" width="30" height="60" rx="4"/>
      <rect x="140" y="168" width="38" height="76" rx="4"/>
    </g>
    <circle cx="123" cy="206" r="10" fill="url(#glowAqua)"/>
    <!-- Incoming line -->
    <line x1="0" y1="206" x2="40" y2="206" stroke="#22c55e" stroke-width="4"/>
    <!-- Bushings up to lines -->
    <line x1="210" y1="178" x2="250" y2="178" stroke="#38bdf8" stroke-width="4"/>

    <!-- Transmission wires -->
    ${wireY.map((y) => `<line x1="250" y1="${y}" x2="600" y2="${y}" stroke="#1e3a5f" stroke-width="4"/>`).join('')}
    ${tower(340)} ${tower(460)}
    ${pulses}
    ${city}

    ${VIGNETTE}
    <text x="52" y="140" fill="#a5f3fc" font-size="12.5" font-weight="700" data-label="1">Step-Up Transformer</text>
    <text x="372" y="118" fill="#a5f3fc" font-size="12.5" data-label="1">Transmission Grid</text>
    <text x="548" y="340" fill="#a5f3fc" font-size="12.5" data-label="1">City Load</text>
  `);
}

function renderS6(el) {
  el.innerHTML = svgWrap(`
    <rect width="640" height="400" fill="#07142b"/>

    <!-- Gate flow meter -->
    <text x="60" y="120" fill="#a5f3fc" font-size="13" font-weight="700" data-label="1">Gate Flow</text>
    <rect x="58" y="134" width="220" height="26" rx="13" fill="#0c1c34" stroke="#22d3ee" stroke-width="1.5"/>
    <rect id="s6-flowbar" x="61" y="137" width="150" height="20" rx="10" fill="url(#waterFlow)" filter="url(#glow)"/>

    <!-- Flow arrow into turbine -->
    <path d="M278 147 L318 147" stroke="#38bdf8" stroke-width="4" stroke-dasharray="8 8">
      <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="0.6s" repeatCount="indefinite"/>
    </path>

    <!-- Turbine -->
    <circle cx="356" cy="200" r="80" fill="url(#glowAqua)" opacity="0.4"/>
    <circle cx="356" cy="200" r="66" fill="#101c33" stroke="#22d3ee" stroke-width="4" filter="url(#glow)"/>
    ${spin(356, 200, 1.3, runnerBlades(58, 8, '#67e8f9', '#22d3ee') + '<circle r="12" fill="#e2e8f0"/>', 's6-fan', 's6-spin')}
    <text x="356" y="308" fill="#a5f3fc" font-size="13" font-weight="700" text-anchor="middle" data-label="1">Turbine Speed</text>

    <!-- Shaft to output -->
    <rect x="422" y="194" width="40" height="12" rx="6" fill="url(#metalGrad)"/>

    <!-- MW output gauge -->
    <rect x="462" y="132" width="140" height="140" rx="16" fill="#12233c" stroke="#22c55e" stroke-width="2" filter="url(#drop)"/>
    <circle cx="532" cy="196" r="34" fill="url(#glowGreen)"/>
    <circle id="s6-led" cx="532" cy="196" r="18" fill="#22c55e" filter="url(#glow)">
      <animate attributeName="r" values="16;21;16" dur="0.7s" repeatCount="indefinite"/>
    </circle>
    <text x="532" y="254" fill="#86efac" font-size="13" font-weight="700" text-anchor="middle" data-label="1">MW Output</text>

    ${VIGNETTE}
    <text x="58" y="360" fill="#94a3b8" font-size="12" data-label="1">Move the Gate Opening slider — flow, RPM and power respond live.</text>
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
  if (audio.enabled) audio.chime(294 + curScene * 33);
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
  const count = reduceMotion ? 28 : 65;
  for (let i = 0; i < count; i++) {
    points.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2 + 0.5, vy: -(Math.random() * 0.35 + 0.08), vx: (Math.random() - 0.5) * 0.2, a: Math.random() * 0.35 + 0.05 });
  }
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,211,238,${p.a})`;
      ctx.fill();
      if (reduceMotion) continue;
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
      if (p.x < -5) p.x = canvas.width + 5;
      if (p.x > canvas.width + 5) p.x = -5;
    }
    if (!reduceMotion) requestAnimationFrame(draw);
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

  // Touch-swipe navigation on the scene area.
  const shell = $('app');
  let touchX = 0, touchY = 0;
  shell.addEventListener('touchstart', (e) => {
    touchX = e.changedTouches[0].clientX; touchY = e.changedTouches[0].clientY;
  }, { passive: true });
  shell.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && curScene < TOTAL - 1) goTo(curScene + 1);
      if (dx > 0 && curScene > 0) goTo(curScene - 1);
    }
  }, { passive: true });

  initBg();
  goTo(0);
});
