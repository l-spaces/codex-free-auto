const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
const source = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');

test('sidepanel shows GPTMail remaining API usage next to the API key field', () => {
  assert.match(html, /id="gptmail-api-usage"/);
  assert.match(source, /const gptmailApiUsage = document\.getElementById\('gptmail-api-usage'\);/);
  assert.match(source, /function formatGptmailUsageText/);
  assert.match(source, /剩余：\$\{remainingTotal\}/);
  assert.match(source, /message\.payload\.gptmailUsage !== undefined/);
});
