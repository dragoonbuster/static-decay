'use strict';
/* Headless test runner for Signal Decay.
   Usage: node test/run.js
   Stubs the DOM, extracts the game script from index.html, and executes it
   together with test/tests.js in one scope so the tests can reach the
   game's top-level bindings directly. */
const fs = require('fs');
const path = require('path');

/* ---- DOM stubs (global mutations, run before the game script) ---- */
function mkCtx() {
  return new Proxy({}, {
    get(t, p) { if (p in t) return t[p]; return () => (p === 'measureText' ? { width: 0 } : undefined); },
    set(t, p, v) { t[p] = v; return true; },
  });
}
function mkEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    textContent: '', innerHTML: '', value: '', disabled: false, title: '', className: '', id: '',
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [],
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; }, removeChild() {}, focus() {}, select() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
  };
  if (tag === 'canvas') { el.width = 300; el.height = 150; el.getContext = () => mkCtx(); }
  return el;
}
const els = {};
globalThis.document = {
  getElementById(id) {
    if (!els[id]) { els[id] = mkEl(id === 'cv' || id === 'aarCv' ? 'canvas' : 'div'); els[id].id = id; }
    return els[id];
  },
  createElement(tag) { return mkEl(tag); },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {},
  body: mkEl('body'),
  documentElement: { style: { setProperty() {} } },
};
globalThis.window = globalThis;
globalThis.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
globalThis.requestAnimationFrame = () => 0;
globalThis.setInterval = () => 0;
globalThis.setTimeout = () => 0;
globalThis.fetch = () => Promise.reject(new Error('offline'));

/* ---- assemble game + tests in one scope ---- */
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = /<script>([\s\S]*)<\/script>/.exec(html);
if (!m) { console.error('could not extract game script from index.html'); process.exit(2); }
const game = m[1].replace(/^\s*'use strict';/, '');
const tests = fs.readFileSync(path.join(__dirname, 'tests.js'), 'utf8');
new Function('process', "'use strict';\n" + game + '\n' + tests)(process);
