const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');
const css = fs.readFileSync('sidepanel/sidepanel.css', 'utf8');

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

test('sidepanel log realtime queue tracks repeat updates separately', () => {
  assert.match(source, /let queuedRealtimeLogRepeats = new Map\(\);/);
  assert.match(source, /function queueRealtimeLogRepeat\(/);
  assert.match(source, /queuedRealtimeLogRepeats\.set\(logId,\s*entry\);/);
  assert.match(source, /queuedRealtimeLogRepeats\.clear\(\);/);
  assert.match(
    source,
    /case 'LOG_ENTRY_REPEAT':[\s\S]*queueRealtimeLogRepeat\(message\.payload\);/
  );
});

test('sidepanel appendLogsBatch enforces log cap and near-bottom auto scroll', () => {
  const appendLogsBatchSource = extractFunction('appendLogsBatch');
  assert.match(source, /const LOG_DOM_LIMIT = 500;/);
  assert.match(source, /function isLogAreaNearBottom\(/);
  assert.match(source, /function trimLogAreaOverflow\(/);
  assert.match(appendLogsBatchSource, /trimLogAreaOverflow\(LOG_DOM_LIMIT\);/);
  assert.match(
    appendLogsBatchSource,
    /const shouldAutoScroll = scrollToBottom && \(forceScrollToBottom \|\| isLogAreaNearBottom\(LOG_AUTO_SCROLL_THRESHOLD_PX\)\);/
  );
});

test('sidepanel log css disables line animation for realtime mode', () => {
  assert.match(css, /#log-area\.log-realtime \.log-line\s*\{\s*animation:\s*none\s*!important;\s*\}/);
});
