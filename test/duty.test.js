// duty.test.js — 차출 보직: 한 판에 하나, 군종에 맞는 보직만, 보직 사건은 그 보직 흔적이 있을 때만
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame } from '../src/engine.js';
import { EVENTS } from '../content/events.js';
import { DUTIES, DUTY_EVENTS } from '../content/events-duty.js';

const rules = loadRules();
const role = (id) => id.split('_')[1];

test('보직: 사건마다 보직 표에 있는 보직을 읽는다', () => {
  for (const e of DUTY_EVENTS) {
    if (e.id === 'duty_draft' || e.id === 'duty_handover') continue;
    assert.ok(DUTIES[role(e.id)], e.id);
    assert.equal(e.needs, `duty_${role(e.id)}`, e.id);
  }
});

test('보직: 군종에 맞는 보직만 뽑히고, 그 보직 사건만 나온다', () => {
  const drafted = new Set();
  const fired = new Set();
  let none = 0;
  let handed = 0;
  for (const branch of ['army', 'navy', 'airforce', 'marine']) {
    for (let i = 0; i < 400; i++) { // 희귀 보직(w 1)까지 한 번은 나오게 — 200판이면 사진병이 운에 따라 빠진다
      const S = newGame(`duty-${branch}-${i}`, rules, { birth: '2006-05-01', status: 'soldier', branch });
      autoEnlist(S, rules); runGame(S, rules, { events: EVENTS });
      const logs = S.log.map((l) => l.text).join('\n');
      const got = Object.keys(DUTIES).filter((id) => logs.includes(`(${id === 'px' && branch === 'airforce' ? 'BX병' : DUTIES[id].label})`));
      assert.ok(got.length <= 1, `${branch} ${i}: 보직 ${got}`);
      if (!got.length) none++;
      for (const id of got) {
        assert.ok(DUTIES[id].b.includes(branch), `${branch}: ${id}`);
        drafted.add(id);
      }
      if (S.flags.n_duty_handover) handed++;
      for (const k of Object.keys(S.flags).filter((f) => f.startsWith('n_duty_') && f !== 'n_duty_draft' && f !== 'n_duty_handover')) {
        const id = k.slice(2);
        assert.deepEqual(got, [role(id)], `${branch} ${i}: ${id} without draft`);
        fired.add(id);
      }
    }
  }
  assert.equal(drafted.size, Object.keys(DUTIES).length, `안 뽑힌 보직: ${Object.keys(DUTIES).filter((d) => !drafted.has(d))}`);
  assert.ok(none > 0, '보직 없는 판도 있어야 한다');
  assert.ok(handed > 0, '인수인계가 한 번은 나와야 한다');
  const never = DUTY_EVENTS.filter((e) => e.id !== 'duty_draft' && !fired.has(e.id) && e.id !== 'duty_handover').map((e) => e.id);
  assert.ok(never.length <= 3, `거의 안 나오는 사건: ${never}`);
});
