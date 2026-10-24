// endings.test.js — 4급 주마등(시작 후 4급 엔딩) · 육군교도소 엔딩
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, enlist, judge, runGame, fire, setFocus, ENDINGS } from '../src/engine.js';
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

// ── 특이한 전역 넷: 국군수도병원 · 전입 · 의가사 · 간부 전직 ──
const ev = (id) => EVENTS.find((e) => e.id === id);
const fresh = (seed) => { const S = newGame(seed, rules, { birth: '2004-05-01' }); enlist(S, rules, '2024-03-01'); S.phase = 'serve'; S.monthsLeft = 10; return S; };
const item = (id) => ({ kind: ev(id).kind, id, ref: ev(id) });
const tail = (S, key) => { assert.equal(S.ending, key); assert.equal(S.phase, 'end'); const R = buildRecap(S, rules); assert.equal(R.ending, ENDINGS[key]); assert.equal(R.movie.at(-1).text, ENDINGS[key]); assert.ok(R.early); };

test('국군수도병원 장기 입원: 입원이 거듭되거나 몸이 바닥이면 열리고, 병상에서 복무가 끝난다', () => {
  const e = ev('end_hospital_long'), S = fresh('eh');
  S.marks.medic = { ym: '2023-01', cat: 'bone', name: '피로골절', sev: 1 };
  assert.equal(e.c(S), false, '입원 이력도 몸 상태도 멀쩡하면 닫혀 있다');
  S.hospital = 2;
  assert.equal(e.c(S), true);
  S.hospital = 1; S.st.fit = 30;
  assert.equal(e.c(S), true);
  fire(S, rules, item('end_hospital_long'));
  tail(S, 'hospital');
  assert.match(ENDINGS.hospital, /국군수도병원/);
});

test('전입: 전역 임박 전에만, 부조리가 심한 부대일수록 잘 옮겨진다', () => {
  const e = ev('end_transfer'), S = fresh('et');
  S.monthsLeft = 2; assert.equal(e.c(S), false);
  S.monthsLeft = 10; assert.equal(e.c(S), true);
  S.env.abuse = 0; const low = e.p(S);
  S.env.abuse = 100; assert.ok(e.p(S) > low * 3);
  fire(S, rules, item('end_transfer'));
  tail(S, 'transfer');
});

test('의가사: 멘탈이 바닥일 때 결정이 열리고, 신청하면 의가사 전역으로 끝난다', () => {
  const e = ev('end_hardship'), S = fresh('ef');
  assert.equal(e.c(S), false);
  S.st.mind = 30; assert.equal(e.c(S), true);
  const d = e.build(S);
  assert.equal(d.choices[0].k, 'stay', '자동 진행은 버티는 쪽이 기본');
  assert.equal(e.apply(S, 'stay').ending, undefined);
  let got = 0;
  for (let i = 0; i < 40; i++) if (e.apply(fresh('ef' + i), 'apply').ending === 'family') got++;
  assert.ok(got > 20 && got < 40, `신청 통과 ${got}/40 — 높은 편이지만 확실하진 않다`);
  const T = fresh('ef2'); T.queue = []; fire(T, rules, { kind: 'decision', id: 'end_hardship', ref: { ...e, apply: () => ({ t: 't', ending: 'family' }) } });
  tail(T, 'family');
});

test('간부 전직: 병장 이상 · 포상 2회 · 훈련 숙련 70 · 멘탈 55일 때만 제안, 서명하면 하사 임관으로 끝난다', () => {
  const e = ev('end_cadre'), S = fresh('ec');
  S.monthsLeft = 6;
  assert.equal(e.c(S), false);
  S.rank = 3; S.rewards = [{ ym: '2024-06', kind: 'a', days: 2 }, { ym: '2024-09', kind: 'b', days: 2 }];
  S.train.marksman = 80; S.st.mind = 60;
  assert.equal(e.c(S), true);
  S.rank = 2; assert.equal(e.c(S), false);
  S.rank = 3; S.monthsLeft = 20; assert.equal(e.c(S), false, '전역 8개월 안쪽에서만');
  assert.equal(e.build(S).choices[0].k, 'decline', '자동 진행은 거절(만기 전역)이 기본');
  assert.equal(e.apply(S, 'decline').ending, undefined);
  fire(S, rules, { kind: 'decision', id: 'end_cadre', ref: e }, { choice: 'accept' });
  tail(S, 'cadre');
});

test('특이한 전역이 보통의 전역을 밀어내지 않는다: 자동 진행 대부분은 만기 전역', () => {
  const seen = new Set();
  let normal = 0;
  for (let i = 0; i < 600; i++) {
    const S = newGame('nz' + i, rules, { birth: '2004-05-01' });
    enlist(S, rules, '2024-03-01');
    setFocus(S, 'marksman');
    runGame(S, rules, { events: EVENTS, pick: i % 2 ? 'random' : undefined });
    if (!S.ending) normal++; else seen.add(S.ending);
  }
  assert.ok(normal >= 480, `만기 전역 ${normal}/600`);
  for (const k of ['hospital', 'transfer', 'family', 'cadre']) assert.ok(seen.has(k), `${k} 엔딩이 평범한 플레이에서 닿는다`);
});
