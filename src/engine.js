// engine.js — 시간 엔진 (§5) — M1 최소 구현
// planMonth / tick / endMonth / chooseFeed (+ newGame/stepMonth/runGame).
// 사건·결정 콘텐츠(content/events.js)는 M2/M4에서 오므로,
// events 배열 파라미터로 주입받는다 (M1 테스트는 빈 배열).
// 단위: 월. 훈련소 구간 주 단위 해상도는 M2에서 (M1은 개월 단위, train 페이즈 존재).

import { makeRng, hashSeed, rngFloat, wpick } from './rng.js';
import {
  expireDate,
  soldierPromotions,
  shiftMonth,
  addDays,
  monthsBetweenYm,
} from './date.js';
import {
  getServiceMonths,
  getTrainingMonths,
  getLeaveDays,
  getMonthlyPay,
  rankName,
  getTrainingCenter,
  getAvgAge,
} from './rules.js';
import { drawAll, drawEnv } from './draw.js';

export const ENGINE_VER = 1;

/**
 * 훈련 초점 (UX §3 '이번 달의 초점'의 훈련판). 고른 항목의 숙련도가 매달 오르고,
 * 숙련도는 content/events.js 평가 사건의 포상 확률이 된다. fx: 초점 달의 소폭 스탯 변화. 수치는 전부 '가정'.
 */
export const TRAINING = {
  leadership: { label: '통솔력', fx: { rel: 1 } },
  marksman: { label: '사격술', fx: { mind: 1 } },
  foot: { label: '제식', fx: { mind: -1, rel: 1 } },
  fitness: { label: '체력단련', fx: { fit: 2, mind: -1 } },
  combat: { label: '전투기술', fx: { fit: 1, skill: 1 } },
};
const TRAIN_GAIN = 12; // 초점 한 달 상승폭 (숙련도가 높을수록 줄어듦)

/** 초점 변경. null = 고르게 (전 항목이 조금씩) */
export function setFocus(S, key) {
  if (key !== null && !TRAINING[key]) throw new Error(`setFocus: unknown ${key}`);
  S.focus = key;
}

/** 월말 훈련: 초점 항목 +GAIN×(1-v/100). 초점 없으면 전 항목에 절반 효율로 나눠서 (집중이 이기도록) */
function trainMonth(S) {
  const keys = S.focus ? [S.focus] : Object.keys(TRAINING);
  const gain = S.focus ? TRAIN_GAIN : TRAIN_GAIN / 2 / keys.length;
  for (const k of keys) S.train[k] = Math.round((S.train[k] + gain * (1 - S.train[k] / 100)) * 10) / 10;
  if (S.focus) applyFx(S, TRAINING[S.focus].fx);
}

/** S.rngState에서 [0,1) 하나 뽑고 상태 갱신. 사건 콘텐츠도 이걸로만 뽑는다 (결정론) */
export function rand(S) {
  const r = rngFloat(S.rngState);
  S.rngState = r.state;
  return r.value;
}

function log(S, text) {
  S.log.push({ ym: S.ym, t: Math.round(S.t * 1000) / 1000, text });
}

// ── 흔적 (docs/04 §3-1): 사건·결정이 남긴 이름 붙은 사실. needs/echo가 읽는다 ──
const list = (x) => (x == null ? [] : [].concat(x));
/** 흔적 조건. 'id'는 있어야, '!id'는 없어야 통과 */
export const has = (S, needs) => list(needs).every((m) => (m[0] === '!' ? !S.marks?.[m.slice(1)] : !!S.marks?.[m]));

/**
 * 되부르기 (§3-3): echo 중 조건 맞고 아직 안 쓴 첫 항목으로 결과 문구를 바꾸거나(t) 덧붙인다(add).
 * t·add는 문자열 또는 (S, out) => 문자열 ('' 이면 건너뜀). 항목마다 한 판에 한 번. 로그 줄에 원래 흔적의 연월을 단다
 */
