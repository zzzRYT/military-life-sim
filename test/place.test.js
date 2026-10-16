// place.test.js — 지역: 근무지 안에서 지역을 추첨하고, 지역 사건은 맞는 지역에서만 나온다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame, placeIs } from '../src/engine.js';
import { EVENTS } from '../content/events.js';

const rules = loadRules();
const byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

test('지역: 모든 근무지에 지역 표가 있다', () => {
  for (const b of ['army', 'navy', 'airforce', 'marine']) {
    for (const [k, v] of Object.entries(rules.env.post[b])) assert.ok(Object.keys(v.places ?? {}).length, `${b}.${k}`);
  }
});

test('지역: 판마다 근무지 안의 지역이 뽑히고, 지역 사건은 그 지역에서만 나온다', () => {
  for (const branch of ['army', 'navy', 'airforce', 'marine']) {
    const seen = new Set();
    for (let i = 0; i < 25; i++) {
      const S = newGame(`place-${branch}-${i}`, rules, { birth: '2006-05-01', status: 'soldier', branch });
      autoEnlist(S, rules); runGame(S, rules, { events: EVENTS });
      seen.add(S.env.place.id);
      if (S.marks.ship_off) { assert.equal(S.env.post, 'base'); assert.ok(!placeIs(S, 'ship')); continue; } // 육상 전환 판은 함정 사건이 앞서 나왔다
      for (const id of Object.keys(S.flags).filter((k) => k.startsWith('n_place_')).map((k) => k.slice(2))) {
        const want = byId[id].when.place;
        if (want) assert.ok(want.some((t) => placeIs(S, t)), `${branch} ${S.env.place.id}: ${id}`);
      }
    }
    assert.ok(seen.size >= 3, `${branch}: 지역 ${seen.size}곳`);
  }
});
