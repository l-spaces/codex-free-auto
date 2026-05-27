const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('content/qq-mail.js', 'utf8');

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

test('qq extractVerificationCode supports runtime mail rule patterns', () => {
  const bundle = [
    extractFunction('normalizeRulePatternList'),
    extractFunction('extractCodeByRulePatterns'),
    extractFunction('extractVerificationCode'),
  ].join('\n');

  const api = new Function(`
${bundle}
return { extractVerificationCode };
`)();

  assert.equal(
    api.extractVerificationCode('Mailbox notice: use pin A-441122 to continue.', {
      codePatterns: [{ source: 'pin\\s+A-(\\d{6})', flags: 'i' }],
    }),
    '441122'
  );
});

test('qq handlePollEmail forwards runtime code patterns to new-mail matching', async () => {
  const bundle = [
    extractFunction('getCurrentMailIds'),
    extractFunction('normalizeRulePatternList'),
    extractFunction('extractCodeByRulePatterns'),
    extractFunction('extractVerificationCode'),
    extractFunction('handlePollEmail'),
  ].join('\n');

  const api = new Function(`
let currentItems = [];
let refreshCount = 0;

function createMailItem(mailId, sender, subject, digest) {
  return {
    getAttribute(name) {
      if (name === 'data-mailid') return mailId;
      return '';
    },
    querySelector(selector) {
      if (selector === '.cmp-account-nick') return { textContent: sender };
      if (selector === '.mail-subject') return { textContent: subject };
      if (selector === '.mail-digest') return { textContent: digest };
      return null;
    },
  };
}

const document = {
  querySelectorAll(selector) {
    if (selector === '.mail-list-page-item[data-mailid]') {
      return currentItems;
    }
    return [];
  },
};

async function waitForElement() {
  return true;
}
async function refreshInbox() {
  refreshCount += 1;
  if (refreshCount >= 1) {
    currentItems = [
      createMailItem('mail-1', 'alerts@example.com', 'Security center', 'Use pin A-551188 to continue'),
    ];
  }
}
async function sleep() {}
function log() {}

${bundle}

return { handlePollEmail };
`)();

  const result = await api.handlePollEmail(4, {
    senderFilters: ['alerts'],
    subjectFilters: ['security'],
    maxAttempts: 2,
    intervalMs: 1,
    codePatterns: [{ source: 'pin\\s+A-(\\d{6})', flags: 'i' }],
  });

  assert.equal(result.code, '551188');
});
