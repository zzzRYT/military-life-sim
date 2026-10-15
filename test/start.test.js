// start.test.js — 시작 플로우: 추첨 → 입영 연기 → 입영 → ageGap
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadRules,
  getTrainingCenter,
  getAvgAge,
  rankName,
  getMonthlyPay,
} from '../src/rules.js';
import {
  newGame,
  enlist,
  deferYear,
  runGame,
  DEFER_REASONS,
  MAX_ENLIST_AGE,
} from '../src/engine.js';
import { EVENTS } from '../content/events.js';

const rules = loadRules();

test('start: 입영일 없이 newGame → 20살 pre 상태', () => {
  const S = newGame('draw1', rules, { birth: '2006-05-01' });
  assert.equal(S.phase, 'pre');
  assert.equal(S.age, 20);
  assert.equal(S.year, 2025);
  assert.equal(S.dates, null);
  assert.equal(S.env, null);
  assert.ok([1, 2, 3, 4, 5, 6, 7].includes(S.grade));
  assert.ok(S.log.some((l) => l.text.includes('병역판정검사')));
});

test('start: 연기 사유별 스탯 변화 + 로그', () => {
  const S = newGame('draw2', rules, { birth: '2006-05-01' });
  const before = { ...S.st };
  const r = deferYear(S, rules, 'college');
  assert.equal(r, 'ok');
  assert.equal(S.age, 21);
  assert.equal(S.year, 2026);
  assert.equal(S.st.skill, before.skill + 5);
  assert.equal(S.defer.count, 1);
  assert.ok(S.log.some((l) => l.text.includes('대학 진학')));
});

test('start: 28세에 must-enlist (더는 미룰 수 없음)', () => {
  const S = newGame('draw3', rules, { birth: '2006-05-01' });
  let r = 'ok';
  for (let i = 0; i < 7; i++) r = deferYear(S, rules, 'chill');
  assert.equal(S.age, 27);
  assert.equal(r, 'ok');
  r = deferYear(S, rules, 'chill');
  assert.equal(r, 'must-enlist');
  assert.equal(S.age, MAX_ENLIST_AGE);
});

test('start: 입영 시 일정·환경·훈련소·ageGap 확정', () => {
  const S = newGame('draw4', rules, {
    birth: '2006-05-01', status: 'soldier', branch: 'army',
  });
  deferYear(S, rules, 'college');
  deferYear(S, rules, 'college');
  enlist(S, rules, `${S.year}-12-01`);
  assert.equal(S.enlist, '2027-12-01');
  assert.equal(S.dates.enlist, '2027-12-01');
  assert.ok(S.dates.discharge > S.dates.enlist);
  assert.ok(S.env && S.env.post);
  assert.equal(S.training.name, '육군훈련소');
  assert.equal(S.training.place, '논산');
  assert.equal(S.flags.ageGap, 22 - 22); // 22살 입영 − 평균 22
  assert.ok(S.log.some((l) => l.text.includes('육군훈련소(논산) 입소')));
  assert.ok(S.leave.left > 0);
});

test('start: 늦은 입영 → ageGap 로그 + old_brother 사건 후보', () => {
  const S = newGame('draw5', rules, {
    birth: '2006-05-01', status: 'soldier', branch: 'army',
  });
  for (let i = 0; i < 6; i++) deferYear(S, rules, 'chill'); // 26살
  enlist(S, rules, `${S.year}-12-01`);
  assert.equal(S.flags.ageGap, 4);
  assert.ok(S.log.some((l) => l.text.includes('4살 위로 입영')));
  const ev = EVENTS.find((e) => e.id === 'old_brother');
  assert.ok(ev.c(S), 'ageGap 4면 old_brother 후보');
  const young = EVENTS.find((e) => e.id === 'young_one');
  assert.ok(!young.c(S));
});

test('start: 20살 입영 → young_one 후보', () => {
  const S = newGame('draw6', rules, {
    birth: '2006-05-01', status: 'soldier', branch: 'army',
  });
  enlist(S, rules, `${S.year}-12-01`);
  assert.equal(S.flags.ageGap, -2);
  const young = EVENTS.find((e) => e.id === 'young_one');
  assert.ok(young.c(S));
});

test('start: 연기 후 한 판 완주 + 결정론', () => {
  const mk = () => {
    const S = newGame('flow7', rules, {
      birth: '2006-05-01', status: 'soldier', branch: 'army',
    });
    deferYear(S, rules, 'college');
    deferYear(S, rules, 'job');
    enlist(S, rules, `${S.year}-12-01`);
    return S;
  };
  const a = mk(), b = mk();
  runGame(a, rules, { events: EVENTS, auto: true });
  runGame(b, rules, { events: EVENTS, auto: true });
  assert.equal(a.phase, 'end');
  assert.equal(JSON.stringify(a.log), JSON.stringify(b.log));
  assert.ok(a.log.some((l) => l.text.includes('육군훈련소(논산) 입소')));
});

