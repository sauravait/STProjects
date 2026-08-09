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

const incidenceControl = document.getElementById('incidence-control');
const incidenceValue = document.getElementById('control-value');
const conceptCanvas = document.getElementById('concept-canvas');
const ctx = conceptCanvas.getContext('2d');

function drawPrism() {
  const iDeg = Number(incidenceControl.value);
  const iRad = iDeg * (Math.PI / 180);

  ctx.clearRect(0, 0, conceptCanvas.width, conceptCanvas.height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, conceptCanvas.width, conceptCanvas.height);

  const prism = [{ x: 230, y: 70 }, { x: 170, y: 210 }, { x: 320, y: 210 }];
  ctx.fillStyle = 'rgba(168,85,247,0.2)';
  ctx.strokeStyle = 'rgba(56,189,248,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(prism[0].x, prism[0].y);
  ctx.lineTo(prism[1].x, prism[1].y);
  ctx.lineTo(prism[2].x, prism[2].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const hitX = 190;
  const hitY = 165;
  const inX1 = 40;
  const inY1 = hitY + Math.tan(iRad) * (hitX - inX1);

  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(inX1, inY1);
  ctx.lineTo(hitX, hitY);
  ctx.stroke();

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7'];
  colors.forEach((color, idx) => {
    const spread = (idx - 3) * 0.065;
    const outX = 430;
    const outY = 150 + (iDeg - 35) * 0.7 + idx * 11;
    const midX = 280;
    const midY = 170 + spread * 60;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hitX, hitY);
    ctx.lineTo(midX, midY);
    ctx.lineTo(outX, outY);
    ctx.stroke();
  });

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(`Incidence: ${iDeg}°`, 18, 28);
  ctx.fillText('Dispersion: violet bends more than red', 18, 252);

  requestAnimationFrame(drawPrism);
}

incidenceControl.addEventListener('input', () => {
  incidenceValue.textContent = `${incidenceControl.value}°`;
});

const quiz = [
  { q: 'Which color generally bends most in a prism?', options: ['Red', 'Green', 'Violet'], answer: 2 },
  { q: 'Refraction is governed by:', options: ['Newton’s law', 'Snell’s law', 'Ohm’s law'], answer: 1 },
  { q: 'Dispersion happens because refractive index depends on:', options: ['Wavelength', 'Mass', 'Temperature only'], answer: 0 },
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
  for (let i = 0; i < 50; i += 1) {
    const x = (i * 103 + performance.now() * 0.02) % bgCanvas.width;
    const y = (i * 67 + performance.now() * 0.008) % bgCanvas.height;
    bg.fillStyle = `hsla(${(i * 15) % 360}, 90%, 65%, 0.22)`;
    bg.fillRect(x, y, 2, 2);
  }
  requestAnimationFrame(drawBackground);
}

showScene(0);
renderQuiz();
drawPrism();
drawBackground();
