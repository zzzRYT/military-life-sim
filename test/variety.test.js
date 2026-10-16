// variety.test.js — 서사 지표 (docs/04 §2). 지금 단계(N2) 기준선을 고정하고, 단계가 오를 때 기준을 조인다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, autoEnlist, runGame } from '../src/engine.js';
import { EVENTS } from '../content/events.js';

const rules = loadRules();
const byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

function measure(status, N = 40) {
  const runs = []; let echo = 0, fired = 0, reads = 0, quiet = 0, months = 0;
  for (let i = 0; i < N; i++) {
    const S = newGame(`var-${status}-${i}`, rules, { birth: '2006-05-01', status, branch: 'army' });
    autoEnlist(S, rules); runGame(S, rules, { events: EVENTS });
    const ids = Object.keys(S.flags).filter((k) => k.startsWith('n_')).map((k) => k.slice(2));
    runs.push(new Set(ids));
    echo += S.log.filter((l) => l.echo).length;
    for (const id of ids) { const n = S.flags['n_' + id]; fired += n; if (byId[id]?.needs) reads += n; }
    reads += S.log.filter((l) => l.echo).length;
    quiet += S.flags.n_quiet_month ?? 0; months += S.hist.length;
  }
  let js = 0, n = 0;
  for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) {
    const A = runs[a], B = runs[b], x = [...A].filter((v) => B.has(v)).length;
    js += x / (A.size + B.size - x); n++;
  }
  return { jaccard: js / n, echoPerRun: echo / N, readShare: reads / fired, quietShare: quiet / months };
}

test('variety: 병사 — 되부르기 판당 4줄 이상, 흔적을 읽는 발생 15% 이상', () => {
  const m = measure('soldier');
  console.log('soldier', m);
  assert.ok(m.echoPerRun >= 4, `echo ${m.echoPerRun}`);
  assert.ok(m.readShare >= 0.15, `reads ${m.readShare}`);
  assert.ok(m.jaccard <= 0.7, `jaccard ${m.jaccard}`); // N5 목표 0.40 — 줄기(N3) 전까지는 회귀만 막는다
});
