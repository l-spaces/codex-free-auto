const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('sidepanel loads luckmail manager before sidepanel bootstrap', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
  const luckmailManagerIndex = html.indexOf('<script src="luckmail-manager.js"></script>');
  const sidepanelIndex = html.indexOf('<script src="sidepanel.js"></script>');

  assert.notEqual(luckmailManagerIndex, -1);
  assert.notEqual(sidepanelIndex, -1);
  assert.ok(luckmailManagerIndex < sidepanelIndex);
});

test('luckmail manager exposes a factory and renders empty state', () => {
  const source = fs.readFileSync('sidepanel/luckmail-manager.js', 'utf8');
  const windowObject = {};

  const api = new Function('window', `${source}; return window.SidepanelLuckmailManager;`)(windowObject);

  assert.equal(typeof api?.createLuckmailManager, 'function');

  const manager = api.createLuckmailManager({
    dom: {
      btnLuckmailBulkDisable: { disabled: false },
      btnLuckmailBulkEnable: { disabled: false },
      btnLuckmailBulkPreserve: { disabled: false },
      btnLuckmailBulkUnpreserve: { disabled: false },
      btnLuckmailBulkUnused: { disabled: false },
      btnLuckmailBulkUsed: { disabled: false },
      btnLuckmailDisableUsed: { disabled: false, textContent: '' },
      btnLuckmailRefresh: { disabled: false },
      checkboxLuckmailSelectAll: { checked: false, indeterminate: false, disabled: false },
      inputEmail: { value: '' },
      inputLuckmailSearch: { value: '', disabled: false },
      luckmailList: { innerHTML: '' },
      luckmailSection: { style: { display: '' } },
      luckmailSelectionSummary: { textContent: '' },
      luckmailSummary: { textContent: '' },
      selectLuckmailFilter: { value: 'all', disabled: false },
    },
    helpers: {
      copyTextToClipboard: async () => {},
      escapeHtml: (value) => String(value || ''),
      formatLuckmailDateTime: (value) => String(value || ''),
      getLuckmailPreserveTagName: () => '保留',
      normalizeLuckmailProjectName: (value) => String(value || '').trim().toLowerCase(),
      openConfirmModal: async () => true,
      showToast() {},
    },
    runtime: {
      sendMessage: async () => ({ purchases: [] }),
    },
    constants: {
      copyIcon: '',
    },
  });

  assert.equal(typeof manager.renderLuckmailPurchases, 'function');
  assert.equal(typeof manager.refreshLuckmailPurchases, 'function');
  assert.equal(typeof manager.queueLuckmailPurchaseRefresh, 'function');
  assert.equal(typeof manager.reset, 'function');

  manager.renderLuckmailPurchases([]);
  manager.reset();
});
