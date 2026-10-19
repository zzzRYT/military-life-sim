// events-bootcamp.js — 훈련소 (train 페이즈). 문구·확률·효과는 전부 '가정'.
// - CURRICULUM: week(입소 후 N주차, 함수면 S로 계산)가 있는 사건은 엔진이 훈련 페이즈 길이에 비례해 고정 배치한다 (planMonth).
//   week가 trainWeeks+0.45 이상이면 훈련 페이즈 맨 끝 (수료식)
// - 나머지: 훈련소에서만 나오는 무작위 사건·결정 (chooseFeed, 한 판에 한 번씩)
// - 문체: 전역자의 썰. 결정은 모든 선택지가 무언가를 잃는다. 편지·전화는 휴대폰 시대(phoneOn)에 따라 갈린다.
import { rand, phoneOn } from '../src/engine.js';
import { fmt } from '../src/text.js';

const roll = (S, p) => rand(S) < p;
const pick = (S, xs) => xs[Math.floor(rand(S) * xs.length)];
const drill = (S, k, d) => { S.train[k] = Math.min(100, (S.train[k] ?? 0) + d); }; // 훈련소 숙련도 (TRAINING 키)
const addBond = (S, k, d) => { if (S.bonds?.[k] != null) S.bonds[k] = Math.max(0, Math.min(100, S.bonds[k] + d)); };
const T = { when: { phase: ['train'] }, src: '가정' };

