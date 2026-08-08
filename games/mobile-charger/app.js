/* ─────────────────────────────────────────────────────────────────
   Mobile Charger – app.js
   Handles: bg canvas · rectifier canvas · fast-charge canvas ·
            battery animation · quiz · scene navigation
───────────────────────────────────────────────────────────────── */

'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ════════════════════════════════════════════════════════════════
   1. BACKGROUND CANVAS – floating circuit-like dots
════════════════════════════════════════════════════════════════ */
(function initBgCanvas() {
  const canvas = $('#bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  const DOTS = Array.from({ length: 40 }, () => ({
    x: Math.random(),
    y: Math.random(),
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

    // draw connections between nearby dots
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

      d.x += d.vx / W;
      d.y += d.vy / H;
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
  const rectCanvas = $('#rect-canvas');
  const fastCanvas = $('#fast-canvas');

  if (rectCanvas && rectCanvas._start && rectCanvas._stop) {
    currentScene === 3 ? rectCanvas._start() : rectCanvas._stop();
  }
  if (fastCanvas && fastCanvas._start && fastCanvas._stop) {
    currentScene === 6 ? fastCanvas._start() : fastCanvas._stop();
  }
  if (currentScene === 5) startBatteryAnim();
}

// build dots
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
   3. SCENE 3 – Rectifier waveform canvas
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
      const y = yOffset + fn(t) * (H * 0.14);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.04;

    const y1 = H * 0.22, y2 = H * 0.52, y3 = H * 0.80;

    // AC wave
    drawWave('rgba(124,58,237,0.85)', t => Math.sin(t), y1, 2);
    // half-wave rectified
    drawWave('rgba(245,158,11,0.85)', t => Math.max(0, Math.sin(t)), y2, 2);
    // smoothed DC
    drawWave('rgba(16,185,129,0.85)', t => 0.62 + Math.sin(t * 2) * 0.06, y3, 2.5);

    // labels
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(124,58,237,0.85)'; ctx.fillText('AC Input', 6, y1 - 12);
    ctx.fillStyle = 'rgba(245,158,11,0.85)'; ctx.fillText('Rectified', 6, y2 - 12);
    ctx.fillStyle = 'rgba(16,185,129,0.85)'; ctx.fillText('Smooth DC', 6, y3 - 12);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   4. SCENE 5 – Battery fill animation
════════════════════════════════════════════════════════════════ */
function startBatteryAnim() {
  const fill = $('#batt-fill');
  const pct  = $('#batt-pct');
  if (!fill || !pct) return;

  let current = 0;
  const maxH = 168;

  function step() {
    if (current >= 100) return;
    current = Math.min(100, current + 0.5);
    const h = (current / 100) * maxH;
    fill.setAttribute('height', h);
    pct.textContent = Math.round(current) + '%';
    requestAnimationFrame(step);
  }
  // reset and replay
  current = 0;
  fill.setAttribute('height', 0);
  pct.textContent = '0%';
  requestAnimationFrame(step);
}


/* ════════════════════════════════════════════════════════════════
   5. SCENE 6 – Fast charging canvas (animated power bar)
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

    // animated lightning bolt background glow
    const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.5);
    grd.addColorStop(0, `rgba(124,58,237,${0.06 + Math.sin(phase) * 0.04})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // draw a charging curve: CC phase then CV phase
    const cx = W * 0.05, cy = H * 0.88;
    const cw = W * 0.9,  ch = H * 0.72;

    // axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ch); ctx.lineTo(cx, cy); ctx.lineTo(cx + cw, cy);
    ctx.stroke();

    // current curve (drops during CV phase)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(245,158,11,0.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 100; i++) {
      const x = cx + (i / 100) * cw;
      const cur = i < 60
        ? 1
        : 1 - ((i - 60) / 40) * 0.85;
      const y = cy - cur * ch * 0.75;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // voltage curve (rises then plateau)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(124,58,237,0.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 100; i++) {
      const x = cx + (i / 100) * cw;
      const vol = i < 60
        ? (i / 60) * 0.85
        : 0.85 + (i - 60) / 40 * 0.15;
      const y = cy - vol * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // phase divider
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
    ctx.fillText('CC Phase', cx + 4, cy - ch + 14);
    ctx.fillText('CV Phase', divX + 4, cy - ch + 14);
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.fillText('Current', cx + cw - 48, cy - ch * 0.78);
    ctx.fillStyle = 'rgba(167,139,250,0.9)';
    ctx.fillText('Voltage', cx + cw * 0.4, cy - ch * 0.95);

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   6. SCENE 7 – QUIZ
════════════════════════════════════════════════════════════════ */
const QUIZ = [
  {
    q: 'What type of power supply is used in modern mobile chargers?',
    opts: ['Linear power supply', 'Switched-Mode Power Supply (SMPS)', 'Transformer only', 'Solar converter'],
    ans: 1,
  },
  {
    q: 'What is the typical AC input voltage range for a universal mobile charger?',
    opts: ['5–12 V', '48–72 V', '100–240 V', '220–440 V'],
    ans: 2,
  },
  {
    q: 'What is the role of the rectifier in a charger?',
    opts: ['Step down voltage', 'Convert AC to DC', 'Regulate output voltage', 'Measure battery level'],
    ans: 1,
  },
  {
    q: 'Which component in the SMPS allows isolation between the high-voltage and low-voltage sides?',
    opts: ['MOSFET switch', 'EMI filter', 'Optocoupler', 'Smoothing capacitor'],
    ans: 2,
  },
  {
    q: 'In the CC/CV charging profile, what does the charger do in the CV phase?',
    opts: ['Increases current rapidly', 'Holds voltage constant while current tapers', 'Cuts off power completely', 'Switches to AC output'],
    ans: 1,
  },
  {
    q: 'What formula relates power to voltage and current?',
    opts: ['P = V / I', 'P = V + I', 'P = V × I', 'P = I² / V'],
    ans: 2,
  },
  {
    q: 'GaN (Gallium Nitride) chargers are popular because they:',
    opts: ['Are cheaper to make', 'Are smaller and more efficient than silicon chargers', 'Only work with Apple devices', 'Use lower voltages than traditional chargers'],
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
        pct >= 85 ? 'You really understand mobile chargers!' :
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
