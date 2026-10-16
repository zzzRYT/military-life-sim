// rules.test.js — §8: 공식값 검증 + 가중치 src 강제

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules, getServiceMonths, getMonthlyPay } from '../src/rules.js';

const rules = loadRules();
const assumptionIds = new Set(rules.assumptions.items.map((i) => i.id));

/** 가중치 테이블인가? — 모든 값( _제외 )이 {w: 숫자} 형태의 객체 */
function isWeightTable(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const keys = Object.keys(node).filter((k) => !k.startsWith('_'));
  return keys.length > 0 && keys.every((k) => {
    const v = node[k];
    return v && typeof v === 'object' && !Array.isArray(v) && typeof v.w === 'number';
  });
}

/** weights.json을 재귀 순회하며 모든 가중치 테이블 수집 → [{path, table}] */
function collectTables(node, path = 'weights', out = []) {
  if (isWeightTable(node)) {
    out.push({ path, table: node });
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('_')) continue;
      collectTables(v, `${path}.${k}`, out);
    }
  }
  return out;
}

test('rules: 군종별 병 복무개월 18/20/21/18', () => {
  assert.equal(getServiceMonths(rules, 'soldier', 'army'), 18);
  assert.equal(getServiceMonths(rules, 'soldier', 'navy'), 20);
  assert.equal(getServiceMonths(rules, 'soldier', 'airforce'), 21);
  assert.equal(getServiceMonths(rules, 'soldier', 'marine'), 18);
});

test('rules: 병 진급 2-6-6', () => {
  const months = rules.promotion.soldier.steps.map((s) => s.months);
  assert.deepEqual(months, [2, 6, 6]);
  assert.deepEqual(rules.promotion.soldier.rankNames, ['이병', '일병', '상병', '병장']);
});

test('rules: 병 봉급 (공무원보수규정 별표 13)', () => {
  assert.equal(getMonthlyPay(rules, 'soldier', 0), 750000);
  assert.equal(getMonthlyPay(rules, 'soldier', 1), 900000);
  assert.equal(getMonthlyPay(rules, 'soldier', 2), 1200000);
  assert.equal(getMonthlyPay(rules, 'soldier', 3), 1500000);
});

test('rules: 모든 가중치 테이블의 합 > 0', () => {
  const tables = collectTables(rules.weights);
  assert.ok(tables.length >= 5, `weight tables found: ${tables.length}`);
  for (const { path, table } of tables) {
    const entries = Object.entries(table).filter(([k]) => !k.startsWith('_'));
    const sum = entries.reduce((a, [, v]) => a + v.w, 0);
    assert.ok(sum > 0, `${path}: sum of weights must be > 0 (got ${sum})`);
  }
});

test('rules: 모든 가중치 항목에 src 필수, 가정은 assumptions.json 등록', () => {
  const tables = collectTables(rules.weights);
  for (const { path, table } of tables) {
    const entries = Object.entries(table).filter(([k]) => !k.startsWith('_'));
    for (const [key, entry] of entries) {
      assert.ok(
        typeof entry.src === 'string' && entry.src.length > 0,
        `${path}.${key}: src missing`
      );
      if (entry.src === '가정') {
        assert.ok(
          typeof entry.aid === 'string' && entry.aid.length > 0,
          `${path}.${key}: 가정 항목은 aid 필요`
        );
        assert.ok(
          assumptionIds.has(entry.aid),
          `${path}.${key}: aid ${entry.aid}가 assumptions.json에 없음`
        );
      }
    }
  }
});

test('rules: leave.json의 가정 항목도 assumptions.json에 등록', () => {
  for (const [branch, entry] of Object.entries(rules.leave.soldier.regular)) {
    assert.equal(entry.src, '가정');
    assert.ok(assumptionIds.has(entry.aid), `leave soldier ${branch}: aid ${entry.aid} 미등록`);
  }
});

test('rules: assumptions.json 항목은 전부 src="가정"', () => {
  assert.ok(rules.assumptions.items.length > 0);
  for (const item of rules.assumptions.items) {
    assert.equal(item.src, '가정', `assumption ${item.id}`);
    assert.ok(item.note && item.note.length > 0, `assumption ${item.id}: note 필요`);
    assert.ok(item.usedIn && item.usedIn.length > 0, `assumption ${item.id}: usedIn 필요`);
  }
});
