import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';

const rules = loadRules();

test('sources: loadRules에 sources 키 존재', () => {
  assert.ok(rules.sources, 'sources missing');
});

test('sources: 카테고리 구조', () => {
  const s = rules.sources;
  for (const k of ['official', 'press', 'community']) {
    assert.ok(Array.isArray(s[k]), k + ' is not array');
    assert.ok(s[k].length > 0, k + ' empty');
  }
  assert.ok(typeof s.assumption === 'string' && s.assumption.length > 10, 'assumption note missing');
});

test('sources: 항목 필드', () => {
  const s = rules.sources;
  for (const k of ['official', 'press', 'community']) {
    for (const it of s[k]) {
      assert.ok(it.claim && it.claim.length > 3, 'claim missing: ' + JSON.stringify(it));
      assert.ok(it.publisher && it.publisher.length > 1, 'publisher missing: ' + it.claim);
      if (it.url) assert.match(it.url, /^https?:\/\//, 'bad url: ' + it.claim);
    }
  }
});

test('sources: 내부 노션 URL 없음', () => {
  const dump = JSON.stringify(rules.sources);
  assert.ok(!dump.includes('notion.so') && !dump.includes('notion.com'), 'internal notion link leaked');
});
