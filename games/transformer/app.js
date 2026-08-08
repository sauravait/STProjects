/* app.js — Electrical Transformer Interactive Module
 *
 * Scene flow:
 *  0 · Intro
 *  1 · Construction (clickable parts)
 *  2 · Working Principle (animated flux + current)
 *  3 · Step-Up Transformer
 *  4 · Step-Down Transformer
 *  5 · Formulas & Calculator
 *  6 · Quiz (6 MCQs)
 *
 * Audio (sound effects + narration) is DISABLED by default. The user must
 * opt in via the "Sound" / "Narrate" toggles in the header.
 */

'use strict';

if (typeof window !== 'undefined' && !window.gsap) {
  const RESERVED = new Set(['duration', 'delay', 'ease', 'repeat', 'repeatDelay', 'yoyo', 'stagger', 'onComplete', 'onUpdate']);
  const toList = (target) => {
    if (!target) return [];
    if (typeof target === 'string') return [...document.querySelectorAll(target)];
    if (Array.isArray(target)) return target.flatMap(toList);
    if (typeof NodeList !== 'undefined' && target instanceof NodeList) return [...target];
    if (typeof HTMLCollection !== 'undefined' && target instanceof HTMLCollection) return [...target];
    return [target];
  };
  const applyVars = (target, vars = {}) => {
    toList(target).forEach((el) => {
      if (!el || typeof el !== 'object') return;
      Object.entries(vars).forEach(([key, value]) => {
        if (RESERVED.has(key)) return;
        if (key === 'attr' && value && typeof value === 'object') {
          Object.entries(value).forEach(([attr, attrVal]) => el.setAttribute(attr, attrVal));
          return;
        }
        if (el.style && key in el.style) {
          el.style[key] = String(value);
        } else if (key in el) {
          el[key] = value;
        }
      });
    });
    if (typeof vars.onComplete === 'function') setTimeout(vars.onComplete, 0);
  };
  const tween = { kill() {}, pause() {}, play() {}, restart() {} };
  const timeline = {
    to(target, vars) { applyVars(target, vars); return this; },
    fromTo(target, _fromVars, toVars) { applyVars(target, toVars); return this; },
    from(target, vars) { applyVars(target, vars); return this; },
    set(target, vars) { applyVars(target, vars); return this; },
    call(fn) { if (typeof fn === 'function') fn(); return this; },
    addLabel() { return this; },
    kill() {},
  };
  window.gsap = {
    to(target, vars) { applyVars(target, vars); return tween; },
    fromTo(target, _fromVars, toVars) { applyVars(target, toVars); return tween; },
    from(target, vars) { applyVars(target, vars); return tween; },
    set(target, vars) { applyVars(target, vars); return tween; },
    timeline() { return Object.create(timeline); },
  };
}

// ─── Audio Manager ─────────────────────────────────────────────────────────────

