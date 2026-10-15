// rules.js — rules/*.json 로드 + 조회 (§2)
// M1은 Node 환경이므로 fs로 동기 로드한다. (브라우저용 fetch 로더는 M5에서)

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** rules/ 디렉터리에서 11개 JSON을 읽어 객체로 반환 */
export function loadRules(dir = join(here, '..', 'rules')) {
  const read = (n) => JSON.parse(readFileSync(join(dir, n), 'utf8'));
  return {
    service: read('service.json'),
    promotion: read('promotion.json'),
    retirement: read('retirement.json'),
    pay: read('pay.json'),
    leave: read('leave.json'),
    weights: read('weights.json'),
    assumptions: read('assumptions.json'),
    env: read('env.json'),
    training: read('training.json'),
    soldierMos: read('soldier-mos.json'),
    hobbies: read('hobbies.json'),
  };
}

/** 복무개월: getServiceMonths(rules, 'soldier', 'army') → 18 */
export function getServiceMonths(rules, status, branch, route) {
  const sm = rules.service.serviceMonths;
  if (status === 'soldier') {
    const e = sm.soldier[branch];
    if (!e) throw new Error(`getServiceMonths: unknown branch ${branch}`);
    return e.m;
  }
  if (status === 'nco') {
    return (route === 'nco_long' ? sm.nco.long : sm.nco.short).m;
  }
  if (status === 'officer') {
    const map = { academy: 'academy', kma3: 'ocs3', rotc: 'rotc', bachelor: 'bachelor', ocs: 'cadet' };
    const key = map[route];
    if (!key || !sm.officer[key]) throw new Error(`getServiceMonths: unknown officer route ${route}`);
    return sm.officer[key].m;
  }
  if (status === 'warrant') return sm.warrant.standard.m;
  throw new Error(`getServiceMonths: unknown status ${status}`);
}

/** 양성교육 개월 수 (주 → 월 환산, 올림). 육군 5주 → 2개월. 장교는 경로별 양성교육+초군반 (officerEdu) */
export function getTrainingMonths(rules, branch, status, route) {
  const weeks = status === 'officer' ? rules.service.officerEdu[route]?.weeks : rules.service.trainingWeeks[branch]?.w;
  if (!weeks) throw new Error(`getTrainingMonths: unknown branch ${branch}`);
  return Math.max(1, Math.ceil(weeks / 4.34524));
}

/** 정기/연가 일수 */
export function getLeaveDays(rules, status, branch) {
  if (status === 'soldier') {
    const e = rules.leave.soldier.regular[branch];
    if (!e) throw new Error(`getLeaveDays: unknown branch ${branch}`);
    return e.d;
  }
  const e = rules.leave[status]?.annual;
  if (!e) throw new Error(`getLeaveDays: unknown status ${status}`);
  return e.d;
}

/**
 * 월 급여(원). 병은 rank 0~3(이병~병장), 간부는 초임 1호봉.
 * M1: 간부 진급분 미반영 — 초임 호봉 고정 (M3에서 호봉/진급 반영)
 */
export function getMonthlyPay(rules, status, rank = 0) {
  if (status === 'soldier') {
    const e = rules.pay.soldier[String(rank)];
    if (!e) throw new Error(`getMonthlyPay: unknown soldier rank ${rank}`);
    return e.m;
  }
  if (status === 'nco') return (rank ? rules.pay.nco1.staffSergeant : rules.pay.nco1.sergeant).m; // 중사 초임 예외 (rules.promotion.startException)
  if (status === 'officer') return rules.pay.officer1.secondLieutenant.m;
  if (status === 'warrant') return rules.pay.warrant1.warrantOfficer.m;
  throw new Error(`getMonthlyPay: unknown status ${status}`);
}

/** 계급명. rank는 신분별 rules.promotion[status].rankNames 인덱스 (병 0=이병, 부사관 0=하사, 장교 0=소위) */
export function rankName(rules, status, rank) {
  return rules.promotion[status]?.rankNames?.[rank] ?? `rank${rank}`;
}

/**
 * 신분·군종별 신병 교육기관. 군종별 항목이 없으면 신분별 폴백.
 * → {name, place?, weeks?, src}
 */
export function getTrainingCenter(rules, status, branch) {
  const t = rules.training?.center?.[status]?.[branch]
    || rules.training?.center?._fallback?.[status];
  if (!t) throw new Error(`getTrainingCenter: no entry for ${status}/${branch}`);
  return t;
}

/** 부대 평균 나이 (기본 22). S.flags.ageGap = 입영 나이 − 평균 */
export function getAvgAge(rules, branch) {
  return rules.training?.avgAge?.[branch] ?? 22;
}
