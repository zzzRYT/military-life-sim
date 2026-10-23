// timeline.test.js — 나의 복무 한 줄 (src/timeline.js, docs/fun-brainstorm.md E1): 계급 띠 · 지금 · 핀 · 되부르기 호 · 앞으로 올 일
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, stepMonth } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { timeline } from '../src/timeline.js';

const rules = loadRules();
const start = (seed, year) => {
  const S = newGame(seed, rules, { birth: '2006-05-01', status: 'soldier' });
  autoEnlist(S, rules, year);
  return S;
};
const finish = (S) => { while (S.phase !== 'end') stepMonth(S, rules, EVENTS, { pick: 'random' }); return S; };

test('timeline: 계급 띠는 0에서 1까지 빈틈없이 이어지고, 입영 계급부터 오른다', () => {
  for (const [seed, year] of [['tl-a', 1997], ['tl-b', 2011], ['tl-c', 2025]]) {
    const T = timeline(start(seed, year), rules);
    assert.equal(T.ranks[0].x0, 0);
    assert.equal(T.ranks.at(-1).x1, 1);
    for (let i = 1; i < T.ranks.length; i++) {
      assert.equal(T.ranks[i].x0, T.ranks[i - 1].x1, seed);
      assert.ok(T.ranks[i].rank > T.ranks[i - 1].rank && T.ranks[i].x0 > T.ranks[i - 1].x0, seed);
    }
    assert.equal(T.ranks.at(-1).label, '병장', seed);
  }
});

test('timeline: 지금은 달마다 앞으로 가고, 앞으로 올 일은 지금보다 뒤 · 가까운 순 · 마지막은 전역', () => {
  const S = start('tl-d', 2018);
  let prev = -1;
  let m = 0;
  for (; m < 10; m++) {
    stepMonth(S, rules, EVENTS); // 무난한 기본값 — 조기 종료가 드물다
    if (S.phase === 'end') break;
    const T = timeline(S, rules);
    assert.ok(T.now > prev, `${S.ym} now ${T.now}`);
    prev = T.now;
    assert.ok(T.ahead.every((a) => a.x >= T.now), S.ym);
    assert.deepEqual(T.ahead.map((a) => a.x), T.ahead.map((a) => a.x).slice().sort((a, b) => a - b), S.ym);
    assert.equal(T.ahead.at(-1).kind, 'end');
    assert.ok(T.next.length >= 1 && T.next.every((t) => /까지 \d+(일|개월)$/.test(t)), `${S.ym} ${T.next}`);
    assert.equal(T.moods.length, S.hist.length);
  }
  assert.ok(m >= 6, `달 ${m}`);
});

test('timeline: 끝난 판 — 만기면 지금이 1, 결정마다 갈림길 핀, 되부르기마다 앞→뒤 호', () => {
  let early = 0;
  for (let i = 0; i < 24; i++) {
    const S = finish(start(`tl-e${i}`, 1995 + i));
    const T = timeline(S, rules);
    if (S.ending) { early++; assert.ok(T.now <= 1 && T.now > 0, `${i} 조기 종료 ${T.now}`); } else assert.equal(T.now, 1);
    assert.equal(T.ahead.length, 0);
    const decisions = S.log.filter((l) => l.decision && l.ym >= T.from).length;
    assert.equal(T.pins.filter((p) => p.kind === 'fork').length, decisions, `${i}`);
    assert.equal(T.links.length, S.log.filter((l) => l.echo && l.ym >= T.from).length, `${i}`);
    for (const l of T.links) assert.ok(l.x0 <= l.x1 && l.ym0 <= l.ym1, `${i} ${l.ym0}→${l.ym1}`);
    for (const p of T.pins) assert.ok(p.x >= 0 && p.x <= 1, `${i}`);
  }
  assert.ok(early < 24);
});