class AudioManager {
  constructor() {
    this._ctx = null;
    this._hum = null;
    this._humGain = null;
    // Audio is OFF by default — user opts in with the toggles.
    this.enabled = false;
    this.narrationEnabled = false;
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
      catch (e) { return null; }
    }
    // Browsers start the context suspended until a user gesture.
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
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
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.6);
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

  narrate(text, rate = 1, interrupt = true, onEnd = null) {
    if (!this.enabled || !this.narrationEnabled || !this._speech || !text) return false;
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
    if (typeof onEnd === 'function') {
      let done = false;
      const fire = () => { if (!done) { done = true; onEnd(); } };
      utter.onend = fire;
      utter.onerror = fire;
    }
    this._utterance = utter;
    this._speech.speak(utter);
    return true;
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
let workingRunId = 0;          // token to cancel an in-flight step sequence
let workingStepTimeout = null; // pending step timer

// Narration OFF by default (matches audio being disabled initially).
const toggles = { labels: true, flux: true, equations: false, subtitles: true, narrate: false };

function clearTransientAnimations() {
  if (activeTimeline) { activeTimeline.kill(); activeTimeline = null; }
  activeFlowTweens.forEach(t => t.kill());
  activeFluxTweens.forEach(t => t.kill());
  activeFlowTweens = [];
  activeFluxTweens = [];
  workingRunId++;                 // invalidate any running step sequence
  if (workingStepTimeout) { clearTimeout(workingStepTimeout); workingStepTimeout = null; }
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

// ─── Realistic Transformer SVG Generator ───────────────────────────────────────

/**
 * Build a realistic core-type transformer SVG.
 * @param {object} cfg
 *   cfg.Np / cfg.Ns    — primary / secondary turns (drawn as coil loops)
 *   cfg.showFlux       — draw magnetic-flux path + arrows
 *   cfg.showLabels     — draw part labels
 *   cfg.clickable      — add pointer cursor + data-part hooks
 *   cfg.id             — unique SVG id suffix
 */
function buildSVG(cfg = {}) {
  const {
    Np = 6, Ns = 6,
    showFlux = true, showLabels = true,
    clickable = false,
    id = 'tx-svg',
  } = cfg;

  // ── Layout (viewBox 0 0 860 400) ──
  const VW = 860, VH = 400;

  // Core-type frame geometry
  const coreX = 250, coreY = 66, coreW = 340, coreH = 268;   // outer rectangle
  const limbW = 58;                                          // yoke / limb thickness
  const leftLimbCx  = coreX + limbW / 2;                     // 279
  const rightLimbCx = coreX + coreW - limbW / 2;             // 561
  const windowTop = coreY + limbW;                           // 124
  const windowBot = coreY + coreH - limbW;                   // 276
  const coilTop = windowTop + 8;                             // 132
  const coilBot = windowBot - 8;                             // 268
  const coilH = coilBot - coilTop;                           // 136
  const midY = (coilTop + coilBot) / 2;

  // Circuit anchor points
  const srcX = 92, srcY = midY, srcR = 30;
  const bulbX = 772, bulbY = midY, bulbR = 30;
  const primOuterX = 150;   // left external wire column
  const secOuterX  = 690;   // right external wire column
  const coilRx = limbW / 2 + 26;   // horizontal radius of a coil loop

  /* ── Laminated iron-core frame (drawn as one path with a window cut-out) ── */
  function corePath() {
    const oL = coreX, oT = coreY, oR = coreX + coreW, oB = coreY + coreH;
    const iL = coreX + limbW, iT = coreY + limbW, iR = oR - limbW, iB = oB - limbW;
    // outer clockwise, inner counter-clockwise → even-odd hole
    return `M${oL},${oT} L${oR},${oT} L${oR},${oB} L${oL},${oB} Z ` +
           `M${iL},${iT} L${iL},${iB} L${iR},${iB} L${iR},${iT} Z`;
  }

  function laminationLines() {
    // Faint vertical striations to suggest stacked laminations.
    let out = '';
    for (let x = coreX + 6; x < coreX + coreW; x += 7) {
      // skip the window region for horizontal clarity handled by clip; simplest: full-height thin lines
      out += `<line x1="${x}" y1="${coreY + 3}" x2="${x}" y2="${coreY + coreH - 3}"
                    stroke="#5b4a2c" stroke-width="0.6" opacity="0.35"/>`;
    }
    return out;
  }

  /* ── A wound coil around a vertical limb (3D copper-tube look) ── */
  function coil(limbCx, turns, colorFront, colorBack, cls, part) {
    const n = Math.max(3, Math.min(14, turns));
    const step = coilH / n;
    const ry = Math.max(4, step * 0.46);
    let back = '', front = '';
    for (let i = 0; i < n; i++) {
      const cy = coilTop + step * (i + 0.5);
      const arc = (sweep) => `M${limbCx - coilRx},${cy} A${coilRx},${ry} 0 0 ${sweep} ${limbCx + coilRx},${cy}`;
      // back arc = top half (behind the limb)
      back  += `<path d="${arc(1)}" fill="none" stroke="${colorBack}" stroke-width="4.5" stroke-linecap="round" opacity="0.5"/>`;
      // front arc = bottom half: dark base + colour body + white highlight → rounded wire
      front += `<path d="${arc(0)}" fill="none" stroke="${colorBack}" stroke-width="6.5" stroke-linecap="round"/>`;
      front += `<path d="${arc(0)}" fill="none" stroke="${colorFront}" stroke-width="4.2" stroke-linecap="round"/>`;
      front += `<path d="${arc(0)}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.2" stroke-linecap="round" transform="translate(0,-1.1)"/>`;
    }
    const attr = clickable ? 'style="cursor:pointer"' : '';
    return {
      back: `<g class="${cls}-back" data-part="${part}" ${attr}>${back}</g>`,
      front: `<g class="${cls} ${cls}-front" data-part="${part}" ${attr}>${front}</g>`,
    };
  }

  const prim = coil(leftLimbCx,  Np, '#3b82f6', '#1e3a8a', 'coil-primary',   'primary');
  const sec  = coil(rightLimbCx, Ns, '#ef4444', '#7f1d1d', 'coil-secondary', 'secondary');

  /* ── Flux loop (closed magnetic circuit through the core centreline) ── */
  const fL = leftLimbCx, fR = rightLimbCx;
  const fT = coreY + limbW / 2, fB = coreY + coreH - limbW / 2;
  const fluxLoop = `M${fL},${fT} L${fR},${fT} L${fR},${fB} L${fL},${fB} Z`;

  function fluxArrows() {
    if (!showFlux) return '';
    // Directional chevrons riding the core loop (top→right→bottom→left).
    const mk = (x, y, rot) =>
      `<path class="flux-arrow" data-part="flux" transform="translate(${x},${y}) rotate(${rot})"
             d="M-7,-6 L7,0 L-7,6" fill="none" stroke="#22c55e" stroke-width="3"
             stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<g class="flux-arrows">
      ${mk((fL + fR) / 2, fT, 0)}
      ${mk(fR, (fT + fB) / 2, 90)}
      ${mk((fL + fR) / 2, fB, 180)}
      ${mk(fL, (fT + fB) / 2, 270)}
    </g>`;
  }

  /* ── Current-flow circuits (closed loops the dots ride, matching the drawn wires) ── */
  const coilEdgeL = leftLimbCx - coilRx;    // where primary wires meet the coil
  const coilEdgeR = rightLimbCx + coilRx;   // where secondary wires meet the coil
  // Primary: source → top wire → down through coil limb → bottom wire → back through source (closed)
  const primLoop = `M${srcX + srcR},${srcY - 16} L${primOuterX},${srcY - 16} L${primOuterX},${coilTop} ` +
                   `L${coilEdgeL},${coilTop} L${coilEdgeL},${coilBot} L${primOuterX},${coilBot} ` +
                   `L${primOuterX},${srcY + 16} L${srcX + srcR},${srcY + 16} Z`;
  // Secondary: coil top → top wire → down through bulb → bottom wire → up through coil limb (closed)
  const secLoop  = `M${coilEdgeR},${coilTop} L${secOuterX},${coilTop} L${secOuterX},${bulbY - 16} ` +
                   `L${bulbX - bulbR},${bulbY - 16} L${bulbX - bulbR},${bulbY + 16} L${secOuterX},${bulbY + 16} ` +
                   `L${secOuterX},${coilBot} L${coilEdgeR},${coilBot} Z`;

  function currentDots() {
    const dots = (cls, color, count) =>
      new Array(count).fill(0)
        .map(() => `<circle r="4" fill="${color}" class="flow-dot ${cls}"/>`).join('');
    // No SVG blur filters on moving groups — filtered content re-rasterizes every
    // frame and makes nearby text flicker. Bright dots read fine on their own.
    return `
      <path id="pp-${id}" d="${primLoop}" fill="none" stroke="none" visibility="hidden"/>
      <path id="fp-${id}" d="${fluxLoop}" fill="none" stroke="none" visibility="hidden"/>
      <path id="sp-${id}" d="${secLoop}" fill="none" stroke="none" visibility="hidden"/>
      <g class="flow-particles particles-primary">${dots('flow-primary', '#bfdbfe', 7)}</g>
      <g class="flow-particles particles-flux">${dots('flow-flux', '#86efac', 8)}</g>
      <g class="flow-particles particles-secondary">${dots('flow-secondary', '#fecaca', 7)}</g>`;
  }

  /* ── Labels (with dark halo so they never flicker against the coils) ── */
  function labels() {
    if (!showLabels) return '';
    const halo = 'stroke="#0b1220" stroke-width="3.2" paint-order="stroke" style="paint-order:stroke"';
    return `
      <text x="${leftLimbCx - coilRx - 20}" y="${midY}" text-anchor="middle"
            fill="#93c5fd" font-size="13" font-weight="800" ${halo}
            transform="rotate(-90, ${leftLimbCx - coilRx - 20}, ${midY})"
            class="svg-label" data-part="primary">Primary coil · ${Np} loops</text>
      <text x="${rightLimbCx + coilRx + 20}" y="${midY}" text-anchor="middle"
            fill="#fca5a5" font-size="13" font-weight="800" ${halo}
            transform="rotate(90, ${rightLimbCx + coilRx + 20}, ${midY})"
            class="svg-label" data-part="secondary">Secondary coil · ${Ns} loops</text>
      <text x="${(fL + fR) / 2}" y="${coreY + coreH / 2 + 4}" text-anchor="middle"
            fill="#f0d9a8" font-size="13" font-weight="700" ${halo}
            class="svg-label" data-part="core">Iron Core</text>
      <text x="${srcX}" y="${srcY + srcR + 20}" text-anchor="middle"
            fill="#93c5fd" font-size="12" font-weight="800" ${halo} class="svg-label">⚡ Power IN</text>
      <text x="${bulbX}" y="${bulbY + bulbR + 22}" text-anchor="middle"
            fill="#fca5a5" font-size="12" font-weight="800" ${halo} class="svg-label">💡 Power OUT</text>`;
  }

  const partAttr = clickable ? 'style="cursor:pointer"' : '';

  return `
<div class="tx-svg-wrap">
<svg id="${id}" viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="Transformer diagram with ${Np} primary and ${Ns} secondary turns">
  <defs>
    <linearGradient id="core-grad-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a98a52"/>
      <stop offset="0.5" stop-color="#8b7355"/>
      <stop offset="1" stop-color="#6b5735"/>
    </linearGradient>
    <radialGradient id="bulb-grad-${id}" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="#fff7cc"/>
      <stop offset="0.5" stop-color="#fde047"/>
      <stop offset="1" stop-color="#b45309"/>
    </radialGradient>
    <filter id="glow-b-${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-r-${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-g-${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bulb-glow-${id}" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Iron core (laminated frame) -->
  <path d="${corePath()}" fill="url(#core-grad-${id})" fill-rule="evenodd"
        stroke="#5b4a2c" stroke-width="1.5" class="core-rect" data-part="core" ${partAttr}/>
  ${laminationLines()}

  <!-- Coil back-halves (behind the limbs) -->
  ${prim.back}
  ${sec.back}

  <!-- Re-draw limbs on top of back arcs so the coil appears wound around them -->
  <rect x="${coreX}" y="${windowTop}" width="${limbW}" height="${coilH + 16}"
        fill="url(#core-grad-${id})" stroke="#5b4a2c" stroke-width="1" class="core-rect" data-part="core" ${partAttr}/>
  <rect x="${coreX + coreW - limbW}" y="${windowTop}" width="${limbW}" height="${coilH + 16}"
        fill="url(#core-grad-${id})" stroke="#5b4a2c" stroke-width="1" class="core-rect" data-part="core" ${partAttr}/>

  <!-- Flux path + arrows -->
  <path id="fluxpath-${id}" class="flux-loop" d="${fluxLoop}" fill="none"
        stroke="#22c55e" stroke-width="2" opacity="0.28" stroke-dasharray="6 6" data-part="flux"/>
  ${fluxArrows()}

  <!-- External primary wiring (source → primary) -->
  <polyline class="wire-primary"
            points="${srcX + srcR},${srcY - 16} ${primOuterX},${srcY - 16} ${primOuterX},${coilTop}
                    ${leftLimbCx - coilRx},${coilTop}" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
  <polyline class="wire-primary"
            points="${srcX + srcR},${srcY + 16} ${primOuterX},${srcY + 16} ${primOuterX},${coilBot}
                    ${leftLimbCx - coilRx},${coilBot}" fill="none" stroke="#3b82f6" stroke-width="2.5"/>

  <!-- External secondary wiring (secondary → load) -->
  <polyline class="wire-secondary"
            points="${rightLimbCx + coilRx},${coilTop} ${secOuterX},${coilTop} ${secOuterX},${bulbY - 16}
                    ${bulbX - bulbR},${bulbY - 16}" fill="none" stroke="#ef4444" stroke-width="2.5"/>
  <polyline class="wire-secondary"
            points="${rightLimbCx + coilRx},${coilBot} ${secOuterX},${coilBot} ${secOuterX},${bulbY + 16}
                    ${bulbX - bulbR},${bulbY + 16}" fill="none" stroke="#ef4444" stroke-width="2.5"/>

  <!-- AC source -->
  <circle cx="${srcX}" cy="${srcY}" r="${srcR}" class="ac-source-ring"
          fill="rgba(15,23,42,0.85)" stroke="#94a3b8" stroke-width="2.5"/>
  <path d="M${srcX - 15},${srcY} q7.5,-13 15,0 q7.5,13 15,0" fill="none"
        stroke="#94a3b8" stroke-width="2.5" class="ac-sine"/>

  <!-- Load: light bulb -->
  <g class="load-bulb" filter="url(#bulb-glow-${id})">
    <circle cx="${bulbX}" cy="${bulbY - 4}" r="${bulbR - 4}" class="bulb-globe"
            fill="rgba(15,23,42,0.85)" stroke="#94a3b8" stroke-width="2.5"/>
    <path d="M${bulbX - 8},${bulbY + 6} q8,10 16,0" fill="none" stroke="#94a3b8" stroke-width="2"/>
    <rect x="${bulbX - 9}" y="${bulbY + bulbR - 12}" width="18" height="8" rx="1.5" fill="#64748b"/>
    <path class="bulb-filament" d="M${bulbX - 7},${bulbY} q7,-14 14,0" fill="none"
          stroke="#facc15" stroke-width="2" opacity="0.35"/>
  </g>

  <!-- Coil front-halves (in front of limbs) -->
  ${prim.front}
  ${sec.front}

  <!-- Animated current dots -->
  ${currentDots()}

  ${labels()}
</svg>
</div>`;
}

// ─── Self-drawn real-world illustrations (replace stock photos) ────────────────

function illusPowerPlant() {
  return `<svg viewBox="0 0 120 90" class="illus" role="img" aria-label="Power plant">
    <rect width="120" height="90" rx="8" fill="#0b1220"/>
    <rect x="14" y="46" width="70" height="34" fill="#334155"/>
    <rect x="30" y="20" width="14" height="30" fill="#475569"/>
    <rect x="50" y="14" width="14" height="36" fill="#475569"/>
    <ellipse cx="37" cy="16" rx="12" ry="6" fill="#94a3b8" opacity="0.6"/>
    <ellipse cx="57" cy="10" rx="14" ry="7" fill="#94a3b8" opacity="0.5"/>
    <rect x="20" y="56" width="10" height="14" fill="#fcd34d"/>
    <rect x="38" y="56" width="10" height="14" fill="#fcd34d"/>
    <rect x="56" y="56" width="10" height="14" fill="#fcd34d"/>
    <path d="M92 30 l10 6 -6 4 8 6 -12 8" fill="none" stroke="#fde047" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`;
}

function illusPylon() {
  return `<svg viewBox="0 0 120 90" class="illus" role="img" aria-label="Transmission tower">
    <rect width="120" height="90" rx="8" fill="#0b1220"/>
    <path d="M60 8 L44 78 M60 8 L76 78 M50 34 H70 M46 52 H74 M42 70 H78"
          stroke="#94a3b8" stroke-width="2.5" fill="none"/>
    <path d="M50 34 L60 20 L70 34 M46 52 L60 34 L74 52" stroke="#64748b" stroke-width="2" fill="none"/>
    <line x1="34" y1="30" x2="50" y2="34" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="70" y1="34" x2="86" y2="30" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="30" y1="50" x2="46" y2="52" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="74" y1="52" x2="90" y2="50" stroke="#38bdf8" stroke-width="1.5"/>
    <path d="M55 44 l6 4 -4 3 5 4" stroke="#fde047" stroke-width="2" fill="none" stroke-linejoin="round"/>
  </svg>`;
}

function illusHome() {
  return `<svg viewBox="0 0 120 90" class="illus" role="img" aria-label="Home">
    <rect width="120" height="90" rx="8" fill="#0b1220"/>
    <path d="M24 44 L60 20 L96 44 Z" fill="#7c3f2e"/>
    <rect x="32" y="44" width="56" height="34" fill="#475569"/>
    <rect x="52" y="56" width="16" height="22" fill="#1e293b"/>
    <rect x="38" y="50" width="10" height="10" fill="#fcd34d"/>
    <rect x="72" y="50" width="10" height="10" fill="#fcd34d"/>
    <path d="M60 30 l5 8 -4 0 5 8" stroke="#fde047" stroke-width="2" fill="none" stroke-linejoin="round"/>
  </svg>`;
}

function illusStepUp() {
  return `<svg viewBox="0 0 130 96" class="rw-illus-svg" role="img" aria-label="Step-up: plant to high-voltage lines">
    <rect width="130" height="96" rx="10" fill="#0b1220"/>
    <rect x="10" y="52" width="34" height="30" fill="#334155"/>
    <rect x="18" y="34" width="9" height="18" fill="#475569"/>
    <ellipse cx="22" cy="32" rx="8" ry="4" fill="#94a3b8" opacity="0.5"/>
    <path d="M72 16 L60 84 M72 16 L84 84 M64 40 H80 M60 60 H84"
          stroke="#94a3b8" stroke-width="2.2" fill="none"/>
    <line x1="50" y1="38" x2="64" y2="40" stroke="#38bdf8" stroke-width="1.6"/>
    <line x1="80" y1="40" x2="120" y2="36" stroke="#38bdf8" stroke-width="1.6"/>
    <line x1="80" y1="60" x2="120" y2="56" stroke="#38bdf8" stroke-width="1.6"/>
    <text x="100" y="80" fill="#f59e0b" font-size="12" font-weight="700" font-family="monospace">400kV</text>
    <path d="M46 46 l7 5 -5 3 6 5" stroke="#fde047" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
  </svg>`;
}

function illusStepDown() {
  return `<svg viewBox="0 0 130 96" class="rw-illus-svg" role="img" aria-label="Step-down: charger to phone">
    <rect width="130" height="96" rx="10" fill="#0b1220"/>
    <rect x="16" y="30" width="40" height="46" rx="6" fill="#334155" stroke="#475569" stroke-width="2"/>
    <rect x="30" y="22" width="4" height="10" fill="#94a3b8"/>
    <rect x="40" y="22" width="4" height="10" fill="#94a3b8"/>
    <text x="36" y="58" fill="#38bdf8" font-size="10" font-weight="700" font-family="monospace" text-anchor="middle">240V</text>
    <path d="M56 52 h14" stroke="#f87171" stroke-width="2.5"/>
    <rect x="82" y="26" width="34" height="60" rx="7" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <rect x="88" y="34" width="22" height="38" rx="2" fill="#0f172a"/>
    <circle cx="99" cy="79" r="3" fill="#475569"/>
    <text x="99" y="58" font-size="10" font-weight="700" font-family="monospace" text-anchor="middle" fill="#4ade80">5V</text>
    <path d="M99 40 l4 7 -3 0 4 7" stroke="#fde047" stroke-width="2" fill="none" stroke-linejoin="round"/>
  </svg>`;
}

// ─── Cinematic intro: the journey of electricity (animated in animateScene) ────

function buildJourneySVG() {
  // Wide scene: plant → step-up → towers → step-down → home, with an energy
  // packet that travels the wire and lights each stage as it passes.
  const VW = 920, VH = 300;
  const wireY = 96;
  // Node x-centres
  const xPlant = 92, xUp = 268, xT1 = 420, xT2 = 540, xDown = 700, xHome = 858;
  // The wire the energy packet rides (left plant → right home, along pylons)
  const wirePath =
    `M${xPlant + 6},${wireY} L${xUp},${wireY} L${xT1},${wireY - 26} L${xT2},${wireY - 26} ` +
    `L${xDown},${wireY} L${xHome - 8},${wireY}`;

  const tower = (cx) => `
    <g class="jn-tower">
      <path d="M${cx} ${wireY - 46} L${cx - 16} ${wireY + 70} M${cx} ${wireY - 46} L${cx + 16} ${wireY + 70}
               M${cx - 8} ${wireY - 8} H${cx + 8} M${cx - 12} ${wireY + 20} H${cx + 12}"
            stroke="#7c8aa0" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M${cx - 8} ${wireY - 26} L${cx} ${wireY - 44} L${cx + 8} ${wireY - 26}"
            stroke="#5b6b82" stroke-width="2" fill="none"/>
      <circle cx="${cx - 16}" cy="${wireY - 26}" r="2.4" fill="#64748b"/>
      <circle cx="${cx + 16}" cy="${wireY - 26}" r="2.4" fill="#64748b"/>
    </g>`;

  return `
<div class="journey-wrap">
<svg id="journey" viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="The journey of electricity from power plant to your home">
  <defs>
    <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b1730"/>
      <stop offset="1" stop-color="#060c1c"/>
    </linearGradient>
    <radialGradient id="packet-grad" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fffbe6"/>
      <stop offset="0.4" stop-color="#fde047"/>
      <stop offset="1" stop-color="rgba(251,191,36,0)"/>
    </radialGradient>
    <linearGradient id="ground-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#12203c"/>
      <stop offset="1" stop-color="#0a1428"/>
    </linearGradient>
    <filter id="soft-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Backdrop -->
  <rect width="${VW}" height="${VH}" fill="url(#sky-grad)"/>
  <g opacity="0.5">
    ${new Array(26).fill(0).map((_, i) => {
      const sx = 20 + i * 34, sy = 20 + (i * 47 % 60);
      return `<circle class="jn-star" cx="${sx}" cy="${sy}" r="${(i % 3 === 0) ? 1.4 : 0.9}" fill="#cbd5e1" style="animation-delay:${(i % 7) * 0.4}s"/>`;
    }).join('')}
  </g>
  <rect y="${wireY + 96}" width="${VW}" height="${VH - wireY - 96}" fill="url(#ground-grad)"/>
  <line x1="0" y1="${wireY + 96}" x2="${VW}" y2="${wireY + 96}" stroke="#1e2f52" stroke-width="2"/>

  <!-- The transmission wire + animated dashed energy -->
  <path class="jn-wire" d="${wirePath}" fill="none" stroke="#334867" stroke-width="3"/>
  <path class="jn-wire-live" d="${wirePath}" fill="none" stroke="#fcd34d" stroke-width="3"
        stroke-linecap="round" stroke-dasharray="2 16" opacity="0.9"/>
  <path id="journey-track" d="${wirePath}" fill="none" stroke="none"/>

  <!-- Towers -->
  ${tower(xT1)}
  ${tower(xT2)}

  <!-- Power plant -->
  <g class="jn-node" data-node="plant">
    <rect x="${xPlant - 44}" y="${wireY + 34}" width="86" height="62" rx="5" fill="#26344f" stroke="#3b4a68" stroke-width="1.5"/>
    <rect x="${xPlant - 34}" y="${wireY + 8}" width="14" height="30" fill="#33425f"/>
    <rect x="${xPlant - 12}" y="${wireY - 2}" width="14" height="40" fill="#33425f"/>
    <ellipse class="jn-smoke" cx="${xPlant - 27}" cy="${wireY + 4}" rx="10" ry="5" fill="#8092ac" opacity="0.45"/>
    <ellipse class="jn-smoke" cx="${xPlant - 5}" cy="${wireY - 6}" rx="12" ry="6" fill="#8092ac" opacity="0.4" style="animation-delay:0.8s"/>
    <rect class="jn-win" x="${xPlant - 38}" y="${wireY + 48}" width="12" height="16" fill="#fcd34d"/>
    <rect class="jn-win" x="${xPlant - 18}" y="${wireY + 48}" width="12" height="16" fill="#fcd34d"/>
    <rect class="jn-win" x="${xPlant + 2}" y="${wireY + 48}" width="12" height="16" fill="#fcd34d"/>
    <text x="${xPlant}" y="${wireY + 118}" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700">Power Plant</text>
    <text x="${xPlant}" y="${wireY + 136}" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="700">11 kV</text>
  </g>

  <!-- Step-up transformer -->
  <g class="jn-node" data-node="up">
    <rect x="${xUp - 26}" y="${wireY + 30}" width="52" height="52" rx="7" fill="#20304d" stroke="#3b4a68" stroke-width="1.5"/>
    <circle class="jn-ring" cx="${xUp}" cy="${wireY + 56}" r="16" fill="none" stroke="#38bdf8" stroke-width="2.2"/>
    <text x="${xUp}" y="${wireY + 61}" text-anchor="middle" fill="#7dd3fc" font-size="15" font-weight="800">↑</text>
    <text x="${xUp}" y="${wireY + 108}" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700">Step-Up</text>
    <text x="${xUp}" y="${wireY + 126}" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="700">400 kV</text>
  </g>

  <!-- Grid label under towers -->
  <text x="${(xT1 + xT2) / 2}" y="${wireY + 118}" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700">Power Grid</text>
  <text x="${(xT1 + xT2) / 2}" y="${wireY + 136}" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="700">long distance</text>

  <!-- Step-down transformer -->
  <g class="jn-node" data-node="down">
    <rect x="${xDown - 26}" y="${wireY + 30}" width="52" height="52" rx="7" fill="#20304d" stroke="#3b4a68" stroke-width="1.5"/>
    <circle class="jn-ring" cx="${xDown}" cy="${wireY + 56}" r="16" fill="none" stroke="#f87171" stroke-width="2.2"/>
    <text x="${xDown}" y="${wireY + 61}" text-anchor="middle" fill="#fca5a5" font-size="15" font-weight="800">↓</text>
    <text x="${xDown}" y="${wireY + 108}" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700">Step-Down</text>
    <text x="${xDown}" y="${wireY + 126}" text-anchor="middle" fill="#f87171" font-size="12" font-weight="700">240 V</text>
  </g>

  <!-- Home -->
  <g class="jn-node" data-node="home">
    <path d="M${xHome - 40} ${wireY + 52} L${xHome} ${wireY + 22} L${xHome + 40} ${wireY + 52} Z" fill="#8a4636"/>
    <rect x="${xHome - 30}" y="${wireY + 52}" width="60" height="44" fill="#2b3a58"/>
    <rect x="${xHome - 6}" y="${wireY + 70}" width="14" height="26" fill="#16233d"/>
    <rect class="jn-win" x="${xHome - 24}" y="${wireY + 60}" width="12" height="12" fill="#fcd34d"/>
    <rect class="jn-win" x="${xHome + 12}" y="${wireY + 60}" width="12" height="12" fill="#fcd34d"/>
    <text x="${xHome}" y="${wireY + 118}" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700">Your Home</text>
    <text x="${xHome}" y="${wireY + 136}" text-anchor="middle" fill="#4ade80" font-size="12" font-weight="700">safe supply</text>
  </g>

  <!-- Energy packet (glowing comet that travels the wire) -->
  <g id="journey-packet" class="jn-packet">
    <circle r="16" fill="url(#packet-grad)"/>
    <circle r="5" fill="#fffbe6" filter="url(#soft-glow)"/>
  </g>
</svg>
</div>`;
}



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
    text: 'The green arrows represent the alternating magnetic flux circulating around the closed iron-core loop. This changing flux is what induces the EMF in the secondary winding (Faraday\'s Law).',
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
  // Scene 2 narrates each step individually (synced to the animation), so skip
  // the scene-level narration there to avoid cancelling the step sequence.
  if (index === 2) return;
  const scene = document.getElementById(`scene-${index}`);
  if (!scene) return;
  const fallback = cleanNarrationText(scene.querySelector('.scene-subtitle')?.textContent || '');
  const text = cleanNarrationText(getNarrationText(SCENE_NARRATION[index], fallback));
  audio.narrate(text, getNarrationRate(), true);
}

function narrateStep(stepId, onEnd = null) {
  if (!toggles.narrate || !audio.enabled || !audio.narrationEnabled) return false;
  const stepEl = document.getElementById(stepId);
  if (!stepEl) return false;
  const fallback = cleanNarrationText(stepEl.textContent || '');
  const text = cleanNarrationText(getNarrationText(STEP_NARRATION[stepId], fallback));
  return audio.narrate(text, getNarrationRate(), true, onEnd);
}

// ─── Particle motion along SVG paths (GSAP) ────────────────────────────────────

function animateDotsOnPath(dots, pathEl, duration = 2.2, stagger = 0.22) {
  if (typeof gsap === 'undefined' || !dots.length || !pathEl) return;
  const total = pathEl.getTotalLength();
  if (!total) return;
  dots.forEach((dot, i) => {
    const tracker = { progress: i / dots.length };
    const tween = gsap.to(tracker, {
      progress: tracker.progress + 1,
      duration,
      ease: 'none',
      repeat: -1,
      onUpdate: () => {
        const p = pathEl.getPointAtLength((tracker.progress % 1) * total);
        dot.setAttribute('cx', p.x.toFixed(2));
        dot.setAttribute('cy', p.y.toFixed(2));
      },
    });
    activeFlowTweens.push(tween);
  });
}

function startWorkingFlow(svg, pace = 1) {
  if (!svg) return;
  activeFlowTweens.forEach(t => t.kill());
  activeFlowTweens = [];
  const sid = svg.id || 'svg-2';
  const primaryPath   = svg.querySelector(`#pp-${sid}`);
  const fluxPath      = svg.querySelector(`#fp-${sid}`);
  const secondaryPath = svg.querySelector(`#sp-${sid}`);
  // Calmer, readable travel times (larger = slower).
  const base = pace * 3.6 / speedMultiplier;
  animateDotsOnPath(Array.from(svg.querySelectorAll('.flow-primary')),   primaryPath,   base,        0.16);
  animateDotsOnPath(Array.from(svg.querySelectorAll('.flow-flux')),      fluxPath,      base * 1.35, 0.16);
  animateDotsOnPath(Array.from(svg.querySelectorAll('.flow-secondary')), secondaryPath, base,        0.16);
}

// Continuous ambient life for a static transformer scene (flux + current always flowing).
function startAmbient(svg) {
  if (!svg) return;
  startFluxPulse(svg);
  startWorkingFlow(svg);
}

function startFluxPulse(svg) {
  if (!svg || typeof gsap === 'undefined') return;
  activeFluxTweens.forEach(t => t.kill());
  activeFluxTweens = [];
  // Pulse the directional chevrons — represents the alternating flux.
  svg.querySelectorAll('.flux-arrow').forEach((arrow, i) => {
    const tween = gsap.fromTo(arrow,
      { opacity: 0.35 },
      { opacity: 1, repeat: -1, yoyo: true, duration: 0.5, delay: i * 0.12, ease: 'sine.inOut' });
    activeFluxTweens.push(tween);
  });
  // Animate the dashed flux loop so the field appears to circulate.
  const loop = svg.querySelector('.flux-loop');
  if (loop) {
    const tween = gsap.to(loop, { strokeDashoffset: -48, repeat: -1, duration: 1.1 / speedMultiplier, ease: 'none' });
    activeFluxTweens.push(tween);
  }
}

// ─── AC waveform canvas ────────────────────────────────────────────────────────

function drawWave(canvas, timestamp, opts = {}) {
  const {
    sAmpMul = 1,        // secondary amplitude relative to primary (= turns ratio)
    showSecondary = true,
    pLabel = 'Primary (input)',
    sLabel = 'Secondary (output)',
  } = opts;
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
  const baseAmp = h * 0.30;
  // Both waves share the SAME phase & frequency; only amplitude differs (Vs/Vp = Ns/Np).
  const pAmp = Math.min(baseAmp, h * 0.44 / Math.max(1, sAmpMul));
  const sAmp = Math.min(h * 0.44, pAmp * sAmpMul);
  const freq = 0.022 * speedMultiplier;
  const t = timestamp * 0.0032;

  // Grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148,163,184,0.10)';
  ctx.beginPath();
  for (let gx = 0; gx <= w; gx += 32) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
  for (let gy = 0; gy <= h; gy += 18) { ctx.moveTo(0, gy); ctx.lineTo(w, gy); }
  ctx.stroke();

  // Zero baseline
  ctx.beginPath();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(148,163,184,0.28)';
  ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

  const drawCurve = (color, glow, amp, fill) => {
    if (fill) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = mid - Math.sin((x * freq) + t) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, mid); ctx.lineTo(0, mid); ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = color;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 8;
    for (let x = 0; x <= w; x += 2) {
      const y = mid - Math.sin((x * freq) + t) * amp;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  // Primary first, secondary on top (same phase — they rise and fall together)
  drawCurve('rgba(96,165,250,1)', 'rgba(59,130,246,0.7)', pAmp, 'rgba(59,130,246,0.10)');
  if (showSecondary) drawCurve('rgba(248,113,113,1)', 'rgba(239,68,68,0.7)', sAmp, 'rgba(239,68,68,0.08)');

  // Legend
  ctx.font = '600 10px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(96,165,250,1)';
  ctx.fillText('● ' + pLabel, 8, 13);
  if (showSecondary) {
    ctx.fillStyle = 'rgba(248,113,113,1)';
    ctx.fillText('● ' + sLabel, 8 + ctx.measureText('● ' + pLabel).width + 16, 13);
  }
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
    const c3 = document.getElementById('wave-canvas-3');
    const c4 = document.getElementById('wave-canvas-4');
    // Scene 0: single clean AC supply wave.
    if (currentScene === 0 && c0) drawWave(c0, ts, { showSecondary: false, pLabel: 'AC supply voltage' });
    // Scene 2: equal turns → equal, in-phase waves.
    if (currentScene === 2 && c2) drawWave(c2, ts, { sAmpMul: 1 });
    // Scene 3: step-up → secondary taller than primary.
    if (currentScene === 3 && c3) drawWave(c3, ts, { sAmpMul: 2.2, pLabel: 'Vp (input)', sLabel: 'Vs (output ▲ higher)' });
    // Scene 4: step-down → secondary shorter than primary.
    if (currentScene === 4 && c4) drawWave(c4, ts, { sAmpMul: 0.45, pLabel: 'Vp (input)', sLabel: 'Vs (output ▼ lower)' });
    waveformFrameId = requestAnimationFrame(tick);
  };
  waveformFrameId = requestAnimationFrame(tick);
}

// ─── Scene animations ─────────────────────────────────────────────────────────

function animateScene(index) {
  clearTransientAnimations();
  const gsapOk = typeof gsap !== 'undefined';

  // ── Scene 0 · Intro — cinematic energy journey ──
  if (index === 0) {
    startWaveforms();
    const journey = document.getElementById('journey');
    if (gsapOk && journey) {
      const packet = journey.querySelector('#journey-packet');
      const track  = journey.querySelector('#journey-track');
      const nodes  = Array.from(journey.querySelectorAll('.jn-node'));
      const liveWire = journey.querySelector('.jn-wire-live');

      // Intro reveal of the whole scene
      gsap.from(journey, { opacity: 0, duration: 0.6, ease: 'power2.out' });
      nodes.forEach((n, i) => gsap.from(n, { opacity: 0, y: 14, duration: 0.5, delay: 0.15 + i * 0.12, ease: 'power2.out' }));

      // Dim all nodes to start
      nodes.forEach(n => gsap.set(n, { opacity: 1 }));
      const dimNode = (n) => { const w = n.querySelectorAll('.jn-win, .jn-ring'); w.forEach(el => gsap.set(el, { opacity: 0.25 })); };
      nodes.forEach(dimNode);

      // Energy dashes flowing along the wire
      if (liveWire) {
        const t = gsap.to(liveWire, { strokeDashoffset: -180, duration: 2.2, ease: 'none', repeat: -1 });
        activeFluxTweens.push(t);
      }

      // Comet packet travels the wire on a loop, lighting each node as it passes
      if (packet && track) {
        const total = track.getTotalLength();
        // node progress checkpoints along the path (0..1)
        const checkpoints = [0.02, 0.28, 0.5, 0.75, 0.98];
        const state = { p: 0 };
        const lit = new Set();
        const tw = gsap.to(state, {
          p: 1, duration: 4.4, ease: 'none', repeat: -1,
          onRepeat: () => { lit.clear(); nodes.forEach(dimNode); },
          onUpdate: () => {
            const pt = track.getPointAtLength(state.p * total);
            packet.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
            checkpoints.forEach((cp, i) => {
              if (state.p >= cp && !lit.has(i) && nodes[i]) {
                lit.add(i);
                const w = nodes[i].querySelectorAll('.jn-win, .jn-ring');
                gsap.to(w, { opacity: 1, duration: 0.35, ease: 'power2.out' });
                gsap.fromTo(nodes[i], { filter: 'brightness(1)' }, { filter: 'brightness(1.6)', duration: 0.25, yoyo: true, repeat: 1 });
                audio.playStepBeep(360 + i * 70);
              }
            });
          },
        });
        activeFlowTweens.push(tw);
      }
    }
  }

  // ── Scene 1 · Construction — smooth power-on reveal ──
  if (index === 1) {
    const svg = document.getElementById('svg-1');
    if (gsapOk && svg) {
      const core = svg.querySelectorAll('.core-rect');
      const primG = svg.querySelector('.coil-primary-front');
      const primB = svg.querySelector('.coil-primary-back');
      const secG  = svg.querySelector('.coil-secondary-front');
      const secB  = svg.querySelector('.coil-secondary-back');
      const src = svg.querySelector('.ac-source-ring');
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      if (core.length) tl.from(core, { opacity: 0, duration: 0.5 }, 0);
      [primB, primG].forEach(g => g && tl.from(g, { opacity: 0, x: -18, duration: 0.55 }, 0.25));
      [secB, secG].forEach(g => g && tl.from(g, { opacity: 0, x: 18, duration: 0.55 }, 0.45));
      if (src) tl.from(src, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.5 }, 0.6);
      startAmbient(svg);
    }
  }

  // ── Scene 2 · Working Principle — steps advance when narration finishes ──
  if (index === 2) {
    const stepIds = ['step-1', 'step-2', 'step-3', 'step-4'];
    stepIds.forEach(sid => document.getElementById(sid)?.classList.remove('active'));

    const svg = document.getElementById('svg-2');
    const cpFront = svg ? svg.querySelector('.coil-primary-front')   : null;
    const csFront = svg ? svg.querySelector('.coil-secondary-front') : null;
    const cr   = svg ? svg.querySelectorAll('.core-rect')   : [];
    const pp   = svg ? svg.querySelector('.particles-primary')   : null;
    const fp   = svg ? svg.querySelector('.particles-flux')      : null;
    const sp2  = svg ? svg.querySelector('.particles-secondary') : null;
    const src  = svg ? svg.querySelector('.ac-source-ring')  : null;
    const bulb = svg ? svg.querySelector('.bulb-globe')      : null;
    const fila = svg ? svg.querySelector('.bulb-filament')   : null;
    const loop = svg ? svg.querySelector('.flux-loop')       : null;

    // Dim everything to the "off" state first.
    if (gsapOk) {
      if (cpFront) gsap.set(cpFront, { opacity: 0.4 });
      if (csFront) gsap.set(csFront, { opacity: 0.4 });
      if (pp)  gsap.set(pp,  { opacity: 0 });
      if (fp)  gsap.set(fp,  { opacity: 0 });
      if (sp2) gsap.set(sp2, { opacity: 0 });
      if (loop) gsap.set(loop, { opacity: 0.15 });
      if (src) gsap.set(src, { attr: { stroke: '#94a3b8' } });
      if (bulb) gsap.set(bulb, { attr: { stroke: '#94a3b8', fill: 'rgba(15,23,42,0.85)' } });
      if (fila) gsap.set(fila, { opacity: 0.35 });
      cr.forEach(r => gsap.set(r, { attr: { fill: '#8b7355' } }));
    }

    startWaveforms();
    startWorkingFlow(svg, 1);

    const narrating = toggles.narrate && audio.enabled && audio.narrationEnabled;

    // Apply the visual change for step i.
    const applyStep = (i) => {
      audio.playStepBeep([440, 520, 600, 700][i]);
      document.getElementById(stepIds[i])?.classList.add('active');
      if (!gsapOk) return;
      if (i === 0) {
        audio.startHum();
        if (cpFront) gsap.to(cpFront, { opacity: 1, duration: 0.5 });
        if (pp) gsap.to(pp, { opacity: 1, duration: 0.4 });
        if (src) gsap.to(src, { attr: { stroke: '#60a5fa' }, duration: 0.4 });
      } else if (i === 1) {
        if (fp) gsap.to(fp, { opacity: 1, duration: 0.35 });
        cr.forEach(r => gsap.to(r, { attr: { fill: '#b8954a' }, duration: 0.5 }));
        if (loop) gsap.to(loop, { opacity: 0.4, duration: 0.4 });
        startFluxPulse(svg);
      } else if (i === 2) {
        if (csFront) gsap.to(csFront, { opacity: 1, duration: 0.5 });
        if (sp2) gsap.to(sp2, { opacity: 1, duration: 0.4 });
      } else if (i === 3) {
        if (bulb) gsap.to(bulb, { attr: { stroke: '#facc15', fill: 'rgba(250,204,21,0.18)' }, duration: 0.5 });
        if (fila) gsap.to(fila, { opacity: 1, duration: 0.5, onComplete: () => {
          const g1 = gsap.to(fila, { opacity: 0.55, repeat: -1, yoyo: true, duration: 0.6, ease: 'sine.inOut' }); activeFlowTweens.push(g1);
          const g2 = gsap.to(bulb, { attr: { fill: 'rgba(250,204,21,0.3)' }, repeat: -1, yoyo: true, duration: 0.6, ease: 'sine.inOut' }); activeFlowTweens.push(g2);
        }});
      }
    };

    // Sequence driver: advance ONLY when the step's narration finishes.
    // When narration is off, fall back to a comfortable fixed pace.
    const runId = ++workingRunId;
    const fixedGap = 2.8 / speedMultiplier * 1000;
    const runStep = (i) => {
      if (i >= stepIds.length || runId !== workingRunId) return;
      applyStep(i);
      const advance = () => {
        if (runId !== workingRunId) return;
        workingStepTimeout = setTimeout(() => runStep(i + 1), 500 / speedMultiplier);
      };
      const spoke = narrating ? narrateStep(stepIds[i], advance) : false;
      if (!spoke) {
        workingStepTimeout = setTimeout(() => runStep(i + 1), fixedGap);
      }
    };
    runStep(0);
  }

  // ── Scene 3 · Step-Up ──
  if (index === 3) {
    const bar = document.getElementById('bar-vs-up');
    if (bar) setTimeout(() => { bar.style.width = '99%'; }, 300 / speedMultiplier);
    const svg = document.getElementById('svg-3');
    if (gsapOk && svg) {
      const cs = svg.querySelectorAll('.coil-secondary-front path');
      if (cs.length) gsap.from(cs, { opacity: 0, stagger: 0.03, duration: 0.5, delay: 0.3, ease: 'power2.out' });
      startAmbient(svg);
    }
    startWaveforms();
  }

  // ── Scene 4 · Step-Down ──
  if (index === 4) {
    const bar = document.getElementById('bar-vs-down');
    if (bar) setTimeout(() => { bar.style.width = '33%'; }, 300 / speedMultiplier);
    const svg = document.getElementById('svg-4');
    if (gsapOk && svg) {
      const cp = svg.querySelectorAll('.coil-primary-front path');
      if (cp.length) gsap.from(cp, { opacity: 0, stagger: 0.03, duration: 0.5, delay: 0.3, ease: 'power2.out' });
      startAmbient(svg);
    }
    startWaveforms();
  }

  // ── Scene 5 · Formulas ──
  if (index === 5) {
    if (gsapOk) {
      const cards = document.querySelectorAll('#scene-5 .formula-card');
      if (cards.length) gsap.from(cards, { opacity: 0, y: 16, stagger: 0.2, duration: 0.5, ease: 'power2.out' });
    }
    startAmbient(document.getElementById('svg-5'));
  }
}

