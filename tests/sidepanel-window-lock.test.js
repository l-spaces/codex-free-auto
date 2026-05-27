const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');

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
    const ch = source[index];
    if (ch === '(') parenDepth += 1;
    if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) signatureEnded = true;
    }
    if (ch === '{' && signatureEnded) {
      braceStart = index;
      break;
    }
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

function createApi() {
  const bundle = [
    extractFunction('normalizeAutomationWindowId'),
    extractFunction('getCurrentSidepanelWindowId'),
    extractFunction('shouldAttachAutomationWindow'),
    extractFunction('sendSidepanelMessage'),
  ].join('\n');

  return new Function(`
let latestState = {};
const events = [];
const chrome = {
  windows: {
    async getCurrent() {
      events.push({ type: 'get-current-window' });
      return { id: 321 };
    },
  },
  runtime: {
    async sendMessage(message) {
      events.push({ type: 'send', message });
      return { ok: true };
    },
  },
};
const console = { warn() {} };
function syncLatestState(patch) {
  latestState = { ...latestState, ...patch };
  events.push({ type: 'sync', patch });
}
${bundle}
return {
  sendSidepanelMessage,
  shouldAttachAutomationWindow,
  getEvents() {
    return events;
  },
  getLatestState() {
    return latestState;
  },
};
`)();
}

test('sidepanel attaches the current window id when starting automation actions', async () => {
  const api = createApi();

  await api.sendSidepanelMessage({
    type: 'AUTO_RUN',
    source: 'sidepanel',
    payload: { totalRuns: 1 },
  });

  const sent = api.getEvents().find((entry) => entry.type === 'send').message;
  assert.equal(sent.payload.automationWindowId, 321);
  assert.equal(api.getLatestState().automationWindowId, 321);
});

test('sidepanel leaves non-automation messages unchanged', async () => {
  const api = createApi();

  await api.sendSidepanelMessage({
    type: 'SAVE_SETTING',
    source: 'sidepanel',
    payload: { emailPrefix: 'demo' },
  });

  const events = api.getEvents();
  assert.equal(events.some((entry) => entry.type === 'get-current-window'), false);
  assert.deepEqual(events.find((entry) => entry.type === 'send').message.payload, { emailPrefix: 'demo' });
});
