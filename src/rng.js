// rng.js — 시드 기반 결정론 RNG (mulberry32 계열)
// 같은 시드 → 같은 수열. 공유 링크(?seed=)와 테스트가 이 성질에 기댄다.

/** 문자열 시드를 uint32로 (FNV-1a). 숫자는 그대로 사용. */
export function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  let h = 0x811c9dc5;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 한 스텝: 상태(uint32) → 다음 상태(uint32) */
export function stepRng(state) {
  let a = (state | 0) + 0x6d2B79f5;
  a |= 0;
  return a >>> 0;
}

/** 상태에서 [0,1) 실수 하나 뽑기. {state, value} 반환 (S.rngState 갱신용) */
export function rngFloat(state) {
  const a = stepRng(state);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { state: a, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

/** 클로저형 RNG: makeRng(seed)() → [0,1) */
export function makeRng(seed) {
  let s = hashSeed(seed);
  return function () {
    const r = rngFloat(s);
    s = r.state;
    return r.value;
  };
}

/** [min, max] 정수 균등 */
export function ri(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 배열에서 하나 균등 선택 */
export function pick(rng, arr) {
  if (!arr.length) throw new Error('pick: empty array');
  return arr[Math.floor(rng() * arr.length)];
}

/** 확률 p로 true */
export function chance(rng, p) {
  return rng() < p;
}

/**
 * 가중 추첨. table 형태:
 *   { key: weight } | { key: { w: weight, ... } } | [[key, weight], ...] | [[key, {w}], ...]
 * 키(문자열)를 반환한다.
 */
export function wpick(rng, table) {
  // '_'로 시작하는 키(_note 등 메타데이터)는 가중치 항목이 아니므로 제외
  const pairs = Array.isArray(table) ? table : Object.entries(table).filter(([k]) => !k.startsWith('_'));
  const entries = pairs.map(([k, v]) => [k, typeof v === 'number' ? v : v.w]);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  if (!(total > 0)) throw new Error('wpick: total weight must be > 0');
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r < 0) return k;
  }
  return entries[entries.length - 1][0]; // 부동소수점 안전망
}
