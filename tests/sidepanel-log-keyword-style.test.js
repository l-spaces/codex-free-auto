const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');

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

test('resolveLogKeywordClass identifies start and done messages with step prefix', () => {
  const bundle = extractFunction('resolveLogKeywordClass');
  const api = new Function(`
${bundle}
return { resolveLogKeywordClass };
`)();

  assert.equal(api.resolveLogKeywordClass('开始执行'), 'log-keyword-start');
  assert.equal(api.resolveLogKeywordClass('【步骤9】开始执行'), 'log-keyword-start');
  assert.equal(api.resolveLogKeywordClass('已完成'), 'log-keyword-done');
  assert.equal(api.resolveLogKeywordClass('【步骤2】已完成'), 'log-keyword-done');
  assert.equal(api.resolveLogKeywordClass('已完成，但完成后的收尾处理失败'), '');
});

test('createLogLine appends keyword class for start and done messages', () => {
  const bundle = [
    extractFunction('getLogMessageDisplayText'),
    extractFunction('resolveLogKeywordClass'),
    extractFunction('escapeHtml'),
    extractFunction('createLogLine'),
  ].join('\n');

  const api = new Function(`
const DISPLAY_TIMEZONE = 'Asia/Shanghai';
const LOG_LEVEL_LABELS = { info: '信息', ok: '成功', warn: '警告', error: '错误' };
const logLineById = new Map();
const document = {
  createElement() {
    return {
      className: '',
      dataset: {},
      innerHTML: '',
    };
  },
};
${bundle}
return { createLogLine };
`)();

  const startLine = api.createLogLine({
    id: '1',
    timestamp: Date.now(),
    level: 'info',
    message: '【步骤1】开始执行',
  });
  const doneLine = api.createLogLine({
    id: '2',
    timestamp: Date.now(),
    level: 'ok',
    message: '【步骤1】已完成',
  });

  assert.match(startLine.className, /\blog-keyword-start\b/);
  assert.match(doneLine.className, /\blog-keyword-done\b/);
});

