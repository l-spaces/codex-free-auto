const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sidepanelSource = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');

function extractFunction(name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  const start = markers
    .map((marker) => sidepanelSource.indexOf(marker))
    .find((index) => index >= 0);
  if (start < 0) {
    throw new Error(`missing function ${name}`);
  }

  let parenDepth = 0;
  let signatureEnded = false;
  let braceStart = -1;
  for (let i = start; i < sidepanelSource.length; i += 1) {
    const ch = sidepanelSource[i];
    if (ch === '(') {
      parenDepth += 1;
    } else if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnded = true;
      }
    } else if (ch === '{' && signatureEnded) {
      braceStart = i;
      break;
    }
  }

  if (braceStart < 0) {
    throw new Error(`missing body for function ${name}`);
  }

  let depth = 0;
  let end = braceStart;
  for (; end < sidepanelSource.length; end += 1) {
    const ch = sidepanelSource[end];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  return sidepanelSource.slice(start, end);
}

function createClassList() {
  const classNames = new Set();
  return {
    add(...values) {
      values.forEach((value) => classNames.add(String(value)));
    },
    remove(...values) {
      values.forEach((value) => classNames.delete(String(value)));
    },
    contains(value) {
      return classNames.has(String(value));
    },
  };
}

function loadCurrentRegistrationEmailApi(displayNode) {
  const bundle = [
    extractFunction('resolveCurrentRegistrationEmailDisplay'),
    extractFunction('renderCurrentRegistrationEmail'),
  ].join('\n');

  return new Function('currentRegistrationEmail', `
${bundle}
return {
  resolveCurrentRegistrationEmailDisplay,
  renderCurrentRegistrationEmail,
};
`)(displayNode);
}

test('sidepanel html shows current registration email between log title and records action', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
  const logSectionIndex = html.indexOf('<section id="log-section">');
  const logTitleIndex = html.indexOf('<span class="section-label">日志</span>', logSectionIndex);
  const currentEmailIndex = html.indexOf('id="current-registration-email"', logSectionIndex);
  const recordsButtonIndex = html.indexOf('id="btn-open-account-records"', logSectionIndex);

  assert.notEqual(logSectionIndex, -1);
  assert.notEqual(logTitleIndex, -1);
  assert.notEqual(currentEmailIndex, -1);
  assert.notEqual(recordsButtonIndex, -1);
  assert.ok(logTitleIndex < currentEmailIndex);
  assert.ok(currentEmailIndex < recordsButtonIndex);
  assert.match(html, /title="当前邮箱：未生成">当前邮箱：未生成<\/span>/);
  assert.doesNotMatch(html, /当前注册邮箱：未生成/);
});

test('current registration email display prefers active registration email state', () => {
  const displayNode = {
    textContent: '',
    title: '',
    classList: createClassList(),
  };
  const api = loadCurrentRegistrationEmailApi(displayNode);

  api.renderCurrentRegistrationEmail({
    email: 'fallback@example.com',
    registrationEmailState: {
      current: 'current@example.com',
      previous: 'old@example.com',
    },
  });

  assert.equal(api.resolveCurrentRegistrationEmailDisplay({
    email: 'fallback@example.com',
    registrationEmailState: {
      current: 'current@example.com',
      previous: 'old@example.com',
    },
  }), 'current@example.com');
  assert.equal(displayNode.textContent, '当前邮箱：current@example.com');
  assert.equal(displayNode.title, '当前邮箱：current@example.com');
  assert.equal(displayNode.classList.contains('has-value'), true);
});

test('current registration email display never falls back to previous registration email', () => {
  const displayNode = {
    textContent: '',
    title: '',
    classList: createClassList(),
  };
  const api = loadCurrentRegistrationEmailApi(displayNode);

  api.renderCurrentRegistrationEmail({
    email: '',
    registrationEmailState: {
      current: '',
      previous: 'stale@example.com',
    },
  });

  assert.equal(api.resolveCurrentRegistrationEmailDisplay({
    email: '',
    registrationEmailState: {
      current: '',
      previous: 'stale@example.com',
    },
  }), '');
  assert.equal(displayNode.textContent, '当前邮箱：未生成');
  assert.equal(displayNode.title, '当前邮箱：未生成');
  assert.equal(displayNode.classList.contains('has-value'), false);
});
