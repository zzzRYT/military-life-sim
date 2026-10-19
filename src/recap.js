// recap.js — 전역 기록 (스펙 §7): 주마등 슬라이드 + 한눈에 보는 보고서
// 순수 함수. 끝난 판(S.phase === 'end')을 읽기만 한다.

import { rankName, getMonthlyPay } from './rules.js';
import { ENDINGS, newGame, enlist, runGame } from './engine.js';
import { namePeople } from './draw.js';
import { makeRng } from './rng.js';

/** 주마등에 반드시 남길 줄 — 입소·수료·진급·징계·포상·조기 종료·전역 (+ 결정 줄은 l.decision) */
const MILESTONE = /입소|수료|진급|징계|포상휴가|전역|군사재판|만기 수령|수도병원/;
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

/**
 * 주마등 — 딱 max장. 입소·마지막 줄 → 큰 일 → 되부르기 → 결정 → 나머지 순으로, 같은 층에선 시간에 고르게 뽑는다.
 * (pickReel은 연대기용 — 결정·이정표를 전부 남긴다)
 */
export function pickMovie(log, max = 14) {
  const lines = log.filter((l) => !NOISE.test(l.text) && !/^진급:|^징계:|^부대 출타 통제|^취미 시작|^마음속에/.test(l.text));
  const keep = new Set([lines.find((l) => /입소/.test(l.text)), lines.at(-1)].filter(Boolean));
  const tiers = [lines.filter((l) => BIG.some((re) => re.test(l.text))), lines.filter((l) => l.echo), lines.filter((l) => l.decision && !/^결정: /.test(l.text)), lines];
  for (const t of tiers) {
    const pool = t.filter((l) => !keep.has(l));
    const room = Math.min(max - keep.size, pool.length);
    for (let i = 0; i < room; i++) keep.add(pool[Math.floor((i * pool.length) / room)]);
  }
  return lines.filter((l) => keep.has(l));
}

/** 가중치 테이블에서 key의 비율 (0~1). '_'로 시작하는 메타 키는 제외 */
function share(table, key) {
  const ws = Object.entries(table || {}).filter(([k]) => !k.startsWith('_'));
  const sum = ws.reduce((a, [, v]) => a + v.w, 0);
  return sum ? (table[key]?.w ?? 0) / sum : 0;
}

/** 같은 군종·경로·특기를 뽑을 확률 (%) — 스펙 §7-3 (병사 중에서) */
export function rarity(S, rules) {
  const w = rules.weights;
  // 주특기는 soldier-mos.json 키에서 균등 추첨 → 균등 점유율 (가정 — drawMos 참조)
  const mosShare = 1 / Object.keys(rules.soldierMos[S.branch]).length;
  return 100 * share(w.branch[S.status], S.branch)
    * share(w.route[S.status], S.route) * mosShare;
}

const nowYear = (rules) => rules.era?.range?.[1] ?? 2026;
// 입영 직후 계급 (초임계급 예외면 이병이 아닐 수 있다): 첫 진급 전 계급
const rankAt0 = (S) => (S.dates.promotions[0]?.rank ?? S.rank + 1) - 1;
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
    movie: pickMovie(S.log),
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
    people: S.env.people.map((p) => ({ role: p.role, name: p.name, label: p.label, rel: Math.round(p.rel) })),
    hist,
    lowest,
    highest,
    rarity: rarity(S, rules),
    focus: S.focus,
    train: { ...S.train },
    rewards: S.rewards || [],
    body: S.body ? { ...S.body } : null,
    hospital: S.hospital ?? 0,
    era: S.era ? { label: S.era.label, blurb: S.era.blurb } : null,
    // 같은 달 수·같은 계급으로 지금(nowYear) 복무했다면 받았을 봉급 — 시대 비교용
    paidNow: hist.reduce((a, h) => a + getMonthlyPay(rules, S.status, (S.dates.promotions.filter((p) => p.date.slice(0, 7) <= h.ym).at(-1)?.rank) ?? rankAt0(S), nowYear(rules)), 0),
    nowYear: nowYear(rules),
  };
}

