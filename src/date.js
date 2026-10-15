// date.js — 날짜 엔진 (§4). 법령 결정론: 민법 160조 만료일 계산.
// 모든 함수는 순수 함수이며 'YYYY-MM-DD' / 'YYYY-MM' 문자열을 쓴다.

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function formatISO(y, m, d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${y}-${p(m)}-${p(d)}`;
}

/** 해당 월의 말일 */
export function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate(); // m은 1-based
}

/** (y, m)에 n개월 더하기 → {y, m} */
export function addMonths(y, m, n) {
  const t = y * 12 + (m - 1) + n;
  return { y: Math.floor(t / 12), m: (t % 12) + 1 };
}

/** 'YYYY-MM'에 n개월 더하기 → 'YYYY-MM' */
export function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const r = addMonths(y, m, n);
  return `${r.y}-${String(r.m).padStart(2, '0')}`;
}

/** 두 'YYYY-MM' 사이 개월 수 (ym2 - ym1) */
export function monthsBetweenYm(ym1, ym2) {
  const [y1, m1] = ym1.split('-').map(Number);
  const [y2, m2] = ym2.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/** 날짜에 n일 더하기 (음수 가능) */
export function addDays(iso, n) {
  const { y, m, d } = parseISO(iso);
  const dt = new Date(y, m - 1, d + n);
  return formatISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/**
 * 만료일(시작, m개월) — 민법 160조
 *   (Y,M) = 시작 + m개월, d = 시작일
 *   d <= 말일(Y,M) → date(Y,M,d) − 1일   (160조 ②)
 *   else            → date(Y,M,말일(Y,M)) (160조 ③, 1일 빼지 않음)
 */
export function expireDate(startIso, months) {
  const { y, m, d } = parseISO(startIso);
  const r = addMonths(y, m, months);
  const last = daysInMonth(r.y, r.m);
  if (d <= last) return addDays(formatISO(r.y, r.m, d), -1);
  return formatISO(r.y, r.m, last);
}

/** 다음달1일(날짜) = 날짜가 속한 달의 다음 달 1일 */
export function nextMonthFirst(iso) {
  const { y, m } = parseISO(iso);
  const r = addMonths(y, m, 1);
  return formatISO(r.y, r.m, 1);
}

/** 병 전역일 = 만료일(입영일, 복무개월[군종]) — 2020년 이후 입영: 단축일 0 */
export function soldierDischarge(enlistIso, months) {
  return expireDate(enlistIso, months);
}

/**
 * 병 진급일 — [일병, 상병, 병장] (2-6-6)
 *   일병 = 다음달1일(만료일(입영일, 2))
 *   상병 = 다음달1일(만료일(일병, 6))
 *   병장 = 다음달1일(만료일(상병, 6))
 * 전역일과 같거나 넘는 진급은 생성하지 않음 (§4 "전역일을 넘는 진급은 생성하지 않음"을
 * 엄격히 적용 — 같은 날 진급은 무의미하므로 제외)
 */
export function soldierPromotions(enlistIso, months) {
  const discharge = expireDate(enlistIso, months);
  const steps = [2, 6, 6];
  const out = [];
  let base = enlistIso;
  for (let i = 0; i < steps.length; i++) {
    const d = nextMonthFirst(expireDate(base, steps[i]));
    if (d >= discharge) break;
    out.push({ rank: i + 1, date: d }); // rank: 1=일병, 2=상병, 3=병장
    base = d;
  }
  return out;
}

/** 간부 의무만료 = 만료일(임관일, 의무개월[신분][경로]) */
export function obligationEnd(startIso, months) {
  return expireDate(startIso, months);
}

/**
 * 장교 진급 후보
 *   = max(다음달1일(만료일(임관일, 근속)), 다음달1일(만료일(직전진급, 직전계급복무)))
 */
export function officerPromotionCandidate(commissionIso, serviceMonths, prevPromoIso, rankServiceMonths) {
  const a = nextMonthFirst(expireDate(commissionIso, serviceMonths));
  const b = nextMonthFirst(expireDate(prevPromoIso, rankServiceMonths));
  return a > b ? a : b;
}

/** 정년 전역일 = 정년 도달월의 다음 달 말일 (군인사법 36조 ①) */
export function retirementMonthEnd(birthIso, ageYears) {
  const { y, m } = parseISO(birthIso);
  const r = addMonths(y, m, ageYears * 12 + 1);
  return formatISO(r.y, r.m, daysInMonth(r.y, r.m));
}
