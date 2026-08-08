/* Minimal GSAP fallback for offline/static environments */
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

  const applyVars = (target, vars = {}, baseDelaySec = 0) => {
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
    if (typeof vars.onComplete === 'function') {
      const delaySec = Math.max(0, Number(vars.delay) || 0);
      const durationSec = Math.max(0, Number(vars.duration) || 0);
      const delayMs = (Math.max(0, baseDelaySec) + delaySec + durationSec) * 1000;
      setTimeout(vars.onComplete, delayMs);
    }
  };

  const tween = { kill() {}, pause() {}, play() {}, restart() {} };
  const resolvePos = (tl, position) => {
    if (typeof position === 'number' && Number.isFinite(position)) return Math.max(0, position);
    if (typeof position === 'string' && tl._labels[position] !== undefined) return tl._labels[position];
    return tl._time;
  };
  const advance = (tl, vars = {}, position) => {
    const at = resolvePos(tl, position);
    const delay = Math.max(0, Number(vars.delay) || 0);
    const duration = Math.max(0, Number(vars.duration) || 0);
    tl._time = Math.max(tl._time, at + delay + duration);
    return at;
  };
  const timelineProto = {
    to(target, vars = {}, position) { applyVars(target, vars, advance(this, vars, position)); return this; },
    fromTo(target, _fromVars, toVars = {}, position) { applyVars(target, toVars, advance(this, toVars, position)); return this; },
    from(target, vars = {}, position) { applyVars(target, vars, advance(this, vars, position)); return this; },
    set(target, vars = {}, position) { applyVars(target, vars, resolvePos(this, position)); return this; },
    call(fn, params = [], position) {
      const at = resolvePos(this, position);
      const args = Array.isArray(params) ? params : [params];
      if (typeof fn === 'function') setTimeout(() => fn(...args), at * 1000);
      this._time = Math.max(this._time, at);
      return this;
    },
    addLabel(name, position) {
      if (name) this._labels[name] = resolvePos(this, position);
      return this;
    },
    kill() { this._time = 0; this._labels = Object.create(null); },
  };
  const createTimeline = () => Object.assign(Object.create(timelineProto), {
    _time: 0,
    _labels: Object.create(null),
  });

  window.gsap = {
    to(target, vars) { applyVars(target, vars); return tween; },
    fromTo(target, _fromVars, toVars) { applyVars(target, toVars); return tween; },
    from(target, vars) { applyVars(target, vars); return tween; },
    set(target, vars) { applyVars(target, vars); return tween; },
    timeline() { return createTimeline(); },
  };
}
