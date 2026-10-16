// specialty.test.js — 특기병 사건: 대상 특기 키가 주특기 표에 있고, 그 특기 판에서만 나온다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { SPECIALTY_EVENTS, COOK, DRIVER, BAND, SF } from '../content/events-specialty.js';

const rules = loadRules();
const GROUPS = { cook: COOK, drive: DRIVER, band: BAND, sf: SF };
const group = (id) => GROUPS[id.split('_')[1]];
const all = Object.entries(rules.soldierMos).filter(([b]) => !b.startsWith('_'))
  .flatMap(([branch, t]) => Object.keys(t).map((mos) => ({ branch, mos })));

test('특기: 대상 특기마다 주특기 표에 키가 있다 (오타 방지)', () => {
  for (const [name, c] of Object.entries(GROUPS)) {
    assert.ok(all.some((m) => c(m)), `${name}: 표에 맞는 특기 없음`);
  }
  assert.equal(all.filter(COOK).length, 4);
  assert.equal(all.filter(DRIVER).length, 4);
});

test('특기: id 유일, 사건마다 그룹이 있다', () => {
  const ids = EVENTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of SPECIALTY_EVENTS) assert.ok(group(e.id), e.id);
});

test('특기: 그 특기 판에서만 나오고, 운전병은 배차가 갈린다', () => {
  const fired = new Set();
  const cars = new Set();
  for (const m of [...all.filter((x) => Object.values(GROUPS).some((c) => c(x))), { branch: 'army', mos: '111101' }]) {
    for (let i = 0; i < 8; i++) {
      const S = newGame(`spec-${m.mos}-${i}`, rules, { birth: '2006-05-01', status: 'soldier', ...m });
      autoEnlist(S, rules); runGame(S, rules, { events: EVENTS });
      for (const id of Object.keys(S.flags).filter((k) => k.startsWith('n_spec_')).map((k) => k.slice(2))) {
        assert.ok(group(id)(S), `${m.branch}/${m.mos}: ${id}`);
        fired.add(id);
      }
      if (DRIVER(S)) cars.add(S.marks.car_fixed ? 'fixed' : S.marks.car_none ? 'none' : 'unset');
    }
  }
  for (const e of SPECIALTY_EVENTS) assert.ok(fired.has(e.id), `한 번도 안 나옴: ${e.id}`);
  assert.ok(cars.has('fixed') && cars.has('none'), [...cars].join(','));
});
