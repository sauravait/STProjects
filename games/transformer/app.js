/* app.js — Electrical Transformer Interactive Module
 *
 * Scene flow:
 *  0 · Intro
 *  1 · Construction (clickable parts)
 *  2 · Working Principle (animated flux)
 *  3 · Step-Up Transformer
 *  4 · Step-Down Transformer
 *  5 · Formulas & Calculator
 *  6 · Quiz (6 MCQs)
 */

'use strict';

// ─── Audio Manager ─────────────────────────────────────────────────────────────

class AudioManager {
  constructor() {
    this._ctx = null;
    this._hum = null;
    this._humGain = null;
    this.enabled = true;
    this.narrationEnabled = true;
    this._speech = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this._utterance = null;
    this._voice = null;
    this.narrationLocale = 'hi';
    this.narrationPace = 'slow';
    if (this._speech && typeof this._speech.addEventListener === 'function') {
      this._speech.addEventListener('voiceschanged', () => { this._voice = null; });
    }
  }

  _ctx_get() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { this.enabled = false; }
    }
    return this._ctx;
  }

  startHum() {
    if (!this.enabled) return;
    const ctx = this._ctx_get(); if (!ctx) return;
    this.stopHum();
    const osc  = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';  osc.frequency.value  = 50;
    osc2.type = 'sine'; osc2.frequency.value = 100;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.6);
    osc.connect(gain); osc2.connect(g2); g2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(); osc2.start();
    this._hum = [osc, osc2]; this._humGain = gain;
  }

  stopHum() {
    if (!this._hum) return;
    try {
      const ctx = this._ctx;
      if (ctx && this._humGain) {
        this._humGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      }
      const h = this._hum;
      setTimeout(() => h.forEach(o => { try { o.stop(); } catch (e) {} }), 500);
    } catch (e) {}
    this._hum = null; this._humGain = null;
  }

  stopNarration() {
    if (!this._speech) return;
    this._speech.cancel();
    this._utterance = null;
  }

  narrate(text, rate = 1, interrupt = true) {
    if (!this.enabled || !this.narrationEnabled || !this._speech || !text) return;
    if (interrupt) this.stopNarration();
    const utter = new SpeechSynthesisUtterance(String(text).trim());
    utter.rate = Math.min(2, Math.max(0.6, rate));
    utter.pitch = 1;
    utter.volume = 1;
    const voices = this._speech.getVoices();
    const wantHindi = this.narrationLocale === 'hi';
    if (!this._voice && voices.length) {
      this._voice = wantHindi
        ? (voices.find(v => /^hi\b/i.test(v.lang)) || voices.find(v => /india|hindi/i.test(`${v.name} ${v.lang}`)))
        : (voices.find(v => /^en\b/i.test(v.lang)) || voices.find(v => /english/i.test(v.name)));
      this._voice = this._voice || voices[0];
    }
    if (this._voice) utter.voice = this._voice;
    utter.lang = this._voice?.lang || (wantHindi ? 'hi-IN' : 'en-US');
    this._utterance = utter;
    this._speech.speak(utter);
  }

  playClick() {
    if (!this.enabled) return;
    const ctx = this._ctx_get(); if (!ctx) return;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
    const src = ctx.createBufferSource();
    const gain = ctx.createGain(); gain.gain.value = 0.18;
    src.buffer = buf; src.connect(gain); gain.connect(ctx.destination); src.start();
  }

  playStepBeep(freq = 440) {
    if (!this.enabled) return;
    const ctx = this._ctx_get(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  }

  playSuccess() {
    if (!this.enabled) return;
    const ctx = this._ctx_get(); if (!ctx) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
      gain.gain.linearRampToValueAtTime(0, t + 0.28);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.32);
    });
  }

  playFail() {
    if (!this.enabled) return;
    const ctx = this._ctx_get(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.45);
  }
}

const audio = new AudioManager();

// ─── State ────────────────────────────────────────────────────────────────────

let currentScene = 0;
const TOTAL_SCENES = 7;
let speedMultiplier = 1;
let activeTimeline = null;
let activeFlowTweens = [];
let activeFluxTweens = [];
let waveformFrameId = null;

const toggles = { labels: true, flux: true, equations: false, subtitles: true, narrate: true };

function clearTransientAnimations() {
  if (activeTimeline) { activeTimeline.kill(); activeTimeline = null; }
  activeFlowTweens.forEach(t => t.kill());
  activeFluxTweens.forEach(t => t.kill());
  activeFlowTweens = [];
  activeFluxTweens = [];
  stopWaveforms();
}

function getNarrationRate() {
  const paceFactor = audio.narrationPace === 'slow' ? 0.84 : 1;
  const speedFactor = Math.min(1.08, Math.max(0.9, speedMultiplier));
  return Math.min(1.05, Math.max(0.72, paceFactor * speedFactor));
}

function cleanNarrationText(text = '') {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, 'and')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── SVG Transformer Generator ────────────────────────────────────────────────

/**
 * Build a full transformer SVG string.
 * @param {object} cfg
 *   cfg.Np              — primary turns (int)
 *   cfg.Ns              — secondary turns (int)
 *   cfg.showFlux        — animate flux arrows
 *   cfg.showLabels      — show part labels
 *   cfg.clickable       — add data-part attributes for tooltip
 *   cfg.fluxDir         — 'up' or 'down' (arrow direction)
 *   cfg.showWaveIn      — animate input AC wave
 *   cfg.showWaveOut     — animate output AC wave
 *   cfg.id              — SVG element id
 */
