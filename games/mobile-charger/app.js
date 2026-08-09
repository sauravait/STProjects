/* ─────────────────────────────────────────────────────────────────
   Mobile Charger – app.js
   Physics animations: bg canvas · SMPS circuit · rectifier waveform ·
   voltage-reg feedback · Li-ion intercalation · CC/CV chart · quiz
───────────────────────────────────────────────────────────────── */

'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ════════════════════════════════════════════════════════════════
   1. BACKGROUND CANVAS – floating circuit dots
════════════════════════════════════════════════════════════════ */
(function initBgCanvas() {
  const canvas = $('#bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  const DOTS = Array.from({ length: 40 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 1 + Math.random() * 2,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    alpha: 0.1 + Math.random() * 0.2,
    hue: 260 + Math.random() * 60,
  }));

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < DOTS.length; i++) {
      for (let j = i + 1; j < DOTS.length; j++) {
        const dx = (DOTS[i].x - DOTS[j].x) * W;
        const dy = (DOTS[i].y - DOTS[j].y) * H;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(DOTS[i].x * W, DOTS[i].y * H);
          ctx.lineTo(DOTS[j].x * W, DOTS[j].y * H);
          ctx.strokeStyle = `rgba(124,58,237,${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    DOTS.forEach(d => {
      ctx.beginPath();
      ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${d.hue},70%,65%,${d.alpha})`;
      ctx.fill();
      d.x += d.vx / W; d.y += d.vy / H;
      if (d.x < 0 || d.x > 1) d.vx *= -1;
      if (d.y < 0 || d.y > 1) d.vy *= -1;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();


/* ════════════════════════════════════════════════════════════════
   2. SCENE NAVIGATION
════════════════════════════════════════════════════════════════ */
const TOTAL_SCENES = 7;
let currentScene = 1;

const scenes     = $$('.scene');
const btnPrev    = $('#btn-prev');
const btnNext    = $('#btn-next');
const dotNav     = $('#dot-nav');
const progFill   = $('#progress-fill');
const sceneLabel = $('#scene-label');

function syncAnimations() {
  const smpsCanvas    = $('#smps-canvas');
  const rectCanvas    = $('#rect-canvas');
  const vregCanvas    = $('#vreg-canvas');
  const battCanvas    = $('#battery-canvas');
  const fastCanvas    = $('#fast-canvas');

  if (smpsCanvas  && smpsCanvas._start  && smpsCanvas._stop)
    currentScene === 2 ? smpsCanvas._start()  : smpsCanvas._stop();
  if (rectCanvas  && rectCanvas._start  && rectCanvas._stop)
    currentScene === 3 ? rectCanvas._start()  : rectCanvas._stop();
  if (vregCanvas  && vregCanvas._start  && vregCanvas._stop)
    currentScene === 4 ? vregCanvas._start()  : vregCanvas._stop();
  if (battCanvas  && battCanvas._start  && battCanvas._stop)
    currentScene === 5 ? battCanvas._start()  : battCanvas._stop();
  if (fastCanvas  && fastCanvas._start  && fastCanvas._stop)
    currentScene === 6 ? fastCanvas._start()  : fastCanvas._stop();
}

for (let i = 1; i <= TOTAL_SCENES; i++) {
  const btn = document.createElement('button');
  btn.className = 'dot' + (i === 1 ? ' active' : '');
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-label', `Scene ${i}`);
  btn.addEventListener('click', () => goTo(i));
  dotNav.appendChild(btn);
}

function updateNextBtn(n) {
  btnNext.innerHTML = n === TOTAL_SCENES
    ? '<span>Finish</span>'
    : '<span>Next</span><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function goTo(n) {
  if (n < 1 || n > TOTAL_SCENES) return;
  scenes.forEach(s => {
    const sn = +s.dataset.scene;
    s.classList.toggle('hidden', sn !== n);
  });
  $$('.dot', dotNav).forEach((d, i) => d.classList.toggle('active', i + 1 === n));
  btnPrev.disabled = n === 1;
  btnNext.disabled = n === TOTAL_SCENES;
  progFill.style.width = `${(n / TOTAL_SCENES) * 100}%`;
  progFill.setAttribute('aria-valuenow', n);
  sceneLabel.textContent = `${n} / ${TOTAL_SCENES}`;
  currentScene = n;
  syncAnimations();
  updateNextBtn(n);
}

btnPrev.addEventListener('click', () => goTo(currentScene - 1));
btnNext.addEventListener('click', () => {
  if (currentScene < TOTAL_SCENES) goTo(currentScene + 1);
});
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentScene + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(currentScene - 1);
});
goTo(1);


