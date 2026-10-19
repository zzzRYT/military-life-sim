// events.test.js — 사건 템플릿 + 결과 적용(징계·엔딩)

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, runGame, fire } from '../src/engine.js';
import { EVENTS, fmt } from '../content/events.js';

const rules = loadRules();
const opts = { birth: '2006-05-01', enlist: '2026-12-01', status: 'soldier', branch: 'army' };
const once = (out) => ({ kind: 'event', id: 't', ref: { run: () => out } });

test('events: 200판 자동 완주, 같은 시드 → 같은 로그', () => {
  for (let i = 0; i < 200; i++) runGame(newGame('e' + i, rules, opts), rules, { events: EVENTS });
  const a = runGame(newGame('same', rules, opts), rules, { events: EVENTS });
  const b = runGame(newGame('same', rules, opts), rules, { events: EVENTS });
  assert.deepEqual(a.log, b.log);
});

test('events: 징계·엔딩 적용', () => {
  const S = newGame('p', rules, opts);
  const before = S.dates.discharge;
  fire(S, rules, once({ punish: { kind: 'drill', n: 10 } }));
  assert.equal(S.dates.discharge, '2028-06-10'); // 2028-05-31 + 10일
  assert.notEqual(S.dates.discharge, before);
  S.rank = 2;
  fire(S, rules, once({ punish: { kind: 'demote' } }));
  assert.equal(S.rank, 1);
  assert.equal(S.dates.promotions.length, 2); // 병장 진급을 잃음
  fire(S, rules, once({ ending: 'court' }));
  assert.equal(S.phase, 'end');
  assert.equal(S.ending, 'court');
});

test('events: 템플릿 변수 치환', () => {
  const S = newGame('xyz', rules, opts);
  const p = S.env.people.find((x) => x.role === 'senior');
  assert.ok(p.name);
  assert.equal(fmt(S, '{senior}'), `맞선임 ${p.name}`);
  assert.equal(fmt(S, '{senior.name}'), p.name);
});

test('events: 복무기간 단축 — 6개월 전이면 전역일 변경, 지났으면 즉시 전역', () => {
  const A = newGame('s1', rules, opts); // 입영 2026-12-01
  A.ym = '2027-02';
  fire(A, rules, once({ shorten: 6 }));
  assert.equal(A.dates.discharge, '2027-05-31');
  assert.notEqual(A.phase, 'end');
  const B = newGame('s2', rules, opts);
  B.ym = '2027-08';
  fire(B, rules, once({ shorten: 6 }));
  assert.equal(B.phase, 'end');
  assert.equal(B.ending, 'shortened');
});