// ─── Replay ─────────────────────────────────────────────────────────────────

function replayScene(index) {
  clearTransientAnimations();
  audio.stopHum();
  audio.stopNarration();
  audio.playClick();

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

  injectVisuals();
  applyToggles();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animateScene(index);
      narrateScene(index);
    });
  });
}

// ─── Toggle helpers ────────────────────────────────────────────────────────────

function applyToggles() {
  document.querySelectorAll('.svg-label').forEach(el => {
    el.style.display = toggles.labels ? '' : 'none';
  });
  document.querySelectorAll('.flux-arrow, .flux-arrows, .flux-loop, .particles-flux').forEach(el => {
    el.style.display = toggles.flux ? '' : 'none';
  });
  document.querySelectorAll('.formula-card').forEach(el => {
    el.style.display = toggles.equations ? '' : 'none';
  });
  document.querySelectorAll('.scene-subtitle').forEach(el => {
    el.classList.toggle('hidden', !toggles.subtitles);
  });
}

// ─── Scene injection ───────────────────────────────────────────────────────────

function injectVisuals() {
  // Scene 0 — cinematic "journey of electricity" + live AC waveform
  const v0 = document.getElementById('vis-0');
  if (v0) {
    v0.innerHTML = `
      <div class="intro-stage">
        ${buildJourneySVG()}
        <div class="wave-panel">
          <div class="wave-panel-title">⚡ AC waveform leaving the power station</div>
          <canvas id="wave-canvas-0" class="ac-wave-canvas" aria-label="Animated AC waveform"></canvas>
        </div>
      </div>`;
  }

  // Scene 1 — construction (clickable)
  const v1 = document.getElementById('vis-1');
  if (v1) {
    v1.innerHTML = buildSVG({ Np: 6, Ns: 6, showFlux: toggles.flux, showLabels: toggles.labels, clickable: true, id: 'svg-1' });
    v1.querySelectorAll('[data-part]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.getAttribute('data-part');
        const info = PART_INFO[key];
        if (!info) return;
        const box = document.getElementById('tooltip-box');
        if (box) box.innerHTML = `<h4>${info.title}</h4><p>${info.text}</p>`;
        audio.playClick();
      });
    });
  }

  // Scene 2 — working principle (animated)
  const v2 = document.getElementById('vis-2');
  if (v2) {
    v2.innerHTML = `
      <div class="working-visual-wrap">
        <div class="wave-panel compact">
          <div class="wave-panel-title">Live voltage: input vs. output (same shape, same size)</div>
          <canvas id="wave-canvas-2" class="ac-wave-canvas compact" aria-label="Animated induction waveform"></canvas>
        </div>
        ${buildSVG({ Np: 6, Ns: 6, showFlux: toggles.flux, showLabels: toggles.labels, id: 'svg-2' })}
      </div>`;
  }

  // Scene 3 — step-up (Np=4, Ns=9): fewer input loops, more output loops
  const v3 = document.getElementById('vis-3');
  if (v3) {
    v3.innerHTML = `
      <div class="working-visual-wrap">
        <div class="wave-panel compact">
          <div class="wave-panel-title">Output wave is TALLER → higher voltage</div>
          <canvas id="wave-canvas-3" class="ac-wave-canvas compact" aria-label="Step-up waveform"></canvas>
        </div>
        ${buildSVG({ Np: 4, Ns: 9, showFlux: toggles.flux, showLabels: toggles.labels, id: 'svg-3' })}
      </div>`;
  }

  // Scene 4 — step-down (Np=9, Ns=4): more input loops, fewer output loops
  const v4 = document.getElementById('vis-4');
  if (v4) {
    v4.innerHTML = `
      <div class="working-visual-wrap">
        <div class="wave-panel compact">
          <div class="wave-panel-title">Output wave is SHORTER → lower voltage</div>
          <canvas id="wave-canvas-4" class="ac-wave-canvas compact" aria-label="Step-down waveform"></canvas>
        </div>
        ${buildSVG({ Np: 9, Ns: 4, showFlux: toggles.flux, showLabels: toggles.labels, id: 'svg-4' })}
      </div>`;
  }

  // Scene 5 — driven live by the interactive calculator (Np / Ns)
  const v5 = document.getElementById('vis-5');
  if (v5) {
    const { np, ns } = calcTurns();
    v5.innerHTML = buildSVG({ Np: np, Ns: ns, showFlux: toggles.flux, showLabels: toggles.labels, id: 'svg-5' });
  }

  // Real-world illustration boxes
  const su = document.getElementById('illus-stepup');
  if (su) su.innerHTML = illusStepUp();
  const sd = document.getElementById('illus-stepdown');
  if (sd) sd.innerHTML = illusStepDown();
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
      container.querySelectorAll(`.quiz-option[data-q="${qi}"]`)
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      audio.playClick();
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
  const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📖';
  const msg = pct >= 80 ? 'Excellent! You have a strong grasp of transformer theory.'
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