function withEcho(S, ref, out) {
  if (!ref.echo || !out.t) return out;
  for (const [i, e] of ref.echo.entries()) {
    const key = `echo_${ref.id}_${i}`;
    if (S.flags[key] || !has(S, e.needs)) continue;
    const v = typeof (e.t ?? e.add) === 'function' ? (e.t ?? e.add)(S, out) : (e.t ?? e.add);
    if (!v) continue;
    S.flags[key] = true;
    return { ...out, t: e.t ? v : `${out.t} ${v}`, echoYm: S.marks[list(e.needs).find((m) => m[0] !== '!')]?.ym };
  }
  return out;
}

function clampSt(v) {
  return Math.max(0, Math.min(100, v));
}

function applyFx(S, fx) {
  if (!fx) return;
  for (const [k, v] of Object.entries(fx)) {
    if (k in S.st) S.st[k] = clampSt(S.st[k] + v);
  }
}

/**
 * 사건·결정 결과 적용. out = { t?, fx?, mark?: {set: {id: data}, del: [id]}, later?, rel?: {role: Δ}, punish?: {kind, n}, ban?: 개월, ending?: ENDINGS 키, shorten?: 총 복무개월 }
 * punish.kind: reprimand 견책 | confine 근신 | leaveCut 휴가단축(n일) | payCut 감봉(n개월) | drill 군기교육(n일) | demote 강등 [S3 제57조]
 */
function applyOut(S, out) {
  applyFx(S, out.fx);
  for (const [k, v] of Object.entries(out.mark?.set ?? {})) S.marks[k] = { ym: S.ym, ...v };
  for (const k of out.mark?.del ?? []) delete S.marks[k];
  if (out.later) S.delayed.push({ dueYm: shiftMonth(S.ym, out.later.inMonths), id: out.later.id });
  for (const [role, d] of Object.entries(out.rel || {})) {
    const p = S.env.people.find((x) => x.role === role);
    if (p) p.rel = clampSt(p.rel + d);
  }
  if (out.ban) {
    S.flags.leaveBanUntil = shiftMonth(S.ym, out.ban);
    log(S, `부대 출타 통제 (${out.ban}개월)`);
  }
  const pn = out.punish;
  if (pn) {
    (S.discipline ??= []).push({ ym: S.ym, ...pn });
    if (pn.kind === 'leaveCut') S.leave.left = Math.max(0, S.leave.left - pn.n);
    if (pn.kind === 'payCut') S.flags.payCutUntil = shiftMonth(S.ym, pn.n);
    if (pn.kind === 'drill') {
      // 군기교육 기간은 복무기간 불산입 → 전역일 연기 [S_new_1]
      S.dates.discharge = addDays(S.dates.discharge, pn.n);
    }
    if (pn.kind === 'demote' && S.rank > 0) {
      S.rank -= 1;
      S.dates.promotions = S.dates.promotions.slice(0, -1); // 마지막 진급 하나를 잃는다 → 한 계급 낮게 전역
    }
    const name = { reprimand: '견책', confine: '근신', leaveCut: `휴가단축 ${pn.n}일`, payCut: `감봉 ${pn.n}개월`, drill: `군기교육 ${pn.n}일`, demote: '강등' }[pn.kind];
    log(S, `징계: ${name}`);
  }
  if (out.shorten) {
    // 복무기간 단축 (병역법 제63조 ②: 6개월). 이미 넘겼으면 즉시 전역
    const d = expireDate(S.dates.enlist, out.shorten);
    if (d.slice(0, 7) <= S.ym) out = { ...out, ending: 'shortened' };
    else {
      S.dates.discharge = d;
      S.dates.promotions = S.dates.promotions.filter((p) => p.date <= d);
      log(S, `복무기간 단축 — 전역일 ${d}`);
    }
  }
  if (out.ending) {
    S.ending = out.ending;
    S.phase = 'end';
    log(S, ENDINGS[out.ending]);
  }
}

/** 조기 종료 사유 → 로그 문구. 근거는 content/events.js 각 사건의 src */
export const ENDINGS = {
  court: '군사재판 — 복무가 중단되었습니다.',
  medical: '의병 전역 (병역처분 변경)',
  unfit: '현역복무 부적합 전역',
  family: '의가사 전역 (전시근로역 편입)',
  shortened: '복무기간 단축 전역 (보충역 편입)',
};