/** 주차별 일정. 공통 골격(입소 → 사격 → 화생방 → 각개전투 → 행군 → 수료) + 군종별 문구 */
const CURRICULUM = [
  { id: 'boot_w1_enter', week: 1, run: (S) => {
    const t = {
      marine: '가입소 첫날, 바리캉이 머리 위를 두 번 지나가자 머리가 끝났습니다. "악!" 소리 지르는 법부터 배웠습니다. 사복은 상자에 담아 집으로 보냈고, 맨 위에는 운동화가 있었습니다.',
      airforce: '가입교 주간. 신체검사를 한 번 더 받고서야 정식으로 입교했습니다. 사복은 상자에 담아 집으로 보냈고, 상자 위에 엄마 번호를 쓰는 손이 조금 떨렸습니다.',
    }[S.branch] ?? '보급품 포대를 받고 군번을 외웠습니다. 내 이름이 번호로 바뀌는 데 걸린 시간은 5분이었습니다. 사복은 상자에 담아 집으로 보냈고, 상자 위에 엄마 번호를 쓰는 손이 조금 떨렸습니다.';
    return { t: `입소 첫 주 — ${t}`, fx: { mind: -6 } };
  } },
  { id: 'boot_w2_basic', week: 2, run: (S) => {
    drill(S, 'foot', 8); drill(S, 'marksman', 5);
    return { t: `제식과 사격술 예비훈련(PRI). "좌향좌"에서 절반이 오른쪽으로 돌았고, 나도 그 절반이었습니다. 이틀 뒤엔 다 같이 왼쪽으로 돌았습니다. 팔은 떨어질 것 같았지만 훈련병 티가 조금 벗겨졌습니다.`, fx: { fit: 3, mind: -3 } };
  } },
  { id: 'boot_w3_rifle', week: 3, run: (S) => {
    const p = 0.25 + 0.6 * (S.train.marksman / 100); // 사격술 숙련도 → 명중
    drill(S, 'marksman', 8);
    if (roll(S, p)) return { t: '영점사격·실거리사격 — 20발 중 18발. 조교가 "이름?" 하고 물었고, 포상으로 전화 5분이 떨어졌습니다. 5분 중 3분은 엄마가 우셨습니다.', fx: { mind: 8, skill: 3 }, mark: { set: { rifle_ace: {} } } };
    if (roll(S, 0.5)) return { t: '영점이 안 잡혀서 세 번을 다시 쐈습니다. 조교가 내 표적지를 보더니 "하늘에 쐈냐"고 했습니다. 귀는 저녁까지 멍했습니다.', fx: { mind: -4 }, mark: { set: { rifle_poor: {} } } };
    return { t: '실거리사격 합격선을 딱 한 발 차이로 넘겼습니다. 탄피를 줍다 손가락을 데었습니다. 그 한 발이 아니었다면 재사격이었습니다.', fx: { mind: -2 } };
  } },
  { id: 'boot_w3_gas', week: 3, run: (S) => {
    if (S.branch === 'navy') return { t: '함정 생존훈련 — 물이 차오르는 격실에서 방수 작업을 했습니다. 허리까지 물이 찼을 때 교관이 "침착하게"라고 했는데, 그 말이 제일 안 침착했습니다. 다 젖은 채 점호를 받았습니다.', fx: { fit: 3, mind: -5 } };
    if (roll(S, 0.2)) return { t: '화생방 — 가스실에서 방독면을 벗는 순간 몸이 먼저 문으로 갔습니다. 조교가 옷깃을 잡아 도로 끌고 들어갔습니다. 두 번째엔 눈물이 앞을 가려 군번을 틀렸습니다.', fx: { mind: -9 }, mark: { set: { gas_fled: {} } } };
    return { t: '화생방 — 가스실에서 방독면을 벗고 군번과 이름을 외쳤습니다. 눈물과 콧물이 같이 나와서 이름을 두 번 외쳤습니다. 나온 뒤엔 다들 처음 보는 사이처럼 서로의 얼굴을 쳐다봤습니다.', fx: { mind: -5 } };
  } },
  { id: 'boot_w4_combat', week: 4, run: (S) => {
    drill(S, 'combat', 10);
    const t = roll(S, 0.3)
      ? '수류탄 실투 — 안전핀을 뽑자 손이 떨렸습니다. 조교가 내 손목을 잡아 줬고, 그 손이 내 손보다 훨씬 따뜻했습니다.'
      : '수류탄 실투 — 생각보다 멀리 날아가서 안심했습니다. 날아간 건 수류탄인데 내 영혼이 같이 날아간 것 같았습니다.';
    return { t: `각개전투 교장을 온몸으로 기었습니다. 팔꿈치와 무릎에서 피 맛이 났습니다. ${t}`, fx: { fit: 4, mind: -4 } };
  } },
  { id: 'boot_w5_march', week: (S) => (S.branch === 'marine' ? 5 : 4.6), run: (S) => {
    drill(S, 'fitness', 8);
    const name = S.branch === 'marine' ? '극기주 천자봉 행군' : '야간 행군 20km';
    if (S.st.fit >= 65) return { t: `${name} — 완주했습니다. 마지막 언덕에서 군가를 부르다가 목이 쉬었습니다. 숙영지가 보이자 아무 말도 하지 않았는데 모두가 울었습니다.`, fx: { mind: 6 }, mark: { set: { march_strong: {} } } };
    if (roll(S, 0.75)) return { t: `${name} — 발에 물집이 세 개 터졌지만 끝까지 걸었습니다. 군화를 벗을 때 양말이 피로 군화에 붙어 있었습니다.`, fx: { fit: -3, mind: 3 } };
    return { t: `${name} — 도중에 낙오해 구급차에 실렸습니다. 동기들보다 하루 늦게 숙영지에 도착했는데, 아무도 뭐라 하지 않아서 더 괴로웠습니다.`, fx: { fit: -6, mind: -8 }, mark: { set: { march_dropout: {} } } };
  } },
  { id: 'boot_last_graduate', week: Infinity, run: (S) => {
    const name = S.branch === 'marine' ? '빨간 명찰 수여식' : '수료식';
    const pin = S.branch === 'marine' ? '가슴에 빨간 명찰을' : '가슴에 이병 계급장을';
    if (S.bonds?.lover != null && roll(S, 0.6)) { addBond(S, 'lover', 10); return { t: `${name} — 여자친구가 ${pin} 달아 줬습니다. 꽃다발을 받았습니다. 동기들이 휘파람을 불었고 조교도 못 본 척했습니다.`, fx: { mind: 12 }, mark: { set: { grad_lover: {} } } }; }
    if (roll(S, 0.8)) { addBond(S, 'family', 10); return { t: `${name} — 부모님이 ${pin} 달아 주셨습니다. 부대 앞 식당에서 고기를 먹었습니다. 아버지가 고기를 내 쪽으로만 계속 밀어 놓으셨습니다.`, fx: { mind: 8 }, mark: { set: { grad_family: {} } } }; }
    return { t: `${name} — 아무도 오지 못했습니다. 동기 부모님이 같이 밥을 사 주셨습니다. 남의 어머니가 내 밥 위에 고기를 올려 줘서 한참 고개를 들지 못했습니다.`, fx: { mind: 2 }, mark: { set: { grad_alone: {} } } };
  } },
].map((e) => ({ ...T, kind: 'event', ...e }));

