/* app.js — Truck Air Brake System Animated Explainer
 *
 * Scene flow:
 *  0 · System Overview (full truck diagram)
 *  1 · Step 1 – Driver presses brake pedal
 *  2 · Step 2 – Air pressure travels through brake lines
 *  3 · Step 3 – Brake chamber pushrod extends
 *  4 · Step 4 – Slack adjuster rotates S-cam
 *  5 · Step 5 – Brake shoes press against drum
 *  6 · Step 6 – Friction slows wheel rotation
 *  7 · Step 7 – Release & return springs reset
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════════════
   COLOUR PALETTE
══════════════════════════════════════════════════════════════════════════ */
const C = {
  truckBody : '#334155',
  truckCab  : '#1e3a5f',
  truckDark : '#1e293b',
  grayDk    : '#374151',
  gray      : '#4b5563',
  grayMid   : '#6b7280',
  grayLt    : '#9ca3af',
  airBlue   : '#3b82f6',
  airBlueL  : '#93c5fd',
  airRed    : '#ef4444',
  airRedL   : '#fca5a5',
  amber     : '#f59e0b',
  amberL    : '#fcd34d',
  orange    : '#f97316',
  shoe      : '#78350f',
  shoeHot   : '#dc2626',
  drum      : '#52525b',
  drumRing  : '#3f3f46',
  spring    : '#34d399',
  green     : '#22c55e',
  road      : '#0f172a',
  white     : '#ffffff',
  muted     : '#94a3b8',
  edge2     : 'rgba(148,163,184,0.3)',
};

/* ══════════════════════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════════════════════ */
let curScene = 0;
const TOTAL  = 8;
let tl  = null;   // active GSAP timeline
let spd = 1;      // animation speed multiplier

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════ */
function $(id) { return document.getElementById(id); }

function px(cx, r, deg) { return cx + r * Math.cos(deg * Math.PI / 180); }
function py(cy, r, deg) { return cy + r * Math.sin(deg * Math.PI / 180); }