function markFired(S, id) {
  S.flags['last_' + id] = S.ym;
  S.flags['n_' + id] = (S.flags['n_' + id] ?? 0) + 1;
  if (!S.recent.includes(id)) {
    S.recent.push(id);
    if (S.recent.length > 12) S.recent.shift();
  }
}

/**
 * 새 판 생성. opts: {birth (필수), enlist?, grade?, status?, branch?, route?, mos?, monthlyDeposit?}
 * - enlist가 있으면 바로 입영 처리 (하위 호환 — 기존 테스트·호출 그대로 동작).
 * - 없으면 20살 입영 전(pre) 상태에서 시작. deferYear()/enlist()로 진행한다.
 * 날짜 계산은 전부 date.js에 위임한다.
 */
export function newGame(seed, rules, opts = {}) {
  if (!opts.birth) throw new Error('newGame: opts.birth (YYYY-MM-DD) required');
  const rng = makeRng(seed);
  const drawn = drawAll(rng, rules.weights, opts, { soldierMos: rules.soldierMos });
  const { status, branch } = drawn;
  const { birth } = opts;
  const birthYear = Number(birth.slice(0, 4));
  const S = {
    seed: hashSeed(seed),
    ver: ENGINE_VER,
    slotId: `m1-${hashSeed(seed).toString(36)}`,
    rngState: (hashSeed(seed) ^ 0x9e3779b9) >>> 0,
    phase: 'pre', // 'pre' | 'train' | 'serve' | 'end' — 한 판은 전역에서 끝난다 (예비군·민방위 없음)
    ym: `${birthYear + 19}-01`,
    t: 0,
    birth,
    enlist: null,
    age: 20, // 한국 나이. 입영 전 페이즈에서 매년 +1
    year: birthYear + 19,
    grade: drawn.grade,
    status,
    branch,
    route: drawn.route,
    mos: drawn.mos,
    mosMech: null, // 입영 시점에 rules.soldierMos에서 확정 (병사만)
    hobby: null, // chooseHobby로 선택 (rules/hobbies.json id)
    bonds: null, // 아래에서 추첨 (입대 전 연애 여부 — 가정)
    env: null, // 입영 시점에 추첨 (drawEnv)
    training: null, // 입영 시점에 결정 (getTrainingCenter)
    rank: 0,
    dates: null, // 입영 시점에 계산
    defer: { usedDays: 0, count: 0 },
    st: { fit: 60, mind: 60, skill: 40, rel: 50 },
    money: { cash: 0, savings: 0, monthlyDeposit: opts.monthlyDeposit ?? 0, paid: 0, payout: 0 }, // paid: 받은 월급 누계, payout: 적금 만기 수령액
    leave: { left: 0, used: 0 }, // 입영 시점에 getLeaveDays로 설정
    score: 0,
    flags: {},
    marks: {}, // 흔적 (docs/04) — {id: {ym, ...}}
    log: [],
    queue: [],
    recent: [],
    delayed: [], // [{dueYm, id}] — 결정의 지연 결과
    hist: [], // [{ym, mood}] — 입영 후 월말 스냅샷 (전역 기록용)
    focus: opts.focus ?? null, // 훈련 초점 (TRAINING 키) · null = 고르게
    train: Object.fromEntries(Object.keys(TRAINING).map((k) => [k, 0])), // 훈련 숙련도 0~100
    rewards: [], // [{ym, kind, days}] — 평가 포상 (전역 기록용)
  };
  // 관계 스탯 초기화. lover 유무는 입대 전 연애 여부 추첨 (가정)
  S.bonds = { lover: rand(S) < 0.5 ? 70 : null, family: 60 };
  log(S, '20살 — 병역판정검사');
  if (opts.enlist) enlist(S, rules, opts.enlist, rng); // 하위 호환 경로
  return S;
}

/**
 * 입영. enlistIso (YYYY-MM-DD) 기준으로 복무 일정·환경·훈련소를 확정한다.
 * rngFn: drawEnv용 RNG. 생략하면 S.rngState 스트림 사용. newGame 하위 호환 경로는
 * drawAll 직후의 로컬 rng를 넘겨 기존 시드와 완전히 같은 결과를 낸다.
 */
