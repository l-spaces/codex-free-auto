const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('content/signup-page.js', 'utf8');

function extractFunction(name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  const start = markers
    .map((marker) => source.indexOf(marker))
    .find((index) => index >= 0);
  if (start < 0) {
    throw new Error(`missing function ${name}`);
  }

  let parenDepth = 0;
  let signatureEnded = false;
  let braceStart = -1;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      parenDepth += 1;
    } else if (char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnded = true;
      }
    } else if (char === '{' && signatureEnded) {
      braceStart = index;
      break;
    }
  }
  if (braceStart < 0) {
    throw new Error(`missing body for function ${name}`);
  }

  let depth = 0;
  let end = braceStart;
  for (; end < source.length; end += 1) {
    const char = source[end];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  return source.slice(start, end);
}

test('password submit treats direct OAuth consent as a login-code skip', async () => {
  const api = new Function(`
const location = { href: 'https://auth.openai.com/authorize' };

function inspectLoginAuthState() {
  return {
    state: 'oauth_consent_page',
    url: location.href,
  };
}

function throwIfStopped() {}
async function sleep() {
  throw new Error('should not wait once oauth consent is detected');
}

${extractFunction('createStep6SuccessResult')}
${extractFunction('createStep6OAuthConsentSuccessResult')}
${extractFunction('createStep6RecoverableResult')}
${extractFunction('normalizeStep6Snapshot')}
${extractFunction('getStep6OptionMessage')}
${extractFunction('resolveStep6PostSubmitSnapshot')}
${extractFunction('waitForStep6PostSubmitTransition')}
${extractFunction('waitForStep6PasswordSubmitTransition')}

return {
  run() {
    return waitForStep6PasswordSubmitTransition(123, 1000);
  },
};
`)();

  const transition = await api.run();

  assert.equal(transition.action, 'done');
  assert.equal(transition.result.state, 'oauth_consent_page');
  assert.equal(transition.result.skipLoginVerificationStep, true);
  assert.equal(transition.result.directOAuthConsentPage, true);
  assert.equal(transition.result.loginVerificationRequestedAt, null);
});

test('step 7 entry succeeds when the auth page is already on OAuth consent', async () => {
  const logs = [];
  const api = new Function(`
const location = { href: 'https://auth.openai.com/authorize' };
const logs = arguments[0];

function inspectLoginAuthState() {
  return {
    state: 'oauth_consent_page',
    url: location.href,
  };
}

function throwIfStopped() {}
async function sleep() {}
function log(message, level = 'info') {
  logs.push({ message, level });
}

${extractFunction('createStep6SuccessResult')}
${extractFunction('createStep6OAuthConsentSuccessResult')}
${extractFunction('normalizeStep6Snapshot')}
${extractFunction('waitForKnownLoginAuthState')}
${extractFunction('step6_login')}

return {
  run() {
    return step6_login({ email: 'user@example.com' });
  },
};
`)(logs);

  const result = await api.run();

  assert.equal(result.step6Outcome, 'success');
  assert.equal(result.state, 'oauth_consent_page');
  assert.equal(result.skipLoginVerificationStep, true);
  assert.equal(result.directOAuthConsentPage, true);
  assert.equal(logs.some(({ level }) => level === 'ok'), true);
});