/** 훈련소 무작위 사건 — 한 판에 한 번씩 (gap 99) */
const ISSUES = [
  { id: 'boot_cold', w: 4, run: () => ({ t: '생활관에 감기가 돌았습니다. 밤새 기침 소리 합창에 잠을 설쳤고, 결국 나도 옮았습니다. 훈련소에서 아프다고 쉬는 방법은 아직 아무도 모릅니다.', fx: { fit: -6, mind: -3 }, mark: { set: { boot_cold: {} } } }) },
  { id: 'boot_letter', w: 4, run: (S) => {
    const from = S.bonds?.lover != null ? '여자친구' : '어머니';
    addBond(S, S.bonds?.lover != null ? 'lover' : 'family', 6);
    const kind = phoneOn(S) ? '인터넷 편지' : '손편지';
    return { t: `${from}에게서 ${kind}가 왔습니다. 소대장이 내 이름을 부를 때 얼굴이 달아올랐습니다. 불 끄고 이불 속에서 몇 번이고 다시 읽었습니다. 세 번째부터는 외웠습니다.`, fx: { mind: 10 }, mark: { set: { [S.bonds?.lover != null ? 'letter_lover' : 'letter_mom']: {} } } };
  } },
  { id: 'boot_night_watch', w: 3, run: (S) => ({ t: pick(S, [
    fmt(S, '불침번 두 시간. 돌아와 누우니 {peer.name}의 코골이에 다시 잠들 수 없었습니다. 베개로 내 귀를 덮고 {peer.name}의 코를 덮고 싶은 마음이 번갈아 들었습니다.'),
    '불침번 교대자를 깨우는데 아무리 흔들어도 일어나지 않았습니다. 결국 한 시간을 더 섰습니다. 그 한 시간 동안 군번을 마흔 번쯤 외웠습니다.',
  ]), fx: { mind: -4, fit: -2 } }) },
  { id: 'boot_phone', w: 3, run: (S) => ({ t: phoneOn(S)
    ? '일주일에 한 번, 정해진 시간에 휴대폰을 돌려받았습니다. 3분. 줄이 길어서 엄마한테 "잘 지내" 한마디만 하고 끊었습니다. 끊고 나서 하고 싶은 말이 서른 개쯤 떠올랐습니다.'
    : '일주일에 한 번, 전화카드를 쥐고 공중전화 앞에 줄을 섰습니다. 내 앞에서 5분씩 쓰는 놈이 세 명이었고, 내 차례엔 1분이 남았습니다. "잘 지내" 한마디 하고 끊었습니다.', fx: { mind: -2 } }) },
  { id: 'boot_group_punish', w: 3, run: (S) => ({ t: fmt(S, `{peer.name}이 총기 번호를 틀려서 생활관 전체가 군기훈련을 받았습니다. ${pick(S, ['그날 밤 {peer.name}은 이불 속에서 계속 "미안하다"고 했습니다.', '아무도 {peer.name}과 말하지 않았지만, 아무도 화내지도 않았습니다.'])}`), fx: { fit: 2, mind: -6 }, mark: { set: { group_punish: {} } } }) },
  { id: 'boot_dropout', w: 2, run: () => ({ t: '같은 생활관 동기 한 명이 귀가 조치됐습니다. 아침에 보니 빈 침상만 남아 있었습니다. 그 침상을 누가 쓸지 아무도 묻지 않았습니다.', fx: { mind: -5 }, mark: { set: { peer_dropout: {} } } }) },
  { id: 'boot_craving', w: 3, run: (S) => ({ t: pick(S, [
    '훈련소엔 PX가 없습니다. 꿈에 치킨이 나왔는데, 꿈 속에서도 먹기 직전에 기상나팔이 울렸습니다.',
    '담배 생각에 손이 떨렸습니다. 동기들이 껌 대신 이를 악물라고 했습니다. 이를 악물다 보니 어금니가 아팠습니다.',
  ]), fx: { mind: -3 } }) },
  { id: 'boot_age', w: 2, c: (S) => (S.flags.ageGap ?? 0) >= 3, run: (S) => ({ t: `동기들이 "아저씨"라고 불렀습니다. 한참 어린 분대장 훈련병에게 혼나는 건 묘한 기분이었습니다. "알겠습니다"가 내 입에서 제일 어색하게 나왔습니다.`, fx: { mind: -3 } }) },
].map((e) => ({ ...T, kind: 'event', gap: 99, ...e }));

