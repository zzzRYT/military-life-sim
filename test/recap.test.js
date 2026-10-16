// recap.test.js — 전역 기록: 주마등 + 보고서
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, enlist, runGame } from '../src/engine.js';
import { buildRecap, pickReel, rarity } from '../src/recap.js';
import { EVENTS } from '../content/events.js';

const rules = loadRules();
const play = (seed) => {
  const S = newGame(seed, rules, { birth: '2006-05-01' });
  enlist(S, rules, '2025-12-01');
  return runGame(S, rules, { events: EVENTS, auto: true });
};

test('recap: 끝나지 않은 판은 거부', () => {
  const S = newGame('r0', rules, { birth: '2006-05-01' });
  assert.throws(() => buildRecap(S, rules), /not finished/);
});

test('recap: 시드 여러 개 — 보고서 숫자가 판과 맞는다', () => {
  for (const seed of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']) {
    const S = play(seed);
    const R = buildRecap(S, rules);
    const pays = S.log.filter((l) => l.text.startsWith('월급')).reduce((a, l) => a + Number(l.text.match(/\+(\d+)/)[1]), 0);
    assert.equal(R.paid, pays, seed);
    assert.ok(R.days > 0 && R.months === S.hist.length && R.months > 0, seed);
    assert.ok(R.lowest.mood <= R.highest.mood, seed);
    assert.ok(R.reel.length > 0 && R.reel.length <= Math.max(14, R.reel.filter((l) => l.decision).length + 20), seed);
    assert.ok(!R.reel.some((l) => l.text.startsWith('월급')), seed);
    assert.ok(R.rarity > 0 && R.rarity <= 100, seed);
    if (!R.early) assert.equal(R.end, S.dates.discharge, seed);
  }
});

test('recap: pickReel — 이정표는 전부 남고, 순서 유지, 나머지는 max까지', () => {
  const log = [
    { ym: '2025-12', text: '육군훈련소(논산) 입소' },
    ...Array.from({ length: 30 }, (_, i) => ({ ym: '2026-01', text: `사건 ${i}` })),
    { ym: '2026-01', text: '월급 +750000원' },
    { ym: '2026-02', text: '휴가 대신 남았다', decision: true },
    { ym: '2027-05', text: '전역 (2027-05-31)' },
  ];
  const r = pickReel(log, 10);
  assert.equal(r.length, 10);
  assert.equal(r[0].text, '육군훈련소(논산) 입소');
  assert.equal(r.at(-1).text, '전역 (2027-05-31)');
  assert.ok(r.some((l) => l.decision));
  assert.deepEqual(r, log.filter((l) => r.includes(l)));
});

test('recap: rarity — 육군이 해병대보다 흔하고, 100% 미만', () => {
  const at = (branch) => rarity({ status: 'soldier', branch, route: 'conscript', mos: Object.keys(rules.soldierMos[branch])[0] }, rules);
  assert.ok(at('army') > at('marine') && at('army') < 100);
});
