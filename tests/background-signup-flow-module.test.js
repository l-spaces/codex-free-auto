const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background imports signup flow helper module', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /importScripts\([\s\S]*'background\/signup-flow-helpers\.js'/);
});

test('signup flow helper module exposes a factory', () => {
  const source = fs.readFileSync('background/signup-flow-helpers.js', 'utf8');
  const globalScope = {};

  const api = new Function('self', `${source}; return self.MultiPageSignupFlowHelpers;`)(globalScope);

  assert.equal(typeof api?.createSignupFlowHelpers, 'function');
});
