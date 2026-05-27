const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
const source = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');

test('account write control is a label followed by a toggle switch', () => {
  assert.doesNotMatch(html, /<button[^>]*id="btn-write-accounts"/);
  assert.match(html, /<span[^>]*id="label-write-accounts"[^>]*>3\.写入账号<\/span>/);
  assert.match(html, /<label[^>]*class="[^"]*\btoggle-switch\b[^"]*\baccount-write-toggle\b[^"]*"[^>]*for="input-write-accounts-enabled"/);
  assert.match(html, /<input type="checkbox" id="input-write-accounts-enabled"/);
});

test('account write toggle enables directory selection and disables writing when closed', () => {
  assert.match(source, /const inputWriteAccountsEnabled = document\.getElementById\('input-write-accounts-enabled'\);/);
  assert.match(source, /async function handleWriteAccountsToggleChange\(\)/);
  assert.match(source, /if \(inputWriteAccountsEnabled\.checked\) \{/);
  assert.match(source, /await enableAccountWriteFromDirectoryPicker\(\);/);
  assert.match(source, /await disableAccountWriteState\(\{\s*persistState: true,\s*\}\);/);
  assert.match(source, /inputWriteAccountsEnabled\?\.addEventListener\('change'/);
  assert.doesNotMatch(source, /btnWriteAccounts\?\.addEventListener\('click'/);
});
