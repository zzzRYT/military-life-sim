// rel.test.js — 관계 사건 (content/events-rel.js, docs/06): id 규칙 · 출처 · 딜레마의 대가 · 시대와 상대가 판마다 고르게 나온다
// 근거: research/relationship-events.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { REL_EVENTS } from '../content/events-rel.js';
import { actorOf, sceneOf, ACTORS, SCENE_KEYS } from '../src/scene.js';

const rules = loadRules();
const play = (seed, year, branch) => {
  const S = newGame(seed, rules, { birth: '2006-05-01', status: 'soldier', ...(branch && { branch }) });
  autoEnlist(S, rules, year);
  return runGame(S, rules, { events: EVENTS, pick: 'random' });
};
const S0 = { phase: 'serve', ym: '2024-03', branch: 'army', mos: '111101', rank: 1, env: { post: 'front', drills: [] }, recent: [], flags: {} };

test('rel: id는 rel_<상대>_<장소>_<이름>, 상대·장소가 그릴 수 있는 것이고 출처가 리서치다', () => {
  assert.ok(REL_EVENTS.length >= 35, `관계 사건 ${REL_EVENTS.length}개`);
  const ids = EVENTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, '중복 id');
  for (const e of REL_EVENTS) {
    const [, actor, place] = /^rel_([a-z]+)_([a-z]+)_[a-z0-9]+$/.exec(e.id) ?? [];
    assert.ok(ACTORS.includes(actor), `${e.id} 상대`);
    assert.equal(actorOf(e.id), actor);
    assert.ok(SCENE_KEYS.includes(place), `${e.id} 장소 ${place}`);
    assert.equal(sceneOf(S0, e.id).key, place, e.id);
    assert.match(e.src, /relationship-events/, `${e.id} src`);
    assert.ok(e.kind === 'decision' ? typeof e.build === 'function' && typeof e.apply === 'function' : typeof e.run === 'function', e.id);
    for (const era of e.when.era ?? []) assert.match(era, /^e0[1-5]$/, `${e.id} era`);
  }
  // 상대 여덟 종류가 다 있다
  for (const a of ACTORS) assert.ok(REL_EVENTS.some((e) => actorOf(e.id) === a), `상대 ${a}`);
});

// 결정은 모든 선택지가 무언가를 잃는다 (docs/05 G4) — 확률 결과면 여러 번 중 한 번이라도
const cost = (out) => Object.values(out.fx ?? {}).some((v) => v < 0) || Object.values(out.rel ?? {}).some((v) => v < 0)
  || !!out.punish || !!out.ban || !!out.ending || !!out.later;
test('rel: 결정은 선택지 2개 이상, 힌트·관계 방향이 있고, 모든 선택지에 대가가 있다', () => {
  const base = newGame('rel-cost', rules, { birth: '2006-05-01', status: 'soldier', branch: 'army' });
  autoEnlist(base, rules, 2016);
  runGame(base, rules, { events: [], maxMonths: 2000 });
  Object.assign(base, { phase: 'serve', ym: '2016-09', rank: 2 }); // 신고 선택지(2011-07~)·사적 지시 금지 전(2017-08) 시점
  base.bonds.lover = 50;
  for (const d of REL_EVENTS.filter((e) => e.kind === 'decision')) {
    const b = d.build(structuredClone(base));
    assert.ok(b.title && b.body, d.id);
    assert.ok(b.choices.length >= 2, d.id);
    for (const c of b.choices) {
      assert.ok(c.k && c.label && c.hint, `${d.id}:${c.k}`);
      assert.equal(typeof c.rel, 'object', `${d.id}:${c.k} rel`);
      for (const a of Object.keys(c.rel)) assert.ok(ACTORS.includes(a), `${d.id}:${c.k} ${a}`);
      let paid = false;
      for (let i = 0; i < 40 && !paid; i++) {
        const S = structuredClone(base);
        S.rngState = (S.rngState + i * 7919) >>> 0;
        const cash = S.money.cash, left = S.leave.left;
        const out = d.apply(S, c.k) ?? {};
        paid = cost(out) || S.money.cash < cash || S.leave.left < left;
      }
      assert.ok(paid, `${d.id}:${c.k} 대가 없음`);
    }
  }
});

test('rel: 신고는 2011-07 강령 이후에만 선택지가 된다', () => {
  const e = REL_EVENTS.find((x) => x.id === 'rel_senior_room_memorize');
  const S = newGame('rel-report', rules, { birth: '2006-05-01', status: 'soldier', branch: 'army' });
  autoEnlist(S, rules, 2008);
  runGame(S, rules, { events: [], maxMonths: 2000 });
  S.ym = '2009-03';
  assert.ok(!e.build(S).choices.some((c) => c.k === 'report'));
  S.ym = '2012-03';
  assert.ok(e.build(S).choices.some((c) => c.k === 'report'));
});

test('rel: 시대마다 그 시대의 관계 사건이 나오고, 시대 밖에선 안 나온다', () => {
  const ERA_YEARS = { e01: [1996, 2000, 2003], e02: [2006, 2009, 2012], e03: [2014, 2015, 2016], e04: [2018, 2019, 2020], e05: [2022, 2024, 2026] };
  const allowed = Object.fromEntries(REL_EVENTS.map((e) => [e.id, e.when.era]));
  const byActor = {};
  for (const [era, years] of Object.entries(ERA_YEARS)) {
    const seen = new Set();
    for (let i = 0; i < 24; i++) {
      const S = play(`rel-${era}-${i}`, years[i % years.length]);
      for (const k of Object.keys(S.flags).filter((f) => f.startsWith('n_rel_'))) {
        const id = k.slice(2);
        assert.ok(!allowed[id] || allowed[id].includes(S.era.id), `${id} in ${S.era.id}`);
        seen.add(id);
        byActor[actorOf(id)] = (byActor[actorOf(id)] ?? 0) + 1;
      }
    }
    assert.ok(seen.size >= 10, `${era}: 관계 사건 ${seen.size}종`);
  }
  for (const a of ACTORS) assert.ok(byActor[a] > 0, `상대 ${a}가 한 번도 안 나왔다`);
});

test('rel: 로그 줄에 사건 id가 붙어 장면이 상대를 세운다', () => {
  const S = play('rel-log', 2024);
  const tagged = S.log.filter((l) => actorOf(l.id));
  assert.ok(tagged.length >= 3, `상대가 있는 줄 ${tagged.length}`);
});