function buildSVG(cfg = {}) {
  const {
    Np = 4, Ns = 4,
    showFlux = true, showLabels = true,
    clickable = false,
    fluxDir = 'up',
    showWaveIn = false, showWaveOut = false,
    id = 'tx-svg',
  } = cfg;

  // Layout constants (viewBox 0 0 780 340)
  const VW = 780, VH = 340;
  const coreX  = 210, coreY = 75, coreW = 360, coreH = 210;
  const barH   = 38, armW = 38;
  const topBarY = coreY;
  const botBarY = coreY + coreH - barH;          // 247
  const coilTop = topBarY + barH;                 // 113
  const coilBot = botBarY;                        // 247
  const coilH   = coilBot - coilTop;              // 134
  const leftArmX  = coreX;                        // 210
  const rightArmX = coreX + coreW - armW;         // 532
  // Window
  const winL = leftArmX + armW;                   // 248
  const winR = rightArmX;                         // 532

  // Coil bump positions
  const primEdgeX  = leftArmX;                    // 210 left edge of left arm
  const primBumpX  = 155;                         // bumps extend leftward
  const secEdgeX   = rightArmX + armW;            // 570 right edge of right arm
  const secBumpX   = 625;                         // bumps extend rightward

  // Midpoints
  const midY = coilTop + coilH / 2;               // 180

  // Wire U-shapes x endpoints
  const wireL = primBumpX - 10;                   // 145 left extent of left wire
  const wireR = secBumpX + 10;                    // 635 right extent of right wire

  // AC source and load positions
  const srcX = 90, srcY = midY, srcR = 26;
  const ldX  = 690, ldY  = midY - 24, ldW = 28, ldH = 48;

  /* ── Helpers ── */
  function coilPath(edgeX, bumpX, top, height, turns) {
    const turnH = height / turns;
    let d = `M ${edgeX} ${top}`;
    for (let i = 0; i < turns; i++) {
      const y0  = top + i * turnH;
      const ym  = y0 + turnH / 2;
      const y1  = y0 + turnH;
      d += ` Q ${bumpX} ${ym} ${edgeX} ${y1}`;
    }
    return d;
  }

  function sineWavePath(x0, y0, amplitude, wavelength, numCycles, rightward) {
    const pts = 120;
    const totalX = wavelength * numCycles;
    const sign = rightward ? 1 : -1;
    let d = `M ${x0} ${y0}`;
    for (let i = 1; i <= pts; i++) {
      const t = i / pts;
      const x = x0 + sign * t * totalX;
      const y = y0 - amplitude * Math.sin(t * numCycles * 2 * Math.PI);
      d += ` L ${x} ${y}`;
    }
    return d;
  }

  /* ── Core strips (lamination visual) ── */
  function laminationLines(rx, ry, rw, rh, n) {
    let out = '';
    for (let i = 1; i < n; i++) {
      const y = ry + (rh / n) * i;
      out += `<line x1="${rx}" y1="${y}" x2="${rx + rw}" y2="${y}"
                    stroke="${'#6b5735'}" stroke-width="0.6" opacity="0.5"/>`;
    }
    return out;
  }

  /* ── Flux arrows ── */
  function fluxLines() {
    if (!showFlux) return '';
    const n = 3;
    const xs = [winL + (winR - winL) * 0.25, winL + (winR - winL) * 0.5, winL + (winR - winL) * 0.75];
    const arrowUp = fluxDir === 'up';
    const y1 = coilTop + 14, y2 = coilBot - 14;
    return xs.map((fx, i) => `
      <line class="flux-arrow flux-anim" data-part="flux"
            x1="${fx}" y1="${arrowUp ? y2 : y1}"
            x2="${fx}" y2="${arrowUp ? y1 : y2}"
            stroke="#22c55e" stroke-width="2.5"
            marker-end="url(#arrow-grn-${id})"
            style="animation-delay:${i * 0.15}s"/>
    `).join('');
  }

  /* ── Labels ── */
  function labels() {
    if (!showLabels) return '';
    return `
      <!-- Primary label -->
      <text x="${primBumpX - 18}" y="${midY + 5}" text-anchor="middle"
            fill="#60a5fa" font-size="12" font-weight="700"
            transform="rotate(-90, ${primBumpX - 18}, ${midY})"
            class="svg-label" data-part="primary">Primary (Np=${Np})</text>

      <!-- Secondary label -->
      <text x="${secBumpX + 18}" y="${midY + 5}" text-anchor="middle"
            fill="#f87171" font-size="12" font-weight="700"
            transform="rotate(90, ${secBumpX + 18}, ${midY})"
            class="svg-label" data-part="secondary">Secondary (Ns=${Ns})</text>

      <!-- Core label -->
      <text x="${(winL + winR) / 2}" y="${midY + 5}" text-anchor="middle"
            fill="#94a3b8" font-size="13"
            class="svg-label" data-part="core">Iron Core</text>

      <!-- Vp label -->
      <text x="${srcX}" y="${midY + 46}" text-anchor="middle"
            fill="#60a5fa" font-size="11" font-weight="700"
            class="svg-label">Vp</text>

      <!-- Vs label -->
      <text x="${ldX + ldW / 2}" y="${ldY + ldH + 16}" text-anchor="middle"
            fill="#f87171" font-size="11" font-weight="700"
            class="svg-label">Vs</text>
    `;
  }

  /* ── Waves ── */
  function inputWave() {
    if (!showWaveIn) return '';
    const wx = wireL - 5, wy = midY;
    const p = sineWavePath(wx, wy, 22, 18, 2, false);
    return `<path class="wave-anim" d="${p}" stroke="#3b82f6" fill="none" stroke-width="2.5"/>`;
  }

  function outputWave() {
    if (!showWaveOut) return '';
    const wx = wireR + 5, wy = midY;
    const p = sineWavePath(wx, wy, 22, 18, 2, true);
    return `<path class="wave-anim" d="${p}" stroke="#ef4444" fill="none" stroke-width="2.5"
                  style="animation-delay:0.4s"/>`;
  }

  /* ── Current flow particles ── */
  function currentParticles() {
    if (!showFlux) return '';
    const primPath = `M ${srcX + srcR},${srcY - 14} L ${wireL},${coilTop} L ${wireL},${coilBot} L ${srcX + srcR},${srcY + 14}`;
    const fluxPath = `M ${winL + 24},${coilBot - 14} C ${winL + 90},${midY + 60} ${winR - 90},${midY - 60} ${winR - 24},${coilTop + 14}`;
    const secPath  = `M ${wireR},${coilTop} L ${ldX},${ldY} L ${ldX + ldW / 2},${ldY + ldH / 2} L ${ldX},${ldY + ldH} L ${wireR},${coilBot}`;
    return `
      <path id="pp-${id}" d="${primPath}" fill="none" stroke="none" visibility="hidden"/>
      <path id="fp-${id}" d="${fluxPath}" fill="none" stroke="none" visibility="hidden"/>
      <path id="sp-${id}" d="${secPath}"  fill="none" stroke="none" visibility="hidden"/>
      <g class="flow-particles particles-primary" filter="url(#glow-b-${id})">
        ${new Array(6).fill(0).map(() => `<circle r="3.8" fill="#93c5fd" class="flow-dot flow-primary"/>`).join('')}
      </g>
      <g class="flow-particles particles-flux" filter="url(#glow-g-${id})">
        ${new Array(6).fill(0).map(() => `<circle r="3.4" fill="#86efac" class="flow-dot flow-flux"/>`).join('')}
      </g>
      <g class="flow-particles particles-secondary" filter="url(#glow-r-${id})">
        ${new Array(6).fill(0).map(() => `<circle r="3.8" fill="#fca5a5" class="flow-dot flow-secondary"/>`).join('')}
      </g>`;
  }

  const cPrimary  = coilPath(primEdgeX, primBumpX, coilTop, coilH, Np);
  const cSecondary = coilPath(secEdgeX, secBumpX, coilTop, coilH, Ns);

  const partAttr = clickable ? 'style="cursor:pointer"' : '';

  return `
<div class="tx-svg-wrap">
<svg id="${id}" viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     role="img" aria-label="Transformer diagram with ${Np} primary and ${Ns} secondary turns">
  <defs>
    <marker id="arrow-grn-${id}" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <path d="M0,0 L0,7 L7,3.5 z" fill="#22c55e"/>
    </marker>
    <filter id="glow-b-${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-r-${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-g-${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-core-${id}" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Iron core — top bar -->
  <rect x="${coreX}" y="${topBarY}" width="${coreW}" height="${barH}"
        fill="#8b7355" stroke="#6b5735" stroke-width="1" rx="3"
        class="core-rect" data-part="core" ${partAttr}/>
  ${laminationLines(coreX, topBarY, coreW, barH, 5)}

  <!-- Iron core — bottom bar -->
  <rect x="${coreX}" y="${botBarY}" width="${coreW}" height="${barH}"
        fill="#8b7355" stroke="#6b5735" stroke-width="1" rx="3"
        class="core-rect" data-part="core" ${partAttr}/>
  ${laminationLines(coreX, botBarY, coreW, barH, 5)}

  <!-- Iron core — left arm -->
  <rect x="${leftArmX}" y="${coilTop}" width="${armW}" height="${coilH}"
        fill="#8b7355" stroke="#6b5735" stroke-width="1"
        class="core-rect" data-part="core" ${partAttr}/>
  ${laminationLines(leftArmX, coilTop, armW, coilH, 8)}

  <!-- Iron core — right arm -->
  <rect x="${rightArmX}" y="${coilTop}" width="${armW}" height="${coilH}"
        fill="#8b7355" stroke="#6b5735" stroke-width="1"
        class="core-rect" data-part="core" ${partAttr}/>
  ${laminationLines(rightArmX, coilTop, armW, coilH, 8)}

  <!-- Flux lines -->
  ${fluxLines()}
  <g class="flux-rings" filter="url(#glow-g-${id})">
    <circle class="flux-ring" cx="${(winL + winR) / 2}" cy="${midY}" r="24" fill="none" stroke="#4ade80" stroke-width="2"/>
    <circle class="flux-ring" cx="${(winL + winR) / 2}" cy="${midY}" r="42" fill="none" stroke="#4ade80" stroke-width="2"/>
    <circle class="flux-ring" cx="${(winL + winR) / 2}" cy="${midY}" r="60" fill="none" stroke="#4ade80" stroke-width="2"/>
  </g>

  <!-- Connecting wires — primary (U-shape left) -->
  <polyline class="wire-primary"
            points="${primBumpX},${coilTop} ${wireL},${coilTop}
                    ${wireL},${coilBot} ${primBumpX},${coilBot}"
            fill="none" stroke="#3b82f6" stroke-width="2"/>

  <!-- Connecting wires — secondary (U-shape right) -->
  <polyline class="wire-secondary"
            points="${secBumpX},${coilTop} ${wireR},${coilTop}
                    ${wireR},${coilBot} ${secBumpX},${coilBot}"
            fill="none" stroke="#ef4444" stroke-width="2"/>

  <!-- AC source -->
  <circle cx="${srcX}" cy="${srcY}" r="${srcR}" class="ac-source-ring"
          fill="rgba(15,23,42,0.6)" stroke="#94a3b8" stroke-width="2"/>
  <text x="${srcX}" y="${srcY + 8}" text-anchor="middle"
        fill="#94a3b8" font-size="22" font-weight="bold">~</text>
  <!-- Wires from source to left U-wire -->
  <line x1="${srcX + srcR}" y1="${srcY - 14}" x2="${wireL}" y2="${coilTop}"
        stroke="#3b82f6" stroke-width="2" class="wire-primary"/>
  <line x1="${srcX + srcR}" y1="${srcY + 14}" x2="${wireL}" y2="${coilBot}"
        stroke="#3b82f6" stroke-width="2" class="wire-primary"/>

  <!-- Load (resistor) -->
  <rect x="${ldX}" y="${ldY}" width="${ldW}" height="${ldH}"
        fill="rgba(15,23,42,0.6)" stroke="#94a3b8" stroke-width="2" rx="4"
        class="load-rect"/>
  <text x="${ldX + ldW / 2}" y="${ldY + ldH / 2 + 5}" text-anchor="middle"
        fill="#94a3b8" font-size="13" font-weight="bold">R</text>
  <!-- Wires from right U-wire to load -->
  <line x1="${wireR}" y1="${coilTop}" x2="${ldX}" y2="${ldY}"
        stroke="#ef4444" stroke-width="2" class="wire-secondary"/>
  <line x1="${wireR}" y1="${coilBot}" x2="${ldX}" y2="${ldY + ldH}"
        stroke="#ef4444" stroke-width="2" class="wire-secondary"/>

  <!-- Primary coil -->
  <path class="coil-primary" id="cp-${id}" d="${cPrimary}"
        stroke="#3b82f6" fill="none" stroke-width="4" stroke-linecap="round"
        filter="url(#glow-b-${id})"
        data-part="primary" ${partAttr}/>

  <!-- Secondary coil -->
  <path class="coil-secondary" id="cs-${id}" d="${cSecondary}"
        stroke="#ef4444" fill="none" stroke-width="4" stroke-linecap="round"
        filter="url(#glow-r-${id})"
        data-part="secondary" ${partAttr}/>

  <!-- Input / output waves -->
  ${inputWave()}
  ${outputWave()}

  <!-- Current particles -->
  ${currentParticles()}

  ${labels()}
</svg>
</div>`;
}

