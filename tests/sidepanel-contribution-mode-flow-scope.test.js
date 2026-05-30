const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { readFlowRegistryBundle } = require('./helpers/script-bundles.js');

const source = fs.readFileSync('sidepanel/contribution-mode.js', 'utf8');
const flowRegistrySource = readFlowRegistryBundle();
const contributionRegistrySource = fs.readFileSync('shared/contribution-registry.js', 'utf8');

function createElement() {
  return {
    hidden: false,
    disabled: false,
    title: '',
    textContent: '',
    value: '',
    classList: {
      hiddenState: false,
      toggle(_className, hidden) {
        this.hiddenState = Boolean(hidden);
      },
    },
    setAttribute() {},
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  };
}
