// events-specialty.js — 특기병 사건: 같은 특기라도 배치 운에 따라 갈리는 일 (research/specialty-soldiers.md §3·§5)
// 대상은 rules/soldier-mos.json에 이미 있는 특기만 — 조리·운전(4군) · 해군 군악 · 육군 특전.
// 군악(육·공·해병)·의장·어학·카투사·군견·JSA·조교는 주특기 표에 없어 아직 못 넣는다.
// 근거는 대부분 커뮤니티 후기라 문구·확률·효과는 전부 '가정'. src는 근거가 된 후기 코드.
// 흔적: car_fixed 고정 배차 / car_none 배차 대기(작업병) / jump_wings 공수 수료 / food_poison 식중독 책임
import { rand } from '../src/engine.js';
import { monthsBetweenYm } from '../src/date.js';

const roll = (S, p) => rand(S) < p;
const served = (S) => (S.flags.serveYm ? monthsBetweenYm(S.flags.serveYm, S.ym) : -1);
const drillNow = (S) => S.env.drills.some((d) => d.ym === S.ym);
const P = (e) => ({ src: '가정', gap: 6, ...e, when: { phase: ['serve'], ...e.when } });
const of = (keys) => (S) => keys[S.branch]?.includes(S.mos);

export const COOK = of({ army: ['231107'], navy: ['50'], airforce: ['급양병'], marine: ['조리병'] });
export const DRIVER = of({ army: ['241101', '241103'], airforce: ['차량운전병'], marine: ['수송병'] });
export const BAND = of({ navy: ['36'] });
export const SF = of({ army: ['112101'] });

