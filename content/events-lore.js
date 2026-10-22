// events-lore.js — 생활관에서 대대로 전해지는 썰 (research/community-lore.md §1~§9)
// 먹거리·동물·편지·작업·생활관·휴가·말년·전역 후. "이거 진짜 있었다" 싶은 반복 에피소드를 썰 문체(과거형 존댓말, 끝에 반전·여운 한 줄)로 옮겼다.
// 출처는 요약·각색만 (원문 문장·실명·특정 학교/부대 없음). 확률·효과·문구는 전부 '가정', 근거 코드는 src에.
// 시대 구간 e01 ~2004 / e02 2005~2013 / e03 2014~2017 / e04 2018~2021 / e05 2022~
// 흔적: jjam_cat(다친 고양이를 돌봄) · cook_debt(취사병에게 빚) · vip_prep(높은 분 오시기 전 대청소) · looked_back(위병소에서 돌아봄) · cap_cash(전역모 돈을 냄)
import { rand, here, phoneOn } from '../src/engine.js';
import { monthsBetweenYm } from '../src/date.js';
import { fmt, HELP } from './events.js';

const roll = (S, p) => rand(S) < p;
const pick = (S, xs) => xs[Math.floor(rand(S) * xs.length)];
const served = (S) => (S.flags.serveYm ? monthsBetweenYm(S.flags.serveYm, S.ym) : -1);
const since = (S, mark, n) => !!S.marks[mark] && monthsBetweenYm(S.marks[mark].ym, S.ym) >= n;
const ground = (S) => S.branch === 'army' || S.branch === 'marine'; // 훈련장·연병장 위주 군종
const e0 = (S) => S.era?.id;
const lastMonth = (S) => S.ym === S.dates.discharge.slice(0, 7); // 전역하는 달 (monthsLeft는 한 달 늦게 갱신돼 0이 되지 않는다)

// 이 파일의 사건 공통값: 한 판에 한 번, 이 달 후보가 될 확률 p(손잡이), 서로 비슷한 빈도의 w
const L = (e) => ({ kind: 'event', max: 1, w: 3, p: 0.3, ...e, when: { phase: ['serve'], ...e.when } });
const D = (e) => ({ kind: 'decision', w: 3, p: 0.3, ...e, when: { phase: ['serve'], ...e.when } });

