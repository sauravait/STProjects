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
