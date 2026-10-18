// content/events-health.js — 몸·건강 (§3 형식). 습관 결정 + 무작위 병원 사건. 확률·수치는 전부 '가정'.
// 병원 사건은 분야를 먼저 고르게 뽑고(습관·과체중이 조금 기울인다), 그 안에서 병명을 뽑는다.
// 경중: 의무대 진료 → 국군수도병원 입원 → (드물게) 의병 전역. 병명마다 갈 수 있는 최대 경중이 있다.

import { rand } from '../src/engine.js';
import { shiftMonth } from '../src/date.js';
import { HABITS, HEAVY, gain, medicP, shape } from '../src/body.js';

const pick = (S, arr) => arr[Math.floor(rand(S) * arr.length)];

/** 꾀병 외진이 걸렸을 때 행보관 성격(env.people sfc.temper)별: 징계 확률, 훈계 대사, 징계 시 휴가단축 일수 (가정) */
export const SFC_DODGE = {
  kind: { p: 0, talk: '"병장이 이러면 애들이 뭘 보고 배우냐." 한숨 한 번 쉬고 보내 줬습니다.' },
  indifferent: { p: 0, talk: '"다음부턴 말이라도 하고 쉬어라." 서류만 넘기고 끝났습니다.' },
  sly: { p: 0, talk: '"이번만 눈감아 줄 테니 창고 정리 좀 해라." 오후 내내 창고에 있었습니다.' },
  showoff: { p: 0.5, n: 2, talk: '중대 앞에서 "병장 꾀병"으로 한참 이름이 불렸습니다.' },
  awkward: { p: 0.5, n: 2, talk: '아무 말 없이 한참 쳐다보다 "알았다"고만 했습니다. 그게 더 무서웠습니다.' },
  scary: { p: 0.8, n: 3, talk: '행정반으로 불려 가 한 시간 동안 훈계를 들었습니다.' },
};
/** 걸릴 확률: 첫 번째 12%, 갈 때마다 +10%p (가정) */
export const dodgeCatch = (S) => 0.12 + 0.1 * (S.flags.n_medic_dodge ?? 0);

/** 분야 → [병명, 최대 경중(0 의무대 · 1 수도병원 · 2 의병 전역까지)] */
export const ISSUES = {
  spine: [['허리디스크(요추 추간판 탈출증)', 2], ['목디스크(경추 추간판 탈출증)', 2], ['거북목·일자목 통증', 0], ['급성 요추 염좌', 1]],
  bone: [['족구하다 발목 골절', 1], ['축구하다 손목 골절', 1], ['작업 중 손가락 골절', 1], ['훈련 중 피로골절', 2], ['계단에서 미끄러져 쇄골 골절', 1]],
  joint: [['무릎 전방십자인대 파열', 2], ['발목 인대 파열', 1], ['어깨 탈구', 1], ['반월상 연골판 손상', 1]],
  internal: [['급성 장염', 0], ['급성 충수염(맹장)', 1], ['자연 기흉', 2], ['폐렴', 1], ['편도염 고열', 0]],
  metabolic: [['고혈압 진단', 1], ['지방간 수치 이상', 0], ['통풍 발작', 1]], // 과체중일 때만
};
export const CAT_L = { spine: '척추', bone: '골절', joint: '인대·관절', internal: '내과', metabolic: '대사' };

/** 분야 가중치: 기본 1씩 고르게, 습관 tilt를 곱한다. 대사는 과체중일 때만 */
export function catWeights(S) {
  const tilt = HABITS[S.body?.habit]?.tilt ?? {};
  const heavy = S.body && gain(S.body) >= HEAVY;
  return Object.keys(ISSUES)
    .filter((c) => c !== 'metabolic' || heavy)
    .map((c) => [c, (tilt[c] ?? 1) * (heavy && (c === 'spine' || c === 'joint') ? 1.3 : 1)]);
}

function pickCat(S) {
  const ws = catWeights(S);
  let r = rand(S) * ws.reduce((a, [, w]) => a + w, 0);
  for (const [c, w] of ws) if ((r -= w) < 0) return c;
  return ws.at(-1)[0];
}

