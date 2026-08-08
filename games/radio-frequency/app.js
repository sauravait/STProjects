/* ─────────────────────────────────────────────────────────────────
   Radio Frequency – app.js
   Handles: bg canvas · wave canvas · mod canvas · prop canvas ·
            quiz · scene navigation · spectrum hover
───────────────────────────────────────────────────────────────── */

'use strict';

/* ── Helpers ──────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ════════════════════════════════════════════════════════════════
   1. BACKGROUND CANVAS – drifting RF sine waves
════════════════════════════════════════════════════════════════ */
(function initBgCanvas() {
  const canvas = $('#bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf;

  const WAVES = Array.from({ length: 7 }, (_, i) => ({
    freq:  0.003 + i * 0.001,
    amp:   30 + i * 12,
    speed: 0.4 + i * 0.15,
    y:     0,
    phase: (i * Math.PI * 2) / 7,
    hue:   180 + i * 18,
    alpha: 0.12 + i * 0.03,
  }));

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    WAVES.forEach((w, i) => { w.y = H * (0.12 + i * 0.12); });
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const sec = t * 0.001;

    WAVES.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(0, w.y);
      for (let x = 0; x <= W; x += 3) {
        const y = w.y + Math.sin(x * w.freq + sec * w.speed + w.phase) * w.amp;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${w.hue},80%,65%,${w.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(draw);
})();


/* ════════════════════════════════════════════════════════════════
   2. SCENE NAVIGATION
════════════════════════════════════════════════════════════════ */
const TOTAL_SCENES = 7;
let currentScene = 1;

const scenes    = $$('.scene');
const btnPrev   = $('#btn-prev');
const btnNext   = $('#btn-next');
const dotNav    = $('#dot-nav');
const progFill  = $('#progress-fill');
const sceneLabel = $('#scene-label');

// build dots
for (let i = 1; i <= TOTAL_SCENES; i++) {
  const btn = document.createElement('button');
  btn.className = 'dot' + (i === 1 ? ' active' : '');
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-label', `Scene ${i}`);
  btn.addEventListener('click', () => goTo(i));
  dotNav.appendChild(btn);
}

function goTo(n) {
  // hide current
  const prev = $(`#scene-${currentScene}`);
  if (prev) prev.classList.add('hidden');

  currentScene = Math.max(1, Math.min(TOTAL_SCENES, n));

  // show new
  const next = $(`#scene-${currentScene}`);
  if (next) {
    next.classList.remove('hidden');
    next.style.animation = 'none';
    // force reflow
    void next.offsetWidth;
    next.style.animation = '';
  }

  // update progress
  const pct = (currentScene / TOTAL_SCENES) * 100;
  progFill.style.width = pct + '%';
  progFill.setAttribute('aria-valuenow', currentScene);
  sceneLabel.textContent = `${currentScene} / ${TOTAL_SCENES}`;

  // update dots
  $$('.dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 === currentScene);
  });

  // update buttons
  btnPrev.disabled = currentScene === 1;
  btnNext.innerHTML  = currentScene === TOTAL_SCENES
    ? '<span>Finish</span>'
    : `<span>Next</span><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  // scene-specific init
  if (currentScene === 3) initWaveCanvas();
  if (currentScene === 4) initModCanvas();
  if (currentScene === 6) initPropCanvas();
  if (currentScene === 7) initQuiz();
}

btnPrev.addEventListener('click', () => goTo(currentScene - 1));
btnNext.addEventListener('click', () => {
  if (currentScene === TOTAL_SCENES) {
    window.location.href = '../../index.html';
  } else {
    goTo(currentScene + 1);
  }
});


/* ════════════════════════════════════════════════════════════════
   3. SPECTRUM HOVER (Scene 2)
════════════════════════════════════════════════════════════════ */
(function initSpectrum() {
  const segs    = $$('.spec-seg');
  const tooltip = $('#spec-tooltip');
  if (!segs.length || !tooltip) return;

  segs.forEach(seg => {
    const label = seg.dataset.label;
    const freq  = seg.dataset.freq;
    seg.setAttribute('tabindex', '0');
    seg.setAttribute('role', 'button');
    seg.setAttribute('aria-label', `${label}: ${freq}`);

    const show = () => {
      tooltip.textContent = `${label} · ${freq}`;
      tooltip.classList.add('show');
    };
    const hide = () => tooltip.classList.remove('show');

    seg.addEventListener('mouseenter', show);
    seg.addEventListener('mouseleave', hide);
    seg.addEventListener('focus', show);
    seg.addEventListener('blur', hide);
  });
})();


/* ════════════════════════════════════════════════════════════════
   4. WAVE CANVAS (Scene 3)
════════════════════════════════════════════════════════════════ */
let waveRaf = null;

function initWaveCanvas() {
  const canvas = $('#wave-canvas');
  if (!canvas || canvas._init) return;
  canvas._init = true;

  const ctx = canvas.getContext('2d');
  const freqCtrl  = $('#ctrl-freq');
  const ampCtrl   = $('#ctrl-amp');
  const phaseCtrl = $('#ctrl-phase');
  const freqVal   = $('#freq-val');
  const ampVal    = $('#amp-val');
  const phaseVal  = $('#phase-val');

  let animTime = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => requestAnimationFrame(resize));
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();

  function draw() {
    const W  = canvas.width;
    const H  = canvas.height;
    const dpr = devicePixelRatio;
    const freq  = parseFloat(freqCtrl.value);
    const amp   = parseFloat(ampCtrl.value) / 10;
    const phase = (parseFloat(phaseCtrl.value) * Math.PI) / 180;

    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= H; y += H / 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // centre line
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    const cY   = H / 2;
    const maxA = cY * 0.85 * amp;
    const px   = W / dpr;

    // phase marker line
    const phaseX = ((phase / (2 * Math.PI)) * px * dpr) % W;
    ctx.strokeStyle = 'rgba(251,146,60,.5)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath(); ctx.moveTo(phaseX, 0); ctx.lineTo(phaseX, H); ctx.stroke();
    ctx.setLineDash([]);

    // wavelength brace
    const cycleW = (px / freq) * dpr;
    if (cycleW < W * 0.9) {
      const bY = cY - maxA - 14 * dpr;
      ctx.strokeStyle = 'rgba(167,139,250,.55)';
      ctx.lineWidth   = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, bY); ctx.lineTo(cycleW, bY);
      ctx.moveTo(0, bY - 5 * dpr); ctx.lineTo(0, bY + 5 * dpr);
      ctx.moveTo(cycleW, bY - 5 * dpr); ctx.lineTo(cycleW, bY + 5 * dpr);
      ctx.stroke();
      ctx.fillStyle = 'rgba(167,139,250,.75)';
      ctx.font = `${11 * dpr}px sans-serif`;
      ctx.fillText('λ', cycleW / 2 - 4 * dpr, bY - 6 * dpr);
    }

    // main wave
    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0,   '#06b6d4');
    gradient.addColorStop(0.5, '#a78bfa');
    gradient.addColorStop(1,   '#f0abfc');
    ctx.strokeStyle = gradient;
    ctx.lineWidth   = 2.5 * dpr;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const t  = (x / W) * px;
      const y  = cY - Math.sin(2 * Math.PI * freq * (t / px) + phase + animTime) * maxA;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // amplitude arrow
    const peakX  = W / 2;
    const peakY  = cY - maxA;
    ctx.strokeStyle = 'rgba(6,182,212,.7)';
    ctx.lineWidth   = 1.5 * dpr;
    ctx.setLineDash([3 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(peakX, cY); ctx.lineTo(peakX, peakY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();

    animTime += 0.04;
    waveRaf = requestAnimationFrame(draw);
  }

  if (waveRaf) cancelAnimationFrame(waveRaf);
  waveRaf = requestAnimationFrame(draw);

  const update = () => {
    freqVal.textContent  = freqCtrl.value;
    ampVal.textContent   = (ampCtrl.value / 10).toFixed(1);
    phaseVal.textContent = phaseCtrl.value + '°';
  };
  freqCtrl.addEventListener('input', update);
  ampCtrl.addEventListener('input', update);
  phaseCtrl.addEventListener('input', update);
  update();
}


/* ════════════════════════════════════════════════════════════════
   5. MODULATION CANVAS (Scene 4)
════════════════════════════════════════════════════════════════ */
let modRaf = null;
let modType = 'AM';
let modAnimT = 0;

function initModCanvas() {
  const canvas = $('#mod-canvas');
  if (!canvas || canvas._init) return;
  canvas._init = true;

  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => requestAnimationFrame(resize));
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();

  $$('.mod-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.mod-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      modType = btn.dataset.mod;
      $$('.mod-info').forEach(c => c.classList.remove('active'));
      $(`.mod-info[data-mod="${modType}"]`).classList.add('active');
    });
  });

  function draw() {
    const W  = canvas.width;
    const H  = canvas.height;
    const dpr = devicePixelRatio;
    const cY = H / 2;

    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let y = H / 4; y < H; y += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const f_carrier = 8;   // carrier cycles across canvas
    const f_message = 1.2; // message cycles

    // message signal (faint)
    ctx.strokeStyle = 'rgba(251,146,60,.3)';
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const t = x / W;
      const msg = Math.sin(2 * Math.PI * f_message * t + modAnimT * 0.3);
      const y = cY - msg * (cY * 0.4);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // modulated signal
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(1, '#a78bfa');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2 * dpr;
    ctx.beginPath();

    for (let x = 0; x <= W; x++) {
      const t   = x / W;
      const msg = Math.sin(2 * Math.PI * f_message * t + modAnimT * 0.3);

      let y;
      if (modType === 'AM') {
        const envelope = 0.5 + 0.5 * msg;
        y = cY - Math.sin(2 * Math.PI * f_carrier * t + modAnimT) * (cY * 0.75) * envelope;
      } else if (modType === 'FM') {
        const phase = 2 * Math.PI * f_carrier * t + modAnimT + msg * 2;
        y = cY - Math.sin(phase) * (cY * 0.75);
      } else { // PM
        const phase = 2 * Math.PI * f_carrier * t + modAnimT + msg * Math.PI * 0.5;
        y = cY - Math.sin(phase) * (cY * 0.75);
      }
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // labels
    ctx.fillStyle = 'rgba(251,146,60,.6)';
    ctx.font = `${10 * dpr}px sans-serif`;
    ctx.fillText('Message', 6 * dpr, 14 * dpr);
    ctx.fillStyle = 'rgba(6,182,212,.8)';
    ctx.fillText('Modulated carrier', 6 * dpr, 28 * dpr);

    modAnimT += 0.05;
    modRaf = requestAnimationFrame(draw);
  }

  if (modRaf) cancelAnimationFrame(modRaf);
  modRaf = requestAnimationFrame(draw);
}


/* ════════════════════════════════════════════════════════════════
   6. PROPAGATION CANVAS (Scene 6)
════════════════════════════════════════════════════════════════ */
let propRaf = null;
let propT   = 0;

function initPropCanvas() {
  const canvas = $('#prop-canvas');
  if (!canvas || canvas._init) return;
  canvas._init = true;

  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => requestAnimationFrame(resize));
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();

  function draw() {
    const W  = canvas.width;
    const H  = canvas.height;
    const dpr = devicePixelRatio;

    ctx.clearRect(0, 0, W, H);

    // Earth arc
    const earthY = H * 0.78;
    ctx.beginPath();
    ctx.ellipse(W / 2, earthY + H * 0.5, W * 0.95, H * 0.5, 0, Math.PI, 0, true);
    ctx.fillStyle = 'rgba(30,60,100,.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,200,255,.25)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    // Ionosphere arc
    ctx.beginPath();
    ctx.ellipse(W / 2, earthY + H * 0.5, W * 1.12, H * 0.62, 0, Math.PI, 0, true);
    ctx.strokeStyle = 'rgba(167,139,250,.35)';
    ctx.lineWidth = 6 * dpr;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(167,139,250,.1)';
    ctx.lineWidth = 14 * dpr;
    ctx.stroke();

    const txX = W * 0.1;
    const txY = earthY - 8 * dpr;

    // ── Ground wave ──────────────────────────────────────────── */
    const gwLen = W * 0.38;
    const gwPts = 60;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    for (let i = 0; i <= gwPts; i++) {
      const frac  = i / gwPts;
      const alpha = Math.max(0, 1 - Math.abs(frac - (propT * 0.4 % 1)) * 3.5);
      const x = txX + Math.cos(-Math.PI * frac * 0.6) * gwLen * frac;
      const y = earthY - Math.sin(Math.PI * 0.05 * frac * 6) * 14 * dpr * Math.min(frac * 4, 1);
      ctx.strokeStyle = `rgba(255,107,107,${0.3 + alpha * 0.6})`;
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
    }

    // ── Sky wave ─────────────────────────────────────────────── */
    const skyArc = H * 0.48;
    const t2 = (propT * 0.35) % 1;
    for (let d = 0; d < 3; d++) {
      const phase = (t2 + d / 3) % 1;
      const angle = Math.PI * phase;
      const px = txX + (W * 0.8 - txX) * phase;
      const py = earthY - Math.abs(Math.sin(angle)) * skyArc;
      ctx.beginPath();
      ctx.arc(px, py, 4 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167,139,250,${0.9 - phase * 0.6})`;
      ctx.fill();
    }
    // arc path (faint)
    ctx.beginPath();
    ctx.ellipse(W * 0.45, earthY, W * 0.37, H * 0.48, 0, Math.PI, 0, true);
    ctx.strokeStyle = 'rgba(167,139,250,.22)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── LOS wave ─────────────────────────────────────────────── */
    const losLen = W * 0.55;
    const losT = (propT * 0.55) % 1;
    for (let d = 0; d < 4; d++) {
      const phase = (losT + d / 4) % 1;
      const px = txX + losLen * phase;
      const py = txY - 4 * dpr;
      ctx.beginPath();
      ctx.arc(px, py, 3.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(74,222,128,${0.9 - phase * 0.6})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(txX, txY - 4 * dpr);
    ctx.lineTo(txX + losLen, txY - 4 * dpr);
    ctx.strokeStyle = 'rgba(74,222,128,.2)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Tower icon ────────────────────────────────────────────── */
    ctx.fillStyle = '#64748b';
    ctx.fillRect(txX - 3 * dpr, earthY - 32 * dpr, 6 * dpr, 32 * dpr);
    ctx.beginPath();
    ctx.arc(txX, earthY - 35 * dpr, 5 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();

    // ── Legend ────────────────────────────────────────────────── */
    const legend = [
      { color: 'rgba(255,107,107,.8)',  label: 'Ground wave' },
      { color: 'rgba(167,139,250,.8)', label: 'Sky wave' },
      { color: 'rgba(74,222,128,.8)',  label: 'LOS' },
    ];
    legend.forEach((l, i) => {
      const lx = W * 0.62;
      const ly = 16 * dpr + i * 18 * dpr;
      ctx.fillStyle = l.color;
      ctx.fillRect(lx, ly - 5 * dpr, 12 * dpr, 4 * dpr);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.font = `${9 * dpr}px sans-serif`;
      ctx.fillText(l.label, lx + 16 * dpr, ly);
    });

    propT += 0.018;
    propRaf = requestAnimationFrame(draw);
  }

  if (propRaf) cancelAnimationFrame(propRaf);
  propRaf = requestAnimationFrame(draw);
}


/* ════════════════════════════════════════════════════════════════
   7. QUIZ (Scene 7)
════════════════════════════════════════════════════════════════ */
const QUESTIONS = [
  {
    q: 'What is the approximate speed at which radio waves travel through a vacuum?',
    opts: ['3×10⁸ m/s', '3×10⁶ m/s', '3×10¹⁰ m/s', '3×10⁴ m/s'],
    ans: 0,
  },
  {
    q: 'Which formula correctly relates wavelength (λ), speed of light (c), and frequency (f)?',
    opts: ['λ = f × c', 'λ = c / f', 'λ = f / c', 'λ = c × f²'],
    ans: 1,
  },
  {
    q: 'AM radio modulation works by varying the ______ of the carrier wave.',
    opts: ['Frequency', 'Phase', 'Amplitude', 'Wavelength'],
    ans: 2,
  },
  {
    q: 'What is the optimal length of a half-wave dipole antenna operating at frequency f?',
    opts: ['c / f', 'c / (2f)', '2c / f', 'c × f'],
    ans: 1,
  },
  {
    q: 'Which propagation mode allows AM radio signals to travel beyond the horizon following Earth\'s curvature?',
    opts: ['Line-of-Sight', 'Sky Wave', 'Ground Wave', 'Satellite Relay'],
    ans: 2,
  },
  {
    q: 'FM radio has better audio quality than AM primarily because:',
    opts: [
      'FM uses higher power transmitters',
      'FM is immune to amplitude noise',
      'FM signals travel faster',
      'FM has lower bandwidth',
    ],
    ans: 1,
  },
  {
    q: 'Which frequency range does Wi-Fi 2.4 GHz operate in?',
    opts: ['530–1700 kHz', '87.5–108 MHz', '2.4–2.5 GHz', '24–100 GHz'],
    ans: 2,
  },
];

const ICONS = ['A', 'B', 'C', 'D'];

function initQuiz() {
  const body   = $('#quiz-body');
  const result = $('#quiz-result');
  if (!body || body._init) return;
  body._init = true;

  body.innerHTML = '';
  result.classList.add('hidden');
  result.innerHTML = '';

  let answered = 0;
  const userAnswers = Array(QUESTIONS.length).fill(null);

  QUESTIONS.forEach((q, qi) => {
    const card = document.createElement('div');
    card.className = 'q-card';
    card.innerHTML = `
      <span class="q-index">Question ${qi + 1} of ${QUESTIONS.length}</span>
      <div class="q-text">${q.q}</div>
      <div class="q-options" role="group" aria-label="Options for question ${qi + 1}">
        ${q.opts.map((opt, oi) => `
          <button class="q-option" data-qi="${qi}" data-oi="${oi}" aria-label="Option ${ICONS[oi]}: ${opt}">
            <span class="opt-icon">${ICONS[oi]}</span>
            ${opt}
          </button>
        `).join('')}
      </div>
    `;
    body.appendChild(card);
  });

  body.addEventListener('click', e => {
    const btn = e.target.closest('.q-option');
    if (!btn) return;
    const qi  = +btn.dataset.qi;
    const oi  = +btn.dataset.oi;
    if (userAnswers[qi] !== null) return; // already answered

    userAnswers[qi] = oi;
    answered++;

    const card    = btn.closest('.q-card');
    const options = card.querySelectorAll('.q-option');
    options.forEach(b => { b.disabled = true; });

    options[QUESTIONS[qi].ans].classList.add('correct');
    if (oi !== QUESTIONS[qi].ans) btn.classList.add('wrong');
    card.classList.add('answered');

    if (answered === QUESTIONS.length) showResult();
  });

  function showResult() {
    const correct = userAnswers.filter((a, i) => a === QUESTIONS[i].ans).length;
    const pct     = Math.round((correct / QUESTIONS.length) * 100);
    const label   = pct >= 85 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good Work!' : '📖 Keep Learning!';

    result.classList.remove('hidden');
    result.innerHTML = `
      <div class="result-score">${correct}/${QUESTIONS.length}</div>
      <div class="result-label">${label}</div>
      <div class="result-sub">You scored ${pct}% · ${correct} correct answer${correct !== 1 ? 's' : ''}</div>
      <button class="btn-retry" id="btn-retry">Try Again</button>
    `;
    $('#btn-retry').addEventListener('click', () => {
      body._init = false;
      initQuiz();
    });
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
