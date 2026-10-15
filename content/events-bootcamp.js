// events-bootcamp.js — 훈련소 (train 페이즈). 문구·확률·효과는 전부 '가정'.
// - CURRICULUM: week(입소 후 N주차, 함수면 S로 계산)가 있는 사건은 엔진이 훈련 페이즈 길이에 비례해 고정 배치한다 (planMonth).
//   week가 trainWeeks+0.45 이상이면 훈련 페이즈 맨 끝 (수료식)
// - 나머지: 훈련소에서만 나오는 무작위 사건·결정 (chooseFeed, 한 판에 한 번씩)
import { rand } from '../src/engine.js';

const roll = (S, p) => rand(S) < p;
const pick = (S, xs) => xs[Math.floor(rand(S) * xs.length)];
const who = (S) => (S.status === 'officer' ? '후보생' : '훈련병');
const drill = (S, k, d) => { S.train[k] = Math.min(100, (S.train[k] ?? 0) + d); }; // 훈련소 숙련도 (TRAINING 키)
const addBond = (S, k, d) => { if (S.bonds?.[k] != null) S.bonds[k] = Math.max(0, Math.min(100, S.bonds[k] + d)); };
const T = { when: { phase: ['train'] }, src: '가정' };

/** 주차별 일정. 공통 골격(입소 → 사격 → 화생방 → 각개전투 → 행군 → 수료) + 군종별 문구 */
const CURRICULUM = [
  { id: 'boot_w1_enter', week: 1, run: (S) => {
    const t = {
      marine: '가입소 첫날, 머리를 밀고 "악!" 소리부터 배웠습니다. 사복은 상자에 담아 집으로 보냈습니다.',
      airforce: '가입교 주간. 신체검사를 한 번 더 받고서야 정식으로 입교했습니다. 사복은 상자에 담아 집으로 보냈습니다.',
    }[S.branch] ?? '보급품을 받고 군번을 외웠습니다. 사복은 상자에 담아 집으로 보냈습니다.';
    return { t: `입소 첫 주 — ${t}`, fx: { mind: -6 } };
  } },
  { id: 'boot_w2_basic', week: 2, run: (S) => {
    drill(S, 'foot', 8); drill(S, 'marksman', 5);
    return { t: `제식과 사격술 예비훈련(PRI). 팔이 떨어질 것 같았지만 ${who(S)} 티는 조금 벗었습니다.`, fx: { fit: 3, mind: -3 } };
  } },
  { id: 'boot_w3_rifle', week: 3, run: (S) => {
    const p = 0.25 + 0.6 * (S.train.marksman / 100); // 사격술 숙련도 → 명중
    drill(S, 'marksman', 8);
    if (roll(S, p)) return { t: '영점사격·실거리사격 — 20발 중 18발. 조교가 이름을 물었고, 포상으로 전화 5분을 받았습니다.', fx: { mind: 8, skill: 3 } };
    if (roll(S, 0.5)) return { t: '영점이 안 잡혀 세 번을 다시 쐈습니다. 귀가 한참 멍했습니다.', fx: { mind: -4 } };
    return { t: '실거리사격 합격선을 겨우 넘겼습니다. 탄피를 줍다 손가락을 데었습니다.', fx: { mind: -2 } };
  } },
  { id: 'boot_w3_gas', week: 3, run: (S) => {
    if (S.branch === 'navy') return { t: '함정 생존훈련 — 물이 차오르는 격실에서 방수 작업을 했습니다. 다 젖은 채 점호를 받았습니다.', fx: { fit: 3, mind: -5 } };
    if (roll(S, 0.2)) return { t: '화생방 — 가스실에서 방독면을 벗자마자 뛰쳐나갔습니다. 조교에게 붙잡혀 다시 들어갔습니다.', fx: { mind: -9 } };
    return { t: '화생방 — 가스실에서 방독면을 벗고 군번과 이름을 외쳤습니다. 눈물 콧물이 한참 멈추지 않았습니다.', fx: { mind: -5 } };
  } },
  { id: 'boot_w4_combat', week: 4, run: (S) => {
    drill(S, 'combat', 10);
    const t = roll(S, 0.3)
      ? '수류탄 실투 — 안전핀을 뽑자 손이 떨렸습니다. 조교가 손목을 잡아 줬습니다.'
      : '수류탄 실투 — 생각보다 멀리 날아가 안심했습니다.';
    return { t: `각개전투 교장을 온몸으로 기었습니다. ${t}`, fx: { fit: 4, mind: -4 } };
  } },
  { id: 'boot_w5_march', week: (S) => (S.branch === 'marine' ? 5 : 4.6), run: (S) => {
    drill(S, 'fitness', 8);
    const name = S.branch === 'marine' ? '극기주 천자봉 행군' : '야간 행군 20km';
    if (S.st.fit >= 65) return { t: `${name} — 완주했습니다. 마지막 언덕에서 군가를 불렀습니다.`, fx: { mind: 6 } };
    if (roll(S, 0.75)) return { t: `${name} — 발에 물집이 세 개 터졌지만 끝까지 걸었습니다.`, fx: { fit: -3, mind: 3 } };
    return { t: `${name} — 도중에 낙오해 구급차에 실렸습니다. 동기들보다 하루 늦게 숙영지에 돌아갔습니다.`, fx: { fit: -6, mind: -8 } };
  } },
  { id: 'boot_last_graduate', week: Infinity, run: (S) => {
    const name = S.status === 'officer' ? '임관식' : S.branch === 'marine' ? '빨간 명찰 수여식' : '수료식';
    const pin = S.status === 'officer' ? '어깨에 계급장을' : S.branch === 'marine' ? '가슴에 빨간 명찰을' : '가슴에 이병 계급장을';
    if (S.bonds?.lover != null && roll(S, 0.6)) { addBond(S, 'lover', 10); return { t: `${name} — 여자친구가 ${pin} 달아 줬습니다. 꽃다발을 받았습니다.`, fx: { mind: 12 } }; }
    if (roll(S, 0.8)) { addBond(S, 'family', 10); return { t: `${name} — 부모님이 ${pin} 달아 주셨습니다. 부대 앞 식당에서 고기를 먹었습니다.`, fx: { mind: 8 } }; }
    return { t: `${name} — 아무도 오지 못했습니다. 동기 부모님이 같이 밥을 사 주셨습니다.`, fx: { mind: 2 } };
  } },
].map((e) => ({ ...T, kind: 'event', ...e }));