// ─── Quiz Data ────────────────────────────────────────────────────────────────

const QUIZ = [
  {
    q: 'What is the primary function of an electrical transformer?',
    opts: [
      'Convert direct current (DC) into alternating current (AC)',
      'Change voltage levels of an alternating current (AC) supply',
      'Generate electrical energy from mechanical motion',
      'Store electrical energy for later use',
    ],
    answer: 1,
    explain: 'Transformers step up or step down AC voltage while keeping power approximately constant — they do not generate energy or convert DC.',
  },
  {
    q: 'Transformers operate on which type of electrical current?',
    opts: [
      'Direct Current (DC) only',
      'Alternating Current (AC) only',
      'Both AC and DC equally well',
      'Pulsating DC only',
    ],
    answer: 1,
    explain: 'Transformers require AC because the changing current creates the alternating magnetic flux needed to induce an EMF in the secondary winding. DC produces no change in flux, so no induction occurs.',
  },
  {
    q: 'In a step-up transformer, which statement about the number of turns is correct?',
    opts: [
      'Secondary turns (Ns) are less than primary turns (Np)',
      'Secondary turns (Ns) equal primary turns (Np)',
      'Secondary turns (Ns) are greater than primary turns (Np)',
      'The number of turns has no effect on voltage',
    ],
    answer: 2,
    explain: 'A step-up transformer increases voltage: Vs/Vp = Ns/Np. For Vs > Vp we need Ns > Np.',
  },
  {
    q: 'A transformer has Np = 100 primary turns and Ns = 500 secondary turns. If the primary voltage Vp = 240 V, what is the secondary voltage Vs?',
    opts: [
      '48 V',
      '240 V',
      '1 200 V',
      '12 000 V',
    ],
    answer: 2,
    explain: 'Vs = Vp × (Ns/Np) = 240 × (500/100) = 240 × 5 = 1 200 V.',
  },
  {
    q: 'The working principle of a transformer is based on:',
    opts: [
      "Ohm's Law (V = IR)",
      "Newton's Third Law of Motion",
      "Faraday's Law of Electromagnetic Induction",
      "Kirchhoff's Current Law",
    ],
    answer: 2,
    explain: "Faraday's Law states that a changing magnetic flux through a coil induces an EMF. The transformer's changing flux (due to AC in the primary) induces the output voltage in the secondary.",
  },
  {
    q: 'Which real-world device typically uses a step-down transformer?',
    opts: [
      'A power plant generator',
      'An overhead high-voltage transmission line',
      'A mobile phone charger / adapter',
      'An electrical energy meter',
    ],
    answer: 2,
    explain: 'Mobile chargers contain a step-down transformer that reduces mains voltage (e.g. 240 V) to the low DC voltage needed by the phone (e.g. 5 V) after rectification.',
  },
];

