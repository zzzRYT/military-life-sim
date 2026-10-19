// era.test.js — 시대·재미 목표 (docs/05 §2 G1·G4·G5)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules, eraOf, getService, getMonthlyPay } from '../src/rules.js';
import { expireDate, addDays } from '../src/date.js';
import { newGame, autoEnlist, runGame, phoneOn } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { headline } from '../src/recap.js';

const rules = loadRules();
const game = (seed, year) => {
  const S = newGame(seed, rules, { birth: '2006-05-01' });
  autoEnlist(S, rules, year);
  return S;
};

// 전역일 = 입영일 + m개월 − 1일 − 감축일수 — research/era-official.md §1-3의 국방부 예시·계산 예
const dis = (branch, enl) => { const v = getService(rules, branch, enl); return addDays(expireDate(enl, v.months), -v.cutDays); };
test('era: 입영일 → 전역일 (국방부 예시·조견표 계산)', () => {
  const cases = [
    ['army', '2017-01-03', '2018-10-01'], ['army', '2017-01-17', '2018-10-14'], ['army', '2018-07-27', '2020-03-16'], ['army', '2020-06-15', '2021-12-14'],
    ['army', '2008-06-10', '2010-04-27'], ['army', '2012-05-14', '2014-02-13'], ['army', '2018-03-12', '2019-11-10'], ['army', '2023-05-08', '2024-11-07'],
    ['navy', '2019-05-20', '2021-02-11'], ['airforce', '2019-05-20', '2021-03-11'],
  ];
  for (const [b, e, d] of cases) assert.equal(dis(b, e), d, `${b} ${e}`);
  assert.equal(getService(rules, 'army', '2011-01-01').cutDays, 87);
  assert.equal(getService(rules, 'army', '2011-01-02').cutDays, 88);
  assert.equal(getService(rules, 'marine', '1998-05-01').months, 26);
  assert.equal(getService(rules, 'airforce', '2003-11-01').months, 28);
});

test('era: 연도별 병장 봉급 (e-나라지표)', () => {
  assert.equal(getMonthlyPay(rules, 'soldier', 3, 1999), 13300);
  assert.equal(getMonthlyPay(rules, 'soldier', 3, 2010), 97500);
  assert.equal(getMonthlyPay(rules, 'soldier', 3, 2019), 405700);
  assert.equal(getMonthlyPay(rules, 'soldier', 0, 2026), 750000);
});

test('era: 입대 연도 → 시대 구간', () => {
  assert.equal(eraOf(rules, 1998).id, 'e01');
  assert.equal(eraOf(rules, 2005).id, 'e02');
  assert.equal(eraOf(rules, 2017).id, 'e03');
  assert.equal(eraOf(rules, 2018).id, 'e04');
  assert.equal(eraOf(rules, 2026).id, 'e05');
});

test('era: 휴대폰 — 2000년대엔 없고, 2019-04 이후엔 있다', () => {
  const A = game('ph1', 2003);
  assert.equal(phoneOn(A), false);
  const B = game('ph2', 2024);
  assert.equal(phoneOn(B), true);
  const C = game('ph3', 2019);
  C.ym = '2019-06';
  assert.equal(phoneOn(C), true);
});

test('era: 시대 한정 사건은 그 시대 판에서만 나온다', () => {
  const eraOnly = EVENTS.filter((e) => e.when?.era);
  for (const y of [2001, 2024]) {
    for (let i = 0; i < 10; i++) {
      const S = game(`eo${y}${i}`, y);
      runGame(S, rules, { events: EVENTS, pick: 'random' });
      for (const e of eraOnly) if (S.flags['n_' + e.id]) assert.ok(e.when.era.includes(S.era.id), `${e.id} in ${S.era.id}`);
      if (!phoneOn(S)) assert.ok(!S.flags.n_phone, 'phone decision without phones');
    }
  }
});

// G4: 새로 쓴 딜레마는 모든 선택지가 대가를 치른다 (확률 결과면 여러 번 중 한 번이라도)
const cost = (out) => Object.values(out.fx ?? {}).some((v) => v < 0) || Object.values(out.rel ?? {}).some((v) => v < 0)
  || !!out.punish || !!out.ban || !!out.ending || !!out.later;
test('dilemma: 새 딜레마의 모든 선택지에 대가가 있다', () => {
  const ds = EVENTS.filter((e) => e.kind === 'decision' && /^(p_|t_|h_|era_)/.test(e.id));
  assert.ok(ds.length >= 12, `dilemmas ${ds.length}`);
  for (const d of ds) {
    const base = game(`dl-${d.id}`, Number(d.when?.era ? { e01: 2000, e02: 2009, e03: 2016, e04: 2020, e05: 2024 }[d.when.era[0]] : 2015));
    runGame(base, rules, { events: [], maxMonths: 2000 });
    for (const c of d.build(base).choices) {
      let paid = false;
      for (let i = 0; i < 30 && !paid; i++) {
        const S = structuredClone({ ...base, era: base.era });
        S.rngState = (S.rngState + i * 7919) >>> 0;
        paid = cost(d.apply(S, c.k) ?? {});
      }
      assert.ok(paid, `${d.id}:${c.k} has no cost`);
    }
  }
});

// G5: 판마다 한 줄이 다르다 — 200판(1995~2026 고르게)에서 가장 흔한 한 줄이 10% 이하
test('variety: 판의 한 줄 요약이 고르게 갈린다', () => {
  const heads = {};
  const N = 200;
  for (let i = 0; i < N; i++) {
    const S = game(`hd${i}`, 1995 + (i % 32));
    runGame(S, rules, { events: EVENTS, pick: 'random' });
    const h = headline(S.log).replace(/\d+/g, '#').slice(0, 24);
    heads[h] = (heads[h] ?? 0) + 1;
  }
  const top = Math.max(...Object.values(heads));
  console.log('headline distinct', Object.keys(heads).length, 'top', top);
  assert.ok(top / N <= 0.1, `top headline ${top}/${N}`);
  assert.ok(Object.keys(heads).length >= 60, `distinct ${Object.keys(heads).length}`);
});

test('judge: 7급은 재검, 4급은 2022년부터 현역 자원, 5·6급은 현역이 아니다', async () => {
  const { judge } = await import('../src/engine.js');
  const S = newGame('j7', rules, { birth: '2006-05-01', grade: 7 });
  const r = judge(S, rules, 2010);
  assert.ok(S.grade >= 1 && S.grade <= 6);
  assert.equal(r.serve, S.grade <= 3);
  assert.equal(judge(newGame('j4', rules, { birth: '2006-05-01', grade: 4 }), rules, 2010).serve, false);
  assert.equal(judge(newGame('j4b', rules, { birth: '2006-05-01', grade: 4 }), rules, 2024).serve, true);
  assert.equal(judge(newGame('j6', rules, { birth: '2006-05-01', grade: 6 }), rules, 2024).kind, 'exempt');
});

test('mos: 도입 전 특기는 그 해 입대자에게 안 나오고, 헌병은 2020-06 전 이름', async () => {
  const { mosName } = await import('../src/engine.js');
  for (let i = 0; i < 300; i++) {
    const S = game(`ms${i}`, 1996 + (i % 8)); // 1996~2003
    const m = rules.soldierMos[S.branch][S.mos];
    assert.ok(!m.since || m.since <= S.dates.enlist.slice(0, 7), `${S.mos} in ${S.dates.enlist}`);
  }
  assert.equal(mosName(rules, 'army', '321101', '2010-03'), '근무헌병');
  assert.equal(mosName(rules, 'army', '321101', '2024-03'), '근무군사경찰');
});