export function enlist(S, rules, enlistIso, rngFn) {
  if (S.phase !== 'pre') throw new Error('enlist: phase must be pre');
  const months = getServiceMonths(rules, S.status, S.branch); // 훈련소 기간 포함
  // 초임계급 예외 — 별도 RNG 스트림이라 기존 추첨·사건 결과는 그대로다
  const r = makeRng(S.seed ^ 0x5ca1ab1e)();
  let acc = 0;
  const ex = (rules.promotion.startException?.[S.status] ?? []).find((e) => r < (acc += e.p));
  // 병: 사관학교·후보생 재학기간을 환산해 그만큼 먼저 입영한 것처럼 계급·전역일을 당긴다 (시행규칙 제34조, 병역법 시행령 제30조⑦)
  const credit = ex?.schoolMonths ? Math.min(months - 1, Math.floor(ex.schoolMonths * ex.ratio)) : 0;
  const base = credit ? `${shiftMonth(enlistIso.slice(0, 7), -credit)}${enlistIso.slice(7)}` : enlistIso;
  const discharge = expireDate(base, months);
  const all = soldierPromotions(base, months);
  const promotions = all.filter((p) => p.date > enlistIso);
  S.rank = ex?.rank ?? all.length - promotions.length;
  S.enlist = enlistIso;
  S.dates = { enlist: enlistIso, discharge, promotions }; // [{rank, date}] — 병만 (2-6-6)
  S.ym = enlistIso.slice(0, 7);
  S.t = 0;
  // 환경은 drawAll 뒤에 같은 rng로 — 기존 추첨 결과는 바뀌지 않는다
  const rf = rngFn || (() => rand(S));
  S.env = drawEnv(rf, rules.env, { branch: S.branch, enlistYm: S.ym, months });
  S.training = getTrainingCenter(rules, S.status, S.branch);
  S.trainWeeks = rules.service.trainingWeeks[S.branch].w; // 훈련소 주차 일정용
  // 주특기 메카닉 프로필 (leave·difficulty·injuryRisk 전부 가정 — rules/soldier-mos.json)
  S.mosMech = rules.soldierMos?.[S.branch]?.[S.mos] ?? null;
  // 주특기별 휴가 보정 (가정): leave 지수 3 → +20%, 2 → 그대로, 1 → −20%
  const mult = { 3: 1.2, 2: 1.0, 1: 0.8 }[S.mosMech?.leave] ?? 1;
  S.leave = { left: Math.max(0, Math.round(getLeaveDays(rules, S.status, S.branch) * mult)), used: 0 };
  if (ex) log(S, `${ex.label} — ${rankName(rules, S.status, S.rank)}부터 시작${credit ? ` (복무 ${credit}개월 인정)` : ''}`);
  const tc = S.training;
  log(S, `${tc.name}${tc.place ? `(${tc.place})` : ''} 입소`);
  // 나이 요소: 부대 평균(20~24) 대비 상대 나이 → 이벤트 조건·문구 분기용
  S.flags.ageGap = S.age - getAvgAge(rules, S.branch);
  if (S.flags.ageGap >= 3) log(S, `동기들보다 ${S.flags.ageGap}살 위로 입영했다`);
  else if (S.flags.ageGap <= -2) log(S, `동기들보다 ${-S.flags.ageGap}살 어린 나이에 입영했다`);
}

/** 입영 연기 사유 (v1: 플레이버 + 소폭 스탯). 나이가 진짜 레버다. */
export const DEFER_REASONS = {
  college: { label: '대학 진학', fx: { skill: 5 } },
  grad: { label: '대학원 진학', fx: { skill: 3 } },
  job: { label: '취업 준비', fx: { rel: 3 } },
  lang: { label: '어학연수', fx: { skill: 2, mind: 2 } },
  chill: { label: '그냥 미룸', fx: { mind: -3 } },
};

