// bootcamp.test.js — 훈련소: 주차 일정이 전부 훈련소 기간 안에 순서대로, 조용한 달 없음, 전체 id 유일
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { BOOTCAMP_EVENTS } from '../content/events-bootcamp.js';

const rules = loadRules();
const sched = BOOTCAMP_EVENTS.filter((e) => e.week != null);

test('bootcamp: 군종마다 주차 일정이 훈련소 안에서 전부, 입소 → 수료 순으로 나온다', () => {
  for (const [status, branch] of [['soldier', 'army'], ['soldier', 'marine'], ['soldier', 'navy'], ['soldier', 'airforce']]) {
    for (let i = 0; i < 5; i++) {
      const S = newGame(`bc-${status}-${branch}-${i}`, rules, { birth: '2006-05-01', status, branch });
      autoEnlist(S, rules); runGame(S, rules, { events: EVENTS });
      const fired = S.flags; // markFired: n_<id>
      for (const e of sched) assert.equal(fired['n_' + e.id], 1, `${status}/${branch} ${e.id}`);
      const lines = S.log.map((l) => l.text);
      const iEnter = lines.findIndex((t) => t.startsWith('입소 첫 주'));
      const iGrad = lines.findIndex((t) => /^(수료식|빨간 명찰 수여식) —/.test(t));
      const iServe = lines.findIndex((t) => t.includes('자대 배치'));
      assert.ok(iEnter >= 0 && iEnter < iGrad && iGrad < iServe, `${status}/${branch} 순서`);
      const trainLines = lines.slice(0, iServe);
      assert.ok(!trainLines.some((t) => t.startsWith('특별한 일 없이')), '훈련소에 조용한 달');
    }
  }
});

test('bootcamp: 전체 사건 id 유일', () => {
  const ids = EVENTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, `중복 id: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`);
});