/** 한 판을 대표하는 한 줄 — 앞 규칙일수록 큰 일. 개인의 일이 없으면 마지막 결정, 그것도 없으면 평가 포상·보직 */
const BIG = [/군사재판|의병 전역|부적합 전역|의가사 전역|단축 전역/, /강등|군기교육|영창|징계/, /손을 들었습니다|표창/, /탈영|사고|수도병원에 입원|부상/];
const SMALL = [/포상휴가 [0-9]+일을 받|특등|특급/, /차출|열쇠|맡게|보직/, /^휴가 [0-9]+일/]; // 휴가 행동은 매번 하는 선택이라 맨 뒤
// 시대 사건(누구나 겪는 일)은 한 줄 요약에서 뺀다
const SHARED = /월드컵 4강|연평도|초계함|코로나로|GP 하나가/;
const ENDING_LINES = new Set(Object.values(ENDINGS));
// 결정이 흔든 크기 — 스탯 변화 + 관계 변화의 절반 (엔진 tagFx가 단 값)
const impact = (l) => Object.values(l.fx ?? {}).reduce((a, v) => a + Math.abs(v), 0) + Object.values(l.rel ?? {}).reduce((a, v) => a + Math.abs(v), 0) / 2;
export function headline(log, avoid = new Set()) {
  // 징계·조기 전역 줄은 바로 앞의 이야기 줄에 붙인다 ("…그날 밤 집합당했습니다. — 휴가단축 2일")
  const lines = [];
  for (const l of log) {
    if (NOISE.test(l.text) || SHARED.test(l.text) || /입소|수료|진급|입영|병역판정|월급|취미 시작|마음속에|^전역 \(/.test(l.text)) continue;
    const tag = ENDING_LINES.has(l.text) ? l.text : l.text.match(/^징계: (.+)$/)?.[1] ?? (/^부대 출타 통제/.test(l.text) ? '' : null);
    if (tag != null && lines.length) { if (tag) lines.at(-1).text += ` — ${tag}`; continue; }
    lines.push({ ...l });
  }
  // 후보를 우선순위대로 — avoid에 있는 줄은 건너뛴다 (같은 날 입대한 사람들끼리 한 줄이 겹치지 않게)
  const cands = [...BIG.flatMap((re) => lines.filter((x) => re.test(x.text))),
    ...lines.filter((l) => l.decision && !SMALL.some((re) => re.test(l.text)) && !/^결정: /.test(l.text)).sort((a, b) => impact(b) - impact(a)),
    ...SMALL.flatMap((re) => lines.filter((x) => re.test(x.text))), ...lines.slice().reverse()].map((l) => l.text);
  return cands.find((t) => !avoid.has(t.slice(0, 20))) ?? cands[0] ?? '조용히 지나갔습니다.';
}

/**
 * 같은 날 입대한 사람들 (n명). 내 입영일로 다른 시드의 판을 자동으로 끝까지 돌려 요약한다.
 * 군종·특기·근무지는 각자 추첨 — "같은 날 들어가도 이렇게 다르다"를 보여 주는 칸.
 */
export function cohort(S, rules, events, n = 3) {
  const used = new Set([headline(S.log).slice(0, 20)]);
  const names = Array.from({ length: n }, (_, i) => ({ role: 'peer', i }));
  namePeople(makeRng(`${S.seed}-cohort`), rules.env, names, Number(S.dates.enlist.slice(0, 4)));
  return names.map(({ name }, i) => {
    const C = newGame(`${S.seed}-c${i}`, rules, { birth: S.birth });
    C.age = S.age;
    enlist(C, rules, S.dates.enlist);
    runGame(C, rules, { events, pick: 'random' });
    return { name, branch: C.branch, mos: C.mos, post: C.env.post, rank: rankName(rules, C.status, C.rank),
      ending: C.ending ? ENDINGS[C.ending] : '만기 전역', early: !!C.ending, line: (() => { const h = headline(C.log, used); used.add(h.slice(0, 20)); return h; })(),
      reward: (C.rewards ?? []).reduce((a, r) => a + r.days, 0), punished: !!C.discipline?.length, mood: avgMood(C) };
  });
}
const avgMood = (S) => Math.round((S.hist ?? []).reduce((a, h) => a + h.mood, 0) / Math.max(1, S.hist?.length ?? 0));

/**
 * 같은 날 입대한 n명 안에서 나는 어디쯤인가 (cohort를 n명으로 돌린 요약). 앞의 3명은 cohort(…, 3)과 같은 사람이다.
 * 반환: { n, early, punished, rewardTop(%), moodTop(%) } — Top은 "상위 몇 %" (작을수록 위)
 */
export function cohortStats(S, rules, events, n = 40) {
  const C = cohort(S, rules, events, n);
  const mine = { reward: (S.rewards ?? []).reduce((a, r) => a + r.days, 0), mood: avgMood(S) };
  const top = (k) => Math.max(1, Math.round((100 * (1 + C.filter((c) => c[k] > mine[k]).length)) / (n + 1)));
  return { n, people: C, early: C.filter((c) => c.early).length, punished: C.filter((c) => c.punished).length, rewardTop: top('reward'), moodTop: top('mood') };
}
