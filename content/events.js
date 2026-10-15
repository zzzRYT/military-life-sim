// content/events.js — 사건·결정 템플릿 (§3 형식)
// 큰 사건은 p(이 달 후보가 될 절대 확률)로 게이트하고, 결과는 플레이어와의 거리로 갈린다.
// 확률·결과 배분은 전부 '가정'. 법 조문 근거만 src로 단다.
// 템플릿 변수: {senior} {roomSenior} {peer} {sfc} {lt} → "일은 잘하는데 무서운 맞선임" 식으로 치환.

import { rand, where } from '../src/engine.js';

// 무거운 사건에는 도움 창구를 함께 보여준다 (01-product-spec §6-4)
const HELP = '도움이 필요하면 · 국방헬프콜 1303 · 자살예방상담 109';

const pct = (S) => S.env.abuse / 100;
const roll = (S, p) => rand(S) < p;
const pick = (S, arr) => arr[Math.floor(rand(S) * arr.length)];
const drillNow = (S) => S.env.drills.some((d) => d.ym === S.ym);

/** 템플릿 문자열의 {role}을 인물 라벨 + 역할명으로 */
export function fmt(S, str) {
  return str.replace(/\{(\w+)\}/g, (m, role) => {
    const p = S.env.people.find((x) => x.role === role);
    if (!p) return m;
    const name = { senior: '맞선임', roomSenior: '생활관 선임', peer: '동기', sfc: '행보관', lt: '소대장' }[role];
    return `${p.label} ${name}`;
  });
}

/**
 * 부대 사건 → 나와의 거리. 책임 위치는 상병 이상 + 같은 생활관일 때만.
 * 반환: 'none' 무관 | 'witness' 목격 | 'room' 같은 생활관 | 'charge' 관리 책임
 */
function distance(S) {
  const r = rand(S);
  if (r < 0.55) return 'none';
  if (r < 0.8) return 'witness';
  if (S.rank >= 2 && r < 0.9) return 'charge';
  return 'room';
}

/** 관리 책임 징계 — 운에 따라 무혐의 ~ 휴가단축 (연대책임 징계는 원칙적으로 불가, 본인 과실이 있을 때만) */
function chargeOutcome(S) {
  const r = rand(S);
  if (r < 0.5) return { t: '관리 책임 조사를 받았지만 혐의 없음으로 끝났습니다.', fx: { mind: -6 } };
  if (r < 0.8) return { t: '관리 소홀로 징계위원회에 회부되었습니다.', fx: { mind: -8 }, punish: { kind: 'reprimand' } };
  return { t: '관리 소홀로 징계위원회에 회부되었습니다.', fx: { mind: -10 }, punish: { kind: 'leaveCut', n: 3 } };
}

/**
 * 훈련 평가. 포상 확률 = 5% + 85%×(숙련/100)^1.5 (숙련 0 → 5%, 50 → 35%, 90 → 78%). 수치는 '가정'.
 * 높은 숙련일수록 가파르게 — 여러 항목을 얕게 하는 것보다 하나에 집중하는 쪽이 포상이 많다.
 * 평가 이름·포상 형식은 공개 상식 수준 (특등사수·특급전사 포상휴가).
 */
const EVALS = [
  { k: 'marksman', id: 'eval_marksman', gap: 6, name: '사격 측정', win: '특등사수', days: 3, fail: '합격선은 겨우 넘겼습니다.' },
  { k: 'fitness', id: 'eval_fitness', gap: 6, name: '체력검정', win: '특급전사', days: 3, fail: '3급으로 겨우 통과했습니다.' },
  { k: 'foot', id: 'eval_foot', gap: 8, name: '제식 경연대회', win: '우수 소대', days: 2, fail: '발이 꼬여 소대장 표정이 굳었습니다.' },
  { k: 'leadership', id: 'eval_leadership', gap: 6, name: '분대장 리더십 평가', win: '모범 분대장', days: 3, fail: '분대원들이 잘 따라오지 않았습니다.', c: (S) => S.rank >= 2 },
  { k: 'combat', id: 'eval_combat', gap: 8, name: '전투기술 경연', win: '우수 전투원', days: 2, fail: '각개전투 코스에서 시간을 넘겼습니다.' },
];
export const rewardChance = (S, k) => 0.05 + 0.85 * ((S.train?.[k] ?? 0) / 100) ** 1.5;

