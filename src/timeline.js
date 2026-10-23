// timeline.js — 나의 복무 한 줄 (docs/fun-brainstorm.md E1): 입영~전역을 한 줄로 펴고, 지금 어디쯤인지·지나온 갈림길·되돌아온 선택·앞으로 올 일을 놓는다.
// 순수 함수. 위치 x는 0~1 (입영 = 0, 예정 전역 = 1). 화면은 proto.html renderTimeline이 그린다.

import { monthsBetweenYm, shiftMonth } from './date.js';
import { rankName } from './rules.js';
import { leaveYm } from './engine.js';
import { ROLE_NAME } from './text.js';

const clamp = (v) => Math.max(0, Math.min(1, v));
const day = (iso) => Number(iso.slice(8, 10)) || 1;
// 결과 줄의 무게: 스탯 변화 합 + 관계 변화 합의 절반 (recap.js impact와 같은 식, 부호 유지)
const tone = (l) => Object.values(l.fx ?? {}).reduce((a, v) => a + v, 0) + Object.values(l.rel ?? {}).reduce((a, v) => a + v, 0) / 2;

/**
 * S → { from, to, n, now, ranks, moods, pins, links, ahead, next }
 * - ranks: [{rank, label, x0, x1}] 계급 구간 (진급일 기준)
 * - moods: [{x, mood}] 지난 달의 기분 (S.hist)
 * - pins: [{x, ym, id?, kind: 'fork'|'echo'|'bad'|'good', text, tone, from?}] — fork = 내가 고른 결정, echo = 앞의 일이 돌아온 줄
 * - links: [{x0, x1, ym0, ym1}] 되부르기: 원래 흔적의 달 → 돌아온 달
 * - ahead: [{x, ym, kind: 'promo'|'out'|'in'|'end', label}] 아직 안 온 일 (가까운 순)
 * - next: ahead 중 가장 가까운 두 개를 "상병 진급까지 23일" 식 문장으로
 */
export function timeline(S, rules) {
  const from = S.dates.enlist.slice(0, 7), to = S.dates.discharge.slice(0, 7);
  const n = monthsBetweenYm(from, to) + 1;
  const xYm = (ym, f = 0.5) => clamp((monthsBetweenYm(from, ym) + f) / n);
  const xIso = (iso) => xYm(iso.slice(0, 7), (day(iso) - 1) / 30);
  const nowYm = S.ym, nowF = Math.min(1, Math.max(0, S.t ?? 0));
  const now = S.phase !== 'end' ? xYm(nowYm, nowF) : S.ending ? xYm(S.hist?.at(-1)?.ym ?? nowYm, 1) : 1; // 조기 종료면 마지막 달 끝에서 멈춘다

  // 계급 구간: 입영 때 계급 → 진급일마다 다음 계급 (초임계급 예외·강등 반영된 S.dates.promotions 그대로)
  const promos = S.dates.promotions;
  let r0 = (promos[0]?.rank ?? S.rank + 1) - 1, x0 = 0;
  const ranks = [];
  for (const p of promos) {
    const x = xIso(p.date);
    ranks.push({ rank: r0, label: rankName(rules, S.status, r0), x0, x1: x });
    r0 = p.rank; x0 = x;
  }
  ranks.push({ rank: r0, label: rankName(rules, S.status, r0), x0, x1: 1 });

  const moods = (S.hist ?? []).filter((h) => h.ym >= from).map((h) => ({ x: xYm(h.ym), mood: h.mood }));

  const pins = [], links = [];
  for (const l of S.log) {
    if (l.ym < from) continue;
    const x = xYm(l.ym, Math.min(0.95, l.t ?? 0.5));
    if (l.echo) links.push({ x0: xYm(l.echo), x1: x, ym0: l.echo, ym1: l.ym });
    if (l.decision) pins.push({ x, ym: l.ym, id: l.id, kind: 'fork', text: l.text, tone: tone(l), from: l.echo });
    else if (l.echo) pins.push({ x, ym: l.ym, id: l.id, kind: 'echo', text: l.text, tone: tone(l), from: l.echo });
    else if (/^징계: |군사재판|의병 전역|부적합 전역|의가사 전역|단축 전역/.test(l.text)) pins.push({ x, ym: l.ym, kind: 'bad', text: l.text, tone: -10 });
    else if (/포상휴가 [0-9]+일을 받/.test(l.text)) pins.push({ x, ym: l.ym, kind: 'good', text: l.text, tone: 6 });
  }

  // 앞으로 올 일: 진급 · 선임 전역 · 맞후임 전입 · 내 전역
  const ahead = [];
  if (S.phase !== 'end') {
    for (const p of promos) if (xIso(p.date) > now) ahead.push({ x: xIso(p.date), ym: p.date.slice(0, 7), iso: p.date, kind: 'promo', label: `${rankName(rules, S.status, p.rank)} 진급` });
    for (const p of S.env?.people ?? []) {
      const nm = p.name ? `${ROLE_NAME[p.role]} ${p.name}` : ROLE_NAME[p.role];
      if (p.ahead > 0 && !p.gone && ['senior', 'roomSenior'].includes(p.role)) {
        const ym = leaveYm(S, p.role);
        if (ym && ym > nowYm) ahead.push({ x: xYm(ym), ym, kind: 'out', label: `${nm} 전역` });
      }
      if (p.ahead < 0) {
        const ym = shiftMonth(from, -p.ahead);
        if (ym > nowYm) ahead.push({ x: xYm(ym), ym, kind: 'in', label: `${nm} 전입` });
      }
    }
    ahead.push({ x: 1, ym: to, iso: S.dates.discharge, kind: 'end', label: '전역' });
    ahead.sort((a, b) => a.x - b.x);
  }
  const nowIso = `${nowYm}-${String(1 + Math.floor(nowF * 29)).padStart(2, '0')}`;
  const until = (a) => {
    if (a.iso) { const d = Math.round((new Date(a.iso) - new Date(nowIso)) / 864e5); return d <= 31 ? `${d}일` : `${Math.round(d / 30.4)}개월`; }
    return `${Math.max(1, monthsBetweenYm(nowYm, a.ym))}개월`;
  };
  const next = ahead.slice(0, 2).map((a) => `${a.label}까지 ${until(a)}`);
  return { from, to, n, now, ranks, moods, pins, links, ahead, next };
}