// ─── Tooltip data for construction scene ─────────────────────────────────────

const PART_INFO = {
  core: {
    title: '🟤 Laminated Iron Core',
    text: 'The iron core provides a low-reluctance path for the magnetic flux, efficiently linking the primary and secondary windings. Lamination (thin insulated sheets) reduces eddy current losses.',
  },
  primary: {
    title: '🔵 Primary Winding',
    text: 'The primary coil (blue) receives the AC input voltage. Current through it creates an alternating magnetic field in the core. The number of turns (Np) determines the input voltage relationship.',
  },
  secondary: {
    title: '🔴 Secondary Winding',
    text: 'The secondary coil (red) is linked to the primary only magnetically — no direct electrical connection. The alternating flux induces an EMF here. The number of turns (Ns) sets the output voltage.',
  },
  flux: {
    title: '🟢 Magnetic Flux',
    text: 'The green arrows represent the alternating magnetic flux flowing through the iron core window. This changing flux is what induces the EMF in the secondary winding (Faraday\'s Law).',
  },
};

const SCENE_NARRATION = {
  0: {
    hi: 'Is scene mein hum samjhenge transformer kyun zaroori hai. Grid se high voltage aata hai, aur transformer usse ghar ke liye safe level par convert karta hai.',
    en: 'In this scene, you can see why transformers matter. They help move power efficiently over long distances and then make voltage safe for homes.',
  },
  1: {
    hi: 'Yeh transformer ke main parts hain: primary coil, iron core, aur secondary coil. In teenon ke coordination se energy transfer hota hai.',
    en: 'Here are the main transformer parts: primary coil, iron core, and secondary coil. Their coordination enables energy transfer.',
  },
  2: {
    hi: 'Step by step dekhiye: AC primary mein jaata hai, core mein changing flux banta hai, aur secondary mein induced voltage milti hai.',
    en: 'Watch the sequence: AC enters the primary, changing flux forms in the core, and induced voltage appears in the secondary.',
  },
  3: {
    hi: 'Step-up transformer mein secondary turns zyada hote hain. Isliye output voltage badh jaati hai, jo transmission ke liye useful hai.',
    en: 'In a step-up transformer, secondary turns are higher, so output voltage increases, which is useful for transmission.',
  },
  4: {
    hi: 'Step-down transformer mein secondary turns kam hote hain. Output voltage kam ho jaati hai, jaisa phone charger mein hota hai.',
    en: 'In a step-down transformer, secondary turns are lower, so output voltage decreases, like in phone chargers.',
  },
  5: {
    hi: 'Yahan key formulas dikh rahe hain. Turns ratio se voltage aur current dono ka relation samajh aata hai.',
    en: 'This scene summarizes the key formulas. The turns ratio explains both voltage and current relationships.',
  },
  6: {
    hi: 'Ab quiz complete karke apni understanding check kijiye. Har answer ke saath explanation bhi milega.',
    en: 'Now complete the quiz to check your understanding. You will get explanations with each answer.',
  },
};

const STEP_NARRATION = {
  'step-1': {
    hi: 'Pehla step: AC primary winding mein flow karta hai aur alternating magnetic field create karta hai.',
    en: 'Step one: AC flows in the primary winding and creates an alternating magnetic field.',
  },
  'step-2': {
    hi: 'Doosra step: iron core is field ko channel karta hai aur changing magnetic flux banata hai.',
    en: 'Step two: the iron core channels this field and builds changing magnetic flux.',
  },
  'step-3': {
    hi: 'Teesra step: yahi flux secondary winding ko link karta hai aur EMF induce karta hai.',
    en: 'Step three: this same flux links the secondary winding and induces EMF.',
  },
  'step-4': {
    hi: 'Chautha step: induced voltage load tak pahunchti hai, bina direct electrical contact ke.',
    en: 'Step four: induced voltage reaches the load without direct electrical contact.',
  },
};

function getNarrationText(bucket, fallback = '') {
  if (!bucket) return fallback;
  const key = audio.narrationLocale === 'hi' ? 'hi' : 'en';
  return bucket[key] || bucket.en || bucket.hi || fallback;
}

function narrateScene(index) {
  if (!toggles.narrate || !audio.enabled || !audio.narrationEnabled) return;
  const scene = document.getElementById(`scene-${index}`);
  if (!scene) return;
  const fallback = cleanNarrationText(scene.querySelector('.scene-subtitle')?.textContent || '');
  const text = cleanNarrationText(getNarrationText(SCENE_NARRATION[index], fallback));
  audio.narrate(text, getNarrationRate(), true);
}

function narrateStep(stepId) {
  if (!toggles.narrate || !audio.enabled || !audio.narrationEnabled) return;
  const stepEl = document.getElementById(stepId);
  if (!stepEl) return;
  const fallback = cleanNarrationText(stepEl.textContent || '');
  const text = cleanNarrationText(getNarrationText(STEP_NARRATION[stepId], fallback));
  audio.narrate(text, getNarrationRate(), true);
}

