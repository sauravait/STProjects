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
    <marker id="arr-a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="${C.amber}"/></marker>
    <marker id="arr-r" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="${C.airRed}"/></marker>
    <marker id="arr-b" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="${C.airBlue}"/></marker>
    <filter id="glow-r" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-a" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
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
  const groundY = 258, frameY = 200, fH = 20;
  const wR = 38, wCY = groundY - wR;
  const fwX = 142, rw1X = 452, rw2X = 520;

  el.innerHTML = svgWrap(W, H, `
  <!-- Ground -->
  <rect x="0" y="${groundY}" width="${W}" height="${H - groundY}" fill="${C.road}"/>
  <line x1="0" y1="${groundY}" x2="${W}" y2="${groundY}" stroke="${C.gray}" stroke-width="1"/>

  <!-- FRAME -->
  <rect id="s0-frame" x="110" y="${frameY}" width="432" height="${fH}" rx="3"
        fill="${C.truckBody}" stroke="${C.grayMid}" stroke-width="1.5"/>

  <!-- CAB body -->
  <rect id="s0-cab" x="28" y="65" width="132" height="142" rx="10"
        fill="${C.truckCab}" stroke="${C.grayLt}" stroke-width="2"/>
  <!-- Windshield panel -->
  <path d="M157,65 L172,88 L172,170 L157,170 Z" fill="#0f2744" stroke="${C.grayMid}" stroke-width="1.5"/>
  <!-- Window -->
  <rect x="38" y="79" width="107" height="72" rx="6" fill="#0f2744" stroke="${C.grayMid}" stroke-width="1"/>
  <!-- Door handle -->
  <rect x="128" y="162" width="22" height="5" rx="2.5" fill="${C.grayLt}"/>
  <!-- Exhaust stack -->
  <rect x="148" y="26" width="10" height="52" rx="5" fill="${C.gray}" stroke="${C.grayMid}" stroke-width="1"/>
  <ellipse id="s0-smoke" cx="153" cy="19" rx="7" ry="5" fill="${C.grayMid}" opacity="0.5"/>
  <!-- Headlight -->
  <ellipse cx="170" cy="177" rx="8" ry="11" fill="#fef9c3" stroke="${C.grayLt}" stroke-width="1"/>
  <!-- Bumper -->
  <rect x="162" y="197" width="24" height="12" rx="3" fill="${C.truckBody}" stroke="${C.grayMid}" stroke-width="1"/>

  <!-- PEDAL in cab -->
  <line id="s0-pedal-arm" x1="76" y1="156" x2="88" y2="197"
        stroke="${C.grayLt}" stroke-width="5" stroke-linecap="round"/>
  <rect id="s0-pedal" x="73" y="195" width="30" height="7" rx="3.5" fill="${C.amber}"/>
  <ellipse id="s0-foot" cx="82" cy="192" rx="17" ry="9" fill="${C.orange}" opacity="0.45"/>

  <!-- FRONT AXLE -->
  <line x1="${fwX}" y1="${frameY + fH}" x2="${fwX}" y2="${wCY - wR}"
        stroke="${C.grayMid}" stroke-width="5"/>

  <!-- FRONT BRAKE CHAMBER -->
  <rect id="s0-bcf" x="${fwX - 16}" y="${frameY - 22}" width="32" height="18" rx="4"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="1.5"/>
  <text x="${fwX}" y="${frameY - 10}" font-size="7" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">BCH</text>

  <!-- AIR COMPRESSOR -->
  <rect id="s0-comp" x="184" y="${frameY - 30}" width="52" height="24" rx="5"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="1.5"/>
  <text x="210" y="${frameY - 15}" font-size="7.5" fill="${C.airBlueL}" text-anchor="middle"
        font-weight="700" data-label="1">COMP.</text>

  <!-- AIR TANK 1 -->
  <rect id="s0-tk1" x="246" y="${frameY - 32}" width="62" height="26" rx="13"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="1.5"/>
  <text x="277" y="${frameY - 16}" font-size="7.5" fill="${C.airBlueL}" text-anchor="middle"
        font-weight="700" data-label="1">AIR TANK</text>

  <!-- AIR TANK 2 -->
  <rect id="s0-tk2" x="318" y="${frameY - 32}" width="62" height="26" rx="13"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="1.5"/>
  <text x="349" y="${frameY - 16}" font-size="7.5" fill="${C.airBlueL}" text-anchor="middle"
        font-weight="700" data-label="1">AIR TANK</text>

  <!-- COMP → TANK connection -->
  <line x1="236" y1="${frameY - 18}" x2="246" y2="${frameY - 18}"
        stroke="${C.airBlue}" stroke-width="2.5"/>
  <line x1="308" y1="${frameY - 18}" x2="318" y2="${frameY - 18}"
        stroke="${C.airBlue}" stroke-width="2.5"/>

  <!-- BRAKE LINES (dashed) -->
  <path id="s0-ln1"
        d="M380,${frameY - 18} C 420,${frameY - 18} 440,${frameY - 6} ${rw1X},${frameY - 6}"
        fill="none" stroke="${C.airBlue}" stroke-width="2.5" stroke-dasharray="5,3"/>
  <path id="s0-ln2"
        d="M380,${frameY - 18} C 460,${frameY - 18} 505,${frameY - 6} ${rw2X},${frameY - 6}"
        fill="none" stroke="${C.airBlue}" stroke-width="2.5" stroke-dasharray="5,3"/>
  <path id="s0-ln3"
        d="M246,${frameY - 18} C 200,${frameY - 18} 168,${frameY - 8} ${fwX},${frameY - 8}"
        fill="none" stroke="${C.airBlue}" stroke-width="2.5" stroke-dasharray="5,3"/>

  <!-- REAR BRAKE CHAMBERS -->
  <rect id="s0-bcr1" x="${rw1X - 18}" y="${frameY - 26}" width="36" height="20" rx="4"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="1.5"/>
  <text x="${rw1X}" y="${frameY - 12}" font-size="7" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">BCH</text>
  <rect id="s0-bcr2" x="${rw2X - 18}" y="${frameY - 26}" width="36" height="20" rx="4"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="1.5"/>
  <text x="${rw2X}" y="${frameY - 12}" font-size="7" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">BCH</text>

  <!-- REAR AXLES -->
  <line x1="${rw1X}" y1="${frameY + fH}" x2="${rw1X}" y2="${wCY - wR}"
        stroke="${C.grayMid}" stroke-width="5"/>
  <line x1="${rw2X}" y1="${frameY + fH}" x2="${rw2X}" y2="${wCY - wR}"
        stroke="${C.grayMid}" stroke-width="5"/>

  <!-- WHEELS -->
  ${wheel(fwX, wCY, wR, 's0-wf')}
  ${wheel(rw1X, wCY, wR, 's0-wr1')}
  ${wheel(rw2X, wCY, wR, 's0-wr2')}

  <!-- LABELS -->
  <line x1="80" y1="198" x2="52" y2="235" stroke="${C.amberL}" stroke-width="1" stroke-dasharray="3,2" data-label="1"/>
  <text x="50" y="244" font-size="9" fill="${C.amberL}" text-anchor="middle" data-label="1">BRAKE PEDAL</text>

  <text x="210" y="${frameY + 20}" font-size="9" fill="${C.airBlueL}" text-anchor="middle" data-label="1">COMPRESSOR</text>
  <text x="313" y="${frameY + 20}" font-size="9" fill="${C.airBlueL}" text-anchor="middle" data-label="1">AIR TANKS</text>

  <text x="${fwX}" y="${wCY + wR + 18}" font-size="9" fill="${C.grayLt}" text-anchor="middle" data-label="1">BRAKE DRUM</text>
  <text x="${rw1X + 22}" y="${wCY + wR + 18}" font-size="9" fill="${C.grayLt}" text-anchor="middle" data-label="1">DRUMS</text>

  <line x1="${rw2X + 18}" y1="${frameY - 16}" x2="${rw2X + 46}" y2="${frameY - 34}"
        stroke="${C.amber}" stroke-width="1" stroke-dasharray="3,2" data-label="1"/>
  <text x="${rw2X + 48}" y="${frameY - 40}" font-size="9" fill="${C.amberL}" data-label="1">BRAKE</text>
  <text x="${rw2X + 48}" y="${frameY - 29}" font-size="9" fill="${C.amberL}" data-label="1">CHAMBERS</text>
  `);
}

