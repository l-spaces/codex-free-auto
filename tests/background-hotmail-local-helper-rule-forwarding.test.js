const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background forwards mail rule metadata to Hotmail helper and shared picker paths', () => {
  const source = fs.readFileSync('background.js', 'utf8');

  assert.match(
    source,
    /requiredKeywords:\s*pollPayload\.requiredKeywords\s*\|\|\s*\[\]/,
    'Hotmail helper 请求体应转发 requiredKeywords'
  );
  assert.match(
    source,
    /codePatterns:\s*pollPayload\.codePatterns\s*\|\|\s*\[\]/,
    'Hotmail helper 请求体应转发 codePatterns'
  );
  assert.match(
    source,
    /pickVerificationMessageWithTimeFallback\(fetchResult\.messages,\s*\{[\s\S]*requiredKeywords:\s*pollPayload\.requiredKeywords\s*\|\|\s*\[\],[\s\S]*codePatterns:\s*pollPayload\.codePatterns\s*\|\|\s*\[\]/,
    'Hotmail API 轮询应把 rule metadata 传给共享验证码筛选器'
  );
  assert.match(
    source,
    /pickVerificationMessageWithTimeFallback\(messages,\s*\{[\s\S]*requiredKeywords:\s*pollPayload\.requiredKeywords\s*\|\|\s*\[\],[\s\S]*codePatterns:\s*pollPayload\.codePatterns\s*\|\|\s*\[\]/,
    'Cloudflare Temp Email 轮询也应复用同一套 rule metadata'
  );
});
