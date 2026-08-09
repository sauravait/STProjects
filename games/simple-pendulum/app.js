const scenes = [...document.querySelectorAll('.scene')];
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const label = document.getElementById('scene-label');
const progress = document.getElementById('progress-fill');
const dotNav = document.getElementById('dot-nav');

let currentScene = 0;
const totalScenes = scenes.length;
let conceptAnimating = false;

for (let i = 0; i < totalScenes; i += 1) {
  const dot = document.createElement('button');
  dot.className = 'dot';
  dot.type = 'button';
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
  if (currentScene === 1) ensureConceptAnimation();
}

prevBtn.addEventListener('click', () => showScene(currentScene - 1));
nextBtn.addEventListener('click', () => showScene(currentScene === totalScenes - 1 ? 0 : currentScene + 1));

const lengthControl = document.getElementById('length-control');
const lengthValue = document.getElementById('control-value');
const conceptCanvas = document.getElementById('concept-canvas');
const ctx = conceptCanvas.getContext('2d');
let tick = 0;

function ensureConceptAnimation() {
  if (conceptAnimating) return;
  conceptAnimating = true;
  requestAnimationFrame(drawPendulum);
}

function drawPendulum() {
  if (currentScene !== 1) {
    conceptAnimating = false;
    return;
  }

  const L = Number(lengthControl.value);
  const pxLength = 70 + (L - 0.5) * 70;
  const omega = Math.sqrt(9.8 / L);
  const theta = Math.sin(tick * 0.035 * omega) * 0.45;
  tick += 1;

  const originX = conceptCanvas.width / 2;
  const originY = 30;
  const bobX = originX + Math.sin(theta) * pxLength;
  const bobY = originY + Math.cos(theta) * pxLength;

  ctx.clearRect(0, 0, conceptCanvas.width, conceptCanvas.height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, conceptCanvas.width, conceptCanvas.height);

  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(originX - 95, originY);
  ctx.lineTo(originX + 95, originY);
  ctx.stroke();

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();

  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.arc(bobX, bobY, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(34,197,94,0.35)';
  ctx.beginPath();
  ctx.arc(originX, originY, pxLength, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '14px Inter, sans-serif';
  const T = 2 * Math.PI * Math.sqrt(L / 9.8);
  ctx.fillText(`Approx period: ${T.toFixed(2)} s`, 20, 252);

  requestAnimationFrame(drawPendulum);
}

lengthControl.addEventListener('input', () => {
  lengthValue.textContent = Number(lengthControl.value).toFixed(1);
});

const quiz = [
  { q: 'If pendulum length increases, the period generally:', options: ['Increases', 'Decreases', 'Stays equal'], answer: 0 },
  { q: 'The formula T = 2π√(L/g) is most accurate for:', options: ['Large angles > 60°', 'Small angles', 'No gravity'], answer: 1 },
  { q: 'On the Moon (lower g), pendulum swings are:', options: ['Faster', 'Slower', 'Unchanged'], answer: 1 },
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
      const selectedInput = document.querySelector(`input[name="q${qi}"]:checked`);
      if (!selectedInput) return;
      const selected = Number(selectedInput.value);
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
  for (let i = 0; i < 55; i += 1) {
    const x = (i * 71 + performance.now() * 0.018) % bgCanvas.width;
    const y = (i * 89) % bgCanvas.height;
    bg.fillStyle = 'rgba(34,197,94,0.2)';
    bg.fillRect(x, y, 2, 2);
  }
  requestAnimationFrame(drawBackground);
}

showScene(0);
renderQuiz();
drawBackground();
