const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background/message-router.js', 'utf8');

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

test('message router locks automation window from sidepanel payload', async () => {
  const bundle = [
    extractFunction('normalizeAutomationWindowId'),
    extractFunction('resolveAutomationWindowIdFromMessage'),
    extractFunction('lockAutomationWindowFromMessage'),
  ].join('\n');

  const api = new Function(`
const updates = [];
async function setState(update) {
  updates.push(update);
}
${bundle}
return {
  lockAutomationWindowFromMessage,
  updates,
};
`)();

  const windowId = await api.lockAutomationWindowFromMessage({
    payload: { automationWindowId: 88 },
  });

  assert.equal(windowId, 88);
  assert.deepEqual(api.updates, [{ automationWindowId: 88 }]);
});

test('message router can fall back to sender tab window id', async () => {
  const bundle = [
    extractFunction('normalizeAutomationWindowId'),
    extractFunction('resolveAutomationWindowIdFromMessage'),
  ].join('\n');

  const api = new Function(`
${bundle}
return { resolveAutomationWindowIdFromMessage };
`)();

  assert.equal(
    api.resolveAutomationWindowIdFromMessage({}, { tab: { windowId: 19 } }),
    19
  );
});