/** 입영 연기 상한 (한국 나이). 병무청 본인선택원 기준: 입영하는 해 28세까지 */
export const MAX_ENLIST_AGE = 28;

/**
 * 1년 연기. 'ok' | 'must-enlist'(28세 도달 — 더는 미룰 수 없음) 반환.
 * RNG를 소모하지 않아 결정론에 영향 없음.
 */
export function deferYear(S, rules, reason = 'chill') {
  if (S.phase !== 'pre') throw new Error('deferYear: phase must be pre');
  const r = DEFER_REASONS[reason] || DEFER_REASONS.chill;
  S.age += 1;
  S.year += 1;
  S.ym = `${S.year}-01`;
  S.defer.count += 1;
  applyFx(S, r.fx);
  log(S, `${S.age}살 — ${r.label}, 입영 1년 연기`);
  return S.age >= MAX_ENLIST_AGE ? 'must-enlist' : 'ok';
}

/**
 * 입영 나이 자동 결정 → 입영 (첫 화면 추첨 직후). RNG는 S.rngState 스트림.
 * 입영 연령 분포(weights.enlistAge, S19)에서 추첨, 그 해까지는 랜덤 사유로 연기.
 */
export function autoEnlist(S, rules) {
  const k = wpick(() => rand(S), rules.weights.enlistAge);
  const age = Math.min(MAX_ENLIST_AGE, Math.max(20, k === '25+' ? 25 : +k)); // 게임은 20살부터 — 19는 20으로
  const reasons = Object.keys(DEFER_REASONS);
  while (S.age < age) deferYear(S, rules, reasons[Math.floor(rand(S) * reasons.length)]);
  enlist(S, rules, `${S.year}-${String(1 + Math.floor(rand(S) * 12)).padStart(2, '0')}-01`);
}

/** 근무 환경 요약 — 사건 문구·취미 제약 분기용: 'train' | 'sea'(함정) | 'remote'(GOP·도서·산악 사이트) | 'land' */
export function where(S) {
  if (S.phase === 'train') return 'train';
  const p = S.env?.post ?? '';
  return p.startsWith('ship') ? 'sea' : ['gop', 'island', 'site'].includes(p) ? 'remote' : 'land';
}

/** 근무지(post id) 또는 지역 태그(rules/env.json places.tags)가 t인가 */
export const placeIs = (S, t) => S.env?.post === t || !!S.env?.place?.tags.includes(t);

/** 취미 선택. id가 rules.hobbies.hobbies에 있으면 S.hobby에 설정하고 true, 없으면 false */
export function chooseHobby(S, rules, id) {
  const ok = rules.hobbies?.hobbies?.some((h) => h.id === id);
  if (!ok) return false;
  S.hobby = id;
  return true;
}

/** 월 시작 시 페이즈 진입 처리 (입영 / 수료) */
function enterPhase(S, rules) {
  if (!S.dates) return; // 입영 전(pre): 입영일이 아직 없음
  const enlistYm = S.dates.enlist.slice(0, 7);
  if (S.phase === 'pre' && S.ym >= enlistYm) {
    S.phase = 'train';
    log(S, `입영 (${S.dates.enlist})`);
  }
  if (S.phase === 'train' && monthsBetweenYm(enlistYm, S.ym) >= getTrainingMonths(rules, S.branch)) {
    S.phase = 'serve';
    S.flags.serveYm = S.ym;
    log(S, '신병교육 수료 · 자대 배치');
  }
}

/**
 * chooseFeed — when·c 조건 통과한 사건을 w로 wpick.
 * 최근 사건 ×0.1, gap(재발 최소 간격, 개월) 미충족 제외.
 * 사건 1~2개 + 결정 최대 1개를 시점(0~1) 무작위로 반환.
 */
