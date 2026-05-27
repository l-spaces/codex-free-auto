const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background imports step 1~10 modules', () => {
  const source = fs.readFileSync('background.js', 'utf8');

  [
    'background/steps/cookie-cleanup.js',
    'background/steps/open-chatgpt.js',
    'background/steps/submit-signup-email.js',
    'background/steps/fill-password.js',
    'background/steps/fetch-signup-code.js',
    'background/steps/fill-profile.js',
    'background/steps/wait-registration-success.js',
    'background/steps/oauth-login.js',
    'background/steps/fetch-login-code.js',
    'background/steps/confirm-oauth.js',
    'background/steps/platform-verify.js',
  ].forEach((path) => {
    assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
