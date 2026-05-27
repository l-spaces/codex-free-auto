const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');

function extractFunction(name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  const start = markers
    .map((marker) => source.indexOf(marker))
    .find((index) => index >= 0);
  assert.notEqual(start, -1, `missing ${name}`);

  let parenDepth = 0;
  let signatureEnded = false;
  let braceStart = -1;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(') parenDepth += 1;
    if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) signatureEnded = true;
    }
    if (ch === '{' && signatureEnded) {
      braceStart = i;
      break;
    }
  }

  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`unterminated ${name}`);
}

test('focused settings editor still autosaves without repainting the focused field', async () => {
  const bundle = [
    extractFunction('isEditableElementInSettingsCard'),
    extractFunction('scheduleSettingsAutoSave'),
    extractFunction('saveSettings'),
  ].join('\n');

  const api = new Function(`
class MockElement {
  constructor(tagName, type = '') {
    this.tagName = tagName;
    this.type = type;
    this.isContentEditable = false;
  }
}
const Element = MockElement;
const focusedInput = new MockElement('input', 'text');
const settingsCard = { contains: (element) => element === focusedInput };
const document = { activeElement: focusedInput };
let settingsAutoSaveTimer = null;
let scheduled = null;
let clearedTimer = null;
let settingsDirty = true;
let settingsSaveInFlight = false;
let settingsSaveRevision = 1;
const messages = [];
const syncedStates = [];
const dirtyMarks = [];
let applyCalls = 0;
function setTimeout(fn, delay) {
  scheduled = { fn, delay };
  return 71;
}
function clearTimeout(value) {
  clearedTimer = value;
}
function collectSettingsPayload() {
  return { vpsUrl: 'typed-value' };
}
function syncLatestState(state) {
  syncedStates.push(state);
}
function markSettingsDirty(value = true) {
  settingsDirty = value;
  if (value) settingsSaveRevision += 1;
  dirtyMarks.push(value);
}
function applySettingsState() {
  applyCalls += 1;
}
function updateSaveButtonState() {}
function updatePanelModeUI() {}
function updateMailProviderUI() {}
function updateButtonStates() {}
const chrome = {
  runtime: {
    async sendMessage(message) {
      messages.push(message);
      return { state: { vpsUrl: message.payload.vpsUrl } };
    },
  },
};
${bundle}
return {
  scheduleSettingsAutoSave,
  async fireScheduled() {
    await scheduled.fn();
  },
  getSnapshot() {
    return {
      applyCalls,
      clearedTimer,
      dirtyMarks,
      messages,
      scheduledDelay: scheduled?.delay,
      syncedStates,
    };
  },
};
`)();

  api.scheduleSettingsAutoSave();
  let snapshot = api.getSnapshot();
  assert.equal(snapshot.scheduledDelay, 1200);
  assert.equal(snapshot.messages.length, 0);

  await api.fireScheduled();
  snapshot = api.getSnapshot();

  assert.equal(snapshot.clearedTimer, 71);
  assert.equal(snapshot.applyCalls, 0);
  assert.deepEqual(snapshot.messages, [
    {
      type: 'SAVE_SETTING',
      source: 'sidepanel',
      payload: { vpsUrl: 'typed-value' },
    },
  ]);
  assert.deepEqual(snapshot.syncedStates, [{ vpsUrl: 'typed-value' }]);
  assert.deepEqual(snapshot.dirtyMarks, [false]);
});