test('start: 하위 호환 — enlist 옵션 주면 기존처럼 바로 입영', () => {
  const S = newGame('compat8', rules, {
    birth: '2006-05-01', enlist: '2026-12-01', status: 'soldier', branch: 'army',
  });
  assert.equal(S.phase, 'pre');
  assert.ok(S.dates && S.env && S.training);
  assert.equal(S.training.place, '논산');
  runGame(S, rules, { events: EVENTS, auto: true });
  assert.equal(S.phase, 'end');
});

test('start: runGame은 입영 전 상태에서 예외', () => {
  const S = newGame('draw9', rules, { birth: '2006-05-01' });
  assert.throws(() => runGame(S, rules, { events: EVENTS, auto: true }), /enlist/);
});

test('rules: getTrainingCenter — 군종별 + 폴백', () => {
  assert.equal(getTrainingCenter(rules, 'soldier', 'navy').place, '진해');
  assert.equal(getTrainingCenter(rules, 'soldier', 'airforce').place, '진주');
  assert.equal(getTrainingCenter(rules, 'soldier', 'marine').place, '포항');
  assert.equal(getTrainingCenter(rules, 'soldier', 'marine').weeks, 6);
  assert.ok(getTrainingCenter(rules, 'nco', 'army').name.includes('부사관'));
  assert.ok(getTrainingCenter(rules, 'officer', 'navy').name.includes('장교'));
  assert.equal(getAvgAge(rules, 'army'), 22);
  assert.ok(Object.keys(DEFER_REASONS).length >= 4);
});

test('start: autoEnlist — 병은 입영 연령 분포에서 자동, 장교는 임관 전 학교 연수 + 경로별 양성교육', async () => {
  const { autoEnlist } = await import('../src/engine.js');
  const { getTrainingMonths } = await import('../src/rules.js');
  const { expireDate } = await import('../src/date.js');
  for (let i = 0; i < 30; i++) {
    const S = newGame('auto' + i, rules, { birth: '2006-05-01', status: 'soldier', branch: 'army' });
    autoEnlist(S, rules);
    assert.ok(S.age >= 20 && S.age <= MAX_ENLIST_AGE);
    assert.equal(S.dates.enlist.slice(0, 4), String(S.year));
  }
  const O = newGame('auto-o', rules, { birth: '2006-05-01', status: 'officer', branch: 'army', route: 'bachelor' });
  autoEnlist(O, rules);
  assert.equal(O.age, 24);
  const tm = getTrainingMonths(rules, O.branch, O.status, O.route);
  assert.equal(tm, 8); // 양성교육 + 초군반 32주
  assert.equal(O.dates.discharge, expireDate(O.dates.enlist, 36 + tm)); // 의무복무 3년은 임관부터
  assert.ok(O.log.some((l) => l.text.includes('대학 4년')));
});

test('start: 초임계급 — 장교 소위·부사관 하사, 예외는 중사·병 환산 계급', () => {
  const R = (r) => ({ ...rules, promotion: { ...rules.promotion, startException: r } });
  const off = newGame('rk', rules, { birth: '2006-05-01', status: 'officer', enlist: '2026-03-01' });
  assert.equal(rankName(rules, off.status, off.rank), '소위');
  const nco = newGame('rk', rules, { birth: '2006-05-01', status: 'nco', enlist: '2026-03-01' });
  assert.equal(rankName(rules, nco.status, nco.rank), nco.log.some((l) => l.text.includes('중사부터 시작')) ? '중사' : '하사');
  // 예외를 확률 1로 강제
  const ex = (status, e) => newGame('rk', R({ [status]: [{ ...e, label: 'x', p: 1 }] }), { birth: '2006-05-01', status, branch: 'army', enlist: '2026-03-01' });
  const n2 = ex('nco', { rank: 1 });
  assert.equal(rankName(rules, 'nco', n2.rank), '중사');
  assert.equal(getMonthlyPay(rules, 'nco', n2.rank), rules.pay.nco1.staffSergeant.m);
  const s = ex('soldier', { schoolMonths: 24, ratio: 2 / 3 }); // 사관학교 2학년 중퇴: 16개월 인정
  assert.equal(rankName(rules, 'soldier', s.rank), '병장');
  assert.equal(s.dates.promotions.length, 0);
  assert.equal(s.dates.discharge, '2026-04-30'); // 18개월 중 16개월 인정 → 2개월 복무
  const s1 = ex('soldier', { schoolMonths: 12, ratio: 2 / 3 }); // 8개월 → 상병
  assert.equal(rankName(rules, 'soldier', s1.rank), '상병');
  assert.deepEqual(s1.dates.promotions.map((p) => p.rank), [3]);
});
