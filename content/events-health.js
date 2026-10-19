// content/events-health.js — 몸·건강 (§3 형식). 습관 결정 + 무작위 병원 사건. 확률·수치는 전부 '가정'.
// 병원 사건은 분야를 먼저 고르게 뽑고(습관·과체중이 조금 기울인다), 그 안에서 병명을 뽑는다.
// 문체: 전역자의 썰. 휴대폰이 없던 시절(phoneOn 거짓)엔 TV·철가방 문구로 갈린다.
// 경중: 의무대 진료 → 국군수도병원 입원 → (드물게) 의병 전역. 병명마다 갈 수 있는 최대 경중이 있다.

import { rand, phoneOn } from '../src/engine.js';
import { fmt } from '../src/text.js';
import { shiftMonth } from '../src/date.js';
import { HABITS, HEAVY, gain, medicP, shape } from '../src/body.js';

const pick = (S, arr) => arr[Math.floor(rand(S) * arr.length)];

/** 꾀병 외진이 걸렸을 때 행보관 성격(env.people sfc.temper)별: 징계 확률, 훈계 대사, 징계 시 휴가단축 일수 (가정) */
export const SFC_DODGE = {
  kind: { p: 0, talk: '"병장이 이러면 애들이 뭘 보고 배우냐." 한숨 한 번 쉬고 보내 줬습니다. 혼나는 것보다 그 한숨이 오래 남았습니다.' },
  indifferent: { p: 0, talk: '"다음부턴 말이라도 하고 쉬어라." 서류만 넘기고 끝났습니다. 그게 전부라서 더 찜찜했습니다.' },
  sly: { p: 0, talk: '"이번만 눈감아 줄 테니 창고 정리 좀 해라." 오후 내내 창고에 있었습니다. 외진으로 번 하루를 창고에 갚았습니다.' },
  showoff: { p: 0.5, n: 2, talk: '중대 앞에서 "병장 꾀병"이라는 별명으로 한참 불렸습니다. 별명은 전역할 때까지 따라다녔습니다.' },
  awkward: { p: 0.5, n: 2, talk: '아무 말 없이 한참 쳐다보다 "알았다"고만 했습니다. 그 "알았다"가 제일 무서웠습니다.' },
  scary: { p: 0.8, n: 3, talk: '행정반으로 불려 가 한 시간 동안 훈계를 들었습니다. 시계 초침이 이렇게 느린 줄 처음 알았습니다.' },
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

// 휴대폰이 없던 시절엔 같은 습관이 다른 모습이다 (src/body.js의 HABITS는 그대로, 보이는 문구만 바꾼다)
const OLD_HABIT = {
  phone: { label: '침대에 누워 TV와 잡지만', hint: '돈 안 듦 · 몸이 망가진다' },
  delivery: { label: '위병소 앞 중국집 철가방 불러 먹기', hint: '월 8만 원 · 살 ↑↑ · 더 행복' },
};

// 습관을 바꾼 첫 주의 대가 — 쉬는 시간을 내놓거나, 배가 부르거나, 행보관 눈에 띈다 (본격적인 몸의 변화는 src/body.js가 매달 쌓는다)
const FIRST_WEEK = { gym: { mind: -1 }, run: { mind: -1 }, px: { fit: -1 }, delivery: { fit: -1 }, phone: { fit: -1 } };

export const HEALTH_EVENTS = [
  // 개인정비 시간 습관 — 고른 습관이 다음 결정까지 매달 몸에 쌓인다 (src/body.js bodyMonth)
  { id: 'health_habit', kind: 'decision', when: { phase: ['serve'] }, gap: 3, max: 6, w: 4, src: '가정',
    build: (S) => {
      const B = S.body;
      const now = HABITS[B.habit];
      const old = phoneOn(S) ? {} : OLD_HABIT;
      const nowLabel = old[B.habit]?.label ?? now?.label;
      return {
        title: '개인정비 시간, 요즘 뭐 하지?',
        body: `일과가 끝나고 점호까지 세 시간. 의무대 체중계는 ${B.kg}kg을 가리켰습니다.${nowLabel ? ` 요즘은 ${nowLabel}.` : ''} 오늘 이 세 시간은 누구의 것일까요.`,
        src: `체중 ${B.kg}kg (입대 ${gain(B) >= 0 ? '+' : ''}${gain(B)}kg) · ${shape(B)}. 고른 습관이 다음 결정까지 매달 몸에 쌓인다.`,
        choices: Object.entries(HABITS)
          .filter(([, h]) => S.money.cash >= h.cost)
          .map(([k, h]) => ({ k, label: old[k]?.label ?? h.label, hint: old[k]?.hint ?? h.hint })),
      };
    },
    echo: [{ needs: 'medic', add: (S) => `${S.marks.medic.name} 뒤로 몸 생각이 부쩍 늘었습니다.` }],
    apply: (S, k) => {
      S.body.habit = k;
      return { t: `결정: 개인정비 시간엔 ${(phoneOn(S) ? {} : OLD_HABIT)[k]?.label ?? HABITS[k].label}.`, fx: FIRST_WEEK[k], rel: k === 'delivery' ? { sfc: -2 } : undefined, mark: { set: { habit: { k, kg: S.body.kg } } } };
    } },

  // 무작위 병원 사건. 확률은 몸 상태로 (medicP)
  { id: 'medic_issue', kind: 'event', when: { phase: ['serve'] }, gap: 4, w: 25, src: '가정', // w: p로 걸리면 거의 확실히 뽑히게
    p: (S) => medicP(S),
    echo: [{ needs: 'medic', add: '두 번째 병원 신세입니다. 의무병이 얼굴을 알아봤습니다.' }],
    run: (S) => {
      const cat = pickCat(S);
      const [name, max] = pick(S, ISSUES[cat]);
      const r = rand(S);
      const sev = Math.min(max, r < 0.55 ? 0 : r < 0.95 ? 1 : 2); // 의무대 55 · 수도병원 40 · 의병 전역 5
      const mark = { set: { medic: { cat, name, sev } } };
      if (sev === 0) {
        injure(S, name, 1);
        return { t: `${name} — 의무대 진료를 받고 며칠 열외했습니다. 처방은 파스와 "물 많이 마셔라"였습니다.`, fx: { fit: -5, mind: -2 }, mark };
      }
      if (sev === 1) {
        injure(S, name, 2);
        S.hospital = (S.hospital ?? 0) + 1;
        return { t: `${name} — 국군수도병원에 입원했습니다. 환자복을 입으니 계급이 사라져서 이상하게 마음이 편했습니다. 병동 TV 앞에서 다른 부대 환자들과 친해졌습니다.`, fx: { fit: -15, mind: -8 }, mark };
      }
      S.hospital = (S.hospital ?? 0) + 1;
      return { t: `${name} — 국군수도병원에 입원했지만 상태가 나빴습니다. 의무조사 끝에 병원에서 의병 전역합니다. 짐을 챙기는 손이 이상하게 느렸습니다.`, fx: { fit: -30, mind: -10 }, mark, ending: 'medical' };
    } },

  // 병원 다녀온 뒤 — 습관이 회복을 가른다. 수도병원(경중 1) 이상, 한 판에 한 번
  { id: 'medic_after', kind: 'event', when: { phase: ['serve'] }, needs: 'medic', gap: 99, w: 3, src: '가정',
    c: (S) => S.marks.medic.sev >= 1 && S.marks.medic.ym < S.ym,
    run: (S) => {
      const { name } = S.marks.medic, h = S.body.habit;
      if (h === 'gym' || h === 'run') return { t: `${name} 재활 운동을 하루도 빼먹지 않았습니다. 군의관이 차트를 넘기다 "회복 빠르네" 했습니다. 처음으로 의사에게 칭찬을 들었습니다.`, fx: { fit: 6, mind: 2 } };
      if (h === 'phone') return { t: phoneOn(S)
        ? `누워서 핸드폰만 보다 ${name} 통증이 도졌습니다. 다시 의무대 신세입니다. 의무병이 문을 열며 "또 왔네"라고 했습니다.`
        : `누워서 TV만 보다 ${name} 통증이 도졌습니다. 다시 의무대 신세입니다. 의무병이 문을 열며 "또 왔네"라고 했습니다.`, fx: { fit: -6, mind: -3 } };
      return { t: `비 오는 날이면 ${name} 자리가 쑤십니다. 선임이 "그거 평생 간다"고 겁을 줬습니다. 겁을 주고 나서 자기 무릎도 쓰다듬었습니다.`, fx: { mind: -1 } };
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
        delivery: phoneOn(S) ? ' 위병소 배달 기사님이 이름을 외웠습니다. 체력 측정이 걱정됩니다.' : ' 위병소 앞 중국집 아저씨가 내 이름을 외웠습니다. 체력 측정이 걱정됩니다.',
        phone: phoneOn(S) ? ' 체중보다 목이 문제입니다. 고개가 자꾸 앞으로 빠집니다.' : ' 체중보다 눈이 문제입니다. TV 채널을 돌리다 하루가 갔습니다.',
      }[S.marks.habit.k];
      return { t: head + tail, fx: d >= 4 ? { mind: -2 } : d <= -3 ? { mind: 3 } : {} };
    } },

  // 병장 꾀병 외진 — 아프지 않은데 일과를 피하러 수도병원 외진을 신청한다. 낮은 확률로 행보관에게 걸린다
  { id: 'medic_dodge', kind: 'decision', when: { phase: ['serve'] }, gap: 3, max: 3, w: 3, p: 0.3, src: '가정',
    c: (S) => S.rank >= 3 && !(S.flags.injured?.until > S.ym),
    build: (S) => ({
      title: '내일 일과, 외진으로 빠질까?',
      body: `내일은 하루 종일 작업입니다. ${S.marks.medic ? `예전 ${S.marks.medic.name} 핑계를 대면` : '허리가 좀 안 좋다고 하면'} 수도병원 외진을 끊어 줄 것 같습니다. 병장의 특권인지 병장의 타락인지는 모르겠습니다.`,
      src: '외진 기록에 "특이 소견 없음"이 찍히면 행보관 눈에 띌 수 있다. 걸릴 확률은 갈 때마다 올라가고, 처분은 행보관 성격을 따른다 (가정).',
      choices: [
        { k: 'stay', label: '그냥 일과를 뛴다', hint: '아무 일 없다 · 하루 종일 삽질' },
        { k: 'dodge', label: '외진을 신청한다', hint: '하루 열외 · 걸리면 훈계에서 휴가 박탈까지' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') return { t: '병장이지만 끝까지 작업을 뛰었습니다. 후임들이 조금 놀란 눈치였습니다. 허리는 정말 아팠고, 아프다고 말할 곳이 없었습니다.', fx: { fit: -1 }, rel: { sfc: 2 } };
      if (rand(S) >= dodgeCatch(S)) {
        return { t: pick(S, [
          '수도병원 외진을 다녀왔습니다. 진료는 5분, 나머지는 병원 PX와 대기실 TV였습니다. 군의관이 "특이 소견 없음"이라고 했을 때 속으로 만세를 불렀습니다.',
          '외진 버스 창밖으로 바깥 풍경을 실컷 봤습니다. 가로수도 신호등도 아줌마들도 다 신기했습니다. 군의관은 "특이 소견 없음"이라고 했습니다.',
          '외진 핑계로 하루를 통째로 뺐습니다. 복귀하니 작업은 다 끝나 있었고, 후임들이 아무 말 없이 내 눈을 피했습니다.',
        ]), fx: { mind: 6 } };
      }
      const sfc = S.env.people.find((p) => p.role === 'sfc');
      const d = SFC_DODGE[sfc?.temper] ?? SFC_DODGE.indifferent;
      const head = fmt(S, '외진 기록에 "특이 소견 없음"이 찍힌 걸 {sfc}이 봤습니다.');
      if (rand(S) < d.p) return { t: `${head} 꾀병으로 판단해 징계위원회에 올렸습니다.`, fx: { mind: -8 }, rel: { sfc: -15 }, punish: { kind: 'leaveCut', n: d.n } };
      return { t: `${head} ${d.talk}`, fx: { mind: -3 }, rel: { sfc: -5 } };
    } },
];