export function chooseFeed(S, events = []) {
  if (!events.length) return [];
  const month = Number(S.ym.slice(5, 7));
  const season = month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn';
  const pool = [];
  for (const e of events) {
    if (e.week != null) continue; // 주차 일정은 planMonth가 배치
    const when = e.when || {};
    if (when.phase && !when.phase.includes(S.phase)) continue;
    if (when.months && !when.months.includes(month)) continue;
    if (when.branch && !when.branch.includes(S.branch)) continue;
    if (when.season && when.season !== season) continue;
    if (when.place && !when.place.some((t) => placeIs(S, t))) continue;
    if (e.needs && !has(S, e.needs)) continue;
    if (e.gap) {
      const last = S.flags['last_' + e.id];
      if (last && monthsBetweenYm(last, S.ym) < e.gap) continue;
    }
    // 결정은 한 판에 max번(기본 1) — 같은 질문 반복 방지
    if (e.kind === 'decision' && (S.flags['n_' + e.id] ?? 0) >= (e.max ?? 1)) continue;
    if (e.c && !e.c(S)) continue;
    // p: 이 달에 후보가 될 절대 확률 (큰 사건용). w는 후보끼리의 상대 가중치
    if (e.p !== undefined && rand(S) >= (typeof e.p === 'function' ? e.p(S) : e.p)) continue;
    let w = e.w ?? 1;
    if (S.recent.includes(e.id)) w *= 0.1;
    pool.push([e, w]);
  }
  const rf = () => rand(S);
  const picked = [];
  const decisions = pool.filter(([e]) => e.kind === 'decision');
  if (decisions.length) picked.push(wpick(rf, decisions));
  let evts = pool.filter(([e]) => e.kind !== 'decision');
  const real = evts.filter(([e]) => !e.fallback); // fallback(조용한 달 등)은 다른 사건이 하나도 없을 때만
  if (real.length) evts = real;
  const n = 1 + Math.floor(rand(S) * 2); // 1~2개
  for (let i = 0; i < n && evts.length; i++) {
    const e = wpick(rf, evts);
    picked.push(e);
    evts = evts.filter(([x]) => x !== e);
  }
  return picked.map((e) => ({
    at: rand(S),
    kind: e.kind === 'decision' ? 'decision' : 'event',
    id: e.id,
    ref: e,
  }));
}

/**
 * planMonth — 큐 비우기 → 고정 일정(진급일, 전역일, 월급일) →
 * 지연 결과 → chooseFeed 사건/결정. 큐를 at 순으로 정렬한다.
 */
export function planMonth(S, rules, events = []) {
  S.queue = [];
  S.t = 0;
  // 지연 결과 (결정의 later)
  S.delayed = S.delayed.filter((d) => {
    if (d.dueYm <= S.ym) {
      const e = events.find((x) => x.id === d.id);
      if (e) S.queue.push({ at: 0.1, kind: 'event', id: e.id, ref: e });
      else log(S, `[지연 결과 누락: ${d.id}]`);
      return false;
    }
    return true;
  });
  // 고정 일정
  const ym = S.ym;
  for (const p of (S.dates?.promotions || [])) {
    if (p.date.slice(0, 7) === ym) S.queue.push({ at: 0.5, kind: 'promo', rank: p.rank, date: p.date });
  }
  if (S.phase === 'serve' && S.dates && S.dates.discharge.slice(0, 7) === ym) {
    S.queue.push({ at: 0.9, kind: 'discharge' });
  }
  if (S.phase === 'train' || S.phase === 'serve') {
    S.queue.push({ at: 0.85, kind: 'pay' }); // 전역(0.9)보다 먼저 — 마지막 달 적금도 만기에 포함
  }
  // 훈련소 주차 일정: week(N주차, 1~trainWeeks)를 훈련 페이즈 전체 길이에 비례해 펼쳐 고정 배치
  if (S.phase === 'train') {
    const m = monthsBetweenYm(S.dates.enlist.slice(0, 7), ym);
    const M = getTrainingMonths(rules, S.branch);
    for (const e of events) {
      if (e.week == null) continue;
      const t = (Math.min(typeof e.week === 'function' ? e.week(S) : e.week, S.trainWeeks + 0.45) - 0.5) / S.trainWeeks * M;
      if (Math.floor(t) === m) S.queue.push({ at: t - m, kind: e.kind, id: e.id, ref: e });
    }
  }
  for (const item of chooseFeed(S, events)) S.queue.push(item);
  S.queue.sort((a, b) => a.at - b.at);
}