function animateDotsOnPath(dots, pathEl, duration = 2.2, stagger = 0.22) {
  if (typeof gsap === 'undefined' || !dots.length || !pathEl) return;
  const total = pathEl.getTotalLength();
  dots.forEach((dot, i) => {
    const tracker = { progress: (i / dots.length) % 1 };
    const tween = gsap.to(tracker, {
      progress: tracker.progress + 1,
      duration,
      ease: 'none',
      repeat: -1,
      delay: i * stagger,
      onUpdate: () => {
        const p = pathEl.getPointAtLength((tracker.progress % 1) * total);
        dot.setAttribute('cx', p.x.toFixed(2));
        dot.setAttribute('cy', p.y.toFixed(2));
      },
    });
    activeFlowTweens.push(tween);
  });
}

function startWorkingFlow(svg) {
  if (!svg) return;
  activeFlowTweens.forEach(t => t.kill());
  activeFlowTweens = [];
  const primaryPath = svg.querySelector('#pp-svg-2');
  const fluxPath = svg.querySelector('#fp-svg-2');
  const secondaryPath = svg.querySelector('#sp-svg-2');
  animateDotsOnPath(Array.from(svg.querySelectorAll('.flow-primary')), primaryPath, 1.6 / speedMultiplier, 0.18);
  animateDotsOnPath(Array.from(svg.querySelectorAll('.flow-flux')), fluxPath, 1.9 / speedMultiplier, 0.2);
  animateDotsOnPath(Array.from(svg.querySelectorAll('.flow-secondary')), secondaryPath, 1.7 / speedMultiplier, 0.18);
}