export const LORE_EVENTS = [
  // ═══════════════ 동물 ═══════════════
  L({ id: 'lore_cat_title', src: 'community-lore #1 [S_lore_1][S_lore_2] 짬타이거·냥병장 (이름 붙이기 관행은 기사 확인, 장면은 가정)',
    when: { era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => S.env.post !== 'shipLarge' && S.env.post !== 'shipSmall' && !S.marks.cat,
    run: (S) => ({ t: pick(S, [
      '취사장 뒤에 사는 고양이를 다들 병장님이라고 불렀습니다. 제가 전역할 때도 그 병장님은 전역하지 않았습니다.',
      '잔반을 먹고 자란 고양이가 생활관 개 한 마리보다 컸습니다. 이름은 짬타이거. 손을 내밀었다가 긁힌 이등병이 사흘 동안 아무 말을 안 했습니다.']),
    fx: { mind: 5 } }) }),

  D({ id: 'lore_cat_hurt', src: 'community-lore #1 [S_lore_1] 짬타이거·냥병장 — 중성화·치료 사각지대가 있다는 보도', p: 0.35,
    when: { era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => S.env.post !== 'shipLarge' && S.env.post !== 'shipSmall' && !S.marks.jjam_cat,
    build: () => ({
      title: '다친 고양이',
      body: '취사장 뒤 고양이가 다리를 절며 나타났습니다. 눈이 마주쳤습니다. 행보관이 동물을 막사에 들이지 말라고 한 건 지난주 조회 때였습니다.',
      choices: [
        { k: 'hide', label: '창고에 몰래 들인다', hint: '고양이는 산다 · 걸리면 행보관이 벼른다' },
        { k: 'report', label: '행보관에게 보고한다', hint: '절차대로 · 동기들이 "일 키웠다"고 한다' },
        { k: 'ignore', label: '못 본 척 지나간다', hint: '아무 일도 없다 · 밤새 마음이 무겁다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'hide') return { t: '관물대 상자에 수건을 깔고 사료 대신 짬밥에서 뺀 생선을 줬습니다. 사흘 뒤 행보관이 상자를 열어 보고 한참 서 있다가 "내일 수의과 면회 있다더라"라고만 했습니다.', fx: { mind: 6 }, rel: { sfc: -6 }, mark: { set: { jjam_cat: {} } } };
      if (k === 'report') return { t: '행보관이 담당 간부에게 전화를 돌렸습니다. 고양이는 동물보호 단체 차에 실려 갔고, 생활관에선 한동안 "누가 일렀냐"는 말이 돌았습니다. 그게 나라는 건 끝까지 아무도 몰랐습니다.', fx: { mind: 2 }, rel: { peer: -4 }, mark: { set: { jjam_cat: {} } } };
      return { t: '식판을 들고 지나쳤습니다. 다음 날 고양이는 보이지 않았습니다. 그 뒤로 취사장 뒤를 지날 때마다 시선이 땅으로 내려갔습니다.', fx: { mind: -6 } };
    } }),

  // ═══════════════ 먹거리 ═══════════════
  L({ id: 'lore_matdasi', src: 'community-lore #2 [S_lore_6][S_lore_7] 맛다시 비닐밥 (훈련장 별미는 기사 확인, 장면은 가정)', p: 0.35,
    c: (S) => ground(S) && served(S) >= 1,
    run: (S) => ({ t: pick(S, [
      '산 중턱 쉬는 시간에 선임이 맛다시 한 봉지를 꺼냈습니다. 비닐 한 장에 밥 세 사람 몫을 넣고 주물렀고, 그날 먹은 밥이 군 생활 통틀어 제일 맛있었습니다.',
      '비닐에 밥과 참치와 볶음고추장을 넣고 주물러 먹었습니다. 설거지가 없어서 좋았는데, 손에 묻은 고추장이 점심 이후 내내 따라다녔습니다.']),
    fx: { mind: 5, fit: -1 } }) }),

  D({ id: 'lore_matdasi_share', src: 'community-lore #2 [S_lore_6] 맛다시 비닐밥 — 하나 남은 걸 누구에게 (딜레마는 가정)', p: 0.2,
    c: (S) => ground(S) && S.rank <= 2 && here(S, 'roomSenior') && here(S, 'peer'),
    build: (S) => ({
      title: '마지막 한 봉지',
      body: fmt(S, '훈련 이틀째 저녁, 배낭 바닥에서 맛다시 한 봉지가 나왔습니다. 마지막 하나입니다. {roomSenior}이 슬쩍 쳐다보고, 옆에서 {peer.name}이 라면 국물만 마시고 있습니다.'),
      choices: [
        { k: 'senior', label: '선임에게 건넨다', hint: '선임 점수는 오른다 · 동기가 서운해한다' },
        { k: 'peer', label: '동기와 나눈다', hint: '동기와 더 가까워진다 · 선임이 눈치를 준다' },
        { k: 'eat', label: '내가 먹는다', hint: '배는 찬다 · 양쪽 다 한 마디씩 한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'senior') return { t: fmt(S, '{roomSenior.name}이 "역시"라고 하며 받았습니다. 옆에서 {peer.name}이 라면 국물을 한 번 더 마셨습니다. 그 소리가 귀에 오래 남았습니다.'), fx: { mind: -2 }, rel: { roomSenior: 6, peer: -6 } };
      if (k === 'peer') return { t: fmt(S, '{peer.name}과 반씩 나눠 먹었습니다. {roomSenior.name}은 말없이 다른 데를 쳐다봤고, 훈련이 끝날 때까지 그 시선이 등 뒤에 있었습니다.'), fx: { mind: 3 }, rel: { roomSenior: -6, peer: 10 } };
      return { t: '비닐째 주물러 먹고 나니 양심이 따라왔습니다. "야, 너 혼자 먹었냐"는 말이 양쪽에서 동시에 날아왔습니다.', fx: { mind: -3 }, rel: { roomSenior: -4, peer: -4 } };
    } }),

  L({ id: 'lore_px_microwave', src: 'community-lore #3 [S_lore_8][S_lore_9] PX 냉동식품 (전자레인지 줄서기·계급순은 가정)', p: 0.35,
    when: { era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => served(S) >= 1,
    run: (S) => ({ t: pick(S, [
      '전자레인지는 한 대, 줄은 일곱 명이었습니다. 내 만두 차례가 왔을 땐 점호 십 분 전이었습니다. 만두는 반쯤만 익었고, 그걸 서서 먹었습니다.',
      'PX 신상 냉동 치킨이 들어왔다는 소문에 일과 후 PX가 혼잡했습니다. 몇 분 돌려 먹는 게 전부인데, 그게 그날 하루의 목적이었습니다.']),
    fx: { mind: 4 } }) }),

  D({ id: 'lore_px_line', src: 'community-lore #3 [S_lore_8] PX 냉동식품 — 줄 양보 (딜레마는 가정)', p: 0.2,
    when: { era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => S.rank <= 1 && here(S, 'senior'),
    build: (S) => ({
      title: '전자레인지 앞',
      body: fmt(S, '점호 전 마지막 기회입니다. 제 만두가 막 전자레인지에 들어가려는데, {senior}이 팔짱을 끼고 뒤에 섰습니다. 시계는 8시 52분입니다.'),
      choices: [
        { k: 'yield', label: '먼저 돌리시라고 양보한다', hint: '선임이 흡족해한다 · 내 만두는 식는다' },
        { k: 'hold', label: '"제 것만 먼저 돌리겠습니다"', hint: '만두는 건진다 · 선임이 표정을 굳힌다' },
        { k: 'skip', label: '포기하고 자리를 뜬다', hint: '분란은 없다 · 배가 고프다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'yield') return { t: fmt(S, '{senior.name}의 컵라면이 먼저 돌았고, 내 만두는 점호 종소리에 식은 채로 나왔습니다. 그래도 그는 내 어깨를 한 번 쳤습니다.'), fx: { mind: -3 }, rel: { senior: 6 } };
      if (k === 'hold') return { t: fmt(S, '만두는 뜨거웠고, 뒷덜미는 차가웠습니다. {senior.name}은 "많이 컸다"는 말을 한 번만 했습니다. 한 번이 길었습니다.'), fx: { mind: -2 }, rel: { senior: -9 } };
      return { t: '만두를 도로 냉동고에 넣었습니다. 침상에 누워서도 배에서 소리가 났습니다.', fx: { mind: -4, fit: -1 } };
    } }),

  L({ id: 'lore_golden_cart', src: 'community-lore #4 [S_lore_3] 황금마차 — 격오지 이동 PX 트럭 (운용 시작 연도 미확인, 장면은 가정)', p: 0.4,
    when: { era: ['e03', 'e04', 'e05'], place: ['gop', 'mountain', 'island'] }, c: (S) => S.branch !== 'navy',
    run: () => ({ t: '언덕 아래에서 트럭 엔진 소리가 들리자 소초 전체가 일어났습니다. 저는 한 달 치 라면과 어머니께 드릴 화장품 하나를 샀습니다. 계산하고 나서야 월급날이 멀다는 걸 알았습니다.', fx: { mind: 6 } }) }),

  D({ id: 'lore_cart_vs_post', src: 'community-lore #4 [S_lore_3] 황금마차 — 근무 교대와 도착이 겹침 (딜레마는 가정)', p: 0.2,
    when: { era: ['e03', 'e04', 'e05'], place: ['gop', 'mountain', 'island'] }, c: (S) => S.branch !== 'navy' && here(S, 'peer'),
    build: (S) => ({
      title: '트럭 오는 날',
      body: fmt(S, '황금마차가 왔는데 하필 제 교대 시간입니다. 다음 마차는 보름 뒤입니다. 마침 {peer.name}이 눈을 마주쳤습니다. 부탁하면 들어줄 것 같은 얼굴입니다.'),
      choices: [
        { k: 'ask', label: '동기에게 근무를 부탁한다', hint: '장은 본다 · 빚이 생긴다' },
        { k: 'stay', label: '근무를 지킨다', hint: '정석이다 · 다음 달까지 빈손이다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'ask') return { t: fmt(S, '{peer.name}은 "라면 두 개"를 달라고 했습니다. 고르는 내내 마음이 바빴고, 근무지로 돌아오는 길에 그가 건넨 눈빛에 이자가 붙어 있었습니다.'), fx: { mind: 4 }, rel: { peer: -5 } };
      return { t: '내 교대가 끝났을 땐 트럭 바퀴 자국만 남아 있었습니다. 동기가 사 온 과자 한 봉지가 내 관물대에 놓여 있었습니다. 과자가 덜 달았습니다.', fx: { mind: -5 } };
    } }),

  L({ id: 'lore_gundaeria', src: 'community-lore #5 [S_lore_11][S_lore_12] 군대리아 (조립 방식·2021 일부 대체·2026 퇴장 기사)', p: 0.2,
    c: (S) => served(S) >= 1,
    run: (S) => (e0(S) === 'e05'
      ? { t: '고참들은 군대리아를 그리워했지만, 우리 식판에는 바로 구워 낸 버거가 올라와 있었습니다. 선임이 한 입 먹더니 말없이 잼을 찾았습니다. 없었습니다.', fx: { mind: 4 } }
      : { t: '옆자리 동기는 딸기잼을 패티 위에 발랐습니다. 저는 그게 틀렸다고 생각했지만 말하지 않았습니다. 그날의 유일한 자유가 그 쌓는 순서였기 때문입니다.', fx: { mind: 3 } }) }),

  L({ id: 'lore_gunppang', src: 'community-lore #6 [S_lore_7][S_lore_13][S_lore_14] 건빵 응용 (튀김건빵·건플레이크)', p: 0.3,
    c: (S) => ground(S),
    run: (S) => ({ t: pick(S, [
      '야간 행군 쉬는 시간에 건빵 한 봉지가 돌았습니다. 사회에선 쳐다보지도 않던 과자의 별사탕을 세어 가며 먹었습니다. 마지막 한 알은 서로 양보하다 내 입에 들어왔습니다.',
      '건빵을 우유에 말아 먹는 사람을 처음 봤습니다. 이름이 건플레이크라고 했습니다. 먹어 보니 이름만큼은 아니었지만 그날 아침엔 괜찮았습니다.']),
    fx: { mind: 3 } }) }),

  D({ id: 'lore_fry_gunppang', src: 'community-lore #6 [S_lore_7][S_lore_14] 튀김건빵 — 취사병에게 부탁 (딜레마는 가정)', p: 0.2,
    c: (S) => S.rank >= 1 && ground(S),
    build: () => ({
      title: '튀김건빵',
      body: '남은 건빵이 박스째 쌓였습니다. 취사병이 새벽에 튀김 기름을 쓴다는 소문이 있습니다. 부탁하면 설탕까지 뿌려 준다는데, 취사병은 얻어먹으면 얻어먹은 만큼 다음에 부탁이 돌아오는 사람입니다.',
      choices: [
        { k: 'ask', label: '취사병에게 부탁한다', hint: '생활관이 신나 한다 · 취사병에게 빚이 생긴다' },
        { k: 'self', label: '라면 포트로 직접 해 본다', hint: '들키면 큰일 · 성공하면 영웅' },
        { k: 'skip', label: '그냥 먹는다', hint: '평범하다 · 아무 일도 없다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'ask') return { t: '새벽에 취사장 뒷문으로 건빵 박스를 넘겼습니다. 아침에 튀김건빵이 생활관에 나타났고, 환호가 터졌습니다. 취사병은 "다음 번엔 반찬 얘기 하자"고만 했습니다.', fx: { mind: 6 }, rel: { peer: -2 }, mark: { set: { cook_debt: {} } } };
      if (k === 'self') {
        if (roll(S, 0.45)) return { t: '포트 안에서 기름이 튀었고 냄새가 복도 끝까지 갔습니다. 당직 간부가 문을 열었을 땐 이미 접시가 비어 있었고, 증거는 내 손가락에 묻은 설탕뿐이었습니다.', fx: { mind: -4 }, punish: { kind: 'reprimand' } };
        return { t: '튀김건빵은 일단 성공했습니다. 문제는 포트에서 사흘 동안 기름 냄새가 빠지지 않았다는 겁니다. 라면 맛이 이상하다는 항의가 들어왔습니다.', fx: { mind: 5, fit: -1 } };
      }
      return { t: '건빵을 그냥 씹었습니다. 목이 메서 물을 두 번 마셨습니다. 다들 비슷한 표정으로 앉아 있었습니다.', fx: { mind: -2 } };
    } }),

  L({ id: 'lore_cook_back', src: 'community-lore #6 [S_lore_14] 튀김건빵 후속 — 취사병의 부탁 (가정)', needs: 'cook_debt', p: 0.9, w: 5,
    c: (S) => since(S, 'cook_debt', 2),
    run: () => ({ t: '취사병이 PX 앞에서 나를 불렀습니다. 부탁은 의외로 단순했습니다. 새벽에 불침번 서는 날 한 시간만 같이 있어 달라는 것이었습니다. 그날 솥에서 올라오는 김을 한참 같이 봤습니다.', fx: { mind: 2, fit: -2 } }) }),

  L({ id: 'lore_combat_ration', src: 'community-lore #7 [S_lore_17][S_lore_18] 전투식량 (맛 논쟁과 즉각취식형은 기사 확인)', p: 0.3,
    when: { era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => ground(S) && S.rank <= 2,
    run: (S) => ({ t: pick(S, [
      '끈을 당기자 봉지가 뜨거워졌습니다. 다들 맛없다고 했는데, 비 맞은 야산에서 먹은 그 볶음밥은 이상하게 맛있었습니다.',
      '전투식량을 처음 뜯은 날, 물 붓는 선을 못 찾아 한참 헤맸습니다. 퍽퍽한 밥을 씹으며 "일부러 맛없게 만든다"는 선임의 말을 반쯤 믿었습니다.']),
    fx: { mind: 2, fit: 1 } }) }),

  D({ id: 'lore_birthday_choco', src: 'community-lore #8 [S_lore_4][S_lore_5] 생일 케이크 — 초코파이 케이크는 가정', p: 0.12,
    c: (S) => S.rank <= 2 && here(S, 'peer'),
    build: (S) => ({
      title: '소등 후 생일',
      body: fmt(S, '내일이 {peer.name}의 생일인데 소대는 케이크 얘기가 없습니다. 관물대에 초코파이가 여섯 개 있습니다. 소등까지는 십 분입니다. 라이터는 없고 손전등은 있습니다.'),
      choices: [
        { k: 'party', label: '소등 후 몰래 축하한다', hint: '동기와 가까워진다 · 걸리면 생활관 전체가 지적' },
        { k: 'day', label: '낮에 간부 허락을 받는다', hint: '문제는 없다 · 감동은 작다' },
        { k: 'skip', label: '모른 척한다', hint: '평화롭다 · 동기가 섭섭해한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'party') {
        if (roll(S, 0.3)) return { t: fmt(S, '초코파이 여섯 개를 쌓고 손전등 불빛으로 노래를 입 모양으로만 불렀습니다. 마지막 소절에서 당직 간부가 문을 열었고, 생활관은 십 분 동안 얼어붙었습니다. {peer.name}은 그 와중에도 한 입 먹었습니다.'), fx: { mind: 3 }, rel: { peer: 15, roomSenior: -6 } };
        return { t: fmt(S, '초코파이 여섯 개를 쌓고 손전등 불빛 아래 입 모양으로만 노래를 불렀습니다. {peer.name}은 소원을 속으로만 빌었고, 아무도 무슨 소원인지 묻지 않았습니다.'), fx: { mind: 4, fit: -1 }, rel: { peer: 15 } };
      }
      if (k === 'day') return { t: '당직 사관이 "생일이면 받아 가라"며 공식 예산 케이크를 열어 줬습니다. 손바닥만 한 빵 위에 초가 하나 꽂혀 있었습니다. 다들 그걸 열 조각으로 나눴습니다.', fx: { mind: -1 }, rel: { peer: 3 } };
      return { t: fmt(S, '아무 일도 없이 지나갔습니다. 다음 날 {peer.name}이 "나 생일이었는데"라고 웃으며 말했습니다. 웃음 끝이 조금 아팠습니다.'), fx: { mind: -2 }, rel: { peer: -8 } };
    } }),

  L({ id: 'lore_cook_2am', src: 'community-lore #9 [S_lore_20][S_lore_21] 취사병의 새벽 — 짬밥 어원은 여러 설 중 하나', p: 0.25,
    c: (S) => S.rank <= 2,
    run: () => ({ t: '불침번을 서다 새벽 두 시에 취사장 불이 켜지는 걸 봤습니다. 수천 인분의 솥에 불이 붙는 모습이었습니다. 그날부터 저는 반찬 투정을 하지 않았습니다. 사흘 정도였지만요.', fx: { mind: 3 } }) }),

  // ═══════════════ 편지·소포 ═══════════════
  D({ id: 'lore_boot_parcel', src: 'community-lore #10 [S_lore_22][S_lore_23][S_lore_24] 사복 소포와 부모의 편지 (전 시대 반복 서사)', p: 1, w: 12,
    when: { phase: ['train'] },
    build: () => ({
      title: '사복 소포',
      body: '훈련소 2주차, 입고 온 사복을 집으로 부치는 날입니다. 상자에 옷을 접어 넣다가 주머니에서 버스표가 나왔습니다. 편지를 한 장 같이 넣어도 된다고 합니다. 무슨 말을 써야 할지 모르겠습니다.',
      choices: [
        { k: 'honest', label: '힘들다고 솔직하게 쓴다', hint: '속은 후련하다 · 부모님 마음이 무겁다' },
        { k: 'fine', label: '괜찮은 척 쓴다', hint: '가족은 안심한다 · 내 속은 눌러 담는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'honest') return { t: '"밥이 생각보다 괜찮은데 잠이 모자라요"까지는 평소 같았는데, 그 아래에서 글씨가 흔들렸습니다. 그날 밤은 눈이 뜨거워 잠을 설쳤습니다. 나중에 어머니가 그 편지를 코팅해서 서랍에 넣어 두셨다는 걸 알았습니다.', fx: { mind: -1, fit: -1 }, mark: { set: { parcel_honest: {} } } };
      return { t: '"저는 잘 있습니다"를 세 번 썼습니다. 어머니는 그 문장을 보고 오히려 더 우셨다고 합니다. 그 사실을 알게 된 건 휴가 때였습니다.', fx: { mind: -3 }, mark: { set: { parcel_fine: {} } } };
    } }),

  L({ id: 'lore_letter_print', src: 'community-lore #13 [S_lore_30][S_lore_31] 훈련소 인터넷 편지 출력 배부 (육군은 2023-08-15 폐지)', p: 0.55, w: 5,
    when: { phase: ['train'], era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => S.branch !== 'marine' && (S.branch !== 'army' || S.ym < '2023-08'),
    run: (S) => ({ t: pick(S, [
      '저녁 점호 직전 조교가 이름을 부를 때마다 누군가 일어났습니다. 제 이름은 세 번 불렸고, 동기 하나는 한 번도 불리지 않았습니다. 그날 밤 저는 편지 한 장을 그 친구에게 읽어 줬습니다.',
      '인터넷 편지가 출력되어 나왔습니다. 가장 윗줄이 "아들 보아라"였고, 그 줄에서 이미 눈이 뜨거워졌습니다. 조교가 못 본 척 천장을 올려다봤습니다.']),
    fx: { mind: 6 }, rel: { peer: 3 } }) }),

  L({ id: 'lore_school_letter', src: 'community-lore #11 [S_lore_25][S_lore_26] 학생 위문편지 (연말 관행은 보도 확인, 학교·개인 특정 없음)', p: 0.5, w: 4,
    when: { era: ['e01', 'e02'], months: [11, 12] },
    run: () => ({ t: '연말에 편지 상자가 왔습니다. 제 몫은 초등학생의 크레파스 글씨였고 "아저씨 추우시죠"로 시작했습니다. 저는 스무 살이었고, 아저씨라는 말에 처음으로 웃었습니다.', fx: { mind: 5 } }) }),

  D({ id: 'lore_reply_letter', src: 'community-lore #11 [S_lore_26] 학생 위문편지 — 답장 여부 (딜레마는 가정)', p: 0.2,
    when: { era: ['e01', 'e02'], months: [12, 1] }, c: (S) => S.rank <= 2 && here(S, 'peer'),
    build: (S) => ({
      title: '아저씨께 보내는 답장',
      body: fmt(S, '위문편지 중에 질문이 많은 한 통이 내 앞으로 왔습니다. "군대는 재미있어요?" {peer.name}이 옆에서 어깨 너머로 읽고 웃고 있습니다. 주소는 학교로 되어 있습니다.'),
      choices: [
        { k: 'reply', label: '진지하게 답장을 쓴다', hint: '누군가에게 기억이 된다 · 동기들이 놀린다' },
        { k: 'ignore', label: '그냥 상자에 넣는다', hint: '아무 일 없다 · 조금 미안하다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'reply') return { t: fmt(S, '"재미는 없지만 사람은 많이 만난다"고 썼다가 지우고 "열심히 하고 있다"로 고쳤습니다. 우체통에 넣고 돌아서는데 {peer.name}이 흉내를 냈습니다. "아저씨~"'), fx: { mind: 4 }, rel: { peer: -3 } };
      return { t: '편지를 접어 상자에 넣었습니다. 다음 날 아침까지 마음 한구석에 "군대는 재미있어요?"가 남아 있었습니다.', fx: { mind: -2 } };
    } }),

  D({ id: 'lore_comfort_box', src: 'community-lore #12 [S_lore_28][S_lore_29] 위문품 상자 (분배 풍경은 가정)', p: 0.3, w: 4,
    when: { months: [2, 9, 10, 12] }, c: (S) => S.rank >= 2 && here(S, 'junior'),
    build: (S) => ({
      title: '남는 두 개',
      body: fmt(S, '기업 이름이 찍힌 위문품 상자가 열렸습니다. 초코파이가 생활관 인원보다 두 개 많습니다. {junior.name}이 눈을 내리깔고 있고, 선임들은 상자 근처를 서성입니다.'),
      choices: [
        { k: 'junior', label: '막내에게 몰아준다', hint: '막내는 감동한다 · 선임 눈치가 따갑다' },
        { k: 'senior', label: '선임들 몫으로 돌린다', hint: '분위기는 매끄럽다 · 막내는 잊지 않는다' },
        { k: 'lottery', label: '가위바위보로 정한다', hint: '공정하다 · 이긴 사람만 웃는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'junior') return { t: fmt(S, '{junior.name}은 두 개를 양손에 쥐고 한참 있었습니다. 선임들은 말이 없었지만 그날 저녁 청소 담당이 내 이름으로 바뀌었습니다.'), fx: { mind: 3 }, rel: { junior: 8, senior: -4 } };
      if (k === 'senior') return { t: fmt(S, '두 개는 선임에게 갔습니다. {junior.name}의 표정은 읽을 수 없었지만 한 달 뒤 청소 때 그 표정이 되돌아왔습니다.'), fx: { mind: -2 }, rel: { junior: -8, senior: 5 } };
      return { t: '가위바위보 판이 열렸고 방 안에 처음 보는 열기가 돌았습니다. 이긴 사람은 선임이었고, 그는 이긴 초코파이를 후임에게 하나 건넸습니다. 이상하게 그게 제일 어색한 장면이었습니다.', fx: { mind: -1 }, rel: { peer: -2 } };
    } }),

  // ═══════════════ 노동·작업 ═══════════════
  L({ id: 'lore_snow_trash', src: 'community-lore #14 [S_lore_32][S_lore_33] 제설 — "하늘에서 내리는 쓰레기" (민간 위탁 이후 감소는 [S_lore_34])', p: 0.55, w: 4,
    when: { season: 'winter' }, c: (S) => S.branch !== 'navy' && !(S.era && ['e04', 'e05'].includes(S.era.id) && S.env.post === 'rear' && roll(S, 0.5)),
    run: (S) => ({ t: pick(S, [
      '창밖에 첫눈이 내렸습니다. 여자친구는 "예쁘다"고 문자를 보냈고, 저는 넉가래를 들고 연병장에 서 있었습니다.',
      '눈은 아침에 한 번, 점심에 한 번, 저녁에 한 번 치웠습니다. 세 번째에 쌓인 눈은 처음 쌓인 눈보다 더 미웠습니다.']),
    fx: { fit: -2, mind: -3 } }) }),

  D({ id: 'lore_xmas_snow', src: 'community-lore #14 [S_lore_33] 제설 — 일요일·크리스마스의 눈 (딜레마는 가정)', p: 0.4,
    when: { months: [12] }, c: (S) => S.branch !== 'navy' && S.rank <= 2 && here(S, 'peer'),
    build: (S) => ({
      title: '크리스마스 아침',
      body: fmt(S, '12월 25일 새벽, 눈이 밤새 쌓였습니다. 당직 간부가 제설 인원을 묻습니다. 자원하면 대신 저녁 외출이 한 시간 열리고, 안 하면 {peer.name}이 대신 나가야 합니다.'),
      choices: [
        { k: 'volunteer', label: '자원한다', hint: '간부 눈에 든다 · 손발이 얼어붙는다' },
        { k: 'rotate', label: '가위바위보로 정한다', hint: '공정하다 · 진 사람이 나간다' },
        { k: 'stay', label: '눈을 감는다', hint: '동기가 나간다 · 한참 미안하다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'volunteer') return { t: '넉가래를 밀며 캐럴이 흘러나오는 PX를 지나쳤습니다. 오후에 간부가 캔커피를 하나 건네며 "고맙다"고 했습니다. 손은 저녁까지 펴지지 않았습니다.', fx: { fit: -4, mind: 2 }, rel: { lt: 5 } };
      if (k === 'rotate') return { t: fmt(S, '가위바위보에서 {peer.name}이 졌습니다. 그는 넉가래를 들고 나가며 "산타가 이럴 수는 없다"고 중얼거렸습니다. 나는 따뜻한 생활관에서 그 모습을 창으로 봤습니다.'), fx: { mind: -2 }, rel: { peer: -3 } };
      return { t: fmt(S, '{peer.name}이 대신 나갔습니다. 점심에 돌아온 그의 코끝이 빨갰습니다. 그는 아무 말도 안 했습니다. 말을 안 하는 쪽이 더 컸습니다.'), fx: { mind: -4 }, rel: { peer: -8 } };
    } }),

  L({ id: 'lore_leaf', src: 'community-lore #15 [S_lore_34][S_lore_35] 낙엽 쓸기 (민간 위탁 계획 포함, 나무 터는 이야기는 회고)', p: 0.55, w: 4,
    when: { months: [10, 11], era: ['e01', 'e02', 'e03', 'e04'] }, c: (S) => S.branch === 'army' || S.branch === 'airforce',
    run: () => ({ t: '오후 내내 낙엽을 쓸었습니다. 저녁 점호 때 창밖을 보니 바람이 불고 있었습니다. 아무도 창밖 얘기를 하지 않았습니다.', fx: { fit: -1, mind: -3 } }) }),

  L({ id: 'lore_vip_prep', src: 'community-lore #16 [S_lore_36][S_lore_37][S_lore_38] 높은 분 오시기 전 (사단장 방문 소문 → 대청소·도색, 돌 칠하기는 가정)', p: 0.35, w: 4,
    c: (S) => ground(S) && served(S) >= 2 && !S.marks.vip_prep,
    run: (S) => ({ t: pick(S, [
      '사단장이 순시를 온다는 소문 하나에 대대 전체가 대청소에 들어갔습니다. 관물대를 다시 칠하고 연병장 가장자리의 돌까지 닦았습니다. 정작 사단장이 어디를 보는지는 아무도 몰랐습니다.',
      '소등 직전에 "내일 높은 분이 오신다"는 방송이 나왔습니다. 그날 밤 침상에서 걸레질을 했고, 새벽 세 시에 관물대 각이 마지막으로 잡혔습니다.']),
    fx: { fit: -3, mind: -3 }, mark: { set: { vip_prep: {} } } }) }),

  L({ id: 'lore_vip_none', src: 'community-lore #16 [S_lore_36] 높은 분 오시기 전 후속 — 방문이 취소됨 (가정)', needs: 'vip_prep', p: 0.9, w: 5,
    c: (S) => since(S, 'vip_prep', 1),
    run: () => ({ t: '사단장은 오지 않았습니다. 순시는 다음 주로 미뤄졌다가 취소됐습니다. 우리가 닦은 연병장 돌은 비가 오자 도로 지저분해졌고, 그걸 본 병사 하나가 "다음 번엔 칠하지 말고 닦기만 하자"고 했습니다.', fx: { mind: -2 } }) }),

  L({ id: 'lore_uniform_size', src: 'community-lore #17 [S_lore_39][S_lore_40][S_lore_41] 몸을 군복에 맞춰라 — 보급 사이즈 (이후 선택지 개선 보도, 장면은 가정)', p: 0.45, w: 4,
    when: { era: ['e01', 'e02', 'e03'] }, c: (S) => served(S) <= 1,
    run: () => ({ t: '보급 담당이 건네준 전투복은 팔이 손등까지 내려왔습니다. "크면 줄여 입어." 소매를 세 번 접었는데 한 달 뒤엔 소매가 딱 맞았습니다. 몸이 군복에 맞춰졌습니다.', fx: { mind: -1 } }) }),

  // ═══════════════ 생활관·근무 ═══════════════
  D({ id: 'lore_boots', src: 'community-lore #18 [S_lore_42][S_lore_43][S_lore_44] 전투화 광내기 (e01~e02 후기, 부조리 계열 — 구경거리로 쓰지 않음)', p: 0.3,
    when: { era: ['e01', 'e02'] }, c: (S) => S.rank === 0 && here(S, 'roomSenior'),
    build: (S) => ({
      title: '선임의 전투화',
      body: fmt(S, '소등 전 {roomSenior}이 전투화 두 켤레를 침상 앞에 내려놓고 갔습니다. "내일 아침까지." 불광이 필요한 전투화입니다. 다 닦으려면 두 시간입니다. 나도 내 걸 아직 못 닦았습니다.'),
      choices: [
        { k: 'polish', label: '새벽까지 닦는다', hint: '선임은 흡족하다 · 몸이 상한다' },
        { k: 'refuse', label: '정중하게 거절한다', hint: '떳떳하다 · 한동안 눈 밖이다' },
        { k: 'tell', label: '동기와 같이 건의한다', hint: '절차대로 · 소문이 돈다' },
      ],
      help: HELP,
    }),
    apply: (S, k) => {
      if (k === 'polish') return { t: '침을 뱉어 가며 닦았습니다. 새벽 네 시에 전투화에 내 얼굴이 비쳤습니다. 그 얼굴이 낯설어서 한참을 봤습니다.', fx: { fit: -4, mind: -5 }, rel: { roomSenior: 8 } };
      if (k === 'refuse') return { t: fmt(S, '"제 걸 닦아야 합니다"라고 했습니다. {roomSenior.name}은 말이 없었고, 그날부터 생활관에서 내 이름이 한 박자 늦게 불렸습니다.'), fx: { mind: -3 }, rel: { roomSenior: -14 } };
      return { t: fmt(S, '동기와 함께 소대장에게 갔습니다. 다음 날부터 전투화 심부름이 없어졌습니다. 대신 {roomSenior.name}은 한동안 내 쪽을 보지 않았습니다.'), fx: { mind: -2 }, rel: { roomSenior: -10, peer: 5, lt: 5 } };
    } }),

  L({ id: 'lore_night_ghost', src: 'community-lore #21 [S_lore_47][S_lore_48][S_lore_50] 야간 근무 괴담 (소문이 근무 기피로 이어지는 사회 효과만 — 묘사 없음)', p: 0.4,
    c: (S) => S.branch !== 'navy' && S.rank <= 2 && !(phoneOn(S) && roll(S, 0.5)),
    run: (S) => ({ t: pick(S, [
      '탄약고 쪽 초소는 3시 근무가 제일 길다는 소문이 있었습니다. 이유를 물으니 선임은 "원래 그래"라고만 했습니다. 3시에 서 보니 정말 시간이 두 배로 늘어 있었습니다.',
      '새벽 근무 복귀 때 선임이 한마디 했습니다. "초소 뒤쪽은 보지 마라." 이유는 안 말했습니다. 그날부터 초소 뒤쪽을 한 번도 안 봤습니다.']),
    fx: { mind: -3, skill: 1 } }) }),

  L({ id: 'lore_wake_guard', src: 'community-lore #19 [S_lore_45] 불침번 깨우기 (공군은 2000년대 중반까지 야간 불침번)', p: 0.3,
    c: (S) => S.branch !== 'navy' && !(S.branch === 'airforce' && !['e01', 'e02'].includes(e0(S))) && S.rank <= 2,
    run: () => ({ t: '교대 시간 깨우기가 제일 힘들다는 걸 알았습니다. 선임을 건드렸다가 반사적으로 팔이 날아왔고, 아무도 모른 척했습니다. 다음 번엔 베개를 살짝 쳤습니다.', fx: { mind: -2 } }) }),

  L({ id: 'lore_family_ask', src: 'community-lore #22 [S_lore_51] 전입 첫날 가족 질문 (장면 각색 — 개인정보 질문은 소개 정도로만)', p: 0.6, w: 5,
    when: { era: ['e01', 'e02', 'e03'] }, c: (S) => S.branch === 'army' && served(S) <= 1,
    run: (S) => ({ t: '전입 첫날 저녁, 선임들이 번갈아 와서 고향, 학교, 가족을 물었습니다. 묻는 말에 막힘없이 답하자 한 선임이 "머리 좋네"라고 했습니다. 내 대답은 이틀 뒤 생활관 전체의 정설이 되어 있었습니다.', fx: { mind: -2 } }) }),

  L({ id: 'lore_army_soccer', src: 'community-lore #23 [S_lore_52] 군대스리가 (포지션이 짬순, 간부는 공격수라는 회고)', p: 0.35,
    c: (S) => S.branch === 'army' || S.branch === 'marine',
    run: (S) => ({ t: S.rank <= 1
      ? '일요일 축구에서 이병은 골키퍼가 됩니다. 이유는 공이 가장 많이 오는 자리이기 때문입니다. 공이 열두 번 날아왔고, 열두 번째엔 손이 아니라 얼굴이었습니다.'
      : '일요일 축구에서 간부가 공격수로 뛰면 수비수는 막지 않습니다. 이상한 규칙은 그래서 정확히 지켜집니다. 후반 십 분쯤 되면 모두 서로 눈을 마주치지 않았습니다.',
    fx: { fit: 2, mind: 2 } }) }),

  L({ id: 'lore_airforce_jokgu', src: 'community-lore #24 [S_lore_56][S_lore_57][S_lore_58] 공군은 족구 (기원 논쟁 중 — 부대 문화 한 줄)', p: 0.55, w: 4,
    when: { branch: ['airforce'] },
    run: () => ({ t: '일요일 오후 족구 네트 앞에서 선후임이 같은 팀이 됐습니다. 서브는 짬순이 아니라 실력순이었고, 그건 이상하게 공평하게 느껴졌습니다. 졌습니다.', fx: { fit: 2, mind: 3 } }) }),

  L({ id: 'lore_locker_angle', src: 'community-lore #20 [S_lore_46] 관물대 각 — 칼각 점검 (e01~e03 관행, 부조리 구경거리 아님)', p: 0.4,
    when: { era: ['e01', 'e02', 'e03'] }, c: (S) => S.rank <= 1 && served(S) <= 8,
    run: (S) => ({ t: pick(S, [
      '관물대 각이 1cm 틀어졌다고 다시 하라고 했습니다. 1cm가 어디서 어디까지인지 자로 재 가며 맞췄습니다. 다 맞추고 나니 다른 선임이 "너무 각졌다"고 했습니다.',
      '양말은 발목 접힘이 같은 쪽으로, 수건은 가로 3줄. 점검을 앞두고 새벽까지 관물대를 열었다 닫았다 했습니다. 점검은 의외로 십 초 만에 끝났습니다.']),
    fx: { mind: -3 } }) }),

  L({ id: 'lore_rollcall_laugh', src: 'community-lore #20 [S_lore_46] 점호 때 웃음 참기 (TV 시트콤 묘사만 확인 — 장면은 가정)', p: 0.3,
    c: (S) => S.rank <= 1,
    run: () => ({ t: '점호 때 누가 소리 없이 방귀를 뀌었고, 열 명이 동시에 눈을 감았습니다. 숨을 참는 소리가 웃음보다 컸습니다. 당직 사관이 "왜들 그러나"고 물었고, 열 명 모두 "아무것도 아닙니다"라고 답했습니다.', fx: { mind: 3 } }) }),

  D({ id: 'lore_vip_paint', src: 'community-lore #16 [S_lore_36][S_lore_37][S_lore_38] 높은 분 오시기 전 — 보여주기 도색 (돌·연석 칠하기는 가정)', p: 0.3,
    c: (S) => ground(S) && S.rank >= 1 && here(S, 'lt'),
    build: (S) => ({
      title: '연병장 돌',
      body: fmt(S, '내일 순시를 앞두고 {lt}이 연병장 가장자리 돌을 하얗게 칠하라고 합니다. 페인트는 이미 와 있습니다. 비가 오면 한 시간에 다 벗겨질 칠이라는 걸 모두가 압니다.'),
      choices: [
        { k: 'paint', label: '시키는 대로 칠한다', hint: '무난하다 · 헛수고를 안다' },
        { k: 'ask', label: '"비 오면 벗겨집니다"라고 말한다', hint: '합리적이다 · 소대장 표정이 굳는다' },
        { k: 'slow', label: '천천히 칠한다', hint: '밤새 칠할 위기 · 적당히 피한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'paint') return { t: '밤새 칠했습니다. 새벽에 돌이 반짝였고, 아침 안개에 서로의 마스크 위로 흰 페인트 가루가 내려앉았습니다. 순시는 오지 않았습니다.', fx: { fit: -3, mind: -3 } };
      if (k === 'ask') return { t: fmt(S, '{lt.name}은 한참을 말이 없다가 "그래도 칠해라"라고 했습니다. 그가 틀린 건 아니었고 내가 틀린 것도 아니었습니다. 칠은 비 오기 전에 마르지 못했습니다.'), fx: { mind: -2 }, rel: { lt: -6 } };
      return { t: '붓 끝에 페인트를 아주 조금씩 묻혔습니다. 칠하는 속도가 흙 속 달팽이와 같아졌을 때 선임이 와서 붓을 뺏어 갔습니다. "비켜라, 내가 할게." 그의 팔에 흰 점이 뚝뚝 떨어졌습니다.', fx: { mind: -2 }, rel: { senior: -4 } };
    } }),

  // ═══════════════ 휴가·복귀 ═══════════════
  L({ id: 'lore_return_bus', src: 'community-lore #25 [S_lore_59][S_lore_60] 동서울터미널 일요일 — 복귀 행렬 (역할은 확인, 풍경은 가정)', p: 0.4,
    when: { era: ['e02', 'e03', 'e04', 'e05'], place: ['gop', 'front', 'cold', 'mountain'] }, c: (S) => S.branch === 'army' && S.leave.left < 25,
    run: () => ({ t: '휴가 복귀 날 일요일 오후, 터미널 대합실에 같은 가방을 든 청년이 서른 명이었습니다. 눈이 마주쳐도 아무도 인사하지 않았습니다. 버스에 오르니 창가 자리마다 얼굴이 서로 닮아 있었습니다.', fx: { mind: -4 } }) }),

  L({ id: 'lore_dad_story', src: 'community-lore #26 [S_lore_55] 휴가 나가면 아버지의 군대 이야기 (전 시대 반복 서사)', p: 0.2,
    c: (S) => served(S) >= 4 && S.leave.left < 28,
    run: (S) => ({ t: pick(S, [
      '휴가 첫날 저녁, 아버지가 갑자기 소주를 따르며 "내 때는 말이야"를 꺼냈습니다. 그 얘기가 이번엔 이상하게 들렸습니다. 내 군대에서도 비슷한 일이 있었기 때문입니다.',
      '휴가 나온 날 아버지가 말없이 내 전투화를 닦아 놓았습니다. 닦는 법이 나보다 정확했습니다. 이유는 묻지 않았습니다.']),
    fx: { mind: 5 } }) }),

  // ═══════════════ 말년·전역 ═══════════════
  L({ id: 'lore_countdown', src: 'community-lore #28 [S_lore_62][S_lore_63] 전역일 세기 — 달력 X → 부대 PC → 앱 (시대별 도구)', p: 0.7, w: 5,
    c: (S) => S.monthsLeft != null && S.monthsLeft <= 4 && S.monthsLeft >= 2,
    run: (S) => ({ t: e0(S) === 'e04' || e0(S) === 'e05'
      ? '전역일을 세는 앱이 잠금 화면에 떠 있었습니다. 숫자가 한 자리가 되자 내가 먼저 앱을 닫았습니다. 어딘가에서 숫자가 거꾸로 올라가는 느낌이었습니다.'
      : '달력에 그은 X가 마지막 줄에 닿았습니다. 마지막 X는 볼펜으로 쓰기 아까워서 연필로 그었습니다. 지우개는 쓰지 않았습니다.',
    fx: { mind: 4 } }) }),

  D({ id: 'lore_cap_cash', src: 'community-lore #29 [S_lore_63][S_lore_64] 전역모 꾸미기 — 돈 걷기 (e01~e03 관행, 쇠퇴 시기는 미확인)', p: 0.55,
    when: { era: ['e01', 'e02', 'e03'] }, c: (S) => S.monthsLeft != null && S.monthsLeft <= 3 && S.monthsLeft >= 1 && S.rank >= 3 && here(S, 'junior'),
    build: (S) => ({
      title: '전역모',
      body: fmt(S, '말년에 접어들자 {junior}이 전역모 이야기를 꺼냈습니다. 후임들이 돈을 걷어 전역모를 꾸며 주는 게 "전통"이랍니다. 후임의 월급은 아직 한참 적습니다. 전통은 다 알고 있습니다. 아무도 입 밖에 안 낼 뿐입니다.'),
      choices: [
        { k: 'accept', label: '전통대로 받는다', hint: '체면은 선다 · 후임 지갑이 얇아진다' },
        { k: 'self', label: '"내 걸 내가 사겠다"고 한다', hint: '떳떳하다 · 후임은 곤란해한다' },
        { k: 'cancel', label: '아예 하지 말라고 한다', hint: '후임이 편해진다 · 어색한 분위기' },
      ],
      help: HELP,
    }),
    apply: (S, k) => {
      if (k === 'accept') return { t: fmt(S, '전역모 위에 반짝이는 별과 내 이름이 새겨져 있었습니다. 후임들이 말없이 웃고 있었지만 {junior.name}의 눈에는 계산기가 있었습니다.'), fx: { mind: 5 }, rel: { junior: -8 }, mark: { set: { cap_cash: {} } } };
      if (k === 'self') return { t: fmt(S, '"제가 사 오겠습니다"라고 했더니 {junior.name}이 안도의 한숨을 쉬었습니다. 그 한숨은 내 월급 십만 원보다 컸습니다. 전역모 값은 내 지갑에서 나갔습니다.'), fx: { mind: -1 }, rel: { junior: 8 } };
      return { t: fmt(S, '"그런 건 하지 마라"고 하니 {junior.name}이 어쩔 줄 몰라 했습니다. 며칠 뒤 후임들끼리 따로 마련해 놓은 걸 알았지만 모른 척했습니다.'), fx: { mind: -2 }, rel: { junior: 12 } };
    } }),

  L({ id: 'lore_pass_down', src: 'community-lore #30 [S_lore_63][S_lore_65][S_lore_66] 물려주기와 마지막 밤 (소지품을 후임에게 넘기는 관행)', p: 0.85, w: 6,
    c: (S) => S.monthsLeft != null && S.monthsLeft <= 1 && here(S, 'junior'),
    run: (S) => ({ t: fmt(S, '전역 전날 밤, 쓰던 담요와 손때 묻은 수첩, 선반 위 라면 두 봉지를 {junior.name}에게 넘겼습니다. 인수인계서는 썼는데 이 한 줄은 쓰지 않았습니다. "여기 TV 채널은 마음대로 돌려도 된다."'), fx: { mind: 6 }, rel: { junior: 8 } }) }),

  D({ id: 'lore_gate_look', src: 'community-lore #31 [S_lore_66][S_lore_67] 위병소를 나서는 순간 — 뒤돌아보면 다시 온다는 속설은 가정', p: 1, w: 8, must: true,
    c: (S) => lastMonth(S),
    build: () => ({
      title: '위병소',
      body: '전역 날 아침, 위병소 차단기가 올라갑니다. 보따리를 둘러메고 한 걸음 내디뎠습니다. 뒤에서 누군가 이름을 부르는 것 같기도 하고, 아닌 것 같기도 합니다. 선배들이 "뒤돌아보면 다시 온다"고 했던 말이 떠오릅니다.',
      choices: [
        { k: 'look', label: '한 번만 돌아본다', hint: '막사가 보인다 · 속설이 마음에 걸린다' },
        { k: 'go', label: '앞만 보고 걷는다', hint: '미련 없이 간다 · 어딘가 허전하다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'look') return { t: '위병소 너머에서 막사 창문의 불빛이 하나둘 켜지고 있었습니다. 반사적으로 팔이 올라가 경례를 하려다 멈췄습니다. 그 손이 허공에서 한참 갈 곳을 몰랐습니다.', fx: { mind: -2 }, mark: { set: { looked_back: {} } } };
      return { t: '발소리가 이상하게 크게 들렸습니다. 백 미터쯤 걷고서야 숨이 쉬어졌습니다. 앞을 보면서도 어깨가 계속 뒤쪽에 있었습니다.', fx: { mind: -1 } };
    } }),

  L({ id: 'lore_mod_clock', src: 'community-lore #32 [S_lore_68] 국방부 시계 (속담 수준의 상용구)', p: 0.25, w: 4,
    c: (S) => S.monthsLeft != null && S.monthsLeft >= 6 && S.monthsLeft <= 14 && S.rank <= 2,
    run: () => ({ t: '"국방부 시계는 거꾸로 매달아도 간다"는 말을 처음 들었을 땐 위로인 줄 알았습니다. 일병 달고 나니 협박처럼 들렸습니다. 병장이 되면 또 다르게 들린다고 했습니다.', fx: { mind: 1 } }) }),

  // ═══════════════ 되부르기: 앞선 선택이 돌아오는 후속 ═══════════════
  L({ id: 'lore_parcel_honest_back', src: 'community-lore #10 [S_lore_22][S_lore_23] 사복 소포 후속 — 솔직하게 쓴 편지 (가정)', needs: 'parcel_honest', p: 0.6, w: 6,
    c: (S) => since(S, 'parcel_honest', 5),
    run: () => ({ t: '휴가 나온 날 서랍에서 코팅된 종이를 발견했습니다. 훈련소 첫 달에 보낸 내 편지였습니다. 어머니는 "버릴까 하다 못 버렸다"고 했는데, 코팅한 사람이 그 말을 하는 게 이상했습니다.', fx: { mind: 6 } }) }),

  L({ id: 'lore_parcel_fine_back', src: 'community-lore #10 [S_lore_22][S_lore_23] 사복 소포 후속 — 괜찮은 척 쓴 편지 (가정)', needs: 'parcel_fine', p: 0.6, w: 6,
    c: (S) => since(S, 'parcel_fine', 5),
    run: () => ({ t: '어머니가 전화로 불쑥 말했습니다. "그 편지에 잘 있다고만 썼더라. 사실은 안 그랬지?" 대답을 못 하고 한참 숨을 쉬었습니다. 어머니는 "괜찮다, 이제 알았다" 하고 끊었습니다.', fx: { mind: 4 } }) }),

  L({ id: 'lore_cat_back', src: 'community-lore #1 [S_lore_1] 짬타이거 후속 — 돌봐 준 고양이 (가정)', needs: 'jjam_cat', p: 0.6, w: 6,
    c: (S) => since(S, 'jjam_cat', 3) && S.env.post !== 'shipLarge' && S.env.post !== 'shipSmall',
    run: () => ({ t: '발을 절던 고양이가 어느새 취사장 뒤에서 제일 느긋한 자세로 누워 있었습니다. 내가 지나가자 꼬리만 한 번 흔들었습니다. 그날은 온종일 기분이 좋았습니다.', fx: { mind: 6 } }) }),

  L({ id: 'lore_carry_back', src: 'yearly-routine R-07 [S_rtn_13] 행군 후속 — 대신 맨 소총 (가정)', needs: 'carried', p: 0.6, w: 6,
    c: (S) => since(S, 'carried', 2) && here(S, 'junior'),
    run: (S) => ({ t: fmt(S, '{junior.name}이 PX에서 음료수 하나를 내 관물대 위에 올려놓고 갔습니다. 쪽지엔 "그날 소총 값"이라고만 적혀 있었습니다. 글씨가 삐뚤빼뚤했습니다.'), fx: { mind: 4 }, rel: { junior: 4 } }) }),

  L({ id: 'lore_cold_back', src: 'yearly-routine R-01 [S_rtn_5] 내한훈련 후속 — 동기의 발 (가정)', needs: ['cold_hide'], p: 0.6, w: 6,
    c: (S) => since(S, 'cold_hide', 2) && here(S, 'peer'),
    run: (S) => ({ t: fmt(S, '{peer.name}은 아직도 겨울에 양말을 세 겹 신습니다. 내가 쳐다보니 "너 때문 아니고 내 발 때문"이라고 했습니다. 맞는 말이지만 듣기엔 고맙지 않았습니다.'), fx: { mind: -2 }, rel: { peer: 3 } }) }),

  L({ id: 'lore_cap_back', src: 'community-lore #29 [S_lore_64] 전역모 후속 — 돈을 걷어 준 후임들 (가정)', needs: 'cap_cash', p: 0.8, w: 6,
    c: (S) => since(S, 'cap_cash', 1) && here(S, 'junior'),
    run: (S) => ({ t: fmt(S, '전역모를 쓰고 거울을 보다가 {junior.name}과 눈이 마주쳤습니다. 그의 표정은 읽히지 않았지만, 구석의 PX 영수증이 낯익었습니다. 영수증은 내 이름으로 계산돼 있지 않았습니다.'), fx: { mind: -2 }, rel: { junior: -2 } }) }),

  // ═══════════════ 전역 후 (엔딩 달의 한 줄) ═══════════════
  L({ id: 'lore_after_dream', src: 'community-lore #33 [S_lore_69][S_lore_70] 재입대 꿈 (언론에서도 반복되는 소재)', p: 1, w: 30,
    c: (S) => lastMonth(S),
    run: (S) => ({ t: S.marks.looked_back
      ? '전역하고 한 달 뒤, 꿈을 꿨습니다. 위병소 앞에서 뒤를 돌아본 나를 영장이 기다리고 있었습니다. 일어나 보니 새벽 네 시였습니다. 침대 옆에 전투화는 없었습니다.'
      : '전역하고 한 달 뒤, 꿈을 꿨습니다. 다시 입대하는 꿈이었습니다. 일어나서 가장 먼저 한 일은 날짜를 확인하는 것이었습니다. 그 뒤 몇 달 동안 같은 꿈을 계속 꿨습니다.',
    fx: { mind: -2 } }) }),

  L({ id: 'lore_after_danaka', src: 'community-lore #34 [S_lore_71] 다나까가 안 빠진다 (전역 직후의 말버릇)', p: 1, w: 20,
    c: (S) => lastMonth(S),
    run: () => ({ t: '전역 후 첫 주, 카페 점원에게 "감사합니다"를 하려다 "감사했습니다!"가 튀어나왔습니다. 점원도, 나도 반 박자 굳었습니다. 그 뒤로 마트에서도 두 번 그랬습니다.', fx: { mind: 1 } }) }),

  L({ id: 'lore_after_reserve', src: 'community-lore #35 [S_lore_72] 예비군복은 개구리복 (전역 직후 반복되는 농담)', p: 1, w: 12,
    when: { era: ['e03', 'e04', 'e05'] }, c: (S) => lastMonth(S) && ground(S),
    run: () => ({ t: '전역 날 받은 예비군복을 서랍에 넣었습니다. 열두 시간 동안 몸에 붙어 있던 군복이 이제 일 년에 한 번 입는 옷이 되었습니다. 다음에 입을 때는 같은 얼굴이 어디까지 변했을지 궁금했습니다.', fx: { mind: 2 } }) }),
];

// 되부르기 — 이 파일과 events-routine.js의 흔적을 기존 빈출 사건과 새 사건이 읽는다 (docs/04 §3-3)
export const LORE_ECHOES = {
  bond_mother_birthday: [
    { needs: 'parcel_honest', add: '훈련소 때 사복 소포에 넣은 솔직한 편지를, 어머니가 코팅해서 서랍에 넣어 두셨다고 했습니다.' },
    { needs: 'parcel_fine', add: '훈련소에서 "잘 있습니다"만 세 번 쓴 그 편지 얘기가 나왔습니다. 어머니는 "그래서 더 걱정했다"고 하셨습니다.' },
  ],
  lore_pass_down: [
    { needs: 'jjam_cat', add: '취사장 뒤 고양이 밥 당번도 같이 넘겼습니다. 그는 "병장님은 어떡해요"라고 물었습니다.' },
    { needs: 'carried', add: (S) => fmt(S, '행군 때 소총을 대신 맸던 일을 {junior.name}은 끝내 입 밖에 꺼내지 않았습니다. 대신 내 군장을 한 번 더 확인해 줬습니다.') },
  ],
  lore_dad_story: [
    { needs: 'cold_hide', add: '내가 동기 동상을 숨겼던 얘기를 하자 아버지가 소주잔을 내려놓고 한참 말이 없었습니다. "그때 말 안 한 게 제일 오래 간다."' },
    { needs: 'cold_report', add: '동기 동상을 보고했던 얘기에 아버지가 "잘했다"고 했습니다. 이상하게 그 말이 좀 더 아팠습니다.' },
    { needs: 'grad_family', add: '훈련소 수료식에 와 주신 아버지가 그날 얘기를 슬쩍 꺼내셨습니다.' },
  ],
  lore_countdown: [
    { needs: 'frostbite', add: '동상을 입었던 발가락이 날씨가 바뀔 때마다 날짜를 세는 것 같았습니다.' },
  ],
  // 훈련소 흔적(events-bootcamp.js) → 자대의 빈출 썰
  lore_matdasi: [
    { needs: 'march_dropout', add: '훈련소 행군 낙오 이후로 간식 하나가 이렇게 큰 위로가 될 줄은 몰랐습니다.' },
    { needs: 'march_strong', add: '훈련소 행군을 완주한 다리는 비닐밥 한 끼로 충분히 다시 움직였습니다.' },
  ],
  lore_gunppang: [
    { needs: 'march_dropout', add: '훈련소 때 낙오하던 날 먹은 건 건빵이 아니라 눈물이었습니다. 오늘은 별사탕이 맛있었습니다.' },
    { needs: 'boot_cold', add: '훈련소 때 감기로 누워 있을 때 누가 건빵 한 봉지를 놓고 갔던 게 떠올랐습니다.' },
  ],
  lore_army_soccer: [
    { needs: 'ankle', add: '훈련소에서 다친 발목이 후반 십 분에 먼저 말을 걸어왔습니다.' },
    { needs: 'boot_squad_leader', add: '훈련소 분대장 하던 버릇에 호루라기가 없는 게 어색했습니다.' },
  ],
  lore_night_ghost: [
    { needs: 'gas_fled', add: '가스실에서 뛰쳐나간 얘기는 아무도 몰랐지만, 초소 뒤쪽만큼은 나도 뛰쳐나가고 싶었습니다.' },
  ],
  lore_px_microwave: [
    { needs: 'grad_alone', add: '훈련소 수료식에 아무도 안 온 날 먹은 PX 만두가 떠올라서, 이번에는 일부러 천천히 먹었습니다.' },
  ],
  lore_cook_2am: [
    { needs: 'sick_call', add: '훈련소에서 아팠을 때 취사병이 몰래 죽을 끓여 준 일이 생각났습니다.' },
  ],
  lore_gundaeria: [
    { needs: 'religion', add: '훈련소 종교 행사 초코파이가 어느새 가장 맛있는 군대 음식으로 기억에 남아 있었습니다.' },
  ],
  lore_mod_clock: [
    { needs: 'cook_debt', add: '취사병에게 진 빚은 갚고 나서야 시계가 움직이는 것 같았습니다.' },
  ],
  lore_after_danaka: [
    { needs: 'cap_cash', add: '전역모에 새겨진 이름을 보며 후임들 지갑을 생각했습니다. 그 전역모는 서랍 맨 아래에 있습니다.' },
  ],
};
