'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { validateFrontend } = require('../scripts/validate-frontend');

test('the generated frontend bundle is structurally valid and hardened', () => {
  const result = validateFrontend();
  assert.ok(result.bundleBytes > 100_000);
  assert.ok(result.templateBytes > 50_000);
  assert.ok(result.resources > 5);
});