function animateS0() {
  killTl();
  const elems = ['#s0-cab','#s0-comp','#s0-tk1','#s0-tk2',
                 '#s0-ln1','#s0-ln2','#s0-ln3',
                 '#s0-bcr1','#s0-bcr2','#s0-bcf',
                 '#s0-wf','#s0-wr1','#s0-wr2','#s0-pedal'];
  tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  elems.forEach((sel, i) => {
    tl.fromTo(sel,
      { opacity: 0, scale: 0.88, transformOrigin: 'center' },
      { opacity: 1, scale: 1, duration: 0.3 / spd }, i * 0.09 / spd);
  });
  // Slowly spin wheels to show it's rolling
  tl.to(['#s0-wf','#s0-wr1','#s0-wr2'], {
    rotation: 360, transformOrigin: 'center',
    duration: 5 / spd, ease: 'none', repeat: -1
  }, 1 / spd);
  // Smoke puff
  tl.to('#s0-smoke', {
    attr: { ry: 8, rx: 10 }, opacity: 0.2, y: -4,
    duration: 1 / spd, ease: 'sine.inOut', yoyo: true, repeat: -1
  }, 0.5 / spd);
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 1 — BRAKE PEDAL PRESS (cab interior close-up)
══════════════════════════════════════════════════════════════════════════ */
function renderS1(el) {
  el.innerHTML = svgWrap(400, 340, `
  <!-- Cab floor/dash background -->
  <rect x="0" y="0" width="400" height="340" fill="${C.truckDark}" rx="0"/>
  <!-- Dashboard top -->
  <rect x="0" y="0" width="400" height="80" fill="#111827" rx="0"/>
  <!-- Steering column -->
  <ellipse cx="200" cy="65" rx="55" ry="14" fill="${C.gray}" stroke="${C.grayLt}" stroke-width="2"/>
  <rect x="195" y="55" width="10" height="90" fill="${C.gray}" stroke="${C.grayMid}" stroke-width="1"/>
  <!-- Floor pedal area -->
  <rect x="0" y="260" width="400" height="80" fill="#0f172a" rx="0"/>

  <!-- BRAKE VALVE (on firewall/dash) -->
  <rect id="s1-valve-body" x="148" y="90" width="104" height="70" rx="8"
        fill="${C.grayDk}" stroke="${C.grayMid}" stroke-width="2"/>
  <text x="200" y="120" font-size="11" fill="${C.grayLt}" text-anchor="middle" font-weight="700">FOOT VALVE</text>
  <text x="200" y="138" font-size="9" fill="${C.grayMid}" text-anchor="middle">(Treadle Valve)</text>
  <!-- Valve port (air out) -->
  <rect x="210" y="160" width="12" height="30" fill="${C.airBlue}" rx="2" id="s1-port"/>

  <!-- AIR ARROW from valve downward -->
  <line id="s1-arr" x1="216" y1="195" x2="216" y2="255"
        stroke="${C.airBlue}" stroke-width="3" marker-end="url(#arr-b)" opacity="0"/>

  <!-- PEDAL ARM -->
  <g id="s1-pedal-grp" style="transform-origin:90px 225px">
    <line x1="90" y1="225" x2="110" y2="255"
          stroke="${C.grayLt}" stroke-width="8" stroke-linecap="round"/>
    <!-- Pivot point -->
    <circle cx="90" cy="225" r="7" fill="${C.gray}" stroke="${C.grayLt}" stroke-width="2"/>
    <!-- Pedal platform -->
    <rect x="95" y="250" width="58" height="12" rx="6" fill="${C.amber}"
          stroke="${C.amberL}" stroke-width="1.5"/>
    <!-- Rubber grip lines -->
    <line x1="105" y1="251" x2="105" y2="261" stroke="${C.amberL}" stroke-width="2" opacity="0.5"/>
    <line x1="115" y1="251" x2="115" y2="261" stroke="${C.amberL}" stroke-width="2" opacity="0.5"/>
    <line x1="125" y1="251" x2="125" y2="261" stroke="${C.amberL}" stroke-width="2" opacity="0.5"/>
    <line x1="135" y1="251" x2="135" y2="261" stroke="${C.amberL}" stroke-width="2" opacity="0.5"/>
    <line x1="145" y1="251" x2="145" y2="261" stroke="${C.amberL}" stroke-width="2" opacity="0.5"/>
  </g>

  <!-- DRIVER'S FOOT -->
  <g id="s1-foot-grp" style="transform-origin:125px 248px">
    <!-- Leg -->
    <rect x="95" y="185" width="36" height="70" rx="16"
          fill="#7c3aed" stroke="#6d28d9" stroke-width="1.5" opacity="0.9"/>
    <!-- Boot -->
    <path d="M90,245 L90,265 Q90,275 105,275 L155,275 Q165,275 165,265 L165,260 Q165,255 155,255 L130,255 L130,245 Z"
          fill="#1c1917" stroke="#292524" stroke-width="1.5"/>
  </g>

  <!-- LABELS -->
  <text x="200" y="28" font-size="13" fill="${C.amber}" text-anchor="middle"
        font-weight="800" data-label="1">Cab Interior — Step 1</text>

  <line x1="148" y1="125" x2="100" y2="125" stroke="${C.grayLt}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  <text x="98" y="121" font-size="9" fill="${C.grayLt}" text-anchor="end" data-label="1">FOOT VALVE</text>
  <text x="98" y="132" font-size="9" fill="${C.grayLt}" text-anchor="end" data-label="1">(closed)</text>

  <!-- Status: open/closed -->
  <rect id="s1-status" x="250" y="156" width="80" height="22" rx="6"
        fill="rgba(239,68,68,0.15)" stroke="${C.airRed}" stroke-width="1.5"/>
  <text id="s1-status-txt" x="290" y="171" font-size="10" fill="${C.airRedL}"
        text-anchor="middle" font-weight="700">CLOSED</text>

  <!-- Pedal label -->
  <line x1="110" y1="255" x2="60" y2="310" stroke="${C.amberL}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  <text x="58" y="318" font-size="9" fill="${C.amberL}" text-anchor="middle" data-label="1">BRAKE PEDAL</text>
  `);
}

function animateS1() {
  killTl();
  tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 / spd, defaults: { ease: 'power2.inOut' } });
  // Foot and pedal press down
  tl.to(['#s1-foot-grp','#s1-pedal-grp'], { y: 18, duration: 0.55 / spd })
    // Valve turns green / open
    .to('#s1-valve-body', { stroke: C.airBlue, duration: 0.2 / spd }, '-=0.1')
    .to('#s1-status', { stroke: C.airBlue, fill: 'rgba(59,130,246,0.15)', duration: 0.2 / spd }, '<')
    .to('#s1-status-txt', { attr: { fill: C.airBlueL }, duration: 0.1 / spd }, '<')
    .to('#s1-port', { fill: C.airRed, duration: 0.15 / spd }, '<')
    // Arrow appears
    .to('#s1-arr', { opacity: 1, duration: 0.3 / spd })
    // Hold
    .to({}, { duration: 0.8 / spd })
    // Release
    .to(['#s1-foot-grp','#s1-pedal-grp'], { y: 0, duration: 0.5 / spd })
    .to('#s1-valve-body', { stroke: C.grayMid, duration: 0.2 / spd }, '<')
    .to('#s1-status', { stroke: C.airRed, fill: 'rgba(239,68,68,0.15)', duration: 0.2 / spd }, '<')
    .to('#s1-status-txt', { attr: { fill: C.airRedL }, duration: 0.1 / spd }, '<')
    .to('#s1-arr', { opacity: 0, duration: 0.2 / spd }, '<')
    .to('#s1-port', { fill: C.airBlue, duration: 0.15 / spd }, '<');

  // Update status text
  tl.addLabel('press', 0.55 / spd);
  tl.call(() => {
    const el = $('s1-status-txt');
    if (el) el.textContent = 'OPEN';
  }, [], 'press');
  tl.call(() => {
    const el = $('s1-status-txt');
    if (el) el.textContent = 'CLOSED';
  }, [], (0.55 + 0.8 + 0.5) / spd + 0.3 / spd);
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 2 — AIR PRESSURE FLOW (schematic pipes)
══════════════════════════════════════════════════════════════════════════ */
function renderS2(el) {
  el.innerHTML = svgWrap(540, 320, `
  <!-- Background grid -->
  <rect width="540" height="320" fill="${C.truckDark}" rx="12"/>

  <!-- COMPRESSOR box -->
  <rect id="s2-comp" x="20" y="130" width="74" height="52" rx="8"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2"/>
  <text x="57" y="151" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">AIR</text>
  <text x="57" y="163" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">COMP.</text>
  <text x="57" y="175" font-size="7.5" fill="${C.grayLt}" text-anchor="middle">100–120 PSI</text>

  <!-- TANK 1 -->
  <rect id="s2-tk1" x="118" y="120" width="75" height="70" rx="14"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2"/>
  <text x="155" y="150" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">AIR</text>
  <text x="155" y="162" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">TANK 1</text>
  <text x="155" y="178" font-size="7.5" fill="${C.grayLt}" text-anchor="middle">Primary</text>

  <!-- TANK 2 -->
  <rect id="s2-tk2" x="118" y="205" width="75" height="70" rx="14"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2"/>
  <text x="155" y="235" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">AIR</text>
  <text x="155" y="247" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">TANK 2</text>
  <text x="155" y="263" font-size="7.5" fill="${C.grayLt}" text-anchor="middle">Secondary</text>

  <!-- BRAKE VALVE -->
  <rect id="s2-valve" x="230" y="134" width="70" height="44" rx="8"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2"/>
  <text x="265" y="154" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">FOOT</text>
  <text x="265" y="166" font-size="9" fill="${C.airBlueL}" text-anchor="middle" font-weight="700">VALVE</text>

  <!-- BRAKE CHAMBERS (right side) -->
  <rect id="s2-bcFL" x="432" y="52" width="76" height="44" rx="8"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="2"/>
  <text x="470" y="72" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">FRONT</text>
  <text x="470" y="84" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">CHAMBER</text>

  <rect id="s2-bcRL" x="432" y="126" width="76" height="44" rx="8"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="2"/>
  <text x="470" y="146" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">REAR-L</text>
  <text x="470" y="158" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">CHAMBER</text>

  <rect id="s2-bcRR" x="432" y="200" width="76" height="44" rx="8"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="2"/>
  <text x="470" y="220" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">REAR-R</text>
  <text x="470" y="232" font-size="8.5" fill="${C.amberL}" text-anchor="middle" font-weight="700">CHAMBER</text>

  <!-- PIPE ROUTES (static backdrop) -->
  <!-- comp → tk1 -->
  <line x1="94" y1="156" x2="118" y2="156" stroke="${C.airBlue}" stroke-width="5" stroke-linecap="round" opacity="0.3"/>
  <!-- comp → tk2 -->
  <path d="M94,156 L106,156 L106,240 L118,240" fill="none" stroke="${C.airBlue}" stroke-width="5" opacity="0.3"/>
  <!-- tk1 → valve -->
  <line x1="193" y1="156" x2="230" y2="156" stroke="${C.airBlue}" stroke-width="5" opacity="0.3"/>
  <!-- valve → front chamber -->
  <path d="M300,156 L330,156 L330,74 L432,74" fill="none" stroke="${C.airBlue}" stroke-width="5" opacity="0.3"/>
  <!-- valve → rear-L -->
  <path d="M300,156 L330,156 L330,148 L432,148" fill="none" stroke="${C.airBlue}" stroke-width="5" opacity="0.3"/>
  <!-- valve → rear-R -->
  <path d="M300,156 L330,156 L330,222 L432,222" fill="none" stroke="${C.airBlue}" stroke-width="5" opacity="0.3"/>
  <!-- tk2 → valve (secondary supply) -->
  <path d="M193,240 L214,240 L214,178 L265,178 L265,178" fill="none" stroke="${C.airBlue}" stroke-width="4" stroke-dasharray="6,4" opacity="0.25"/>

  <!-- ANIMATED FLOW PARTICLES (8 dots per route) -->
  <!-- Route 1: comp → tk1 -->
  <circle id="p1a" cx="94" cy="156" r="5" fill="${C.airBlue}" opacity="0"/>
  <circle id="p1b" cx="94" cy="156" r="5" fill="${C.airBlue}" opacity="0"/>
  <!-- Route 2: tk1 → valve -->
  <circle id="p2a" cx="193" cy="156" r="5" fill="${C.airBlue}" opacity="0"/>
  <circle id="p2b" cx="193" cy="156" r="5" fill="${C.airBlue}" opacity="0"/>
  <!-- Route 3: valve → front chamber -->
  <circle id="p3a" cx="300" cy="156" r="5" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <circle id="p3b" cx="300" cy="156" r="5" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <!-- Route 4: valve → rear-L -->
  <circle id="p4a" cx="300" cy="156" r="5" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <circle id="p4b" cx="300" cy="156" r="5" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <!-- Route 5: valve → rear-R -->
  <circle id="p5a" cx="300" cy="156" r="5" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <circle id="p5b" cx="300" cy="156" r="5" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>

  <!-- Labels -->
  <text x="57" y="200" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" data-label="1">ENGINE-DRIVEN</text>
  <text x="265" y="195" font-size="8" fill="${C.grayLt}" text-anchor="middle" data-label="1">PEDAL</text>
  <text x="265" y="205" font-size="8" fill="${C.grayLt}" text-anchor="middle" data-label="1">OPERATED</text>

  <!-- Pressure PSI display -->
  <rect x="190" y="272" width="170" height="36" rx="8"
        fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.3)" stroke-width="1.5"/>
  <text x="275" y="288" font-size="10" fill="${C.amberL}" text-anchor="middle" font-weight="700">Air Pressure:</text>
  <text id="s2-psi" x="275" y="302" font-size="13" fill="${C.amber}" text-anchor="middle" font-weight="800">0 PSI</text>
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
  const dur = 1.4 / spd;
  const del = 0.6 / spd;

  // Particles along each route
  function flow(id, path, delay) {
    const motionPath = typeof path === 'string'
      ? { path }
      : path;
    gsap.set(id, { opacity: 0 });
    tl.fromTo(id,
      { motionPath: { path: motionPath, start: 0 }, opacity: 0 },
      { motionPath: { path: motionPath, end: 1 }, opacity: 1,
        duration: dur, ease: 'none', repeat: -1, delay },
      delay
    );
  }

  // Animate pipe colour changes sequentially
  tl.to('#s2-comp', { stroke: C.amber, duration: 0.3 / spd })
    .to('#s2-valve', { stroke: C.airRed, duration: 0.4 / spd }, 0.4 / spd)
    .to(['#s2-bcFL','#s2-bcRL','#s2-bcRR'],
        { stroke: C.airRed, fill: 'rgba(239,68,68,0.18)', duration: 0.5 / spd }, 0.8 / spd);

  // Simple particle animations using x/y
  const routes = [
    { sel: '#p1a', x: 118, y: 156, delay: 0 },
    { sel: '#p1b', x: 118, y: 156, delay: 0.4 / spd },
    { sel: '#p2a', x: 230, y: 156, delay: 0.3 / spd },
    { sel: '#p2b', x: 230, y: 156, delay: 0.7 / spd },
    { sel: '#p3a', x: 432, y:  74, delay: 0.7 / spd },
    { sel: '#p3b', x: 432, y:  74, delay: 1.0 / spd },
    { sel: '#p4a', x: 432, y: 148, delay: 0.75 / spd },
    { sel: '#p4b', x: 432, y: 148, delay: 1.05 / spd },
    { sel: '#p5a', x: 432, y: 222, delay: 0.8 / spd },
    { sel: '#p5b', x: 432, y: 222, delay: 1.1 / spd },
  ];
  const starts = [
    { sel: '#p1a', sx: 94,  sy: 156 },
    { sel: '#p1b', sx: 94,  sy: 156 },
    { sel: '#p2a', sx: 193, sy: 156 },
    { sel: '#p2b', sx: 193, sy: 156 },
    { sel: '#p3a', sx: 300, sy: 156 },
    { sel: '#p3b', sx: 300, sy: 156 },
    { sel: '#p4a', sx: 300, sy: 156 },
    { sel: '#p4b', sx: 300, sy: 156 },
    { sel: '#p5a', sx: 300, sy: 156 },
    { sel: '#p5b', sx: 300, sy: 156 },
  ];
  routes.forEach((r, i) => {
    const s = starts[i];
    tl.fromTo(r.sel,
      { attr: { cx: s.sx, cy: s.sy }, opacity: 0 },
      { attr: { cx: r.x,  cy: r.y  }, opacity: 1,
        duration: 0.9 / spd, ease: 'none', repeat: -1, repeatDelay: 0.3 / spd },
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

  <!-- CHAMBER BODY (cylinder) -->
  <rect x="160" y="80" width="200" height="155" rx="12"
        fill="${C.grayDk}" stroke="${C.grayMid}" stroke-width="2.5"/>
  <!-- Chamber label -->
  <text x="260" y="108" font-size="10" fill="${C.grayLt}" text-anchor="middle"
        font-weight="700" data-label="1">BRAKE CHAMBER</text>

  <!-- INLET PORT (air enters from left) -->
  <rect x="128" y="138" width="32" height="22" rx="4"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2" id="s3-port"/>
  <text x="113" y="129" font-size="8" fill="${C.airBlueL}" text-anchor="middle"
        data-label="1">AIR</text>
  <text x="113" y="140" font-size="8" fill="${C.airBlueL}" text-anchor="middle"
        data-label="1">INLET</text>

  <!-- RETURN SPRING (right side, inside chamber) -->
  <path id="s3-spring"
        d="M310,150 L316,150 L320,142 L328,158 L336,142 L344,158 L352,142 L356,150 L360,150"
        fill="none" stroke="${C.spring}" stroke-width="3" stroke-linecap="round"/>

  <!-- DIAPHRAGM (vertical line inside chamber) -->
  <line id="s3-diaphragm" x1="285" y1="88" x2="285" y2="227"
        stroke="${C.grayLt}" stroke-width="10" stroke-linecap="round" opacity="0.9"/>
  <text x="285" y="248" font-size="8.5" fill="${C.grayLt}" text-anchor="middle"
        data-label="1">DIAPHRAGM</text>

  <!-- AIR FILL region (left of diaphragm) -->
  <rect id="s3-airfill" x="163" y="83" width="120" height="149" rx="10"
        fill="${C.airBlue}" opacity="0.12"/>

  <!-- PRESSURE ARROWS -->
  <line id="s3-parr1" x1="180" y1="149" x2="240" y2="149"
        stroke="${C.airRed}" stroke-width="3" marker-end="url(#arr-r)" opacity="0"/>
  <line id="s3-parr2" x1="180" y1="162" x2="240" y2="162"
        stroke="${C.airRed}" stroke-width="3" marker-end="url(#arr-r)" opacity="0"/>
  <line id="s3-parr3" x1="180" y1="175" x2="240" y2="175"
        stroke="${C.airRed}" stroke-width="3" marker-end="url(#arr-r)" opacity="0"/>

  <!-- PUSHROD -->
  <g id="s3-pushrod-grp">
    <rect id="s3-pushrod" x="285" y="145" width="110" height="24" rx="5"
          fill="${C.amber}" stroke="${C.amberL}" stroke-width="1.5"/>
    <text x="340" y="161" font-size="8.5" fill="#1a0800" text-anchor="middle"
          font-weight="700" data-label="1">PUSHROD</text>
    <!-- Clevis at end of pushrod -->
    <rect x="392" y="141" width="18" height="32" rx="4"
          fill="${C.grayLt}" stroke="${C.grayMid}" stroke-width="1.5"/>
    <circle cx="401" cy="157" r="5" fill="${C.gray}" stroke="${C.grayMid}" stroke-width="1.5"/>
  </g>

  <!-- SLACK ADJUSTER connection hint -->
  <rect x="405" y="120" width="60" height="80" rx="8"
        fill="${C.grayDk}" stroke="${C.amber}" stroke-width="1.5" opacity="0.7"/>
  <text x="435" y="155" font-size="8" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">SLACK</text>
  <text x="435" y="167" font-size="8" fill="${C.amberL}" text-anchor="middle"
        font-weight="700" data-label="1">ADJUSTER</text>

  <!-- DIRECTION ARROW (main) -->
  <line id="s3-main-arr" x1="230" y1="270" x2="420" y2="270"
        stroke="${C.amber}" stroke-width="3" marker-end="url(#arr-a)" opacity="0"/>
  <text id="s3-arr-lbl" x="325" y="290" font-size="9" fill="${C.amberL}"
        text-anchor="middle" data-label="1" opacity="0">Extension Direction</text>

  <!-- Labels -->
  <text x="128" y="200" font-size="8" fill="${C.spring}" text-anchor="middle"
        data-label="1">RETURN</text>
  <text x="128" y="211" font-size="8" fill="${C.spring}" text-anchor="middle"
        data-label="1">SPRING</text>
  <line x1="160" y1="150" x2="145" y2="195" stroke="${C.spring}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  `);
}