/** 훈련소 결정 — 한 판에 한 번씩 (decision 기본 max 1) */
const DECISIONS = [
  { id: 'boot_squad_leader', w: 3,
    build: (S) => ({
      title: `분대장 훈련병, 손 들까?`,
      body: `조교가 "분대장 훈련병 할 사람"이라고 물었습니다. 생활관이 조용해졌습니다. 시계 초침 소리와 누군가의 침 삼키는 소리만 들렸습니다.`,
      src: '분대장 훈련병은 통솔력 숙련이 오르고 조교의 눈에 띈다. 동기들 몫까지 혼날 수 있다.',
      choices: [
        { k: 'no', label: '가만히 있는다', hint: '튀지 않는다 · 손 안 든 게 두고두고 걸린다' },
        { k: 'yes', label: '손을 든다', hint: '통솔력↑ · 동기들 몫까지 혼난다, 밤마다 점검' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'no') return { t: '가만히 있었습니다. 다른 동기가 분대장이 됐습니다. 그 동기가 처음으로 구령을 외치는 걸 보면서 내 손바닥이 자꾸 근질거렸습니다.', fx: { mind: -2 }, mark: { set: { boot_quiet: {} } } };
      drill(S, 'leadership', 15);
      return roll(S, 0.5)
        ? { t: '분대장을 맡았습니다. 수료식 날 조교가 "고생했다"고 했습니다. 처음이자 마지막으로 들은 칭찬이었습니다.', fx: { mind: 6, skill: 3, fit: -3 }, mark: { set: { boot_squad_leader: { good: true } } } }
        : { t: '분대장을 맡았습니다. 동기들 대신 혼나는 날이 더 많았습니다. 점호 때마다 "분대장 앞으로"가 나를 먼저 불렀습니다.', fx: { mind: -6, skill: 3 }, mark: { set: { boot_squad_leader: { good: false } } } };
    } },
  { id: 'boot_religion', w: 3,
    build: () => ({
      title: '일요일, 종교행사에 갈까?',
      body: '일요일 오전 종교행사. 어디를 가느냐에 따라 간식이 다르다는 소문이 훈련소를 한 바퀴 돌았습니다.',
      src: '훈련소 종교행사는 개신교·천주교·불교가 열리며 참석은 자유다. 간식은 종교마다 다르다 (가정).',
      choices: [
        { k: 'church', label: '교회', hint: '초코파이·콜라 · 찬양이 길어 다리가 저린다' },
        { k: 'catholic', label: '성당', hint: '빵 · 조용한 미사에 졸음이 쏟아진다' },
        { k: 'temple', label: '법당', hint: '떡 · 명상과 108배, 무릎이 운다' },
        { k: 'none', label: '생활관에 남는다', hint: '쉰다 · 청소 당번이 된다' },
      ],
    }),
    apply: (S, k) => ({ ...{
      church: { t: '교회에서 초코파이 두 개와 콜라를 받았습니다. 세상에서 가장 맛있었습니다. 찬양이 20분 길어졌을 때는 초코파이를 위해 기꺼이 버텼습니다.', fx: { mind: 6, fit: -1 } },
      catholic: { t: '성당에서 빵을 받고 오랜만에 조용히 앉아 있었습니다. 조용함이 너무 좋아서 미사 중간에 졸았습니다. 옆자리가 옆구리를 찔렀습니다.', fx: { mind: 5, fit: -1 } },
      temple: { t: '법당에서 108배를 하고 떡을 먹었습니다. 명상 시간엔 10분 만에 졸았습니다. 무릎은 사흘 동안 하루에 한 번씩 안부를 물었습니다.', fx: { mind: 5, fit: -2 } },
      none: { t: '생활관에 남았다가 화장실 청소를 했습니다. 유일한 위안은 변기가 반짝일 때의 기분이었습니다.', fx: { mind: 1, fit: -1 } },
    }[k], mark: { set: { religion: { v: k } } } }) },
  { id: 'boot_sick_call', w: 3,
    build: () => ({
      title: '발목이 시큰하다',
      body: '행군 연습 뒤로 발목이 계속 시큰거렸습니다. 의무대에 가면 그날 훈련은 빠집니다. 옆 침상 동기가 "꾀병 소리 듣는다"고 작게 속삭였습니다.',
      src: '의무대 진료를 받으면 그날 훈련에서 열외된다. 참고 버티면 악화될 수 있다.',
      choices: [
        { k: 'endure', label: '참는다', hint: '동기 눈치 없음 · 악화될 수 있다' },
        { k: 'go', label: '의무대에 간다', hint: '하루 쉰다 · "꾀병" 소리를 듣는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'go') return { t: '의무대에서 파스와 진통제를 받았습니다. 하루 쉬니 한결 나았습니다. 돌아오니 내 몫의 청소가 동기들 몫이 되어 있었습니다.', fx: { fit: 3, mind: -1 }, rel: { peer: -3 }, mark: { set: { sick_call: {} } } };
      return roll(S, 0.35)
        ? { t: '참다가 결국 발목이 부었습니다. 남은 훈련 내내 절뚝였습니다. 조교가 "왜 이제 말했냐"며 한숨을 쉬었습니다.', fx: { fit: -8, mind: -4 }, mark: { set: { ankle: { v: 2 } } } }
        : { t: '참았습니다. 며칠 지나니 괜찮아졌습니다. 괜찮아진 건지 무뎌진 건지는 모르겠습니다.', fx: { mind: 2, fit: -2 }, mark: { set: { ankle: { v: 1 } } } };
    } },
].map((e) => ({ ...T, kind: 'decision', ...e }));

export const BOOTCAMP_EVENTS = [...CURRICULUM, ...ISSUES, ...DECISIONS];
