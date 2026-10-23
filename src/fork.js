// fork.js — 갈림길: "그때 다른 걸 골랐다면" (docs/fun-brainstorm.md A1)
// 결정 직전의 판을 통째로 떠 두었다가, 다른 선택지로 그 뒤를 끝까지 돌려 본다. 같은 시드·같은 스냅샷이면 같은 평행 인생 (결정론).
// 순수 함수. 원래 판(S)과 스냅샷은 건드리지 않는다.

import { fire, tick, endMonth, runGame, ENDINGS } from './engine.js';
import { rankName } from './rules.js';
import { headline } from './recap.js';
import { josa } from './text.js';

/** 결정 창이 열린 순간의 판을 뜬다. 큐 항목의 ref(함수가 든 사건 객체)는 id로 다시 붙이므로 뺀다 */
export function snapshot(S) {
  return structuredClone({ ...S, queue: S.queue.map(({ ref, ...it }) => it) });
}

/** 스냅샷 → 진행할 수 있는 판. 큐의 ref를 사건 id로 되살린다 */
function revive(snap, events) {
  const S = structuredClone(snap);
  const byId = new Map(events.map((e) => [e.id, e]));
  S.queue = S.queue.map((it) => (it.id ? { ...it, ref: byId.get(it.id) } : it));
  return S;
}

/**
 * 스냅샷의 첫 큐 항목(열려 있던 결정)을 k로 고르고, 남은 복무는 무난한 기본값(첫 선택지)으로 끝까지 돌린다.
 * 화면과 같은 순서로 부른다: 결정 창이 build를 한 번 부르고(openDecision), 고르면 fire가 다시 build한다.
 * 같은 세상: 결정 직후 난수 줄기를 스냅샷에서만 정해지는 값으로 다시 맞춘다. 선택지마다 뽑은 난수 개수가 달라도
 * 그 뒤 세상(사건 추첨·확률)은 같은 줄기를 쓰므로, 두 평행 인생의 차이는 그 선택이 남긴 것(흔적·관계·징계·스탯)에서 온다.
 * 반환: 끝난 판 S와 그 결정의 결과 줄
 */
export function forkLife(snap, rules, events, k) {
  const S = revive(snap, events);
  const item = S.queue.shift();
  if (item?.kind !== 'decision') throw new Error('forkLife: snapshot must be paused on a decision');
  item.ref.build(S);
  fire(S, rules, item, { choice: k });
  const now = S.log.at(-1);
  S.rngState = (snap.rngState ^ 0x666f726b) >>> 0;
  if (tick(S, rules, 1, { auto: true }) === 'paused') throw new Error('forkLife: paused in auto mode');
  endMonth(S, rules);
  if (S.phase !== 'end') runGame(S, rules, { events });
  return { S, now };
}

const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const endOf = (S) => (S.ending ? `${S.hist.at(-1)?.ym ?? S.ym}-15` : S.dates.discharge);
const rewardDays = (S) => (S.rewards ?? []).reduce((a, r) => a + r.days, 0);
const avgMood = (S) => Math.round((S.hist ?? []).reduce((a, h) => a + h.mood, 0) / Math.max(1, S.hist?.length ?? 0));

/** 끝난 판 한 줄 요약 — 갈림길 카드와 비교용 */
export function lifeOf(S, rules) {
  return {
    ending: S.ending ? ENDINGS[S.ending] : '만기 전역',
    early: !!S.ending,
    rank: rankName(rules, S.status, S.rank),
    rankN: S.rank,
    days: days(S.dates.enlist, endOf(S)),
    discipline: (S.discipline ?? []).length,
    reward: rewardDays(S),
    mood: avgMood(S),
    savings: S.money.payout,
    line: headline(S.log),
    people: Object.fromEntries(S.env.people.map((p) => [p.role, { name: p.name, rel: Math.round(p.rel) }])),
  };
}

/**
 * 두 인생의 차이 → 사람이 읽는 줄 (큰 것부터, 최대 n개). a = 실제, b = 평행.
 * 점수(score)는 "얼마나 다른 인생이 됐나" — 갈림길 카드를 고르는 데 쓴다
 */
export function diffLives(a, b, n = 3) {
  const out = [];
  const add = (score, t) => out.push({ score, t });
  if (a.ending !== b.ending) add(100, `${a.ending} → ${b.ending}`);
  if (a.rankN !== b.rankN) add(40, `최종 계급 ${a.rank} → ${b.rank}`);
  if (a.discipline !== b.discipline) add(25 * Math.abs(a.discipline - b.discipline), b.discipline > a.discipline ? `징계 ${b.discipline - a.discipline}건 더` : `징계 ${a.discipline - b.discipline}건 덜`);
  if (Math.abs(a.days - b.days) >= 7) add(Math.min(60, Math.abs(a.days - b.days) / 3), `복무 ${a.days}일 → ${b.days}일`);
  if (a.reward !== b.reward) add(4 * Math.abs(a.reward - b.reward), `포상휴가 ${a.reward}일 → ${b.reward}일`);
  for (const [role, p] of Object.entries(a.people)) {
    const q = b.people[role];
    if (q && Math.abs(p.rel - q.rel) >= 15) { const nm = p.name ?? role; add(Math.abs(p.rel - q.rel) / 2, `${nm}${josa(nm, '와')}의 사이 ${p.rel} → ${q.rel}`); }
  }
  if (Math.abs(a.mood - b.mood) >= 3) add(3 * Math.abs(a.mood - b.mood), `평균 기분 ${a.mood} → ${b.mood}`);
  out.sort((x, y) => y.score - x.score);
  return { score: out.reduce((s, x) => s + x.score, 0), lines: out.slice(0, n).map((x) => x.t) };
}

/**
 * 전역 화면의 갈림길 카드: 실제로 물었던 결정들(forks: [{snap, id, title, choices, k}])마다
 * 내가 고른 길과 안 고른 길을 같은 세상(forkLife)에서 끝까지 돌려, 가장 크게 갈린 n개를 고른다.
 * 비교 기준은 실제 판이 아니라 "내 선택 + 그 뒤 무난하게" — 그래야 차이가 그 선택 하나에서 온다. 같은 결정에선 가장 크게 갈린 선택지 하나만.
 */
export function forkReport(rules, events, forks, n = 3) {
  const cards = [];
  for (const f of forks) {
    const base = lifeOf(forkLife(f.snap, rules, events, f.k).S, rules);
    let best = null;
    for (const c of f.choices.filter((c) => c.k !== f.k)) {
      const { S: alt, now } = forkLife(f.snap, rules, events, c.k);
      const life = lifeOf(alt, rules);
      const d = diffLives(base, life);
      if (d.score > (best?.score ?? 0)) best = { ym: f.snap.ym, id: f.id, title: f.title, picked: f.choices.find((x) => x.k === f.k)?.label, alt: c.label, now: now?.text ?? '', base, life, score: d.score, lines: d.lines };
    }
    if (best) cards.push(best);
  }
  return cards.sort((a, b) => b.score - a.score || a.ym.localeCompare(b.ym)).slice(0, n).sort((a, b) => a.ym.localeCompare(b.ym));
}
