const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background imports OpenAI workflow step modules', () => {
  const source = fs.readFileSync('background.js', 'utf8');

  [
    'flows/openai/background/steps/open-chatgpt.js',
    'flows/openai/background/steps/submit-signup-email.js',
    'flows/openai/background/steps/fill-password.js',
    'flows/openai/background/steps/fetch-signup-code.js',
    'flows/openai/background/steps/fill-profile.js',
    'flows/openai/background/steps/wait-registration-success.js',
    'flows/openai/background/steps/oauth-login.js',
    'flows/openai/background/steps/fetch-login-code.js',
    'flows/openai/background/steps/confirm-oauth.js',
    'flows/openai/background/steps/platform-verify.js',
  ].forEach((path) => {
    assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