export const SPECIALTY_EVENTS = [
  // ── 조리 — 급양관·식수 인원·부대 규모에 따라 꿀과 헬이 갈린다 [§3-7] ──
  P({ id: 'spec_cook_dawn', kind: 'event', w: 3, c: COOK, src: 'specialty:S_new_37+S_new_38+S_new_40',
    run: () => ({ t: '새벽 네 시 반에 일어나 아침을 냈습니다. 설거지 후 두 시간 다시 자고, 점심과 저녁을 냈습니다. 주말도 똑같습니다. 대신 불침번과 점호는 빠졌습니다.', fx: { fit: -2, mind: -1, skill: 2 } }) }),
  P({ id: 'spec_cook_boss', kind: 'event', w: 3, gap: 48, c: (S) => COOK(S) && served(S) >= 1, src: 'specialty:S_new_38+S_new_39+S_new_40',
    run: (S) => (roll(S, 0.5)
      ? { t: '급양관이 조리병 사정을 잘 봐줬습니다. 식단을 무리하게 바꾸지 않고, 분기마다 위로휴가도 챙겨 줬습니다.', fx: { mind: 5 } }
      : { t: '급양관이 식단을 자주 바꾸고 검식 때마다 다시 하라고 했습니다. 취사장 분위기가 날카로워졌습니다.', fx: { mind: -5 } }) }),
  P({ id: 'spec_cook_field', kind: 'event', w: 6, gap: 3, c: (S) => COOK(S) && drillNow(S), src: 'specialty:S_new_38+S_new_39',
    // 두 후기가 상충(야전취사로 수면 감소 vs 훈련 때 오히려 많이 잠) → 부대별 편차로 반반
    run: (S) => (roll(S, 0.5)
      ? { t: '훈련 기간 내내 야전취사를 했습니다. 남들이 자는 동안 밥을 짓고, 남들이 먹는 동안 치웠습니다. 하루 세 시간을 겨우 잤습니다.', fx: { fit: -5, mind: -3 } }
      : { t: '훈련이 시작되자 취사장은 오히려 한가해졌습니다. 전투식량이 나간 날, 취사반은 내무실에서 실컷 잤습니다.', fx: { fit: 3, mind: 2 } }) }),
  P({ id: 'spec_cook_summer', kind: 'event', w: 3, gap: 10, c: COOK, when: { season: 'summer' }, src: 'specialty:S_new_37+S_new_39',
    run: () => ({ t: '한여름 취사장 온도계가 40도를 가리켰습니다. 국솥 앞에서 땀이 전투복을 뚫고 나왔습니다.', fx: { fit: -3, mind: -2 } }) }),
  P({ id: 'spec_cook_hygiene', kind: 'decision', w: 2, c: (S) => COOK(S) && served(S) >= 3, src: 'specialty:S_new_37',
    build: () => ({
      title: '식수 급증',
      body: '오늘 식수 인원이 갑자기 백 명 늘었습니다. 배식 시간까지 한 시간. 해동이 덜 된 고기와 세척을 기다리는 채소가 쌓여 있습니다.',
      choices: [
        { k: 'safe', label: '절차대로 하고 배식을 늦춘다', hint: '원성 · 안전' },
        { k: 'rush', label: '시간에 맞춘다', hint: '칭찬 · 위생 위험' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'safe') return { t: '배식이 20분 늦었습니다. 줄 선 병사들의 원성을 들었지만, 그날 밤 아무도 탈이 나지 않았습니다.', fx: { mind: -2, skill: 2 } };
      if (roll(S, 0.15)) return { t: '시간은 맞췄지만 그날 밤 의무대에 설사 환자가 줄을 섰습니다. 식중독 조사 끝에 조리 책임을 물었습니다.', fx: { mind: -10 }, punish: { kind: 'reprimand' }, mark: { set: { food_poison: {} } } };
      return { t: '시간 안에 배식을 끝냈습니다. 급양관이 수고했다며 어깨를 두드렸습니다.', fx: { mind: 3 } };
    } }),

  // ── 운전 — 자대에서 배차를 받느냐가 생활을 가른다 [§3-8] ──
  P({ id: 'spec_drive_assign', kind: 'event', w: 8, gap: 0, src: 'specialty:S_new_41+S_new_42+S_new_43',
    c: (S) => DRIVER(S) && served(S) >= 4 && !S.marks.car_fixed && !S.marks.car_none,
    run: (S) => (roll(S, 0.55)
      ? { t: '선임 옆자리에서 넉 달 동안 길을 익힌 끝에 고정 배차를 받았습니다. 이제 이 차는 내 차입니다.', fx: { mind: 5, skill: 3 }, mark: { set: { car_fixed: {} } } }
      : { t: '차는 모자라고 운전병은 넘쳤습니다. 배차표에 내 이름은 없었습니다. 내일부터 작업 인원으로 나갑니다.', fx: { mind: -6 }, mark: { set: { car_none: {} } } }) }),
  P({ id: 'spec_drive_idle', kind: 'event', w: 4, gap: 4, needs: 'car_none', c: DRIVER, src: 'specialty:S_new_41+S_new_43',
    run: (S) => (roll(S, 0.2)
      ? { t: '전역한 선임의 차가 비었습니다. 늦게나마 배차표에 이름이 올라갔습니다.', fx: { mind: 6 }, mark: { set: { car_fixed: {} }, del: ['car_none'] } }
      : { t: '운전병인데 오늘도 삽을 들었습니다. 제초, 진지 보수, 창고 정리. 면허는 지갑 속에서 잠들어 있습니다.', fx: { fit: 1, mind: -3 } }) }),
  P({ id: 'spec_drive_long', kind: 'event', w: 4, gap: 4, needs: 'car_fixed', c: DRIVER, src: 'specialty:S_new_41+S_new_42',
    run: (S) => {
      const m = Number(S.ym.slice(5, 7));
      return m === 12 || m <= 2
        ? { t: '눈 내린 고갯길을 체인 감고 넘었습니다. 조수석 간부도 운전병도 내리막 내내 말이 없었습니다.', fx: { mind: -3, skill: 3 } }
        : { t: '하루 종일 장거리 수송을 다녀왔습니다. 위병소 밖 바깥 공기를 마신 것만으로 남는 장사였습니다.', fx: { fit: -1, mind: 3, skill: 2 } };
    } }),
  P({ id: 'spec_drive_night', kind: 'decision', w: 2, needs: 'car_fixed', c: DRIVER, src: 'specialty:S_new_41',
    build: () => ({
      title: '졸음 운전',
      body: '야간 훈련을 마치고 복귀하는 길. 눈꺼풀이 자꾸 내려옵니다. 도착 예정 시간까지 30분 남았습니다.',
      choices: [
        { k: 'rest', label: '갓길에 세우고 10분 쉰다', hint: '지각 · 안전' },
        { k: 'push', label: '창문 열고 버틴다', hint: '사고 위험' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'rest') return { t: '10분 눈을 붙이고 출발했습니다. 늦었다는 잔소리는 들었지만 차도 사람도 무사했습니다.', fx: { mind: 1 } };
      if (roll(S, 0.12)) return { t: '커브에서 연석을 긁었습니다. 다친 사람은 없었지만 사고 경위서를 쓰고 한동안 배차에서 빠졌습니다.', fx: { mind: -8 }, punish: { kind: 'leaveCut', n: 2 }, mark: { set: { car_none: {} }, del: ['car_fixed'] } };
      return { t: '창문을 열고 껌을 씹으며 버텼습니다. 위병소에 닿았을 때 손바닥이 땀에 젖어 있었습니다.', fx: { mind: -2 } };
    } }),

  // ── 해군 군악 — 땡보 인식과 바쁜 행사 일정의 괴리 [§3-1] ──
  P({ id: 'spec_band_season', kind: 'event', w: 5, gap: 10, c: BAND, when: { months: [9, 10] }, src: 'specialty:S_new_18+S_new_24',
    run: () => ({ t: '국군의 날 시즌. 하루에 행사 두 건, 이동하는 버스에서 악보를 외웠습니다. 땡보라던 말은 누가 했을까요.', fx: { fit: -3, mind: -1, skill: 3 } }) }),
  P({ id: 'spec_band_winter', kind: 'event', w: 3, gap: 10, c: BAND, when: { season: 'winter' }, src: 'specialty:S_new_18+S_new_24',
    run: () => ({ t: '영하의 야외 행사. 밸브가 얼어 소리가 끊겼고, 마우스피스에 입술이 달라붙었습니다.', fx: { fit: -2, mind: -3 } }) }),
  P({ id: 'spec_band_funeral', kind: 'event', w: 1, gap: 12, c: BAND, src: 'specialty:S_new_18',
    run: () => ({ t: '장례 행사에서 진혼 나팔을 불었습니다. 유가족의 울음이 끝날 때까지 악기를 내리지 못했습니다.', fx: { mind: -4 } }) }),
  P({ id: 'spec_band_practice', kind: 'decision', w: 2, c: BAND, src: 'specialty:S_new_18+S_new_23+S_new_24',
    build: () => ({
      title: '개인 연습 시간',
      body: '행사가 없는 오후, 연습실이 비었습니다. 선임들은 휴게실에서 축구 중계를 보고 있습니다.',
      choices: [
        { k: 'practice', label: '전공 곡을 연습한다', hint: '실력 · 전역 후' },
        { k: 'hang', label: '선임들과 어울린다', hint: '관계' },
      ],
    }),
    apply: (S, k) => (k === 'practice'
      ? { t: '두 시간 동안 전공 곡을 붙잡았습니다. 군대에서도 음악을 놓지 않았다는 게 위안이 됐습니다.', fx: { skill: 5, mind: 2 } }
      : { t: '선임들과 축구를 봤습니다. 다음 행사 때 선임이 어려운 파트를 대신 맡아 줬습니다.', fx: { mind: 2 }, rel: { senior: 5 } }) }),

  // ── 육군 특전병 — 평소 업무는 일반 육군과 비슷, 공수는 희망자만 [§3-3] ──
  P({ id: 'spec_sf_routine', kind: 'event', w: 3, c: SF, src: 'specialty:S_new_25+S_new_26',
    run: () => ({ t: '특전사에 왔지만 오늘도 위병소와 CCTV 앞을 지켰습니다. 하루 일과는 친구가 있는 일반 부대와 별로 다르지 않습니다. 다른 건 구보 거리뿐입니다.', fx: { fit: 2, mind: -1 } }) }),
  P({ id: 'spec_sf_airborne', kind: 'decision', w: 3, c: (S) => SF(S) && served(S) >= 2, src: 'specialty:S_new_25+S_new_26',
    build: () => ({
      title: '공수기본교육',
      body: '다음 기수 공수교육 희망자를 받습니다. 병사 자리는 몇 개 없고, 체력 2급 이상이어야 합니다. 안 가도 아무도 뭐라 하지 않습니다.',
      choices: [
        { k: 'go', label: '지원한다', hint: '강하 경험 · 부상 위험' },
        { k: 'stay', label: '지원하지 않는다', hint: '안전 · 아쉬움' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') return { t: '지원하지 않았습니다. 강하복을 입고 돌아온 동기들의 무용담을 들으며 조금 후회했습니다.', fx: { mind: -2 } };
      if (S.st.fit < 50) return { t: '체력 기준에 못 미쳐 명단에서 빠졌습니다. 다음 기수를 노리기로 했습니다.', fx: { mind: -3 } };
      if (roll(S, 0.15)) return { t: '착지 훈련에서 무릎을 다쳐 퇴교했습니다. 목발을 짚고 부대로 돌아왔습니다.', fx: { fit: -12, mind: -6 } };
      return { t: '3주 만에 공수 휘장을 달았습니다. 문 앞에서 뛰어내리던 그 순간은 평생 잊지 못할 것입니다.', fx: { fit: -3, mind: 8, skill: 4 }, mark: { set: { jump_wings: {} } } };
    } }),
];
