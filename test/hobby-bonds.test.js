// hobby-bonds.test.js — 취미 선택·월간 효과 + 관계 스탯(bonds)
// (효과값·확률은 전부 '가정' — rules/hobbies.json·content/events-hobby-bonds.js 참조)

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, runGame, chooseHobby, endMonth, stepMonth } from '../src/engine.js';
import { SOLDIER_EVENTS } from '../content/events-soldier.js';
import { HOBBY_BOND_EVENTS } from '../content/events-hobby-bonds.js';

const rules = loadRules();
const gameOpts = { birth: '2006-05-01', enlist: '2026-12-01', status: 'soldier', branch: 'army' };

/** serve 페이즈까지 진행한 게임 (train 2개월 → serve) */
function mkServe(seed) {
  const S = newGame(seed, rules, gameOpts);
  for (let i = 0; i < 3; i++) stepMonth(S, rules);
  return S;
}

test('hobby: chooseHobby — 있는 id는 true, 없는 id는 false', () => {
  const S = newGame('h1', rules, gameOpts);
  assert.equal(chooseHobby(S, rules, 'reading'), true);
  assert.equal(S.hobby, 'reading');
  assert.equal(chooseHobby(S, rules, 'no-such-hobby'), false);
  assert.equal(S.hobby, 'reading'); // 실패해도 기존 선택 유지
});

test('hobby: 월간 효과 — 독서 설정 후 endMonth 1회에 숙련 증가', () => {
  const S = mkServe('h2');
  assert.equal(S.phase, 'serve');
  chooseHobby(S, rules, 'reading'); // effects: skill +2, mind +1
  const before = { ...S.st };
  endMonth(S, rules);
  assert.ok(S.st.skill > before.skill, `skill ${before.skill} → ${S.st.skill}`);
});

test('bonds: newGame 후 bonds 존재 — family 60, lover는 70 또는 null', () => {
  const S = newGame('b1', rules, gameOpts);
  assert.ok(S.bonds);
  assert.equal(S.bonds.family, 60);
  assert.ok(S.bonds.lover === 70 || S.bonds.lover === null, `lover=${S.bonds.lover}`);
});

test('events: SOLDIER 40개·HOBBY_BOND 18개 — id 유일, 모든 c 실행 시 예외 없음', () => {
  assert.equal(SOLDIER_EVENTS.length, 40);
  assert.equal(HOBBY_BOND_EVENTS.length, 18); // 수료식 2개는 events-bootcamp.js로
  for (const pool of [SOLDIER_EVENTS, HOBBY_BOND_EVENTS]) {
    const ids = pool.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, `중복 id: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`);
  }
  const fresh = (id) => newGame('c-' + id, rules, gameOpts);
  for (const e of SOLDIER_EVENTS) {
    if (e.c) e.c(fresh(e.id)); // 예외 발생 시 테스트 실패
  }
  for (const e of HOBBY_BOND_EVENTS) {
    const S = fresh('hb-' + e.id);
    chooseHobby(S, rules, 'reading');
    if (e.c) e.c(S); // c 없는 3개(무조건 후보)는 건너뛴다
  }
});

test('hobby+bonds: 켜진 상태로 runGame 2회 → 동일 로그 (결정론)', () => {
  const evts = [...SOLDIER_EVENTS, ...HOBBY_BOND_EVENTS];
  const mk = () => {
    const S = newGame('hb', rules, gameOpts);
    chooseHobby(S, rules, 'reading');
    return S;
  };
  const a = runGame(mk(), rules, { events: evts });
  const b = runGame(mk(), rules, { events: evts });
  assert.deepEqual(a.log, b.log);
});
