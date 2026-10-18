// training.test.js — 훈련 초점 → 숙련도 → 평가 포상 확률
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, enlist, runGame, setFocus, TRAINING } from '../src/engine.js';
import { EVENTS, rewardChance } from '../content/events.js';
import { buildRecap } from '../src/recap.js';

const rules = loadRules();
const play = (seed, focus) => {
  const S = newGame(seed, rules, { birth: '2006-05-01', status: 'soldier', branch: 'army', focus });
  enlist(S, rules, '2025-12-01');
  return runGame(S, rules, { events: EVENTS, auto: true });
};

test('training: 초점 항목만 크게 오르고, 상한 100을 넘지 않는다', () => {
  const S = play('t1', 'marksman');
  assert.ok(S.train.marksman > 70 && S.train.marksman <= 100, `marksman ${S.train.marksman}`);
  // 초점 밖 항목은 훈련소 일정(제식·각개전투·행군 등)과 분대장 결정만큼만 오른다
  for (const k of Object.keys(TRAINING)) if (k !== 'marksman') assert.ok(S.train[k] <= 25, `${k} ${S.train[k]}`);
});

test('training: 초점 없음 → 전 항목이 고르게, 초점보다 낮게', () => {
  const S = play('t1', null);
  const vs = Object.values(S.train);
  assert.ok(vs.every((v) => v > 0));
  assert.ok(Math.max(...vs) < play('t1', 'marksman').train.marksman);
});

test('training: setFocus — 모르는 키는 거부', () => {
  const S = newGame('t2', rules, { birth: '2006-05-01' });
  setFocus(S, 'fitness');
  assert.equal(S.focus, 'fitness');
  assert.throws(() => setFocus(S, 'nope'));
});

test('training: 포상 확률은 숙련도에 비례', () => {
  assert.equal(rewardChance({ train: { marksman: 0 } }, 'marksman'), 0.05);
  assert.ok(rewardChance({ train: { marksman: 80 } }, 'marksman') > 0.5);
});

test('training: 사격 초점 판들이 사격 포상을 더 자주 받는다 (40판)', () => {
  const count = (focus) => Array.from({ length: 40 }, (_, i) => play('s' + i, focus))
    .reduce((n, S) => n + S.rewards.filter((r) => r.kind === 'marksman').length, 0);
  const focused = count('marksman'), none = count('fitness');
  assert.ok(focused > none * 2, `marksman focus ${focused} vs other ${none}`);
});

test('training: 하나에 집중한 판이 고르게 한 판보다 포상 총합이 많다 (40판)', () => {
  const total = (focus) => Array.from({ length: 40 }, (_, i) => play('s' + i, focus)).reduce((n, S) => n + S.rewards.length, 0);
  assert.ok(total('marksman') > total(null));
});

test('training: 전역 기록에 숙련도·포상이 실린다', () => {
  const S = play('t3', 'fitness');
  const R = buildRecap(S, rules);
  assert.equal(R.focus, 'fitness');
  assert.equal(R.train.fitness, S.train.fitness);
  assert.deepEqual(R.rewards, S.rewards);
});
