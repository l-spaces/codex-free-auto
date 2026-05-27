const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('manifest 应声明 declarativeNetRequest 权限用于微软 token 接口跨域头处理', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

  assert.equal(
    Array.isArray(manifest.permissions) && manifest.permissions.includes('declarativeNetRequest'),
    true,
    'manifest 缺少 declarativeNetRequest 权限'
  );
});

test('background 应注册删除 Origin 请求头的动态规则', () => {
  const source = fs.readFileSync('background.js', 'utf8');

  assert.match(source, /setupDeclarativeNetRequestRules\(\)/, '应初始化跨域请求头规则');
  assert.match(source, /chrome\.declarativeNetRequest\.updateDynamicRules\(/, '应使用 declarativeNetRequest 动态规则');
  assert.match(source, /header:\s*'Origin'\s*,\s*operation:\s*'remove'/, '应删除 Origin 请求头');
  assert.match(source, /login\.microsoftonline\.com\/\*\/oauth2\/v2\.0\/token/, '规则应只命中微软 token 接口');
  assert.match(source, /resourceTypes:\s*\[\s*'xmlhttprequest'\s*\]/, '规则应限制在 xmlhttprequest');
});
