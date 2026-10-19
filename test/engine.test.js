// engine.test.js — §8: 고정 시드 판을 자동 결정으로 끝까지

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules, getServiceMonths } from '../src/rules.js';
import * as date from '../src/date.js';
import { newGame, runGame, chooseFeed, fire } from '../src/engine.js';

const rules = loadRules();

// M1에는 content/events.js가 없으므로 픽스처로 chooseFeed/fire를 검증한다
const FIXTURES = [
  {
    id: 'ev_a',
    when: { phase: ['serve'] },
    w: 10,
    run: () => ({ t: '사건 A 발생', fx: { fit: 1 } }),
  },
  {
    id: 'ev_b',
    when: { phase: ['serve'] },
    w: 10,
    gap: 12,
    run: () => ({ t: '사건 B 발생' }),
  },
  {
    id: 'dec_c',
    kind: 'decision',
    when: { phase: ['serve'] },
    w: 5,
    build: () => ({
      title: '결정 C',
      choices: [
        { k: 'yes', label: '예' },
        { k: 'no', label: '아니오' },
      ],
    }),
    apply: (S, k) => ({ t: `선택: ${k}`, fx: { mind: k === 'yes' ? 2 : -2 } }),
  },
];

test('engine: 고정 시드 육군 병사 한 판 완주 — 날짜 일치, 예외 없음', () => {
  const S = newGame(20261014, rules, {
    birth: '2002-04-17',
    enlist: '2021-03-15',
    status: 'soldier',
    branch: 'army',
  });
  // 날짜 엔진과 일치하는지 (게임 생성 시점)
  assert.equal(S.dates.discharge, date.expireDate('2021-03-15', 18));
  assert.deepEqual(
    S.dates.promotions.map((p) => p.date),
    date.soldierPromotions('2021-03-15', 18).map((p) => p.date)
  );
  assert.equal(S.dates.discharge, '2022-09-14');

  runGame(S, rules, { auto: true });

  assert.equal(S.phase, 'end');
  assert.equal(S.rank, 3); // promo 아이템이 실제로 실행되어 병장까지 진급
  assert.ok(S.log.some((e) => e.text.includes('입영')));
  assert.ok(S.log.some((e) => e.text.includes('진급: 병장')));
  assert.ok(S.log.some((e) => e.text.includes('전역 (2022-09-14)')));
});

test('engine: 순수 시드 추첨 판 완주 — 날짜 정합성, 예외 없음', () => {
  const S = newGame(777, rules, { birth: '2003-08-09', enlist: '2023-02-07' });
  const months = getServiceMonths(rules, S.status, S.branch, S.route);
  assert.equal(S.dates.discharge, date.expireDate('2023-02-07', months));
  runGame(S, rules, { auto: true });
  assert.equal(S.phase, 'end');
});

test('engine: 같은 시드 → 같은 판 (결정론)', () => {
  const opts = { birth: '2002-04-17', enlist: '2021-03-15', status: 'soldier', branch: 'army' };
  const a = newGame(555, rules, opts);
  const b = newGame(555, rules, opts);
  runGame(a, rules, { auto: true });
  runGame(b, rules, { auto: true });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('engine: chooseFeed — phase 필터와 gap 제외', () => {
  const S = newGame(99, rules, {
    birth: '2002-01-01',
    enlist: '2021-03-15',
    status: 'soldier',
    branch: 'army',
  });
  S.phase = 'serve';
  S.ym = '2021-06';

  const items = chooseFeed(S, FIXTURES);
  assert.ok(items.length <= 3, '사건 1~2개 + 결정 최대 1개');
  for (const it of items) {
    assert.ok(it.at >= 0 && it.at < 1);
    assert.ok(['event', 'decision'].includes(it.kind));
  }

  // ev_b를 발생시킨 뒤에는 gap(12개월) 미충족으로 절대 뽑히지 않아야 함
  const evb = { at: 0.2, kind: 'event', id: 'ev_b', ref: FIXTURES[1] };
  fire(S, rules, evb, { auto: true });
  for (let i = 0; i < 50; i++) {
    const picks = chooseFeed(S, FIXTURES);
    assert.ok(!picks.some((p) => p.id === 'ev_b'), 'gap 미충족 사건 제외');
  }
});

test('engine: 결정 자동/수동 모드', () => {
  const S = newGame(100, rules, {
    birth: '2002-01-01',
    enlist: '2021-03-15',
    status: 'soldier',
    branch: 'army',
  });
  S.phase = 'serve';
  const dec = { at: 0.3, kind: 'decision', id: 'dec_c', ref: FIXTURES[2] };
  assert.equal(fire(S, rules, dec, { auto: true }), 'fired');
  assert.ok(S.log.some((e) => e.text.includes('선택: yes')));
  const dec2 = { at: 0.3, kind: 'decision', id: 'dec_c', ref: FIXTURES[2] };
  assert.equal(fire(S, rules, dec2, { auto: false }), 'paused');
});

test('engine: 전역 달 적금도 만기 수령에 포함 (잔여 적금 0)', () => {
  const S = newGame('abc', rules, { birth: '2006-05-01', enlist: '2026-12-01', status: 'soldier', branch: 'army', monthlyDeposit: 300000 });
  runGame(S, rules);
  assert.equal(S.money.savings, 0);
});

test('engine: autoEnlist(year) — 정한 해에 입영한다', async () => {
  const { autoEnlist } = await import('../src/engine.js');
  for (const y of [1998, 2008, 2019, 2026]) {
    for (const seed of ['y1', 'y2', 'y3']) {
      const S = newGame(seed, rules, { birth: '2006-05-01' });
      autoEnlist(S, rules, y);
      assert.equal(S.dates.enlist.slice(0, 4), String(y), `${seed} ${y}`);
      assert.equal(Number(S.birth.slice(0, 4)) + S.age - 1, y);
    }
  }
});