/** 훈련소 무작위 사건 — 한 판에 한 번씩 (gap 99) */
const ISSUES = [
  { id: 'boot_cold', w: 4, run: () => ({ t: '생활관에 감기가 돌았습니다. 밤새 기침 소리에 잠을 설쳤고, 결국 나도 옮았습니다.', fx: { fit: -6, mind: -3 } }) },
  { id: 'boot_letter', w: 4, run: (S) => {
    const from = S.bonds?.lover != null ? '여자친구' : '어머니';
    addBond(S, S.bonds?.lover != null ? 'lover' : 'family', 6);
    return { t: `${from}에게서 인터넷 편지가 왔습니다. 소대장이 이름을 부를 때 얼굴이 달아올랐습니다. 불 끄고 몇 번이고 다시 읽었습니다.`, fx: { mind: 10 } };
  } },
  { id: 'boot_night_watch', w: 3, run: (S) => ({ t: pick(S, [
    '불침번 두 시간. 돌아와 누우니 옆 동기의 코골이에 다시 잠들 수 없었습니다.',
    '불침번 교대자를 깨우는데 아무리 흔들어도 일어나지 않았습니다. 결국 한 시간을 더 섰습니다.',
  ]), fx: { mind: -4, fit: -2 } }) },
  { id: 'boot_phone', w: 3, run: () => ({ t: '일주일에 한 번 주어지는 공중전화 3분. 줄이 길어 1분 만에 "잘 지내"만 하고 끊었습니다.', fx: { mind: -2 } }) },
  { id: 'boot_group_punish', w: 3, run: (S) => ({ t: `동기 한 명이 총기 번호를 틀려 생활관 전체가 군기훈련을 받았습니다. ${pick(S, ['그 동기는 밤새 미안하다고 했습니다.', '아무도 그 동기와 말하지 않았습니다.'])}`, fx: { fit: 2, mind: -6 } }) },
  { id: 'boot_dropout', w: 2, run: () => ({ t: '같은 생활관 동기 한 명이 귀가 조치됐습니다. 아침에 보니 빈 침상만 남아 있었습니다.', fx: { mind: -5 } }) },
  { id: 'boot_craving', w: 3, run: (S) => ({ t: pick(S, [
    '훈련소엔 PX가 없습니다. 꿈에 치킨이 나왔습니다.',
    '담배 생각에 손이 떨렸습니다. 동기들이 껌 대신 이를 악물라고 했습니다.',
  ]), fx: { mind: -3 } }) },
  { id: 'boot_age', w: 2, c: (S) => (S.flags.ageGap ?? 0) >= 3, run: (S) => ({ t: `동기들이 "아저씨"라고 불렀습니다. 한참 어린 분대장 ${who(S)}에게 혼나는 건 묘한 기분이었습니다.`, fx: { mind: -3 } }) },
].map((e) => ({ ...T, kind: 'event', gap: 99, ...e }));