function startFluxPulse(svg) {
  if (!svg || typeof gsap === 'undefined') return;
  activeFluxTweens.forEach(t => t.kill());
  activeFluxTweens = [];
  svg.querySelectorAll('.flux-arrow').forEach((arrow, i) => {
    const tween = gsap.to(arrow, {
      opacity: 0.95,
      attr: { 'stroke-width': 4.2 },
      repeat: -1,
      yoyo: true,
      duration: 0.42,
      delay: i * 0.08,
      ease: 'sine.inOut',
    });
    activeFluxTweens.push(tween);
  });
  svg.querySelectorAll('.flux-ring').forEach((ring, i) => {
    const tween = gsap.fromTo(
      ring,
      { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' },
      { opacity: 0.42, scale: 1.25, repeat: -1, duration: 1.6 / speedMultiplier, ease: 'power1.out', delay: i * 0.25 }
    );
    activeFluxTweens.push(tween);
  });
}

function drawWave(canvas, timestamp, phaseShift = 0) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const targetW = Math.max(1, Math.round(rect.width * ratio));
  const targetH = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.save();
  ctx.scale(ratio, ratio);
  const w = rect.width;
  const h = rect.height;
  const mid = h * 0.5;
  const amp = h * (0.18 + (Math.sin(timestamp * 0.0013) * 0.06));
  const freq = 0.024 * speedMultiplier;
  const t = timestamp * 0.004 + phaseShift;

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(59,130,246,0.95)';
  for (let x = 0; x <= w; x += 2) {
    const y = mid + Math.sin((x * freq) + t) * amp;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(239,68,68,0.9)';
  for (let x = 0; x <= w; x += 2) {
    const y = mid + Math.sin((x * (freq * 1.1)) + t + Math.PI / 2) * (amp * 0.72);
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function stopWaveforms() {
  if (waveformFrameId) cancelAnimationFrame(waveformFrameId);
  waveformFrameId = null;
}

function startWaveforms() {
  stopWaveforms();
  const tick = (ts) => {
    const c0 = document.getElementById('wave-canvas-0');
    const c2 = document.getElementById('wave-canvas-2');
    if (currentScene === 0 && c0) drawWave(c0, ts, 0);
    if (currentScene === 2 && c2) drawWave(c2, ts, Math.PI / 3);
    waveformFrameId = requestAnimationFrame(tick);
  };
  waveformFrameId = requestAnimationFrame(tick);
}

// ─── Scene animations ─────────────────────────────────────────────────────────

function animateScene(index) {
  clearTransientAnimations();
  const gsapOk = typeof gsap !== 'undefined';

  // ── Scene 0 · Intro — animate flow items ──
  if (index === 0) {
    const items = document.querySelectorAll('#vis-0 .flow-item, #vis-0 .flow-arrow');
    if (gsapOk && items.length) {
      gsap.from(items, { opacity: 0, y: 20, stagger: 0.15, duration: 0.5, ease: 'power2.out' });
    }
    const icon = document.querySelector('#vis-0 .intro-icon');
    if (gsapOk && icon) {
      gsap.from(icon, { scale: 0.4, opacity: 0, duration: 0.7, ease: 'back.out(1.7)' });
    }
    const wavePanel = document.querySelector('#vis-0 .wave-panel');
    if (gsapOk && wavePanel) {
      gsap.fromTo(wavePanel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
    }
  }

  // ── Scene 1 · Construction — pulse the coils on load ──
  if (index === 1) {
    const svg = document.getElementById('svg-1');
    if (gsapOk && svg) {
      const cp = svg.querySelector('.coil-primary');
      const cs = svg.querySelector('.coil-secondary');
      if (cp) gsap.fromTo(cp, { opacity: 0, attr: { 'stroke-width': 2 } }, { opacity: 1, attr: { 'stroke-width': 4 }, duration: 0.8, delay: 0.2, ease: 'power2.out' });
      if (cs) gsap.fromTo(cs, { opacity: 0, attr: { 'stroke-width': 2 } }, { opacity: 1, attr: { 'stroke-width': 4 }, duration: 0.8, delay: 0.5, ease: 'power2.out' });
    }
  }

  // ── Scene 2 · Working Principle — sequential step + SVG highlighting ──
  if (index === 2) {
    const steps = ['step-1', 'step-2', 'step-3', 'step-4'];
    steps.forEach(sid => {
      const el = document.getElementById(sid);
      if (el) el.classList.remove('active');
    });

    const svg = document.getElementById('svg-2');
    const cp  = svg ? svg.querySelector('.coil-primary')   : null;
    const cs  = svg ? svg.querySelector('.coil-secondary')  : null;
    const fa  = svg ? svg.querySelectorAll('.flux-arrow')   : [];
    const cr  = svg ? svg.querySelectorAll('.core-rect')    : [];
    const pp  = svg ? svg.querySelector('.particles-primary')   : null;
    const fp  = svg ? svg.querySelector('.particles-flux')      : null;
    const sp2 = svg ? svg.querySelector('.particles-secondary') : null;
    const rings = svg ? svg.querySelectorAll('.flux-ring')      : [];
    const src = svg ? svg.querySelector('.ac-source-ring')  : null;
    const ld  = svg ? svg.querySelector('.load-rect')       : null;

    // Reset SVG element styles
    if (gsapOk) {
      if (cp)  gsap.set(cp,  { attr: { stroke: '#3b82f6', 'stroke-width': 4 }, opacity: 0.45 });
      if (cs)  gsap.set(cs,  { attr: { stroke: '#ef4444', 'stroke-width': 4 }, opacity: 0.45 });
      if (pp)  gsap.set(pp,  { opacity: 0 });
      if (fp)  gsap.set(fp,  { opacity: 0 });
      if (sp2) gsap.set(sp2, { opacity: 0 });
      rings.forEach(r => gsap.set(r, { opacity: 0 }));
      if (src) gsap.set(src, { attr: { stroke: '#94a3b8' } });
      if (ld)  gsap.set(ld,  { attr: { stroke: '#94a3b8' } });
      fa.forEach(a => gsap.set(a, { opacity: 0.4, attr: { 'stroke-width': 2.5 } }));
      cr.forEach(r => gsap.set(r, { attr: { fill: '#8b7355' } }));
    }

    const stepDur = 1.4 / speedMultiplier;

    if (gsapOk) {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      // Step 1 — AC source lights up, primary coil glows, particles flow
      tl.add(() => {
        const step = document.getElementById('step-1');
        step?.classList.add('active');
        if (gsapOk && step) gsap.fromTo(step, { boxShadow: '0 0 0 rgba(34,197,94,0)' }, { boxShadow: '0 0 0.9rem rgba(34,197,94,0.45)', duration: 0.35, yoyo: true, repeat: 1 });
        narrateStep('step-1');
        audio.playStepBeep(440);
      }, 0);
      if (cp)  tl.to(cp,  { attr: { stroke: '#93c5fd', 'stroke-width': 6.5 }, opacity: 1, duration: 0.6 }, 0.1);
      if (pp)  tl.to(pp,  { opacity: 1, duration: 0.5 }, 0.15);
      if (src) tl.to(src, { attr: { stroke: '#60a5fa' }, duration: 0.5 }, 0.1);

      // Step 2 — core glows amber, flux arrows pulse bright
      tl.add(() => {
        const step = document.getElementById('step-2');
        step?.classList.add('active');
        if (gsapOk && step) gsap.fromTo(step, { boxShadow: '0 0 0 rgba(34,197,94,0)' }, { boxShadow: '0 0 0.9rem rgba(34,197,94,0.45)', duration: 0.35, yoyo: true, repeat: 1 });
        narrateStep('step-2');
        audio.playStepBeep(520);
        if (fp) gsap.to(fp, { opacity: 1, duration: 0.35 });
        startFluxPulse(svg);
      }, stepDur);
      cr.forEach(r => tl.to(r, { attr: { fill: '#b8954a' }, duration: 0.6 }, stepDur + 0.05));
      fa.forEach((a, i) => tl.to(a, { opacity: 1, attr: { 'stroke-width': 4 }, duration: 0.5 }, stepDur + 0.05 + i * 0.08));

      // Step 3 — secondary coil glows, particles appear on secondary
      tl.add(() => {
        const step = document.getElementById('step-3');
        step?.classList.add('active');
        if (gsapOk && step) gsap.fromTo(step, { boxShadow: '0 0 0 rgba(34,197,94,0)' }, { boxShadow: '0 0 0.9rem rgba(34,197,94,0.45)', duration: 0.35, yoyo: true, repeat: 1 });
        narrateStep('step-3');
        audio.playStepBeep(600);
      }, stepDur * 2);
      if (cs)  tl.to(cs,  { attr: { stroke: '#fca5a5', 'stroke-width': 6.5 }, opacity: 1, duration: 0.6 }, stepDur * 2 + 0.1);
      if (sp2) tl.to(sp2, { opacity: 1, duration: 0.5 }, stepDur * 2 + 0.15);

      // Step 4 — load lights up, everything at full brightness
      tl.add(() => {
        const step = document.getElementById('step-4');
        step?.classList.add('active');
        if (gsapOk && step) gsap.fromTo(step, { boxShadow: '0 0 0 rgba(34,197,94,0)' }, { boxShadow: '0 0 0.9rem rgba(34,197,94,0.45)', duration: 0.35, yoyo: true, repeat: 1 });
        narrateStep('step-4');
        audio.playStepBeep(700);
      }, stepDur * 3);
      if (ld) tl.to(ld, { attr: { stroke: '#f87171' }, duration: 0.5 }, stepDur * 3 + 0.05);

      activeTimeline = tl;

      // Start electrical hum on scene 2
      audio.startHum();
      startWorkingFlow(svg);

    } else {
      // CSS fallback
      steps.forEach((sid, i) => {
        setTimeout(() => {
          document.getElementById(sid)?.classList.add('active');
          narrateStep(sid);
          audio.playStepBeep(440 + i * 80);
        }, i * 1400 / speedMultiplier);
      });
    }
  }

  // ── Scene 3 · Step-Up — animate voltage bar ──
  if (index === 3) {
    const bar = document.getElementById('bar-vs-up');
    if (bar) setTimeout(() => { bar.style.width = '99%'; }, 300 / speedMultiplier);
    const svg = document.getElementById('svg-3');
    if (gsapOk && svg) {
      const cs = svg.querySelector('.coil-secondary');
      const cp = svg.querySelector('.coil-primary');
      if (cp) gsap.fromTo(cp, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      if (cs) gsap.fromTo(cs, { opacity: 0 }, { opacity: 1, duration: 0.9, delay: 0.3, ease: 'power2.out' });
    }
  }

  // ── Scene 4 · Step-Down — animate voltage bar ──
  if (index === 4) {
    const bar = document.getElementById('bar-vs-down');
    if (bar) setTimeout(() => { bar.style.width = '33%'; }, 300 / speedMultiplier);
    const svg = document.getElementById('svg-4');
    if (gsapOk && svg) {
      const cp = svg.querySelector('.coil-primary');
      const cs = svg.querySelector('.coil-secondary');
      if (cp) gsap.fromTo(cp, { opacity: 0 }, { opacity: 1, duration: 0.9 });
      if (cs) gsap.fromTo(cs, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.3, ease: 'power2.out' });
    }
  }

  // ── Scene 5 · Formulas — reveal cards ──
  if (index === 5 && gsapOk) {
    const cards = document.querySelectorAll('#scene-5 .formula-card');
    if (cards.length) gsap.from(cards, { opacity: 0, y: 16, stagger: 0.2, duration: 0.5, ease: 'power2.out' });
  }
}

// ─── Replay (resets state before re-running animation) ──────────────────────

function replayScene(index) {
  clearTransientAnimations();
  audio.stopHum();
  audio.stopNarration();
  audio.playClick();

  // Reset per-scene transient state
  if (index === 3) {
    const bar = document.getElementById('bar-vs-up');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0%';
               requestAnimationFrame(() => { bar.style.transition = ''; }); }
  }
  if (index === 4) {
    const bar = document.getElementById('bar-vs-down');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0%';
               requestAnimationFrame(() => { bar.style.transition = ''; }); }
  }

  // Re-inject SVG so CSS keyframe animations restart cleanly
  injectVisuals();
  applyToggles();
  startWaveforms();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => animateScene(index));
  });
}

