const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

// Run the component's state/effects with a deterministic clock, without a DOM.
function game() {
  const slots = [], effects = [], timers = new Map();
  let cursor = 0, now = 0, timerId = 0, dirty = false, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  const output = ts.transpileModule(fs.readFileSync('src/components/CoincidenciaGame.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'lucide-react') return {};
      throw Error(name);
    },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { at: now + delay, fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    window: { addEventListener() {}, removeEventListener() {} },
  });
  function render() {
    do { dirty = false; cursor = 0; tree = module.exports.default(); effects.splice(0).forEach(fn => fn()); } while (dirty);
  }
  function nodes(node, predicate) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(n => nodes(n, predicate));
    return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
  }
  render();
  return {
    click() { const button = nodes(tree, n => n.type === 'button')[0]; assert.ok(button); assert.ok(!button.props.disabled); button.props.onClick(); render(); },
    advance(ms) {
      if (dirty) render();
      const end = now + ms;
      while (true) {
        const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); render();
      }
      now = end;
    },
    get state() { return { level: slots[0], score: slots[1], index: slots[5], phase: slots[6], status: slots[3], cards: slots[4].length }; },
    get button() { return nodes(tree, n => n.type === 'button')[0]; },
  };
}

test('automatic timeout advances every card, all five levels, and restart resets level', () => {
  const app = game(); app.click();
  for (let level = 1; level <= 5; level++) {
    assert.equal(app.state.level, level);
    assert.equal(app.state.cards, 10 + level * 5);
    app.advance(2650);
    for (let i = 1; i < 10 + level * 5; i++) {
      assert.equal(app.state.phase, 'answer');
      assert.equal(app.state.index, i);
      app.advance(3350);
      if (i < 9 + level * 5) app.advance(150);
    }
    if (level < 5) app.advance(1200);
  }
  assert.equal(app.state.status, 'won');
  app.click();
  assert.equal(app.state.level, 1);
  assert.equal(app.state.score, 0);
  assert.equal(app.state.cards, 15);
});

test('answer locks immediately, scores once, and cancels the old deadline', () => {
  const app = game(); app.click(); app.advance(2650);
  const answer = app.button.props.onClick;
  answer(); answer(); // two events before React commits
  app.advance(0);
  assert.equal(app.state.phase, 'feedback');
  assert.ok(app.state.score === 0 || app.state.score === 100);
  app.advance(500);
  assert.equal(app.state.index, 2);
  assert.equal(app.state.phase, 'answer');
  app.advance(2500); // the first card's old deadline must not answer this card
  assert.equal(app.state.index, 2);
  assert.equal(app.state.phase, 'answer');
  app.advance(500);
  assert.equal(app.state.phase, 'feedback');
});
