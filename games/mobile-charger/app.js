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
   Realistic circuit: AC outlet → EMI filter coils → bridge-rectifier
   diodes → MOSFET → ferrite transformer → output diode+cap → USB plug.
   Animated current particles flow along wires at each stage.
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

  // ── helper: animated wire with current dots ──────────────────
  function drawWire(x1, x2, wy, speed, dotColor) {
    ctx.beginPath();
    ctx.moveTo(x1, wy);
    ctx.lineTo(x2, wy);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // arrowhead
    ctx.beginPath();
    ctx.moveTo(x2 - 7, wy - 4);
    ctx.lineTo(x2 - 1, wy);
    ctx.lineTo(x2 - 7, wy + 4);
    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // flowing dots
    for (let d = 0; d < 4; d++) {
      const t = ((phase * speed + d / 4) % 1);
      const px = x1 + t * (x2 - x1);
      ctx.beginPath();
      ctx.arc(px, wy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }
  }

  // ── AC outlet ───────────────────────────────────────────────
  function drawOutlet(cx, cy, r) {
    ctx.fillStyle   = 'rgba(226,232,240,0.1)';
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - r, cy - r, r * 2, r * 2, r * 0.18);
    ctx.fill(); ctx.stroke();
    const slotW = r * 0.14, slotH = r * 0.44;
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    [-r * 0.3, r * 0.3].forEach(sx => {
      ctx.beginPath();
      ctx.roundRect(cx + sx - slotW / 2, cy - slotH / 2, slotW, slotH, 2);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.42, r * 0.1, 0, Math.PI);
    ctx.strokeStyle = 'rgba(15,23,42,0.85)';
    ctx.lineWidth   = r * 0.12;
    ctx.stroke();
  }

  // ── EMI filter coils ────────────────────────────────────────
  function drawCoils(x, y, w, h) {
    const loops = 5, cx = x + w / 2, cy = y + h / 2;
    const lw = w * 0.7 / loops, cr = h * 0.18;
    // inductor line
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, cy);
    ctx.lineTo(x + w * 0.95, cy);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // loops
    for (let i = 0; i < loops; i++) {
      const lx = x + w * 0.15 + i * lw + lw / 2;
      ctx.beginPath();
      ctx.arc(lx, cy, cr, Math.PI, 0);
      ctx.strokeStyle = 'rgba(148,163,184,0.85)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    // capacitor symbol below
    const capX = cx, capY = cy + h * 0.3;
    ctx.strokeStyle = 'rgba(148,163,184,0.6)';
    ctx.lineWidth = 2;
    [-3, 3].forEach(dy => {
      ctx.beginPath();
      ctx.moveTo(capX - 9, capY + dy);
      ctx.lineTo(capX + 9, capY + dy);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(capX, capY - 8);
    ctx.lineTo(capX, capY - 3);
    ctx.moveTo(capX, capY + 3);
    ctx.lineTo(capX, capY + 8);
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── Bridge rectifier (4 diodes in diamond) ──────────────────
  function drawBridge(x, y, w, h, glow) {
    const cx = x + w / 2, cy = y + h / 2;
    const dr = Math.min(w, h) * 0.23;
    // diamond wires
    ctx.strokeStyle = `rgba(124,58,237,${0.3 + glow * 0.4})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - dr, cy);
    ctx.lineTo(cx, cy - dr);
    ctx.lineTo(cx + dr, cy);
    ctx.lineTo(cx, cy + dr);
    ctx.closePath();
    ctx.stroke();
    // 4 diode triangles at each edge
    [
      [cx - dr * 0.5, cy - dr * 0.5, -Math.PI / 4],
      [cx + dr * 0.5, cy - dr * 0.5,  Math.PI / 4],
      [cx - dr * 0.5, cy + dr * 0.5, -Math.PI * 3 / 4],
      [cx + dr * 0.5, cy + dr * 0.5,  Math.PI * 3 / 4],
    ].forEach(([dx, dy, ang]) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(5, 5); ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fillStyle = `rgba(124,58,237,${0.5 + glow * 0.4})`;
      ctx.fill();
      ctx.restore();
    });
    // glow border
    ctx.shadowColor = `rgba(124,58,237,${glow * 0.6})`;
    ctx.shadowBlur  = 8;
    ctx.strokeStyle = `rgba(124,58,237,${0.4 + glow * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── MOSFET transistor symbol ─────────────────────────────────
  function drawMosfet(x, y, w, h, glow) {
    const cx = x + w / 2, cy = y + h / 2;
    const s  = Math.min(w, h) * 0.32;
    // body
    ctx.strokeStyle = `rgba(245,158,11,${0.5 + glow * 0.45})`;
    ctx.lineWidth = 1.5;
    // drain/source vertical line
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.3, cy - s);
    ctx.lineTo(cx + s * 0.3, cy + s);
    ctx.stroke();
    // gate horizontal
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.6, cy);
    ctx.lineTo(cx + s * 0.1, cy);
    ctx.stroke();
    // gate vertical bar
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.1, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.1, cy + s * 0.6);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // channel connections (D and S)
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.3, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.5, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.5, cy - s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.3, cy + s * 0.4);
    ctx.lineTo(cx + s * 0.5, cy + s * 0.4);
    ctx.lineTo(cx + s * 0.5, cy + s);
    ctx.stroke();
    // arrow for N-ch
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.3, cy);
    ctx.lineTo(cx + s * 0.1, cy);
    ctx.strokeStyle = `rgba(245,158,11,${0.7 + glow * 0.3})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.18, cy - s * 0.07);
    ctx.lineTo(cx + s * 0.3, cy);
    ctx.lineTo(cx + s * 0.18, cy + s * 0.07);
    ctx.fillStyle = `rgba(245,158,11,${0.7 + glow * 0.3})`;
    ctx.fill();
    // PWM pulse on gate
    const pwX = cx - s * 0.55, pwY = cy, pwW = s * 0.4, pwH = s * 0.35;
    ctx.strokeStyle = `rgba(245,158,11,${0.5 + glow * 0.35})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const bx = pwX + (i / 3) * pwW;
      const bw2 = pwW / 3;
      const hi  = ((i + Math.floor(phase * 3)) % 2 === 0);
      ctx.beginPath();
      ctx.moveTo(bx, hi ? pwY - pwH : pwY);
      ctx.lineTo(bx + bw2 * 0.5, hi ? pwY - pwH : pwY);
      ctx.lineTo(bx + bw2 * 0.5, hi ? pwY : pwY - pwH);
      ctx.lineTo(bx + bw2, hi ? pwY : pwY - pwH);
      ctx.stroke();
    }
    // glow box
    ctx.shadowColor = `rgba(245,158,11,${glow * 0.5})`;
    ctx.shadowBlur  = 6;
    ctx.strokeStyle = `rgba(245,158,11,${0.35 + glow * 0.4})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Ferrite transformer (E-core) ─────────────────────────────
  function drawTransformer(x, y, w, h, glow) {
    const cx = x + w / 2, cy = y + h / 2;
    const coreH = h * 0.6, coreW = w * 0.18;
    // primary winding coils (left)
    const priX = cx - w * 0.25;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(priX, cy - coreH * 0.3 + i * coreH * 0.2, coreW * 0.9, Math.PI, 0);
      ctx.strokeStyle = `rgba(16,185,129,${0.55 + glow * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // secondary winding coils (right)
    const secX = cx + w * 0.25;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(secX, cy - coreH * 0.2 + i * coreH * 0.22, coreW * 0.9, 0, Math.PI);
      ctx.strokeStyle = `rgba(74,222,128,${0.55 + glow * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // E-core bars
    ctx.fillStyle = `rgba(30,41,59,0.9)`;
    [[cx - coreW * 0.5, cy - coreH * 0.5, coreW, coreH],
     [cx - coreW * 0.5, cy - coreH * 0.08, coreW, coreH * 0.16]].forEach(([rx, ry, rw, rh]) => {
      ctx.fillRect(rx, ry, rw, rh);
    });
    ctx.strokeStyle = `rgba(16,185,129,${0.5 + glow * 0.4})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - coreW * 0.5, cy - coreH * 0.5, coreW, coreH);
    // glow border
    ctx.shadowColor = `rgba(16,185,129,${glow * 0.5})`;
    ctx.shadowBlur  = 8;
    ctx.strokeStyle = `rgba(16,185,129,${0.35 + glow * 0.4})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Output stage: diode + capacitor ─────────────────────────
  function drawOutput(x, y, w, h, glow) {
    const cx = x + w / 2, cy = y + h / 2;
    // diode symbol
    const dx = cx - w * 0.15, ds = Math.min(w, h) * 0.2;
    ctx.beginPath();
    ctx.moveTo(dx - ds, cy - ds * 0.6);
    ctx.lineTo(dx + ds * 0.5, cy);
    ctx.lineTo(dx - ds, cy + ds * 0.6);
    ctx.closePath();
    ctx.fillStyle = `rgba(74,222,128,${0.55 + glow * 0.35})`;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(dx + ds * 0.5, cy - ds * 0.65);
    ctx.lineTo(dx + ds * 0.5, cy + ds * 0.65);
    ctx.strokeStyle = `rgba(74,222,128,${0.8 + glow * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    // capacitor plates
    const capX = cx + w * 0.25, capY = cy;
    ctx.strokeStyle = `rgba(74,222,128,${0.7 + glow * 0.3})`;
    ctx.lineWidth = 2;
    [-5, 5].forEach(dy => {
      ctx.beginPath();
      ctx.moveTo(capX - 10, capY + dy);
      ctx.lineTo(capX + 10, capY + dy);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(capX, capY - 12);
    ctx.lineTo(capX, capY - 5);
    ctx.moveTo(capX, capY + 5);
    ctx.lineTo(capX, capY + 12);
    ctx.strokeStyle = `rgba(74,222,128,${0.4 + glow * 0.3})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // DC line connecting diode to cap
    ctx.beginPath();
    ctx.moveTo(dx + ds * 0.5, cy);
    ctx.lineTo(capX - 10, cy);
    ctx.strokeStyle = `rgba(74,222,128,${0.3 + glow * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    // glow border
    ctx.shadowColor = `rgba(74,222,128,${glow * 0.5})`;
    ctx.shadowBlur  = 8;
    ctx.strokeStyle = `rgba(74,222,128,${0.35 + glow * 0.4})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── USB plug ─────────────────────────────────────────────────
  function drawUsb(x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    const pw = w * 0.5, ph = h * 0.4;
    // connector body
    ctx.fillStyle = 'rgba(51,65,85,0.85)';
    ctx.strokeStyle = 'rgba(74,222,128,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, 3);
    ctx.fill(); ctx.stroke();
    // contacts
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(74,222,128,0.5)';
      ctx.fillRect(cx - pw * 0.38 + i * pw * 0.22, cy - ph * 0.2, pw * 0.1, ph * 0.4);
    }
    // cable line to the right edge
    ctx.beginPath();
    ctx.moveTo(cx + pw / 2, cy);
    ctx.lineTo(x + w, cy);
    ctx.strokeStyle = 'rgba(74,222,128,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 5V DC label
    ctx.fillStyle = 'rgba(74,222,128,0.85)';
    ctx.font = `bold ${Math.min(10, w * 0.18)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('5 V DC', cx, cy + ph / 2 + 6);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.04;

    const margin  = W * 0.03;
    const usableW = W - margin * 2;
    const cy      = H * 0.45;
    const bh      = Math.min(H * 0.65, 160);

    // 6 components: outlet, EMI, bridge, MOSFET, Xfmr, output
    const N    = 6;
    const bw   = usableW / (N + (N - 1) * 0.28);
    const gap  = bw * 0.28;

    const xs = Array.from({ length: N }, (_, i) => margin + i * (bw + gap));
    const y0 = cy - bh / 2;

    // Glow phase (sin for pulse effect)
    const glow = 0.5 + Math.sin(phase) * 0.4;

    // ── Draw wires between each pair ──────────────────────────
    const WIRE_COLORS = [
      'rgba(148,163,184,0.7)',  // AC: outlet → EMI
      'rgba(124,58,237,0.85)', // pulsed DC: EMI → bridge
      'rgba(245,158,11,0.85)', // HF: bridge → MOSFET
      'rgba(16,185,129,0.85)', // HF AC: MOSFET → Xfmr
      'rgba(74,222,128,0.85)', // DC: Xfmr → output
    ];
    const WIRE_SPEEDS = [1.2, 1.5, 2, 1.4, 1.2];
    for (let i = 0; i < N - 1; i++) {
      drawWire(xs[i] + bw, xs[i + 1], cy, WIRE_SPEEDS[i], WIRE_COLORS[i]);
    }

    // ── Draw each component ───────────────────────────────────
    // 0: AC Outlet
    const outR = Math.min(bw * 0.44, bh * 0.3);
    drawOutlet(xs[0] + bw / 2, cy, outR);
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.font = `bold ${Math.min(9, bw * 0.17)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('230 V AC', xs[0] + bw / 2, y0 + bh + 6);

    // animated sine on first wire
    const sineX1 = xs[0] + bw * 0.5 + outR + 2, sineX2 = xs[1] - 2;
    if (sineX2 > sineX1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(148,163,184,0.75)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= sineX2 - sineX1; x++) {
        const t = x / (sineX2 - sineX1);
        const y = cy - Math.sin(t * Math.PI * 4 + phase) * bh * 0.08;
        x === 0 ? ctx.moveTo(sineX1 + x, y) : ctx.lineTo(sineX1 + x, y);
      }
      ctx.stroke();
    }

    // 1: EMI Filter (box with coil symbols)
    ctx.fillStyle = 'rgba(30,41,59,0.55)';
    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(xs[1], y0, bw, bh, 6);
    ctx.fill(); ctx.stroke();
    drawCoils(xs[1], y0, bw, bh);
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.font = `bold ${Math.min(8, bw * 0.155)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('EMI Filter', xs[1] + bw / 2, y0 + 5);
    ctx.fillStyle = 'rgba(100,116,139,0.7)';
    ctx.font = `${Math.min(7, bw * 0.13)}px sans-serif`;
    ctx.fillText('LC Network', xs[1] + bw / 2, y0 + bh + 6);

    // 2: Bridge Rectifier
    ctx.fillStyle = 'rgba(20,10,50,0.55)';
    ctx.beginPath();
    ctx.roundRect(xs[2], y0, bw, bh, 6);
    ctx.fill();
    drawBridge(xs[2], y0, bw, bh, glow);
    ctx.fillStyle = 'rgba(124,58,237,0.85)';
    ctx.font = `bold ${Math.min(8, bw * 0.155)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Rectifier', xs[2] + bw / 2, y0 + 5);
    ctx.fillStyle = 'rgba(124,58,237,0.55)';
    ctx.font = `${Math.min(7, bw * 0.13)}px sans-serif`;
    ctx.fillText('Pulsed DC', xs[2] + bw / 2, y0 + bh + 6);

    // 3: MOSFET
    ctx.fillStyle = 'rgba(40,25,5,0.55)';
    ctx.beginPath();
    ctx.roundRect(xs[3], y0, bw, bh, 6);
    ctx.fill();
    drawMosfet(xs[3], y0, bw, bh, glow);
    ctx.fillStyle = 'rgba(245,158,11,0.85)';
    ctx.font = `bold ${Math.min(8, bw * 0.155)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('MOSFET', xs[3] + bw / 2, y0 + 5);
    ctx.fillStyle = 'rgba(245,158,11,0.55)';
    ctx.font = `${Math.min(7, bw * 0.13)}px sans-serif`;
    ctx.fillText('~100 kHz', xs[3] + bw / 2, y0 + bh + 6);

    // 4: Ferrite Transformer
    ctx.fillStyle = 'rgba(5,30,20,0.55)';
    ctx.beginPath();
    ctx.roundRect(xs[4], y0, bw, bh, 6);
    ctx.fill();
    drawTransformer(xs[4], y0, bw, bh, glow);
    ctx.fillStyle = 'rgba(16,185,129,0.85)';
    ctx.font = `bold ${Math.min(8, bw * 0.155)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('HF Xfmr', xs[4] + bw / 2, y0 + 5);
    ctx.fillStyle = 'rgba(16,185,129,0.55)';
    ctx.font = `${Math.min(7, bw * 0.13)}px sans-serif`;
    ctx.fillText('Ferrite Core', xs[4] + bw / 2, y0 + bh + 6);

    // 5: Output Stage
    ctx.fillStyle = 'rgba(5,25,15,0.55)';
    ctx.beginPath();
    ctx.roundRect(xs[5], y0, bw, bh, 6);
    ctx.fill();
    drawOutput(xs[5], y0, bw, bh, glow);
    ctx.fillStyle = 'rgba(74,222,128,0.85)';
    ctx.font = `bold ${Math.min(8, bw * 0.155)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Output', xs[5] + bw / 2, y0 + 5);
    drawUsb(xs[5], y0, bw, bh);

    // ── Summary bar at bottom ─────────────────────────────────
    ctx.fillStyle = 'rgba(200,200,220,0.45)';
    ctx.font = `${Math.min(9, W * 0.022)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('230 V AC  →  pulsed DC  →  ~100 kHz HF  →  5 V DC    (η ≈ 90-95%)', W / 2, H - 4);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   4. SCENE 3 – Rectifier waveform canvas
   3 stacked oscilloscope panels: AC input · full-wave rectified · smoothed DC.
   Each panel has a dark background, grid lines, zero-axis, voltage tick marks,
   a period marker and an animated sample-point dot.
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

  function drawPanel(panelY, panelH, label, color, waveFn, sampleT) {
    const pad = { l: 54, r: 8, t: 14, b: 8 };
    const areaX = pad.l, areaY = panelY + pad.t;
    const areaW = W - pad.l - pad.r, areaH = panelH - pad.t - pad.b;
    const amp = areaH * 0.36;
    const midY = areaY + areaH / 2;

    // panel background
    ctx.fillStyle = 'rgba(10,15,30,0.7)';
    ctx.beginPath();
    ctx.roundRect(areaX - 2, areaY - 2, areaW + 4, areaH + 4, 4);
    ctx.fill();

    // grid lines
    ctx.strokeStyle = 'rgba(100,116,139,0.15)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 5]);
    for (let i = 1; i < 4; i++) {
      const gx = areaX + (i / 4) * areaW;
      ctx.beginPath(); ctx.moveTo(gx, areaY); ctx.lineTo(gx, areaY + areaH); ctx.stroke();
    }
    [0.25, 0.5, 0.75].forEach(f => {
      const gy = areaY + f * areaH;
      ctx.beginPath(); ctx.moveTo(areaX, gy); ctx.lineTo(areaX + areaW, gy); ctx.stroke();
    });
    ctx.setLineDash([]);

    // zero axis
    ctx.beginPath();
    ctx.moveTo(areaX, midY);
    ctx.lineTo(areaX + areaW, midY);
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // voltage tick marks on y-axis
    ctx.fillStyle = 'rgba(100,116,139,0.7)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('+1', areaX - 4, midY - amp);
    ctx.fillText('0',  areaX - 4, midY);
    ctx.fillText('−1', areaX - 4, midY + amp);

    // waveform
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let xi = 0; xi <= areaW; xi++) {
      const t = (xi / areaW) * Math.PI * 4 + phase;
      const yv = midY - waveFn(t) * amp;
      xi === 0 ? ctx.moveTo(areaX + xi, yv) : ctx.lineTo(areaX + xi, yv);
    }
    ctx.stroke();

    // animated sample dot
    const sdot = ((sampleT + phase * 0.25) % (Math.PI * 4)) / (Math.PI * 4);
    const sdx = areaX + sdot * areaW;
    const sdy = midY - waveFn(sdot * Math.PI * 4 + phase) * amp;
    ctx.beginPath();
    ctx.arc(sdx, sdy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sdx, sdy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // period marker bracket
    const perW = areaW / 2;
    const bracketY = areaY + areaH + 4;
    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(areaX, bracketY);
    ctx.lineTo(areaX + perW, bracketY);
    ctx.stroke();
    ctx.fillStyle = `${color}99`;
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('T/2', areaX + perW / 2, bracketY + 1);

    // label (left side)
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.min(9, W * 0.022)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 4, panelY + 4);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.035;

    const pH = H / 3;

    drawPanel(0,      pH, 'AC Input  230 V',      'rgba(124,58,237,0.9)',
      t => Math.sin(t),                          0.5);
    drawPanel(pH,     pH, 'Full-wave Rectified',   'rgba(245,158,11,0.9)',
      t => Math.abs(Math.sin(t)),                1.5);
    drawPanel(pH * 2, pH, 'Smoothed DC  5 V',      'rgba(16,185,129,0.9)',
      t => 0.7 + Math.sin(t * 2) * 0.045,       2.5);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   5. SCENE 4 – Voltage Regulation Feedback Circuit
   Two-row realistic circuit:
     Top row (forward path):  MAINS → MOSFET (transistor) → HF Xfmr → Vout node
     Bottom row (feedback):   Vout → Resistor divider → Error-amp (op-amp Δ) →
                               Optocoupler (LED→phototransistor) → PWM IC → MOSFET gate
   Signal dots animate around both paths; isolation dashed line separates HV/LV.
════════════════════════════════════════════════════════════════ */
(function initVregCanvas() {
  const canvas = $('#vreg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let phase = 0;
  let vout = 5.0;
  let duty = 0.5;

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

  // ── Dot along path ──────────────────────────────────────────
  function animDot(path, t, color, r) {
    if (path.length < 2) return;
    const total = path.length - 1;
    const seg   = Math.min(total - 1, Math.floor(t * total));
    const frac  = (t * total) - seg;
    const p0    = path[seg], p1 = path[seg + 1];
    if (!p0 || !p1) return;
    ctx.beginPath();
    ctx.arc(p0.x + (p1.x - p0.x) * frac, p0.y + (p1.y - p0.y) * frac, r || 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ── Draw dashed wire segment ─────────────────────────────────
  function wire(x1, y1, x2, y2, color, lw) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || 'rgba(100,116,139,0.4)';
    ctx.lineWidth = lw || 1.5;
    ctx.stroke();
  }

  // ── MOSFET transistor symbol ─────────────────────────────────
  function drawMosfetSym(cx, cy, s, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // D/S vertical bar
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.35, cy - s);
    ctx.lineTo(cx + s * 0.35, cy + s);
    ctx.stroke();
    // channel connections D and S
    [cy - s * 0.45, cy + s * 0.45].forEach(ry => {
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.35, ry);
      ctx.lineTo(cx + s * 0.6, ry);
      ctx.stroke();
    });
    // gate bar and line
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.15, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.15, cy + s * 0.6);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy);
    ctx.lineTo(cx + s * 0.15, cy);
    ctx.stroke();
    // N-ch arrow
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.15, cy);
    ctx.lineTo(cx + s * 0.35, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.22, cy - s * 0.07);
    ctx.lineTo(cx + s * 0.35, cy);
    ctx.lineTo(cx + s * 0.22, cy + s * 0.07);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ── Op-amp triangle ──────────────────────────────────────────
  function drawOpAmp(cx, cy, s, color, outputV) {
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s * 0.7);
    ctx.lineTo(cx - s, cy + s * 0.7);
    ctx.lineTo(cx + s, cy);
    ctx.closePath();
    ctx.fillStyle = `${color}22`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // + and - inputs
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.min(9, s * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', cx - s * 0.5, cy - s * 0.35);
    ctx.fillText('−', cx - s * 0.5, cy + s * 0.35);
    // output line
    wire(cx + s, cy, cx + s * 1.6, cy, color, 1.5);
    // Vref label
    ctx.fillStyle = `${color}99`;
    ctx.font = `${Math.min(7, s * 0.44)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`err=${outputV.toFixed(2)}`, cx - s * 0.05, cy + s * 0.8);
  }

  // ── Resistor divider (ladder) ────────────────────────────────
  function drawDivider(x, y, w, h, color) {
    const cx = x + w / 2;
    const rh = h * 0.22, rw = w * 0.35;
    // top wire from Vout
    wire(cx, y, cx, y + h * 0.15, color, 1.5);
    // R1
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - rw / 2, y + h * 0.15, rw, rh, 3);
    ctx.stroke();
    ctx.fillStyle = `${color}22`;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = `${Math.min(7, w * 0.18)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R1', cx, y + h * 0.15 + rh / 2);
    // middle node (sampled point)
    wire(cx, y + h * 0.15 + rh, cx, y + h * 0.5, color, 1.5);
    // Vsample dot
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.5, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // R2
    ctx.beginPath();
    ctx.roundRect(cx - rw / 2, y + h * 0.5, rw, rh, 3);
    ctx.stroke();
    ctx.fillStyle = `${color}22`;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText('R2', cx, y + h * 0.5 + rh / 2);
    // bottom wire to GND
    wire(cx, y + h * 0.5 + rh, cx, y + h * 0.86, color, 1.5);
    // GND symbol
    const gx = cx, gy = y + h * 0.86;
    [0, 5, 10].forEach((d, i) => {
      const hw = (12 - i * 4) / 2;
      ctx.beginPath();
      ctx.moveTo(gx - hw, gy + d);
      ctx.lineTo(gx + hw, gy + d);
      ctx.strokeStyle = `${color}88`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // ── Optocoupler box ──────────────────────────────────────────
  function drawOpto(cx, cy, s, color, glow) {
    // box
    ctx.fillStyle = 'rgba(30,41,59,0.6)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx - s, cy - s * 0.8, s * 2, s * 1.6, 6);
    ctx.fill(); ctx.stroke();
    // LED symbol (left half)
    const lx = cx - s * 0.45, ly = cy - s * 0.15;
    ctx.beginPath();
    ctx.moveTo(lx - s * 0.25, ly - s * 0.3);
    ctx.lineTo(lx + s * 0.25, ly);
    ctx.lineTo(lx - s * 0.25, ly + s * 0.3);
    ctx.closePath();
    ctx.fillStyle = `rgba(249,115,22,${0.45 + glow * 0.5})`;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(lx + s * 0.25, ly - s * 0.3);
    ctx.lineTo(lx + s * 0.25, ly + s * 0.3);
    ctx.strokeStyle = 'rgba(249,115,22,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // light rays
    ctx.strokeStyle = `rgba(251,191,36,${glow * 0.8})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);
    for (let r = 0; r < 3; r++) {
      const ang = -Math.PI * 0.35 + r * 0.35;
      ctx.beginPath();
      ctx.moveTo(lx + s * 0.25, ly);
      ctx.lineTo(lx + s * 0.25 + Math.cos(ang) * s * 0.45,
                 ly + Math.sin(ang) * s * 0.45);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // phototransistor (right half)
    const tx = cx + s * 0.32, ty = cy;
    ctx.strokeStyle = `rgba(59,130,246,${0.5 + glow * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(tx, ty, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(59,130,246,${glow * 0.3})`;
    ctx.fill();
    // label
    ctx.fillStyle = color;
    ctx.font = `${Math.min(7, s * 0.38)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('OPTO', cx, cy + s * 0.9);
  }

  // ── PWM IC box ───────────────────────────────────────────────
  function drawPwmIc(x, y, w, h, color, dutyFrac) {
    ctx.fillStyle = 'rgba(30,41,59,0.8)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill(); ctx.stroke();
    // PWM waveform inside
    const pw = w * 0.75, ph = h * 0.35;
    const wx = x + w * 0.12, wy = y + h * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const bx = wx + i * pw / 3;
      const bw2 = pw / 3;
      const hi = i % 2 === 0;
      ctx.moveTo(bx, hi ? wy - ph : wy);
      ctx.lineTo(bx + bw2 * dutyFrac, hi ? wy - ph : wy);
      ctx.lineTo(bx + bw2 * dutyFrac, hi ? wy : wy - ph);
      ctx.lineTo(bx + bw2, hi ? wy : wy - ph);
    }
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.min(8, w * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('PWM IC', x + w / 2, y + 5);
    ctx.fillStyle = `${color}88`;
    ctx.font = `${Math.min(7, w * 0.13)}px monospace`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(`D=${Math.round(dutyFrac * 100)}%`, x + w / 2, y + h - 3);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.022;

    // Simulated load disturbance + regulation
    const disturbance = Math.sin(phase * 0.4) * 0.35;
    const target = 5.0;
    vout = target + disturbance * 0.12;
    const errSignal = (vout - target) * 0.6;
    duty = 0.5 - errSignal * 0.3;
    duty = Math.max(0.15, Math.min(0.85, duty));

    const margin = W * 0.03;
    const usableW = W - margin * 2;

    const row1Y  = H * 0.06;
    const row1H  = H * 0.32;
    const row2Y  = H * 0.60;
    const row2H  = H * 0.33;
    const midCY1 = row1Y + row1H / 2;
    const midCY2 = row2Y + row2H / 2;

    // 4 forward components + 4 feedback components
    const fwdN = 4, fbkN = 4;
    const fwdBW = usableW / (fwdN + (fwdN - 1) * 0.28);
    const fwdGap = fwdBW * 0.28;
    const fbkBW = usableW / (fbkN + (fbkN - 1) * 0.28);
    const fbkGap = fbkBW * 0.28;

    // Forward path x-positions
    const fxs = Array.from({ length: fwdN }, (_, i) => margin + i * (fwdBW + fwdGap));

    const glow = 0.45 + Math.sin(phase * 1.8) * 0.45;

    // ── Isolation boundary dashed line ────────────────────────
    const isoY = (row1Y + row1H + row2Y) / 2;
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(margin, isoY);
    ctx.lineTo(W - margin, isoY);
    ctx.strokeStyle = 'rgba(251,191,36,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(251,191,36,0.38)';
    ctx.font = `${Math.min(7, W * 0.017)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('↑ Primary HV side', W - margin, isoY - 2);
    ctx.textBaseline = 'top';
    ctx.fillText('↓ Secondary LV side', W - margin, isoY + 2);

    // ── Forward path wires ────────────────────────────────────
    for (let i = 0; i < fwdN - 1; i++) {
      const WC = ['rgba(148,163,184,0.5)', 'rgba(245,158,11,0.6)', 'rgba(16,185,129,0.5)', 'rgba(74,222,128,0.5)'][i];
      wire(fxs[i] + fwdBW, midCY1, fxs[i + 1], midCY1, WC, 2);
      // arrowhead
      ctx.beginPath();
      ctx.moveTo(fxs[i + 1] - 8, midCY1 - 4);
      ctx.lineTo(fxs[i + 1] - 2, midCY1);
      ctx.lineTo(fxs[i + 1] - 8, midCY1 + 4);
      ctx.strokeStyle = WC; ctx.lineWidth = 1.2; ctx.stroke();
    }

    // ── Vertical connectors (Vout → divider input, PWM → MOSFET gate) ──
    wire(fxs[3] + fwdBW / 2, row1Y + row1H, fxs[3] + fwdBW / 2, row2Y, 'rgba(74,222,128,0.4)', 1.5);
    wire(fxs[0] + fwdBW / 2, row2Y + row2H, fxs[0] + fwdBW / 2, row1Y + row1H, 'rgba(59,130,246,0.4)', 1.5);

    // ── Feedback path wires (right → left) ────────────────────
    const fbkColors = ['rgba(167,139,250,0.55)', 'rgba(251,191,36,0.55)', 'rgba(249,115,22,0.55)'];
    wire(fxs[3] + fwdBW / 2, midCY2,  fxs[2] + fbkBW, midCY2, fbkColors[0], 1.5);
    wire(fxs[2] + fbkBW * 0.5, midCY2, fxs[1] + fbkBW, midCY2, fbkColors[1], 1.5);
    wire(fxs[1], midCY2, fxs[0] + fwdBW, midCY2, fbkColors[2], 1.5);

    // ── Forward components ────────────────────────────────────
    // 0: MAINS block
    ctx.fillStyle = 'rgba(30,41,59,0.55)';
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fxs[0], row1Y, fwdBW, row1H, 7);
    ctx.fill(); ctx.stroke();
    // AC sine inside
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(148,163,184,0.8)';
    ctx.lineWidth = 1.5;
    for (let xi = 0; xi <= fwdBW * 0.7; xi++) {
      const t = (xi / (fwdBW * 0.7)) * Math.PI * 3 + phase;
      const sy = midCY1 - Math.sin(t) * row1H * 0.22;
      xi === 0 ? ctx.moveTo(fxs[0] + fwdBW * 0.15 + xi, sy) : ctx.lineTo(fxs[0] + fwdBW * 0.15 + xi, sy);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.font = `bold ${Math.min(8, fwdBW * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('MAINS', fxs[0] + fwdBW / 2, row1Y + 5);
    ctx.fillStyle = 'rgba(148,163,184,0.55)';
    ctx.font = `${Math.min(7, fwdBW * 0.13)}px sans-serif`;
    ctx.fillText('230 V AC', fxs[0] + fwdBW / 2, row1Y + row1H - 14);

    // 1: MOSFET
    ctx.fillStyle = 'rgba(40,25,5,0.55)';
    ctx.strokeStyle = 'rgba(245,158,11,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fxs[1], row1Y, fwdBW, row1H, 7);
    ctx.fill(); ctx.stroke();
    drawMosfetSym(fxs[1] + fwdBW / 2, midCY1, Math.min(fwdBW * 0.22, row1H * 0.27), 'rgba(245,158,11,0.85)');
    ctx.fillStyle = 'rgba(245,158,11,0.85)';
    ctx.font = `bold ${Math.min(8, fwdBW * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('MOSFET', fxs[1] + fwdBW / 2, row1Y + 4);

    // 2: Ferrite Transformer (mini coil symbols)
    ctx.fillStyle = 'rgba(5,30,20,0.55)';
    ctx.strokeStyle = 'rgba(16,185,129,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fxs[2], row1Y, fwdBW, row1H, 7);
    ctx.fill(); ctx.stroke();
    const xfCX = fxs[2] + fwdBW / 2, xfCY = midCY1;
    // primary coils left
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(fxs[2] + fwdBW * 0.26, xfCY - row1H * 0.15 + i * row1H * 0.15,
              fwdBW * 0.1, Math.PI, 0);
      ctx.strokeStyle = 'rgba(16,185,129,0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // secondary coils right
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(fxs[2] + fwdBW * 0.68, xfCY - row1H * 0.1 + i * row1H * 0.18,
              fwdBW * 0.1, 0, Math.PI);
      ctx.strokeStyle = 'rgba(74,222,128,0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // core bar
    ctx.fillStyle = 'rgba(30,41,59,0.9)';
    ctx.fillRect(fxs[2] + fwdBW * 0.44, xfCY - row1H * 0.3, fwdBW * 0.1, row1H * 0.6);
    ctx.fillStyle = 'rgba(16,185,129,0.85)';
    ctx.font = `bold ${Math.min(8, fwdBW * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('HF Xfmr', fxs[2] + fwdBW / 2, row1Y + 4);

    // 3: Vout node with oscilloscope display
    ctx.fillStyle = 'rgba(5,25,15,0.55)';
    ctx.strokeStyle = 'rgba(74,222,128,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fxs[3], row1Y, fwdBW, row1H, 7);
    ctx.fill(); ctx.stroke();
    // oscilloscope mini-display
    const osX = fxs[3] + fwdBW * 0.12, osY = row1Y + row1H * 0.2;
    const osW = fwdBW * 0.76, osH = row1H * 0.45;
    ctx.fillStyle = 'rgba(0,20,10,0.85)';
    ctx.beginPath();
    ctx.roundRect(osX, osY, osW, osH, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,222,128,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(osX, osY, osW, osH, 3);
    ctx.stroke();
    // DC line with ripple
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(74,222,128,0.9)';
    ctx.lineWidth = 1.5;
    for (let xi = 0; xi <= osW; xi++) {
      const t = (xi / osW) * Math.PI * 6 + phase;
      const yv = osY + osH * 0.35 - Math.sin(t) * osH * 0.04;
      xi === 0 ? ctx.moveTo(osX + xi, yv) : ctx.lineTo(osX + xi, yv);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(74,222,128,0.85)';
    ctx.font = `bold ${Math.min(9, fwdBW * 0.18)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Vout', fxs[3] + fwdBW / 2, row1Y + 4);
    ctx.fillStyle = 'rgba(74,222,128,0.9)';
    ctx.font = `bold ${Math.min(10, fwdBW * 0.2)}px monospace`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${vout.toFixed(2)} V`, fxs[3] + fwdBW / 2, row1Y + row1H - 3);

    // ── Feedback components ───────────────────────────────────
    // Vout divider (shares fxs[3])
    drawDivider(fxs[3], row2Y, fbkBW, row2H, 'rgba(167,139,250,0.85)');
    ctx.fillStyle = 'rgba(167,139,250,0.75)';
    ctx.font = `bold ${Math.min(8, fbkBW * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Divider', fxs[3] + fbkBW / 2, row2Y + 3);

    // Error Amp (fxs[2])
    ctx.fillStyle = 'rgba(40,30,5,0.55)';
    ctx.strokeStyle = 'rgba(251,191,36,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fxs[2], row2Y, fbkBW, row2H, 7);
    ctx.fill(); ctx.stroke();
    const opS = Math.min(fbkBW * 0.22, row2H * 0.3);
    drawOpAmp(fxs[2] + fbkBW * 0.42, midCY2, opS, 'rgba(251,191,36,0.9)', errSignal);
    ctx.fillStyle = 'rgba(251,191,36,0.85)';
    ctx.font = `bold ${Math.min(8, fbkBW * 0.15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Error Amp', fxs[2] + fbkBW / 2, row2Y + 4);

    // Optocoupler (fxs[1])
    ctx.fillStyle = 'rgba(40,15,5,0.55)';
    ctx.strokeStyle = 'rgba(249,115,22,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fxs[1], row2Y, fbkBW, row2H, 7);
    ctx.fill(); ctx.stroke();
    const optoS = Math.min(fbkBW * 0.26, row2H * 0.32);
    drawOpto(fxs[1] + fbkBW / 2, midCY2, optoS, 'rgba(249,115,22,0.75)', glow);

    // PWM IC (fxs[0])
    drawPwmIc(fxs[0], row2Y, fwdBW, row2H, 'rgba(59,130,246,0.85)', duty);

    // ── Animated signal dots ──────────────────────────────────
    const fwdPath = [
      { x: fxs[0] + fwdBW, y: midCY1 },
      { x: fxs[1],          y: midCY1 },
      { x: fxs[1] + fwdBW,  y: midCY1 },
      { x: fxs[2],          y: midCY1 },
      { x: fxs[2] + fwdBW,  y: midCY1 },
      { x: fxs[3],          y: midCY1 },
    ];
    const fbkPath = [
      { x: fxs[3] + fwdBW / 2, y: row1Y + row1H },
      { x: fxs[3] + fwdBW / 2, y: row2Y },
      { x: fxs[3] + fwdBW / 2, y: midCY2 },
      { x: fxs[2] + fbkBW,     y: midCY2 },
      { x: fxs[2],             y: midCY2 },
      { x: fxs[1] + fbkBW,     y: midCY2 },
      { x: fxs[1],             y: midCY2 },
      { x: fxs[0] + fwdBW,     y: midCY2 },
      { x: fxs[0] + fwdBW / 2, y: row2Y + row2H },
      { x: fxs[0] + fwdBW / 2, y: row1Y + row1H },
    ];

    for (let d = 0; d < 3; d++) {
      animDot(fwdPath, (phase * 0.45 + d / 3) % 1, 'rgba(245,158,11,0.95)', 3.5);
      animDot(fbkPath, (phase * 0.35 + d / 3) % 1, 'rgba(167,139,250,0.95)', 3.5);
    }

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   6. SCENE 5 – Li-ion Intercalation Canvas
   Shows: ANODE (graphite layers + intercalation fill) | separator
   membrane | ELECTROLYTE | separator | CATHODE (LiCoO₂ lattice).
   Li⁺ ions animate right→left through electrolyte.
   Electrons arc along external circuit (top).
   Phone silhouette on the right shows animated charge %.
════════════════════════════════════════════════════════════════ */
(function initBattCanvas() {
  const canvas = $('#battery-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let phase = 0;
  let chargeLevel = 0;

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

  // ── Graphite anode layers ────────────────────────────────────
  function drawGraphiteLayers(x, y, w, h, fill) {
    const layers = 10;
    const lh = h / layers;
    for (let i = 0; i < layers; i++) {
      const ly = y + i * lh;
      const liLayerFill = Math.min(1, Math.max(0, fill * layers - i));

      // dark layer background
      ctx.fillStyle = `rgba(25,35,55,0.9)`;
      ctx.fillRect(x, ly + 1, w, lh - 2);

      // graphene hexagonal hint lines
      ctx.strokeStyle = 'rgba(99,102,241,0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, ly + lh / 2);
      ctx.lineTo(x + w, ly + lh / 2);
      ctx.stroke();

      // hex dots pattern
      const dotStep = Math.max(8, w / 8);
      for (let d = 0; d < w; d += dotStep) {
        ctx.beginPath();
        ctx.arc(x + d + 4, ly + lh * 0.5, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129,140,248,${0.2 + liLayerFill * 0.25})`;
        ctx.fill();
      }

      // Li fill highlight
      if (liLayerFill > 0) {
        ctx.fillStyle = `rgba(99,102,241,${liLayerFill * 0.45})`;
        ctx.fillRect(x + 2, ly + 2, (w - 4) * liLayerFill, lh - 4);
      }
    }
  }

  // ── Separator membrane ───────────────────────────────────────
  function drawSeparator(x, y, w, h) {
    ctx.fillStyle = 'rgba(226,232,240,0.05)';
    ctx.fillRect(x, y, w, h);
    // porous structure dots
    const rows = 8, cols = 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        ctx.arc(x + (c + 0.5) * w / cols, y + (r + 0.5) * h / rows, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(203,213,225,0.4)';
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(203,213,225,0.3)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, y, w, h);
  }

  // ── LiCoO₂ cathode lattice ───────────────────────────────────
  function drawCathodeLattice(x, y, w, h, liGone) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, `rgba(245,158,11,${0.1 + liGone * 0.35})`);
    grad.addColorStop(1, `rgba(217,119,6,${0.15 + liGone * 0.35})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // CoO₂ lattice layer lines
    const rows = 10;
    for (let r = 0; r < rows; r++) {
      const ry = y + (r / rows) * h;
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.lineTo(x + w, ry);
      ctx.strokeStyle = `rgba(251,191,36,${0.12 + liGone * 0.18})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    // Co atoms (dots)
    const crows = 6, ccols = 4;
    for (let r = 0; r < crows; r++) {
      for (let c = 0; c < ccols; c++) {
        ctx.beginPath();
        ctx.arc(x + (c + 0.5) * w / ccols, y + (r + 0.5) * h / crows, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251,191,36,${0.3 + liGone * 0.25})`;
        ctx.fill();
        // remaining Li (dimming as they leave)
        ctx.beginPath();
        ctx.arc(x + (c + 0.5) * w / ccols, y + (r + 0.5) * h / crows, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${Math.max(0, 0.5 - liGone * 0.5)})`;
        ctx.fill();
      }
    }
  }

  // ── Phone silhouette with battery fill ──────────────────────
  function drawPhone(x, y, w, h, pct) {
    const r = w * 0.12;
    // body
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.strokeStyle = `rgba(124,58,237,${0.4 + pct * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill(); ctx.stroke();

    // screen
    const sx = x + w * 0.08, sy = y + h * 0.08;
    const sw = w * 0.84, sh = h * 0.72;
    ctx.fillStyle = 'rgba(5,10,25,0.9)';
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, r * 0.5);
    ctx.fill();

    // battery icon on screen
    const bx = sx + sw * 0.2, by = sy + sh * 0.12;
    const bw2 = sw * 0.6, bh2 = sh * 0.65;
    // terminal nub
    ctx.fillStyle = 'rgba(100,116,139,0.6)';
    ctx.beginPath();
    ctx.roundRect(bx + bw2 * 0.38, by - sh * 0.06, bw2 * 0.24, sh * 0.07, 2);
    ctx.fill();
    // outer shell
    ctx.strokeStyle = 'rgba(100,116,139,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw2, bh2, 4);
    ctx.stroke();
    // fill
    const fillColor = pct < 0.2 ? 'rgba(239,68,68,0.85)' : pct < 0.5 ? 'rgba(245,158,11,0.85)' : 'rgba(74,222,128,0.85)';
    const fillH = bh2 * pct;
    const fillGrad = ctx.createLinearGradient(bx, by + bh2 - fillH, bx, by + bh2);
    fillGrad.addColorStop(0, fillColor.replace('0.85)', '0.6)'));
    fillGrad.addColorStop(1, fillColor);
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(bx + 2, by + bh2 - fillH + 2, bw2 - 4, fillH - 2, 3);
    ctx.fill();

    // % label
    ctx.fillStyle = '#f0f9ff';
    ctx.font = `bold ${Math.min(10, sw * 0.25)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(pct * 100)}%`, sx + sw / 2, sy + sh - 4);

    // home indicator bar
    ctx.fillStyle = 'rgba(100,116,139,0.4)';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.3, y + h * 0.92, w * 0.4, h * 0.025, 10);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.022;
    chargeLevel = (chargeLevel + 0.0006) % 1.0;

    // Reserve right 18% of width for phone silhouette
    const phoneW = Math.min(W * 0.18, 80);
    const cellAreaW = W - phoneW - 24;

    const margin = 12;
    const cellH  = H * 0.58;
    const cellY  = H * 0.18;

    // 5 columns: anode | sep | electrolyte | sep | cathode
    const SEP_W  = Math.max(8, cellAreaW * 0.025);
    const mainW  = (cellAreaW - margin * 2 - SEP_W * 2) / 3;

    const anodeX  = margin;
    const sep1X   = anodeX + mainW;
    const elecX   = sep1X + SEP_W;
    const sep2X   = elecX + mainW;
    const cathodX = sep2X + SEP_W;

    // ── Anode (graphite) ────────────────────────────────────
    drawGraphiteLayers(anodeX, cellY, mainW, cellH, chargeLevel);
    ctx.strokeStyle = 'rgba(99,102,241,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(anodeX, cellY, mainW, cellH);

    ctx.fillStyle = 'rgba(129,140,248,0.9)';
    ctx.font = `bold ${Math.min(9, mainW * 0.14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('ANODE', anodeX + mainW / 2, cellY - 4);
    ctx.fillStyle = 'rgba(129,140,248,0.5)';
    ctx.font = `${Math.min(7, mainW * 0.11)}px sans-serif`;
    ctx.fillText('Graphite', anodeX + mainW / 2, cellY - 14);

    // Li fill % badge on anode
    ctx.fillStyle = `rgba(99,102,241,${0.3 + chargeLevel * 0.6})`;
    ctx.font = `bold ${Math.min(8, mainW * 0.13)}px monospace`;
    ctx.textBaseline = 'top';
    ctx.fillText(`+${Math.round(chargeLevel * 100)}% Li`, anodeX + mainW / 2, cellY + cellH + 4);

    // ── Separator 1 ──────────────────────────────────────────
    drawSeparator(sep1X, cellY, SEP_W, cellH);

    // ── Electrolyte ─────────────────────────────────────────
    const elecGrad = ctx.createLinearGradient(elecX, cellY, elecX + mainW, cellY);
    elecGrad.addColorStop(0, 'rgba(6,182,212,0.04)');
    elecGrad.addColorStop(0.5, 'rgba(6,182,212,0.1)');
    elecGrad.addColorStop(1, 'rgba(6,182,212,0.04)');
    ctx.fillStyle = elecGrad;
    ctx.fillRect(elecX, cellY, mainW, cellH);
    ctx.strokeStyle = 'rgba(6,182,212,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(elecX, cellY, mainW, cellH);
    ctx.fillStyle = 'rgba(6,182,212,0.5)';
    ctx.font = `bold ${Math.min(8, mainW * 0.13)}px sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText('ELECTROLYTE', elecX + mainW / 2, cellY - 4);
    ctx.fillStyle = 'rgba(6,182,212,0.35)';
    ctx.font = `${Math.min(7, mainW * 0.11)}px sans-serif`;
    ctx.fillText('LiPF₆', elecX + mainW / 2, cellY - 14);

    // ── Separator 2 ──────────────────────────────────────────
    drawSeparator(sep2X, cellY, SEP_W, cellH);

    // ── Cathode (LiCoO₂) ────────────────────────────────────
    drawCathodeLattice(cathodX, cellY, mainW, cellH, chargeLevel);
    ctx.strokeStyle = 'rgba(245,158,11,0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cathodX, cellY, mainW, cellH);
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.font = `bold ${Math.min(9, mainW * 0.14)}px sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText('CATHODE', cathodX + mainW / 2, cellY - 4);
    ctx.fillStyle = 'rgba(245,158,11,0.5)';
    ctx.font = `${Math.min(7, mainW * 0.11)}px sans-serif`;
    ctx.fillText('LiCoO₂', cathodX + mainW / 2, cellY - 14);
    ctx.fillStyle = `rgba(245,158,11,${0.3 + (1 - chargeLevel) * 0.5})`;
    ctx.font = `bold ${Math.min(8, mainW * 0.13)}px monospace`;
    ctx.textBaseline = 'top';
    ctx.fillText(`−${Math.round(chargeLevel * 100)}% Li`, cathodX + mainW / 2, cellY + cellH + 4);

    // ── Li⁺ ions traversing electrolyte (right → left) ──────
    const ION_COUNT = 8;
    const ionStart = cathodX;
    const ionEnd   = anodeX + mainW;
    const travelD  = ionStart - ionEnd;
    for (let i = 0; i < ION_COUNT; i++) {
      const t    = ((phase * 0.5 + i / ION_COUNT) % 1);
      const ionX = ionStart - t * travelD;
      const ionY = cellY + 8 + (i / ION_COUNT) * (cellH - 16);
      if (ionX >= ionEnd && ionX <= ionStart) {
        const alpha = 0.55 + 0.45 * Math.sin(phase * 2.5 + i);
        ctx.beginPath();
        ctx.arc(ionX, ionY, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${alpha * 0.85})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(34,211,238,${alpha * 0.7})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#f0f9ff';
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Li⁺', ionX, ionY);
        ctx.textBaseline = 'alphabetic';
      }
    }

    // ── Electron arc (external circuit, top) ─────────────────
    const arcCX = (anodeX + mainW + cathodX + mainW) / 2;
    const arcCY = cellY - H * 0.06;
    const arcRX  = (cathodX + mainW / 2 - anodeX - mainW / 2) / 2;
    const arcRY  = H * 0.1;

    ctx.beginPath();
    ctx.ellipse(arcCX, arcCY, arcRX, arcRY, 0, Math.PI, 0);
    ctx.strokeStyle = 'rgba(251,191,36,0.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let e = 0; e < 5; e++) {
      const et    = (phase * 0.55 + e / 5) % 1;
      const eAng  = Math.PI + et * Math.PI;
      const ex    = arcCX + Math.cos(eAng) * arcRX;
      const ey    = arcCY + Math.sin(eAng) * arcRY;
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251,191,36,0.85)';
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('e⁻', ex, ey);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.fillStyle = 'rgba(251,191,36,0.55)';
    ctx.font = `${Math.min(8, W * 0.022)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('e⁻ flow (external circuit)', arcCX, arcCY - arcRY - 2);

    // ── Arrow label in electrolyte ────────────────────────────
    ctx.fillStyle = 'rgba(6,182,212,0.55)';
    ctx.font = `${Math.min(8, mainW * 0.14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('← Li⁺', elecX + mainW / 2, cellY + cellH + 4);

    // ── Phone silhouette (right side) ────────────────────────
    const phoneH = Math.min(H * 0.75, phoneW * 2.1);
    const phoneX = W - phoneW - 4;
    const phoneY = (H - phoneH) / 2;
    drawPhone(phoneX, phoneY, phoneW, phoneH, chargeLevel);

    // Connection wire: charger → phone
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(cathodX + mainW + 4, H * 0.5);
    ctx.lineTo(phoneX, H * 0.5);
    ctx.strokeStyle = `rgba(124,58,237,${0.3 + chargeLevel * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   7. SCENE 6 – Fast Charging CC/CV Canvas
   Left panel: detailed CC/CV oscilloscope chart with voltage & current
   curves, animated charging-progress marker, phase bands, tick marks.
   Right panel: animated phone silhouette with battery fill, wattage
   display and temperature thermometer.
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

  // ── Phone with battery fill (right panel) ───────────────────
  function drawPhone(x, y, w, h, pct, watts) {
    const r = w * 0.1;
    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.strokeStyle = `rgba(124,58,237,${0.4 + pct * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill(); ctx.stroke();

    // screen area
    const sx = x + w * 0.07, sy = y + h * 0.07;
    const sw = w * 0.86, sh = h * 0.68;
    ctx.fillStyle = 'rgba(5,10,25,0.95)';
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, r * 0.5);
    ctx.fill();

    // battery icon centred on screen
    const bx = sx + sw * 0.18, by = sy + sh * 0.1;
    const bw2 = sw * 0.64, bh2 = sh * 0.68;
    // terminal nub
    ctx.fillStyle = 'rgba(100,116,139,0.55)';
    ctx.beginPath();
    ctx.roundRect(bx + bw2 * 0.35, by - sh * 0.055, bw2 * 0.3, sh * 0.06, 2);
    ctx.fill();
    // outer shell
    ctx.strokeStyle = 'rgba(100,116,139,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw2, bh2, 5);
    ctx.stroke();
    // fill gradient (bottom-up)
    const fillH = bh2 * pct;
    const [fr, fg, fb] = pct < 0.2 ? [239,68,68] : pct < 0.5 ? [245,158,11] : [74,222,128];
    const fillGrad = ctx.createLinearGradient(bx, by + bh2 - fillH, bx, by + bh2);
    fillGrad.addColorStop(0, `rgba(${fr},${fg},${fb},0.5)`);
    fillGrad.addColorStop(1, `rgba(${fr},${fg},${fb},0.9)`);
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(bx + 2, by + bh2 - fillH + 2, bw2 - 4, fillH - 2, 4);
    ctx.fill();
    // lightning bolt
    if (pct < 0.99) {
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.font = `bold ${Math.min(20, bw2 * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', bx + bw2 / 2, by + bh2 / 2);
    }

    // % label
    ctx.fillStyle = '#f0f9ff';
    ctx.font = `bold ${Math.min(10, sw * 0.24)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(pct * 100)}%`, sx + sw / 2, sy + sh - 4);

    // watts badge below phone
    const wattColor = watts >= 65 ? 'rgba(239,68,68,0.9)' : watts >= 18 ? 'rgba(245,158,11,0.9)' : 'rgba(74,222,128,0.9)';
    ctx.fillStyle = wattColor;
    ctx.font = `bold ${Math.min(11, w * 0.2)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${watts} W`, x + w / 2, y + h + 6);

    // home indicator bar
    ctx.fillStyle = 'rgba(100,116,139,0.35)';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.3, y + h * 0.91, w * 0.4, h * 0.025, 10);
    ctx.fill();
  }

  // ── Temperature thermometer ──────────────────────────────────
  function drawThermometer(x, y, w, h, tempNorm, label) {
    const bulbR = w * 0.32, stemW = w * 0.18;
    const stemH = h * 0.62;
    const stemX = x + w / 2 - stemW / 2;
    const stemY = y + h * 0.05;
    const bulbX = x + w / 2, bulbY = stemY + stemH;

    // stem background
    ctx.fillStyle = 'rgba(30,41,59,0.8)';
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(stemX, stemY, stemW, stemH, stemW / 2);
    ctx.fill(); ctx.stroke();

    // mercury fill
    const fillH = stemH * tempNorm;
    const mercColor = tempNorm > 0.75 ? 'rgba(239,68,68,0.9)' : tempNorm > 0.5 ? 'rgba(245,158,11,0.9)' : 'rgba(74,222,128,0.8)';
    ctx.fillStyle = mercColor;
    ctx.beginPath();
    ctx.roundRect(stemX + 2, stemY + stemH - fillH, stemW - 4, fillH, stemW / 2);
    ctx.fill();

    // bulb
    ctx.beginPath();
    ctx.arc(bulbX, bulbY + bulbR * 0.5, bulbR, 0, Math.PI * 2);
    ctx.fillStyle = mercColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // tick marks on right side of stem
    ctx.strokeStyle = 'rgba(100,116,139,0.5)';
    ctx.lineWidth = 0.8;
    for (let t = 0; t <= 4; t++) {
      const ty = stemY + stemH - (t / 4) * stemH;
      ctx.beginPath();
      ctx.moveTo(stemX + stemW, ty);
      ctx.lineTo(stemX + stemW + 5, ty);
      ctx.stroke();
      ctx.fillStyle = 'rgba(100,116,139,0.6)';
      ctx.font = '6px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(25 + t * 20)}°`, stemX + stemW + 7, ty);
    }

    // label
    ctx.fillStyle = mercColor;
    ctx.font = `bold ${Math.min(8, w * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + w / 2, y);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.04;

    // Animated progress: oscillate between 0 and 1 (simulates charging)
    const progT = (Math.sin(phase * 0.28) * 0.5 + 0.5);

    // Compute current watts based on progress
    // CC phase: constant ~65 W; CV phase: tapers to ~5 W
    const isCC   = progT < 0.6;
    const wattCC = 65, wattMin = 5;
    const watts  = Math.round(isCC ? wattCC : wattCC - ((progT - 0.6) / 0.4) * (wattCC - wattMin));

    // Temperature rises during CC, cools during CV
    const tempNorm = isCC
      ? 0.3 + progT * 0.55
      : 0.3 + 0.6 * 0.55 - ((progT - 0.6) / 0.4) * 0.2;

    // ── Layout ─────────────────────────────────────────────────
    const phoneW  = Math.min(W * 0.19, 88);
    const thermoW = Math.min(W * 0.10, 48);
    const chartW  = W - phoneW - thermoW - 28;

    // ── Chart (left side) ──────────────────────────────────────
    const cx = W * 0.07, cy = H * 0.86;
    const cw = chartW,   ch = H * 0.72;

    // subtle glow background
    const grd = ctx.createRadialGradient(cx + cw / 2, cy - ch / 2, 0, cx + cw / 2, cy - ch / 2, cw * 0.6);
    grd.addColorStop(0, `rgba(124,58,237,${0.04 + Math.sin(phase) * 0.02})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, chartW + cx * 2, H);

    // grid
    ctx.strokeStyle = 'rgba(100,116,139,0.12)';
    ctx.lineWidth = 0.8;
    for (let g = 1; g < 4; g++) {
      const gx = cx + (g / 4) * cw;
      ctx.beginPath(); ctx.moveTo(gx, cy - ch); ctx.lineTo(gx, cy); ctx.stroke();
      const gy = cy - (g / 4) * ch;
      ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx + cw, gy); ctx.stroke();
    }

    // axes
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ch);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + cw, cy);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ['4.2V / 2A', '2.1V / 1A', '0V / 0A'].forEach((lbl, i) => {
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, cx - 3, cy - (1 - i * 0.5) * ch);
    });

    // X-axis label
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Time →', cx + cw / 2, cy + 10);

    // Y-axis rotated label
    ctx.save();
    ctx.translate(cx - 24, cy - ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Voltage (V) / Current (A)', 0, 0);
    ctx.restore();

    // Y-axis tick marks
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 0.8;
    for (let t = 0; t <= 4; t++) {
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - (t / 4) * ch);
      ctx.lineTo(cx, cy - (t / 4) * ch);
      ctx.stroke();
    }

    // CC phase background band
    ctx.fillStyle = 'rgba(245,158,11,0.04)';
    ctx.fillRect(cx, cy - ch, cw * 0.6, ch);
    // CV phase background band
    ctx.fillStyle = 'rgba(124,58,237,0.04)';
    ctx.fillRect(cx + cw * 0.6, cy - ch, cw * 0.4, ch);

    // CC/CV divider line
    const divX = cx + 0.6 * cw;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1;
    ctx.moveTo(divX, cy - ch);
    ctx.lineTo(divX, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Phase labels
    ctx.font = `bold ${Math.min(10, cw * 0.06)}px sans-serif`;
    ctx.fillStyle = 'rgba(245,158,11,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('CC Phase', cx + cw * 0.3, cy - ch + 6);
    ctx.fillStyle = 'rgba(124,58,237,0.7)';
    ctx.fillText('CV Phase', divX + cw * 0.2, cy - ch + 6);

    // Current curve (flat CC then tapers CV)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(245,158,11,0.9)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= 200; i++) {
      const t   = i / 200;
      const cur = t < 0.6 ? 1 : Math.max(0.07, 1 - ((t - 0.6) / 0.4) * 0.93);
      const y   = cy - cur * ch * 0.72;
      i === 0 ? ctx.moveTo(cx + t * cw, y) : ctx.lineTo(cx + t * cw, y);
    }
    ctx.stroke();

    // Voltage curve (rises CC then plateau CV)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(167,139,250,0.9)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= 200; i++) {
      const t   = i / 200;
      const vol = t < 0.6 ? (t / 0.6) * 0.85 : 0.85 + (t - 0.6) / 0.4 * 0.15;
      const y   = cy - vol * ch;
      i === 0 ? ctx.moveTo(cx + t * cw, y) : ctx.lineTo(cx + t * cw, y);
    }
    ctx.stroke();

    // Legend
    [[245,158,11,'Current (I)'], [167,139,250,'Voltage (V)']].forEach(([r,g,b,lbl], li) => {
      const lx = cx + cw * 0.58, ly = cy - ch * (0.22 + li * 0.12);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 14, ly);
      ctx.stroke();
      ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, lx + 18, ly);
    });

    // Animated progress marker
    const markerX = cx + progT * cw;
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(markerX, cy - ch);
    ctx.lineTo(markerX, cy);
    ctx.strokeStyle = 'rgba(74,222,128,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Progress dot on current curve
    const curAtT   = progT < 0.6 ? 1 : Math.max(0.07, 1 - ((progT - 0.6) / 0.4) * 0.93);
    const volAtT   = progT < 0.6 ? (progT / 0.6) * 0.85 : 0.85 + (progT - 0.6) / 0.4 * 0.15;
    [[curAtT * ch * 0.72, 245,158,11], [volAtT * ch, 167,139,250]].forEach(([dh, r, g, b]) => {
      ctx.beginPath();
      ctx.arc(markerX, cy - dh, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.fill();
    });

    // % badge at top of marker
    ctx.fillStyle = 'rgba(74,222,128,0.8)';
    ctx.font = `bold ${Math.min(9, cw * 0.05)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(progT * 100)}%`, markerX, cy - ch - 2);

    // ── Phone panel (right side) ───────────────────────────────
    const phoneH = Math.min(H * 0.76, phoneW * 2.1);
    const phoneX = W - phoneW - thermoW - 14;
    const phoneY = (H - phoneH) / 2;
    drawPhone(phoneX, phoneY, phoneW, phoneH, progT, watts);

    // ── Thermometer (far right) ────────────────────────────────
    const thermoX = W - thermoW - 4;
    const thermoH = Math.min(H * 0.72, 180);
    const thermoY = (H - thermoH) / 2;
    const tempLbl = `${Math.round(25 + tempNorm * 80)}°C`;
    drawThermometer(thermoX, thermoY, thermoW, thermoH, tempNorm, tempLbl);

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
