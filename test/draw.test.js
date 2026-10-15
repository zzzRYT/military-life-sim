// draw.test.js — §8: 고정 시드 10만 회 추첨 → 군종 비율 검증

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.js';
import { loadRules } from '../src/rules.js';
import { drawBranch, drawAll, drawEnv, personLabel } from '../src/draw.js';

const rules = loadRules();

test('draw: 고정 시드 10만 회 군종 추첨 비율 (77.8/10.1/6.4/5.7 ±0.5%p)', () => {
  const rng = makeRng(20261014);
  const counts = { army: 0, navy: 0, marine: 0, airforce: 0 };
  const N = 100000;
  for (let i = 0; i < N; i++) {
    counts[drawBranch(rng, rules.weights, 'soldier')]++;
  }
  const expect = { army: 77.8, airforce: 10.1, marine: 6.4, navy: 5.7 };
  for (const [k, e] of Object.entries(expect)) {
    const pct = (counts[k] / N) * 100;
    assert.ok(
      Math.abs(pct - e) <= 0.5,
      `${k}: ${pct.toFixed(3)}% vs 기대 ${e}% (±0.5%p 초과)`
    );
  }
});

test('draw: drawAll이 유효한 키를 반환', () => {
  const rng = makeRng(42);
  const d = drawAll(rng, rules.weights);
  assert.ok(Number.isInteger(d.grade) && d.grade >= 1 && d.grade <= 7);
  assert.ok(['soldier', 'nco', 'officer', 'warrant'].includes(d.status));
  assert.ok(['army', 'navy', 'airforce', 'marine'].includes(d.branch));
  assert.ok(typeof d.route === 'string' && d.route.length > 0);
  assert.ok(typeof d.mos === 'string' && d.mos.length > 0);
});

test('draw: 같은 시드 → 같은 추첨 결과 (결정론)', () => {
  const a = drawAll(makeRng('seed-1'), rules.weights);
  const b = drawAll(makeRng('seed-1'), rules.weights);
  assert.deepEqual(a, b);
});

test('drawEnv: 같은 시드 → 같은 환경, 훈련은 복무 기간 안, 인물 라벨 조합', () => {
  const opts = { branch: 'army', mos: 'infantry', enlistYm: '2026-12', months: 18 };
  const a = drawEnv(makeRng('env'), rules.env, opts);
  assert.deepEqual(a, drawEnv(makeRng('env'), rules.env, opts));
  assert.ok(rules.env.post.army[a.post]);
  assert.equal(a.people.length, rules.env.people.roles.length);
  for (const d of a.drills) assert.ok(d.ym >= '2026-12' && d.ym <= '2028-06', d.ym);
  assert.equal(personLabel(rules.env, 'low', 'awkward'), '폐급');
  assert.equal(personLabel(rules.env, 'high', 'scary'), '일은 잘하는데 무서운');
  assert.equal(personLabel(rules.env, 'high', 'kind'), '일도 잘하고 다정한');
});
