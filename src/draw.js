// draw.js — 신체등급·신분(병만)·군종·경로·특기 추첨 (§6)
// 모든 가중치는 rules/weights.json에서 오며, 각 항목에 src(또는 "가정")가 있어야 한다.

import { wpick } from './rng.js';

/** 신체등급 1~7 (정수 반환) */
export function drawGrade(rng, weights) {
  return Number(wpick(rng, weights.grade));
}

/** 신분. S.applied(지원 선택)가 있으면 그대로 사용 */
export function drawStatus(rng, weights, applied) {
  if (applied) return applied;
  return wpick(rng, weights.status);
}

/** 군종 (신분별 테이블) */
export function drawBranch(rng, weights, status) {
  const t = weights.branch[status];
  if (!t) throw new Error(`drawBranch: no table for status ${status}`);
  return wpick(rng, t);
}

/**
 * 경로 (신분별 테이블).
 * 설계 §6의 filterEligible(나이·학력 비활성)은 M2 pre 페이즈에서 구현 —
 * M1에서는 테이블 그대로 추첨한다.
 */
export function drawRoute(rng, weights, status) {
  const t = weights.route[status];
  if (!t) throw new Error(`drawRoute: no table for status ${status}`);
  return wpick(rng, t);
}

/**
 * 주특기: rules/soldier-mos.json 군종 키에서 균등 추첨 (가정 —
 * 병과별 전형 통계가 공개되지 않아 모든 주특기를 같은 확률로 본다).
 */
export function drawMos(rng, branch, soldierMos) {
  const keys = Object.keys(soldierMos?.[branch] ?? {});
  if (!keys.length) throw new Error(`drawMos: no soldier mos keys for branch ${branch}`);
  return wpick(rng, keys.map((k) => [k, 1]));
}

/**
 * 일괄 추첨. opts로 특정 항목을 고정할 수 있다
 * (테스트 결정론용). 고정된 항목은 RNG를 소모하지 않는다.
 * extra.soldierMos: 주특기 추첨용 (rules.soldierMos).
 * 추첨 순서: grade → status → branch → route → mos (§6)
 */
export function drawAll(rng, weights, opts = {}, extra = {}) {
  const grade = opts.grade ?? drawGrade(rng, weights);
  const status = drawStatus(rng, weights, opts.status);
  const branch = opts.branch ?? drawBranch(rng, weights, status);
  const route = opts.route ?? drawRoute(rng, weights, status);
  const mos = opts.mos ?? drawMos(rng, branch, extra.soldierMos);
  return { grade, status, branch, route, mos };
}

/** 인물 한 명의 특성 → 표시용 수식어. 예: "일은 잘하는데 무서운", "폐급" */
export function personLabel(env, ability, temper) {
  const t = env.people.temper[temper];
  if (ability === 'low' && temper === 'awkward') return '폐급';
  if (ability === 'high') return t.pos ? `일도 잘하고 ${t.adj}` : `일은 잘하는데 ${t.adj}`;
  if (ability === 'low') return t.pos ? `일은 못하지만 ${t.adj}` : `일도 못하는데 ${t.adj}`;
  return t.adj;
}

/**
 * 복무 환경 추첨 (rules/env.json). 근무지 → 분위기 → 중대장 → 인물 → 개인 성향 → 훈련 일정 → 지역.
 * enlistYm·months는 훈련 일정 배치용. 훈련 테이블이 없는 근무지는 빈 일정.
 */
