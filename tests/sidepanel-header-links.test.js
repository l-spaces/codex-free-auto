const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sidepanelSource = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');

function expectMissing(source, parts) {
  assert.equal(source.includes(parts.join('')), false);
}

test('sidepanel header does not expose FlowPilot GitHub repo or releases entry points', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');

  expectMissing(html, ['id="btn', '-repo', '-home"']);
  expectMissing(html, ['打开 GitHub ', '仓库']);
  expectMissing(html, ['id="btn', '-release', '-log"']);
  expectMissing(html, ['打开 GitHub ', 'Releases 页面']);
  expectMissing(html, ['header', '-version', '-link']);

  assert.doesNotMatch(html, />FlowPilot0\.0</);
  assert.doesNotMatch(html, /id="extension-update-status"/);
  assert.match(html, /id="btn-auto-run"/);
  assert.match(html, /id="btn-stop"/);
  assert.match(html, /id="btn-reset"/);
  assert.match(html, /id="btn-theme"/);
  assert.match(html, /id="btn-config-menu"/);
});

test('sidepanel no longer loads or calls the GitHub releases update service', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');

  expectMissing(html, ['<script src="update', '-service.js"></script>']);
  expectMissing(html, ['id="update', '-section"']);
  expectMissing(html, ['id="btn', '-open', '-release"']);
  expectMissing(html, ['id="btn', '-ignore', '-release"']);
  expectMissing(sidepanelSource, ['Sidepanel', 'Update', 'Service']);
  expectMissing(sidepanelSource, ['sidepanel', 'Update', 'Service']);
  expectMissing(sidepanelSource, ['current', 'Release', 'Snapshot']);
  expectMissing(sidepanelSource, ['initialize', 'Release', 'Info']);
  assert.doesNotMatch(sidepanelSource, /\bextensionUpdateStatus\b/);
  assert.doesNotMatch(sidepanelSource, /\binitializeLocalVersionInfo\b/);
  assert.doesNotMatch(sidepanelSource, /\bgetLocalVersionLabel\b/);
});