/** 큐 항목 실행. 결정이 수동 모드면 'paused' 반환 */
export function fire(S, rules, item, opts = {}) {
  switch (item.kind) {
    case 'pay': {
      let pay = getMonthlyPay(rules, S.status, S.rank);
      if (S.flags.payCutUntil && S.ym < S.flags.payCutUntil) pay -= Math.floor(pay / 5); // 감봉: 월급 1/5 감액 [S_new_1]
      S.money.cash += pay;
      S.money.paid += pay;
      const dep = Math.min(S.money.monthlyDeposit, rules.pay.savings.monthlyCap.m);
      if (dep > 0 && S.money.cash >= dep) {
        S.money.cash -= dep;
        S.money.savings += dep;
      }
      log(S, `월급 +${pay}원${dep ? ` (적금 ${dep}원)` : ''}`);
      break;
    }
    case 'promo': {
      if (S.rank < item.rank) {
        S.rank = item.rank;
        log(S, `진급: ${rankName(rules, S.status, S.rank)} (${item.date})`);
      }
      break;
    }
    case 'discharge': {
      if (S.money.savings > 0) {
        const s = S.money.savings;
        S.money.cash += s * 2; // 원금 + 100% 매칭 (이자 제외 — M1 단순화)
        S.money.payout = s * 2;
        S.money.savings = 0;
        log(S, `내일준비적금 만기 수령 +${s * 2}원`);
      }
      S.phase = 'end';
      log(S, `전역 (${S.dates.discharge})`);
      break;
    }
    case 'event': {
      const out = withEcho(S, item.ref, item.ref.run(S) || {});
      if (out.t) { log(S, out.t); if (out.echoYm) S.log.at(-1).echo = out.echoYm; }
      applyOut(S, out);
      markFired(S, item.id);
      break;
    }
    case 'decision': {
      if (opts.auto === false && (opts.ask?.(item) ?? true)) return 'paused'; // ask: 이 결정을 물을지 (heart.js asks)
      const d = item.ref.build(S);
      // opts.choice: 수동 결정(UI)에서 고른 k. 없으면 첫 선택지 (자동 결정)
      const choice = opts.choice ? d.choices.find((c) => c.k === opts.choice) : d.choices[0];
      if (!choice) throw new Error(`decision ${item.id}: no choice ${opts.choice ?? '(none)'}`);
      const out = withEcho(S, item.ref, item.ref.apply(S, choice.k) || {});
      log(S, out.t || `결정: ${d.title} → ${choice.label}`);
      if (out.echoYm) S.log.at(-1).echo = out.echoYm;
      S.log.at(-1).decision = true; // 전역 기록(주마등)이 결정 줄을 골라낸다
      (S.choices ??= []).push({ ym: S.ym, id: item.id, k: choice.k });
      applyOut(S, out);
      markFired(S, item.id);
      break;
    }
    default:
      throw new Error(`fire: unknown item kind ${item.kind}`);
  }
  return 'fired';
}

/**
 * tick — t += dt (dt는 "월" 단위 분율), 큐에서 t 이하 항목 fire().
 * 결정이 수동 모드면 멈추고 'paused' 반환.
 */
export function tick(S, rules, dt, opts = {}) {
  S.t += dt;
  S.queue.sort((a, b) => a.at - b.at);
  while (S.queue.length && S.queue[0].at <= S.t && S.phase !== 'end') {
    const item = S.queue.shift();
    const r = fire(S, rules, item, opts);
    if (r === 'paused') {
      S.queue.unshift(item);
      return 'paused';
    }
  }
  return 'fired';
}

/**
 * 월간 적용 (serve 페이즈 전용). 확률·수치는 전부 '가정'.
 * endMonth 시작 시 한 번만 호출된다 — 다른 곳에서 호출 금지 (중복 적용 금지).
 */
