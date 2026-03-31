// ── Tests · Test Compat ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This test file validates behavior and guards against regressions in its
// target subsystem.
//
// WHAT USES THIS:
// Primary dependencies in this module include: node:test,
// node:assert/strict. Keep import and call-site contracts aligned during
// refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const nodeTest = require('node:test');
const assert = require('node:assert/strict');

if (typeof global.describe !== 'function') global.describe = nodeTest.describe;
if (typeof global.it !== 'function') global.it = nodeTest.it;
if (typeof global.test !== 'function') global.test = nodeTest.test;
if (typeof global.before !== 'function') global.before = nodeTest.before;
if (typeof global.after !== 'function') global.after = nodeTest.after;
if (typeof global.beforeEach !== 'function') global.beforeEach = nodeTest.beforeEach;
if (typeof global.afterEach !== 'function') global.afterEach = nodeTest.afterEach;
// makeMatchers()
// WHAT THIS DOES: makeMatchers creates or initializes something needed by the flow.
// WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
// HOW TO USE IT: call makeMatchers(...) before code that depends on this setup.
function makeMatchers(received, invert) {
  const guard = (fn) => (expected) => {
    if (!invert) return fn(expected);
    try {
      fn(expected);
    } catch (_) {
      return;
    }
    throw new assert.AssertionError({ message: 'Expected negated assertion to fail' });
  };

  return {
    toBe: guard((expected) => assert.strictEqual(received, expected)),
    toEqual: guard((expected) => assert.deepStrictEqual(received, expected)),
    toBeDefined: guard(() => assert.notStrictEqual(received, undefined)),
    toBeNull: guard(() => assert.strictEqual(received, null)),
    toBeTruthy: guard(() => assert.ok(received)),
    toBeFalsy: guard(() => assert.ok(!received)),
    toContain: guard((expected) => {
      if (typeof received === 'string') {
        assert.ok(received.includes(expected));
        return;
      }
      if (Array.isArray(received)) {
        assert.ok(received.includes(expected));
        return;
      }
      throw new assert.AssertionError({ message: 'toContain requires string or array' });
    }),
    toBeGreaterThan: guard((expected) => assert.ok(received > expected)),
    toBeGreaterThanOrEqual: guard((expected) => assert.ok(received >= expected)),
    toBeLessThan: guard((expected) => assert.ok(received < expected)),
    toBeLessThanOrEqual: guard((expected) => assert.ok(received <= expected)),
    toThrow: guard(() => {
      assert.strictEqual(typeof received, 'function');
      let threw = false;
      try {
        received();
      } catch (_) {
        threw = true;
      }
      assert.ok(threw);
    })
  };
}

if (typeof global.expect !== 'function') {
  global.expect = function expect(received) {
    const matchers = makeMatchers(received, false);
    matchers.not = makeMatchers(received, true);
    return matchers;
  };
}
