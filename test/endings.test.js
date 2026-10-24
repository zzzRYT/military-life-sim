// endings.test.js — 4급 주마등(시작 후 4급 엔딩) · 육군교도소 엔딩
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, enlist, judge, runGame, fire, ENDINGS } from '../src/engine.js';
import { buildRecap } from '../src/recap.js';
import { EVENTS } from '../content/events.js';

const rules = loadRules();
const once = (out) => ({ kind: 'event', id: 't', ref: { run: () => out } });

test('4급(2022년 전): 판정에서 끝나지 않고, 시작한 첫 달에 4급 엔딩으로 주마등이 열린다', () => {
  const S = newGame('g4', rules, { birth: '2006-05-01', grade: 4 });
  assert.equal(judge(S, rules, 2010).serve, true);
  assert.equal(S.phase, 'pre'); // 아직 시작 전 — 판이 살아 있다
  enlist(S, rules, '2025-12-01');
  runGame(S, rules, { events: EVENTS });
  assert.equal(S.ending, 'grade4');
  assert.equal(S.phase, 'end');
  assert.ok(S.log.some((l) => /입소/.test(l.text)), '입소 줄이 있다');
  const R = buildRecap(S, rules);
  assert.equal(R.ending, ENDINGS.grade4);
  assert.ok(R.early && R.movie.length >= 2);
  assert.equal(R.movie.at(-1).text, ENDINGS.grade4);
  assert.ok(S.dates.discharge.slice(0, 7) > S.ym, '만기 전역이 아니다');
});

test('4급(2022년부터)·1~3급은 지금처럼 현역으로 끝까지 간다', () => {
  for (const [grade, year] of [[4, 2024], [2, 2010]]) {
    const S = newGame('gy' + grade, rules, { birth: '2006-05-01', grade });
    assert.equal(judge(S, rules, year).serve, true);
    assert.ok(!S.flags.grade4);
    enlist(S, rules, '2025-12-01');
    runGame(S, rules, { events: EVENTS });
    assert.equal(S.ending, undefined);
  }
});

test('육군교도소: 엔딩이 판을 끝내고 주마등 마지막 장이 된다', () => {
  const S = newGame('pr', rules, { birth: '2006-05-01' });
  enlist(S, rules, '2025-12-01');
  fire(S, rules, once({ t: '체포되었습니다.', ending: 'prison' }));
  assert.equal(S.phase, 'end');
  assert.equal(S.ending, 'prison');
  assert.match(ENDINGS.prison, /육군교도소/);
});

test('육군교도소: 평범한 플레이(탈영 선택·폭행)에서 실제로 닿는다', () => {
  let n = 0;
  for (let i = 0; i < 1500 && n < 3; i++) {
    const S = newGame('pz' + i, rules, { birth: '2006-05-01' });
    enlist(S, rules, '2025-12-01');
    S.st.mind = 5; // 멘탈 바닥 — 탈영 결정이 열린다
    runGame(S, rules, { events: EVENTS, pick: 'random' });
    if (S.ending === 'prison') {
      n++;
      const R = buildRecap(S, rules);
      assert.equal(R.ending, ENDINGS.prison);
      assert.ok(R.movie.at(-1).text === ENDINGS.prison);
    }
  }
  assert.ok(n >= 1, `육군교도소 엔딩 ${n}판`);
});
