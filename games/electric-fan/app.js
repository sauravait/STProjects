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

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.04;

    const margin  = W * 0.04;
    const usableW = W - margin * 2;
    const cy      = H * 0.5;

    // Section widths and x-positions
    const acW    = usableW * 0.17;
    const regW   = usableW * 0.21;
    const motorW = usableW * 0.21;
    const fanW   = usableW * 0.19;
    const wireG  = (usableW - acW - regW - motorW - fanW) / 3;

    const acX    = margin;
    const regX   = acX    + acW    + wireG;
    const motorX = regX   + regW   + wireG;
    const fanX   = motorX + motorW + wireG;

    // ── helper: animated current-dot wire ──────────────────
    function drawWire(x1, x2, wy, speed, dotColor) {
      ctx.beginPath();
      ctx.moveTo(x1, wy);
      ctx.lineTo(x2, wy);
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const wireLen = x2 - x1;
      for (let d = 0; d < 4; d++) {
        const t  = ((phase * speed + d / 4) % 1);
        const dx = x1 + t * wireLen;
        ctx.beginPath();
        ctx.arc(dx, wy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }
      // arrowhead
      ctx.beginPath();
      ctx.moveTo(x2 - 7, wy - 4);
      ctx.lineTo(x2 - 1, wy);
      ctx.lineTo(x2 - 7, wy + 4);
      ctx.strokeStyle = 'rgba(148,163,184,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // ══════════════════════════════════════════════════════
    // 1. AC OUTLET  (left)
    // ══════════════════════════════════════════════════════
    const outCX = acX + acW / 2;
    const outCY = cy - H * 0.05;
    const outR  = Math.min(acW * 0.44, H * 0.18);

    // outlet face (rounded square)
    ctx.fillStyle   = 'rgba(226,232,240,0.12)';
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(outCX - outR, outCY - outR, outR * 2, outR * 2, outR * 0.18);
    ctx.fill();
    ctx.stroke();

    // plug slots
    const slotW = outR * 0.14, slotH = outR * 0.44;
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    [-outR * 0.3, outR * 0.3].forEach(sx => {
      ctx.beginPath();
      ctx.roundRect(outCX + sx - slotW / 2, outCY - slotH / 2, slotW, slotH, 2);
      ctx.fill();
    });
    // ground hole (U-shape bottom)
    ctx.beginPath();
    ctx.arc(outCX, outCY + outR * 0.42, outR * 0.1, 0, Math.PI);
    ctx.strokeStyle = 'rgba(15,23,42,0.85)';
    ctx.lineWidth   = outR * 0.12;
    ctx.stroke();

    // AC sine label
    ctx.fillStyle    = 'rgba(148,163,184,0.85)';
    ctx.font         = `bold ${Math.min(11, acW * 0.22)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('230 V AC', outCX, outCY + outR + 6);

    // animated sine wave from outlet → regulator
    const sineX1 = outCX + outR + 3;
    const sineX2 = regX - 3;
    const sineAmp = H * 0.055;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59,130,246,0.85)';
    ctx.lineWidth   = 1.8;
    for (let x = 0; x <= sineX2 - sineX1; x++) {
      const t = x / (sineX2 - sineX1);
      const y = cy - Math.sin(t * Math.PI * 4 + phase) * sineAmp;
      x === 0 ? ctx.moveTo(sineX1 + x, y) : ctx.lineTo(sineX1 + x, y);
    }
    ctx.stroke();

    // ══════════════════════════════════════════════════════
    // 2. SPEED REGULATOR  (center-left)
    // ══════════════════════════════════════════════════════
    const regCX = regX + regW / 2;
    const regH  = H * 0.72;
    const regY  = cy - regH / 2;

    ctx.fillStyle   = 'rgba(16,185,129,0.07)';
    ctx.strokeStyle = 'rgba(16,185,129,0.6)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(regX, regY, regW, regH, 10);
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle    = 'rgba(16,185,129,0.9)';
    ctx.font         = `bold ${Math.min(10, regW * 0.16)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Speed Regulator', regCX, regY + 6);

    // TRIAC symbol inside: draw phase-cut sine waveform
    const wfX  = regX + regW * 0.1;
    const wfW  = regW * 0.8;
    const wfY  = regY + regH * 0.28;
    const wfAmp = regH * 0.12;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(16,185,129,0.9)';
    ctx.lineWidth   = 1.5;
    for (let x = 0; x <= wfW; x++) {
      const t         = x / wfW;
      const cyclePos  = (t * 3) % 1;         // 3 half-cycles shown
      let y;
      if (cyclePos < voltPct) {
        y = wfY - Math.sin((cyclePos / voltPct) * Math.PI) * wfAmp;
      } else {
        y = wfY;
      }
      x === 0 ? ctx.moveTo(wfX + x, y) : ctx.lineTo(wfX + x, y);
    }
    ctx.stroke();
    // zero-line
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(wfX, wfY);
    ctx.lineTo(wfX + wfW, wfY);
    ctx.strokeStyle = 'rgba(16,185,129,0.25)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle    = 'rgba(16,185,129,0.55)';
    ctx.font         = `${Math.min(8, regW * 0.14)}px sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText('Phase-cut waveform', regCX, wfY + wfAmp + 18);

    // Rotary knob
    const knobCX = regCX;
    const knobCY = regY + regH * 0.68;
    const knobR  = Math.min(regW, regH) * 0.14;

    // knob body
    const kGrad = ctx.createRadialGradient(knobCX - knobR * 0.25, knobCY - knobR * 0.25, knobR * 0.1, knobCX, knobCY, knobR);
    kGrad.addColorStop(0, 'rgba(51,65,85,0.95)');
    kGrad.addColorStop(1, 'rgba(15,23,42,0.9)');
    ctx.beginPath();
    ctx.arc(knobCX, knobCY, knobR, 0, Math.PI * 2);
    ctx.fillStyle   = kGrad;
    ctx.strokeStyle = 'rgba(16,185,129,0.7)';
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();
    // tick marks
    for (let i = 0; i <= 10; i++) {
      const a    = -Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const r0   = knobR * 1.2;
      const r1   = knobR * 1.35;
      ctx.beginPath();
      ctx.moveTo(knobCX + Math.cos(a) * r0, knobCY + Math.sin(a) * r0);
      ctx.lineTo(knobCX + Math.cos(a) * r1, knobCY + Math.sin(a) * r1);
      ctx.strokeStyle = i === 0 ? 'rgba(239,68,68,0.5)' : i === 10 ? 'rgba(16,185,129,0.6)' : 'rgba(148,163,184,0.3)';
      ctx.lineWidth   = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
    }
    // indicator line on knob
    const kAngle = -Math.PI * 0.75 + voltPct * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(knobCX + Math.cos(kAngle) * knobR * 0.25, knobCY + Math.sin(kAngle) * knobR * 0.25);
    ctx.lineTo(knobCX + Math.cos(kAngle) * knobR * 0.78, knobCY + Math.sin(kAngle) * knobR * 0.78);
    ctx.strokeStyle = 'rgba(16,185,129,1)';
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    // center dot
    ctx.beginPath();
    ctx.arc(knobCX, knobCY, knobR * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16,185,129,0.8)';
    ctx.fill();

    // voltage output label
    ctx.fillStyle    = 'rgba(16,185,129,0.75)';
    ctx.font         = `bold ${Math.min(9, regW * 0.15)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(voltPct * 230)} V out`, regCX, knobCY + knobR * 1.55);

    // wire: outlet → regulator (sine wave drawn above) already done
    // wire: regulator → motor
    drawWire(regX + regW + 2, motorX - 2, cy,
      voltPct * 2,
      `rgba(16,185,129,${0.5 + voltPct * 0.5})`);

    // ══════════════════════════════════════════════════════
    // 3. MOTOR CROSS-SECTION
    // ══════════════════════════════════════════════════════
    const mCX  = motorX + motorW / 2;
    const mCY  = cy;
    const mR   = Math.min(motorW * 0.42, H * 0.28);

    // Stator outer housing
    ctx.beginPath();
    ctx.arc(mCX, mCY, mR, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(30,41,59,0.85)';
    ctx.strokeStyle = 'rgba(245,158,11,0.55)';
    ctx.lineWidth   = mR * 0.22;
    ctx.fill();
    ctx.stroke();

    // Stator coil poles (4 poles, glowing with AC phase)
    for (let i = 0; i < 4; i++) {
      const a     = (i / 4) * Math.PI * 2;
      const glow  = 0.35 + Math.max(0, Math.sin(phase * 2 + i * Math.PI * 0.5)) * 0.6;
      const poleCX = mCX + Math.cos(a) * mR * 0.62;
      const poleCY = mCY + Math.sin(a) * mR * 0.62;
      ctx.beginPath();
      ctx.arc(poleCX, poleCY, mR * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${glow})`;
      ctx.fill();
      // coil windings hint
      ctx.strokeStyle = `rgba(245,158,11,${glow * 0.5})`;
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Air gap circle
    ctx.beginPath();
    ctx.arc(mCX, mCY, mR * 0.46, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Rotor (spinning)
    const rotAngle = phase * voltPct * 4.5;
    ctx.save();
    ctx.translate(mCX, mCY);
    ctx.rotate(rotAngle);
    // Rotor body
    ctx.beginPath();
    ctx.arc(0, 0, mR * 0.36, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(51,65,85,0.9)';
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth   = 1;
    ctx.fill();
    ctx.stroke();
    // Squirrel-cage bars
    for (let i = 0; i < 10; i++) {
      const ba = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ba) * mR * 0.12, Math.sin(ba) * mR * 0.12);
      ctx.lineTo(Math.cos(ba) * mR * 0.33, Math.sin(ba) * mR * 0.33);
      ctx.strokeStyle = `rgba(148,163,184,${0.5 + voltPct * 0.4})`;
      ctx.lineWidth   = 1.8;
      ctx.stroke();
    }
    // shaft hub
    ctx.beginPath();
    ctx.arc(0, 0, mR * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.restore();

    // Motor label + RPM
    ctx.fillStyle    = 'rgba(245,158,11,0.9)';
    ctx.font         = `bold ${Math.min(10, motorW * 0.16)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Induction Motor', mCX, mCY - mR - 7);
    ctx.font         = `bold ${Math.min(9, motorW * 0.14)}px monospace`;
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(voltPct * 1450)} RPM`, mCX, mCY + mR + 7);

    // ══════════════════════════════════════════════════════
    // 4. FAN BLADES
    // ══════════════════════════════════════════════════════
    const fCX     = fanX + fanW / 2;
    const fCY     = cy;
    const fR      = Math.min(fanW * 0.43, H * 0.28);
    const fanAngle = phase * voltPct * 4.5;

    // Shaft connecting motor → fan
    ctx.beginPath();
    ctx.moveTo(motorX + motorW, cy);
    ctx.lineTo(fanX, cy);
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.lineWidth   = 3;
    ctx.stroke();

    // Fan guard ring
    ctx.beginPath();
    ctx.arc(fCX, fCY, fR + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148,163,184,0.28)';
    ctx.lineWidth   = 5;
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(fCX, fCY);
      ctx.lineTo(fCX + Math.cos(a) * (fR + 7), fCY + Math.sin(a) * (fR + 7));
      ctx.strokeStyle = 'rgba(148,163,184,0.12)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Spinning blades
    ctx.save();
    ctx.translate(fCX, fCY);
    ctx.rotate(fanAngle);
    for (let b = 0; b < 4; b++) {
      ctx.save();
      ctx.rotate((b / 4) * Math.PI * 2);
      // blade shape: pitched ellipse
      ctx.beginPath();
      ctx.ellipse(0, -fR * 0.52, fR * 0.21, fR * 0.42, 0.18, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(6,182,212,${0.55 + voltPct * 0.4})`;
      ctx.strokeStyle = `rgba(34,211,238,${0.4 + voltPct * 0.3})`;
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, fR * 0.13, 0, Math.PI * 2);
    ctx.fillStyle   = '#1e40af';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Wind lines flowing off the right side of the fan
    for (let w = 0; w < 5; w++) {
      const wy     = fCY + (w - 2) * fR * 0.36;
      const t      = ((phase * voltPct + w * 0.22) % 1);
      const windX  = fCX + fR + 8 + t * fanW * 0.5;
      const alpha  = (1 - t) * voltPct * 0.7;
      ctx.beginPath();
      ctx.moveTo(windX, wy);
      ctx.lineTo(windX + 16, wy);
      ctx.strokeStyle = `rgba(6,182,212,${alpha})`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle    = 'rgba(6,182,212,0.9)';
    ctx.font         = `bold ${Math.min(10, fanW * 0.16)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Fan Blades', fCX, fCY - fR - 7);

    // ── Summary bar ────────────────────────────────────────
    ctx.fillStyle    = 'rgba(245,158,11,0.85)';
    ctx.font         = `bold ${Math.min(11, W * 0.024)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `${Math.round(voltPct * 230)} V  →  ${Math.round(voltPct * 100)}% speed  →  ${Math.round(voltPct * 1450)} RPM`,
      W / 2, H - 6
    );

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
    phase += 0.035;

    // ── Layout ──────────────────────────────────────────────
    const fanZoneW  = W * 0.28;
    const midZoneW  = W * 0.26;
    const bodyZoneW = W * 0.22;
    const fanCX     = fanZoneW * 0.5;
    const fanCY     = H * 0.46;
    const fR        = Math.min(fanZoneW * 0.36, H * 0.26);
    const bodyCX    = fanZoneW + midZoneW + bodyZoneW * 0.48;
    const bodyTopY  = H * 0.14;
    const bodyH     = H * 0.72;

    // ══════════════════════════════════════════════════════
    // 1. SPINNING FAN  (left zone)
    // ══════════════════════════════════════════════════════
    const fanAngle = phase * 3;

    // Fan stand base
    ctx.fillStyle   = 'rgba(30,41,59,0.7)';
    ctx.strokeStyle = 'rgba(51,65,85,0.6)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.ellipse(fanCX, fanCY + fR + 28, fR * 0.45, fR * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // stand pole
    ctx.beginPath();
    ctx.roundRect(fanCX - 5, fanCY + fR, 10, 30, 3);
    ctx.fillStyle = '#334155';
    ctx.fill();

    // Guard ring
    ctx.beginPath();
    ctx.arc(fanCX, fanCY, fR + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth   = 5;
    ctx.stroke();
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(fanCX, fanCY);
      ctx.lineTo(fanCX + Math.cos(a) * (fR + 7), fanCY + Math.sin(a) * (fR + 7));
      ctx.strokeStyle = 'rgba(148,163,184,0.1)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Spinning blades
    ctx.save();
    ctx.translate(fanCX, fanCY);
    ctx.rotate(fanAngle);
    for (let b = 0; b < 4; b++) {
      ctx.save();
      ctx.rotate((b / 4) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -fR * 0.52, fR * 0.2, fR * 0.42, 0.18, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(59,130,246,0.75)';
      ctx.strokeStyle = 'rgba(96,165,250,0.5)';
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, fR * 0.13, 0, Math.PI * 2);
    ctx.fillStyle   = '#1e40af';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle    = 'rgba(148,163,184,0.7)';
    ctx.font         = `bold ${Math.min(10, fanZoneW * 0.11)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Electric Fan', fanCX, fanCY + fR + 40);

    // ══════════════════════════════════════════════════════
    // 2. AIRFLOW ARROWS  (mid zone, curved wind lines)
    // ══════════════════════════════════════════════════════
    const airX0 = fanCX + fR + 7;
    const airX1 = fanZoneW + midZoneW - 10;

    for (let row = 0; row < 6; row++) {
      const wy       = H * 0.22 + row * H * 0.11;
      const t        = ((phase + row * 0.18) % 1);
      const xPos     = airX0 + t * (airX1 - airX0);
      const alpha    = (1 - t) * 0.75;
      const lineLen  = 18 + row % 2 * 8;

      ctx.beginPath();
      ctx.moveTo(xPos, wy);
      ctx.lineTo(xPos + lineLen, wy);
      ctx.strokeStyle = `rgba(6,182,212,${alpha})`;
      ctx.lineWidth   = 1.8;
      ctx.stroke();

      // arrowhead
      ctx.beginPath();
      ctx.moveTo(xPos + lineLen - 6, wy - 3);
      ctx.lineTo(xPos + lineLen,     wy);
      ctx.lineTo(xPos + lineLen - 6, wy + 3);
      ctx.strokeStyle = `rgba(6,182,212,${alpha * 0.7})`;
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }

    // "Moving Air" label in the middle zone
    ctx.fillStyle    = 'rgba(6,182,212,0.55)';
    ctx.font         = `${Math.min(9, midZoneW * 0.12)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Moving Air →', fanZoneW + midZoneW / 2, H * 0.08);

    // ══════════════════════════════════════════════════════
    // 3. PERSON SILHOUETTE with skin surface detail
    // ══════════════════════════════════════════════════════
    const headR  = bodyH * 0.1;
    const headCX = bodyCX;
    const headCY = bodyTopY + headR;
    const torsoW = headR * 1.6;
    const torsoH = bodyH * 0.32;
    const torsoX = bodyCX - torsoW / 2;
    const torsoY = headCY + headR + 4;

    // Skin gradient (warm tone to show body temp)
    const skinGrad = ctx.createLinearGradient(torsoX, torsoY, torsoX + torsoW, torsoY + torsoH);
    skinGrad.addColorStop(0, 'rgba(251,146,60,0.35)');
    skinGrad.addColorStop(1, 'rgba(234,88,12,0.2)');

    // Torso
    ctx.fillStyle   = skinGrad;
    ctx.strokeStyle = 'rgba(251,146,60,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(torsoX, torsoY, torsoW, torsoH, 6);
    ctx.fill();
    ctx.stroke();

    // Arms
    const armW = torsoW * 0.28, armH = torsoH * 0.85;
    [[torsoX - armW - 2, torsoY + 4], [torsoX + torsoW + 2, torsoY + 4]].forEach(([ax, ay]) => {
      ctx.beginPath();
      ctx.roundRect(ax, ay, armW, armH, 5);
      ctx.fillStyle   = skinGrad;
      ctx.strokeStyle = 'rgba(251,146,60,0.4)';
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
    });

    // Legs
    const legW = torsoW * 0.37, legH = bodyH * 0.3;
    const legY  = torsoY + torsoH + 3;
    [torsoX + 3, torsoX + torsoW - legW - 3].forEach(lx => {
      ctx.beginPath();
      ctx.roundRect(lx, legY, legW, legH, 5);
      ctx.fillStyle   = skinGrad;
      ctx.strokeStyle = 'rgba(251,146,60,0.4)';
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
    });

    // Head
    ctx.beginPath();
    ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
    ctx.fillStyle   = skinGrad;
    ctx.strokeStyle = 'rgba(251,146,60,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();

    // Face details: eyes
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    [headCX - headR * 0.3, headCX + headR * 0.3].forEach(ex => {
      ctx.beginPath();
      ctx.ellipse(ex, headCY - headR * 0.1, headR * 0.1, headR * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // smile
    ctx.beginPath();
    ctx.arc(headCX, headCY + headR * 0.1, headR * 0.25, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = 'rgba(15,23,42,0.65)';
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // Body temperature label
    ctx.fillStyle    = 'rgba(251,146,60,0.7)';
    ctx.font         = `${Math.min(8, bodyZoneW * 0.14)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('37°C skin', bodyCX, torsoY + torsoH / 2);

    // ══════════════════════════════════════════════════════
    // 4. SWEAT DROPLETS on skin + EVAPORATION  (right zone)
    // ══════════════════════════════════════════════════════
    const dropPhase = phase * 0.85;
    const sweatPositions = [
      { bx: headCX,        by: headCY + headR * 0.5 },   // forehead
      { bx: torsoX + torsoW * 0.2, by: torsoY + torsoH * 0.25 },
      { bx: torsoX + torsoW * 0.8, by: torsoY + torsoH * 0.3 },
      { bx: torsoX + torsoW * 0.5, by: torsoY + torsoH * 0.6 },
      { bx: torsoX - armW * 0.3,   by: torsoY + armH  * 0.4 },
      { bx: torsoX + torsoW + armW * 1.3, by: torsoY + armH * 0.35 },
    ];

    sweatPositions.forEach((sp, si) => {
      const t  = (dropPhase + si * 0.17) % 1;
      const ey = sp.by - t * H * 0.28;          // rises upward
      const a  = (1 - t * 0.9);                 // fades as it rises

      // teardrop sweat drop (circle with pointed bottom) – shown on skin
      if (t < 0.25) {
        const dr = 4 * (1 - t / 0.25);           // shrinks as it lifts
        ctx.beginPath();
        ctx.arc(sp.bx, sp.by, dr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6,182,212,0.6)';
        ctx.fill();
      }

      // rising droplet
      const er = 3.5 * (1 - t * 0.6);
      ctx.beginPath();
      // teardrop: arc top + pointed bottom via quadratic
      ctx.arc(sp.bx, ey - er * 0.5, er, Math.PI, 0);
      ctx.quadraticCurveTo(sp.bx + er, ey + er * 0.4, sp.bx, ey + er);
      ctx.quadraticCurveTo(sp.bx - er, ey + er * 0.4, sp.bx - er, ey - er * 0.5);
      ctx.closePath();
      ctx.fillStyle = `rgba(6,182,212,${a * 0.65})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(34,211,238,${a * 0.4})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();

      // heat wavy line above evaporating drop (shimmer)
      if (t > 0.4) {
        const hx = sp.bx, hy = ey - er - 4;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        for (let i = 0; i < 16; i++) {
          const wx = hx + Math.sin(i * 0.9 + phase * 2 + si) * 4;
          ctx.lineTo(wx, hy - i * 2.2);
        }
        ctx.strokeStyle = `rgba(251,146,60,${(t - 0.4) * 0.6})`;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    });

    // ══════════════════════════════════════════════════════
    // 5. INFO PANELS (right of person)
    // ══════════════════════════════════════════════════════
    const infoX = bodyCX + bodyZoneW * 0.55;
    const infoW = W - infoX - 8;

    if (infoW > 40) {
      // Evaporation formula pill
      const pilY = H * 0.18;
      ctx.fillStyle   = 'rgba(6,182,212,0.1)';
      ctx.strokeStyle = 'rgba(6,182,212,0.5)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect(infoX, pilY, infoW, H * 0.14, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle    = 'rgba(6,182,212,0.9)';
      ctx.font         = `bold ${Math.min(10, infoW * 0.2)}px monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Q = m·Lv', infoX + infoW / 2, pilY + H * 0.05);
      ctx.font         = `${Math.min(7, infoW * 0.14)}px sans-serif`;
      ctx.fillStyle    = 'rgba(148,163,184,0.75)';
      ctx.fillText('2260 J / g', infoX + infoW / 2, pilY + H * 0.095);

      // Airflow arrows entering person
      for (let aw = 0; aw < 3; aw++) {
        const awy = H * (0.32 + aw * 0.14);
        const at  = ((phase * 1.2 + aw * 0.35) % 1);
        const axP = airX1 + at * (bodyCX - torsoW * 0.7 - airX1 - 8);
        ctx.beginPath();
        ctx.moveTo(axP, awy);
        ctx.lineTo(axP + 14, awy);
        ctx.strokeStyle = `rgba(6,182,212,${(1 - at) * 0.55})`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }

      // Energy saved label
      const eY = H * 0.52;
      ctx.fillStyle   = 'rgba(16,185,129,0.1)';
      ctx.strokeStyle = 'rgba(16,185,129,0.45)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect(infoX, eY, infoW, H * 0.4, 6);
      ctx.fill();
      ctx.stroke();
      const rows = [
        { lbl: 'Ceiling Fan', w: 0.06,  v: '30 W',   c: '6,182,212' },
        { lbl: 'Pedestal Fan', w: 0.1,  v: '55 W',   c: '59,130,246' },
        { lbl: 'Window AC',    w: 0.9,  v: '900 W',  c: '245,158,11' },
        { lbl: 'Split AC 1.5T', w: 1.0, v: '1500 W', c: '239,68,68'  },
      ];
      const barAreaX = infoX + 4, barAreaW = infoW - 8;
      const rowH  = H * 0.09;
      const fSize = Math.min(7, infoW * 0.13);
      rows.forEach((r, ri) => {
        const ry = eY + 6 + ri * rowH;
        ctx.fillStyle    = 'rgba(148,163,184,0.6)';
        ctx.font         = `${fSize}px sans-serif`;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(r.lbl, barAreaX, ry);
        const bY = ry + fSize + 2;
        const bH = rowH - fSize - 8;
        ctx.fillStyle = 'rgba(30,41,59,0.6)';
        ctx.beginPath();
        ctx.roundRect(barAreaX, bY, barAreaW, bH, 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${r.c},0.75)`;
        ctx.beginPath();
        ctx.roundRect(barAreaX, bY, barAreaW * r.w, bH, 2);
        ctx.fill();
        ctx.fillStyle    = '#f0f9ff';
        ctx.font         = `bold ${fSize}px monospace`;
        ctx.textAlign    = 'right';
        ctx.fillText(r.v, barAreaX + barAreaW - 2, bY);
      });
      ctx.fillStyle    = 'rgba(16,185,129,0.7)';
      ctx.font         = `bold ${fSize + 1}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Power Comparison', infoX + infoW / 2, eY - 2);
    }

    // ── Bottom caption ──────────────────────────────────
    ctx.fillStyle    = 'rgba(6,182,212,0.65)';
    ctx.font         = `${Math.min(9, W * 0.022)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Fan accelerates sweat evaporation \u2192 removes latent heat (Q = m\u00b7Lv)', W / 2, H - 4);

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
