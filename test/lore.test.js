// lore.test.js — 군대 썰·계절 일과·국가 사건 (content/events-lore.js · events-routine.js · events-nation.js)
// 근거: research/community-lore.md · yearly-routine.md · history-moments.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { LORE_EVENTS } from '../content/events-lore.js';
import { ROUTINE_EVENTS } from '../content/events-routine.js';
import { NATION_EVENTS } from '../content/events-nation.js';

const rules = loadRules();
const NEW = [...LORE_EVENTS, ...ROUTINE_EVENTS, ...NATION_EVENTS];
const byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
const play = (seed, year, branch = 'army') => {
  const S = newGame(seed, rules, { birth: '2006-05-01', status: 'soldier', branch });
  autoEnlist(S, rules, year);
  return runGame(S, rules, { events: EVENTS, pick: 'random' });
};
const fired = (S, id) => (S.flags['n_' + id] ?? 0) > 0;

test('lore: 새 사건 id는 전체에서 유일하고, 출처(src)와 실행부가 있다', () => {
  const ids = EVENTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, '중복 id');
  assert.ok(NEW.length >= 100, `새 사건 ${NEW.length}개`);
  for (const e of NEW) {
    assert.ok(e.src, `${e.id} src`);
    assert.match(e.src, /community-lore|yearly-routine|history-moments|가정/, `${e.id} src`);
    assert.ok(e.kind === 'decision' ? typeof e.build === 'function' && typeof e.apply === 'function' : typeof e.run === 'function', e.id);
  }
});

test('lore: 결정은 선택지 2개 이상이고 힌트가 있다', () => {
  const base = newGame('shape', rules, { birth: '2006-05-01', status: 'soldier', branch: 'army' });
  autoEnlist(base, rules);
  runGame(base, rules, { events: [], maxMonths: 2000 });
  for (const d of NEW.filter((e) => e.kind === 'decision')) {
    const b = d.build(base);
    assert.ok(b.title && b.body, d.id);
    assert.ok(b.choices.length >= 2, d.id);
    for (const c of b.choices) assert.ok(c.k && c.label && c.hint, `${d.id}:${c.k}`);
  }
});

// docs/05 G4: 모든 선택지가 무언가를 잃는다 (확률 결과면 여러 번 중 한 번이라도)
const cost = (out) => Object.values(out.fx ?? {}).some((v) => v < 0) || Object.values(out.rel ?? {}).some((v) => v < 0)
  || !!out.punish || !!out.ban || !!out.ending || !!out.later;
test('lore: 새 딜레마의 모든 선택지에 대가가 있다', () => {
  const base = newGame('cost', rules, { birth: '2006-05-01', status: 'soldier', branch: 'army' });
  autoEnlist(base, rules);
  runGame(base, rules, { events: [], maxMonths: 2000 });
  const ds = NEW.filter((e) => e.kind === 'decision');
  assert.ok(ds.length >= 20, `dilemmas ${ds.length}`);
  for (const d of ds) {
    for (const c of d.build(base).choices) {
      let paid = false;
      for (let i = 0; i < 40 && !paid; i++) {
        const S = structuredClone(base);
        S.rngState = (S.rngState + i * 7919) >>> 0;
        paid = cost(d.apply(S, c.k) ?? {});
      }
      assert.ok(paid, `${d.id}:${c.k} has no cost`);
    }
  }
});

test('lore: 시대·군종 한정 사건은 그 시대·군종 판에서만 나온다', () => {
  const only = NEW.filter((e) => e.when?.era || e.when?.branch);
  assert.ok(only.length >= 20);
  for (const [year, branch] of [[2001, 'army'], [2010, 'navy'], [2016, 'airforce'], [2024, 'marine'], [2024, 'army']]) {
    for (let i = 0; i < 8; i++) {
      const S = play(`ge${year}${branch}${i}`, year, branch);
      for (const e of only) {
        if (!fired(S, e.id)) continue;
        if (e.when.era) assert.ok(e.when.era.includes(S.era.id), `${e.id} in ${S.era.id}`);
        if (e.when.branch) assert.ok(e.when.branch.includes(S.branch), `${e.id} in ${S.branch}`);
      }
    }
  }
});

test('lore: 군종 특화 일과 — 공군 ORE·해병 IBS·함정 입항은 각 군종 판에서 실제로 나온다', () => {
  const seen = { af: 0, mar: 0, navy: 0 };
  for (let i = 0; i < 60; i++) {
    const A = play(`af${i}`, 2016, 'airforce');
    if (fired(A, 'rt_af_ore') || fired(A, 'rt_af_heat') || fired(A, 'lore_airforce_jokgu')) seen.af++;
    const M = play(`mar${i}`, 2016, 'marine');
    if (fired(M, 'rt_marine_ibs')) seen.mar++;
    const N = play(`nv${i}`, 2016, 'navy');
    if (fired(N, 'rt_navy_port') || fired(N, 'rt_navy_rough')) seen.navy++;
  }
  assert.ok(seen.af >= 5 && seen.mar >= 3 && seen.navy >= 3, JSON.stringify(seen));
});

test('lore: 판당 새 사건이 눈에 띄게 나온다 (육군 병사 평균 8개 이상)', () => {
  const ids = new Set(NEW.map((e) => e.id));
  let sum = 0;
  const N = 40;
  for (let i = 0; i < N; i++) {
    const S = play(`cnt${i}`, 2016 + (i % 8));
    sum += Object.keys(S.flags).filter((k) => k.startsWith('n_') && ids.has(k.slice(2))).length;
  }
  assert.ok(sum / N >= 8, `평균 ${sum / N}`);
});

