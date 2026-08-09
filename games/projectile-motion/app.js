const scenes = [...document.querySelectorAll('.scene')];
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const label = document.getElementById('scene-label');
const progress = document.getElementById('progress-fill');
const dotNav = document.getElementById('dot-nav');

let currentScene = 0;
const totalScenes = scenes.length;

for (let i = 0; i < totalScenes; i += 1) {
  const dot = document.createElement('button');
  dot.className = 'dot';
  dot.type = 'button';
  dot.setAttribute('aria-label', `Go to scene ${i + 1}`);
  dot.addEventListener('click', () => showScene(i));
  dotNav.appendChild(dot);
}

function showScene(index) {
  currentScene = Math.min(Math.max(index, 0), totalScenes - 1);
  scenes.forEach((scene, i) => scene.classList.toggle('hidden', i !== currentScene));
  [...dotNav.children].forEach((dot, i) => dot.classList.toggle('active', i === currentScene));
  label.textContent = `${currentScene + 1} / ${totalScenes}`;
  progress.style.width = `${((currentScene + 1) / totalScenes) * 100}%`;
  prevBtn.disabled = currentScene === 0;
  nextBtn.textContent = currentScene === totalScenes - 1 ? 'Restart' : 'Next';
}

prevBtn.addEventListener('click', () => showScene(currentScene - 1));
nextBtn.addEventListener('click', () => showScene(currentScene === totalScenes - 1 ? 0 : currentScene + 1));

const angleControl = document.getElementById('angle-control');
const angleValue = document.getElementById('control-value');
const conceptCanvas = document.getElementById('concept-canvas');
const ctx = conceptCanvas.getContext('2d');
let t = 0;

function drawProjectile() {
  const angleDeg = Number(angleControl.value);
  const angle = angleDeg * (Math.PI / 180);
  const speed = 32;

  ctx.clearRect(0, 0, conceptCanvas.width, conceptCanvas.height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, conceptCanvas.width, conceptCanvas.height);

  ctx.strokeStyle = 'rgba(148,163,184,0.45)';
  ctx.beginPath();
  ctx.moveTo(34, 240);
  ctx.lineTo(490, 240);
  ctx.moveTo(34, 240);
  ctx.lineTo(34, 30);
  ctx.stroke();

  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < 340; x += 2) {
    const worldT = x / (speed * Math.cos(angle));
    const y = speed * Math.sin(angle) * worldT - 0.5 * 9.8 * worldT * worldT;
    if (y < 0) break;
    const px = 34 + x * 1.25;
    const py = 240 - y * 4;
    if (x === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  t += 0.02;
  const phase = (Math.sin(t) + 1) / 2;
  const travel = phase * 300;
  const worldT = travel / (speed * Math.cos(angle));
  const y = Math.max(0, speed * Math.sin(angle) * worldT - 0.5 * 9.8 * worldT * worldT);
  const bx = 34 + travel * 1.25;
  const by = 240 - y * 4;

  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fill();

  requestAnimationFrame(drawProjectile);
}

angleControl.addEventListener('input', () => {
  angleValue.textContent = `${angleControl.value}°`;
});

const quiz = [
  { q: 'In ideal projectile motion, which acceleration acts continuously?', options: ['Horizontal acceleration', 'Downward gravity', 'Upward thrust'], answer: 1 },
  { q: 'What launch angle maximizes range on level ground?', options: ['30°', '45°', '75°'], answer: 1 },
  { q: 'Which graph best describes vertical position with time?', options: ['Straight line', 'Parabola', 'Circle'], answer: 1 },
];

const quizBody = document.getElementById('quiz-body');
const quizResult = document.getElementById('quiz-result');

function renderQuiz() {
  quizBody.innerHTML = quiz.map((item, qi) => `
    <div class="formula-card">
      <p><strong>Q${qi + 1}.</strong> ${item.q}</p>
      ${item.options.map((opt, oi) => `<label class="quiz-option"><input type="radio" name="q${qi}" value="${oi}"> ${opt}</label>`).join('')}
    </div>
  `).join('') + '<button class="quiz-submit" id="quiz-submit">Submit Quiz</button>';

  document.getElementById('quiz-submit').addEventListener('click', () => {
    let score = 0;
    quiz.forEach((item, qi) => {
      const selected = Number(document.querySelector(`input[name="q${qi}"]:checked`)?.value);
      if (selected === item.answer) score += 1;
    });
    quizResult.classList.remove('hidden');
    quizResult.textContent = `Score: ${score} / ${quiz.length}`;
  });
}

const bgCanvas = document.getElementById('bg-canvas');
const bg = bgCanvas.getContext('2d');
function drawBackground() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  bg.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  for (let i = 0; i < 45; i += 1) {
    const x = (i * 97) % bgCanvas.width;
    const y = (i * 59 + performance.now() * 0.03) % bgCanvas.height;
    bg.fillStyle = 'rgba(249,115,22,0.22)';
    bg.fillRect(x, y, 2, 2);
  }
  requestAnimationFrame(drawBackground);
}

showScene(0);
renderQuiz();
drawProjectile();
drawBackground();