export function drawEnv(rng, env, { branch, enlistYm, months }) {
  const post = wpick(rng, Object.entries(env.post[branch]).map(([k, v]) => [k, v.w]));
  const mood = wpick(rng, env.mood);
  const captain = wpick(rng, env.captain);
  const people = env.people.roles.map((r) => {
    const ability = wpick(rng, env.people.ability);
    const temper = wpick(rng, env.people.temper);
    return {
      role: r.id,
      ability,
      temper,
      label: personLabel(env, ability, temper),
      rel: 50 + env.people.temper[temper].rel,
      ahead: r.ahead ? r.ahead[0] + Math.floor(rng() * (r.ahead[1] - r.ahead[0] + 1)) : null,
    };
  });
  const self = { smoker: rng() < env.self.smoker.p, exercise: wpick(rng, env.self.exercise), temper: rng() < (env.self.temper?.p ?? 0) };
  // 훈련 일정: 복무 기간의 각 연도마다 p 확률로 months 중 하나 (입영~전역 범위 안만)
  const drills = [];
  const [y0, m0] = enlistYm.split('-').map(Number);
  const endIdx = y0 * 12 + m0 - 1 + months;
  for (let y = y0; y * 12 <= endIdx; y++) {
    for (const d of env.drills[post] || []) {
      if (rng() >= d.p) continue;
      const m = d.months[Math.floor(rng() * d.months.length)];
      const idx = y * 12 + m - 1;
      if (idx < y0 * 12 + m0 - 1 || idx > endIdx) continue;
      drills.push({ id: d.id, ym: `${y}-${String(m).padStart(2, '0')}`, label: d.label, scale: d.scale });
    }
  }
  drills.sort((a, b) => (a.ym < b.ym ? -1 : 1));
  // 부조리 지수: 분위기 + 중대장 + 병 인물(행보관·소대장 제외) 성격. 추첨 없이 계산만
  const A = env.abuse;
  const raw = A.mood[mood] + A.captain[captain]
    + people.filter((p) => p.ahead !== null).reduce((a, p) => a + (A.temper[p.temper] ?? 0), 0);
  const abuse = Math.max(0, Math.min(100, raw));
  // 지역: 근무지 안에서 맨 마지막에 추첨 (앞선 추첨 순서를 바꾸지 않게). 사건 when.place가 tags를 본다
  const places = env.post[branch][post].places;
  const pk = places ? wpick(rng, places) : null;
  const place = pk ? { id: pk, label: places[pk].label, travel: places[pk].travel, tags: places[pk].tags } : null;
  return { post, mood, captain, people, self, drills, abuse, place };
}

/** 인물 한 명 추첨 (후임·교체 인물용). others와 이름이 겹치지 않는다 */
export function drawPerson(rng, env, role, ahead, enlistYear, others = []) {
  const ability = wpick(rng, env.people.ability);
  const temper = wpick(rng, env.people.temper);
  const p = { role, ability, temper, label: personLabel(env, ability, temper), rel: 50 + env.people.temper[temper].rel, ahead };
  const taken = others.map((o) => o.name);
  const one = [p];
  do namePeople(rng, env, one, enlistYear); while (taken.includes(p.name));
  return p;
}

/**
 * 인물 이름 (rules/env.json people.names). 별도 RNG 스트림으로 뽑아 기존 추첨·사건 결과를 바꾸지 않는다.
 * 인물 출생 연대 = 입영연도 − 20 − born[역할] → 그 연대의 인기 이름. 한 판 안에서 이름이 겹치지 않는다
 */
export function namePeople(rng, env, people, enlistYear) {
  const N = env.people.names;
  const decades = Object.keys(N.given).sort();
  const used = new Set();
  for (const p of people) {
    const d = String(Math.floor((enlistYear - 20 - (N.born[p.role] ?? 0)) / 10) * 10);
    const pool = N.given[decades.filter((x) => x <= d).at(-1) ?? decades[0]];
    let name;
    do name = wpick(rng, N.surname) + pool[Math.floor(rng() * pool.length)]; while (used.has(name));
    used.add(name);
    p.name = name;
  }
}

/** 입대 연도 — era.json range [from, to] 안에서 균등 (가정: 연도별 입영 인원 차이는 무시). 시드마다 고정 */
export function drawYear(rng, era) {
  const [a, b] = era?.range ?? [2026, 2026];
  return a + Math.floor(rng() * (b - a + 1));
}