// ─── Toggle helpers ────────────────────────────────────────────────────────────

function applyToggles() {
  // Labels
  document.querySelectorAll('.svg-label').forEach(el => {
    el.style.display = toggles.labels ? '' : 'none';
  });
  // Flux arrows
  document.querySelectorAll('.flux-arrow').forEach(el => {
    el.style.display = toggles.flux ? '' : 'none';
  });
  document.querySelectorAll('.flux-ring').forEach(el => {
    el.style.display = toggles.flux ? '' : 'none';
  });
  document.querySelectorAll('.particles-flux').forEach(el => {
    el.style.display = toggles.flux ? '' : 'none';
  });
  // Equations (formula-card elements)
  document.querySelectorAll('.formula-card').forEach(el => {
    el.style.display = toggles.equations ? '' : 'none';
  });
  // Subtitles
  document.querySelectorAll('.scene-subtitle').forEach(el => {
    el.classList.toggle('hidden', !toggles.subtitles);
  });
}

// ─── Scene injection ───────────────────────────────────────────────────────────

function injectVisuals() {
  // Scene 0 — intro graphic
  const v0 = document.getElementById('vis-0');
  if (v0) {
    v0.innerHTML = `
      <div class="intro-icon-wrap">
        <div class="intro-icon">⚡</div>
        <div class="wave-panel">
          <div class="wave-panel-title">AC waveform at source</div>
          <canvas id="wave-canvas-0" class="ac-wave-canvas" aria-label="Animated AC waveform"></canvas>
        </div>
        <div class="intro-flow">
          <div class="flow-item flow-item-photo">
            <img class="flow-photo" src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=640&q=80" alt="Power generation station"/>
            <span>Power Plant<br><small>11 kV generation</small></span>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-item flow-item-photo" style="border-color:rgba(56,189,248,0.4)">
            <img class="flow-photo" src="https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=640&q=80" alt="High voltage transmission infrastructure"/>
            <span>Step-Up Transformer<br><small>up to 400 kV</small></span>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-item flow-item-photo">
            <img class="flow-photo" src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=640&q=80" alt="Long-distance power grid lines"/>
            <span>Grid Transmission<br><small>long distance</small></span>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-item flow-item-photo" style="border-color:rgba(56,189,248,0.4)">
            <img class="flow-photo" src="https://images.unsplash.com/photo-1601933470928-c0f6f220d2f6?auto=format&fit=crop&w=640&q=80" alt="Distribution transformer station"/>
            <span>Step-Down Transformer<br><small>240 V output</small></span>
          </div>
          <span class="flow-arrow">→</span>
          <div class="flow-item flow-item-photo">
            <img class="flow-photo" src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=640&q=80" alt="Residential home electricity usage"/>
            <span>Your Home<br><small>safe supply</small></span>
          </div>
        </div>
      </div>`;
  }

  // Scene 1 — construction (clickable)
  const v1 = document.getElementById('vis-1');
  if (v1) {
    v1.innerHTML = buildSVG({ Np: 4, Ns: 4, showFlux: toggles.flux, showLabels: toggles.labels, clickable: true, id: 'svg-1' });
    v1.querySelectorAll('[data-part]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.getAttribute('data-part');
        const info = PART_INFO[key];
        if (!info) return;
        const box = document.getElementById('tooltip-box');
        box.innerHTML = `<h4>${info.title}</h4><p>${info.text}</p>`;
      });
    });
  }

  // Scene 2 — working principle (animated flux + waves)
  const v2 = document.getElementById('vis-2');
  if (v2) {
    v2.innerHTML = `
      <div class="working-visual-wrap">
        <div class="wave-panel compact">
          <div class="wave-panel-title">Live magnetic induction waveform</div>
          <canvas id="wave-canvas-2" class="ac-wave-canvas compact" aria-label="Animated induction waveform"></canvas>
        </div>
        ${buildSVG({ Np: 4, Ns: 4, showFlux: toggles.flux, showLabels: toggles.labels, showWaveIn: true, showWaveOut: true, id: 'svg-2' })}
      </div>`;
  }

  // Scene 3 — step-up (Np=3, Ns=7)
  const v3 = document.getElementById('vis-3');
  if (v3) {
    v3.innerHTML = buildSVG({ Np: 3, Ns: 7, showFlux: toggles.flux, showLabels: toggles.labels, id: 'svg-3' });
  }

  // Scene 4 — step-down (Np=7, Ns=3)
  const v4 = document.getElementById('vis-4');
  if (v4) {
    v4.innerHTML = buildSVG({ Np: 7, Ns: 3, showFlux: toggles.flux, showLabels: toggles.labels, id: 'svg-4' });
  }

  // Scene 5 — formula (balanced)
  const v5 = document.getElementById('vis-5');
  if (v5) {
    v5.innerHTML = buildSVG({ Np: 4, Ns: 4, showFlux: toggles.flux, showLabels: toggles.labels, id: 'svg-5' });
  }
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const userAnswers = new Array(QUIZ.length).fill(null);
let quizSubmitted = false;

function buildQuiz() {
  const container = document.getElementById('quiz-container');
  if (!container) return;
  container.innerHTML = '';
  QUIZ.forEach((q, qi) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';
    qDiv.innerHTML = `
      <div class="quiz-num">Question ${qi + 1} of ${QUIZ.length}</div>
      <div class="quiz-question-text">${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((opt, oi) => `
          <button class="quiz-option" data-q="${qi}" data-o="${oi}" type="button"
                  aria-label="Option ${String.fromCharCode(65 + oi)}: ${opt}">
            <span class="opt-letter">${String.fromCharCode(65 + oi)}</span>
            ${opt}
          </button>
        `).join('')}
      </div>
      <div class="quiz-feedback" id="feedback-${qi}"></div>
    `;
    container.appendChild(qDiv);
  });

  container.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (quizSubmitted) return;
      const qi = +btn.dataset.q;
      const oi = +btn.dataset.o;
      userAnswers[qi] = oi;
      // Update selected state for this question
      container.querySelectorAll(`.quiz-option[data-q="${qi}"]`)
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      // Enable submit if all answered
      const submitBtn = document.getElementById('quiz-submit-btn');
      if (userAnswers.every(a => a !== null)) submitBtn.disabled = false;
    });
  });

  document.getElementById('quiz-submit-btn').addEventListener('click', submitQuiz);
  document.getElementById('quiz-retry-btn').addEventListener('click', retryQuiz);
}

