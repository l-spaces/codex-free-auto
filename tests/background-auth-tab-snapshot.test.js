const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background.js', 'utf8');

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

function createApi(chrome) {
  return new Function('chrome', `
${extractFunction('readAuthTabSnapshot')}
return { readAuthTabSnapshot };
`)(chrome);
}

test('readAuthTabSnapshot falls back to tab URL when script execution fails on auth error pages', async () => {
  const chrome = {
    scripting: {
      executeScript: async () => {
        throw new Error('Cannot access contents of url "chrome-error://chromewebdata/".');
      },
    },
    tabs: {
      get: async () => ({
        id: 1,
        url: 'https://auth.openai.com/contact-verification',
        title: 'auth.openai.com',
      }),
    },
  };

  const api = createApi(chrome);

  assert.deepStrictEqual(await api.readAuthTabSnapshot(1), {
    url: 'https://auth.openai.com/contact-verification',
    title: 'auth.openai.com',
    text: '',
  });
});