/** SVG arc path string between two angles (degrees). */
function arc(cx, cy, r, a1, a2, sweep = 1) {
  const x1 = px(cx, r, a1), y1 = py(cy, r, a1);
  const x2 = px(cx, r, a2), y2 = py(cy, r, a2);
  const da  = ((a2 - a1) * sweep + 720) % 360;
  const lg  = da > 180 ? 1 : 0;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${lg},${sweep} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

/** Wheel (side view) SVG fragment. */
function wheel(cx, cy, r, id) {
  const spokes = [0,60,120,180,240,300].map(a =>
    `<line x1="${px(cx,r*.22,a).toFixed(1)}" y1="${py(cy,r*.22,a).toFixed(1)}"
           x2="${px(cx,r*.62,a).toFixed(1)}" y2="${py(cy,r*.62,a).toFixed(1)}"
           stroke="${C.grayLt}" stroke-width="2.5"/>`).join('');
  const bolts = [30,90,150,210,270,330].map(a =>
    `<circle cx="${px(cx,r*.5,a).toFixed(1)}" cy="${py(cy,r*.5,a).toFixed(1)}" r="3" fill="${C.grayLt}"/>`).join('');
  return `
  <g id="${id}" style="transform-origin:${cx}px ${cy}px">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.road}" stroke="${C.grayMid}" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${(r*.72).toFixed(1)}" fill="${C.gray}" stroke="${C.drum}" stroke-width="2"/>
    ${spokes}${bolts}
    <circle cx="${cx}" cy="${cy}" r="${(r*.22).toFixed(1)}" fill="${C.grayLt}"/>
  </g>`;
}

/** Common SVG wrapper with shared defs. */
function svgWrap(w, h, content) {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"
    style="width:100%;height:100%;max-height:360px" role="img" aria-hidden="true">
  <defs>
    <!-- Arrow markers -->
    <marker id="arr-a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="${C.amber}"/></marker>
    <marker id="arr-r" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="${C.airRed}"/></marker>
    <marker id="arr-b" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="${C.airBlue}"/></marker>
    <marker id="arr-g" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="${C.green}"/></marker>

    <!-- Linear gradients -->
    <linearGradient id="grad-steel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#6b7280"/>
      <stop offset="40%"  stop-color="#374151"/>
      <stop offset="100%" stop-color="#1f2937"/>
    </linearGradient>
    <linearGradient id="grad-steel-h" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#4b5563"/>
      <stop offset="50%"  stop-color="#6b7280"/>
      <stop offset="100%" stop-color="#374151"/>
    </linearGradient>
    <linearGradient id="grad-cab" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="grad-amber-v" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="${C.amberL}"/>
      <stop offset="100%" stop-color="${C.orange}"/>
    </linearGradient>
    <linearGradient id="grad-amber-h" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${C.amber}"/>
      <stop offset="100%" stop-color="${C.orange}"/>
    </linearGradient>
    <linearGradient id="grad-blue-h" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${C.airBlue}"/>
      <stop offset="100%" stop-color="${C.airBlueL}"/>
    </linearGradient>
    <linearGradient id="grad-red-h" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${C.airRed}"/>
      <stop offset="100%" stop-color="${C.airRedL}"/>
    </linearGradient>
    <linearGradient id="grad-road" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="grad-heat" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${C.amber}"/>
      <stop offset="50%"  stop-color="${C.orange}"/>
      <stop offset="100%" stop-color="${C.airRed}"/>
    </linearGradient>
    <linearGradient id="grad-spring" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${C.spring}"/>
      <stop offset="100%" stop-color="#34d39988"/>
    </linearGradient>
    <linearGradient id="grad-drum" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#52525b"/>
      <stop offset="50%"  stop-color="#3f3f46"/>
      <stop offset="100%" stop-color="#27272a"/>
    </linearGradient>
    <linearGradient id="grad-tire" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#0c0a09"/>
    </linearGradient>

    <!-- Radial gradients -->
    <radialGradient id="grad-spot-amber" cx="50%" cy="30%" r="60%">
      <stop offset="0%"   stop-color="${C.amberL}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${C.amber}"  stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="grad-spot-blue" cx="50%" cy="50%" r="60%">
      <stop offset="0%"   stop-color="${C.airBlueL}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${C.airBlue}"  stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="grad-heat-center" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${C.amberL}"  stop-opacity="0.9"/>
      <stop offset="40%"  stop-color="${C.orange}"  stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${C.airRed}"  stop-opacity="0"/>
    </radialGradient>

    <!-- Filters -->
    <filter id="glow-r" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-a" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-b" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
    </filter>
    <filter id="shadow-sm" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
    </filter>
    <filter id="blur-sm">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  </defs>
  ${content}
</svg>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 0 — SYSTEM OVERVIEW (full truck side view)
══════════════════════════════════════════════════════════════════════════ */
function renderS0(el) {
  const W = 580, H = 290;
  const groundY = 258, frameY = 200, fH = 22;
  const wR = 38, wCY = groundY - wR;
  const fwX = 142, rw1X = 452, rw2X = 520;

  el.innerHTML = svgWrap(W, H, `
  <!-- Sky gradient background -->
  <defs>
    <linearGradient id="s0-sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#0c1a36"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#s0-sky)"/>

  <!-- Road surface with lane marking -->
  <rect x="0" y="${groundY}" width="${W}" height="${H - groundY}" fill="url(#grad-road)"/>
  <line x1="0" y1="${groundY}" x2="${W}" y2="${groundY}" stroke="${C.grayMid}" stroke-width="1.5" opacity="0.5"/>
  <!-- Road centre dashes -->
  ${[0,60,120,180,240,300,360,420,480,540].map(x =>
    `<line x1="${x}" y1="${groundY + 8}" x2="${x+38}" y2="${groundY + 8}" stroke="rgba(251,191,36,0.25)" stroke-width="2"/>`).join('')}

  <!-- FRAME with gradient -->
  <rect id="s0-frame" x="110" y="${frameY}" width="432" height="${fH}" rx="4"
        fill="url(#grad-steel)" stroke="${C.grayMid}" stroke-width="1.5" filter="url(#shadow-sm)"/>

  <!-- CAB body with gradient -->
  <rect id="s0-cab" x="28" y="62" width="138" height="148" rx="12"
        fill="url(#grad-cab)" stroke="${C.grayLt}" stroke-width="2" filter="url(#shadow)"/>
  <!-- Windshield panel -->
  <path d="M163,62 L180,88 L180,172 L163,172 Z" fill="#0d2140" stroke="${C.grayMid}" stroke-width="1.5"/>
  <!-- Window -->
  <rect x="36" y="76" width="115" height="76" rx="8" fill="#0d2140" stroke="${C.grayMid}" stroke-width="1.5"/>
  <!-- Window reflection sheen -->
  <path d="M38,78 L70,78 L60,102 L38,102 Z" fill="rgba(255,255,255,0.04)" rx="4"/>
  <!-- Door line -->
  <line x1="36" y1="152" x2="162" y2="152" stroke="${C.grayMid}" stroke-width="1" opacity="0.5"/>
  <!-- Door handle -->
  <rect x="132" y="165" width="24" height="5" rx="2.5" fill="${C.grayLt}" opacity="0.8"/>
  <!-- Exhaust stack -->
  <rect x="152" y="20" width="11" height="55" rx="5.5" fill="url(#grad-steel-h)" stroke="${C.grayMid}" stroke-width="1"/>
  <ellipse id="s0-smoke" cx="157" cy="14" rx="8" ry="6" fill="${C.grayMid}" opacity="0.6"/>
  <!-- Headlight glow -->
  <ellipse cx="178" cy="176" rx="10" ry="13" fill="#fffde7" opacity="0.15" filter="url(#glow-a)"/>
  <ellipse cx="178" cy="176" rx="8" ry="11" fill="#fef9c3" stroke="${C.grayLt}" stroke-width="1"/>
  <!-- Bumper -->
  <rect x="167" y="197" width="26" height="13" rx="4" fill="url(#grad-steel)" stroke="${C.grayMid}" stroke-width="1"/>
  <!-- Mirror -->
  <rect x="168" y="85" width="12" height="8" rx="3" fill="${C.grayMid}" stroke="${C.grayLt}" stroke-width="1"/>

  <!-- PEDAL in cab -->
  <line id="s0-pedal-arm" x1="78" y1="158" x2="92" y2="198"
        stroke="${C.grayLt}" stroke-width="5" stroke-linecap="round"/>
  <rect id="s0-pedal" x="75" y="196" width="32" height="8" rx="4" fill="url(#grad-amber-h)"/>
  <ellipse id="s0-foot" cx="84" cy="193" rx="18" ry="10" fill="${C.orange}" opacity="0.4"/>

  <!-- FRONT AXLE -->
  <line x1="${fwX}" y1="${frameY + fH}" x2="${fwX}" y2="${wCY - wR}"
        stroke="url(#grad-steel-h)" stroke-width="6" stroke-linecap="round"/>

  <!-- FRONT BRAKE CHAMBER with gradient -->
  <rect id="s0-bcf" x="${fwX - 18}" y="${frameY - 25}" width="36" height="20" rx="5"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="1.5" filter="url(#shadow-sm)"/>
  <text x="${fwX}" y="${frameY - 11}" font-size="7.5" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">BCH</text>

  <!-- AIR COMPRESSOR with gradient -->
  <rect id="s0-comp" x="184" y="${frameY - 32}" width="54" height="26" rx="6"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="1.5" filter="url(#shadow-sm)"/>
  <text x="211" y="${frameY - 16}" font-size="7.5" fill="${C.airBlueL}" text-anchor="middle"
        font-weight="700" data-label="1">COMP.</text>
  <!-- Compressor detail lines -->
  <line x1="188" y1="${frameY - 22}" x2="234" y2="${frameY - 22}" stroke="${C.airBlue}" stroke-width="0.5" opacity="0.3"/>

  <!-- AIR TANK 1 (proper cylindrical shape) -->
  <rect id="s0-tk1" x="248" y="${frameY - 34}" width="62" height="28" rx="14"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="1.5" filter="url(#shadow-sm)"/>
  <ellipse cx="310" cy="${frameY - 20}" rx="10" ry="14" fill="${C.truckDark}" stroke="${C.airBlue}" stroke-width="1.5"/>
  <text x="272" y="${frameY - 17}" font-size="7.5" fill="${C.airBlueL}" text-anchor="middle"
        font-weight="700" data-label="1">AIR TANK</text>

  <!-- AIR TANK 2 -->
  <rect id="s0-tk2" x="322" y="${frameY - 34}" width="62" height="28" rx="14"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="1.5" filter="url(#shadow-sm)"/>
  <ellipse cx="384" cy="${frameY - 20}" rx="10" ry="14" fill="${C.truckDark}" stroke="${C.airBlue}" stroke-width="1.5"/>
  <text x="346" y="${frameY - 17}" font-size="7.5" fill="${C.airBlueL}" text-anchor="middle"
        font-weight="700" data-label="1">AIR TANK</text>

  <!-- COMP → TANK connection -->
  <line x1="238" y1="${frameY - 20}" x2="248" y2="${frameY - 20}"
        stroke="${C.airBlue}" stroke-width="3" stroke-linecap="round"/>
  <line x1="310" y1="${frameY - 20}" x2="322" y2="${frameY - 20}"
        stroke="${C.airBlue}" stroke-width="3" stroke-linecap="round"/>

  <!-- BRAKE LINES (animated dashes) -->
  <path id="s0-ln1"
        d="M384,${frameY - 20} C 425,${frameY - 20} 442,${frameY - 8} ${rw1X},${frameY - 8}"
        fill="none" stroke="${C.airBlue}" stroke-width="2.5" stroke-dasharray="6,4" opacity="0.7"/>
  <path id="s0-ln2"
        d="M384,${frameY - 20} C 465,${frameY - 20} 508,${frameY - 8} ${rw2X},${frameY - 8}"
        fill="none" stroke="${C.airBlue}" stroke-width="2.5" stroke-dasharray="6,4" opacity="0.7"/>
  <path id="s0-ln3"
        d="M248,${frameY - 20} C 202,${frameY - 20} 172,${frameY - 10} ${fwX},${frameY - 10}"
        fill="none" stroke="${C.airBlue}" stroke-width="2.5" stroke-dasharray="6,4" opacity="0.7"/>

  <!-- REAR BRAKE CHAMBERS -->
  <rect id="s0-bcr1" x="${rw1X - 20}" y="${frameY - 28}" width="40" height="22" rx="5"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="1.5" filter="url(#shadow-sm)"/>
  <text x="${rw1X}" y="${frameY - 13}" font-size="7" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">BCH</text>
  <rect id="s0-bcr2" x="${rw2X - 20}" y="${frameY - 28}" width="40" height="22" rx="5"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="1.5" filter="url(#shadow-sm)"/>
  <text x="${rw2X}" y="${frameY - 13}" font-size="7" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">BCH</text>

  <!-- REAR AXLES -->
  <line x1="${rw1X}" y1="${frameY + fH}" x2="${rw1X}" y2="${wCY - wR}"
        stroke="url(#grad-steel-h)" stroke-width="6" stroke-linecap="round"/>
  <line x1="${rw2X}" y1="${frameY + fH}" x2="${rw2X}" y2="${wCY - wR}"
        stroke="url(#grad-steel-h)" stroke-width="6" stroke-linecap="round"/>

  <!-- WHEELS -->
  ${wheel(fwX, wCY, wR, 's0-wf')}
  ${wheel(rw1X, wCY, wR, 's0-wr1')}
  ${wheel(rw2X, wCY, wR, 's0-wr2')}

  <!-- Ambient glow under truck -->
  <ellipse cx="330" cy="${groundY + 2}" rx="180" ry="8" fill="rgba(59,130,246,0.06)"/>

  <!-- LABELS with leader lines -->
  <line x1="80" y1="198" x2="48" y2="238" stroke="${C.amberL}" stroke-width="1" stroke-dasharray="3,2" data-label="1"/>
  <text x="46" y="248" font-size="8.5" fill="${C.amberL}" text-anchor="middle" data-label="1">BRAKE PEDAL</text>

  <text x="211" y="${frameY + 22}" font-size="8.5" fill="${C.airBlueL}" text-anchor="middle" data-label="1">COMPRESSOR</text>
  <text x="319" y="${frameY + 22}" font-size="8.5" fill="${C.airBlueL}" text-anchor="middle" data-label="1">AIR TANKS</text>

  <text x="${fwX}" y="${wCY + wR + 20}" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" data-label="1">BRAKE DRUM</text>
  <text x="${rw1X + 22}" y="${wCY + wR + 20}" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" data-label="1">DRUMS</text>

  <line x1="${rw2X + 20}" y1="${frameY - 18}" x2="${rw2X + 50}" y2="${frameY - 38}"
        stroke="${C.amber}" stroke-width="1" stroke-dasharray="3,2" data-label="1"/>
  <text x="${rw2X + 52}" y="${frameY - 44}" font-size="8.5" fill="${C.amberL}" data-label="1">BRAKE</text>
  <text x="${rw2X + 52}" y="${frameY - 32}" font-size="8.5" fill="${C.amberL}" data-label="1">CHAMBERS</text>
  `);
}

function animateS0() {
  killTl();
  const elems = ['#s0-cab','#s0-comp','#s0-tk1','#s0-tk2',
                 '#s0-ln1','#s0-ln2','#s0-ln3',
                 '#s0-bcr1','#s0-bcr2','#s0-bcf',
                 '#s0-wf','#s0-wr1','#s0-wr2','#s0-pedal'];
  tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  elems.forEach((sel, i) => {
    tl.fromTo(sel,
      { opacity: 0, scale: 0.85, transformOrigin: 'center' },
      { opacity: 1, scale: 1, duration: 0.35 / spd }, i * 0.075 / spd);
  });
  // Slowly spin wheels
  tl.to(['#s0-wf','#s0-wr1','#s0-wr2'], {
    rotation: 360, transformOrigin: 'center',
    duration: 4.5 / spd, ease: 'none', repeat: -1
  }, 1.2 / spd);
  // Smoke puffs
  tl.to('#s0-smoke', {
    attr: { ry: 9, rx: 12 }, opacity: 0.15, y: -6,
    duration: 0.9 / spd, ease: 'sine.inOut', yoyo: true, repeat: -1
  }, 0.6 / spd);
  // Animated brake-line dash-offset
  ['#s0-ln1','#s0-ln2','#s0-ln3'].forEach(id => {
    gsap.to(id, {
      strokeDashoffset: -50, duration: 1.2 / spd,
      ease: 'none', repeat: -1
    });
  });
  // Brake chamber glow pulse
  tl.to(['#s0-bcf','#s0-bcr1','#s0-bcr2'], {
    attr: { stroke: C.amberL }, duration: 0.8 / spd,
    ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.25 / spd
  }, 1.5 / spd);
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 1 — BRAKE PEDAL PRESS (cab interior close-up)
══════════════════════════════════════════════════════════════════════════ */
function renderS1(el) {
  el.innerHTML = svgWrap(420, 350, `
  <!-- Background gradient -->
  <rect x="0" y="0" width="420" height="350" fill="${C.truckDark}" rx="12"/>
  <rect x="0" y="0" width="420" height="90" fill="#0d1425" rx="0"/>

  <!-- Dashboard with gradient instruments -->
  <rect x="0" y="0" width="420" height="78" fill="url(#grad-cab)" rx="0"/>
  <!-- Dash surface -->
  <rect x="0" y="72" width="420" height="8" fill="#1e293b" rx="0"/>

  <!-- Dashboard gauges -->
  <circle cx="60"  cy="38" r="22" fill="rgba(0,0,0,0.5)" stroke="${C.grayMid}" stroke-width="1.5"/>
  <circle cx="60"  cy="38" r="16" fill="rgba(0,0,0,0.7)" stroke="${C.grayDk}" stroke-width="1"/>
  <line x1="60" y1="38" x2="60" y2="26" stroke="${C.green}" stroke-width="2" stroke-linecap="round"/>
  <text x="60" y="64" font-size="6.5" fill="${C.muted}" text-anchor="middle">RPM</text>

  <circle cx="108" cy="38" r="22" fill="rgba(0,0,0,0.5)" stroke="${C.grayMid}" stroke-width="1.5"/>
  <circle cx="108" cy="38" r="16" fill="rgba(0,0,0,0.7)" stroke="${C.grayDk}" stroke-width="1"/>
  <line x1="108" y1="38" x2="118" y2="30" stroke="${C.amber}" stroke-width="2" stroke-linecap="round"/>
  <text x="108" y="64" font-size="6.5" fill="${C.muted}" text-anchor="middle">SPEED</text>

  <!-- Air pressure gauge (prominent) -->
  <circle cx="360" cy="38" r="28" fill="rgba(59,130,246,0.1)" stroke="${C.airBlue}" stroke-width="1.5"/>
  <circle cx="360" cy="38" r="20" fill="rgba(0,0,0,0.6)" stroke="${C.grayDk}" stroke-width="1"/>
  <text x="360" y="35" font-size="8" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">110</text>
  <text x="360" y="46" font-size="5.5" fill="${C.muted}" text-anchor="middle">PSI</text>
  <text x="360" y="70" font-size="6.5" fill="${C.airBlueL}" text-anchor="middle">AIR PRESS.</text>

  <!-- Steering column (with wheel detail) -->
  <rect x="200" y="58" width="10" height="100" fill="${C.grayMid}" stroke="${C.grayDk}" stroke-width="1"/>
  <!-- Steering wheel rim -->
  <circle cx="205" cy="65" r="52" fill="none" stroke="${C.gray}" stroke-width="8"/>
  <!-- Steering wheel spokes -->
  <line x1="205" y1="65" x2="205" y2="25" stroke="${C.grayMid}" stroke-width="5" stroke-linecap="round"/>
  <line x1="205" y1="65" x2="168" y2="85" stroke="${C.grayMid}" stroke-width="5" stroke-linecap="round"/>
  <line x1="205" y1="65" x2="242" y2="85" stroke="${C.grayMid}" stroke-width="5" stroke-linecap="round"/>
  <!-- Hub -->
  <circle cx="205" cy="65" r="10" fill="${C.gray}" stroke="${C.grayLt}" stroke-width="1.5"/>

  <!-- Floor pedal area with mat texture -->
  <rect x="0" y="265" width="420" height="85" fill="#0f172a" rx="0"/>
  <rect x="0" y="265" width="420" height="2" fill="rgba(148,163,184,0.1)"/>

  <!-- BRAKE VALVE (firewall) with gradient -->
  <rect id="s1-valve-body" x="148" y="92" width="110" height="74" rx="10"
        fill="${C.grayDk}" stroke="${C.grayMid}" stroke-width="2" filter="url(#shadow-sm)"/>
  <!-- Valve inner detail -->
  <rect x="158" y="102" width="90" height="54" rx="6" fill="rgba(0,0,0,0.3)"/>
  <text x="203" y="126" font-size="10.5" fill="${C.grayLt}" text-anchor="middle" font-weight="700">FOOT VALVE</text>
  <text x="203" y="142" font-size="8.5" fill="${C.grayMid}" text-anchor="middle">(Treadle Valve)</text>
  <!-- Valve port (air out) -->
  <rect x="212" y="166" width="14" height="32" fill="${C.airBlue}" rx="3" id="s1-port"
        filter="url(#glow-b)"/>

  <!-- AIR ARROWS from valve downward (3 for drama) -->
  <line id="s1-arr"  x1="206" y1="198" x2="206" y2="255"
        stroke="${C.airBlue}" stroke-width="3.5" marker-end="url(#arr-b)" opacity="0"
        filter="url(#glow-b)"/>
  <line id="s1-arr2" x1="219" y1="198" x2="219" y2="255"
        stroke="${C.airBlueL}" stroke-width="2" marker-end="url(#arr-b)" opacity="0"/>

  <!-- PEDAL ARM with pivot detail -->
  <g id="s1-pedal-grp" style="transform-origin:90px 228px">
    <!-- Arm -->
    <rect x="84" y="228" width="10" height="36" rx="3"
          fill="url(#grad-steel)" stroke="${C.grayLt}" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Pivot -->
    <circle cx="89" cy="230" r="8" fill="${C.grayDk}" stroke="${C.grayLt}" stroke-width="2"/>
    <circle cx="89" cy="230" r="3" fill="${C.grayLt}"/>
    <!-- Pedal platform with grip pattern -->
    <rect x="78" y="258" width="68" height="14" rx="7" fill="url(#grad-amber-h)"
          stroke="${C.amberL}" stroke-width="1.5"/>
    <line x1="90"  y1="259" x2="90"  y2="271" stroke="${C.amberL}" stroke-width="1.5" opacity="0.6"/>
    <line x1="100" y1="259" x2="100" y2="271" stroke="${C.amberL}" stroke-width="1.5" opacity="0.6"/>
    <line x1="110" y1="259" x2="110" y2="271" stroke="${C.amberL}" stroke-width="1.5" opacity="0.6"/>
    <line x1="120" y1="259" x2="120" y2="271" stroke="${C.amberL}" stroke-width="1.5" opacity="0.6"/>
    <line x1="130" y1="259" x2="130" y2="271" stroke="${C.amberL}" stroke-width="1.5" opacity="0.6"/>
    <line x1="140" y1="259" x2="140" y2="271" stroke="${C.amberL}" stroke-width="1.5" opacity="0.6"/>
  </g>

  <!-- DRIVER'S FOOT -->
  <g id="s1-foot-grp" style="transform-origin:125px 255px">
    <!-- Leg (trouser) -->
    <rect x="86" y="190" width="40" height="72" rx="18"
          fill="#4c1d95" stroke="#3b0764" stroke-width="1.5" opacity="0.95"/>
    <!-- Boot sole -->
    <path d="M80,250 L80,272 Q80,283 96,283 L160,283 Q172,283 172,272 L172,266 Q172,260 160,260 L128,260 L128,250 Z"
          fill="#0c0a09" stroke="#1c1917" stroke-width="1.5"/>
    <!-- Boot toe cap detail -->
    <ellipse cx="150" cy="272" rx="20" ry="8" fill="rgba(255,255,255,0.04)"/>
  </g>

  <!-- LABELS -->
  <text x="205" y="24" font-size="12.5" fill="${C.amber}" text-anchor="middle"
        font-weight="800" data-label="1">Cab Interior — Step 1</text>

  <line x1="148" y1="128" x2="96" y2="128" stroke="${C.grayLt}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  <text x="94" y="124" font-size="8.5" fill="${C.grayLt}" text-anchor="end" data-label="1">FOOT VALVE</text>
  <text x="94" y="135" font-size="8.5" fill="${C.grayLt}" text-anchor="end" data-label="1">(closed)</text>

  <!-- Status badge -->
  <rect id="s1-status" x="256" y="158" width="86" height="24" rx="7"
        fill="rgba(239,68,68,0.12)" stroke="${C.airRed}" stroke-width="1.5"/>
  <text id="s1-status-txt" x="299" y="174" font-size="10.5" fill="${C.airRedL}"
        text-anchor="middle" font-weight="800">CLOSED</text>

  <!-- Pedal label -->
  <line x1="115" y1="262" x2="62" y2="320" stroke="${C.amberL}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  <text x="60" y="330" font-size="8.5" fill="${C.amberL}" text-anchor="middle" data-label="1">BRAKE PEDAL</text>
  `);
}

function animateS1() {
  killTl();
  tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9 / spd, defaults: { ease: 'power2.inOut' } });
  // Foot and pedal press down
  tl.to(['#s1-foot-grp','#s1-pedal-grp'], { y: 20, duration: 0.5 / spd })
    // Valve lights up
    .to('#s1-valve-body', { stroke: C.airBlue, fill: 'rgba(59,130,246,0.08)', duration: 0.25 / spd }, '-=0.1')
    .to('#s1-status', { stroke: C.airBlue, fill: 'rgba(59,130,246,0.12)', duration: 0.2 / spd }, '<')
    .to('#s1-status-txt', { attr: { fill: C.airBlueL }, duration: 0.1 / spd }, '<')
    .to('#s1-port', { fill: C.airRed, duration: 0.15 / spd }, '<')
    // Arrows appear with stagger
    .to('#s1-arr',  { opacity: 1, duration: 0.3 / spd })
    .to('#s1-arr2', { opacity: 0.6, duration: 0.25 / spd }, '<+=0.08')
    // Hold
    .to({}, { duration: 0.85 / spd })
    // Release
    .to(['#s1-foot-grp','#s1-pedal-grp'], { y: 0, duration: 0.55 / spd })
    .to('#s1-valve-body', { stroke: C.grayMid, fill: C.grayDk, duration: 0.25 / spd }, '<')
    .to('#s1-status', { stroke: C.airRed, fill: 'rgba(239,68,68,0.12)', duration: 0.2 / spd }, '<')
    .to('#s1-status-txt', { attr: { fill: C.airRedL }, duration: 0.1 / spd }, '<')
    .to(['#s1-arr','#s1-arr2'], { opacity: 0, duration: 0.25 / spd }, '<')
    .to('#s1-port', { fill: C.airBlue, duration: 0.15 / spd }, '<');

  tl.addLabel('press', 0.5 / spd);
  tl.call(() => { const e = $('s1-status-txt'); if (e) e.textContent = 'OPEN'; }, [], 'press');
  tl.call(() => { const e = $('s1-status-txt'); if (e) e.textContent = 'CLOSED'; }, [], (0.5+0.85+0.55) / spd + 0.3 / spd);
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 2 — AIR PRESSURE FLOW (schematic pipes)
══════════════════════════════════════════════════════════════════════════ */
function renderS2(el) {
  el.innerHTML = svgWrap(540, 320, `
  <!-- Background -->
  <rect width="540" height="320" fill="${C.truckDark}" rx="12"/>
  <!-- Subtle grid pattern -->
  ${Array.from({length:11},(_,i)=>`<line x1="${i*54}" y1="0" x2="${i*54}" y2="320" stroke="rgba(148,163,184,0.03)" stroke-width="1"/>`).join('')}
  ${Array.from({length:7},(_,i)=>`<line x1="0" y1="${i*54}" x2="540" y2="${i*54}" stroke="rgba(148,163,184,0.03)" stroke-width="1"/>`).join('')}

  <!-- COMPRESSOR box with gradient -->
  <rect id="s2-comp" x="18" y="128" width="78" height="56" rx="10"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2" filter="url(#shadow-sm)"/>
  <!-- Compressor fan detail -->
  <circle cx="57" cy="152" r="14" fill="rgba(0,0,0,0.3)" stroke="${C.airBlue}" stroke-width="1" opacity="0.5"/>
  <text x="57" y="158" font-size="8" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">AIR COMP.</text>
  <text x="57" y="174" font-size="7" fill="${C.grayLt}" text-anchor="middle">100–120 PSI</text>

  <!-- TANK 1 with cylindrical shape -->
  <rect id="s2-tk1" x="116" y="118" width="78" height="74" rx="16"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2" filter="url(#shadow-sm)"/>
  <ellipse cx="194" cy="155" rx="12" ry="37" fill="${C.truckDark}" stroke="${C.airBlue}" stroke-width="1.5" opacity="0.7"/>
  <text x="148" y="149" font-size="8.5" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">AIR TANK 1</text>
  <text x="148" y="164" font-size="7" fill="${C.grayLt}" text-anchor="middle">Primary</text>

  <!-- TANK 2 with cylindrical shape -->
  <rect id="s2-tk2" x="116" y="205" width="78" height="74" rx="16"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2" filter="url(#shadow-sm)"/>
  <ellipse cx="194" cy="242" rx="12" ry="37" fill="${C.truckDark}" stroke="${C.airBlue}" stroke-width="1.5" opacity="0.7"/>
  <text x="148" y="236" font-size="8.5" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">AIR TANK 2</text>
  <text x="148" y="251" font-size="7" fill="${C.grayLt}" text-anchor="middle">Secondary</text>

  <!-- BRAKE VALVE -->
  <rect id="s2-valve" x="228" y="132" width="74" height="48" rx="10"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2" filter="url(#shadow-sm)"/>
  <text x="265" y="153" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">FOOT</text>
  <text x="265" y="167" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">VALVE</text>

  <!-- BRAKE CHAMBERS -->
  <rect id="s2-bcFL" x="430" y="50" width="82" height="48" rx="10"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="2" filter="url(#shadow-sm)"/>
  <text x="471" y="71" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">FRONT</text>
  <text x="471" y="85" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">CHAMBER</text>

  <rect id="s2-bcRL" x="430" y="124" width="82" height="48" rx="10"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="2" filter="url(#shadow-sm)"/>
  <text x="471" y="145" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">REAR-L</text>
  <text x="471" y="159" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">CHAMBER</text>

  <rect id="s2-bcRR" x="430" y="198" width="82" height="48" rx="10"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="2" filter="url(#shadow-sm)"/>
  <text x="471" y="219" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">REAR-R</text>
  <text x="471" y="233" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">CHAMBER</text>

  <!-- PIPE ROUTES (rounded joints, wider) -->
  <line x1="96" y1="156" x2="116" y2="156" stroke="${C.airBlue}" stroke-width="6" stroke-linecap="round" opacity="0.25"/>
  <path d="M96,156 L108,156 L108,242 L116,242" fill="none" stroke="${C.airBlue}" stroke-width="6" stroke-linecap="round" opacity="0.25"/>
  <line x1="194" y1="156" x2="228" y2="156" stroke="${C.airBlue}" stroke-width="6" stroke-linecap="round" opacity="0.25"/>
  <path d="M302,156 L334,156 L334,74 L430,74" fill="none" stroke="${C.airBlue}" stroke-width="6" stroke-linejoin="round" opacity="0.25"/>
  <path d="M302,156 L334,156 L334,148 L430,148" fill="none" stroke="${C.airBlue}" stroke-width="6" stroke-linejoin="round" opacity="0.25"/>
  <path d="M302,156 L334,156 L334,222 L430,222" fill="none" stroke="${C.airBlue}" stroke-width="6" stroke-linejoin="round" opacity="0.25"/>
  <path d="M194,242 L216,242 L216,180 L265,180" fill="none" stroke="${C.airBlue}" stroke-width="5" stroke-dasharray="7,5" opacity="0.2"/>

  <!-- Animated particles: blue → blue → red → red → red -->
  <circle id="p1a" cx="96"  cy="156" r="5.5" fill="${C.airBlueL}" opacity="0" filter="url(#glow-b)"/>
  <circle id="p1b" cx="96"  cy="156" r="5.5" fill="${C.airBlueL}" opacity="0" filter="url(#glow-b)"/>
  <circle id="p2a" cx="194" cy="156" r="5.5" fill="${C.airBlueL}" opacity="0" filter="url(#glow-b)"/>
  <circle id="p2b" cx="194" cy="156" r="5.5" fill="${C.airBlueL}" opacity="0" filter="url(#glow-b)"/>
  <circle id="p3a" cx="302" cy="156" r="5.5" fill="${C.airRedL}"  opacity="0" filter="url(#glow-r)"/>
  <circle id="p3b" cx="302" cy="156" r="5.5" fill="${C.airRedL}"  opacity="0" filter="url(#glow-r)"/>
  <circle id="p4a" cx="302" cy="156" r="5.5" fill="${C.airRedL}"  opacity="0" filter="url(#glow-r)"/>
  <circle id="p4b" cx="302" cy="156" r="5.5" fill="${C.airRedL}"  opacity="0" filter="url(#glow-r)"/>
  <circle id="p5a" cx="302" cy="156" r="5.5" fill="${C.airRedL}"  opacity="0" filter="url(#glow-r)"/>
  <circle id="p5b" cx="302" cy="156" r="5.5" fill="${C.airRedL}"  opacity="0" filter="url(#glow-r)"/>

  <!-- Labels -->
  <text x="57" y="200" font-size="8" fill="${C.grayLt}" text-anchor="middle" data-label="1">ENGINE-DRIVEN</text>
  <text x="265" y="196" font-size="7.5" fill="${C.grayLt}" text-anchor="middle" data-label="1">PEDAL OPERATED</text>

  <!-- PSI display with glow -->
  <rect x="180" y="272" width="188" height="38" rx="10"
        fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.25)" stroke-width="1.5"/>
  <text x="274" y="289" font-size="9.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">Air Pressure</text>
  <text id="s2-psi" x="274" y="304" font-size="13.5" fill="${C.amber}" text-anchor="middle" font-weight="800">0 PSI</text>
  `);
}

function animateS2() {
  killTl();
  let psi = 0;
  // PSI counter animation
  const psiTick = setInterval(() => {
    if (!document.getElementById('s2-psi')) { clearInterval(psiTick); return; }
    psi = Math.min(psi + 4 * spd, 110);
    const el = $('s2-psi');
    if (el) el.textContent = Math.round(psi) + ' PSI';
    const fill = $('gauge-fill');
    const val  = $('gauge-val');
    if (fill) fill.style.width = (psi / 110 * 100) + '%';
    if (val)  val.textContent   = Math.round(psi) + ' PSI';
    if (psi >= 110) clearInterval(psiTick);
  }, 40 / spd);

  tl = gsap.timeline({ defaults: { ease: 'none' } });

  // Pipe colour cascade (comp glow → valve → chambers pressurised)
  tl.to('#s2-comp',  { stroke: C.amberL, filter: 'url(#glow-a)', duration: 0.35 / spd })
    .to('#s2-valve', { stroke: C.airRed, duration: 0.4 / spd }, 0.4 / spd)
    .to(['#s2-bcFL','#s2-bcRL','#s2-bcRR'],
        { stroke: C.airRed, fill: 'rgba(239,68,68,0.15)', duration: 0.5 / spd, stagger: 0.1/spd }, 0.8 / spd);

  // Particle routes (start → end coords for each pipe segment)
  const routes = [
    { sel: '#p1a', sx: 96, sy: 156, ex: 116, ey: 156, delay: 0 },
    { sel: '#p1b', sx: 96, sy: 156, ex: 116, ey: 156, delay: 0.38/spd },
    { sel: '#p2a', sx: 194, sy: 156, ex: 228, ey: 156, delay: 0.3/spd },
    { sel: '#p2b', sx: 194, sy: 156, ex: 228, ey: 156, delay: 0.68/spd },
    { sel: '#p3a', sx: 302, sy: 156, ex: 430, ey: 74,  delay: 0.7/spd },
    { sel: '#p3b', sx: 302, sy: 156, ex: 430, ey: 74,  delay: 1.0/spd },
    { sel: '#p4a', sx: 302, sy: 156, ex: 430, ey: 148, delay: 0.75/spd },
    { sel: '#p4b', sx: 302, sy: 156, ex: 430, ey: 148, delay: 1.05/spd },
    { sel: '#p5a', sx: 302, sy: 156, ex: 430, ey: 222, delay: 0.8/spd },
    { sel: '#p5b', sx: 302, sy: 156, ex: 430, ey: 222, delay: 1.1/spd },
  ];
  routes.forEach(r => {
    tl.fromTo(r.sel,
      { attr: { cx: r.sx, cy: r.sy }, opacity: 0 },
      { attr: { cx: r.ex, cy: r.ey }, opacity: 1,
        duration: 0.85/spd, ease: 'power1.in', repeat: -1, repeatDelay: 0.25/spd },
      r.delay
    );
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 3 — BRAKE CHAMBER PUSHROD (cross-section)
══════════════════════════════════════════════════════════════════════════ */
function renderS3(el) {
  el.innerHTML = svgWrap(500, 310, `
  <!-- Background -->
  <rect width="500" height="310" fill="${C.truckDark}" rx="12"/>
  <text x="250" y="30" font-size="13" fill="${C.amber}" text-anchor="middle"
        font-weight="800" data-label="1">Brake Chamber — Cross Section</text>

  <!-- CHAMBER BODY with gradient and depth -->
  <rect x="158" y="76" width="208" height="162" rx="14"
        fill="${C.grayDk}" stroke="${C.grayMid}" stroke-width="2.5" filter="url(#shadow)"/>
  <!-- Top highlight -->
  <rect x="162" y="78" width="200" height="4" rx="2" fill="rgba(255,255,255,0.05)"/>
  <!-- Chamber label -->
  <text x="262" y="106" font-size="10.5" fill="${C.grayLt}" text-anchor="middle"
        font-weight="700" data-label="1">BRAKE CHAMBER</text>

  <!-- HIGH PRESSURE side label -->
  <text x="208" y="68" font-size="8" fill="${C.airBlueL}" text-anchor="middle" data-label="1">HIGH P.</text>
  <!-- LOW PRESSURE side label -->
  <text x="326" y="68" font-size="8" fill="${C.grayMid}" text-anchor="middle" data-label="1">LOW P.</text>

  <!-- INLET PORT (air enters from left) -->
  <rect x="122" y="136" width="36" height="24" rx="5"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2" id="s3-port"/>
  <text x="108" y="126" font-size="8" fill="${C.airBlueL}" text-anchor="middle"
        data-label="1">AIR INLET</text>
  <line x1="120" y1="131" x2="140" y2="136" stroke="${C.airBlueL}" stroke-width="1" stroke-dasharray="2,2" data-label="1"/>

  <!-- RETURN SPRING — better coil path -->
  <path id="s3-spring"
        d="M308,148 L316,148 L320,140 L328,156 L336,140 L344,156 L352,140 L358,148 L364,148"
        fill="none" stroke="${C.spring}" stroke-width="3.5" stroke-linecap="round"
        filter="url(#glow-b)"/>

  <!-- DIAPHRAGM (vertical, rubber look) -->
  <line id="s3-diaphragm" x1="285" y1="84" x2="285" y2="230"
        stroke="${C.grayLt}" stroke-width="12" stroke-linecap="round" opacity="0.9"/>
  <!-- Diaphragm center mark -->
  <line id="s3-diaph-mark" x1="285" y1="152" x2="285" y2="162"
        stroke="${C.grayDk}" stroke-width="3"/>
  <text x="285" y="250" font-size="8.5" fill="${C.grayLt}" text-anchor="middle"
        data-label="1">DIAPHRAGM</text>

  <!-- AIR FILL region (left of diaphragm, gradual color) -->
  <rect id="s3-airfill" x="162" y="80" width="121" height="152" rx="12"
        fill="${C.airBlue}" opacity="0.10"/>

  <!-- PRESSURE ARROWS (5 for more drama) -->
  <line id="s3-parr1" x1="178" y1="133" x2="244" y2="133"
        stroke="${C.airRed}" stroke-width="3" marker-end="url(#arr-r)" opacity="0" filter="url(#glow-r)"/>
  <line id="s3-parr2" x1="178" y1="148" x2="244" y2="148"
        stroke="${C.airRed}" stroke-width="3" marker-end="url(#arr-r)" opacity="0" filter="url(#glow-r)"/>
  <line id="s3-parr3" x1="178" y1="163" x2="244" y2="163"
        stroke="${C.airRed}" stroke-width="3" marker-end="url(#arr-r)" opacity="0" filter="url(#glow-r)"/>
  <line id="s3-parr4" x1="178" y1="178" x2="244" y2="178"
        stroke="${C.airRed}" stroke-width="3" marker-end="url(#arr-r)" opacity="0" filter="url(#glow-r)"/>
  <line id="s3-parr5" x1="178" y1="193" x2="244" y2="193"
        stroke="${C.airRed}" stroke-width="2" marker-end="url(#arr-r)" opacity="0" filter="url(#glow-r)"/>

  <!-- PUSHROD with gradient -->
  <g id="s3-pushrod-grp">
    <rect id="s3-pushrod" x="285" y="143" width="116" height="28" rx="6"
          fill="url(#grad-amber-h)" stroke="${C.amberL}" stroke-width="1.5"/>
    <text x="342" y="161" font-size="8.5" fill="#1a0800" text-anchor="middle"
          font-weight="700" data-label="1">PUSHROD</text>
    <!-- Clevis fork -->
    <rect x="398" y="138" width="20" height="38" rx="5"
          fill="url(#grad-steel)" stroke="${C.grayLt}" stroke-width="1.5"/>
    <circle cx="408" cy="157" r="6" fill="${C.gray}" stroke="${C.grayLt}" stroke-width="1.5"/>
    <circle cx="408" cy="157" r="2.5" fill="${C.grayLt}"/>
  </g>

  <!-- SLACK ADJUSTER hint with gradient -->
  <rect x="414" y="118" width="64" height="82" rx="10"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="1.5" opacity="0.75"
        filter="url(#shadow-sm)"/>
  <text x="446" y="154" font-size="8.5" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">SLACK</text>
  <text x="446" y="167" font-size="8.5" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">ADJUSTER</text>

  <!-- DIRECTION ARROW -->
  <line id="s3-main-arr" x1="226" y1="270" x2="420" y2="270"
        stroke="${C.amber}" stroke-width="3" marker-end="url(#arr-a)" opacity="0"
        filter="url(#glow-a)"/>
  <text id="s3-arr-lbl" x="322" y="288" font-size="9" fill="${C.amberL}"
        text-anchor="middle" data-label="1" opacity="0">↑ Extension Direction ↑</text>

  <!-- Return spring label -->
  <text x="128" y="196" font-size="8" fill="${C.spring}" text-anchor="middle" data-label="1">RETURN</text>
  <text x="128" y="208" font-size="8" fill="${C.spring}" text-anchor="middle" data-label="1">SPRING</text>
  <line x1="158" y1="152" x2="142" y2="192" stroke="${C.spring}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  `);
}

function animateS3() {
  killTl();
  tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 / spd, defaults: { ease: 'power2.inOut' } });

  const parrs = ['#s3-parr1','#s3-parr2','#s3-parr3','#s3-parr4','#s3-parr5'];
  // Air enters: port turns red, fill glows
  tl.to('#s3-port',    { stroke: C.airRed, fill: 'rgba(239,68,68,0.2)', duration: 0.3 / spd })
    .to('#s3-airfill', { fill: C.airRed, opacity: 0.22, duration: 0.4 / spd }, 0)
    // Pressure arrows appear with stagger
    .to(parrs, { opacity: 1, duration: 0.18 / spd, stagger: 0.06 / spd })
    // Diaphragm and pushrod extend right
    .to(['#s3-diaphragm','#s3-diaph-mark'], { x: 32, duration: 0.5 / spd }, 0.4 / spd)
    .to('#s3-pushrod-grp', { x: 32, duration: 0.5 / spd }, 0.4 / spd)
    // Spring compresses
    .to('#s3-spring', { scaleX: 0.62, transformOrigin: 'right center', duration: 0.5 / spd }, 0.4 / spd)
    // Direction arrow
    .to(['#s3-main-arr','#s3-arr-lbl'], { opacity: 1, duration: 0.3 / spd }, 0.6 / spd)
    // Hold
    .to({}, { duration: 0.9 / spd })
    // Release — reverse all
    .to(['#s3-diaphragm','#s3-diaph-mark','#s3-pushrod-grp'], { x: 0, duration: 0.5 / spd })
    .to('#s3-spring', { scaleX: 1, transformOrigin: 'right center', duration: 0.5 / spd }, '<')
    .to('#s3-port', { stroke: C.airBlue, fill: C.grayDk, duration: 0.25 / spd }, '<')
    .to('#s3-airfill', { fill: C.airBlue, opacity: 0.10, duration: 0.3 / spd }, '<')
    .to(parrs, { opacity: 0, duration: 0.2 / spd }, '<')
    .to(['#s3-main-arr','#s3-arr-lbl'], { opacity: 0, duration: 0.2 / spd }, '<');
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 4 — SLACK ADJUSTER & S-CAM ROTATION
══════════════════════════════════════════════════════════════════════════ */
function renderS4(el) {
  el.innerHTML = svgWrap(500, 360, `
  <!-- Background -->
  <rect width="500" height="360" fill="${C.truckDark}" rx="12"/>
  <text x="250" y="28" font-size="13" fill="${C.amber}" text-anchor="middle"
        font-weight="800" data-label="1">Slack Adjuster &amp; S-Cam Linkage</text>

  <!-- BRAKE CHAMBER (left) with gradient -->
  <rect x="18" y="148" width="108" height="66" rx="10"
        fill="${C.grayDk}" stroke="${C.grayMid}" stroke-width="2" filter="url(#shadow-sm)"/>
  <!-- Chamber detail lines -->
  <line x1="22" y1="170" x2="122" y2="170" stroke="rgba(148,163,184,0.1)" stroke-width="1"/>
  <text x="72" y="175" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" font-weight="700">BRAKE</text>
  <text x="72" y="188" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" font-weight="700">CHAMBER</text>

  <!-- PUSHROD with gradient -->
  <g id="s4-pushrod-grp">
    <rect id="s4-pushrod" x="120" y="168" width="96" height="22" rx="6"
          fill="url(#grad-amber-h)" stroke="${C.amberL}" stroke-width="1.5"/>
    <text x="168" y="183" font-size="8" fill="#1a0800" text-anchor="middle"
          font-weight="700" data-label="1">PUSHROD</text>
    <!-- Clevis with detail -->
    <rect x="212" y="162" width="16" height="34" rx="5"
          fill="url(#grad-steel)" stroke="${C.grayLt}" stroke-width="1.5"/>
    <circle cx="220" cy="179" r="5" fill="${C.gray}" stroke="${C.grayLt}" stroke-width="1.5"/>
    <circle cx="220" cy="179" r="2" fill="${C.grayLt}"/>
  </g>

  <!-- SLACK ADJUSTER ARM with gradient -->
  <g id="s4-slack-grp" style="transform-origin:270px 240px">
    <!-- Arm body -->
    <rect x="257" y="172" width="26" height="136" rx="9"
          fill="url(#grad-steel)" stroke="${C.grayLt}" stroke-width="2.5" filter="url(#shadow-sm)"/>
    <!-- Top highlight -->
    <rect x="259" y="174" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.06)"/>
    <!-- Pin at top -->
    <circle cx="270" cy="178" r="9" fill="${C.grayDk}" stroke="${C.grayLt}" stroke-width="2"/>
    <circle cx="270" cy="178" r="4" fill="${C.grayLt}"/>
    <!-- Hub (S-cam shaft) -->
    <circle cx="270" cy="240" r="16" fill="url(#grad-drum)" stroke="${C.grayLt}" stroke-width="2"/>
    <circle cx="270" cy="240" r="7" fill="${C.grayLt}"/>
    <circle cx="270" cy="240" r="3" fill="${C.grayDk}"/>
  </g>

  <!-- CAM SHAFT with gradient -->
  <rect x="254" y="233" width="174" height="14" rx="7"
        fill="url(#grad-steel-h)" stroke="${C.grayLt}" stroke-width="1.5"/>

  <!-- S-CAM with better shape -->
  <g id="s4-cam-grp" style="transform-origin:390px 240px">
    <!-- Two cam lobes -->
    <ellipse cx="390" cy="222" rx="28" ry="15" fill="url(#grad-steel)" opacity="0.95"/>
    <ellipse cx="390" cy="258" rx="28" ry="15" fill="url(#grad-steel)" opacity="0.95"/>
    <rect x="383" y="222" width="14" height="36" fill="url(#grad-drum)"/>
    <!-- Shaft centre -->
    <circle cx="390" cy="240" r="9" fill="url(#grad-drum)" stroke="${C.grayLt}" stroke-width="2"/>
    <circle cx="390" cy="240" r="3.5" fill="${C.grayLt}"/>
    <!-- Rotation indicator arc -->
    <path id="s4-rot-arc"
          d="${arc(390,240,36,200,340)}"
          fill="none" stroke="${C.amber}" stroke-width="2.5"
          stroke-dasharray="6,4" opacity="0" filter="url(#glow-a)"/>
    <!-- Dot on arc -->
    <circle id="s4-rot-dot" cx="${px(390,36,340).toFixed(1)}" cy="${py(240,36,340).toFixed(1)}"
            r="6" fill="${C.amber}" opacity="0" filter="url(#glow-a)"/>
  </g>

  <!-- DRUM HINT (partial arc) -->
  <path d="${arc(442,240,78,138,222,1)}"
        fill="none" stroke="url(#grad-drum)" stroke-width="24" opacity="0.55"/>
  <text x="495" y="244" font-size="8" fill="${C.grayLt}" text-anchor="end"
        data-label="1">DRUM</text>

  <!-- SHOE HINTS with glow capability -->
  <path id="s4-shoe-top"
        d="${arc(442,240,54,146,212,1)}"
        fill="none" stroke="${C.shoe}" stroke-width="15" stroke-linecap="round" opacity="0.85"/>
  <path id="s4-shoe-bot"
        d="${arc(442,240,54,148,214,0)}"
        fill="none" stroke="${C.shoe}" stroke-width="15" stroke-linecap="round" opacity="0.85"/>

  <!-- PUSHROD DIRECTION ARROW -->
  <line id="s4-arr" x1="124" y1="202" x2="210" y2="202"
        stroke="${C.amber}" stroke-width="3" marker-end="url(#arr-a)" opacity="0"
        filter="url(#glow-a)"/>

  <!-- Labels -->
  <text x="270" y="326" font-size="8.5" fill="${C.grayLt}" text-anchor="middle"
        data-label="1">SLACK ADJUSTER</text>
  <text x="390" y="326" font-size="8.5" fill="${C.grayLt}" text-anchor="middle"
        data-label="1">S-CAM</text>
  <line x1="270" y1="306" x2="270" y2="319" stroke="${C.grayLt}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  <line x1="390" y1="298" x2="390" y2="319" stroke="${C.grayLt}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  `);
}

function animateS4() {
  killTl();
  tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 / spd, defaults: { ease: 'power2.inOut' } });

  // Pushrod extends, slack adjuster rotates, S-cam rotates
  tl.to('#s4-pushrod-grp', { x: 28, duration: 0.6 / spd })
    .to('#s4-arr', { opacity: 1, duration: 0.2 / spd }, 0)
    // Slack adjuster rotates (pushrod movement rotates it)
    .to('#s4-slack-grp', { rotation: -22, duration: 0.6 / spd, ease: 'power2.out' }, 0.2 / spd)
    // S-cam rotates
    .to('#s4-cam-grp', { rotation: 35, duration: 0.55 / spd, ease: 'power2.out' }, 0.35 / spd)
    // Show rotation indicator
    .to(['#s4-rot-arc','#s4-rot-dot'], { opacity: 1, duration: 0.3 / spd }, 0.5 / spd)
    // Shoes spread slightly (hint)
    .to('#s4-shoe-top', { attr: { stroke: C.shoeHot }, duration: 0.3 / spd }, 0.7 / spd)
    .to('#s4-shoe-bot', { attr: { stroke: C.shoeHot }, duration: 0.3 / spd }, 0.7 / spd)
    // Hold
    .to({}, { duration: 0.9 / spd })
    // Release — reverse
    .to(['#s4-pushrod-grp'], { x: 0, duration: 0.5 / spd })
    .to('#s4-slack-grp', { rotation: 0, duration: 0.5 / spd }, '<')
    .to('#s4-cam-grp', { rotation: 0, duration: 0.5 / spd }, '<')
    .to(['#s4-rot-arc','#s4-rot-dot'], { opacity: 0, duration: 0.2 / spd }, '<')
    .to(['#s4-shoe-top','#s4-shoe-bot'], { attr: { stroke: C.shoe }, duration: 0.3 / spd }, '<')
    .to('#s4-arr', { opacity: 0, duration: 0.2 / spd }, '<');
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 5 — BRAKE SHOES PRESS AGAINST DRUM (cross-section)
══════════════════════════════════════════════════════════════════════════ */
function brakeAssemblySVG(drumCx, drumCy, drumR) {
  const innerR = drumR - 16;  // contact surface
  const shoeR  = drumR - 44;  // resting position (shoe centerline)
  const topShoe  = arc(drumCx, drumCy, shoeR, 210, 330, 1);
  const botShoe  = arc(drumCx, drumCy, shoeR, 30, 150, 1);

  return `
  <!-- DRUM outer (gradient steel ring) -->
  <circle cx="${drumCx}" cy="${drumCy}" r="${drumR}"
          fill="url(#grad-drum)" stroke="${C.grayMid}" stroke-width="2.5"
          filter="url(#shadow-sm)"/>
  <!-- DRUM inner contact surface -->
  <circle cx="${drumCx}" cy="${drumCy}" r="${innerR}"
          fill="${C.truckDark}" stroke="${C.drum}" stroke-width="2"/>

  <!-- BRAKE SHOES (gradient-tinted arcs) -->
  <path id="ba-shoe-top" d="${topShoe}"
        fill="none" stroke="${C.shoe}" stroke-width="22" stroke-linecap="round"/>
  <path id="ba-shoe-bot" d="${botShoe}"
        fill="none" stroke="${C.shoe}" stroke-width="22" stroke-linecap="round"/>

  <!-- RETURN SPRINGS (dashed lines with glow hint) -->
  <line id="ba-spring-l"
        x1="${px(drumCx, shoeR, 210).toFixed(1)}" y1="${py(drumCy, shoeR, 210).toFixed(1)}"
        x2="${px(drumCx, shoeR, 150).toFixed(1)}" y2="${py(drumCy, shoeR, 150).toFixed(1)}"
        stroke="${C.spring}" stroke-width="4" stroke-dasharray="5,3"/>
  <line id="ba-spring-r"
        x1="${px(drumCx, shoeR, 330).toFixed(1)}" y1="${py(drumCy, shoeR, 330).toFixed(1)}"
        x2="${px(drumCx, shoeR,  30).toFixed(1)}" y2="${py(drumCy, shoeR,  30).toFixed(1)}"
        stroke="${C.spring}" stroke-width="4" stroke-dasharray="5,3"/>

  <!-- S-CAM (gradient lobes + centre) -->
  <g id="ba-cam" style="transform-origin:${drumCx}px ${drumCy}px">
    <ellipse cx="${drumCx - 4}" cy="${drumCy - 12}" rx="18" ry="10" fill="url(#grad-drum)" opacity="0.95"/>
    <ellipse cx="${drumCx + 4}" cy="${drumCy + 12}" rx="18" ry="10" fill="url(#grad-drum)" opacity="0.95"/>
    <rect x="${drumCx - 6}" y="${drumCy - 10}" width="12" height="20" fill="${C.truckDark}" opacity="0.7"/>
    <circle cx="${drumCx}" cy="${drumCy}" r="10" fill="${C.drum}" stroke="${C.grayLt}" stroke-width="1.5"/>
    <circle cx="${drumCx}" cy="${drumCy}" r="4" fill="${C.grayLt}"/>
  </g>

  <!-- CONTACT GLOW (hidden by default, lights up on brake application) -->
  <path id="ba-glow-top" d="${arc(drumCx, drumCy, innerR - 4, 210, 330, 1)}"
        fill="none" stroke="${C.orange}" stroke-width="8" stroke-linecap="round"
        opacity="0" filter="url(#glow-r)"/>
  <path id="ba-glow-bot" d="${arc(drumCx, drumCy, innerR - 4, 30, 150, 1)}"
        fill="none" stroke="${C.orange}" stroke-width="8" stroke-linecap="round"
        opacity="0" filter="url(#glow-r)"/>
  `;
}

function renderS5(el) {
  const cx = 220, cy = 190, r = 140;
  el.innerHTML = svgWrap(500, 370, `
  <!-- Background -->
  <rect width="500" height="370" fill="${C.truckDark}" rx="12"/>
  <text x="250" y="28" font-size="13" fill="${C.amber}" text-anchor="middle"
        font-weight="800" data-label="1">Drum Brake — Cross Section</text>

  ${brakeAssemblySVG(cx, cy, r)}

  <!-- S-CAM SHAFT going right to slack adjuster hint -->
  <line x1="${cx}" y1="${cy}" x2="390" y2="${cy}"
        stroke="${C.grayMid}" stroke-width="8" stroke-linecap="round"/>
  <!-- Slack adjuster hint -->
  <rect x="382" y="${cy - 35}" width="20" height="70" rx="6"
        fill="${C.truckBody}" stroke="${C.grayLt}" stroke-width="2" id="s5-slack"/>
  <circle cx="392" cy="${cy}" r="10" fill="${C.drum}" stroke="${C.grayLt}" stroke-width="2"/>
  <!-- Pushrod hint -->
  <rect x="395" y="${cy - 8}" width="75" height="16" rx="6"
        fill="${C.amber}" stroke="${C.amberL}" stroke-width="1.5" id="s5-pushrod"/>

  <!-- LABELS -->
  <text x="${cx}" y="${cy + r + 24}" font-size="9" fill="${C.grayMid}"
        text-anchor="middle" data-label="1">BRAKE DRUM</text>
  <text x="${cx - r - 8}" y="${cy + 4}" font-size="9" fill="${C.shoe}"
        text-anchor="end" data-label="1">SHOE</text>
  <line x1="${cx - r + 8}" y1="${cy}" x2="${cx - r - 20}" y2="${cy}"
        stroke="${C.shoe}" stroke-width="1" stroke-dasharray="3,2" data-label="1"/>
  <text x="${cx}" y="${cy - r - 8}" font-size="9" fill="${C.shoe}"
        text-anchor="middle" data-label="1">SHOE</text>
  <text x="${cx + 14}" y="${cy + 6}" font-size="8" fill="${C.grayLt}"
        data-label="1">S-CAM</text>
  <text x="${cx + 14}" y="${cy + 17}" font-size="8" fill="${C.grayLt}"
        data-label="1">SHAFT →</text>
  <text x="435" y="${cy - 44}" font-size="8.5" fill="${C.amber}"
        data-label="1">SLACK ADJ.</text>
  <text x="455" y="${cy + 36}" font-size="8.5" fill="${C.amber}"
        data-label="1">PUSHROD</text>
  <text x="${cx + 50}" y="${cy - 30}" font-size="8.5" fill="${C.spring}"
        data-label="1">RETURN</text>
  <text x="${cx + 50}" y="${cy - 18}" font-size="8.5" fill="${C.spring}"
        data-label="1">SPRINGS</text>
  `);
}

function animateS5() {
  killTl();
  tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 / spd, defaults: { ease: 'power2.inOut' } });

  // Pushrod extends → slack adjuster moves → cam rotates → shoes spread
  tl.to('#s5-pushrod', { x: -20, duration: 0.5 / spd })
    .to('#s5-slack', { rotation: -20, transformOrigin: 'center bottom', duration: 0.5 / spd }, 0.1 / spd)
    .to('#ba-cam', { rotation: 35, duration: 0.45 / spd, ease: 'power2.out' }, 0.3 / spd)
    // Shoes spread outward (scale up from center)
    .to('#ba-shoe-top', {
      attr: { stroke: C.shoeHot, 'd': arc(220, 190, 126, 210, 330, 1) },
      duration: 0.45 / spd, ease: 'power2.out'
    }, 0.4 / spd)
    .to('#ba-shoe-bot', {
      attr: { stroke: C.shoeHot, 'd': arc(220, 190, 126, 30, 150, 1) },
      duration: 0.45 / spd, ease: 'power2.out'
    }, 0.4 / spd)
    // Contact glow appears
    .to(['#ba-glow-top','#ba-glow-bot'], { opacity: 0.9, duration: 0.3 / spd }, 0.65 / spd)
    // Springs stretch
    .to('#ba-spring-l', { attr: { stroke: C.spring, opacity: 1 }, duration: 0.2 / spd }, 0.5 / spd)
    .to('#ba-spring-r', { attr: { stroke: C.spring, opacity: 1 }, duration: 0.2 / spd }, 0.5 / spd)
    // Hold
    .to({}, { duration: 0.8 / spd })
    // Release
    .to(['#ba-shoe-top'], {
      attr: { stroke: C.shoe, 'd': arc(220, 190, 96, 210, 330, 1) },
      duration: 0.4 / spd
    })
    .to(['#ba-shoe-bot'], {
      attr: { stroke: C.shoe, 'd': arc(220, 190, 96, 30, 150, 1) },
      duration: 0.4 / spd
    }, '<')
    .to(['#ba-glow-top','#ba-glow-bot'], { opacity: 0, duration: 0.25 / spd }, '<')
    .to('#ba-cam', { rotation: 0, duration: 0.4 / spd }, '<')
    .to('#s5-pushrod', { x: 0, duration: 0.4 / spd }, '<')
    .to('#s5-slack', { rotation: 0, transformOrigin: 'center bottom', duration: 0.4 / spd }, '<');
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 6 — FRICTION SLOWS WHEEL
══════════════════════════════════════════════════════════════════════════ */
function renderS6(el) {
  const cx = 190, cy = 195, r = 136;
  const innerR = r - 16;
  const hotR   = innerR - 4;

  el.innerHTML = svgWrap(500, 370, `
  <!-- Background -->
  <rect width="500" height="370" fill="${C.truckDark}" rx="12"/>
  <text x="250" y="28" font-size="13" fill="${C.amber}" text-anchor="middle"
        font-weight="800" data-label="1">Friction Slows the Wheel</text>

  <!-- Ambient heat glow behind wheel -->
  <circle cx="${cx}" cy="${cy}" r="${r + 45}"
          fill="url(#grad-spot-amber)" opacity="0" id="s6-ambient"/>

  <!-- SPINNING DRUM GROUP -->
  <g id="s6-drum-outer" style="transform-origin:${cx}px ${cy}px">
    <!-- Tire ring (black rubber) -->
    <circle cx="${cx}" cy="${cy}" r="${r + 30}" fill="url(#grad-tire)" stroke="${C.gray}" stroke-width="3"/>
    <!-- Tire tread marks -->
    ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
      const ox = px(cx, r + 28, a), oy = py(cy, r + 28, a);
      const ix = px(cx, r + 14, a), iy = py(cy, r + 14, a);
      return `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ix.toFixed(1)}" y2="${iy.toFixed(1)}" stroke="${C.grayDk}" stroke-width="6" stroke-linecap="round"/>`;
    }).join('')}
    <!-- Drum disc (steel) -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#grad-drum)" stroke="${C.grayMid}" stroke-width="2.5"/>
    <!-- 8 spokes for clear rotation visualization -->
    ${[0,45,90,135,180,225,270,315].map(a =>
      `<line x1="${px(cx,20,a).toFixed(1)}" y1="${py(cy,20,a).toFixed(1)}"
             x2="${px(cx,r-18,a).toFixed(1)}" y2="${py(cy,r-18,a).toFixed(1)}"
             stroke="${C.grayMid}" stroke-width="4" stroke-linecap="round"/>`).join('')}
    <!-- Hub bolts -->
    ${[0,60,120,180,240,300].map(a =>
      `<circle cx="${px(cx,r*.54,a).toFixed(1)}" cy="${py(cy,r*.54,a).toFixed(1)}"
               r="5.5" fill="${C.grayLt}" stroke="${C.grayDk}" stroke-width="1"/>`).join('')}
    <!-- Centre hub -->
    <circle cx="${cx}" cy="${cy}" r="20" fill="${C.grayLt}" stroke="${C.grayMid}" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="10" fill="${C.gray}"/>
  </g>

  <!-- STATIC: inner surface + shoes + cam -->
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${C.truckDark}" stroke="${C.drum}" stroke-width="2.5"/>

  <!-- BRAKE SHOES (hot, pressed) -->
  <path id="s6-shoe-top" d="${arc(cx, cy, innerR - 8, 210, 330, 1)}"
        fill="none" stroke="${C.shoeHot}" stroke-width="20" stroke-linecap="round"/>
  <path id="s6-shoe-bot" d="${arc(cx, cy, innerR - 8, 30, 150, 1)}"
        fill="none" stroke="${C.shoeHot}" stroke-width="20" stroke-linecap="round"/>

  <!-- HEAT GLOW at contact zones -->
  <path id="s6-heat-top" d="${arc(cx, cy, hotR, 215, 325, 1)}"
        fill="none" stroke="${C.orange}" stroke-width="10" stroke-linecap="round"
        filter="url(#glow-r)" opacity="0.75"/>
  <path id="s6-heat-bot" d="${arc(cx, cy, hotR, 35, 145, 1)}"
        fill="none" stroke="${C.orange}" stroke-width="10" stroke-linecap="round"
        filter="url(#glow-r)" opacity="0.75"/>

  <!-- S-CAM centre -->
  <circle cx="${cx}" cy="${cy}" r="24" fill="url(#grad-drum)" stroke="${C.grayLt}" stroke-width="2"/>
  <text x="${cx}" y="${cy + 4}" font-size="7.5" fill="${C.grayLt}" text-anchor="middle"
        font-weight="700">S-CAM</text>

  <!-- HEAT SPARKS (more of them for drama) -->
  <circle id="s6-sp1" cx="${px(cx,innerR+6,270).toFixed(1)}" cy="${py(cy,innerR+6,270).toFixed(1)}"
          r="5" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <circle id="s6-sp2" cx="${px(cx,innerR+8,280).toFixed(1)}" cy="${py(cy,innerR+8,280).toFixed(1)}"
          r="3.5" fill="${C.orange}" opacity="0" filter="url(#glow-r)"/>
  <circle id="s6-sp3" cx="${px(cx,innerR+6,90).toFixed(1)}"  cy="${py(cy,innerR+6,90).toFixed(1)}"
          r="5" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <circle id="s6-sp4" cx="${px(cx,innerR+8,100).toFixed(1)}" cy="${py(cy,innerR+8,100).toFixed(1)}"
          r="3.5" fill="${C.orange}" opacity="0" filter="url(#glow-r)"/>
  <circle id="s6-sp5" cx="${px(cx,innerR+6,260).toFixed(1)}" cy="${py(cy,innerR+6,260).toFixed(1)}"
          r="4" fill="${C.amberL}" opacity="0" filter="url(#glow-a)"/>
  <circle id="s6-sp6" cx="${px(cx,innerR+6,100).toFixed(1)}" cy="${py(cy,innerR+6,100).toFixed(1)}"
          r="4" fill="${C.amberL}" opacity="0" filter="url(#glow-a)"/>

  <!-- SPEED INDICATOR (glassmorphism style) -->
  <rect x="362" y="52" width="122" height="84" rx="12"
        fill="rgba(6,12,30,0.85)" stroke="rgba(245,158,11,0.25)" stroke-width="1.5"/>
  <rect x="362" y="52" width="122" height="2" rx="1" fill="rgba(245,158,11,0.15)"/>
  <text x="423" y="77" font-size="8.5" fill="${C.muted}" text-anchor="middle"
        font-weight="700" data-label="1">WHEEL SPEED</text>
  <text id="s6-speed" x="423" y="113" font-size="26" fill="${C.amberL}"
        text-anchor="middle" font-weight="800">100%</text>
  <text x="423" y="128" font-size="8.5" fill="${C.grayLt}" text-anchor="middle"
        data-label="1">↓ decelerating</text>

  <!-- HEAT TEMPERATURE GAUGE -->
  <rect x="362" y="152" width="122" height="74" rx="12"
        fill="rgba(6,12,30,0.85)" stroke="rgba(239,68,68,0.25)" stroke-width="1.5"/>
  <rect x="362" y="152" width="122" height="2" rx="1" fill="rgba(239,68,68,0.2)"/>
  <text x="423" y="177" font-size="8.5" fill="${C.airRedL}" text-anchor="middle"
        font-weight="700" data-label="1">DRUM TEMP.</text>
  <text id="s6-temp" x="423" y="212" font-size="20" fill="${C.airRed}"
        text-anchor="middle" font-weight="800">120°C</text>

  <!-- Labels -->
  <text x="${cx}" y="${cy + r + 52}" font-size="9" fill="${C.muted}"
        text-anchor="middle" data-label="1">Kinetic Energy → Heat (friction)</text>
  `);
}

function animateS6() {
  killTl();
  const drumEl = document.getElementById('s6-drum-outer');
  let rotDeg = 0;
  let rpm    = 520;
  let speed  = 100;
  let temp   = 120;
  let frame;

  function step() {
    if (!document.getElementById('s6-drum-outer')) return;
    rpm   = Math.max(rpm - 1.8 * spd, 0);
    speed = Math.round(rpm / 5.2);
    temp  = Math.min(temp + 0.4 * spd, 340);
    rotDeg += rpm / 58;
    if (drumEl) drumEl.style.transform = `rotate(${rotDeg}deg)`;
    const spEl  = $('s6-speed'); if (spEl)  spEl.textContent  = speed + '%';
    const tmpEl = $('s6-temp');  if (tmpEl) tmpEl.textContent = Math.round(temp) + '°C';
    // Change temperature color as it heats up
    if (tmpEl) tmpEl.setAttribute('fill', temp > 250 ? C.orange : C.airRed);
    if (rpm > 0) {
      frame = requestAnimationFrame(step);
    } else {
      setTimeout(() => {
        if (!document.getElementById('s6-drum-outer')) return;
        rpm = 520; speed = 100; temp = 120;
        frame = requestAnimationFrame(step);
      }, 1400 / spd);
    }
  }
  frame = requestAnimationFrame(step);

  // Heat glow pulsing (more intense)
  tl = gsap.timeline({ defaults: { ease: 'sine.inOut' } });
  tl.to(['#s6-heat-top','#s6-heat-bot'], {
    opacity: 0.3, duration: 0.45 / spd, yoyo: true, repeat: -1, stagger: 0.18 / spd
  });
  // Ambient glow
  tl.to('#s6-ambient', { opacity: 0.35, duration: 0.6 / spd, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);

  // Sparks — more frequent and dramatic
  const sparks = ['#s6-sp1','#s6-sp2','#s6-sp3','#s6-sp4','#s6-sp5','#s6-sp6'];
  sparks.forEach((sel, i) => {
    gsap.to(sel, {
      opacity: 1, r: (i % 2 === 0) ? 7 : 5, duration: 0.12 / spd,
      yoyo: true, repeat: -1, delay: i * 0.09 / spd, repeatDelay: 0.22 / spd,
      ease: 'power2.in'
    });
    // Random scatter
    gsap.to(sel, {
      x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12,
      duration: 0.12 / spd, yoyo: true, repeat: -1, delay: i * 0.09 / spd, ease: 'none'
    });
  });

  // Store cleanup
  const visEl = document.getElementById('vis-6');
  if (visEl) visEl._brakeCleanup = () => { cancelAnimationFrame(frame); rpm = 0; };
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 7 — RELEASE & RETURN SPRINGS
══════════════════════════════════════════════════════════════════════════ */
function renderS7(el) {
  const cx = 190, cy = 200, r = 120;
  const innerR = r - 14;
  const shoeR  = innerR - 8;
  const springEndR = r + 22;

  el.innerHTML = svgWrap(500, 380, `
  <!-- Background -->
  <rect width="500" height="380" fill="${C.truckDark}" rx="12"/>
  <text x="250" y="28" font-size="13" fill="${C.spring}" text-anchor="middle"
        font-weight="800" data-label="1">Pedal Released — Springs Reset</text>

  <!-- Ambient cool-down glow behind drum -->
  <circle cx="${cx}" cy="${cy}" r="${r + 40}" fill="url(#grad-spot-blue)" opacity="0.22"/>

  <!-- DRUM body (gradient) -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#grad-drum)" stroke="${C.grayMid}" stroke-width="2.5"/>
  <!-- Drum inner surface -->
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${C.truckDark}" stroke="${C.drum}" stroke-width="2"/>

  <!-- BRAKE SHOES (start applied → will retract) -->
  <path id="s7-shoe-top" d="${arc(cx, cy, shoeR, 210, 330, 1)}"
        fill="none" stroke="${C.shoeHot}" stroke-width="20" stroke-linecap="round"/>
  <path id="s7-shoe-bot" d="${arc(cx, cy, shoeR, 30, 150, 1)}"
        fill="none" stroke="${C.shoeHot}" stroke-width="20" stroke-linecap="round"/>

  <!-- RETURN SPRINGS (coil visualization) — left and right -->
  <path id="s7-spring-l"
        d="M ${px(cx,shoeR,150).toFixed(1)},${py(cy,shoeR,150).toFixed(1)}
           Q ${px(cx,shoeR-14,168).toFixed(1)},${py(cy,shoeR-14,168).toFixed(1)}
             ${px(cx,shoeR,185).toFixed(1)},${py(cy,shoeR,185).toFixed(1)}
           Q ${px(cx,shoeR-14,202).toFixed(1)},${py(cy,shoeR-14,202).toFixed(1)}
             ${px(cx,shoeR,220).toFixed(1)},${py(cy,shoeR,220).toFixed(1)}"
        fill="none" stroke="${C.spring}" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
  <path id="s7-spring-r"
        d="M ${px(cx,shoeR,30).toFixed(1)},${py(cy,shoeR,30).toFixed(1)}
           Q ${px(cx,shoeR-14,12).toFixed(1)},${py(cy,shoeR-14,12).toFixed(1)}
             ${px(cx,shoeR,354).toFixed(1)},${py(cy,shoeR,354).toFixed(1)}
           Q ${px(cx,shoeR-14,336).toFixed(1)},${py(cy,shoeR-14,336).toFixed(1)}
             ${px(cx,shoeR,318).toFixed(1)},${py(cy,shoeR,318).toFixed(1)}"
        fill="none" stroke="${C.spring}" stroke-width="4" stroke-linecap="round" opacity="0.9"/>

  <!-- SPRING ARROWS (pull inward direction) -->
  <line id="s7-sp-l" x1="${px(cx,shoeR,150).toFixed(1)}" y1="${py(cy,shoeR,150).toFixed(1)}"
        x2="${px(cx,shoeR,215).toFixed(1)}" y2="${py(cy,shoeR,215).toFixed(1)}"
        stroke="${C.spring}" stroke-width="3" stroke-dasharray="5,3"
        marker-end="url(#arr-b)" opacity="0" filter="url(#glow-b)"/>
  <line id="s7-sp-r" x1="${px(cx,shoeR,30).toFixed(1)}" y1="${py(cy,shoeR,30).toFixed(1)}"
        x2="${px(cx,shoeR,330).toFixed(1)}" y2="${py(cy,shoeR,330).toFixed(1)}"
        stroke="${C.spring}" stroke-width="3" stroke-dasharray="5,3"
        marker-end="url(#arr-b)" opacity="0" filter="url(#glow-b)"/>

  <!-- S-CAM group -->
  <g id="s7-cam" style="transform-origin:${cx}px ${cy}px">
    <ellipse cx="${cx - 4}" cy="${cy - 10}" rx="14" ry="8" fill="url(#grad-drum)" opacity="0.9"/>
    <ellipse cx="${cx + 4}" cy="${cy + 10}" rx="14" ry="8" fill="url(#grad-drum)" opacity="0.9"/>
    <circle cx="${cx}" cy="${cy}" r="10" fill="${C.drum}" stroke="${C.grayLt}" stroke-width="1.5"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="20" fill="${C.grayDk}" stroke="${C.grayMid}" stroke-width="1.5"/>
  <text x="${cx}" y="${cy + 4}" font-size="7" fill="${C.grayLt}" text-anchor="middle"
        font-weight="700">S-CAM</text>

  <!-- BRAKE CHAMBER + PUSHROD -->
  <rect x="355" y="170" width="100" height="56" rx="10"
        fill="rgba(6,12,30,0.88)" stroke="${C.grayMid}" stroke-width="1.5"/>
  <rect x="355" y="170" width="100" height="2" rx="1" fill="rgba(148,163,184,0.1)"/>
  <text x="405" y="195" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" font-weight="700">BRAKE</text>
  <text x="405" y="208" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" font-weight="700">CHAMBER</text>
  <rect id="s7-pushrod" x="328" y="189" width="30" height="14" rx="5"
        fill="url(#grad-amber-h)" stroke="${C.amberL}" stroke-width="1.5"/>

  <!-- EXHAUST PORT -->
  <rect id="s7-exhaust" x="354" y="146" width="18" height="24" rx="5"
        fill="rgba(6,12,30,0.85)" stroke="rgba(59,130,246,0.35)" stroke-width="1.5"/>
  <!-- Exhaust air stream (particles) -->
  <circle id="s7-ea1" cx="361" cy="138" r="4" fill="${C.airBlue}" opacity="0" filter="url(#glow-b)"/>
  <circle id="s7-ea2" cx="368" cy="128" r="3" fill="${C.airBlueL}" opacity="0" filter="url(#glow-b)"/>
  <circle id="s7-ea3" cx="363" cy="116" r="2.5" fill="${C.airBlue}" opacity="0" filter="url(#glow-b)"/>
  <text id="s7-ea-txt" x="363" y="108" font-size="7.5" fill="${C.airBlueL}"
        text-anchor="middle" data-label="1" opacity="0">EXHAUST</text>

  <!-- PEDAL indicator -->
  <rect x="366" y="268" width="114" height="70" rx="12"
        fill="rgba(6,12,30,0.85)" stroke="rgba(245,158,11,0.3)" stroke-width="1.5"/>
  <rect x="366" y="268" width="114" height="2" rx="1" fill="rgba(245,158,11,0.12)"/>
  <text x="423" y="293" font-size="8.5" fill="${C.muted}" text-anchor="middle"
        font-weight="700" data-label="1">BRAKE PEDAL</text>
  <text id="s7-pedal-stat" x="423" y="320" font-size="15" fill="${C.amber}"
        text-anchor="middle" font-weight="800">PRESSED</text>

  <!-- WHEEL FREE indicator -->
  <rect id="s7-free-box" x="366" y="44" width="114" height="70" rx="12"
        fill="rgba(6,12,30,0.85)" stroke="rgba(34,197,94,0.15)" stroke-width="1.5"/>
  <rect x="366" y="44" width="114" height="2" rx="1" fill="rgba(148,163,184,0.06)"/>
  <text x="423" y="70" font-size="8.5" fill="${C.muted}" text-anchor="middle"
        font-weight="700" data-label="1">WHEEL STATUS</text>
  <text id="s7-wheel-stat" x="423" y="100" font-size="14" fill="${C.grayLt}"
        text-anchor="middle" font-weight="800">BRAKING</text>

  <!-- Labels -->
  <text x="${cx}" y="${cy + r + 28}" font-size="9" fill="${C.muted}"
        text-anchor="middle" data-label="1">DRUM</text>
  <text x="${cx - r - 12}" y="${cy + 4}" font-size="8.5" fill="${C.spring}"
        text-anchor="end" data-label="1">RETURN</text>
  <text x="${cx - r - 12}" y="${cy + 17}" font-size="8.5" fill="${C.spring}"
        text-anchor="end" data-label="1">SPRINGS</text>
  `);
}

function animateS7() {
  killTl();
  const shoeR = 106 - 8; // innerR - 8
  tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 / spd, defaults: { ease: 'power2.inOut' } });

  // Phase 1: Exhaust air appears, cam rotates back, pushrod retracts, springs pull shoes
  tl.to(['#s7-ea1','#s7-ea2','#s7-ea3','#s7-ea-txt'], {
      opacity: 1, duration: 0.3 / spd, stagger: 0.06 / spd
    })
    .to('#s7-exhaust', { stroke: C.airBlue, fill: 'rgba(59,130,246,0.22)', duration: 0.25 / spd }, '<')
    .to('#s7-cam', { rotation: -28, transformOrigin: `190px 200px`, duration: 0.55 / spd }, 0.15 / spd)
    .to('#s7-pushrod', { x: 26, duration: 0.55 / spd }, 0.15 / spd)
    .to(['#s7-sp-l','#s7-sp-r'], { opacity: 1, duration: 0.25 / spd, filter: 'url(#glow-b)' }, 0.35 / spd)
    // Shoes retract (snap back with springs)
    .to('#s7-shoe-top', {
      attr: { stroke: C.shoe, 'd': arc(190, 200, shoeR - 12, 210, 330, 1) },
      duration: 0.5 / spd
    }, 0.5 / spd)
    .to('#s7-shoe-bot', {
      attr: { stroke: C.shoe, 'd': arc(190, 200, shoeR - 12, 30, 150, 1) },
      duration: 0.5 / spd
    }, 0.5 / spd)
    // Update status text
    .call(() => {
      const ps = $('s7-pedal-stat'); if (ps) { ps.textContent = 'RELEASED'; ps.setAttribute('fill', C.green); }
      const ws = $('s7-wheel-stat'); if (ws) { ws.textContent = 'FREE'; ws.setAttribute('fill', C.spring); }
      const fb = $('s7-free-box');   if (fb) { fb.setAttribute('stroke', 'rgba(34,197,94,0.4)'); }
    }, [], 0.65 / spd)
    // Exhaust bubbles animate upward
    .to('#s7-ea1', { y: -20, opacity: 0, duration: 0.6 / spd, ease: 'power1.out' }, 0.3 / spd)
    .to('#s7-ea2', { y: -24, opacity: 0, duration: 0.6 / spd, ease: 'power1.out', delay: 0.1 / spd }, 0.3 / spd)
    .to('#s7-ea3', { y: -22, opacity: 0, duration: 0.6 / spd, ease: 'power1.out', delay: 0.18 / spd }, 0.3 / spd)
    // Hold released state
    .to({}, { duration: 1.1 / spd })
    // Phase 2: Reset for loop
    .to('#s7-shoe-top', {
      attr: { stroke: C.shoeHot, 'd': arc(190, 200, shoeR, 210, 330, 1) },
      duration: 0.38 / spd
    })
    .to('#s7-shoe-bot', {
      attr: { stroke: C.shoeHot, 'd': arc(190, 200, shoeR, 30, 150, 1) },
      duration: 0.38 / spd
    }, '<')
    .to('#s7-cam',     { rotation: 0, duration: 0.38 / spd }, '<')
    .to('#s7-pushrod', { x: 0,        duration: 0.38 / spd }, '<')
    .to(['#s7-sp-l','#s7-sp-r','#s7-ea-txt'], { opacity: 0, duration: 0.22 / spd }, '<')
    .set(['#s7-ea1','#s7-ea2','#s7-ea3'], { y: 0, opacity: 0 })
    .call(() => {
      const ps = $('s7-pedal-stat'); if (ps) { ps.textContent = 'PRESSED'; ps.setAttribute('fill', C.amber); }
      const ws = $('s7-wheel-stat'); if (ws) { ws.textContent = 'BRAKING'; ws.setAttribute('fill', C.grayLt); }
      const fb = $('s7-free-box');   if (fb) { fb.setAttribute('stroke', 'rgba(34,197,94,0.15)'); }
    });
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE DISPATCH TABLE
══════════════════════════════════════════════════════════════════════════ */
const SCENES = [
  { render: renderS0, animate: animateS0 },
  { render: renderS1, animate: animateS1 },
  { render: renderS2, animate: animateS2 },
  { render: renderS3, animate: animateS3 },
  { render: renderS4, animate: animateS4 },
  { render: renderS5, animate: animateS5 },
  { render: renderS6, animate: animateS6 },
  { render: renderS7, animate: animateS7 },
];

/* ══════════════════════════════════════════════════════════════════════════
   SCENE MANAGEMENT
══════════════════════════════════════════════════════════════════════════ */
function killTl() {
  if (tl) { tl.kill(); tl = null; }
}

function goTo(idx) {
  const prev = $('scene-' + curScene);
  if (prev) {
    prev.classList.remove('active');
    // Call any cleanup on the visual element
    const prevVis = $('vis-' + curScene);
    if (prevVis && prevVis._brakeCleanup) {
      prevVis._brakeCleanup();
      prevVis._brakeCleanup = null;
    }
  }
  killTl();
  curScene = idx;

  const next = $('scene-' + curScene);
  if (next) next.classList.add('active');

  // Render SVG
  const vis = $('vis-' + curScene);
  if (vis) SCENES[curScene].render(vis);

  // Animate after a brief paint delay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      SCENES[curScene].animate(vis);
    });
  });

  updateUI();
}

function updateUI() {
  // Progress bar
  const bar = $('progress-bar');
  if (bar) {
    const pct = ((curScene + 1) / TOTAL) * 100;
    bar.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', curScene + 1);
  }
  // Counter
  const ctr = $('scene-counter');
  if (ctr) ctr.textContent = (curScene + 1) + ' / ' + TOTAL;
  // Buttons
  const prev = $('btn-prev'), next = $('btn-next');
  if (prev) prev.disabled = curScene === 0;
  if (next) next.disabled = curScene === TOTAL - 1;
  // Dot nav
  document.querySelectorAll('.dot-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === curScene);
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   BACKGROUND CANVAS — Air molecule particle system
══════════════════════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = 55;
  const particles = Array.from({ length: COUNT }, () => ({
    x:    Math.random() * window.innerWidth,
    y:    Math.random() * window.innerHeight,
    r:    Math.random() * 2 + 0.8,
    vx:   (Math.random() - 0.5) * 0.3,
    vy:   -(Math.random() * 0.35 + 0.1),
    alpha: Math.random() * 0.35 + 0.05,
    color: Math.random() > 0.5 ? '59,130,246' : '148,163,184',
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      // Subtle horizontal drift
      p.vx += (Math.random() - 0.5) * 0.02;
      p.vx = Math.max(-0.4, Math.min(0.4, p.vx));
      // Wrap
      if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
      if (p.x < -4) p.x = canvas.width + 4;
      if (p.x > canvas.width + 4) p.x = -4;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ══════════════════════════════════════════════════════════════════════════
   3D TILT EFFECT for scene visuals
══════════════════════════════════════════════════════════════════════════ */
function initTiltEffect() {
  document.querySelectorAll('.scene-visual').forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      el.style.transform  = `perspective(700px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) scale(1.01)`;
      el.style.transition = 'transform 0.08s ease';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform  = '';
      el.style.transition = 'transform 0.5s ease';
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   TOUCH / SWIPE SUPPORT
══════════════════════════════════════════════════════════════════════════ */
function initSwipe() {
  let startX = 0;
  const app = document.getElementById('app');
  if (!app) return;
  app.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  app.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && curScene < TOTAL - 1) goTo(curScene + 1);
    if (dx > 0 && curScene > 0)         goTo(curScene - 1);
  }, { passive: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  $('btn-prev').addEventListener('click', () => { if (curScene > 0) goTo(curScene - 1); });
  $('btn-next').addEventListener('click', () => { if (curScene < TOTAL - 1) goTo(curScene + 1); });
  $('btn-replay').addEventListener('click', () => goTo(curScene));

  $('speed-sel').addEventListener('change', e => {
    spd = parseFloat(e.target.value);
    goTo(curScene);
  });

  // Toggles
  $('tog-labels').addEventListener('change', e => {
    document.body.classList.toggle('hide-labels', !e.target.checked);
  });
  $('tog-subtitles').addEventListener('change', e => {
    document.body.classList.toggle('hide-subtitles', !e.target.checked);
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (curScene < TOTAL - 1) goTo(curScene + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (curScene > 0) goTo(curScene - 1);
    } else if (e.key === 'r' || e.key === 'R') {
      goTo(curScene);
    }
  });

  // Build dot navigation
  const dotNav = $('dot-nav');
  if (dotNav) {
    for (let i = 0; i < TOTAL; i++) {
      const btn = document.createElement('button');
      btn.className    = 'dot-btn';
      btn.title        = i === 0 ? 'Overview' : `Step ${i}`;
      btn.setAttribute('aria-label', btn.title);
      btn.dataset.idx  = i;
      btn.addEventListener('click', () => goTo(i));
      dotNav.appendChild(btn);
    }
  }

  // Extra effects
  initParticles();
  initTiltEffect();
  initSwipe();

  // Init first scene
  goTo(0);
});