// ─── Calculator ────────────────────────────────────────────────────────────────

// Read the calculator's turn counts, clamped to the drawable range.
function calcTurns() {
  const np = Math.max(1, Math.round(parseFloat(document.getElementById('calc-np')?.value) || 100));
  const ns = Math.max(1, Math.round(parseFloat(document.getElementById('calc-ns')?.value) || 500));
  const draw = (v) => Math.max(3, Math.min(14, Math.round(3 + (Math.log10(v) / 4) * 11)));
  return { np: draw(np), ns: draw(ns) };
}

function updateCalculator() {
  const vp = parseFloat(document.getElementById('calc-vp')?.value) || 0;
  const np = parseFloat(document.getElementById('calc-np')?.value) || 1;
  const ns = parseFloat(document.getElementById('calc-ns')?.value) || 0;
  const ratio = np ? ns / np : 0;
  const vs = vp * ratio;
  const rVs = document.getElementById('r-vs');
  const rRatio = document.getElementById('r-ratio');
  if (rVs) rVs.textContent = Number.isFinite(vs) ? Math.round(vs).toLocaleString() : '—';
  if (rRatio) rRatio.textContent = Number.isFinite(ratio) ? ratio.toFixed(2) : '—';

  // Live-redraw the scene-5 transformer so the diagram matches the entered ratio.
  if (currentScene === 5) {
    const v5 = document.getElementById('vis-5');
    if (v5) {
      const { np: dnp, ns: dns } = calcTurns();
      v5.innerHTML = buildSVG({ Np: dnp, Ns: dns, showFlux: toggles.flux, showLabels: toggles.labels, id: 'svg-5' });
      applyToggles();
      startAmbient(document.getElementById('svg-5'));
    }
  }
}

