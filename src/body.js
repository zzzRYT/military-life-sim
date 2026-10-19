// body.js — 몸 상태: 체중(kg)·근육(0~100)·생활 습관. 수치는 전부 '가정'.
// 습관은 결정(content/events-health.js health_habit)으로 고르고, 다음 결정 때까지 매달 몸에 쌓인다.
// 몸 상태는 병원 사건(medic_issue)의 확률과 분야를 기울인다.

/** 개인정비 시간 습관. kg·muscle: 월 변화, fx: 월 스탯, cost: 월 비용(원, 모자라면 그 달은 못 함), p: 병원 사건 확률 배수, tilt: 분야 가중 */
export const HABITS = {
  gym: { label: '체력단련실에서 쇠질', hint: '근육 ↑ · 무리하면 허리', kg: 0.2, muscle: 3, fx: { fit: 2, mind: 1 }, cost: 0, p: 1, tilt: { spine: 1.5, joint: 1.3 } },
  run: { label: '연병장 체단(뜀걸음)', hint: '살 ↓ · 체력 ↑', kg: -0.7, muscle: 1, fx: { fit: 3 }, cost: 0, p: 0.9, tilt: { bone: 1.5, joint: 1.5 } },
  px: { label: 'PX에서 냉동·과자 털기', hint: '월 4만 원 · 살 ↑ · 행복', kg: 0.9, muscle: -0.5, fx: { mind: 2 }, cost: 40000, p: 1, tilt: { internal: 1.5 } },
  delivery: { label: '위병소로 배달 시켜 먹기', hint: '월 8만 원 · 살 ↑↑ · 더 행복', kg: 1.3, muscle: -0.5, fx: { mind: 3 }, cost: 80000, p: 1, tilt: { internal: 2 } },
  phone: { label: '침대에 누워 핸드폰만', hint: '돈 안 듦 · 몸이 망가진다', kg: 0.4, muscle: -1.5, fx: { fit: -2, mind: 1 }, cost: 0, p: 1.4, tilt: { spine: 2.5 } },
};

/** 입대 시 몸. 체중은 시드에서 62~78kg (RNG 스트림을 건드리지 않으려고 해시로) */
export const newBody = (seed) => ({ kg0: 62 + (seed % 17), kg: 62 + (seed % 17), muscle: 40, habit: null });

const r1 = (v) => Math.round(v * 10) / 10;
export const gain = (B) => r1(B.kg - B.kg0);
/** 입대 대비 체중이 이만큼 늘면 과체중 — 체력이 새고 병원 확률이 오른다 */
export const HEAVY = 8;

export function shape(B) {
  const d = gain(B);
  if (d >= 12) return '비만';
  if (d >= 6) return B.muscle >= 70 ? '벌크업' : '통통';
  if (B.muscle >= 70) return '근육질';
  if (B.muscle >= 55) return '탄탄';
  if (d <= -6) return '날씬';
  return '보통';
}

/**
 * 한 달치 몸 변화 (serve 페이즈, engine applyMonthly에서만). 반환: 스탯 fx.
 * 짬밥 +0.2kg 기본, 습관, 훈련 초점·취미가 운동이면 근육 보너스, 운동 안 하면 근육 감소.
 */
export function bodyMonth(S, rules) {
  const B = S.body;
  if (!B) return {};
  const fx = {};
  const add = (o) => { for (const [k, v] of Object.entries(o ?? {})) fx[k] = (fx[k] ?? 0) + v; };
  let kg = 0.2, muscle = 0;
  const h = HABITS[B.habit];
  if (h && S.money.cash >= h.cost) {
    S.money.cash -= h.cost;
    kg += h.kg; muscle += h.muscle; add(h.fx);
  }
  if (S.focus === 'fitness') muscle += 1.5;
  if (S.hobby === 'weight') muscle += 2;
  if (S.hobby === 'running') kg -= 0.5;
  if (muscle <= 0) muscle -= 0.5; // 안 쓰면 빠진다
  B.kg = r1(Math.max(50, B.kg + kg));
  B.muscle = r1(Math.max(0, Math.min(100, B.muscle + muscle)));
  if (gain(B) >= HEAVY) add({ fit: -2 });
  if (B.muscle >= 60) add({ fit: 1 });
  return fx;
}

/** 이 달 병원 사건 확률 (가정): 기본 3% × 습관 × 과체중 1.5 × 근육 60↑ 0.7 */
export function medicP(S) {
  const B = S.body;
  if (!B) return 0.03;
  return 0.03 * (HABITS[B.habit]?.p ?? 1) * (gain(B) >= HEAVY ? 1.5 : 1) * (B.muscle >= 60 ? 0.7 : 1);
}
