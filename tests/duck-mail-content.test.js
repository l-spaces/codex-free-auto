const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('content/duck-mail.js', 'utf8');

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
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
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

function createInput(initialValue = '') {
  return {
    value: initialValue,
    textContent: '',
    innerText: '',
    getAttribute(name) {
      if (name === 'value') {
        return this.value;
      }
      return '';
    },
  };
}

function createButton(onClick) {
  return {
    clickCount: 0,
    textContent: 'Generate Private Duck Address',
    getAttribute() {
      return '';
    },
    click() {
      this.clickCount += 1;
      if (typeof onClick === 'function') {
        onClick();
      }
    },
  };
}

function createDocument(input, button) {
  return {
    querySelector(selector) {
      if (selector === 'input.AutofillSettingsPanel__PrivateDuckAddressValue') {
        return input;
      }
      if (selector === 'button.AutofillSettingsPanel__GeneratorButton') {
        return button;
      }
      return null;
    },
    querySelectorAll(selector) {
      switch (selector) {
        case 'input.AutofillSettingsPanel__PrivateDuckAddressValue':
        case 'input[class*="PrivateDuckAddressValue"]':
          return input ? [input] : [];
        case 'input[data-testid*="PrivateDuckAddressValue"]':
          return [];
        case 'input[value*="@duck.com" i]':
          return input?.value?.includes('@duck.com') ? [input] : [];
        case 'button.AutofillSettingsPanel__GeneratorButton':
          return button ? [button] : [];
        default:
          return [];
      }
    },
  };
}

function createApi({ document, sleep, log = () => {} }) {
  const bundle = [extractFunction('fetchDuckEmail')].join('\n');
  return new Function('window', 'document', 'waitForElement', 'humanPause', 'sleep', 'log', `
${bundle}
return { fetchDuckEmail };
`)(
    {
      CodexOperationDelay: {
        async performOperationWithDelay(_meta, fn) {
          return fn();
        },
      },
    },
    document,
    async () => true,
    async () => {},
    sleep,
    log
  );
}

test('fetchDuckEmail waits for the existing page address to hydrate before accepting a new Duck email', async () => {
  const input = createInput('');
  const button = createButton(() => {});
  let sleepCount = 0;

  const api = createApi({
    document: createDocument(input, button),
    sleep: async () => {
      sleepCount += 1;
      if (sleepCount === 1) {
        input.value = 'existing@duck.com';
      } else if (sleepCount === 2) {
        input.value = 'fresh@duck.com';
      }
    },
  });

  const result = await api.fetchDuckEmail({ generateNew: true });

  assert.deepEqual(result, {
    email: 'fresh@duck.com',
    generated: true,
  });
  assert.equal(button.clickCount, 1);
});

test('fetchDuckEmail falls back to the previous Duck email when the page baseline never becomes visible', async () => {
  const input = createInput('');
  const button = createButton(() => {
    input.value = 'previous@duck.com';
  });
  let sleepCount = 0;

  const api = createApi({
    document: createDocument(input, button),
    sleep: async () => {
      sleepCount += 1;
      if (sleepCount === 13) {
        input.value = 'fresh@duck.com';
      }
    },
  });

  const result = await api.fetchDuckEmail({
    generateNew: true,
    baselineEmail: 'previous@duck.com',
  });

  assert.deepEqual(result, {
    email: 'fresh@duck.com',
    generated: true,
  });
  assert.equal(button.clickCount, 1);
});
