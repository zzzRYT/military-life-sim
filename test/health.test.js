// health.test.js — 몸: 습관이 체중·근육을 바꾸고, 병원 사건은 분야를 고르게 뽑고, 최악이면 의병 전역
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame, fire, endMonth } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { ISSUES, catWeights, SFC_DODGE } from '../content/events-health.js';
import { gain, medicP } from '../src/body.js';

const rules = loadRules();
const byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
function serving(seed, habit) {
  const S = newGame(seed, rules, { birth: '2006-05-01', branch: 'army' });
  autoEnlist(S, rules);
  S.phase = 'serve'; S.money.cash = 1e7; S.mosMech = null; S.hobby = null; S.focus = null;
  if (habit) fire(S, rules, { kind: 'decision', id: 'health_habit', ref: byId.health_habit }, { choice: habit });
  return S;
}
const months = (S, n) => { for (let i = 0; i < n; i++) endMonth(S, rules); return S; };

test('몸: 배달·PX는 살이 찌고, 체단은 빠지고, 쇠질은 근육, 핸드폰은 몸이 망가진다', () => {
  const [del, px, run, gym, phone] = ['delivery', 'px', 'run', 'gym', 'phone'].map((h) => months(serving('hb', h), 8));
  assert.ok(gain(del.body) >= 10 && gain(px.body) >= 6, `${gain(del.body)} ${gain(px.body)}`);
  assert.ok(gain(run.body) <= -3, `${gain(run.body)}`);
  assert.ok(gym.body.muscle >= 60 && phone.body.muscle < 40);
  assert.ok(phone.st.fit < gym.st.fit && phone.st.fit < run.st.fit);
  assert.ok(del.money.cash < 1e7 && run.money.cash >= 1e7); // 배달은 돈이 든다
  assert.ok(medicP(phone) > medicP(gym) && medicP(del) > medicP(serving('hb', null)));
});

test('병원: 분야는 고르게 (습관 없으면 균등), 대사는 과체중만, 핸드폰은 척추로 기운다', () => {
  const S = serving('cw', null);
  assert.deepEqual(catWeights(S), [['spine', 1], ['bone', 1], ['joint', 1], ['internal', 1]]);
  S.body.habit = 'phone';
  assert.equal(Object.fromEntries(catWeights(S)).spine, 2.5);
  S.body.kg += 10;
  assert.ok(catWeights(S).some(([c]) => c === 'metabolic'));

  const cat = {}, sev = [0, 0, 0];
  for (let i = 0; i < 2000; i++) {
    const T = serving(`md-${i % 50}`, null);
    T.rngState = (T.rngState + i * 7919) >>> 0;
    fire(T, rules, { kind: 'event', id: 'medic_issue', ref: byId.medic_issue });
    const m = T.marks.medic;
    cat[m.cat] = (cat[m.cat] ?? 0) + 1; sev[m.sev]++;
    if (m.sev === 2) assert.equal(T.ending, 'medical');
    if (m.sev === 1) assert.match(T.log.at(-1).text, /수도병원/);
  }
  for (const c of ['spine', 'bone', 'joint', 'internal']) assert.ok(cat[c] > 400 && cat[c] < 600, `${c} ${cat[c]}`);
  assert.ok(sev[2] > 0 && sev[2] < sev[1] && sev[1] < sev[0], `${sev}`);
  assert.ok(Object.values(ISSUES).flat().every(([n, m]) => n && m >= 0 && m <= 2));
});

test('병원: 한 판 전체에서 수도병원 입원은 흔하고, 병원 전역은 드물다', () => {
  let hosp = 0, out = 0; const N = 400; // 입원율이 5% 선 바로 위(약 6%)라 200판이면 시드 운에 흔들린다
  for (let i = 0; i < N; i++) {
    const S = newGame(`hp-${i}`, rules, { birth: '2006-05-01' });
    autoEnlist(S, rules); runGame(S, rules, { events: EVENTS });
    if (S.hospital) hosp++;
    if (S.ending === 'medical' && S.marks.medic?.sev === 2) out++;
  }
  assert.ok(hosp > N * 0.05 && out < N * 0.05, `hosp ${hosp} out ${out}`);
});

test('꾀병 외진: 병장만, 걸리면 행보관 성격에 따라 훈계 또는 휴가 박탈', () => {
  const S = serving('dg', null);
  S.rank = 2; assert.equal(byId.medic_dodge.c(S), false);
  S.rank = 3; assert.equal(byId.medic_dodge.c(S), true);
  const tally = (temper) => {
    const r = { safe: 0, talk: 0, cut: 0 };
    for (let i = 0; i < 1500; i++) {
      const T = serving('dg', null);
      T.rank = 3; T.leave.left = 20; T.rngState = (T.rngState + i * 7919) >>> 0;
      T.env.people.find((p) => p.role === 'sfc').temper = temper;
      fire(T, rules, { kind: 'decision', id: 'medic_dodge', ref: byId.medic_dodge }, { choice: 'dodge' });
      if (T.discipline?.length) { assert.equal(T.leave.left, 20 - SFC_DODGE[temper].n); r.cut++; }
      else if (/행보관/.test(T.log.at(-1).text)) r.talk++; else r.safe++;
    }
    return r;
  };
  const kind = tally('kind'), scary = tally('scary');
  assert.equal(kind.cut, 0);
  assert.ok(kind.safe > 1500 * 0.8, `걸리는 건 낮은 확률 ${kind.safe}`);
  assert.ok(scary.cut > scary.talk, `${JSON.stringify(scary)}`);
});
