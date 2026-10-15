// date.test.js — §4 테스트 기대값 표 (설계 문서 그대로)

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expireDate,
  nextMonthFirst,
  soldierDischarge,
  soldierPromotions,
} from '../src/date.js';

test('date: 육군 입영 2021-03-15 → 전역 2022-09-14, 진급일', () => {
  assert.equal(soldierDischarge('2021-03-15', 18), '2022-09-14');
  const promos = soldierPromotions('2021-03-15', 18).map((p) => p.date);
  assert.deepEqual(promos, ['2021-06-01', '2021-12-01', '2022-06-01']);
});

test('date: 육군 입영 2021-08-31 (18개월) → 전역 2023-02-28 (말일 분기)', () => {
  // (2023, 2) + d=31 > 말일(28) → 1일 빼지 않고 말일 그대로
  assert.equal(expireDate('2021-08-31', 18), '2023-02-28');
});

test('date: 입영 2026-06-09 → 군종별 전역일', () => {
  assert.equal(soldierDischarge('2026-06-09', 18), '2027-12-08'); // 육군·해병대
  assert.equal(soldierDischarge('2026-06-09', 20), '2028-02-08'); // 해군
  assert.equal(soldierDischarge('2026-06-09', 21), '2028-03-08'); // 공군
});

test('date: 만료일 민법 160조 기본 케이스', () => {
  // d <= 말일 → 해당일 − 1일
  assert.equal(expireDate('2021-03-15', 2), '2021-05-14');
  // 다음달 1일
  assert.equal(nextMonthFirst('2021-05-14'), '2021-06-01');
  assert.equal(nextMonthFirst('2021-12-31'), '2022-01-01');
});

test('date: 전역일을 넘는 진급은 생성하지 않음', () => {
  // 복무 3개월이면 일병(2개월→다음달1일)도 전역일과 겹칠 수 있음
  const promos = soldierPromotions('2021-03-15', 3);
  const discharge = soldierDischarge('2021-03-15', 3);
  for (const p of promos) assert.ok(p.date < discharge, `${p.date} < ${discharge}`);
});
