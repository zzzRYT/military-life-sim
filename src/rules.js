// rules.js — rules/*.json 로드 + 조회 (§2)
// M1은 Node 환경이므로 fs로 동기 로드한다. (브라우저용 fetch 로더는 M5에서)

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** rules/ 디렉터리에서 10개 JSON을 읽어 객체로 반환 */
export function loadRules(dir = join(here, '..', 'rules')) {
  const read = (n) => JSON.parse(readFileSync(join(dir, n), 'utf8'));
  return {
    service: read('service.json'),
    promotion: read('promotion.json'),
    pay: read('pay.json'),
    leave: read('leave.json'),
    weights: read('weights.json'),
    assumptions: read('assumptions.json'),
    env: read('env.json'),
    training: read('training.json'),
    soldierMos: read('soldier-mos.json'),
    hobbies: read('hobbies.json'),
    era: read('era.json'),
  };
}

/** 복무개월: getServiceMonths(rules, 'soldier', 'army') → 18. enlistIso를 주면 그 입영일의 시대 규정 (getService) */
export function getServiceMonths(rules, status, branch, enlistIso) {
  const sm = rules.service.serviceMonths;
  if (status === 'soldier') {
    if (enlistIso) return getService(rules, branch, enlistIso).months;
    const e = sm.soldier[branch];
    if (!e) throw new Error(`getServiceMonths: unknown branch ${branch}`);
    return e.m;
  }
  throw new Error(`getServiceMonths: unknown status ${status}`);
}

/** 양성교육 개월 수 (주 → 월 환산, 올림). 육군 5주 → 2개월 */
export function getTrainingMonths(rules, branch) {
  const weeks = rules.service.trainingWeeks[branch]?.w;
  if (!weeks) throw new Error(`getTrainingMonths: unknown branch ${branch}`);
  return Math.max(1, Math.ceil(weeks / 4.34524));
}

/** 정기/연가 일수 */
export function getLeaveDays(rules, status, branch) {
  const e = status === 'soldier' && rules.leave.soldier.regular[branch];
  if (!e) throw new Error(`getLeaveDays: unknown ${status}/${branch}`);
  return e.d;
}

/** 월 급여(원). 병 rank 0~3(이병~병장) */
export function getMonthlyPay(rules, status, rank = 0, year) {
  if (status === 'soldier') {
    const py = rules.era?.pay;
    const y = year && py && Object.keys(py).filter((k) => !k.startsWith('_') && +k <= year).at(-1);
    if (y) return py[y][rank];
    const e = rules.pay.soldier[String(rank)];
    if (!e) throw new Error(`getMonthlyPay: unknown soldier rank ${rank}`);
    return e.m;
  }
  throw new Error(`getMonthlyPay: unknown status ${status}`);
}

/** 계급명. rank = rules.promotion[status].rankNames 인덱스 (0=이병 ~ 3=병장) */
export function rankName(rules, status, rank) {
  return rules.promotion[status]?.rankNames?.[rank] ?? `rank${rank}`;
}

/** 군종별 신병 교육기관 → {name, place?, weeks?, src} */
export function getTrainingCenter(rules, status, branch) {
  const t = rules.training?.center?.[status]?.[branch];
  if (!t) throw new Error(`getTrainingCenter: no entry for ${status}/${branch}`);
  return t;
}

/** 부대 평균 나이 (기본 22). S.flags.ageGap = 입영 나이 − 평균 */
export function getAvgAge(rules, branch) {
  return rules.training?.avgAge?.[branch] ?? 22;
}

/** 입영 연도의 시대 (rules/era.json eras: from 오름차순). 범위 밖이면 가장 가까운 시대 */
export function eraOf(rules, year) {
  const eras = rules.era?.eras ?? [];
  return eras.filter((e) => e.from <= year).at(-1) ?? eras[0] ?? null;
}

/** 일수 차 (b − a) */
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

/**
 * 입영일 기준 복무 규정 → { months, cutDays }. 전역일 = 만료일(입영일, months) − cutDays.
 * rules.era.service[branch]: [{from, m, cut?: {start, every, base?, max?}}] (from 오름차순).
 * cut: 점진 단축 — 감축일수 = min(max, base + floor((입영일 − start)/every) + 1) (research/era-official.md §1-3)
 */
export function getService(rules, branch, enlistIso) {
  const row = rules.era?.service?.[branch]?.filter((r) => r.from <= enlistIso).at(-1);
  if (!row) return { months: getServiceMonths(rules, 'soldier', branch), cutDays: 0 };
  if (!row.cut) return { months: row.m, cutDays: 0 };
  const { start, every, base = 0, max = Infinity } = row.cut;
  return { months: row.m, cutDays: Math.max(0, Math.min(max, base + Math.floor(dayDiff(start, enlistIso) / every) + 1)) };
}

/** 병 진급 단계 [이병, 일병, 상병] 개월. 육군 18개월 시대는 2-6-6 [S5 제32조], 그 전은 그 시절 육군 복무개월에 비례 (21개월 → 3-7-7은 2014 확인 [S_era_60], 나머지는 가정) */
export function promoSteps(rules, enlistIso) {
  const m = getService(rules, 'army', enlistIso).months;
  return m <= 18 ? [2, 6, 6] : [Math.ceil((2 * m) / 18), Math.round((6 * m) / 18), Math.round((6 * m) / 18)];
}
