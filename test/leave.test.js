// leave.test.js — 휴가 행동: 휴가 일수·돈·원동력, 취객 시비 확률, 징계위원회, 익명의 계산
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame, fire, endMonth } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { ACTS, brawlChance } from '../content/events-leave.js';
import { sceneOf } from '../src/scene.js';

const rules = loadRules();
const byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
const act = (k) => ACTS.find((a) => a.k === k);
function serving(seed = 'lv') {
  const S = newGame(seed, rules, { birth: '2006-05-01', branch: 'army' });
  autoEnlist(S, rules);
  S.phase = 'serve'; S.money.cash = 1e6; S.leave.left = 20;
  return S;
}
const go = (S, k) => fire(S, rules, { kind: 'decision', id: 'leave_go', ref: byId.leave_go }, { choice: k });

test('휴가: 시비는 번화가·술자리에서만, 조건이 겹칠수록 오른다', () => {
  const calm = { env: { self: { temper: false } } }, hot = { env: { self: { temper: true } } };
  for (const k of ['home', 'pcroom', 'karaoke', 'date', 'travel']) assert.equal(brawlChance(hot, act(k)), 0, k);
  assert.ok(brawlChance(calm, act('pub')) < brawlChance(calm, act('downtown')));
  assert.ok(Math.abs(brawlChance(hot, act('downtown')) - 0.018) < 1e-9); // 최대치 — "진짜 희소"
});

test('휴가: 일수·돈을 쓰고, 복귀 후 원동력으로 멘탈이 오른다', () => {
  const S = serving();
  const cash = S.money.cash;
  go(S, 'travel');
  assert.ok(S.leave.used >= 4 && S.leave.used <= 6 && S.leave.left === 20 - S.leave.used);
  assert.equal(S.money.cash, cash - act('travel').cost);
  assert.ok(S.flags.boostUntil > S.ym);
  assert.equal(sceneOf(S).key, S.marks.leave.scene); // 고른 행동(또는 드물게 시비) 그림
  S.st.mind = 50; endMonth(S, rules);
  assert.ok(S.st.mind > 50, `mind ${S.st.mind}`);
});

test('휴가: 돈이 없거나 연인이 없으면 그 선택지는 안 나온다', () => {
  const S = serving(); S.money.cash = 0; S.bonds.lover = null;
  assert.deepEqual(byId.leave_go.build(S).choices.map((c) => c.k), ['home']);
});

test('시비 → 신고되면 다음 달 징계위원회, 익명의 계산은 한 판에 한 번', () => {
  const S = serving('brawl');
  S.env.self.temper = true;
  let n = 0;
  while (!S.marks.brawl && n++ < 5000) { S.leave.left = 20; S.money.cash = 1e6; go(S, 'downtown'); }
  assert.ok(S.marks.brawl, '시비가 한 번은 나야 한다');
  assert.equal(sceneOf(S).key, 'brawl');
  for (let i = 0; i < 200; i++) {
    const G = newGame(`treat-${i}`, rules, { birth: '2006-05-01' });
    autoEnlist(G, rules); runGame(G, rules, { events: EVENTS });
    assert.ok((G.flags.n_treat_anon ?? 0) <= 1);
    assert.ok(!G.flags.n_committee_brawl || G.marks.brawl, '징계위원회는 시비 뒤에만');
  }
});
