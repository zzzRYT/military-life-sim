// recap.js — 전역 기록 (스펙 §7): 주마등 슬라이드 + 한눈에 보는 보고서
// 순수 함수. 끝난 판(S.phase === 'end')을 읽기만 한다.

import { rankName } from './rules.js';
import { ENDINGS } from './engine.js';

/** 주마등에 반드시 남길 줄 — 입소·수료·진급·징계·포상·조기 종료·전역 (+ 결정 줄은 l.decision) */
const MILESTONE = /입소|수료|진급|징계|포상휴가|전역|군사재판|만기 수령/;
const NOISE = /^월급 |^특별한 일 없이 한 달이/; // 월급·조용한 달(quiet_month)은 주마등에서 뺀다

/** 로그 → 주마등 슬라이드. 이정표·결정은 전부, 남는 자리는 되부르기 줄 먼저, 그다음 나머지 사건을 고르게 뽑아 max장까지 */
export function pickReel(log, max = 14) {
  const lines = log.filter((l) => !NOISE.test(l.text));
  const keep = new Set(lines.filter((l) => l.decision || MILESTONE.test(l.text)));
  for (const pool of [lines.filter((l) => l.echo && !keep.has(l)), lines.filter((l) => !l.echo && !keep.has(l))]) {
    const room = Math.max(0, max - keep.size);
    for (let i = 0; i < room && i < pool.length; i++) keep.add(pool[Math.floor((i * pool.length) / Math.min(room, pool.length))]);
  }
  return lines.filter((l) => keep.has(l)); // 원래 시간 순서 유지
}

/** 가중치 테이블에서 key의 비율 (0~1). '_'로 시작하는 메타 키는 제외 */
function share(table, key) {
  const ws = Object.entries(table || {}).filter(([k]) => !k.startsWith('_'));
  const sum = ws.reduce((a, [, v]) => a + v.w, 0);
  return sum ? (table[key]?.w ?? 0) / sum : 0;
}

/** 같은 신분·군종·경로·특기를 뽑을 확률 (%) — 스펙 §7-3 */
export function rarity(S, rules) {
  const w = rules.weights;
  // 병사 주특기는 soldier-mos.json 키에서 균등 추첨 → 균등 점유율 (가정 — drawMos 참조)
  const mosShare = S.status === 'soldier' && rules.soldierMos?.[S.branch]?.[S.mos]
    ? 1 / Object.keys(rules.soldierMos[S.branch]).length
    : share(w.mos[S.branch], S.mos);
  return 100 * share(w.status, S.status) * share(w.branch[S.status], S.branch)
    * share(w.route[S.status], S.route) * mosShare;
}

const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

export function buildRecap(S, rules) {
  if (S.phase !== 'end') throw new Error('buildRecap: game not finished');
  const hist = S.hist || [];
  const lowest = hist.reduce((m, h) => (h.mood < m.mood ? h : m), hist[0]);
  const highest = hist.reduce((m, h) => (h.mood > m.mood ? h : m), hist[0]);
  // ponytail: 조기 종료일은 마지막 달 15일로 근사. 사건에 일 단위가 생기면 실제 날짜로
  const endIso = S.ending ? `${hist.at(-1)?.ym ?? S.ym}-15` : S.dates.discharge;
  return {
    reel: pickReel(S.log),
    ending: S.ending ? ENDINGS[S.ending] : '만기 전역',
    early: !!S.ending,
    rank: rankName(rules, S.status, S.rank),
    enlist: S.dates.enlist,
    end: endIso,
    days: days(S.dates.enlist, endIso),
    months: hist.length,
    paid: S.money.paid,
    payout: S.money.payout,
    cash: S.money.cash,
    leaveLeft: S.leave.left,
    discipline: S.discipline || [],
    decisions: (S.choices || []).length,
    deferred: S.defer.count,
    age: S.age,
    st: { ...S.st },
    people: S.env.people.map((p) => ({ role: p.role, label: p.label, rel: Math.round(p.rel) })),
    hist,
    lowest,
    highest,
    rarity: rarity(S, rules),
    focus: S.focus,
    train: { ...S.train },
    rewards: S.rewards || [],
  };
}