// 부상 플래그는 주특기 부상과 같은 것 — 그동안 주특기 소모 2배 (engine applyMonthly)
const injure = (S, type, months) => { S.flags.injured = { type, until: shiftMonth(S.ym, months) }; };

export const HEALTH_EVENTS = [
  // 개인정비 시간 습관 — 고른 습관이 다음 결정까지 매달 몸에 쌓인다 (src/body.js bodyMonth)
  { id: 'health_habit', kind: 'decision', when: { phase: ['serve'] }, gap: 3, max: 6, w: 4, src: '가정',
    build: (S) => {
      const B = S.body;
      const now = HABITS[B.habit];
      return {
        title: '개인정비 시간, 요즘 뭐 하지?',
        body: `체중 ${B.kg}kg (입대 ${gain(B) >= 0 ? '+' : ''}${gain(B)}kg) · ${shape(B)}.${now ? ` 요즘은 ${now.label}.` : ''} 일과가 끝나고 점호까지 세 시간이 남았다.`,
        choices: Object.entries(HABITS)
          .filter(([, h]) => S.money.cash >= h.cost)
          .map(([k, h]) => ({ k, label: h.label, hint: h.hint })),
      };
    },
    echo: [{ needs: 'medic', add: (S) => `${S.marks.medic.name} 뒤로 몸 생각이 부쩍 늘었다.` }],
    apply: (S, k) => {
      S.body.habit = k;
      return { t: `결정: 개인정비 시간엔 ${HABITS[k].label}`, mark: { set: { habit: { k, kg: S.body.kg } } } };
    } },

  // 무작위 병원 사건. 확률은 몸 상태로 (medicP)
  { id: 'medic_issue', kind: 'event', when: { phase: ['serve'] }, gap: 4, w: 25, src: '가정', // w: p로 걸리면 거의 확실히 뽑히게
    p: (S) => medicP(S),
    echo: [{ needs: 'medic', add: '두 번째 병원 신세다. 의무병이 얼굴을 알아봤습니다.' }],
    run: (S) => {
      const cat = pickCat(S);
      const [name, max] = pick(S, ISSUES[cat]);
      const r = rand(S);
      const sev = Math.min(max, r < 0.55 ? 0 : r < 0.95 ? 1 : 2); // 의무대 55 · 수도병원 40 · 의병 전역 5
      const mark = { set: { medic: { cat, name, sev } } };
      if (sev === 0) {
        injure(S, name, 1);
        return { t: `${name} — 의무대 진료를 받고 며칠 열외했습니다.`, fx: { fit: -5, mind: -2 }, mark };
      }
      if (sev === 1) {
        injure(S, name, 2);
        S.hospital = (S.hospital ?? 0) + 1;
        return { t: `${name} — 국군수도병원에 입원했습니다. 병동 TV 앞에서 다른 부대 환자들과 친해졌습니다.`, fx: { fit: -15, mind: -8 }, mark };
      }
      S.hospital = (S.hospital ?? 0) + 1;
      return { t: `${name} — 국군수도병원에 입원했지만 상태가 나빴습니다. 의무조사 끝에 병원에서 의병 전역합니다.`, fx: { fit: -30, mind: -10 }, mark, ending: 'medical' };
    } },

  // 병원 다녀온 뒤 — 습관이 회복을 가른다. 수도병원(경중 1) 이상, 한 판에 한 번
  { id: 'medic_after', kind: 'event', when: { phase: ['serve'] }, needs: 'medic', gap: 99, w: 3, src: '가정',
    c: (S) => S.marks.medic.sev >= 1 && S.marks.medic.ym < S.ym,
    run: (S) => {
      const { name } = S.marks.medic, h = S.body.habit;
      if (h === 'gym' || h === 'run') return { t: `${name} 재활 운동을 빼먹지 않았습니다. 군의관이 "회복 빠르네"라고 했습니다.`, fx: { fit: 6, mind: 2 } };
      if (h === 'phone') return { t: `누워서 핸드폰만 보다 ${name} 통증이 도졌습니다. 다시 의무대 신세입니다.`, fx: { fit: -6, mind: -3 } };
      return { t: `비 오는 날이면 ${name} 자리가 쑤십니다. 선임이 "그거 평생 간다"고 겁을 줬습니다.`, fx: { mind: -1 } };
    } },

  // 체중계 — 습관을 고른 뒤 몇 달 지나면 결과를 보여 준다 (흔적 habit의 체중과 비교)
  { id: 'body_scale', kind: 'event', when: { phase: ['serve'] }, needs: 'habit', gap: 4, w: 3, src: '가정',
    c: (S) => S.marks.habit.ym < S.ym,
    run: (S) => {
      const d = Math.round((S.body.kg - S.marks.habit.kg) * 10) / 10, sh = shape(S.body);
      const head = `의무대 체중계에 올라갔습니다. ${S.body.kg}kg, ${d >= 0 ? '+' : ''}${d}kg.`;
      const tail = {
        gym: sh === '근육질' || sh === '탄탄' ? ' 거울 속 어깨가 넓어졌습니다. 후임이 루틴을 물어봤습니다.' : ' 아직은 티가 안 나지만 바벨이 가벼워졌습니다.',
        run: ' 전투복 허리가 헐렁해졌습니다. 뜀걸음 3km 기록이 1분 줄었습니다.',
        px: ' PX 냉동만두가 전부 배로 갔습니다. 전투복 단추가 버겁습니다.',
        delivery: ' 위병소 배달 기사님이 이름을 외웠습니다. 체력 측정이 걱정됩니다.',
        phone: ' 체중보다 목이 문제입니다. 고개가 자꾸 앞으로 빠집니다.',
      }[S.marks.habit.k];
      return { t: head + tail, fx: d >= 4 ? { mind: -2 } : d <= -3 ? { mind: 3 } : {} };
    } },

  // 병장 꾀병 외진 — 아프지 않은데 일과를 피하러 수도병원 외진을 신청한다. 낮은 확률로 행보관에게 걸린다
  { id: 'medic_dodge', kind: 'decision', when: { phase: ['serve'] }, gap: 3, max: 3, w: 3, p: 0.3, src: '가정',
    c: (S) => S.rank >= 3 && !(S.flags.injured?.until > S.ym),
    build: (S) => ({
      title: '오늘 일과, 외진으로 빠질까?',
      body: `내일 하루 종일 작업이다. ${S.marks.medic ? `예전 ${S.marks.medic.name} 핑계를 대면` : '허리가 좀 안 좋다고 하면'} 수도병원 외진을 끊어 줄 것 같다.`,
      choices: [
        { k: 'stay', label: '그냥 일과 뛴다', hint: '아무 일 없다' },
        { k: 'dodge', label: '외진 신청한다', hint: `하루 열외 · 걸리면 행보관 성격 따라 훈계~휴가 박탈` },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') return { t: '병장이지만 끝까지 작업을 뛰었습니다. 후임들이 조금 놀란 눈치였습니다.', fx: { fit: -1 }, rel: { sfc: 2 } };
      if (rand(S) >= dodgeCatch(S)) {
        return { t: pick(S, [
          '수도병원 외진을 다녀왔습니다. 진료는 5분, 나머지는 병원 PX와 대기실 TV였습니다.',
          '외진 버스 창밖으로 바깥 풍경을 실컷 봤습니다. 군의관은 "특이 소견 없음"이라고 했습니다.',
          '외진 핑계로 하루를 통째로 뺐습니다. 복귀하니 작업은 다 끝나 있었습니다.',
        ]), fx: { mind: 6 } };
      }
      const sfc = S.env.people.find((p) => p.role === 'sfc');
      const d = SFC_DODGE[sfc?.temper] ?? SFC_DODGE.indifferent;
      const head = '외진 기록에 "특이 소견 없음"이 찍힌 걸 행보관이 봤습니다.';
      if (rand(S) < d.p) return { t: `${head} 꾀병으로 판단해 징계위원회에 올렸습니다.`, fx: { mind: -8 }, rel: { sfc: -15 }, punish: { kind: 'leaveCut', n: d.n } };
      return { t: `${head} ${d.talk}`, fx: { mind: -3 }, rel: { sfc: -5 } };
    } },
];
