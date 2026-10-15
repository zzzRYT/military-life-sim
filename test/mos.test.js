// mos.test.js — 주특기 메커니즘: rules/soldier-mos.json + drawAll·enlist 연계 + 부상 판정 스모크
// (확률·수치는 전부 '가정' — rules/soldier-mos.json src 참조)

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.js';
import { loadRules } from '../src/rules.js';
import { drawAll } from '../src/draw.js';
import { newGame, enlist, endMonth } from '../src/engine.js';

const rules = loadRules();
const branches = ['army', 'navy', 'airforce', 'marine'];
const reqFields = ['name', 'code', 'branchKr', 'duties', 'leave', 'difficulty', 'injuryRisk', 'injuryTypes', 'src'];

test('mos: loadRules에 soldierMos·hobbies 키 존재', () => {
  assert.ok(rules.soldierMos);
  assert.ok(rules.hobbies);
});

test('mos: soldier-mos.json — 4개 군종·90개·엔트리 필드 규격', () => {
  const keys = Object.keys(rules.soldierMos).filter((k) => !k.startsWith('_'));
  assert.deepEqual([...keys].sort(), [...branches].sort());
  const entries = keys.flatMap((b) => Object.entries(rules.soldierMos[b]).map(([id, e]) => [b, id, e]));
  assert.equal(entries.length, 90);
  for (const [b, id, e] of entries) {
    for (const f of reqFields) assert.ok(f in e, `${b}/${id}: missing field ${f}`);
    assert.ok([1, 2, 3].includes(e.leave), `${b}/${id}: leave ${e.leave}`);
    assert.ok([1, 2, 3].includes(e.injuryRisk), `${b}/${id}: injuryRisk ${e.injuryRisk}`);
    assert.ok(e.difficulty >= 1 && e.difficulty <= 5, `${b}/${id}: difficulty ${e.difficulty}`);
    assert.ok(Array.isArray(e.injuryTypes), `${b}/${id}: injuryTypes (배열이어야 함)`); // 빈 배열은 엔진 기본값으로 대체
  }
});

test('mos: drawAll 병사는 군종 키 안에서 추첨', () => {
  const d = drawAll(makeRng('m1'), rules.weights, { status: 'soldier', branch: 'army' }, { soldierMos: rules.soldierMos });
  assert.ok(d.mos in rules.soldierMos.army, d.mos);
});

test('mos: 같은 시드 drawAll 2회 → 같은 mos (결정론)', () => {
  const mk = () => drawAll(makeRng('mos-det'), rules.weights,
    { status: 'soldier', branch: 'navy' }, { soldierMos: rules.soldierMos });
  assert.deepEqual(mk(), mk());
});

test('mos: 비병사(nco)는 기존 weights.mos 테이블에서 나옴 (하위 호환)', () => {
  const d = drawAll(makeRng('n1'), rules.weights, { status: 'nco', branch: 'army' }, { soldierMos: rules.soldierMos });
  assert.ok(d.mos in rules.weights.mos.army, d.mos);
});

test('mos: enlist 후 S.mosMech 부착 (newGame→enlist 플로우)', () => {
  const S = newGame('e1', rules, { birth: '2006-05-01', status: 'soldier', branch: 'airforce' });
  assert.equal(S.mosMech, null);
  enlist(S, rules, '2026-12-01');
  assert.deepEqual(S.mosMech, rules.soldierMos[S.branch][S.mos]);
  for (const f of ['leave', 'difficulty', 'injuryRisk']) assert.ok(f in S.mosMech, f);
  // 비병사는 null (주특기 메카닉 없음)
  const N = newGame('e2', rules, { birth: '2006-05-01', status: 'nco', branch: 'army' });
  enlist(N, rules, '2026-12-01');
  assert.equal(N.mosMech, null);
});

test('mos: 부상 판정 스모크 — injuryRisk 3으로 500개월 중 1회 이상 부상', () => {
  // 월 확률 p = injuryRisk × 0.4% = 1.2%. 500회 중 0회는 p ≈ e^-6 ≈ 0.25% — 0회면 실패로 간주한다.
  const S = newGame('mos-injury', rules, { birth: '2006-05-01', enlist: '2026-12-01', status: 'soldier', branch: 'army' });
  S.mosMech = { ...S.mosMech, injuryRisk: 3 };
  for (let i = 0; i < 500; i++) {
    S.phase = 'serve';
    S.ym = '2027-03';
    delete S.flags.injured; // 독립 시행 — 3개월 회복 쿨다운을 우회한다
    endMonth(S, rules);
  }
  const n = S.log.filter((l) => l.text.includes('훈련 중 부상')).length;
  assert.ok(n > 0, `500개월 중 부상 0회 (p=0.012, 기대 ≈6)`);
});
