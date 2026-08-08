/* ─────────────────────────────────────────────────────────────────
   Electric Fan – app.js
   Handles: bg canvas · fan rotation · airflow canvas · energy canvas
            · fan type tabs · quiz · scene navigation
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
  let angle = 0;
  let raf;

  function spin(t) {
    angle = (t * 0.3) % 360;
    blades.setAttribute('transform', `rotate(${angle} 100 100)`);
    raf = requestAnimationFrame(spin);
  }
  raf = requestAnimationFrame(spin);
})();


/* ════════════════════════════════════════════════════════════════
   3. SCENE NAVIGATION
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
  const airflowCanvas = $('#airflow-canvas');
  const energyCanvas  = $('#energy-canvas');

  if (airflowCanvas && airflowCanvas._start && airflowCanvas._stop) {
    currentScene === 3 ? airflowCanvas._start() : airflowCanvas._stop();
  }
  if (energyCanvas && energyCanvas._start && energyCanvas._stop) {
    currentScene === 6 ? energyCanvas._start() : energyCanvas._stop();
  }
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
  // rebuild next button content
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

// keyboard navigation
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentScene + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(currentScene - 1);
});

goTo(1);


/* ════════════════════════════════════════════════════════════════
   4. SCENE 3 – Airflow canvas
════════════════════════════════════════════════════════════════ */
(function initAirflowCanvas() {
  const canvas = $('#airflow-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf, running = false;
  let speedLevel = 2; // 1=low 2=medium 3=high
  let particles = [];

  const SPEED_MAP = { 1: 1.2, 2: 2.5, 3: 4.5 };
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
    return Array.from({ length: 30 }, () => mkParticle());
  }

  function mkParticle() {
    return {
      x: Math.random() * W * 0.3,
      y: Math.random() * H,
      len: 15 + Math.random() * 25,
      speed: (0.5 + Math.random() * 0.5) * SPEED_MAP[speedLevel],
      alpha: 0.3 + Math.random() * 0.5,
      wave: Math.random() * Math.PI * 2,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // fan icon on left
    ctx.save();
    ctx.translate(60, H / 2);
    // hub
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59,130,246,0.25)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    // blades (static representation)
    for (let b = 0; b < 4; b++) {
      ctx.save();
      ctx.rotate((b * Math.PI) / 2 + Date.now() * 0.002 * SPEED_MAP[speedLevel]);
      ctx.fillStyle = 'rgba(59,130,246,0.7)';
      ctx.beginPath();
      ctx.ellipse(0, -28, 7, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // airflow particles
    const sp = SPEED_MAP[speedLevel];
    particles.forEach(p => {
      const waveY = Math.sin(p.wave + p.x * 0.02) * 8;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + waveY);
      ctx.lineTo(p.x + p.len, p.y + waveY);
      const grad = ctx.createLinearGradient(p.x, 0, p.x + p.len, 0);
      grad.addColorStop(0, `rgba(59,130,246,${p.alpha})`);
      grad.addColorStop(1, `rgba(6,182,212,0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      p.x    += p.speed;
      p.wave += 0.03;

      if (p.x > W + 20) {
        p.x     = 80 + Math.random() * 20;
        p.y     = Math.random() * H;
        p.speed = (0.5 + Math.random() * 0.5) * sp;
      }
    });

    if (running) raf = requestAnimationFrame(draw);
  }

  canvas._start = function () {
    if (running) return;
    running = true;
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    particles = createParticles();
    draw();
  };
  canvas._stop = function () { running = false; cancelAnimationFrame(raf); };

  const speedCtrl = $('#speed-ctrl');
  const speedValEl = $('#speed-val');
  if (speedCtrl) {
    speedCtrl.addEventListener('input', () => {
      speedLevel = +speedCtrl.value;
      if (speedValEl) speedValEl.textContent = SPEED_LABELS[speedLevel];
      particles.forEach(p => { p.speed = (0.5 + Math.random() * 0.5) * SPEED_MAP[speedLevel]; });
    });
  }

  window.addEventListener('resize', resize);
})();


/* ════════════════════════════════════════════════════════════════
   5. SCENE 4 – Fan type tabs
════════════════════════════════════════════════════════════════ */
(function initFanTypes() {
  const cards = $$('.fan-type-card');
  const infos = $$('.fti');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const t = card.dataset.type;
      cards.forEach(c => c.classList.toggle('active', c.dataset.type === t));
      infos.forEach(i => i.classList.toggle('active', i.dataset.type === t));
    });
  });
})();


/* ════════════════════════════════════════════════════════════════
   6. SCENE 6 – Energy canvas (animated flow diagram)
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
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    draw();
  };
  canvas._stop = function () { running = false; cancelAnimationFrame(raf); };

  function drawBox(label, x, y, w, h, color) {
    ctx.fillStyle = `rgba(${color},0.12)`;
    ctx.strokeStyle = `rgba(${color},0.7)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0f9ff';
    ctx.font = `bold ${Math.min(11, w * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    phase += 0.04;

    const bw = W * 0.18, bh = H * 0.28;
    const y0 = H * 0.35;
    const gap = (W - bw * 4) / 5;

    const boxes = [
      { label: '⚡ Power\nSupply', x: gap, color: '59,130,246' },
      { label: '🎛️ Speed\nRegulator', x: gap * 2 + bw, color: '16,185,129' },
      { label: '🔄 Motor\nRotation', x: gap * 3 + bw * 2, color: '245,158,11' },
      { label: '💨 Air\nFlow', x: gap * 4 + bw * 3, color: '6,182,212' },
    ];

    // arrows between boxes
    boxes.forEach((b, i) => {
      if (i < boxes.length - 1) {
        const ax = b.x + bw;
        const ay = y0 + bh / 2;
        const nx = boxes[i + 1].x;
        // animated dashes
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -phase * 4;
        ctx.moveTo(ax + 2, ay);
        ctx.lineTo(nx - 2, ay);
        ctx.strokeStyle = 'rgba(148,163,184,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        // arrowhead
        ctx.beginPath();
        ctx.moveTo(nx - 8, ay - 5);
        ctx.lineTo(nx - 2, ay);
        ctx.lineTo(nx - 8, ay + 5);
        ctx.strokeStyle = 'rgba(148,163,184,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    boxes.forEach(b => drawBox(b.label, b.x, y0, bw, bh, b.color));

    if (running) raf = requestAnimationFrame(draw);
  }
})();


/* ════════════════════════════════════════════════════════════════
   7. SCENE 7 – QUIZ
════════════════════════════════════════════════════════════════ */
const QUIZ = [
  {
    q: 'What is the primary energy conversion in an electric fan?',
    opts: ['Chemical → Thermal', 'Electrical → Mechanical', 'Solar → Electrical', 'Mechanical → Chemical'],
    ans: 1,
  },
  {
    q: 'Which part of the motor is fixed and creates the magnetic field?',
    opts: ['Rotor', 'Commutator', 'Stator', 'Armature'],
    ans: 2,
  },
  {
    q: 'Why are fan blades angled (pitched)?',
    opts: ['To look aesthetically pleasing', 'To reduce noise only', 'To push air as they rotate', 'To reduce motor load'],
    ans: 2,
  },
  {
    q: 'Which type of fan mounts to the ceiling to circulate air across a room?',
    opts: ['Tower Fan', 'Exhaust Fan', 'Table Fan', 'Ceiling Fan'],
    ans: 3,
  },
  {
    q: 'How does a fan produce a cooling effect on the human body?',
    opts: ['It lowers air temperature', 'It accelerates evaporation of sweat', 'It produces cold air', 'It filters warm air'],
    ans: 1,
  },
  {
    q: 'Which speed control method is most energy-efficient?',
    opts: ['Resistive regulator', 'On/Off switching', 'BLDC motor with inverter', 'Adding more blades'],
    ans: 2,
  },
  {
    q: 'The formula F = BIL describes force on a current-carrying conductor. What does "B" represent?',
    opts: ['Blade count', 'Magnetic field strength', 'Back-EMF voltage', 'Bearing friction'],
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
        pct >= 85 ? 'You really know how fans work!' :
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
