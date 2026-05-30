const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('content/utils.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) {
    throw new Error(`missing function ${name}`);
  }

  let parenDepth = 0;
  let signatureEnded = false;
  let braceStart = -1;
  for (let index = start; index < source.length; index += 1) {
    const ch = source[index];
    if (ch === '(') {
      parenDepth += 1;
    } else if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnded = true;
      }
    } else if (ch === '{' && signatureEnded) {
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
    const ch = source[end];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  return source.slice(start, end);
}

test('detectScriptSource maps 126 mail hosts to the shared 163 mail source', () => {
  const bundle = [extractFunction('detectScriptSource')].join('\n');
  const api = new Function(`
${bundle}
return { detectScriptSource };
`)();

  assert.equal(
    api.detectScriptSource({
      url: 'https://mail.126.com/js6/main.jsp',
      hostname: 'mail.126.com',
    }),
    'mail-163'
  );
});

test('detectScriptSource maps 126 mail subdomains to the shared 163 mail source', () => {
  const bundle = [extractFunction('detectScriptSource')].join('\n');
  const api = new Function(`
${bundle}
return { detectScriptSource };
`)();

  assert.equal(
    api.detectScriptSource({
      url: 'https://app.mail.126.com/js6/main.jsp',
      hostname: 'app.mail.126.com',
    }),
    'mail-163'
  );
});

test('detectScriptSource maps OpenAI auth hosts to canonical openai-auth source', () => {
  const bundle = [extractFunction('detectScriptSource')].join('\n');
  const api = new Function(`
${bundle}
return { detectScriptSource };
`)();

  assert.equal(
    api.detectScriptSource({
      url: 'https://auth.openai.com/create-account',
      hostname: 'auth.openai.com',
    }),
    'openai-auth'
  );
});

test('detectScriptSource returns unknown-source for unrecognized pages', () => {
  const bundle = [extractFunction('detectScriptSource')].join('\n');
  const api = new Function(`
${bundle}
return { detectScriptSource };
`)();

  assert.equal(
    api.detectScriptSource({
      url: 'https://example.com/',
      hostname: 'example.com',
    }),
    'unknown-source'
  );
});

test('shouldReportReadyForFrame suppresses noisy known child frame ready logs', () => {
  const bundle = [extractFunction('shouldReportReadyForFrame')].join('\n');
  const api = new Function(`
${bundle}
return { shouldReportReadyForFrame };
`)();

  assert.equal(api.shouldReportReadyForFrame('mail-163', true), false);
  assert.equal(api.shouldReportReadyForFrame('mail-163', false), true);
  assert.equal(api.shouldReportReadyForFrame('openai-auth', true), true);
  assert.equal(api.shouldReportReadyForFrame('unknown-source', false), true);
  assert.equal(api.shouldReportReadyForFrame('unknown-source', true), false);
});

test('simulateClick logs the button text captured before click side effects', () => {
  const bundle = [extractFunction('simulateClick')].join('\n');
  const logs = [];
  const consoleMessages = [];
  const api = new Function('logs', 'console', 'location', `
function throwIfStopped() {}
const LOG_PREFIX = '[test]';
function log(message) { logs.push(message); }
${bundle}
return { simulateClick };
`)(logs, { log: (...args) => consoleMessages.push(args.join(' ')) }, { pathname: '/auth' });

  const button = {
    tagName: 'BUTTON',
    textContent: '订阅',
    getAttribute: () => '',
    click() {
      this.textContent = '正在处理';
    },
  };

  api.simulateClick(button);

  assert.equal(button.textContent, '正在处理');
  assert.equal(logs.at(-1), '已点击(click) [BUTTON] "订阅"');
  assert.match(consoleMessages.at(-1), /BUTTON 订阅/);
  assert.doesNotMatch(logs.at(-1), /正在处理/);
});

test('getRuntimeScriptSource follows injected source overrides after utils is already loaded', () => {
  const bundle = [extractFunction('getRuntimeScriptSource')].join('\n');
  const api = new Function('window', 'SCRIPT_SOURCE', `
${bundle}
return { getRuntimeScriptSource };
`);

  const windowRef = {};
  assert.equal(api(windowRef, 'chatgpt').getRuntimeScriptSource(), 'chatgpt');
  windowRef.__MULTIPAGE_SOURCE = 'openai-auth';
  assert.equal(api(windowRef, 'chatgpt').getRuntimeScriptSource(), 'openai-auth');
});