// ─── Navigation ────────────────────────────────────────────────────────────────

// Called when the user presses "Finish ✓" on the last (quiz) scene.
function finishModule() {
  audio.playClick();
  const quiz = document.getElementById('quiz-container');
  const allAnswered = userAnswers.every(a => a !== null);
  const submit = document.getElementById('quiz-submit-btn');

  if (!quizSubmitted && allAnswered) {
    submitQuiz();
    document.getElementById('quiz-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (!quizSubmitted) {
    // Not all answered — nudge the user toward the quiz.
    quiz?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (submit) { submit.classList.add('nudge'); setTimeout(() => submit.classList.remove('nudge'), 1400); }
  } else {
    // Already submitted — show the score and mark completion on the button.
    document.getElementById('quiz-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const next = document.getElementById('btn-next');
    if (next) { next.textContent = 'Completed ✓'; next.disabled = true; }
  }
}

function goToScene(index) {
  if (index < 0 || index >= TOTAL_SCENES) return;
  audio.stopHum();
  audio.stopNarration();
  const oldEl = document.querySelector('.scene.active');
  if (oldEl && typeof gsap !== 'undefined') {
    gsap.to(oldEl, {
      opacity: 0, y: -14, duration: 0.26, ease: 'power2.in',
      onComplete: () => { oldEl.classList.remove('active'); oldEl.style.opacity = ''; oldEl.style.transform = ''; showScene(index); },
    });
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

  // Header progress
  const counter = document.getElementById('scene-counter');
  if (counter) counter.textContent = `${index + 1} / ${TOTAL_SCENES}`;
  const bar = document.getElementById('progress-bar');
  if (bar) {
    bar.style.width = `${((index + 1) / TOTAL_SCENES) * 100}%`;
    bar.setAttribute('aria-valuenow', String(index + 1));
  }

  // Nav button states
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  if (prev) prev.disabled = index === 0;
  if (next) { next.disabled = false; next.textContent = index === TOTAL_SCENES - 1 ? 'Finish ✓' : 'Next ›'; }

  injectVisuals();
  applyToggles();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animateScene(index);
      narrateScene(index);
    });
  });
}