/** 훈련소 결정 — 한 판에 한 번씩 (decision 기본 max 1) */
const DECISIONS = [
  { id: 'boot_squad_leader', w: 3,
    build: (S) => ({
      title: `분대장 ${who(S)}, 손 들까?`,
      body: `조교가 "분대장 ${who(S)} 할 사람"이라고 묻습니다. 생활관이 조용해졌습니다.`,
      choices: [
        { k: 'no', label: '가만히 있는다', hint: '튀지 않는 게 최고' },
        { k: 'yes', label: '손을 든다', hint: '통솔력↑ · 동기들 몫까지 혼난다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'no') return { t: '가만히 있었습니다. 다른 동기가 분대장이 됐습니다.' };
      drill(S, 'leadership', 15);
      return roll(S, 0.5)
        ? { t: '분대장을 맡았습니다. 수료식 날 조교가 "고생했다"고 했습니다.', fx: { mind: 6, skill: 3 } }
        : { t: '분대장을 맡았습니다. 동기들 대신 혼나는 날이 더 많았습니다.', fx: { mind: -6, skill: 3 } };
    } },
  { id: 'boot_religion', w: 3,
    build: () => ({
      title: '일요일, 종교행사에 갈까?',
      body: '일요일 오전 종교행사. 어디를 가느냐에 따라 간식이 다르다는 소문이 돕니다.',
      choices: [
        { k: 'church', label: '교회', hint: '초코파이·콜라 · 찬양이 길다' },
        { k: 'catholic', label: '성당', hint: '빵 · 조용한 미사' },
        { k: 'temple', label: '법당', hint: '떡 · 명상 시간' },
        { k: 'none', label: '생활관에 남는다', hint: '쉰다 · 청소 당번이 된다' },
      ],
    }),
    apply: (S, k) => ({
      church: { t: '교회에서 초코파이 두 개와 콜라를 받았습니다. 세상에서 가장 맛있었습니다.', fx: { mind: 6 } },
      catholic: { t: '성당에서 빵을 받고, 오랜만에 조용히 앉아 있었습니다.', fx: { mind: 5 } },
      temple: { t: '법당에서 떡을 먹고 10분 명상을 했습니다. 졸았습니다.', fx: { mind: 5 } },
      none: { t: '생활관에 남았다가 화장실 청소를 했습니다.', fx: { mind: 1, fit: 1 } },
    })[k] },
  { id: 'boot_sick_call', w: 3,
    build: () => ({
      title: '발목이 시큰하다',
      body: '행군 연습 뒤로 발목이 계속 시큰거립니다. 의무대에 가면 그날 훈련은 빠집니다.',
      choices: [
        { k: 'endure', label: '참는다', hint: '동기 눈치 없음 · 악화될 수 있다' },
        { k: 'go', label: '의무대에 간다', hint: '쉰다 · "꾀병" 소리를 들을 수도' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'go') return { t: '의무대에서 파스와 진통제를 받았습니다. 하루 쉬니 한결 나았습니다.', fx: { fit: 3, mind: -1 } };
      return roll(S, 0.35)
        ? { t: '참다가 결국 발목이 부었습니다. 남은 훈련 내내 절뚝였습니다.', fx: { fit: -8, mind: -4 } }
        : { t: '참았습니다. 며칠 지나니 괜찮아졌습니다.', fx: { mind: 2 } };
    } },
].map((e) => ({ ...T, kind: 'decision', ...e }));

export const BOOTCAMP_EVENTS = [...CURRICULUM, ...ISSUES, ...DECISIONS];