function applyMonthly(S, rules) {
  if (S.phase !== 'serve') return;
  const inj = S.flags.injured;
  const injured = !!inj && inj.until > S.ym;
  // ── 주특기 난이도 소모 (가정) ──
  if (S.mosMech) {
    const d = S.mosMech.difficulty ?? 0;
    const drain = injured ? 2 : 1; // 가정: 부상 중이면 주특기 소모 2배
    const fx = {};
    if (d >= 4) fx.fit = -2 * drain;
    else if (d === 3) fx.fit = -1 * drain;
    if (d >= 5) fx.mind = -1 * drain;
    applyFx(S, fx);
    // ── 부상 판정 (가정): 월 확률 = injuryRisk × 0.4%, 회복 3개월 ──
    const p = (S.mosMech.injuryRisk ?? 0) * 0.004;
    if (!injured && rand(S) < p) {
      const types = S.mosMech.injuryTypes?.length ? S.mosMech.injuryTypes : ['근골격계 통증'];
      const type = types[Math.floor(rand(S) * types.length)];
      S.flags.injured = { type, until: shiftMonth(S.ym, 3) };
      log(S, `훈련 중 부상: ${type}`);
      applyFx(S, { fit: -10, mind: -5 });
    }
  }
  // ── 취미 효과 월 1회 (가정). effects 중 st에 있는 키만 반영 (applyFx) ──
  if (S.hobby) {
    const h = rules.hobbies?.hobbies?.find((x) => x.id === S.hobby);
    applyFx(S, h?.effects);
  }
  // ── 연인 방치 감쇠 (가정). −1이면 18개월 안에 위기(≤30)가 안 와서 −3 ──
  if (S.bonds?.lover != null) S.bonds.lover = Math.max(0, S.bonds.lover - 3);
  S.monthsLeft = monthsBetweenYm(S.ym, S.dates.discharge.slice(0, 7)); // bond_d100 등 전역 임박 조건용
}

/**
 * endMonth — 월간 적용 → 상태 감쇠 → 다음 달 → 전역/의무종료 판정(안전망).
 * 월급·적금은 pay 아이템에서, 진급은 promo 아이템에서 처리한다.
 */
export function endMonth(S, rules) {
  applyMonthly(S, rules);
  // 이 달의 기분 (감쇠 전). mood = 체력·멘탈·관계 평균 — 복무 지도 칸 색과 같은 식
  S.hist.push({ ym: S.ym, mood: Math.round((S.st.fit + S.st.mind + S.st.rel) / 3) });
  trainMonth(S);
  for (const k of ['fit', 'mind', 'skill', 'rel']) {
    const v = S.st[k] + (50 - S.st[k]) * 0.05;
    S.st[k] = Math.round(Math.max(0, Math.min(100, v)) * 100) / 100;
  }
  S.ym = shiftMonth(S.ym, 1);
  S.t = 0;
  const dYm = S.dates.discharge.slice(0, 7);
  if (S.phase === 'serve' && S.ym > dYm) {
    S.phase = 'end';
    log(S, `전역 (${S.dates.discharge})`);
  }
}

/** 한 달 진행: 페이즈 진입 → planMonth → tick(전부) → endMonth */
/** 월 시작: 페이즈 진입 → planMonth. UI는 이걸 부른 뒤 tick(dt)을 잘게 나눠 진행한다 */
export function beginMonth(S, rules, events = []) {
  enterPhase(S, rules);
  planMonth(S, rules, events);
}

export function stepMonth(S, rules, events = [], opts = {}) {
  beginMonth(S, rules, events);
  const r = tick(S, rules, 1.0, opts);
  if (r === 'paused') return 'paused';
  endMonth(S, rules);
  return 'ok';
}

/** phase 'end'까지 자동 진행. 끝나지 않으면 예외 (무한루프 방지) */
export function runGame(S, rules, { events = [], auto = true, maxMonths = 2000 } = {}) {
  if (S.phase === 'pre' && !S.dates) throw new Error('runGame: enlist() first (입영 전 상태에서는 실행 불가)');
  let n = 0;
  while (S.phase !== 'end' && n < maxMonths) {
    const r = stepMonth(S, rules, events, { auto });
    if (r === 'paused') throw new Error('runGame: paused in auto mode');
    n++;
  }
  if (S.phase !== 'end') throw new Error(`runGame: did not end after ${maxMonths} months`);
  return S;
}