/* ════════════════════════════════════════════════════════════════
   3. SCENE 2 – SMPS Circuit Animation
   Draws 5 labelled component blocks with real circuit symbols
   and animated energy packets flowing left→right.
════════════════════════════════════════════════════════════════ */
(function initSmpsCanvas() {
  const canvas = $('#smps-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let phase = 0;

  canvas._start = function () {
    if (running) return;
    running = true;
    resize();
    draw();
  };
  canvas._stop = function () { running = false; cancelAnimationFrame(raf); };

  function resize() {
    W = canvas.width  = canvas.offsetWidth  * devicePixelRatio;
    H = canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
  }
  window.addEventListener('resize', () => { if (running) resize(); });

  /* Draw component block with SVG-style symbol inside */
  function drawBlock(x, y, w, h, strokeColor, fillRGBA, symbol, label1, label2) {
    // glow
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = fillRGBA;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // symbol (small icon top-half)
    ctx.fillStyle = strokeColor;
    ctx.font = `${Math.min(18, w * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x + w / 2, y + h * 0.36);

    // label lines
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 ${Math.min(8, w * 0.145)}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(label1, x + w / 2, y + h * 0.65);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.min(7, w * 0.13)}px sans-serif`;
    ctx.fillText(label2, x + w / 2, y + h * 0.82);
  }

  /* Draw animated energy packets between two blocks */
  function drawPackets(x1, x2, y, color, phaseOffset) {
    const wireY = y;
    ctx.beginPath();
    ctx.moveTo(x1, wireY);
    ctx.lineTo(x2, wireY);
    ctx.strokeStyle = 'rgba(148,163,184,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // arrowhead
    ctx.beginPath();
    ctx.moveTo(x2 - 7, wireY - 4);
    ctx.lineTo(x2 - 1, wireY);
    ctx.lineTo(x2 - 7, wireY + 4);
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3 dots flowing
    for (let d = 0; d < 3; d++) {
      let t = (phase * 1.2 + d / 3 + phaseOffset) % 1;
      const px = x1 + t * (x2 - x1);
      ctx.beginPath();
      ctx.arc(px, wireY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.016;

    // Layout: 5 blocks across width
    const N    = 5;
    const bh   = Math.min(H * 0.55, 140);
    const bw   = (W - 20) / (N + (N - 1) * 0.3);  // blocks + gaps
    const gap  = bw * 0.3;
    const y0   = (H - bh) / 2;

    const BLOCKS = [
      { sym: '〜', l1: 'EMI Filter',  l2: 'LC Network',    color: 'rgba(148,163,184,0.7)',  fill: 'rgba(30,41,59,0.6)',    pc: '230V AC' },
      { sym: '⟺', l1: 'Rectifier',   l2: '4 Diodes',      color: 'rgba(124,58,237,0.85)',  fill: 'rgba(20,10,50,0.6)',    pc: 'Pulsed DC' },
      { sym: '⚡', l1: 'PWM Switch',  l2: 'MOSFET ~100kHz', color: 'rgba(245,158,11,0.85)', fill: 'rgba(40,25,5,0.6)',     pc: 'HF AC' },
      { sym: '🌀', l1: 'HF Xfmr',    l2: 'Ferrite Core',  color: 'rgba(16,185,129,0.85)',  fill: 'rgba(5,30,20,0.6)',     pc: '~8V AC' },
      { sym: '✔', l1: 'Output',      l2: 'Diode + Cap',   color: 'rgba(74,222,128,0.85)',  fill: 'rgba(5,25,15,0.6)',     pc: '5V DC' },
    ];

    // Draw wires + packets between blocks
    BLOCKS.forEach((b, i) => {
      const bx = 10 + i * (bw + gap);
      b._x = bx;
      if (i < BLOCKS.length - 1) {
        const nx = bx + bw + gap;
        drawPackets(bx + bw, nx, y0 + bh / 2, BLOCKS[i + 1].color, i * 0.22);
      }
    });

    // Draw blocks on top
    BLOCKS.forEach((b, i) => {
      drawBlock(b._x, y0, bw, bh, b.color, b.fill, b.sym, b.l1, b.l2);
    });

    // Voltage labels below blocks
    BLOCKS.forEach((b, i) => {
      const bx = b._x;
      ctx.fillStyle = b.color;
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(b.pc, bx + bw / 2, y0 + bh + 8);
    });

    // Voltage transformation arc label at top
    ctx.fillStyle = 'rgba(200,200,220,0.45)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Energy flows →  Voltage steps down  →  Power loss < 10%', W / 2, y0 - 6);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   4. SCENE 3 – Rectifier waveform canvas
════════════════════════════════════════════════════════════════ */
(function initRectCanvas() {
  const canvas = $('#rect-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let phase = 0;

  canvas._start = function () {
    if (running) return;
    running = true;
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    draw();
  };
  canvas._stop = function () { running = false; cancelAnimationFrame(raf); };

  function drawWave(color, fn, yOffset, lineWidth) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    for (let x = 0; x <= W; x += 2) {
      const t = (x / W) * Math.PI * 4 + phase;
      const y = yOffset + fn(t) * (H * 0.13);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.04;

    const y1 = H * 0.22, y2 = H * 0.52, y3 = H * 0.80;

    // AC input (sine)
    drawWave('rgba(124,58,237,0.85)', t => Math.sin(t),             y1, 2);
    // Full-wave rectified (abs value of sine – simulates bridge)
    drawWave('rgba(245,158,11,0.85)', t => Math.abs(Math.sin(t)),   y2, 2);
    // Smoothed DC (slight ripple)
    drawWave('rgba(16,185,129,0.85)', t => 0.65 + Math.sin(t*2)*0.05, y3, 2.5);

    // labels
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(124,58,237,0.85)'; ctx.fillText('AC Input  (230 V)', 8, y1 - 14);
    ctx.fillStyle = 'rgba(245,158,11,0.85)'; ctx.fillText('Full-wave Rectified', 8, y2 - 14);
    ctx.fillStyle = 'rgba(16,185,129,0.85)'; ctx.fillText('Smoothed DC  (5 V)', 8, y3 - 14);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   5. SCENE 4 – Voltage Regulation Feedback Animation
   Shows: Vout → divider → error amp → optocoupler → PWM → MOSFET
   with pulsing signal flowing around the feedback loop
════════════════════════════════════════════════════════════════ */
(function initVregCanvas() {
  const canvas = $('#vreg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let phase = 0;
  // Simulate a disturbance: output wobbles, feedback corrects it
  let vout = 5.0;        // regulated output voltage
  let duty = 0.5;        // PWM duty

  canvas._start = function () {
    if (running) return;
    running = true;
    resize();
    draw();
  };
  canvas._stop = function () { running = false; cancelAnimationFrame(raf); };

  function resize() {
    W = canvas.width  = canvas.offsetWidth  * devicePixelRatio;
    H = canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
  }
  window.addEventListener('resize', () => { if (running) resize(); });

  function drawNode(label, x, y, w, h, color, icon) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = `${color}18`;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 7);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = color;
    ctx.font        = `${Math.min(16, w * 0.3)}px sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x + w / 2, y + h * 0.33);
    ctx.fillStyle   = '#e2e8f0';
    ctx.font        = `600 ${Math.min(9, w * 0.16)}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h * 0.72);
  }

  function animDot(path, t, color) {
    // path = array of {x,y} waypoints; t = [0,1] along total path
    if (path.length < 2) return;
    const total = path.length - 1;
    const seg   = Math.min(total - 1, Math.floor(t * total));
    const frac  = (t * total) - seg;
    const p0    = path[seg], p1 = path[seg + 1];
    if (!p0 || !p1) return;
    const px = p0.x + (p1.x - p0.x) * frac;
    const py = p0.y + (p1.y - p0.y) * frac;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.02;

    // Simulate minor load disturbance
    const disturbance = Math.sin(phase * 0.4) * 0.3;
    const target = 5.0;
    vout = target + disturbance * 0.15;
    duty = 0.5 + (target - vout) * 0.3;

    // Layout nodes
    const bw = W * 0.16, bh = H * 0.24;
    const row1Y = H * 0.12;   // primary side (top row)
    const row2Y = H * 0.62;   // secondary side / feedback (bottom)

    const NODES = {
      mains:  { x: W * 0.04, y: row1Y, label: 'MAINS', icon: '〜',  col: 'rgba(148,163,184,0.9)' },
      mosfet: { x: W * 0.26, y: row1Y, label: 'MOSFET', icon: '📶', col: 'rgba(245,158,11,0.9)' },
      xfmr:   { x: W * 0.50, y: row1Y, label: 'Xfmr',  icon: '🌀',  col: 'rgba(16,185,129,0.9)' },
      vout:   { x: W * 0.73, y: row1Y, label: 'Vout',  icon: '⚡',  col: 'rgba(74,222,128,0.9)' },
      div:    { x: W * 0.73, y: row2Y, label: 'Divider', icon: '÷', col: 'rgba(167,139,250,0.9)' },
      amp:    { x: W * 0.50, y: row2Y, label: 'Error Amp', icon: '△', col: 'rgba(251,191,36,0.9)' },
      opto:   { x: W * 0.26, y: row2Y, label: 'Opto', icon: '💡', col: 'rgba(249,115,22,0.9)' },
      pwm:    { x: W * 0.04, y: row2Y, label: 'PWM IC', icon: '🎛️', col: 'rgba(59,130,246,0.9)' },
    };

    // Draw wires (forward path top, feedback path bottom, verticals)
    const wires = [
      // forward
      [NODES.mains,  NODES.mosfet],
      [NODES.mosfet, NODES.xfmr],
      [NODES.xfmr,   NODES.vout],
      // feedback
      [NODES.vout,   NODES.div],
      [NODES.div,    NODES.amp],
      [NODES.amp,    NODES.opto],
      [NODES.opto,   NODES.pwm],
      [NODES.pwm,    NODES.mosfet],
    ];

    ctx.setLineDash([4, 4]);
    wires.forEach(([a, b]) => {
      const ax = a.x + bw, ay = a.y + bh / 2;
      const bx = b.x,      by = b.y + bh / 2;
      ctx.beginPath();
      // handle vertical segments (vout → div, pwm → mosfet)
      if (Math.abs(ax - bx) < 5) {
        ctx.moveTo(a.x + bw / 2, a.y + bh);
        ctx.lineTo(b.x + bw / 2, b.y);
      } else {
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.strokeStyle = 'rgba(100,116,139,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw nodes
    Object.values(NODES).forEach(n => drawNode(n.label, n.x, n.y, bw, bh, n.col, n.icon));

    // Animated signal dots: forward path (yellow) + feedback path (purple)
    const fwdPath = [
      { x: NODES.mains.x + bw,  y: NODES.mains.y  + bh/2 },
      { x: NODES.mosfet.x,      y: NODES.mosfet.y + bh/2 },
      { x: NODES.mosfet.x + bw, y: NODES.mosfet.y + bh/2 },
      { x: NODES.xfmr.x,        y: NODES.xfmr.y  + bh/2 },
      { x: NODES.xfmr.x + bw,   y: NODES.xfmr.y  + bh/2 },
      { x: NODES.vout.x,        y: NODES.vout.y  + bh/2 },
    ];
    const fbkPath = [
      { x: NODES.vout.x  + bw/2, y: NODES.vout.y  + bh },
      { x: NODES.div.x   + bw/2, y: NODES.div.y },
      { x: NODES.div.x   + bw,   y: NODES.div.y  + bh/2 },
      { x: NODES.amp.x,          y: NODES.amp.y  + bh/2 },
      { x: NODES.amp.x   + bw,   y: NODES.amp.y  + bh/2 },
      { x: NODES.opto.x,         y: NODES.opto.y + bh/2 },
      { x: NODES.opto.x  + bw,   y: NODES.opto.y + bh/2 },
      { x: NODES.pwm.x,          y: NODES.pwm.y  + bh/2 },
      { x: NODES.pwm.x   + bw/2, y: NODES.pwm.y },
      { x: NODES.mosfet.x+ bw/2, y: NODES.mosfet.y + bh },
    ];

    for (let d = 0; d < 3; d++) {
      animDot(fwdPath, (phase * 0.5 + d / 3) % 1, 'rgba(245,158,11,0.9)');
      animDot(fbkPath, (phase * 0.4 + d / 3) % 1, 'rgba(167,139,250,0.9)');
    }

    // Vout readout
    ctx.fillStyle = 'rgba(74,222,128,0.9)';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`V_out = ${vout.toFixed(2)} V`, NODES.vout.x + bw / 2, NODES.vout.y + bh + 6);

    // Duty readout
    ctx.fillStyle = 'rgba(59,130,246,0.85)';
    ctx.font = '10px monospace';
    ctx.fillText(`Duty = ${(duty * 100).toFixed(0)}%`, NODES.pwm.x + bw / 2, NODES.pwm.y + bh + 6);

    // Isolation boundary
    const isoY = (row1Y + bh + row2Y) / 2;
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(W * 0.18, isoY);
    ctx.lineTo(W * 0.88, isoY);
    ctx.strokeStyle = 'rgba(251,191,36,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(251,191,36,0.35)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⬆ Primary (HV)  ·  Secondary (LV) ⬇', W * 0.88, isoY - 3);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   6. SCENE 5 – Li-ion Intercalation Canvas
   Shows anode (graphite) | electrolyte | cathode (LiCoO₂)
   Li⁺ ions animate from cathode → anode during charging
   Electrons shown in external circuit
════════════════════════════════════════════════════════════════ */
(function initBattCanvas() {
  const canvas = $('#battery-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let phase = 0;
  let chargeLevel = 0;  // 0 → 1

  canvas._start = function () {
    if (running) return;
    running = true;
    chargeLevel = 0;
    phase = 0;
    resize();
    draw();
  };
  canvas._stop = function () { running = false; cancelAnimationFrame(raf); };

  function resize() {
    W = canvas.width  = canvas.offsetWidth  * devicePixelRatio;
    H = canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
  }
  window.addEventListener('resize', () => { if (running) resize(); });

  function drawGraphiteLayers(x, y, w, h, fill) {
    // draw stacked graphite-like layers
    const layers = 8;
    const lh = h / layers;
    for (let i = 0; i < layers; i++) {
      const ly = y + i * lh;
      const liLevel = fill;                              // 0–1 how full
      const liLayerFill = Math.min(1, (liLevel * layers - i));
      const a = Math.max(0, Math.min(1, liLayerFill));

      ctx.fillStyle = `rgba(30,40,60,0.9)`;
      ctx.fillRect(x, ly + 1, w, lh - 2);
      // graphene-style line
      ctx.strokeStyle = 'rgba(99,102,241,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, ly + lh / 2);
      ctx.lineTo(x + w, ly + lh / 2);
      ctx.stroke();
      // Li fill indicator
      if (a > 0) {
        ctx.fillStyle = `rgba(99,102,241,${a * 0.55})`;
        ctx.fillRect(x + 2, ly + 2, (w - 4) * a, lh - 4);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.022;

    // slow charge level increase (loops)
    chargeLevel = (chargeLevel + 0.0008) % 1.0;

    const margin = 16;
    const cellH  = H * 0.62;
    const cellY  = (H - cellH) / 2;
    const thirds = (W - margin * 2) / 3;

    const anodeX  = margin;
    const elecX   = margin + thirds;
    const cathodX = margin + thirds * 2;
    const colW    = thirds;

    // ── Anode (graphite) ──
    drawGraphiteLayers(anodeX, cellY, colW - 4, cellH, chargeLevel);
    ctx.strokeStyle = 'rgba(99,102,241,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(anodeX, cellY, colW - 4, cellH);
    ctx.fillStyle = 'rgba(129,140,248,0.85)';
    ctx.font = `bold ${Math.min(10, colW * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ANODE', anodeX + (colW - 4) / 2, cellY - 8);
    ctx.fillStyle = 'rgba(129,140,248,0.55)';
    ctx.font = `${Math.min(8, colW * 0.12)}px sans-serif`;
    ctx.fillText('Graphite (C)', anodeX + (colW - 4) / 2, cellY - 20);

    // ── Electrolyte ──
    ctx.fillStyle = 'rgba(6,182,212,0.07)';
    ctx.fillRect(elecX, cellY, colW - 2, cellH);
    ctx.strokeStyle = 'rgba(6,182,212,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(elecX, cellY, colW - 2, cellH);
    ctx.fillStyle = 'rgba(6,182,212,0.45)';
    ctx.font = `bold ${Math.min(9, colW * 0.14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ELECTROLYTE', elecX + (colW - 2) / 2, cellY - 8);
    ctx.fillStyle = 'rgba(6,182,212,0.35)';
    ctx.font = `${Math.min(8, colW * 0.12)}px sans-serif`;
    ctx.fillText('LiPF₆ / organic', elecX + (colW - 2) / 2, cellY - 20);

    // ── Cathode (LiCoO₂) ──
    const cathoFill = 1 - chargeLevel;
    const catGrad = ctx.createLinearGradient(cathodX, cellY, cathodX, cellY + cellH);
    catGrad.addColorStop(0,   `rgba(245,158,11,${0.15 + cathoFill * 0.4})`);
    catGrad.addColorStop(1,   `rgba(217,119,6,${0.2 + cathoFill * 0.4})`);
    ctx.fillStyle = catGrad;
    ctx.fillRect(cathodX + 4, cellY, colW - 4, cellH);
    ctx.strokeStyle = 'rgba(245,158,11,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cathodX + 4, cellY, colW - 4, cellH);

    // crystal lattice lines in cathode
    for (let r = 0; r < 8; r++) {
      const ry = cellY + (r / 8) * cellH;
      ctx.beginPath();
      ctx.moveTo(cathodX + 4, ry);
      ctx.lineTo(cathodX + colW, ry);
      ctx.strokeStyle = `rgba(251,191,36,${0.12 + cathoFill * 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(245,158,11,0.85)';
    ctx.font = `bold ${Math.min(10, colW * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('CATHODE', cathodX + 4 + (colW - 4) / 2, cellY - 8);
    ctx.fillStyle = 'rgba(245,158,11,0.55)';
    ctx.font = `${Math.min(8, colW * 0.12)}px sans-serif`;
    ctx.fillText('LiCoO₂', cathodX + 4 + (colW - 4) / 2, cellY - 20);

    // ── Li⁺ ions traversing electrolyte ──
    const ION_COUNT = 7;
    for (let i = 0; i < ION_COUNT; i++) {
      // ions move from cathode → anode (right → left) during charging
      const t = ((phase * 0.6 + i / ION_COUNT) % 1);
      // path: starts at cathode left edge, ends at anode right edge
      // travel distance = cathode left to anode right ≈ thirds + 8px (padding offsets)
      const ionX = cathodX + 4 - t * (thirds + 8);
      const ionY = cellY + 10 + (i / ION_COUNT) * (cellH - 20);
      // only draw while in electrolyte region
      if (ionX >= anodeX + colW - 4 && ionX <= cathodX + 4) {
        const alpha = 0.5 + 0.5 * Math.sin(phase * 3 + i);
        ctx.beginPath();
        ctx.arc(ionX, ionY, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${alpha * 0.9})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(34,211,238,0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Li⁺ label
        ctx.fillStyle = '#f0f9ff';
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Li⁺', ionX, ionY);
        ctx.textBaseline = 'alphabetic';
      }
    }

    // ── Electrons in external circuit (top arc) ──
    const arcY = cellY - 36;
    ctx.beginPath();
    ctx.arc(W / 2, arcY, W / 3.5, Math.PI + 0.1, Math.PI * 2 - 0.1);
    ctx.strokeStyle = 'rgba(251,191,36,0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    // electron dots along arc
    for (let e = 0; e < 4; e++) {
      const et = (phase * 0.5 + e / 4) % 1;
      const eAngle = Math.PI + 0.1 + et * (Math.PI - 0.2);
      const ex = W / 2 + Math.cos(eAngle) * W / 3.5;
      const ey = arcY + Math.sin(eAngle) * W / 3.5;
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251,191,36,0.8)';
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('e⁻', ex, ey);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.fillStyle = 'rgba(251,191,36,0.5)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('e⁻ flow (external circuit)', W / 2, arcY - W / 3.5 - 4);

    // ── Charge level bar ──
    const barX = W * 0.03, barY = H * 0.88, barW = W * 0.94, barH = 14;
    ctx.fillStyle = 'rgba(30,40,60,0.8)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 7);
    ctx.fill();
    const chargeGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    chargeGrad.addColorStop(0,   '#7c3aed');
    chargeGrad.addColorStop(0.5, '#06b6d4');
    chargeGrad.addColorStop(1,   '#4ade80');
    ctx.fillStyle = chargeGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * chargeLevel, barH, 7);
    ctx.fill();
    ctx.fillStyle = '#f0f9ff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(chargeLevel * 100)}% charged`, W / 2, barY + barH + 14);

    // ── Arrows indicating Li⁺ direction ──
    ctx.fillStyle = 'rgba(6,182,212,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← Li⁺ ions intercalate into graphite', elecX + (colW - 2) / 2, cellY + cellH + 14);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   7. SCENE 6 – Fast Charging CC/CV Canvas
════════════════════════════════════════════════════════════════ */
(function initFastCanvas() {
  const canvas = $('#fast-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let phase = 0;

  canvas._start = function () {
    if (running) return;
    running = true;
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    draw();
  };
  canvas._stop = function () { running = false; cancelAnimationFrame(raf); };

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.05;

    // animated glow
    const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.5);
    grd.addColorStop(0, `rgba(124,58,237,${0.06 + Math.sin(phase) * 0.03})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // graph area
    const cx = W * 0.08, cy = H * 0.87;
    const cw = W * 0.88, ch = H * 0.72;

    // axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ch); ctx.lineTo(cx, cy); ctx.lineTo(cx + cw, cy);
    ctx.stroke();

    // axis labels
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time →', cx + cw / 2, cy + 14);
    ctx.save();
    ctx.translate(cx - 14, cy - ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('V / I', 0, 0);
    ctx.restore();

    // current curve (flat then drops)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(245,158,11,0.9)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= 100; i++) {
      const x = cx + (i / 100) * cw;
      const cur = i < 60 ? 1 : 1 - ((i - 60) / 40) * 0.88;
      const y = cy - cur * ch * 0.72;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // voltage curve (rises then plateau)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(124,58,237,0.9)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= 100; i++) {
      const x = cx + (i / 100) * cw;
      const vol = i < 60 ? (i / 60) * 0.85 : 0.85 + (i - 60) / 40 * 0.15;
      const y = cy - vol * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // animated progress marker
    const progT = (Math.sin(phase * 0.35) * 0.5 + 0.5); // 0→1 oscillates
    const markerX = cx + progT * cw;
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(markerX, cy - ch);
    ctx.lineTo(markerX, cy);
    ctx.strokeStyle = 'rgba(74,222,128,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(74,222,128,0.7)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(progT * 100)}%`, markerX, cy - ch - 6);

    // CC / CV divider
    const divX = cx + 0.6 * cw;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1;
    ctx.moveTo(divX, cy - ch); ctx.lineTo(divX, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // labels
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.textAlign = 'left';
    ctx.fillText('CC Phase', cx + 4, cy - ch + 16);
    ctx.fillText('CV Phase', divX + 4, cy - ch + 16);
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.textAlign = 'right';
    ctx.fillText('Current (I)', cx + cw - 4, cy - ch * 0.78);
    ctx.fillStyle = 'rgba(167,139,250,0.9)';
    ctx.fillText('Voltage (V)', cx + cw * 0.55, cy - ch + 8);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   8. SCENE 7 – QUIZ
════════════════════════════════════════════════════════════════ */
const QUIZ = [
  {
    q: 'What type of power supply is used in modern mobile chargers?',
    opts: ['Linear power supply', 'Switched-Mode Power Supply (SMPS)', 'Transformer only', 'Solar converter'],
    ans: 1,
  },
  {
    q: 'Why does SMPS use a high-frequency transformer (50–150 kHz) instead of a 50 Hz transformer?',
    opts: ['To generate more heat', 'High frequency allows a tiny ferrite core — far smaller and lighter than a 50 Hz iron core', 'To increase output voltage', 'To work without a rectifier'],
    ans: 1,
  },
  {
    q: 'What is the role of the bridge rectifier in a charger?',
    opts: ['Step down voltage', 'Convert AC to pulsed DC using 4 diodes', 'Regulate output voltage', 'Measure battery level'],
    ans: 1,
  },
  {
    q: 'Why is an optocoupler used in the feedback path of a charger?',
    opts: ['To amplify the signal', 'To electrically isolate the high-voltage primary from the low-voltage secondary', 'To rectify the signal', 'To reduce frequency'],
    ans: 1,
  },
  {
    q: 'During Li-ion charging, where do Li⁺ ions move?',
    opts: ['Anode → Cathode through electrolyte', 'Cathode → Anode through electrolyte (intercalation)', 'They stay in the electrolyte', 'Cathode → Anode through external wire'],
    ans: 1,
  },
  {
    q: 'In the CC/CV charging profile, what happens in the CV phase?',
    opts: ['Current increases rapidly', 'Voltage is held constant while current tapers to near zero', 'Cuts off power completely', 'Switches to AC output'],
    ans: 1,
  },
  {
    q: 'GaN (Gallium Nitride) chargers are popular because they:',
    opts: ['Are cheaper to make', 'Switch faster with lower loss → smaller and more efficient than silicon', 'Only work with Apple devices', 'Use lower voltages than traditional chargers'],
    ans: 1,
  },
];

(function initQuiz() {
  const quizBody   = $('#quiz-body');
  const quizResult = $('#quiz-result');
  if (!quizBody) return;

  let answered = new Array(QUIZ.length).fill(null);

  function buildQuiz() {
    quizBody.innerHTML = '';
    quizResult.classList.add('hidden');
    answered.fill(null);

    QUIZ.forEach((q, qi) => {
      const card = document.createElement('div');
      card.className = 'q-card';
      card.innerHTML = `
        <span class="q-index">Q ${qi + 1} of ${QUIZ.length}</span>
        <p class="q-text">${q.q}</p>
        <div class="q-options">
          ${q.opts.map((opt, oi) => `
            <button class="q-option" data-qi="${qi}" data-oi="${oi}" aria-pressed="false">
              <span class="opt-icon">○</span>${opt}
            </button>`).join('')}
        </div>`;
      quizBody.appendChild(card);
    });

    $$('.q-option').forEach(btn => {
      btn.addEventListener('click', function () {
        const qi = +this.dataset.qi;
        const oi = +this.dataset.oi;
        if (answered[qi] !== null) return;
        answered[qi] = oi;
        const card = this.closest('.q-card');
        card.classList.add('answered');
        const siblings = $$('.q-option', card);
        siblings.forEach(s => {
          s.disabled = true;
          const soi = +s.dataset.oi;
          if (soi === QUIZ[qi].ans) {
            s.classList.add('correct');
            s.querySelector('.opt-icon').textContent = '✓';
          } else if (soi === oi) {
            s.classList.add('wrong');
            s.querySelector('.opt-icon').textContent = '✗';
          }
        });
        if (answered.every(a => a !== null)) showResult();
      });
    });
  }

  function showResult() {
    const score = answered.reduce((acc, a, i) => acc + (a === QUIZ[i].ans ? 1 : 0), 0);
    const pct   = Math.round((score / QUIZ.length) * 100);
    const msg   = pct >= 85 ? '🎉 Excellent!' : pct >= 57 ? '👍 Good effort!' : '📖 Keep studying!';
    quizResult.innerHTML = `
      <div class="result-score">${score}/${QUIZ.length}</div>
      <div class="result-label">${msg}</div>
      <div class="result-sub">${pct}% correct — ${
        pct >= 85 ? 'You really understand mobile charger physics!' :
        pct >= 57 ? 'Review the missed scenes and try again.' :
                    'Go back through the module and retry.'
      }</div>
      <button class="btn-retry">Try Again</button>`;
    quizResult.classList.remove('hidden');
    quizResult.querySelector('.btn-retry').addEventListener('click', buildQuiz);
    quizResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  buildQuiz();
})();