function submitQuiz() {
  if (quizSubmitted) return;
  quizSubmitted = true;

  let score = 0;
  QUIZ.forEach((q, qi) => {
    const chosen = userAnswers[qi];
    const correct = q.answer;
    const opts = document.querySelectorAll(`.quiz-option[data-q="${qi}"]`);
    opts.forEach((btn, oi) => {
      btn.disabled = true;
      if (oi === correct) btn.classList.add('correct');
      else if (oi === chosen && chosen !== correct) btn.classList.add('wrong');
    });
    const fb = document.getElementById(`feedback-${qi}`);
    if (fb) {
      const ok = chosen === correct;
      if (ok) score++;
      fb.className = `quiz-feedback show ${ok ? 'ok' : 'bad'}`;
      fb.textContent = (ok ? '✓ Correct! ' : '✗ Incorrect. ') + q.explain;
    }
  });

  const pct = Math.round((score / QUIZ.length) * 100);
  let emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📖';
  let msg = pct >= 80 ? 'Excellent! You have a strong grasp of transformer theory.'
           : pct >= 50 ? 'Good effort! Review the incorrect answers above.'
           : 'Keep studying! Revisit the earlier scenes and try again.';

  const resultEl = document.getElementById('quiz-result');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="score-big">${emoji} ${score}/${QUIZ.length}</div>
    <h3>${pct}% Score</h3>
    <p>${msg}</p>`;

  document.getElementById('quiz-takeaways').classList.remove('hidden');
  document.getElementById('quiz-submit-btn').classList.add('hidden');
  document.getElementById('quiz-retry-btn').classList.remove('hidden');

  // Audio feedback based on score
  if (pct >= 50) audio.playSuccess(); else audio.playFail();
}

function retryQuiz() {
  quizSubmitted = false;
  userAnswers.fill(null);
  document.getElementById('quiz-result').classList.add('hidden');
  document.getElementById('quiz-takeaways').classList.add('hidden');
  document.getElementById('quiz-submit-btn').classList.remove('hidden');
  document.getElementById('quiz-submit-btn').disabled = true;
  document.getElementById('quiz-retry-btn').classList.add('hidden');
  buildQuiz();
}

// ─── Navigation ────────────────────────────────────────────────────────────────

function goToScene(index) {
  if (index < 0 || index >= TOTAL_SCENES) return;

  // Animate old scene out if GSAP is available
  const oldEl = document.querySelector('.scene.active');
  if (oldEl && typeof gsap !== 'undefined') {
    gsap.to(oldEl, { opacity: 0, y: -14, duration: 0.28, ease: 'power2.in', onComplete: () => {
      oldEl.classList.remove('active');
      showScene(index);
    }});
  } else {
    if (oldEl) oldEl.classList.remove('active');
    showScene(index);
  }
}

function showScene(index) {
  currentScene = index;
  const el = document.getElementById(`scene-${index}`);
  if (!el) return;
  el.classList.add('active');

  if (typeof gsap !== 'undefined') {
    gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }

  // Update header
  document.getElementById('scene-counter').textContent = `${index + 1} / ${TOTAL_SCENES}`;
  const pct = ((index + 1) / TOTAL_SCENES * 100).toFixed(1);
  const bar = document.getElementById('progress-bar');
  bar.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', index + 1);

  // Update buttons
  document.getElementById('btn-prev').disabled = index === 0;
  document.getElementById('btn-next').textContent = index === TOTAL_SCENES - 1 ? '↩ Restart' : 'Next ›';

  // Stop hum when leaving working-principle scene
  if (index !== 2) audio.stopHum();

  // Run scene animation
  animateScene(index);
  applyToggles();
  startWaveforms();
  narrateScene(index);
}

// ─── Calculator (scene 5) ─────────────────────────────────────────────────────

function initCalc() {
  function update() {
    const vp = parseFloat(document.getElementById('calc-vp').value) || 0;
    const np = parseFloat(document.getElementById('calc-np').value) || 1;
    const ns = parseFloat(document.getElementById('calc-ns').value) || 1;
    const ratio = ns / np;
    const vs = vp * ratio;
    document.getElementById('r-vs').textContent = vs.toFixed(1);
    document.getElementById('r-ratio').textContent = ratio.toFixed(2);
  }
  ['calc-vp', 'calc-np', 'calc-ns'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', update); }
  });
  update();
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Inject SVGs for all scenes
  injectVisuals();

  // Build quiz
  buildQuiz();

  // Toggle checkboxes
  document.getElementById('tog-labels').addEventListener('change', e => {
    toggles.labels = e.target.checked;
    injectVisuals();  // re-inject SVGs with new toggle state
    applyToggles();
  });
  document.getElementById('tog-flux').addEventListener('change', e => {
    toggles.flux = e.target.checked;
    injectVisuals();
    applyToggles();
  });
  document.getElementById('tog-equations').addEventListener('change', e => {
    toggles.equations = e.target.checked;
    applyToggles();
  });
  document.getElementById('tog-subtitles').addEventListener('change', e => {
    toggles.subtitles = e.target.checked;
    applyToggles();
  });
  document.getElementById('tog-narrate').addEventListener('change', e => {
    toggles.narrate = e.target.checked;
    audio.narrationEnabled = toggles.narrate;
    if (!toggles.narrate) audio.stopNarration();
    else narrateScene(currentScene);
  });
  document.getElementById('narration-lang').addEventListener('change', e => {
    audio.narrationLocale = e.target.value === 'en' ? 'en' : 'hi';
    audio._voice = null;
    if (toggles.narrate && audio.enabled && audio.narrationEnabled) narrateScene(currentScene);
  });
  document.getElementById('narration-pace').addEventListener('change', e => {
    audio.narrationPace = e.target.value === 'normal' ? 'normal' : 'slow';
    if (toggles.narrate && audio.enabled && audio.narrationEnabled) narrateScene(currentScene);
  });
  document.getElementById('tog-audio').addEventListener('change', e => {
    audio.enabled = e.target.checked;
    if (!audio.enabled) {
      audio.stopHum();
      audio.stopNarration();
    }
  });

  // Navigation buttons
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentScene > 0) { audio.playClick(); goToScene(currentScene - 1); }
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    audio.playClick();
    if (currentScene < TOTAL_SCENES - 1) {
      goToScene(currentScene + 1);
    } else {
      goToScene(0); // restart from beginning
    }
  });

  document.getElementById('btn-replay').addEventListener('click', () => {
    replayScene(currentScene);
  });

  // Speed
  document.getElementById('speed-sel').addEventListener('change', e => {
    speedMultiplier = parseFloat(e.target.value);
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentScene < TOTAL_SCENES - 1) { audio.playClick(); goToScene(currentScene + 1); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentScene > 0) { audio.playClick(); goToScene(currentScene - 1); }
    }
  });

  // Calculator
  initCalc();

  // Start at scene 0
  audio.narrationLocale = document.getElementById('narration-lang')?.value === 'en' ? 'en' : 'hi';
  audio.narrationPace = document.getElementById('narration-pace')?.value === 'normal' ? 'normal' : 'slow';
  goToScene(0);
});
