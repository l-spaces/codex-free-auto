const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
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

test('sidepanel wires export-accounts button to click handler', () => {
  assert.match(html, /<button[^>]*id="btn-export-accounts"[^>]*>1\.导出账号<\/button>/);
  assert.match(sidepanelSource, /const btnExportAccounts = document\.getElementById\('btn-export-accounts'\);/);
  assert.match(sidepanelSource, /btnExportAccounts\?\.addEventListener\('click'/);
  assert.match(sidepanelSource, /handleExportAccountsButtonClick\(\)/);
});

test('collectExportableAccountEmails exports unique valid emails from account run history', () => {
  const bundle = [
    extractFunction('isBasicEmailFormat'),
    extractFunction('normalizeAccountRecordIdentifierType'),
    extractFunction('extractAccountRecordEmail'),
    extractFunction('collectExportableAccountEmails'),
  ].join('\n');

  const api = new Function(`
${bundle}
return { collectExportableAccountEmails };
`)();

  const exportedEmails = api.collectExportableAccountEmails({
    accountRunHistory: [
      { email: 'A@example.com' },
      { accountIdentifierType: 'email', accountIdentifier: ' B@example.com ' },
      { accountIdentifierType: 'phone', accountIdentifier: '+8613800000000' },
      { email: 'a@example.com' },
      { email: 'not-an-email' },
      { accountIdentifierType: 'email', accountIdentifier: 'bad-value' },
    ],
  });

  assert.deepStrictEqual(exportedEmails, [
    'a@example.com',
    'b@example.com',
  ]);
});

test('handleExportAccountsButtonClick downloads JSON array and warns when history is empty', async () => {
  const bundle = [
    extractFunction('isBasicEmailFormat'),
    extractFunction('normalizeAccountRecordIdentifierType'),
    extractFunction('extractAccountRecordEmail'),
    extractFunction('collectExportableAccountEmails'),
    extractFunction('buildAccountsExportFileName'),
    extractFunction('handleExportAccountsButtonClick'),
  ].join('\n');

  const api = new Function(`
let latestState = {
  accountRunHistory: [
    { email: 'first@example.com' },
    { accountIdentifierType: 'email', accountIdentifier: 'second@example.com' },
  ],
};
const downloadEvents = [];
const toastEvents = [];
function downloadTextFile(content, fileName, mimeType) {
  downloadEvents.push({ content, fileName, mimeType });
}
function showToast(message, level, duration) {
  toastEvents.push({ message, level, duration });
}
${bundle}
return {
  handleExportAccountsButtonClick,
  getDownloadEvents: () => downloadEvents,
  getToastEvents: () => toastEvents,
  setLatestState: (nextState) => { latestState = nextState; },
};
`)();

  await api.handleExportAccountsButtonClick();
  const firstDownload = api.getDownloadEvents()[0];
  assert.ok(firstDownload, 'expected export download event');
  assert.match(firstDownload.fileName, /^accounts-\d{8}-\d{6}\.json$/);
  assert.equal(firstDownload.mimeType, 'application/json;charset=utf-8');
  assert.deepStrictEqual(JSON.parse(firstDownload.content), [
    'first@example.com',
    'second@example.com',
  ]);

  api.setLatestState({ accountRunHistory: [{ accountIdentifierType: 'phone', accountIdentifier: '+8613800000000' }] });
  await api.handleExportAccountsButtonClick();
  const toastEvents = api.getToastEvents();
  assert.ok(toastEvents.some((item) => item.level === 'warn' && /暂无可导出的邮箱/.test(item.message)));
});