test('lore: 앞선 선택이 돌아온다 — 소포 편지·고양이·행군 후속은 흔적이 있을 때만', () => {
  for (const id of ['lore_parcel_honest_back', 'lore_parcel_fine_back', 'lore_cat_back', 'lore_carry_back', 'lore_cold_back', 'lore_cap_back', 'lore_cook_back', 'lore_vip_none']) {
    assert.ok(byId[id]?.needs, `${id} needs`);
  }
  let back = 0;
  for (let i = 0; i < 40; i++) {
    const S = play(`back${i}`, 2022);
    for (const id of ['lore_parcel_honest_back', 'lore_parcel_fine_back']) {
      if (fired(S, id)) {
        back++;
        assert.ok(S.marks.parcel_honest || S.marks.parcel_fine, `${id} without mark`);
      }
    }
  }
  assert.ok(back >= 8, `소포 후속 ${back}판`);
});

test('lore: 전역하는 달 — 위병소·전역 후 한 줄이 나온다', () => {
  let gate = 0;
  for (let i = 0; i < 30; i++) {
    const S = play(`gate${i}`, 2019);
    if (fired(S, 'lore_gate_look')) gate++;
    assert.ok(!S.flags.n_lore_gate_look || S.flags.n_lore_gate_look === 1);
  }
  assert.ok(gate >= 20, `gate ${gate}/30`);
});

// ── 국가 사건 ──
const at = (ym, patch = {}) => {
  const S = newGame(`nat${ym}`, rules, { birth: '2006-05-01', status: 'soldier', branch: 'army' });
  autoEnlist(S, rules, Number(ym.slice(0, 4)));
  runGame(S, rules, { events: [], maxMonths: 2000 });
  S.phase = 'serve';
  S.ym = ym;
  Object.assign(S, patch);
  return S;
};
const H = (id) => NATION_EVENTS.find((e) => e.id === id);

test('nation: 메르스(2015-06~07)는 전군 휴가 통제, 신종플루·ASF는 접경만', () => {
  assert.equal(H('h_mers_2015').c(at('2015-06', { branch: 'navy' })), true);
  assert.equal(H('h_mers_2015').c(at('2015-08')), false);
  assert.ok(H('h_mers_2015').run(at('2015-06')).ban >= 1);
  const front = at('2009-10'); front.env.post = 'front';
  const rear = at('2009-10'); rear.env.post = 'rear';
  assert.equal(H('h_flu_2009').c(front), true);
  assert.equal(H('h_flu_2009').c(rear), false);
  const gop = at('2019-11'); gop.env.post = 'gop';
  assert.equal(H('h_asf_2019').c(gop), true);
  assert.equal(H('h_asf_2019').run(gop).ban, undefined, 'ASF 휴가 통제는 미확인이라 0');
});

test('nation: 영동 재난은 영동(snow 태그·해안)에 효과가 더 크고, 다른 부대는 뉴스로만 겪는다', () => {
  const east = at('2002-09'); east.env.post = 'coast'; east.env.place = { tags: ['snow', 'sea'] };
  const far = at('2002-09'); far.env.post = 'rear'; far.env.place = { tags: ['capital'] };
  const a = H('h_rusa_2002').run(east), b = H('h_rusa_2002').run(far);
  assert.ok(a.fx.mind < b.fx.mind && a.fx.fit < 0);
  assert.equal(H('h_rusa_2002').c(at('2002-09', { branch: 'navy' })), false);
  assert.equal(H('h_subma_1996').c(far.ym === '2002-09' ? at('1996-10', { env: far.env }) : null), false);
  const e96 = at('1996-10'); e96.env.post = 'coast'; e96.env.place = { tags: ['snow', 'sea'] };
  assert.equal(H('h_subma_1996').c(e96), true);
  assert.ok(H('h_subma_1996').run(e96).ban >= 1);
});

test('nation: 코로나 종결 — 2021-11 휴가 정상화, 2022-04 면회 재개', () => {
  assert.equal(H('h_covid_normal_2021').c(at('2021-11')), true);
  assert.equal(H('h_covid_normal_2021').c(at('2021-09')), false);
  assert.equal(H('h_visit_back_2022').c(at('2022-04')), true);
  assert.ok(H('h_visit_back_2022').run(at('2022-04')).fx.mind > 0);
});

test('nation: 전역하고 보니 — 입대 후 바뀐 것만, 휴대폰 시대엔 스마트폰 줄 제외', () => {
  const S = at('2020-03');
  S.dates.enlist = '2019-06-03';
  S.dates.discharge = '2020-03-02';
  assert.equal(H('h_world_after').c(S), true);
  const t = H('h_world_after').run(S).t;
  assert.match(t, /마스크/); // 2020-03 공적 마스크
  assert.doesNotMatch(t, /삐삐|싸이|일촌|2,500원/);
  const old = at('2010-05');
  old.dates.enlist = '2009-08-03';
  old.dates.discharge = '2010-05-02';
  old.phase = 'serve';
  assert.match(H('h_world_after').run(old).t, /손가락|노란 앱/); // 2009-11 아이폰·2010-03 카카오톡
  const none = at('2005-05');
  none.dates.enlist = '2004-08-01';
  none.dates.discharge = '2005-05-01';
  assert.equal(H('h_world_after').c(none), false); // 이 구간엔 등록된 변화가 없다
});
