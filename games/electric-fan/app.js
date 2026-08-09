/* ─────────────────────────────────────────────────────────────────
   Electric Fan – app.js
   Physics animations: bg canvas · fan rotation · motor canvas ·
   blade cross-section · airflow canvas · speed canvas · energy canvas · quiz
───────────────────────────────────────────────────────────────── */

'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ════════════════════════════════════════════════════════════════
   1. BACKGROUND CANVAS – slow rotating spiral arcs
════════════════════════════════════════════════════════════════ */
(function initBgCanvas() {
  const canvas = $('#bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  const ARCS = Array.from({ length: 6 }, (_, i) => ({
    radius: 80 + i * 60,
    speed:  0.15 + i * 0.08,
    phase:  (i * Math.PI * 2) / 6,
    alpha:  0.05 + i * 0.02,
    hue:    210 + i * 15,
  }));

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const sec = t * 0.001;
    const cx = W / 2, cy = H / 2;
    ARCS.forEach(a => {
      ctx.beginPath();
      ctx.arc(cx, cy, a.radius, sec * a.speed + a.phase, sec * a.speed + a.phase + Math.PI * 1.4);
      ctx.strokeStyle = `hsla(${a.hue},75%,60%,${a.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();


/* ════════════════════════════════════════════════════════════════
   2. SCENE 1 – Spinning fan SVG
════════════════════════════════════════════════════════════════ */
(function initFanSpin() {
  const blades = $('#fan-blades-s1');
  if (!blades) return;
  function spin(t) {
    const angle = (t * 0.3) % 360;
    blades.setAttribute('transform', `rotate(${angle} 100 100)`);
    requestAnimationFrame(spin);
  }
  requestAnimationFrame(spin);
})();


/* ════════════════════════════════════════════════════════════════
   3. SCENE NAVIGATION
════════════════════════════════════════════════════════════════ */
const TOTAL_SCENES = 6;
let currentScene = 1;

const scenes     = $$('.scene');
const btnPrev    = $('#btn-prev');
const btnNext    = $('#btn-next');
const dotNav     = $('#dot-nav');
const progFill   = $('#progress-fill');
const sceneLabel = $('#scene-label');

function syncAnimations() {
  const motorCanvas  = $('#motor-canvas');
  const airflowCanvas = $('#airflow-canvas');
  const speedCanvas  = $('#speed-canvas');
  const energyCanvas = $('#energy-canvas');

  if (motorCanvas  && motorCanvas._start  && motorCanvas._stop)
    currentScene === 2 ? motorCanvas._start()  : motorCanvas._stop();
  if (airflowCanvas && airflowCanvas._start && airflowCanvas._stop)
    currentScene === 3 ? airflowCanvas._start() : airflowCanvas._stop();
  if (speedCanvas  && speedCanvas._start  && speedCanvas._stop)
    currentScene === 4 ? speedCanvas._start()  : speedCanvas._stop();
  if (energyCanvas && energyCanvas._start && energyCanvas._stop)
    currentScene === 5 ? energyCanvas._start() : energyCanvas._stop();
}

for (let i = 1; i <= TOTAL_SCENES; i++) {
  const btn = document.createElement('button');
  btn.className = 'dot' + (i === 1 ? ' active' : '');
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-label', `Scene ${i}`);
  btn.addEventListener('click', () => goTo(i));
  dotNav.appendChild(btn);
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

function updateNextBtn(n) {
  btnNext.innerHTML = n === TOTAL_SCENES
    ? '<span>Finish</span>'
    : '<span>Next</span><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
   4. SCENE 2 – Animated Motor Physics Canvas
   Shows: stator coils pulsing N/S, rotating rotor, field lines,
          induced current arrows, force (F=BIL) label
════════════════════════════════════════════════════════════════ */
(function initMotorCanvas() {
  const canvas = $('#motor-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let rotorAngle = 0;
  let fieldPhase = 0;   // rotating field phase (0–2π)

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

  /* Draw an arc arrowhead for field lines */
  function arrowHead(x, y, angle, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.5);
    ctx.lineTo(-size,  size * 0.5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /* Draw a labelled stator coil at (cx,cy), rotated by rotDeg */
  function drawCoil(cx, cy, rotDeg, intensity, isNorth) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotDeg * Math.PI) / 180);

    const glow = Math.abs(intensity);
    const hue  = isNorth ? 200 : 0;
    const alpha = 0.25 + glow * 0.75;

    // coil rectangle
    ctx.fillStyle   = `hsla(${hue},80%,55%,${alpha * 0.35})`;
    ctx.strokeStyle = `hsla(${hue},80%,65%,${alpha})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(-9, -20, 18, 40, 4);
    ctx.fill();
    ctx.stroke();

    // N/S label
    ctx.fillStyle = `hsla(${hue},80%,80%,${alpha})`;
    ctx.font = `bold ${Math.round(9 + glow * 3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isNorth ? 'N' : 'S', 0, -26);

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const outerR = Math.min(W, H) * 0.42;
    const innerR = outerR * 0.52;
    const rotorR = outerR * 0.33;
    const hubR   = outerR * 0.1;

    // ── stator outer ring ──
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(59,130,246,0.18)';
    ctx.lineWidth = outerR * 0.12;
    ctx.stroke();

    // ── 6 stator coils, phases 60° apart ──
    const COILS = 6;
    for (let i = 0; i < COILS; i++) {
      const angle = (i * Math.PI * 2) / COILS;
      const coilX = cx + Math.cos(angle) * outerR * 0.82;
      const coilY = cy + Math.sin(angle) * outerR * 0.82;
      const rotDeg = (i * 360) / COILS + 90;
      // intensity follows 3-phase AC: phases at 0°, 120°, 240°
      const phaseOff = (i % 3) * ((Math.PI * 2) / 3);
      const intensity = Math.sin(fieldPhase + phaseOff);
      const isNorth = intensity >= 0;
      drawCoil(coilX, coilY, rotDeg, Math.abs(intensity), isNorth);
    }

    // ── rotating magnetic field lines (4 arcs from current N to S pole) ──
    const fieldAngle = fieldPhase;   // "north" pole direction
    const lineAlpha  = 0.35;
    for (let k = 0; k < 8; k++) {
      const startAngle = fieldAngle + (k * Math.PI * 2) / 8;
      const endAngle   = startAngle + Math.PI;
      // draw arc from north-side to south-side through rotor region
      const r = innerR * (0.6 + (k % 4) * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = `rgba(59,130,246,${lineAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── rotor (squirrel cage) ──
    ctx.beginPath();
    ctx.arc(cx, cy, rotorR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16,185,129,0.08)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // rotor conductor bars (8 bars, rotating)
    const BARS = 8;
    for (let b = 0; b < BARS; b++) {
      const barAngle = rotorAngle + (b * Math.PI * 2) / BARS;
      const bx1 = cx + Math.cos(barAngle) * rotorR * 0.4;
      const by1 = cy + Math.sin(barAngle) * rotorR * 0.4;
      const bx2 = cx + Math.cos(barAngle) * rotorR * 0.95;
      const by2 = cy + Math.sin(barAngle) * rotorR * 0.95;

      // induced current direction (alternates by position relative to field)
      const relAngle = barAngle - fieldAngle;
      const current  = Math.sin(relAngle);
      const barHue   = current >= 0 ? 142 : 0;  // green = out, red = in
      const barAlpha = 0.5 + Math.abs(current) * 0.5;

      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(bx2, by2);
      ctx.strokeStyle = `hsla(${barHue},80%,65%,${barAlpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // dot (●) or cross (⊗) on end bar to show current in/out
      ctx.beginPath();
      ctx.arc(bx2, by2, 3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${barHue},80%,65%,${barAlpha})`;
      ctx.fill();
    }

    // ── hub ──
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, hubR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#6ee7b7';
    ctx.fill();

    // ── force label (F = BIL) top-right ──
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('F = B·I·L', cx + outerR * 0.55, cy - outerR * 0.55);

    // ── rotation speed indicator ──
    ctx.fillStyle = 'rgba(16,185,129,0.7)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('⟳ Rotor (slip < synchronous speed)', cx, cy + outerR * 1.02);

    // ── legend ──
    const lx = 6, ly = H - 38;
    ctx.fillStyle = 'rgba(59,130,246,0.8)';
    ctx.fillRect(lx, ly, 16, 3);
    ctx.fillStyle = 'rgba(200,200,220,0.5)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Magnetic field lines', lx + 20, ly + 2);
    ctx.fillStyle = 'rgba(16,185,129,0.8)';
    ctx.fillRect(lx, ly + 12, 16, 3);
    ctx.fillStyle = 'rgba(200,200,220,0.5)';
    ctx.fillText('Induced current in conductor', lx + 20, ly + 14);

    // advance angles
    fieldPhase += 0.025;          // 50 Hz represented faster for visibility
    rotorAngle += 0.022;          // rotor lags field slightly (slip)

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   5. SCENE 3 – Airflow canvas  (fan + moving air particles)
════════════════════════════════════════════════════════════════ */
(function initAirflowCanvas() {
  const canvas = $('#airflow-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let speedLevel = 2;
  let particles = [];

  const SPEED_MAP   = { 1: 1.2, 2: 2.5, 3: 4.5 };
  const SPEED_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' };

  function resize() {
    W = canvas.width  = canvas.offsetWidth  * devicePixelRatio;
    H = canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    particles = createParticles();
  }

  function createParticles() {
    return Array.from({ length: 35 }, mkParticle);
  }

  function mkParticle() {
    return {
      x: Math.random() * W * 0.3,
      y: Math.random() * H,
      len: 12 + Math.random() * 22,
      speed: (0.5 + Math.random() * 0.5) * SPEED_MAP[speedLevel],
      alpha: 0.3 + Math.random() * 0.5,
      wave: Math.random() * Math.PI * 2,
      thickness: 0.8 + Math.random() * 1.2,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // animated fan icon on left
    ctx.save();
    ctx.translate(55, H / 2);
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59,130,246,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (let b = 0; b < 4; b++) {
      ctx.save();
      ctx.rotate((b * Math.PI) / 2 + Date.now() * 0.002 * SPEED_MAP[speedLevel]);
      ctx.fillStyle = 'rgba(59,130,246,0.75)';
      ctx.beginPath();
      ctx.ellipse(0, -28, 7, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // hub
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1e40af';
    ctx.fill();
    ctx.restore();

    // airflow streamlines
    const sp = SPEED_MAP[speedLevel];
    particles.forEach(p => {
      const waveY = Math.sin(p.wave + p.x * 0.015) * 6;
      const grad = ctx.createLinearGradient(p.x, 0, p.x + p.len, 0);
      grad.addColorStop(0, `rgba(59,130,246,${p.alpha})`);
      grad.addColorStop(1, `rgba(6,182,212,0)`);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + waveY);
      ctx.lineTo(p.x + p.len, p.y + waveY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = p.thickness;
      ctx.stroke();

      p.x    += p.speed;
      p.wave += 0.025;

      if (p.x > W + 30) {
        Object.assign(p, mkParticle());
        p.x = 75 + Math.random() * 20;
      }
    });

    if (running) raf = requestAnimationFrame(draw);
  }

  canvas._start = function () {
    if (running) return;
    running = true;
    resize();
    draw();
  };
  canvas._stop = function () { running = false; cancelAnimationFrame(raf); };

  const speedCtrl  = $('#speed-ctrl');
  const speedValEl = $('#speed-val');
  if (speedCtrl) {
    speedCtrl.addEventListener('input', () => {
      speedLevel = +speedCtrl.value;
      if (speedValEl) speedValEl.textContent = SPEED_LABELS[speedLevel];
      particles.forEach(p => { p.speed = (0.5 + Math.random() * 0.5) * SPEED_MAP[speedLevel]; });
    });
  }

  window.addEventListener('resize', () => { if (running) resize(); });
})();


/* ════════════════════════════════════════════════════════════════
   6. SCENE 4 – Speed Control Canvas
   Draws: AC source → regulator block → motor circle
   Animated current dots flow along wires; motor RPM ring spins.
════════════════════════════════════════════════════════════════ */
(function initSpeedCanvas() {
  const canvas = $('#speed-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let phase = 0;
  let voltPct = 0.7;     // 0.3 – 1.0, controlled by slider

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

  // slider
  const sldr    = $('#speed-demo');
  const sldrVal = $('#speed-demo-val');
  if (sldr) {
    sldr.addEventListener('input', () => {
      voltPct = +sldr.value / 100;
      if (sldrVal) sldrVal.textContent = sldr.value + '%';
    });
  }

  function drawBlock(label, x, y, w, h, strokeColor, fillAlpha) {
    ctx.fillStyle = `rgba(${fillAlpha})`;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 ${Math.min(10, w * 0.17)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.04;

    const bw  = W * 0.18, bh = H * 0.3;
    const y0  = H * 0.32;
    const gap = (W - bw * 4) / 5;

    const BLOCKS = [
      { label: '230V AC', x: gap,               color: 'rgba(59,130,246,0.7)',  fill: '59,130,246,0.1'  },
      { label: 'Regulator', x: gap * 2 + bw,    color: 'rgba(16,185,129,0.7)', fill: '16,185,129,0.1'  },
      { label: 'Motor',     x: gap * 3 + bw * 2, color: 'rgba(245,158,11,0.7)', fill: '245,158,11,0.1' },
      { label: 'Fan',       x: gap * 4 + bw * 3, color: 'rgba(6,182,212,0.7)',  fill: '6,182,212,0.1'  },
    ];

    // draw wires with animated current dots
    BLOCKS.forEach((b, i) => {
      if (i >= BLOCKS.length - 1) return;
      const x1 = b.x + bw + 2;
      const x2 = BLOCKS[i + 1].x - 2;
      const wy = y0 + bh / 2;

      // wire
      ctx.beginPath();
      ctx.moveTo(x1, wy);
      ctx.lineTo(x2, wy);
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // animated current dots
      const DOT_COUNT = 4;
      const wireLen = x2 - x1;
      for (let d = 0; d < DOT_COUNT; d++) {
        let t = ((phase * voltPct * 2 + d / DOT_COUNT) % 1);
        const dx = x1 + t * wireLen;
        const brightness = 0.5 + voltPct * 0.5;
        ctx.beginPath();
        ctx.arc(dx, wy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${brightness})`;
        ctx.fill();
      }

      // arrowhead
      ctx.beginPath();
      ctx.moveTo(x2 - 8, wy - 5);
      ctx.lineTo(x2 - 2, wy);
      ctx.lineTo(x2 - 8, wy + 5);
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    BLOCKS.forEach(b => drawBlock(b.label, b.x, y0, bw, bh, b.color, b.fill));

    // motor RPM spinning ring (visual)
    const motorB   = BLOCKS[2];
    const motorCX  = motorB.x + bw / 2;
    const motorCY  = y0 + bh + 28;
    const rpmAngle = phase * voltPct * 3;

    ctx.save();
    ctx.translate(motorCX, motorCY);
    for (let b2 = 0; b2 < 4; b2++) {
      ctx.save();
      ctx.rotate(rpmAngle + (b2 * Math.PI) / 2);
      ctx.fillStyle = `rgba(245,158,11,${0.5 + voltPct * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(0, -18, 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.restore();

    // voltage label
    const vDisp = Math.round(voltPct * 230);
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`~${vDisp} V → ${Math.round(voltPct * 100)}% speed`, motorCX, motorCY + 36);

    // PWM waveform (bottom left)
    const wx0 = gap, wy0 = H * 0.78, wh2 = H * 0.14, ww = bw * 2;
    ctx.strokeStyle = 'rgba(16,185,129,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const duty = voltPct;
    for (let x = 0; x < ww; x++) {
      const period = ww / 6;
      const pos = (x / period) % 1;
      const high = pos < duty ? 1 : 0;
      const y = wy0 + (1 - high) * wh2;
      x === 0 ? ctx.moveTo(wx0 + x, y) : ctx.lineTo(wx0 + x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(16,185,129,0.7)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`PWM duty = ${Math.round(voltPct * 100)}%`, wx0, wy0 - 6);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   7. SCENE 5 – Energy canvas (Sankey-style + evaporation physics)
════════════════════════════════════════════════════════════════ */
(function initEnergyCanvas() {
  const canvas = $('#energy-canvas');
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

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.04;

    const bw = W * 0.16, bh = H * 0.26;
    const y0 = H * 0.32;
    const gap = (W - bw * 4) / 5;

    const boxes = [
      { label: '⚡ Power\nSupply', x: gap,               color: '59,130,246'  },
      { label: '🎛️ Speed\nControl',  x: gap * 2 + bw,    color: '16,185,129'  },
      { label: '🔄 Motor\nRotation', x: gap * 3 + bw * 2, color: '245,158,11' },
      { label: '💨 Air\nFlow',       x: gap * 4 + bw * 3, color: '6,182,212'  },
    ];

    // animated arrows
    boxes.forEach((b, i) => {
      if (i >= boxes.length - 1) return;
      const ax = b.x + bw;
      const ay = y0 + bh / 2;
      const nx = boxes[i + 1].x;
      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -phase * 4;
      ctx.moveTo(ax + 2, ay);
      ctx.lineTo(nx - 2, ay);
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(nx - 8, ay - 5);
      ctx.lineTo(nx - 2, ay);
      ctx.lineTo(nx - 8, ay + 5);
      ctx.strokeStyle = 'rgba(148,163,184,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    boxes.forEach(b => {
      ctx.fillStyle = `rgba(${b.color},0.12)`;
      ctx.strokeStyle = `rgba(${b.color},0.7)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(b.x, y0, bw, bh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f0f9ff';
      ctx.font = `bold ${Math.min(10, bw * 0.17)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = b.label.split('\n');
      lines.forEach((line, li) => {
        ctx.fillText(line, b.x + bw / 2, y0 + bh / 2 + (li - (lines.length - 1) / 2) * 13);
      });
    });

    // evaporation diagram (person silhouette + sweat droplets floating up)
    const personX = W * 0.5, personY = H * 0.85;
    const dropPhase = phase * 0.8;

    // body (simple circles + rect)
    ctx.fillStyle = 'rgba(99,102,241,0.3)';
    ctx.strokeStyle = 'rgba(129,140,248,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(personX, personY - 38, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(99,102,241,0.2)';
    ctx.beginPath();
    ctx.roundRect(personX - 10, personY - 24, 20, 28, 4);
    ctx.fill(); ctx.stroke();

    // sweat drops rising (evaporation)
    for (let d = 0; d < 5; d++) {
      const t = (dropPhase + d * 0.2) % 1;
      const dy = personY - 10 - t * 55;
      const dx = personX + (d - 2) * 12;
      const a  = (1 - t);
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6,182,212,${a * 0.7})`;
      ctx.fill();
    }

    // label
    ctx.fillStyle = 'rgba(6,182,212,0.7)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sweat evaporates → heat removed', personX, H - 4);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   8. SCENE 6 – QUIZ
════════════════════════════════════════════════════════════════ */
const QUIZ = [
  {
    q: 'What is the primary energy conversion in an electric fan?',
    opts: ['Chemical → Thermal', 'Electrical → Mechanical → Kinetic (air)', 'Solar → Electrical', 'Mechanical → Chemical'],
    ans: 1,
  },
  {
    q: 'In an induction motor, what causes the rotor to spin?',
    opts: ['Direct voltage applied to rotor', 'Electromagnetic force on induced currents (F = BIL)', 'Friction from bearing', 'Gravity'],
    ans: 1,
  },
  {
    q: 'Why are fan blades angled (pitched)?',
    opts: ['To look aesthetically pleasing', 'To reduce noise only', 'To deflect air axially and create thrust via reaction force', 'To reduce motor load'],
    ans: 2,
  },
  {
    q: 'How does a fan produce a cooling effect on the human body?',
    opts: ['It lowers air temperature', 'It accelerates evaporation of sweat, removing latent heat', 'It produces cold air', 'It filters warm air'],
    ans: 1,
  },
  {
    q: 'Which speed control method is most energy-efficient?',
    opts: ['Resistive regulator', 'On/Off switching', 'BLDC motor with PWM inverter', 'Adding more blades'],
    ans: 2,
  },
  {
    q: 'The formula F = BIL describes force on a current-carrying conductor. What does "B" represent?',
    opts: ['Blade count', 'Magnetic flux density', 'Back-EMF voltage', 'Bearing friction'],
    ans: 1,
  },
  {
    q: 'What is "slip" in an induction motor?',
    opts: ['Mechanical vibration', 'Difference between synchronous field speed and rotor speed', 'Oil leaking from bearing', 'Voltage drop in winding'],
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
        pct >= 85 ? 'You really understand electric fan physics!' :
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
