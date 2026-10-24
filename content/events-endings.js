// events-endings.js — 특이한 전역 (조기 종료 엔딩). 좋은 전역만 있으면 심심하다.
// 육군교도소(prison)는 events.js·events-crisis.js의 탈영·폭행 사건에, 4급(grade4)은 engine.js judge에 있다.
// 여기는 나머지 넷: 국군수도병원 장기 입원 · 전입 · 의가사 · 간부 전직. 확률·조건은 전부 '가정'.
// 결정의 첫 선택지는 '평범하게 계속 복무'다 — 자동 진행(runGame 기본)에선 만기 전역이 그대로 나온다.
import { rand } from '../src/engine.js';
import { fmt } from '../src/text.js';
import { HELP } from './events.js';

const roll = (S, p) => rand(S) < p;

export const ENDING_EVENTS = [
  // ── 국군수도병원: 입원이 거듭되거나 몸이 바닥인 채로 수도병원 신세를 지면, 치료가 복무기간을 넘긴다 ──
  { id: 'end_hospital_long', kind: 'event', when: { phase: ['serve'] }, needs: 'medic', max: 1, w: 6, src: '가정 (병역법 시행령상 입원 치료 기간은 복무기간에 산입)',
    c: (S) => S.marks.medic.sev >= 1 && S.marks.medic.ym < S.ym && (S.monthsLeft ?? 99) >= 2 && ((S.hospital ?? 0) >= 2 || S.st.fit <= 35),
    p: 0.15,
    run: (S) => ({
      t: `${S.marks.medic.name}이 낫지 않았습니다. 국군수도병원 병동에서 한 달이 두 달이 되고, 두 달이 석 달이 됐습니다. 복귀 명령은 끝내 오지 않았고, 남은 복무는 병상에서 채웠습니다.`,
      fx: { fit: -10, mind: -6 }, ending: 'hospital',
    }) },

  // ── 전입: 다른 부대로 전출 명령이 나서 이 부대의 군 생활이 끝난다. 부조리가 심한 부대일수록 분리 조치로 옮겨질 확률이 높다 ──
  { id: 'end_transfer', kind: 'event', when: { phase: ['serve'] }, max: 1, w: 4, src: '가정 (부대 개편·분리 조치에 따른 전속)',
    c: (S) => (S.monthsLeft ?? 99) >= 3 && S.monthsLeft <= 18,
    p: (S) => 0.004 + (S.env?.abuse ?? 0) / 100 * 0.012,
    run: (S) => ({
      t: fmt(S, '인사 명령이 나왔습니다. 부대가 개편되면서 내 보직이 통째로 다른 부대로 옮겨졌습니다. 쓰던 관물대를 비우고 보급품을 반납하고, 짐은 더플백 하나로 정리됐습니다. 군번줄만 같은 채로 낯선 위병소를 통과했습니다.'),
      fx: { mind: -8, rel: -15 }, ending: 'transfer',
    }) },

  // ── 의가사: 마음이 바닥이고 집안 사정까지 무너지면 상담관이 먼저 의가사 전역을 권한다 ──
  { id: 'end_hardship', kind: 'decision', when: { phase: ['serve'] }, gap: 24, w: 6, src: '병역법 제62조 ①1 · 제63조 ① (의가사)',
    c: (S) => S.st.mind <= 40 && (S.monthsLeft ?? 99) >= 3,
    p: 0.12,
    build: () => ({
      title: '집안 사정이 더는 못 버틴다',
      body: '집에서 온 연락이 점점 짧아지더니, 어느 날은 아무도 전화를 받지 않았습니다. 상담관이 서류철을 열며 말했습니다. "의가사 전역 요건이 되는지, 같이 확인해 보자."',
      src: '본인이 아니면 가족의 생계를 유지할 수 없는 현역병은 원할 경우 전시근로역 편입 (병역법 제63조 ①)',
      help: HELP,
      choices: [
        { k: 'stay', label: '청원휴가로 버티고 남는다', hint: '복무는 이어진다 · 마음이 무겁다' },
        { k: 'apply', label: '의가사 전역을 신청한다', hint: '심사를 거친다 · 요건은 갖춰진 편' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') return { t: '청원휴가로 집에 다녀왔습니다. 돌아오는 길에 누구에게도 말하지 않았습니다.', fx: { mind: -6 }, rel: { family: 5 } };
      if (roll(S, 0.8)) return { t: '가족 생계 곤란이 인정되었습니다. 전역증 대신 "전시근로역 편입" 통지서를 받았습니다. 집으로 가는 버스에서야 비로소 숨이 쉬어졌습니다.', fx: { mind: -4 }, ending: 'family' };
      return { t: '심사에서 요건이 부족하다는 판단을 받았습니다. 서류를 보강해 다시 내라고 했습니다.', fx: { mind: -10 } };
    } },

  // ── 간부로 전직: 일을 너무 잘하면 부대가 놔주지 않는다 (병장 이상 + 포상 2회 이상 + 훈련 숙련도 70 이상 + 멘탈 55 이상) ──
  { id: 'end_cadre', kind: 'decision', when: { phase: ['serve'] }, gap: 99, w: 8, src: '가정 (병 → 부사관 임용 · 군인사법 하사 임관)',
    c: (S) => S.rank >= 3 && (S.rewards?.length ?? 0) >= 2 && Math.max(...Object.values(S.train)) >= 70 && S.st.mind >= 55 && (S.monthsLeft ?? 99) <= 8,
    p: 0.3,
    build: () => ({
      title: '중대장이 불렀다',
      body: '"너 같은 놈이 나가면 우리가 곤란하다." 중대장이 부사관 지원서를 내 앞에 밀었습니다. 포상휴가 증서가 쌓여 있는 서랍을 열어 보더니, 한마디를 더 보탰습니다. "하사로 달고 계속 같이 일하자."',
      src: '병 복무 중 부사관 선발 → 하사 임관 (군인사법). 시험·교육을 거친다',
      choices: [
        { k: 'decline', label: '정중히 거절하고 전역한다', hint: '만기 전역 · 사회로' },
        { k: 'accept', label: '지원서에 서명한다', hint: '하사로 임관 · 직업군인의 길' },
      ],
    }),
    apply: (S, k) => k === 'accept'
      ? { t: '서명하고 나니 손이 가벼웠습니다. 부사관 교육을 마치면 하사 계급장을 달게 됩니다. 사회가 아니라 이 부대가 앞으로의 일터가 됐습니다.', fx: { mind: 8 }, ending: 'cadre' }
      : { t: '"감사합니다. 그래도 나가겠습니다." 중대장이 서류를 도로 넣었습니다. "그래, 어디서든 잘할 거다."', fx: { mind: 4 } } },
];