function animateS3() {
  killTl();
  tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 / spd, defaults: { ease: 'power2.inOut' } });

  // Air enters: port turns red
  tl.to('#s3-port',    { stroke: C.airRed, fill: 'rgba(239,68,68,0.2)', duration: 0.3 / spd })
    .to('#s3-airfill', { fill: C.airRed, opacity: 0.2, duration: 0.4 / spd }, 0)
    // Pressure arrows appear
    .to(['#s3-parr1','#s3-parr2','#s3-parr3'], { opacity: 1, duration: 0.2 / spd })
    // Diaphragm moves right
    .to('#s3-diaphragm', { x: 30, duration: 0.5 / spd }, 0.4 / spd)
    // Pushrod extends right
    .to('#s3-pushrod-grp', { x: 30, duration: 0.5 / spd }, 0.4 / spd)
    // Spring compresses (scale X from right)
    .to('#s3-spring', { scaleX: 0.65, transformOrigin: 'right center', duration: 0.5 / spd }, 0.4 / spd)
    // Show direction arrow
    .to(['#s3-main-arr','#s3-arr-lbl'], { opacity: 1, duration: 0.3 / spd }, 0.6 / spd)
    // Hold
    .to({}, { duration: 0.9 / spd })
    // Release — reverse
    .to(['#s3-diaphragm','#s3-pushrod-grp'], { x: 0, duration: 0.5 / spd })
    .to('#s3-spring', { scaleX: 1, transformOrigin: 'right center', duration: 0.5 / spd }, '<')
    .to('#s3-port', { stroke: C.airBlue, fill: C.grayDk, duration: 0.25 / spd }, '<')
    .to('#s3-airfill', { fill: C.airBlue, opacity: 0.12, duration: 0.3 / spd }, '<')
    .to(['#s3-parr1','#s3-parr2','#s3-parr3'], { opacity: 0, duration: 0.2 / spd }, '<')
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

  <!-- BRAKE CHAMBER (left) -->
  <rect x="20" y="150" width="100" height="62" rx="8"
        fill="${C.grayDk}" stroke="${C.grayMid}" stroke-width="2"/>
  <text x="70" y="177" font-size="9" fill="${C.grayLt}" text-anchor="middle" font-weight="700">BRAKE</text>
  <text x="70" y="189" font-size="9" fill="${C.grayLt}" text-anchor="middle" font-weight="700">CHAMBER</text>

  <!-- PUSHROD (extends right from chamber) -->
  <g id="s4-pushrod-grp">
    <rect id="s4-pushrod" x="120" y="170" width="90" height="20" rx="5"
          fill="${C.amber}" stroke="${C.amberL}" stroke-width="1.5"/>
    <text x="165" y="184" font-size="8" fill="#1a0800" text-anchor="middle"
          font-weight="700" data-label="1">PUSHROD</text>
    <!-- Clevis -->
    <rect x="206" y="165" width="14" height="30" rx="4"
          fill="${C.grayLt}" stroke="${C.grayMid}" stroke-width="1.5"/>
    <circle cx="213" cy="180" r="4.5" fill="${C.gray}" stroke="${C.grayMid}" stroke-width="1.5"/>
  </g>

  <!-- SLACK ADJUSTER ARM -->
  <g id="s4-slack-grp" style="transform-origin:270px 240px">
    <!-- Arm body -->
    <rect x="258" y="175" width="24" height="130" rx="8"
          fill="${C.truckBody}" stroke="${C.grayLt}" stroke-width="2.5"/>
    <!-- Pin at top (connects to pushrod) -->
    <circle cx="270" cy="180" r="8" fill="${C.grayDk}" stroke="${C.grayLt}" stroke-width="2"/>
    <circle cx="270" cy="180" r="3.5" fill="${C.grayLt}"/>
    <!-- Hub (S-cam shaft connection) -->
    <circle cx="270" cy="240" r="14" fill="${C.drum}" stroke="${C.grayLt}" stroke-width="2"/>
    <circle cx="270" cy="240" r="6" fill="${C.grayLt}"/>
  </g>

  <!-- CAM SHAFT -->
  <rect x="256" y="234" width="170" height="12" rx="6"
        fill="${C.grayMid}" stroke="${C.grayLt}" stroke-width="1.5"/>

  <!-- S-CAM (at far right of shaft) -->
  <g id="s4-cam-grp" style="transform-origin:390px 240px">
    <!-- Cam body — S shape represented as two lobes -->
    <ellipse cx="390" cy="224" rx="26" ry="14" fill="${C.grayLt}" opacity="0.9"/>
    <ellipse cx="390" cy="256" rx="26" ry="14" fill="${C.grayLt}" opacity="0.9"/>
    <rect x="384" y="225" width="12" height="30" fill="${C.drum}"/>
    <!-- Shaft centre -->
    <circle cx="390" cy="240" r="8" fill="${C.drum}" stroke="${C.grayLt}" stroke-width="2"/>
    <circle cx="390" cy="240" r="3" fill="${C.grayLt}"/>
    <!-- Rotation indicator arc -->
    <path id="s4-rot-arc"
          d="${arc(390,240,34,200,340)}"
          fill="none" stroke="${C.amber}" stroke-width="2.5"
          stroke-dasharray="6,4" opacity="0"/>
    <!-- Arrow on arc -->
    <circle id="s4-rot-dot" cx="${px(390,34,340).toFixed(1)}" cy="${py(240,34,340).toFixed(1)}"
            r="5" fill="${C.amber}" opacity="0"/>
  </g>

  <!-- DRUM HINT (partial circle, right edge) -->
  <path d="${arc(440,240,75,140,220,1)}"
        fill="none" stroke="${C.drum}" stroke-width="22" opacity="0.5"/>
  <text x="492" y="244" font-size="8" fill="${C.grayLt}" text-anchor="end"
        data-label="1">DRUM</text>

  <!-- SHOE HINTS -->
  <path id="s4-shoe-top"
        d="${arc(440,240,52,148,210,1)}"
        fill="none" stroke="${C.shoe}" stroke-width="14" stroke-linecap="round" opacity="0.8"/>
  <path id="s4-shoe-bot"
        d="${arc(440,240,52,150,212,0)}"
        fill="none" stroke="${C.shoe}" stroke-width="14" stroke-linecap="round" opacity="0.8"/>

  <!-- PUSHROD DIRECTION ARROW -->
  <line id="s4-arr" x1="125" y1="200" x2="205" y2="200"
        stroke="${C.amber}" stroke-width="2.5" marker-end="url(#arr-a)" opacity="0"/>

  <!-- Labels -->
  <text x="270" y="325" font-size="9" fill="${C.grayLt}" text-anchor="middle"
        data-label="1">SLACK ADJUSTER</text>
  <text x="390" y="325" font-size="9" fill="${C.grayLt}" text-anchor="middle"
        data-label="1">S-CAM</text>
  <line x1="270" y1="305" x2="270" y2="318" stroke="${C.grayLt}" stroke-width="1"
        stroke-dasharray="3,2" data-label="1"/>
  <line x1="390" y1="296" x2="390" y2="318" stroke="${C.grayLt}" stroke-width="1"
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
  // Top shoe arc: from 210° to 330° (centred at 270° = top in SVG)
  const topShoe  = arc(drumCx, drumCy, shoeR, 210, 330, 1);
  // Bottom shoe arc: from 30° to 150° (centred at 90° = bottom in SVG)
  const botShoe  = arc(drumCx, drumCy, shoeR, 30, 150, 1);

  return `
  <!-- DRUM outer (gray steel ring) -->
  <circle cx="${drumCx}" cy="${drumCy}" r="${drumR}"
          fill="${C.drumRing}" stroke="${C.grayMid}" stroke-width="2"/>
  <!-- DRUM inner contact surface -->
  <circle cx="${drumCx}" cy="${drumCy}" r="${innerR}"
          fill="${C.truckDark}" stroke="${C.drum}" stroke-width="2"/>

  <!-- BRAKE SHOES (thick arc strokes) -->
  <path id="ba-shoe-top" d="${topShoe}"
        fill="none" stroke="${C.shoe}" stroke-width="20" stroke-linecap="round"/>
  <path id="ba-shoe-bot" d="${botShoe}"
        fill="none" stroke="${C.shoe}" stroke-width="20" stroke-linecap="round"/>

  <!-- RETURN SPRINGS (connect the ends of the shoes) -->
  <line id="ba-spring-l"
        x1="${px(drumCx, shoeR, 210).toFixed(1)}" y1="${py(drumCy, shoeR, 210).toFixed(1)}"
        x2="${px(drumCx, shoeR, 150).toFixed(1)}" y2="${py(drumCy, shoeR, 150).toFixed(1)}"
        stroke="${C.spring}" stroke-width="4" stroke-dasharray="5,3"/>
  <line id="ba-spring-r"
        x1="${px(drumCx, shoeR, 330).toFixed(1)}" y1="${py(drumCy, shoeR, 330).toFixed(1)}"
        x2="${px(drumCx, shoeR,  30).toFixed(1)}" y2="${py(drumCy, shoeR,  30).toFixed(1)}"
        stroke="${C.spring}" stroke-width="4" stroke-dasharray="5,3"/>

  <!-- S-CAM (two lobes + centre) -->
  <g id="ba-cam" style="transform-origin:${drumCx}px ${drumCy}px">
    <ellipse cx="${drumCx - 4}" cy="${drumCy - 12}" rx="18" ry="10" fill="${C.grayLt}" opacity="0.9"/>
    <ellipse cx="${drumCx + 4}" cy="${drumCy + 12}" rx="18" ry="10" fill="${C.grayLt}" opacity="0.9"/>
    <rect x="${drumCx - 6}" y="${drumCy - 10}" width="12" height="20" fill="${C.drum}"/>
    <circle cx="${drumCx}" cy="${drumCy}" r="9" fill="${C.drum}" stroke="${C.grayLt}" stroke-width="2"/>
    <circle cx="${drumCx}" cy="${drumCy}" r="3.5" fill="${C.grayLt}"/>
  </g>

  <!-- CONTACT GLOW (hidden by default) -->
  <path id="ba-glow-top" d="${arc(drumCx, drumCy, innerR - 4, 210, 330, 1)}"
        fill="none" stroke="${C.airRed}" stroke-width="6" stroke-linecap="round"
        opacity="0" filter="url(#glow-r)"/>
  <path id="ba-glow-bot" d="${arc(drumCx, drumCy, innerR - 4, 30, 150, 1)}"
        fill="none" stroke="${C.airRed}" stroke-width="6" stroke-linecap="round"
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
  const cx = 190, cy = 195, r = 140;
  const innerR = r - 16;
  const shoeR  = r - 44;
  const hotR   = innerR - 4;

  el.innerHTML = svgWrap(500, 370, `
  <!-- Background -->
  <rect width="500" height="370" fill="${C.truckDark}" rx="12"/>
  <text x="250" y="28" font-size="13" fill="${C.amber}" text-anchor="middle"
        font-weight="800" data-label="1">Friction Slows the Wheel</text>

  <!-- SPINNING DRUM (with rim/tire) — main group for rotation -->
  <g id="s6-drum-outer" style="transform-origin:${cx}px ${cy}px">
    <!-- Tire ring -->
    <circle cx="${cx}" cy="${cy}" r="${r + 30}" fill="${C.road}" stroke="${C.grayMid}" stroke-width="3"/>
    <!-- Drum disc -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.drumRing}" stroke="${C.grayMid}" stroke-width="2.5"/>
    <!-- Hub spokes for rotation visibility -->
    ${[0,45,90,135,180,225,270,315].map(a =>
      `<line x1="${px(cx,18,a).toFixed(1)}" y1="${py(cy,18,a).toFixed(1)}"
             x2="${px(cx,r-20,a).toFixed(1)}" y2="${py(cy,r-20,a).toFixed(1)}"
             stroke="${C.grayMid}" stroke-width="3.5"/>`).join('')}
    <circle cx="${cx}" cy="${cy}" r="18" fill="${C.grayLt}"/>
    <!-- Hub bolts -->
    ${[0,60,120,180,240,300].map(a =>
      `<circle cx="${px(cx,r*.55,a).toFixed(1)}" cy="${py(cy,r*.55,a).toFixed(1)}"
               r="5" fill="${C.grayLt}"/>`).join('')}
  </g>

  <!-- STATIC inner: shoes + cam (don't rotate with drum) -->
  <!-- Drum inner surface -->
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${C.truckDark}" stroke="${C.drum}" stroke-width="2"/>

  <!-- BRAKE SHOES (applied — at contact) -->
  <path id="s6-shoe-top" d="${arc(cx, cy, innerR - 8, 210, 330, 1)}"
        fill="none" stroke="${C.shoeHot}" stroke-width="18" stroke-linecap="round"/>
  <path id="s6-shoe-bot" d="${arc(cx, cy, innerR - 8, 30, 150, 1)}"
        fill="none" stroke="${C.shoeHot}" stroke-width="18" stroke-linecap="round"/>

  <!-- HEAT GLOW at contact zones -->
  <path id="s6-heat-top" d="${arc(cx, cy, hotR, 215, 325, 1)}"
        fill="none" stroke="${C.airRed}" stroke-width="8" stroke-linecap="round"
        filter="url(#glow-r)" opacity="0.7"/>
  <path id="s6-heat-bot" d="${arc(cx, cy, hotR, 35, 145, 1)}"
        fill="none" stroke="${C.airRed}" stroke-width="8" stroke-linecap="round"
        filter="url(#glow-r)" opacity="0.7"/>

  <!-- S-CAM centre -->
  <circle cx="${cx}" cy="${cy}" r="22" fill="${C.drum}" stroke="${C.grayLt}" stroke-width="2"/>
  <text cx="${cx}" cy="${cy}" font-size="8" fill="${C.grayLt}" text-anchor="middle" dy="3"
        x="${cx}" y="${cy}">S-CAM</text>

  <!-- HEAT SPARKS (particles) -->
  <circle id="s6-sp1" cx="${px(cx,innerR+4,270).toFixed(1)}" cy="${py(cy,innerR+4,270).toFixed(1)}"
          r="4" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <circle id="s6-sp2" cx="${px(cx,innerR+4,278).toFixed(1)}" cy="${py(cy,innerR+4,278).toFixed(1)}"
          r="3" fill="${C.orange}" opacity="0" filter="url(#glow-r)"/>
  <circle id="s6-sp3" cx="${px(cx,innerR+4,90).toFixed(1)}" cy="${py(cy,innerR+4,90).toFixed(1)}"
          r="4" fill="${C.airRed}" opacity="0" filter="url(#glow-r)"/>
  <circle id="s6-sp4" cx="${px(cx,innerR+4,98).toFixed(1)}" cy="${py(cy,innerR+4,98).toFixed(1)}"
          r="3" fill="${C.orange}" opacity="0" filter="url(#glow-r)"/>

  <!-- SPEED INDICATOR -->
  <rect x="360" y="60" width="120" height="80" rx="10"
        fill="rgba(15,23,42,0.8)" stroke="${C.edge2}" stroke-width="1.5"/>
  <text x="420" y="83" font-size="9" fill="${C.muted}" text-anchor="middle"
        font-weight="700" data-label="1">WHEEL SPEED</text>
  <text id="s6-speed" x="420" y="115" font-size="24" fill="${C.amber}"
        text-anchor="middle" font-weight="800">100%</text>
  <text x="420" y="130" font-size="9" fill="${C.grayLt}" text-anchor="middle"
        data-label="1">→ decelerating</text>

  <!-- HEAT TEMPERATURE -->
  <rect x="360" y="158" width="120" height="70" rx="10"
        fill="rgba(15,23,42,0.8)" stroke="rgba(239,68,68,0.3)" stroke-width="1.5"/>
  <text x="420" y="179" font-size="9" fill="${C.airRedL}" text-anchor="middle"
        font-weight="700" data-label="1">DRUM TEMP.</text>
  <text id="s6-temp" x="420" y="210" font-size="18" fill="${C.airRed}"
        text-anchor="middle" font-weight="800">120°C</text>

  <!-- Labels -->
  <text x="${cx}" y="${cy + r + 48}" font-size="9" fill="${C.grayMid}"
        text-anchor="middle" data-label="1">Kinetic Energy → Heat (friction)</text>
  `);
}

function animateS6() {
  killTl();
  // Spin drum fast, then slow
  const drumEl = document.getElementById('s6-drum-outer');
  let rotDeg   = 0;
  let rpm      = 520;     // starting fast
  let speed    = 100;     // display %
  let temp     = 120;
  let frame;

  function step() {
    if (!document.getElementById('s6-drum-outer')) return;
    rpm   = Math.max(rpm - 1.8 * spd, 0);
    speed = Math.round(rpm / 5.2);
    temp  = Math.min(temp + 0.4 * spd, 320);
    rotDeg += rpm / 60;
    if (drumEl) drumEl.style.transform = `rotate(${rotDeg}deg)`;
    const spEl = $('s6-speed'); if (spEl) spEl.textContent = speed + '%';
    const tmpEl = $('s6-temp'); if (tmpEl) tmpEl.textContent = Math.round(temp) + '°C';
    if (rpm > 0) {
      frame = requestAnimationFrame(step);
    } else {
      // Restart loop
      setTimeout(() => {
        if (!document.getElementById('s6-drum-outer')) return;
        rpm = 520; speed = 100; temp = 120;
        frame = requestAnimationFrame(step);
      }, 1500);
    }
  }
  frame = requestAnimationFrame(step);

  // Heat glow pulsing
  tl = gsap.timeline({ defaults: { ease: 'sine.inOut' } });
  tl.to(['#s6-heat-top','#s6-heat-bot'], {
    opacity: 0.25, duration: 0.4 / spd, yoyo: true, repeat: -1, stagger: 0.2 / spd
  });
  // Spark particles
  const sparks = ['#s6-sp1','#s6-sp2','#s6-sp3','#s6-sp4'];
  sparks.forEach((sel, i) => {
    gsap.to(sel, {
      opacity: 1, duration: 0.15 / spd, yoyo: true, repeat: -1,
      delay: i * 0.12 / spd, repeatDelay: 0.3 / spd
    });
  });

  // Cleanup on scene change
  el._brakeCleanup = () => {
    cancelAnimationFrame(frame);
    rpm = 0;
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   SCENE 7 — RELEASE & RETURN SPRINGS
══════════════════════════════════════════════════════════════════════════ */
function renderS7(el) {
  const cx = 190, cy = 195, r = 120;
  const innerR = r - 14;
  const shoeR  = r - 38;

  el.innerHTML = svgWrap(500, 370, `
  <!-- Background -->
  <rect width="500" height="370" fill="${C.truckDark}" rx="12"/>
  <text x="250" y="28" font-size="13" fill="${C.amber}" text-anchor="middle"
        font-weight="800" data-label="1">Pedal Released — Springs Reset</text>

  <!-- DRUM -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.drumRing}" stroke="${C.grayMid}" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${C.truckDark}" stroke="${C.drum}" stroke-width="2"/>

  <!-- BRAKE SHOES (start applied, will retract) -->
  <path id="s7-shoe-top" d="${arc(cx, cy, innerR - 8, 210, 330, 1)}"
        fill="none" stroke="${C.shoeHot}" stroke-width="18" stroke-linecap="round"/>
  <path id="s7-shoe-bot" d="${arc(cx, cy, innerR - 8, 30, 150, 1)}"
        fill="none" stroke="${C.shoeHot}" stroke-width="18" stroke-linecap="round"/>

  <!-- S-CAM -->
  <g id="s7-cam" style="transform-origin:${cx}px ${cy}px">
    <ellipse cx="${cx - 4}" cy="${cy - 10}" rx="16" ry="9" fill="${C.grayLt}" opacity="0.9"/>
    <ellipse cx="${cx + 4}" cy="${cy + 10}" rx="16" ry="9" fill="${C.grayLt}" opacity="0.9"/>
    <rect x="${cx - 5}" y="${cx - 8}" width="10" height="18" fill="${C.drum}"/>
    <circle cx="${cx}" cy="${cy}" r="9" fill="${C.drum}" stroke="${C.grayLt}" stroke-width="2"/>
  </g>

  <!-- RETURN SPRING ARROWS (show springs pulling back) -->
  <line id="s7-sp-l" x1="${px(cx,shoeR,150).toFixed(1)}" y1="${py(cy,shoeR,150).toFixed(1)}"
        x2="${px(cx,shoeR,210).toFixed(1)}" y2="${py(cy,shoeR,210).toFixed(1)}"
        stroke="${C.spring}" stroke-width="5" stroke-dasharray="6,3"
        marker-end="url(#arr-b)" opacity="0"/>
  <line id="s7-sp-r" x1="${px(cx,shoeR,30).toFixed(1)}" y1="${py(cy,shoeR,30).toFixed(1)}"
        x2="${px(cx,shoeR,330).toFixed(1)}" y2="${py(cy,shoeR,330).toFixed(1)}"
        stroke="${C.spring}" stroke-width="5" stroke-dasharray="6,3"
        marker-end="url(#arr-b)" opacity="0"/>

  <!-- BRAKE CHAMBER + PUSHROD (right side) -->
  <rect x="355" y="170" width="100" height="52" rx="8"
        fill="${C.grayDk}" stroke="${C.grayMid}" stroke-width="2"/>
  <text x="405" y="193" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" font-weight="700">BRAKE</text>
  <text x="405" y="205" font-size="8.5" fill="${C.grayLt}" text-anchor="middle" font-weight="700">CHAMBER</text>
  <rect id="s7-pushrod" x="328" y="188" width="30" height="16" rx="5"
        fill="${C.amber}" stroke="${C.amberL}" stroke-width="1.5"/>

  <!-- EXHAUST PORT (air exhausting) -->
  <rect id="s7-exhaust" x="354" y="148" width="18" height="22" rx="4"
        fill="${C.grayDk}" stroke="${C.airBlue}" stroke-width="2"/>
  <!-- Exhaust air arrows going up -->
  <line id="s7-ea1" x1="360" y1="145" x2="356" y2="125"
        stroke="${C.airBlue}" stroke-width="2.5" marker-end="url(#arr-b)" opacity="0"/>
  <line id="s7-ea2" x1="370" y1="145" x2="370" y2="122"
        stroke="${C.airBlue}" stroke-width="2.5" marker-end="url(#arr-b)" opacity="0"/>
  <text id="s7-ea-txt" x="363" y="115" font-size="8" fill="${C.airBlueL}"
        text-anchor="middle" data-label="1" opacity="0">AIR EXHAUST</text>

  <!-- PEDAL indicator (top right) -->
  <rect x="368" y="270" width="112" height="68" rx="10"
        fill="rgba(15,23,42,0.8)" stroke="rgba(245,158,11,0.3)" stroke-width="1.5"/>
  <text x="424" y="293" font-size="9" fill="${C.muted}" text-anchor="middle"
        font-weight="700" data-label="1">BRAKE PEDAL</text>
  <text id="s7-pedal-stat" x="424" y="318" font-size="14" fill="${C.amber}"
        text-anchor="middle" font-weight="800">PRESSED</text>

  <!-- WHEEL FREE indicator -->
  <rect id="s7-free-box" x="368" y="55" width="112" height="68" rx="10"
        fill="rgba(15,23,42,0.8)" stroke="rgba(34,197,94,0.15)" stroke-width="1.5"/>
  <text x="424" y="80" font-size="9" fill="${C.muted}" text-anchor="middle"
        font-weight="700" data-label="1">WHEEL STATUS</text>
  <text id="s7-wheel-stat" x="424" y="108" font-size="13" fill="${C.grayLt}"
        text-anchor="middle" font-weight="800">BRAKING</text>

  <!-- Labels -->
  <text x="${cx}" y="${cy + r + 24}" font-size="9" fill="${C.grayMid}"
        text-anchor="middle" data-label="1">DRUM</text>
  <text x="${cx - r - 8}" y="${cy + 4}" font-size="8.5" fill="${C.spring}"
        text-anchor="end" data-label="1">RETURN</text>
  <text x="${cx - r - 8}" y="${cy + 16}" font-size="8.5" fill="${C.spring}"
        text-anchor="end" data-label="1">SPRINGS</text>
  `);
}

function animateS7() {
  killTl();
  tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 / spd, defaults: { ease: 'power2.inOut' } });

  // Start: brakes applied → release sequence
  // Air exhausts
  tl.to(['#s7-ea1','#s7-ea2','#s7-ea-txt'], { opacity: 1, duration: 0.3 / spd })
    .to('#s7-exhaust', { stroke: C.airBlue, fill: 'rgba(59,130,246,0.18)', duration: 0.25 / spd }, '<')
    // Cam returns
    .to('#s7-cam', { rotation: -30, transformOrigin: `${190}px ${195}px`, duration: 0.5 / spd }, 0.2 / spd)
    // Pushrod retracts
    .to('#s7-pushrod', { x: 28, duration: 0.5 / spd }, 0.2 / spd)
    // Return springs appear, pull shoes back
    .to(['#s7-sp-l','#s7-sp-r'], { opacity: 1, duration: 0.25 / spd }, 0.4 / spd)
    .to(['#s7-shoe-top'], {
      attr: { stroke: C.shoe, 'd': arc(190, 195, 78, 210, 330, 1) },
      duration: 0.45 / spd
    }, 0.5 / spd)
    .to(['#s7-shoe-bot'], {
      attr: { stroke: C.shoe, 'd': arc(190, 195, 78, 30, 150, 1) },
      duration: 0.45 / spd
    }, 0.5 / spd)
    // Update status text
    .call(() => {
      const ps = $('s7-pedal-stat'); if (ps) { ps.textContent = 'RELEASED'; ps.setAttribute('fill', C.green); }
      const ws = $('s7-wheel-stat'); if (ws) { ws.textContent = 'FREE'; ws.setAttribute('fill', C.spring); }
      const fb = $('s7-free-box');   if (fb) { fb.setAttribute('stroke', 'rgba(34,197,94,0.4)'); }
    }, [], 0.7 / spd)
    // Hold released state
    .to({}, { duration: 1.0 / spd })
    // Reset (back to braking start for loop)
    .to(['#s7-shoe-top'], {
      attr: { stroke: C.shoeHot, 'd': arc(190, 195, 92, 210, 330, 1) },
      duration: 0.4 / spd
    })
    .to(['#s7-shoe-bot'], {
      attr: { stroke: C.shoeHot, 'd': arc(190, 195, 92, 30, 150, 1) },
      duration: 0.4 / spd
    }, '<')
    .to('#s7-cam', { rotation: 0, duration: 0.4 / spd }, '<')
    .to('#s7-pushrod', { x: 0, duration: 0.4 / spd }, '<')
    .to(['#s7-ea1','#s7-ea2','#s7-ea-txt'], { opacity: 0, duration: 0.25 / spd }, '<')
    .to(['#s7-sp-l','#s7-sp-r'], { opacity: 0, duration: 0.25 / spd }, '<')
    .call(() => {
      const ps = $('s7-pedal-stat'); if (ps) { ps.textContent = 'PRESSED'; ps.setAttribute('fill', C.amber); }
      const ws = $('s7-wheel-stat'); if (ws) { ws.textContent = 'BRAKING'; ws.setAttribute('fill', C.grayLt); }
      const fb = $('s7-free-box');   if (fb) { fb.setAttribute('stroke', 'rgba(34,197,94,0.15)'); }
    }, [], 2.8 / spd);
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
    goTo(curScene); // replay with new speed
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

  // Init
  goTo(0);
});