function evalEvent(e) {
  return { id: e.id, kind: 'event', when: { phase: ['serve'] }, gap: e.gap, w: 2, src: '가정', c: e.c,
    run: (S) => {
      if (roll(S, rewardChance(S, e.k))) {
        S.leave.left += e.days;
        S.rewards.push({ ym: S.ym, kind: e.k, days: e.days });
        return { t: `${e.name} — ${e.win}! 포상휴가 ${e.days}일을 받았습니다.`, fx: { mind: 6 } };
      }
      return { t: `${e.name} — ${e.fail}`, fx: { mind: -2 } };
    } };
}

export const EVENTS = [
  // ── 일상 (데모에서 이관) ──
  { id: 'quiet_month', kind: 'event', when: { phase: ['train', 'serve'] }, w: 2,
    run: () => ({ t: '특별한 일 없이 한 달이 지나갔습니다.', fx: { mind: 1 } }) },
  { id: 'drill', kind: 'event', when: { phase: ['serve'] }, w: 5,
    c: (S) => drillNow(S),
    run: (S) => {
      const d = S.env.drills.find((x) => x.ym === S.ym);
      return { t: `${d.scale} 단위 ${d.label}에 참가했습니다.`, fx: { fit: 5, mind: -3, skill: 3 } };
    } },

  // ── 훈련 평가: 훈련 초점으로 쌓은 숙련도(S.train)가 포상 확률이 된다 ──
  ...EVALS.map(evalEvent),

  { id: 'savings', kind: 'decision', when: { phase: ['serve'] }, gap: 6, w: 1, max: 2, src: 'S34',
    c: (S) => S.rank >= 1,
    build: (S) => ({
      title: S.flags.n_savings ? '적금, 이대로 괜찮을까?' : '적금, 얼마나 넣을까?',
      body: S.flags.n_savings
        ? `전역이 다가오니 다시 계산기를 두드려 봅니다. 지금은 매달 ${S.money.monthlyDeposit.toLocaleString('ko-KR')}원.`
        : `월급이 오르자 선임이 적금 얘기를 꺼냅니다. 지금은 매달 ${S.money.monthlyDeposit.toLocaleString('ko-KR')}원을 넣고 있습니다.`,
      src: '내일준비적금: 납입 원금의 100%를 정부가 매칭, 월 최대 55만 원 (S34)',
      choices: [
        { k: 'mid', label: '30만 원만 넣는다', hint: '적당히' },
        { k: 'max', label: '55만 원 꽉 채운다', hint: '전역 때 목돈↑ · 쓸 돈이 빠듯하다' },
        { k: 'none', label: '안 넣는다', hint: '지금이 편하다 · 매칭 0원' },
      ],
    }),
    apply: (S, k) => {
      S.money.monthlyDeposit = { max: 550000, mid: 300000, none: 0 }[k];
      return { t: `결정: 적금 월 ${S.money.monthlyDeposit.toLocaleString('ko-KR')}원`, fx: k === 'max' ? { mind: -2 } : k === 'none' ? { mind: 2 } : {} };
    } },

  // ── 부조리 일상: 부조리 지수가 높을수록 자주, 멘탈을 깎는다 ──
  { id: 'rough_day', kind: 'event', when: { phase: ['serve'] }, w: 3,
    c: (S) => S.rank <= 1,
    p: (S) => pct(S) * 0.9,
    run: (S) => {
      const who = pick(S, ['senior', 'roomSenior']);
      const what = pick(S, ['사소한 일로 한참 혼났습니다.', '이유 없이 일을 몰아받았습니다.', '점호 뒤에 따로 불려 갔습니다.']);
      let t = fmt(S, `{${who}}에게 ${what}`);
      if ((S.flags.ageGap ?? 0) >= 3) t += ' 나이가 많은 게 오히려 더 신경 쓰였습니다.';
      return { t, fx: { mind: -14 }, rel: { [who]: -8 } };
    } },

  // ── 큰 사건: 다른 부대원 탈영 ──
  { id: 'desertion_other', kind: 'event', when: { phase: ['serve'] }, gap: 6, w: 4, src: '군형법 제30조',
    p: (S) => 0.01 + pct(S) * 0.04,
    run: (S) => {
      const base = { t: '같은 중대 병사가 부대를 이탈했습니다. 군사경찰이 수색 중입니다.', fx: { mind: -5 }, ban: 1 };
      const dist = distance(S);
      if (dist === 'witness') return { ...base, t: base.t + ' 마지막으로 본 사람으로 참고인 조사를 받았습니다.', fx: { mind: -8 } };
      if (dist === 'room') return { ...base, t: base.t + ' 같은 생활관이라 한동안 분위기가 무거웠습니다.', fx: { mind: -10 }, rel: { roomSenior: -5 } };
      if (dist === 'charge') { const c = chargeOutcome(S); return { ...base, ...c, t: base.t + ' ' + c.t }; }
      return base;
    } },

  // ── 큰 사건: 총기·안전사고 (훈련 달에 3배) ──
  { id: 'accident', kind: 'event', when: { phase: ['serve'] }, gap: 6, w: 4, src: '가정',
    p: (S) => (drillNow(S) ? 0.03 : 0.01),
    run: (S) => {
      const kind = pick(S, ['사격장 오발 사고', '훈련 중 안전사고', '차량 사고']);
      // 내가 다칠 확률 (가정): 사고 중 3%, 그중 1/3이 의병 전역
      if (roll(S, 0.03)) {
        if (roll(S, 1 / 3)) return { t: `${kind}로 크게 다쳤습니다. 전역 심사 끝에 의병 전역합니다.`, fx: { fit: -40 }, ending: 'medical' };
        return { t: `${kind}로 다쳐 국군병원에 입원했습니다.`, fx: { fit: -20, mind: -10 } };
      }
      const base = { t: `부대에서 ${kind}가 발생했습니다. 부대 내 조사가 진행 중입니다.`, fx: { mind: -4 }, ban: 1 };
      const dist = distance(S);
      if (dist === 'charge') { const c = chargeOutcome(S); return { ...base, ...c, t: base.t + ' ' + c.t }; }
      if (dist !== 'none') return { ...base, fx: { mind: -8 } };
      return base;
    } },

  // ── 큰 사건: 가혹행위 목격 → 마음의 편지 결정 ──
  { id: 'abuse_seen', kind: 'decision', when: { phase: ['serve'] }, gap: 8, w: 3, src: '군형법 / 마음의 편지',
    p: (S) => pct(S) * 0.08,
    build: (S) => ({
      title: '봤는데, 어떻게 할까?',
      body: fmt(S, '{roomSenior}이 후임에게 가혹행위를 하는 걸 봤습니다. 다들 못 본 척합니다.'),
      src: "구타·가혹행위는 군형법상 처벌 대상. '마음의 편지'는 무기명 고발제도지만 실효성 논란이 있다 (2019 연구)",
      help: HELP,
      choices: [
        { k: 'quiet', label: '못 본 척한다', hint: '지금은 조용하다 · 나중에 문제가 될 수도' },
        { k: 'letter', label: '마음의 편지를 쓴다', hint: '바뀔 수도 있다 · 신원이 새어 나갈 수도' },
        { k: 'direct', label: '간부에게 직접 보고한다', hint: '확실하다 · 생활관이 불편해진다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'quiet') {
        // 방조·묵인 적발 (가정): 30%
        if (roll(S, 0.3)) return { t: '나중에 사건이 드러났고, 묵인한 사실로 조사를 받았습니다.', fx: { mind: -10 }, punish: { kind: 'confine' } };
        return { t: '아무 일 없던 것처럼 지나갔습니다.', fx: { mind: -6 } };
      }
      if (k === 'letter') {
        if (roll(S, 0.35)) return { t: '편지를 쓴 사람이 누구인지 생활관에 소문이 났습니다.', fx: { mind: -12 }, rel: { roomSenior: -30, senior: -10 } };
        S.env.abuse = Math.max(0, S.env.abuse - 20);
        return { t: '감찰이 들어왔고, 생활관 분위기가 달라졌습니다.', fx: { mind: 6 }, ban: 1 };
      }
      S.env.abuse = Math.max(0, S.env.abuse - 25);
      return { t: fmt(S, '보고 후 {roomSenior}은 징계를 받고 다른 부대로 전출되었습니다.'), fx: { mind: 2 }, rel: { roomSenior: -40, sfc: 10 } };
    } },

  // ── 조기 전역 루트 (확률은 전부 가정, 제도는 병역법) ──
  { id: 'illness', kind: 'event', when: { phase: ['train', 'serve'] }, gap: 12, w: 5, src: '병역법 제65조 (병역처분 변경)',
    p: 0.002,
    run: () => ({ t: '정밀검사에서 복무를 이어 가기 어려운 질환이 발견되었습니다. 재신체검사를 거쳐 전역합니다.', fx: { mind: -10 }, ending: 'medical' }) },

  { id: 'unfit_review', kind: 'decision', when: { phase: ['train', 'serve'] }, gap: 6, w: 10, src: '병역법 제65조 · 현역복무 부적합 심사',
    c: (S) => S.st.mind < 20,
    p: 0.3,
    build: () => ({
      title: '현역복무 부적합 심사를 받을까?',
      body: '상담관이 심사를 권했습니다. 심사 결과에 따라 전역할 수도, 계속 복무할 수도 있습니다.',
      src: '질병·심신장애로 복무가 어려우면 신체검사를 거쳐 보충역·전시근로역 편입 또는 면제 (병역법 제65조)',
      help: HELP,
      choices: [
        { k: 'review', label: '심사를 받는다', hint: '결과는 반반쯤' },
        { k: 'stay', label: '조금 더 버틴다', hint: '지금 자리에 남는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') return { t: '조금 더 버텨 보기로 했습니다.', fx: { mind: 3 } };
      if (roll(S, 0.5)) return { t: '심사 결과 현역 복무가 어렵다는 판정을 받았습니다.', ending: 'unfit' };
      return { t: '심사 결과 계속 복무 판정을 받았습니다. 부대를 옮겨 다시 시작합니다.', fx: { mind: 10 }, rel: { senior: -20, roomSenior: -20 } };
    } },

  { id: 'family_hardship', kind: 'decision', when: { phase: ['serve'] }, gap: 24, w: 5, src: '병역법 제62조 ①1 · 제63조 ①',
    p: 0.004,
    build: () => ({
      title: '집에 일이 생겼다',
      body: '아버지가 쓰러지셨고, 집에 생계를 책임질 사람이 없습니다. 의가사 전역을 신청할 수 있습니다.',
      src: '본인이 아니면 가족의 생계를 유지할 수 없는 현역병은 원할 경우 전시근로역 편입 (병역법 제63조 ①)',
      choices: [
        { k: 'stay', label: '휴가로 버티고 남는다', hint: '복무는 이어진다 · 마음이 무겁다' },
        { k: 'apply', label: '의가사 전역을 신청한다', hint: '심사가 필요하다 · 통과는 높은 편' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') return { t: '청원휴가로 집에 다녀왔습니다.', fx: { mind: -8 } };
      if (roll(S, 0.7)) return { t: '생계 곤란이 인정되었습니다.', ending: 'family' };
      return { t: '심사에서 요건이 부족하다는 판단을 받았습니다.', fx: { mind: -12 } };
    } },

  { id: 'family_merit', kind: 'event', when: { phase: ['train', 'serve'] }, gap: 99, w: 5, src: '병역법 제62조 ①2 · 제63조 ②',
    p: 0.002,
    run: () => ({
      t: '아버지의 군 복무 중 부상이 뒤늦게 공상으로 인정되었습니다. 병역법에 따라 복무기간이 6개월로 단축됩니다.',
      fx: { mind: 15 }, shorten: 6,
    }) },

  // 반전: 조부모는 감면 대상이 아니다 (제63조 ②는 부모·배우자·형제자매만)
  { id: 'grandpa_merit', kind: 'event', when: { phase: ['serve'] }, gap: 99, w: 3, src: '병역법 제62조 ①2',
    p: 0.004,
    run: () => ({
      t: '할아버지가 국가유공자였다는 사실이 밝혀졌습니다. 혹시나 해서 알아봤지만, 복무 단축은 부모·배우자·형제자매까지만 해당됩니다.',
      fx: { mind: -2 },
    }) },

  // ── 내 비행: 일과 중 휴대폰 ──
  { id: 'phone', kind: 'decision', when: { phase: ['serve'] }, gap: 6, w: 2, c: (S) => where(S) !== 'sea', // 함정에선 휴대폰 반납 (가정) src: '병 휴대폰 사용 규정 위반 → 군기교육 사례 [S_new_6]',
    p: 0.08,
    build: () => ({
      title: '일과 중에 휴대폰을 몰래 쓸까?',
      body: '근무 중 시간이 비었습니다. 사물함에 휴대폰이 있습니다.',
      src: '휴대폰 사용 규정 위반은 징계 사유 (군기교육 사례 있음)',
      choices: [
        { k: 'no', label: '참는다', hint: '아무 일 없다' },
        { k: 'yes', label: '잠깐만 쓴다', hint: '들킬 가능성 낮은 편 · 들키면 징계' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'no') return { t: '참았습니다.' };
      if (!roll(S, 0.25)) return { t: '아무도 못 봤습니다.', fx: { mind: 3 } };
      return roll(S, 0.5)
        ? { t: '당직사관에게 적발되었습니다.', fx: { mind: -6 }, punish: { kind: 'leaveCut', n: 2 } }
        : { t: '당직사관에게 적발되었습니다.', fx: { mind: -10, fit: 3 }, punish: { kind: 'drill', n: 5 } };
    } },

  // ── 내 비행: 탈영 (멘탈 바닥일 때만) ──
  { id: 'desert_self', kind: 'decision', when: { phase: ['serve'] }, gap: 3, w: 10, max: 2, src: '군형법 제30조(군무이탈), 제79조(무단이탈)',
    c: (S) => S.st.mind < 30,
    p: (S) => 0.1 + pct(S) * 0.3,
    build: () => ({
      title: '여기서 나가고 싶다',
      body: '더는 버틸 수 없을 것 같습니다. 오늘 밤 경계가 느슨합니다.',
      src: '군무이탈: 평시 1년 이상 10년 이하 징역 (군형법 제30조). 군무 기피 목적 없는 이탈은 무단이탈 (제79조, 1년 이하 징역·300만 원 이하 벌금)',
      help: HELP,
      choices: [
        { k: 'counsel', label: '상담을 요청한다', hint: '도움을 받을 수 있다' },
        { k: 'endure', label: '그냥 버틴다', hint: '나아질 수도, 아닐 수도' },
        { k: 'leave', label: '부대를 나간다', hint: '돌이킬 수 없을 수도 있다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'counsel') return { t: '상담관과 이야기했습니다. 관심병사로 지정되어 한동안 배려를 받았습니다.', fx: { mind: 15 } };
      if (k === 'endure') return { t: '이를 악물고 하루를 넘겼습니다.', fx: { mind: -3 } };
      // 탈영: 이틀 안 자진 복귀(무단이탈 처리) vs 체포 후 군사재판 (가정 50:50)
      if (roll(S, 0.5)) return { t: '이틀 만에 스스로 돌아왔습니다. 무단이탈로 처리되었습니다.', fx: { mind: -5 }, punish: { kind: 'drill', n: 15 }, ban: 1 };
      return { t: '군사경찰에 체포되어 군무이탈 혐의로 기소되었습니다.', ending: 'court' };
    } },

  // ── 나이 요소: 동기보다 많이 늦게 입영했을 때 (ageGap ≥ 3) ──
  { id: 'old_brother', kind: 'event', when: { phase: ['train', 'serve'] }, gap: 12, w: 2, src: '가정',
    c: (S) => (S.flags.ageGap ?? 0) >= 3,
    run: (S) => ({
      t: `동기들보다 ${S.flags.ageGap}살 위라 생활관에서 맏형 노릇을 했습니다. 어린 선임 앞에서는 말조심이 늘었습니다.`,
      fx: { rel: 5, mind: 2 },
    }) },

  // ── 나이 요소: 동기보다 어리게 입영했을 때 (ageGap ≤ -2) ──
  { id: 'young_one', kind: 'event', when: { phase: ['train', 'serve'] }, gap: 12, w: 2, src: '가정',
    c: (S) => (S.flags.ageGap ?? 0) <= -2,
    run: () => ({
      t: '막내라 동기들이 챙겨 줬습니다. 선임들은 "어리다"고 놀리면서도 일을 덜 시켰습니다.',
      fx: { rel: 5, mind: 3 },
    }) },
];

// ── 병사 주특기 고유 사건 (40개, 전부 가정 — research/situations/soldier/ 기반) ──
// ── 취미·관계 사건 (20개, 전부 가정 — research/hobbies.md·relationships.md 기반) ──
// 기존 이벤트 ID·순서를 건드리지 않기 위해 뒤에만 추가한다.
import { SOLDIER_EVENTS } from './events-soldier.js';
import { HOBBY_BOND_EVENTS } from './events-hobby-bonds.js';
EVENTS.push(...SOLDIER_EVENTS, ...HOBBY_BOND_EVENTS);