// ─── Boot ──────────────────────────────────────────────────────────────────────

function bindToggles() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', fn);
  };

  bind('tog-labels', e => { toggles.labels = e.target.checked; applyToggles(); });
  bind('tog-flux',   e => { toggles.flux = e.target.checked; applyToggles(); });
  bind('tog-equations', e => { toggles.equations = e.target.checked; applyToggles(); });
  bind('tog-subtitles', e => { toggles.subtitles = e.target.checked; applyToggles(); });

  bind('tog-audio', e => {
    audio.enabled = e.target.checked;
    if (audio.enabled) { audio._ctx_get(); if (currentScene === 2) audio.startHum(); }
    else { audio.stopHum(); audio.stopNarration(); }
  });

  bind('tog-narrate', e => {
    toggles.narrate = e.target.checked;
    audio.narrationEnabled = e.target.checked;
    // Narration needs sound enabled too — turn on sound implicitly.
    if (e.target.checked && !audio.enabled) {
      audio.enabled = true;
      const sfx = document.getElementById('tog-audio');
      if (sfx) sfx.checked = true;
      audio._ctx_get();
    }
    if (e.target.checked) narrateScene(currentScene);
    else audio.stopNarration();
  });

  const lang = document.getElementById('narration-lang');
  if (lang) lang.addEventListener('change', e => {
    audio.narrationLocale = e.target.value; audio._voice = null;
    if (toggles.narrate) narrateScene(currentScene);
  });

  const pace = document.getElementById('narration-pace');
  if (pace) pace.addEventListener('change', e => { audio.narrationPace = e.target.value; });
}

function bindControls() {
  document.getElementById('btn-prev')?.addEventListener('click', () => { audio.playClick(); goToScene(currentScene - 1); });
  document.getElementById('btn-next')?.addEventListener('click', () => {
    if (currentScene === TOTAL_SCENES - 1) { finishModule(); return; }
    audio.playClick();
    goToScene(currentScene + 1);
  });
  document.getElementById('btn-replay')?.addEventListener('click', () => replayScene(currentScene));

  const speed = document.getElementById('speed-sel');
  if (speed) speed.addEventListener('change', e => {
    speedMultiplier = parseFloat(e.target.value) || 1;
    replayScene(currentScene);
  });

  ['calc-vp', 'calc-np', 'calc-ns'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCalculator);
  });

  document.addEventListener('keydown', e => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'ArrowRight') {
      if (currentScene === TOTAL_SCENES - 1) finishModule();
      else goToScene(currentScene + 1);
    }
    else if (e.key === 'ArrowLeft') { goToScene(currentScene - 1); }
    else if (e.key.toLowerCase() === 'r') { replayScene(currentScene); }
  });
}

function boot() {
  bindToggles();
  bindControls();
  buildQuiz();
  updateCalculator();
  showScene(0);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
