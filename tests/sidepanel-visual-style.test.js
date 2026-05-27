const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(rootDir, 'sidepanel', 'sidepanel.css'), 'utf8');
const html = fs.readFileSync(path.join(rootDir, 'sidepanel', 'sidepanel.html'), 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm'));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

test('sidepanel visual system exposes layout and elevation tokens without font tokens', () => {
  [
    '--space-2',
    '--space-3',
    '--radius-panel',
    '--radius-control',
    '--shadow-panel',
  ].forEach((token) => {
    assert.match(css, new RegExp(`${token}:`), `missing ${token}`);
  });

  assert.doesNotMatch(css, /--font-ui:/);
  assert.doesNotMatch(css, /--font-mono:/);
  assert.doesNotMatch(css, /var\(--font-/);
});

test('sidepanel keeps existing font-family declarations unchanged', () => {
  assert.match(ruleBody('body'), /font-family:\s*'Inter',\s*-apple-system,\s*BlinkMacSystemFont,\s*sans-serif/);
  assert.match(ruleBody('.mono'), /font-family:\s*'JetBrains Mono',\s*'Consolas',\s*monospace/);
  assert.match(ruleBody('.data-input'), /font-family:\s*'JetBrains Mono',\s*monospace/);
  assert.match(ruleBody('#log-area'), /font-family:\s*'JetBrains Mono',\s*'Consolas',\s*monospace/);
});

test('sidepanel header does not render the FlowPilot brand block', () => {
  const headerMatch = html.match(/<header>[\s\S]*?<\/header>/);
  assert.ok(headerMatch, 'missing sidepanel header');
  assert.doesNotMatch(headerMatch[0], /class="header-brand"/);
  assert.doesNotMatch(headerMatch[0], />FlowPilot</);
  assert.doesNotMatch(css, /\.(header-brand|brand-mark|brand-copy|brand-title|brand-subtitle)\b/);
});

test('sidepanel form rows are grid based and inline controls can wrap', () => {
  assert.match(ruleBody('.data-row'), /display:\s*grid/);
  assert.match(ruleBody('.data-row'), /grid-template-columns:[^;]*minmax\(0,\s*1fr\)/);
  assert.match(ruleBody('.data-inline'), /flex-wrap:\s*wrap/);
});

test('sidepanel top toolbar separates run controls from utility actions', () => {
  const headerMatch = html.match(/<header>[\s\S]*?<\/header>/);
  assert.ok(headerMatch, 'missing sidepanel header');
  assert.match(headerMatch[0], /<div class="header-btns">[\s\S]*<div class="run-group">/);
  assert.match(headerMatch[0], /<div class="header-tools">[\s\S]*id="btn-reset"[\s\S]*id="btn-theme"[\s\S]*id="config-menu-shell"/);
  assert.match(ruleBody('.header-btns'), /width:\s*100%/);
  assert.match(ruleBody('.header-tools'), /margin-left:\s*auto/);
});

test('sidepanel cards and feedback bars use layered surfaces and accent rails', () => {
  assert.match(ruleBody('.data-card'), /linear-gradient\(/);
  assert.match(css, /\.data-card::before[\s\S]*border:\s*1px solid/);
  assert.match(ruleBody('.status-bar'), /position:\s*relative/);
  assert.match(css, /\.status-bar::before[\s\S]*background:\s*var\(--text-muted\)/);
  assert.match(css, /\.status-bar\.running::before[\s\S]*background:\s*var\(--orange\)/);
  assert.match(ruleBody('.auto-continue-bar'), /box-shadow:\s*var\(--shadow-panel\)/);
  assert.match(ruleBody('.auto-schedule-bar'), /box-shadow:\s*var\(--shadow-panel\)/);
});

test('sidepanel editable list menus are not clipped by data cards', () => {
  assert.match(html, /id="temp-email-domain-picker" class="editable-list-picker"/);
  assert.match(html, /id="temp-email-domain-menu" class="editable-list-menu"/);
  assert.doesNotMatch(ruleBody('.data-card'), /overflow:\s*hidden/);
  assert.match(ruleBody('.editable-list-menu'), /position:\s*absolute/);
  assert.match(ruleBody('.editable-list-menu'), /z-index:\s*70/);
});

test('sidepanel does not add extra field menu or switch hover surface feedback', () => {
  assert.doesNotMatch(css, /\.data-input:hover/);
  assert.doesNotMatch(css, /\.data-select:hover/);
  assert.doesNotMatch(ruleBody('.header-dropdown'), /backdrop-filter/);
  assert.doesNotMatch(ruleBody('.header-dropdown'), /shadow-popover/);
  assert.doesNotMatch(ruleBody('.toggle-switch-track'), /box-shadow\s*:/);
  assert.doesNotMatch(ruleBody('.toggle-switch input:checked + .toggle-switch-track'), /linear-gradient/);
  assert.doesNotMatch(ruleBody('.toggle-switch input:checked + .toggle-switch-track'), /box-shadow\s*:/);
});

test('sidepanel core controls have keyboard focus and precise transitions', () => {
  assert.match(css, /\.btn:focus-visible[\s\S]*?\.step-btn:focus-visible[\s\S]*?\.data-select:focus-visible/);
  assert.doesNotMatch(ruleBody('.btn'), /transition:\s*all\b/);
  assert.doesNotMatch(ruleBody('.step-btn'), /transition:\s*all\b/);
});

test('sidepanel log area uses adaptive height instead of a fixed 500px panel', () => {
  assert.match(ruleBody('#log-area'), /height:\s*clamp\(/);
  assert.doesNotMatch(ruleBody('#log-area'), /height:\s*500px/);
});

test('sidepanel auto run button uses primary action styling instead of success state styling', () => {
  assert.match(html, /id="btn-auto-run" class="btn btn-primary"/);
  assert.doesNotMatch(html, /id="btn-auto-run" class="btn btn-success"/);
});
