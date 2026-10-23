// fork.test.js — 갈림길 (src/fork.js, docs/fun-brainstorm.md A1): 결정 순간의 판을 떠서 다른 선택지로 끝까지 돌린다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, beginMonth, tick, endMonth, fire } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { snapshot, forkLife, lifeOf, diffLives, forkReport } from '../src/fork.js';
import { shiftMonth } from '../src/date.js';

const rules = loadRules();

/** 화면처럼 결정마다 멈추고(스냅샷 → build → fire), 선택은 pick(i, choices)로 고른다 */
function playManual(seed, year, pick = (i, cs) => cs[i % cs.length].k) {
  const S = newGame(seed, rules, { birth: '2006-05-01', status: 'soldier' });
  autoEnlist(S, rules, year);
  const forks = [];
  while (S.phase !== 'end') {
    beginMonth(S, rules, EVENTS);
    let r = tick(S, rules, 1, { auto: false });
    while (r === 'paused') {
      const item = S.queue[0], snap = snapshot(S), d = item.ref.build(S);
      const choices = d.choices.map(({ k, label }) => ({ k, label }));
      const k = pick(forks.length, choices);
      forks.push({ snap, id: item.id, title: d.title, choices, k });
      fire(S, rules, S.queue.shift(), { choice: k });
      r = tick(S, rules, 0, { auto: false });
    }
    endMonth(S, rules);
  }
  return { S, forks };
}

test('fork: 스냅샷은 결정에서 멈춘 판이고, 평행 인생은 결정론이며 스냅샷을 건드리지 않는다', () => {
  const { forks } = playManual('fk-a', 2019);
  assert.ok(forks.length >= 5, `결정 ${forks.length}개`);
  const f = forks[2], before = JSON.stringify(f.snap);
  assert.equal(f.snap.queue[0].kind, 'decision');
  assert.equal(f.snap.queue[0].ref, undefined, '함수가 든 ref는 떠 두지 않는다');
  const a = forkLife(f.snap, rules, EVENTS, f.choices.at(-1).k), b = forkLife(f.snap, rules, EVENTS, f.choices.at(-1).k);
  assert.equal(a.S.phase, 'end');
  assert.deepEqual(a.S.log, b.S.log);
  assert.equal(JSON.stringify(f.snap), before);
});

test('fork: 같은 세상 — 선택지만 바꾸면 다음 달 사건은 대부분 그대로다 (재설정 없으면 57%)', () => {
  let same = 0, n = 0;
  for (let i = 0; i < 6; i++) {
    const { forks } = playManual(`sw${i}`, 2000 + i * 4);
    for (const f of forks.filter((x) => x.choices.length >= 2)) {
      const nx = shiftMonth(f.snap.ym, 1);
      const ids = f.choices.slice(0, 2).map((c) => forkLife(f.snap, rules, EVENTS, c.k).S.log.filter((l) => l.ym === nx && l.id).map((l) => l.id).join());
      n++; if (ids[0] === ids[1]) same++;
    }
  }
  assert.ok(same / n >= 0.75, `다음 달이 같은 갈림길 ${same}/${n}`);
  assert.throws(() => forkLife({ ...playManual('sw0', 2000).forks[0].snap, queue: [] }, rules, EVENTS, 'x'), /paused on a decision/);
});

test('fork: diffLives — 전역 방식이 바뀌면 맨 앞, 같은 인생이면 점수 0', () => {
  const { S } = playManual('fk-c', 2016);
  const me = lifeOf(S, rules);
  assert.deepEqual(diffLives(me, me), { score: 0, lines: [] });
  const other = { ...me, ending: '군사재판 — 복무가 중단되었습니다.', early: true, days: me.days - 200, discipline: me.discipline + 1 };
  const d = diffLives(me, other);
  assert.match(d.lines[0], /→ 군사재판/);
  assert.ok(d.score >= 100 && d.lines.length <= 3);
});

test('fork: 전역 화면 카드 — 시간순 최대 3장, 안 고른 길만, 실제 판은 그대로', () => {
  for (const [seed, year] of [['fk-d', 1999], ['fk-e', 2012], ['fk-f', 2024]]) {
    const { S, forks } = playManual(seed, year);
    const log = JSON.stringify(S.log);
    const cards = forkReport(rules, EVENTS, forks);
    assert.ok(cards.length >= 1 && cards.length <= 3, `${seed} 카드 ${cards.length}`);
    assert.deepEqual(cards.map((c) => c.ym), cards.map((c) => c.ym).slice().sort(), seed);
    for (const c of cards) {
      assert.notEqual(c.alt, c.picked, seed);
      assert.ok(c.score > 0 && c.lines.length >= 1, `${seed} ${c.id}`);
      assert.ok(c.life.line && c.life.rank, seed);
    }
    assert.deepEqual(forkReport(rules, EVENTS, forks), cards, `${seed} 결정론`);
    assert.equal(JSON.stringify(S.log), log, `${seed} 실제 판을 건드리지 않는다`);
  }
});

test('fork: 평행 인생은 판마다 갈린다 — 30판 중 전역 방식·계급·징계가 바뀌는 갈림길이 있는 판이 절반 이상', () => {
  let big = 0;
  for (let i = 0; i < 30; i++) {
    const { forks } = playManual(`fk-v${i}`, 1995 + i);
    const cards = forkReport(rules, EVENTS, forks);
    if (cards.some((c) => c.lines.some((t) => /→ |징계/.test(t) && !/평균 기분|사이|포상휴가|복무/.test(t)))) big++;
  }
  assert.ok(big >= 15, `큰 갈림길이 있는 판 ${big}/30`);
});
