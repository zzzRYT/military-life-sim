// events-routine.js — 병사의 1년: 계절 리듬과 군종별 반복 일과 (research/yearly-routine.md R-01~R-33)
// 혹한기·유격·행군·예초·김장·KCTC·동원훈련 / 함정의 입항 / 비행단의 ORE·활주로 / 해병의 IBS / 훈련소의 코로나·폭염.
// 달(months)·계절(season)·시대(era)·군종(branch)·근무지 태그(place)로 거른다. 같은 일과도 시대에 따라 문구가 갈린다.
// 진돗개·훈련소 폭염처럼 사고와 닿은 항목은 사건을 묘사하지 않고 분위기와 효과(출타 동결, 피로)만 쓴다.
// 문구·확률·효과는 전부 '가정'. 근거는 src에. 시대 구간 e01 ~2004 / e02 2005~2013 / e03 2014~2017 / e04 2018~2021 / e05 2022~
// 흔적: cold_report(동기의 동상을 보고함) · cold_hide(숨김) · carried(후임 소총을 대신 맸음)
import { rand, here, placeIs } from '../src/engine.js';
import { monthsBetweenYm } from '../src/date.js';
import { fmt, HELP } from './events.js';

const roll = (S, p) => rand(S) < p;
const pick = (S, xs) => xs[Math.floor(rand(S) * xs.length)];
const served = (S) => (S.flags.serveYm ? monthsBetweenYm(S.flags.serveYm, S.ym) : -1);
const e0 = (S) => S.era?.id;
const army = (S) => S.branch === 'army';
const ground = (S) => S.branch === 'army' || S.branch === 'marine';
const ship = (S) => S.env.post === 'shipLarge' || S.env.post === 'shipSmall' || placeIs(S, 'ship');
const covid = (S) => S.ym >= '2020-02' && S.ym <= '2022-06';

const R = (e) => ({ kind: 'event', max: 1, w: 3, p: 0.3, ...e, when: { phase: ['serve'], ...e.when } });
const D = (e) => ({ kind: 'decision', w: 3, p: 0.3, ...e, when: { phase: ['serve'], ...e.when } });

export const ROUTINE_EVENTS = [
  // ═══════════════ 육군 겨울 ═══════════════
  R({ id: 'rt_cold_adapt', src: 'yearly-routine R-01 [S_rtn_5][S_rtn_8] 내한적응훈련 → 혹한기 (두 단계 구조는 기사 확인)', p: 0.55, w: 5,
    when: { months: [12, 1] }, c: (S) => ground(S) && served(S) >= 1,
    run: (S) => ({ t: pick(S, [
      '"본훈련 전에 연습으로 하룻밤 자 보는 겁니다." 분대장 말과 달리 연병장 텐트 안은 연습답지 않게 추웠습니다. 생활관 불빛이 오십 미터 앞에 보이는 게 오히려 더 서러웠습니다.',
      '내한훈련 이틀째 새벽, 핫팩이 식을 때까지 아무도 말을 하지 않았습니다. 해가 뜨자 누군가 "살았다"고 중얼거렸고, 그 말이 그날의 유일한 대화였습니다.']),
    fx: { fit: -3, mind: -3 } }) }),

  D({ id: 'rt_frostbite_report', src: 'yearly-routine R-01 [S_rtn_5] 내한훈련 중 동상 — 보고냐 은폐냐 (딜레마는 가정, 안전 관리 단계 강화 보도 반영)', p: 0.35,
    when: { months: [12, 1, 2] }, c: (S) => ground(S) && here(S, 'peer') && served(S) >= 1,
    build: (S) => ({
      title: '동기의 발가락',
      body: fmt(S, '야간 경계 교대 중 {peer.name}의 걸음이 이상합니다. 군화를 벗겨 보니 발가락이 하얗습니다. 본인은 "훈련 끝나고 말하자"고 합니다. 훈련은 아직 이틀 남았습니다.'),
      choices: [
        { k: 'report', label: '분대장에게 바로 보고한다', hint: '동기는 의무대로 간다 · 원망 섞인 눈초리' },
        { k: 'hide', label: '말대로 훈련 끝날 때까지 숨긴다', hint: '동기는 버틴다 · 악화되면 내 책임' },
        { k: 'swap', label: '군화와 양말을 바꿔 신게 한다', hint: '일단 한 숨 돌린다 · 내 발이 위험하다' },
      ],
      help: HELP,
    }),
    apply: (S, k) => {
      if (k === 'report') return { t: fmt(S, '분대장이 들것을 불렀습니다. {peer.name}은 의무대로 가며 나를 노려봤습니다. 이틀 뒤 돌아온 그는 아무 말 없이 내 어깨에 손을 올렸다 뗐습니다.'), fx: { mind: -2 }, rel: { peer: -5 }, mark: { set: { cold_report: {} } } };
      if (k === 'hide') {
        if (roll(S, 0.5)) return { t: fmt(S, '훈련 마지막 날 {peer.name}이 걷지 못했습니다. 구급차 안에서 그는 "고맙다"고 했지만, 의무병은 "왜 이제 데려왔냐"고 나를 쳐다봤습니다.'), fx: { mind: -7 }, rel: { peer: 4 }, punish: { kind: 'reprimand' }, mark: { set: { cold_hide: {} } } };
        return { t: fmt(S, '이틀을 버텼고, 훈련이 끝나자마자 {peer.name}을 의무대로 데려갔습니다. 군의관이 "조금만 늦었으면"이라고 말하다 말았습니다. 그 말줄임표가 며칠 동안 따라다녔습니다.'), fx: { mind: -4 }, rel: { peer: 8 }, mark: { set: { cold_hide: {} } } };
      }
      return { t: fmt(S, '{peer.name}의 마른 양말을 내가 신었습니다. 그 밤 내 발가락이 점점 감각을 잃었습니다. 둘 다 이틀을 버텼고, 둘 다 군의관 앞에서 말이 없었습니다.'), fx: { fit: -5, mind: -2 }, rel: { peer: 12 }, mark: { set: { frostbite: {} } } };
    } }),

  R({ id: 'rt_heater_battery', src: 'yearly-routine R-02 [S_rtn_9] 깔깔이·외피·발열 방한복 (발열 방한복 도입 연도 미확인 — e04 이후로만)', p: 0.4,
    when: { months: [11, 12, 1, 2], era: ['e04', 'e05'] }, c: (S) => ground(S) && S.rank <= 2,
    run: () => ({ t: '발열 방한복은 소대에 몇 벌뿐이었고, 충전기는 하나뿐이었습니다. 밤 근무 전에 누가 충전기 자리를 차지하느냐가 그날의 작은 정치였습니다. 나는 배터리 한 칸으로 근무를 섰습니다.', fx: { fit: -1, mind: -2 } }) }),

  R({ id: 'rt_miles_night', src: 'yearly-routine R-03 [S_rtn_6][S_rtn_7][S_rtn_8] 혹한기 마일즈 쌍방훈련 (e04~e05 중심)', p: 0.45,
    when: { months: [12, 1, 2], era: ['e04', 'e05'] }, c: (S) => army(S) && S.rank >= 1,
    run: () => ({ t: '새벽 세 시, 조끼의 감지기가 울렸고 저는 눈밭에 누운 채 "전사" 판정을 받았습니다. 죽은 사람은 말을 하면 안 된다는 규칙 때문에 해가 뜰 때까지 별을 세었습니다. 그 별 수는 아직도 기억납니다.', fx: { fit: -3, mind: 1 } }) }),

  R({ id: 'rt_snow_lines', src: 'yearly-routine R-17 [S_rtn_48] 겨울 제설 3선 대형 (송풍기 → 넉가래 → 염화칼슘)', p: 0.45,
    when: { season: 'winter' }, c: (S) => army(S) && S.rank >= 1,
    run: () => ({ t: '넉가래 조는 송풍기 조를 부러워했고, 송풍기 조는 기름 냄새에 머리가 아팠고, 염화칼슘 조는 손이 텄습니다. 그날 밤 눈이 또 왔습니다. 그 순서대로 다시 나갔습니다.', fx: { fit: -2, mind: -2 } }) }),

  // ═══════════════ 육군 봄·여름 ═══════════════
  R({ id: 'rt_yugyeok_last', src: 'yearly-routine R-04 [S_rtn_1][S_rtn_4] 유격체조 — 마지막 구호는 외치지 않는다', p: 0.55, w: 5,
    when: { months: [4, 5, 9, 10] }, c: (S) => army(S) && S.rank <= 3,
    run: (S) => ({ t: pick(S, [
      '"마지막 구호는 생략합니다." 조교가 세 번이나 강조했습니다. 그런데 열 번째에서 옆 중대 누군가가 "열!"을 외쳤고, 연병장 전체가 하늘을 보고 웃다가 다시 누웠습니다.',
      '유격 체조 구호 소리가 목구멍에서 쇳소리로 바뀔 때쯤 알았습니다. 소리를 지르는 건 힘이 아니라 서로의 박자를 맞추는 일이라는 것을.']),
    fx: { fit: -3, mind: 2 } }) }),

  R({ id: 'rt_yugyeok_era', src: 'yearly-routine R-05 [S_rtn_2][S_rtn_3] 유격의 시대 변화 — 얼차려형 → 코스형 → 볼풀 (볼풀은 한 부대 사례일 수 있음)', p: 0.5, w: 5,
    when: { months: [4, 5, 9, 10] }, c: (S) => army(S) && S.rank >= 1,
    run: (S) => (['e04', 'e05'].includes(e0(S))
      ? { t: '줄을 놓친 순간 몸이 흙탕물이 아니라 형형색색 공 속으로 가라앉았습니다. 위에서 선임이 "우리 땐 똥물이었다"고 외쳤고, 그 말을 들으니 이상하게 덜 억울했습니다.', fx: { fit: -2, mind: 5 } }
      : { t: '오전 코스를 마치고 젖은 전투복 그대로 오후 코스에 들어갔습니다. 점심 때 마른 양말이 한 켤레씩 지급됐는데, 그 양말이 그날 가장 큰 복지였습니다.', fx: { fit: -5, mind: -2 } }) }),

  R({ id: 'rt_heat_index', src: 'yearly-routine R-06 [S_rtn_10][S_rtn_11] 혹서기 온도지수 — 29.5도 조항·단계별 통제 (하달 시점은 미확인)', p: 0.55, w: 5,
    when: { months: [7, 8] }, c: (S) => ground(S) && S.rank >= 0,
    run: (S) => ({ t: S.ym < '2022-01'
      ? '행정반 화이트보드의 숫자가 31.8에서 32.1로 바뀌자 연병장의 모든 움직임이 멈췄습니다. 0.3도 덕분에 예초는 내일로 미뤄졌고, 그 대신 내일 할 일이 두 배가 됐습니다.'
      : '온도 단계 안내가 붙은 날, 선임은 "우리 땐 그런 거 없었다"고 하다가 얼음물을 직접 떠다 줬습니다. 그늘 아래 십오 분이 하루의 반이었습니다.',
    fx: { fit: -2, mind: 1 } }) }),

  D({ id: 'rt_march_carry', src: 'yearly-routine R-07 [S_rtn_13][S_rtn_14] 행군 낙오·장비 분담 (딜레마는 가정)', p: 0.35,
    c: (S) => ground(S) && S.rank >= 2 && here(S, 'junior') && !S.marks.carried,
    build: (S) => ({
      title: '70km 지점',
      body: fmt(S, '야간 행군 70km 지점. 앞사람 군장에 매달린 반합이 딸그락거리는 소리만 들립니다. 옆에서 {junior.name}이 소총을 질질 끌고 있습니다. 쉬는 시간까지는 사십 분 남았습니다.'),
      choices: [
        { k: 'carry', label: '후임 소총을 대신 맨다', hint: '후임이 산다 · 내 어깨가 먼저 간다' },
        { k: 'push', label: '"일단 버텨 보자"고 격려한다', hint: '규정대로 · 후임은 서운하다' },
        { k: 'report', label: '분대장에게 낙오 의사를 보고한다', hint: '안전하다 · 후임의 체면이 상한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'carry') return { t: fmt(S, '소총 두 정을 매고 걸었습니다. 쉬는 시간에 양말을 벗을지 말지를 5분 동안 고민했습니다. 마지막 구간에서 {junior.name}이 내 군장 끈을 뒤에서 잡아 줬습니다.'), fx: { fit: -6, mind: 3 }, rel: { junior: 12 }, mark: { set: { carried: {} } } };
      if (k === 'push') return { t: fmt(S, '"조금만 더 가자"를 일곱 번 했습니다. {junior.name}은 끝까지 걸었습니다. 숙영지에서 그가 나를 봤을 때 눈이 풀려 있었습니다. 감사인지 원망인지 구별이 안 됐습니다.'), fx: { mind: -3 }, rel: { junior: -3 } };
      return { t: fmt(S, '{junior.name}은 구급차에 실려 갔습니다. 다음 날 부대에서 그의 소문이 먼저 돌았습니다. 소문이 내 이름을 언급하지는 않았지만, 입안이 한동안 썼습니다.'), fx: { mind: -5 }, rel: { junior: -6, lt: 4 } };
    } }),

  R({ id: 'rt_shovel_count', src: 'yearly-routine R-08 [S_rtn_14] 진지공사 — 마대당 몇 삽 (e01~e03 중심 가정)', p: 0.4,
    when: { months: [3, 4, 5, 9, 10], era: ['e01', 'e02', 'e03'] }, c: (S) => army(S) && S.rank >= 1,
    run: () => ({ t: '마대 하나에 흙을 몇 삽 넣어야 하는지 선임마다 답이 달랐습니다. 열두 삽파와 열다섯 삽파가 다투는 사이 해가 졌고, 진지는 반쯤만 올라갔습니다. 다음 날 아침 간부가 "누가 이렇게 쌓았나"라고 물었는데 둘 다 손을 들지 않았습니다.', fx: { fit: -4, mind: -1 } }) }),

  R({ id: 'rt_gop_weed', src: 'yearly-routine R-09 [S_rtn_15] GOP 불모지 작업 — 호미와 지뢰탐지기 (기사 2022)', p: 0.55, w: 5,
    when: { months: [8, 9, 10], place: ['gop'] }, c: (S) => army(S),
    run: () => ({ t: '탐지기가 삑 하고 울릴 때마다 모두가 숨을 멈췄고, 대부분은 녹슨 깡통이었습니다. 그래도 그날 저녁 호미를 반납할 때 손이 조금 떨렸습니다. 저녁 짬밥은 이상하게 간이 맞았습니다.', fx: { fit: -3, mind: -2, skill: 1 } }) }),

  R({ id: 'rt_wasp', src: 'yearly-routine R-10 [S_rtn_18] 예초·제초 시즌 — 벌집이라는 진짜 적 (e04 이후는 위탁 병행 가정)', p: 0.4,
    when: { months: [6, 7, 8, 9] }, c: (S) => army(S) && (['e01', 'e02', 'e03'].includes(e0(S)) || roll(S, 0.5)),
    run: () => ({ t: '예초기 날이 무언가에 닿는 순간 땅에서 노란 구름이 피어올랐습니다. 분대 전원이 사방으로 흩어졌고, 그날 탄약고 뒤편 풀은 아무도 끝까지 깎지 못했습니다. 의무대에서 "벌은 누가 쐈냐"고 물었을 때 대답이 열두 개였습니다.', fx: { fit: -3, mind: 1 } }) }),

  R({ id: 'rt_kimjang', src: 'yearly-routine R-11 [S_rtn_16][S_rtn_17] 김장 대민지원 (11월 지역 행사)', p: 0.6, w: 5,
    when: { months: [11] }, c: (S) => ground(S) && S.rank <= 3,
    run: () => ({ t: '고무장갑 속으로 고춧가루가 스며들어 손등이 이틀 동안 화끈거렸습니다. 대신 할머니들이 싸 준 수육 한 접시 덕분에 그 주 내내 생활관에서 영웅 대접을 받았습니다.', fx: { fit: -2, mind: 5 } }) }),

  R({ id: 'rt_kctc', src: 'yearly-routine R-12 [S_rtn_19][S_rtn_20][S_rtn_21] KCTC 과학화전투훈련 — 마일즈 교전·전사 판정', p: 0.45, w: 4,
    when: { era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => army(S) && S.rank >= 1 && served(S) >= 3,
    run: (S) => ({ t: pick(S, [
      '교전 3분 만에 조끼가 길게 울렸고, 저는 "중상"이 됐습니다. 방아쇠를 당겨도 아무것도 나가지 않는 총을 안고 엎드려서야, 대항군이 얼마나 지독하게 이 산을 잘 아는지 알게 됐습니다.',
      '인제의 열흘 중 사흘째 밤이 가장 길었습니다. "전사" 판정을 받은 뒤 통제관 옆에서 따뜻한 컵라면을 얻어먹었습니다. 죽는 게 이렇게 편할 수 있다는 걸 처음 알았습니다.']),
    fx: { fit: -3, mind: 2, skill: 2 } }) }),

  R({ id: 'rt_sports_day', src: 'yearly-routine R-13 [S_rtn_22][S_rtn_27] 중대 대항 체육대회 — 족구·채널권', p: 0.5, w: 5,
    when: { months: [5, 10] }, c: (S) => S.rank <= 3,
    run: (S) => (roll(S, 0.5)
      ? { t: '결승 족구 마지막 점수에서 공이 네트를 맞고 우리 코트에 떨어졌습니다. 중대장은 "괜찮다"고 했지만, 그 주 주말 TV 채널 선택권은 옆 중대로 넘어갔습니다.', fx: { mind: -3 } }
      : { t: '결승 족구 마지막 점수에서 공이 네트를 넘어 상대 코트에 떨어졌습니다. 소대원 전원이 달려와 서로를 끌어안았습니다. 그 주 주말 TV 채널은 한 번도 안 바뀌었습니다.', fx: { mind: 6, fit: -1 } }) }),

  R({ id: 'rt_reserve_week', src: 'yearly-routine R-19 [S_rtn_13][S_rtn_28][S_rtn_44] 예비군 동원훈련 — 현역이 받쳐 주는 사흘 (병사 차출 후기는 미확인)', p: 0.45, w: 5,
    when: { months: [3, 4, 5, 6, 9, 10, 11], era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => army(S) && S.rank >= 1 && !(covid(S) && S.ym < '2020-05'),
    run: (S) => ({ t: pick(S, [
      '사격장 통제선 앞에서 저는 "아저씨, 총구 앞쪽으로요"를 하루에 마흔 번쯤 말했습니다. 마지막 날 한 예비군이 전투복 주머니에서 박하사탕 한 줌을 꺼내 주며 "나도 너 때 그랬다"고 했습니다.',
      '동원훈련 첫날, 예비군 아저씨들이 부대 PX를 한 바퀴 돌고 나가자 냉동만두가 하나도 남지 않았습니다. 마지막으로 남은 걸 선임이 내 손에 쥐여 줬습니다.']),
    fx: { fit: -2, mind: 3 } }) }),

  D({ id: 'rt_reserve_phone', src: 'yearly-routine R-19 [S_rtn_44] 예비군 휴대폰 — 훈련 중 반납 규정 (딜레마는 가정)', p: 0.3,
    when: { months: [4, 5, 6, 9, 10], era: ['e04', 'e05'] }, c: (S) => army(S) && S.rank >= 1,
    build: () => ({
      title: '예비군의 휴대폰',
      body: '사격장 대기선 뒤에서 예비군 한 명이 휴대폰을 꺼내 가족에게 무언가를 보여 주고 있습니다. 훈련 중 휴대폰은 걷게 돼 있습니다. 나는 현역 병사, 그는 아저씨입니다. 눈이 마주쳤습니다.',
      choices: [
        { k: 'collect', label: '규정대로 수거한다', hint: '원칙대로 · 아저씨의 눈이 날카로워진다' },
        { k: 'ignore', label: '못 본 척한다', hint: '평화롭다 · 걸리면 내 책임' },
        { k: 'report', label: '교관에게 알린다', hint: '절차대로 · 사격장 분위기가 얼어붙는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'collect') return { t: '"규정이라서요."라고 하자 아저씨는 "야, 아들 사진인데"라고 했습니다. 그래도 휴대폰은 걷혔고, 사진 속 아이는 반납함 안에서 계속 웃고 있었을 겁니다.', fx: { mind: -3 } };
      if (k === 'ignore') return { t: '화면을 보고 있던 아저씨가 쏘는 순서에서 한 번 놓쳤습니다. 교관이 그걸 봤습니다. "왜 안 걷었냐"는 질문에 대답이 마땅치 않았습니다.', fx: { mind: -4 }, rel: { lt: -4 } };
      return { t: '교관이 다가가자 아저씨가 나를 한 번 쳐다봤습니다. 휴대폰을 걷은 뒤 사격장에는 박수 대신 한숨이 퍼졌습니다.', fx: { mind: -4 } };
    } }),

  // ═══════════════ 가을·경계 ═══════════════
  R({ id: 'rt_standby_five', src: 'yearly-routine R-14 [S_rtn_23] 5분대기조와 가을 통합방위훈련', p: 0.4,
    when: { months: [9, 10, 11] }, c: (S) => army(S) && S.env.post !== 'gop' && served(S) >= 3,
    run: () => ({ t: '5분대기 근무 첫날, 전투화를 신은 채로 자는 법을 배웠습니다. 사이렌이 울리고 3분 40초 만에 트럭에 올랐는데, 탄띠에 수통이 없다는 걸 깨달은 건 출발한 뒤였습니다.', fx: { mind: -2, fit: -2, skill: 1 } }) }),

  R({ id: 'rt_alert_one', src: 'yearly-routine R-15 [S_rtn_24][S_rtn_50] 진돗개 단계 상향 — 사건 묘사 없이 분위기·출타 동결만', p: 0.12, w: 3, gap: 20,
    c: (S) => ground(S) && S.env.post !== 'shipLarge' && S.env.post !== 'shipSmall' && served(S) >= 2,
    run: () => ({ t: '저녁 점호 대신 "진돗개 하나" 방송이 나왔습니다. 그날 밤 국도 검문소에서 처음 보는 경찰관과 컵라면 하나를 나눠 먹었고, 둘 다 끝까지 이유를 묻지 않았습니다.', fx: { mind: -3 }, ban: 1 }) }),

  R({ id: 'rt_ufs', src: 'yearly-routine R-16 [S_rtn_25][S_rtn_26] 8월 을지(UFS) — "전시 가정" 일과', p: 0.45, w: 4,
    when: { months: [8], era: ['e02', 'e03', 'e04', 'e05'] }, c: (S) => served(S) >= 1,
    run: (S) => ({ t: served(S) <= 3
      ? '전입 2주 차, 장갑차 조종석에서 맞은 첫 "상황"이 실제가 아니라는 걸 알면서도 손바닥이 젖었습니다. 하차 문이 열리자 분대장이 제 어깨를 한 번 쳤고, 그걸로 충분했습니다.'
      : '8월의 을지 연습 기간에는 모든 일과가 "전시 가정"으로 시작했습니다. 방송 멘트가 바뀌었을 뿐인데 식당 줄까지 조용했습니다.',
    fx: { mind: -2, skill: 2 } }) }),

  R({ id: 'rt_weapon_inspect', src: 'yearly-routine R-18 [S_rtn_31] 정비와 점검의 달력 — 총기 수입 검사 (장면은 가정)', p: 0.35,
    c: (S) => ground(S) && S.rank <= 2,
    run: () => ({ t: '총기 수입 날, 노리쇠 뭉치에서 나온 검댕이 하얀 수건을 순식간에 회색으로 만들었습니다. 간부가 면봉 하나를 총구에 넣었다 빼 보는 그 1초 동안 생활관 전체가 숨을 참았습니다. 면봉은 하얬습니다.', fx: { mind: 2, skill: 1 } }) }),

  R({ id: 'rt_inspection_week', src: 'yearly-routine R-20 [S_rtn_26] 전투준비태세 점검·검열 주간 (비중 큼 — 가정)', p: 0.3, w: 3,
    when: { months: [3, 6, 9, 11] }, c: (S) => S.rank <= 3 && served(S) >= 3,
    run: () => ({ t: '검열 주간은 상급 부대가 오는 날보다 그 전 주가 더 길었습니다. 서류는 두 번 써서 한 번 버렸습니다. 검열관이 "문제없음"이라고 했을 때 아무도 기뻐하지 않았습니다. 다음 주 검열 준비가 이미 시작됐기 때문입니다.', fx: { mind: -3, skill: 1 } }) }),

  // ═══════════════ 해군 ═══════════════
  R({ id: 'rt_navy_port', src: 'yearly-routine R-21 [S_rtn_32] 입항하면 쉬는 게 아니라 다음 출항 준비 (2026 이후 부두 노동 변경 — 가정)', p: 0.5, w: 5,
    when: { branch: ['navy'] }, c: (S) => ship(S),
    run: (S) => ({ t: S.ym < '2026-01'
      ? '21일 만에 진해 부두에 닿았을 때 제 머릿속에는 PX 냉동만두뿐이었습니다. 하지만 홋줄을 걸고, 전원 케이블을 끌고, 갑판을 닦고 나니 해가 져 있었습니다. 전화는 그날 밤 열 시에야 걸었습니다.'
      : '입항하자 부두에서 민간 작업자들이 전원 케이블을 끌고 있었습니다. 저는 처음으로 입항 당일 저녁에 전화를 걸었습니다. 어머니가 "벌써?"라고 했습니다.',
    fx: { mind: 2, fit: -3 } }) }),

  R({ id: 'rt_navy_rough', src: 'yearly-routine R-22 [S_rtn_33][S_rtn_34][S_rtn_36] 항해 중 리듬 — 당직 쪼개기와 황천', p: 0.5, w: 5,
    when: { branch: ['navy'] }, c: (S) => ship(S),
    run: () => ({ t: '국그릇을 식판 대신 손으로 들고 먹는 법을 사흘 만에 익혔습니다. 황천 날 밤 침대 난간에 다리를 걸고 누워 있으니, 육군 간 친구가 부러운 게 아니라 처음으로 조금 자랑스러웠습니다.', fx: { fit: -3, mind: 2 } }) }),

  R({ id: 'rt_navy_march_drill', src: 'yearly-routine R-23 [S_rtn_35][S_rtn_54] 3월 해상기동훈련 — 음탐 직별 장면 (가정)', p: 0.55, w: 5,
    when: { branch: ['navy'], months: [3] }, c: (S) => ship(S),
    run: () => ({ t: '헤드폰 속 바다는 생각보다 시끄러웠습니다. 새우 떼 소리, 고래 소리, 그리고 어쩌면 아무것도 아닌 소리. 보고할지 말지를 정하는 3초가 제 복무 중 가장 긴 3초였습니다.', fx: { mind: -2, skill: 3 } }) }),

  // ═══════════════ 공군 ═══════════════
  R({ id: 'rt_af_heat', src: 'yearly-routine R-26 [S_rtn_38][S_rtn_39] 비상대기실과 70도의 활주로', p: 0.5, w: 5,
    when: { branch: ['airforce'], months: [6, 7, 8] }, c: (S) => placeIs(S, 'jet'),
    run: () => ({ t: '오후 두 시, 활주로 끝 아지랑이 속에서 전투기 한 대가 굉음을 내며 사라졌습니다. 그늘 한 점 없는 램프에서 저는 장갑 속 땀이 공구 손잡이를 미끄럽게 만드는 걸 느끼며 다음 기체를 기다렸습니다.', fx: { fit: -3, mind: 1 } }) }),

  R({ id: 'rt_af_ore', src: 'yearly-routine R-27 [S_rtn_37] 전투태세훈련(ORE) — 방독면을 쓴 사흘', p: 0.5, w: 5,
    when: { branch: ['airforce'] }, c: (S) => placeIs(S, 'jet') && served(S) >= 2,
    run: () => ({ t: '방독면 렌즈 안쪽에 김이 서려 세상이 뿌옇게 보였습니다. "사상자" 역할 병사를 들것에 싣고 뛰다가, 그가 들것 위에서 작게 "형, 천천히요"라고 말해서 우리는 둘 다 방독면 속에서 웃었습니다.', fx: { fit: -3, mind: 3, skill: 2 } }) }),

  R({ id: 'rt_af_snow', src: 'yearly-routine R-28 [S_rtn_49] 활주로 제설 (근거 못 찾음 — 가정)', p: 0.35, w: 3,
    when: { branch: ['airforce'], season: 'winter' }, c: (S) => placeIs(S, 'jet'),
    run: () => ({ t: '새벽 네 시 비상 방송이 나왔고, 첫 이륙까지 남은 시간은 세 시간이었습니다. 넉가래를 든 수백 명이 활주로 위에 한 줄로 서 있는 모습은 이상하게 장관이었습니다.', fx: { fit: -3, mind: 2 } }) }),

  // ═══════════════ 해병 ═══════════════
  R({ id: 'rt_marine_ibs', src: 'yearly-routine R-30 [S_rtn_42] 여름의 IBS 상륙기습 기초훈련 — 헤드 캐링', p: 0.55, w: 5,
    when: { branch: ['marine'], months: [6, 7, 8] },
    run: () => ({ t: '보트 앞머리 쪽에 키 큰 사람이 서야 한다는 걸 첫날 알았습니다. 저는 키가 작았고, 그래서 일주일 내내 정수리에 보트 무게가 몰리는 위치를 맡았습니다. 마지막 날 분해·결합 대항전에서 우리 조가 이겼고, 정수리의 혹이 훈장처럼 느껴졌습니다.', fx: { fit: -4, mind: 4 } }) }),

  D({ id: 'rt_recovery_bus', src: 'yearly-routine R-29 [S_rtn_41][S_rtn_51] 2020년대 해병 빨간명찰 수료식 — 회복버스 (딜레마는 가정, 사고 묘사 없음)', p: 0.7,
    when: { phase: ['train'], branch: ['marine'], months: [6, 7, 8, 9], era: ['e05'] },
    build: () => ({
      title: '회복버스',
      body: '천자봉 아래에 회복버스가 서 있습니다. 에어컨이 나옵니다. 타면 쉴 수 있다는 걸 모두 알지만, 버스에 오르면 그만큼 대열에서 빠지게 됩니다. 창문 너머로 동기들이 올라가는 게 보입니다.',
      choices: [
        { k: 'ride', label: '잠깐 타서 쉰다', hint: '몸은 회복한다 · 대열에서 한 걸음 뒤처진다' },
        { k: 'climb', label: '다시 내려서 같이 오른다', hint: '동기들과 같이 간다 · 몸이 더 상한다' },
      ],
    }),
    apply: (S, k) => (k === 'ride'
      ? { t: '이십 분 쉬고 내렸습니다. 대열 끝에 다시 섰을 때 앞사람들이 슬쩍 돌아봤고, 아무도 아무 말을 하지 않았습니다. 물은 시원했는데 맛이 없었습니다.', fx: { fit: 2, mind: -4 }, rel: { peer: -4 } }
      : { t: '버스에서 내려 다시 줄에 섰습니다. 꼭대기에서 받은 명찰은 가벼웠는데, 가슴 쪽이 이상하게 무거웠습니다. 옆에 있던 동기가 내 어깨에 이마를 잠깐 댔다 뗐습니다.', fx: { fit: -6, mind: 6 }, rel: { peer: 8 } }) }),

  D({ id: 'rt_af_notes', src: 'yearly-routine R-25 [S_rtn_40] 공군 훈련소 성적순 자대 선택 — 노트 빌려주기 (2026 이후 선발 변경 가정, 딜레마는 가정)', p: 0.7,
    when: { phase: ['train'], branch: ['airforce'], era: ['e01', 'e02', 'e03', 'e04', 'e05'] }, c: (S) => here(S, 'peer'),
    build: (S) => ({
      title: '마지막 주 노트',
      body: fmt(S, '성적순으로 자대를 고릅니다. 집에서 두 시간 거리 비행단은 딱 한 자리, 내 등수는 그 자리 바로 다음입니다. {peer.name}이 내 정리 노트를 빌려 달라고 합니다. 그는 그 자리 바로 앞입니다.'),
      choices: [
        { k: 'lend', label: '노트를 빌려준다', hint: '동기와 가까워진다 · 내 등수가 밀릴 수 있다' },
        { k: 'refuse', label: '"나도 마지막 정리 중"이라며 거절한다', hint: '내 자리를 지킨다 · 동기와 거리가 생긴다' },
      ],
    }),
    apply: (S, k) => (k === 'lend'
      ? { t: fmt(S, '노트를 빌려줬고, {peer.name}은 하루 만에 돌려주며 "고맙다"고 했습니다. 마지막 시험 결과가 붙던 날 우리는 서로의 등수를 모르는 척했습니다.'), fx: { mind: -2 }, rel: { peer: 12 } }
      : { t: fmt(S, '"나도 마지막 정리 중이야."라고 했습니다. {peer.name}은 웃으며 알겠다고 했지만, 그날 저녁 식당에서는 우리 둘 사이에 한 자리가 비어 있었습니다.'), fx: { mind: -4 }, rel: { peer: -9 } }) }),

  // ═══════════════ 훈련소 ═══════════════
  R({ id: 'rt_boot_covid_gate', src: 'yearly-routine R-32 [S_rtn_44][S_rtn_45][S_rtn_46][S_rtn_47] 코로나 시기 입소·수료 (2020-02~2022-06)', p: 0.9, w: 8,
    when: { phase: ['train'] }, c: (S) => covid(S),
    run: () => ({ t: '입소 날, 아버지는 위병소 50m 앞에서 차를 세웠습니다. "여기까지래." 그 50m를 혼자 걸어가는 동안 저는 뒤를 두 번 돌아봤고, 두 번 다 아버지는 그 자리에 서 있었습니다.', fx: { mind: -5 } }) }),

  R({ id: 'rt_boot_heat', src: 'yearly-routine R-33 [S_rtn_10][S_rtn_11][S_rtn_12] 폭염 속 훈련소 (사고 묘사 없이 훈련 조정만, e05)', p: 0.7, w: 6,
    when: { phase: ['train'], months: [7, 8], era: ['e05'] },
    run: () => ({ t: '각개전투 교장으로 가는 대신 교육대 강당으로 줄을 섰습니다. 에어컨 바람 아래서 영상으로 포복 자세를 배우며, 저는 이게 다행인지 아쉬운지 끝내 정하지 못했습니다.', fx: { fit: -1, mind: 1 } }) }),
];

// 되부르기 — 훈련소 흔적(events-bootcamp.js)이 자대 일과에서 돌아온다 (docs/04 §3-3)
export const ROUTINE_ECHOES = {
  rt_yugyeok_last: [
    { needs: 'ankle', add: '훈련소 때 다친 발목은 유격체조 첫 구호에서 이미 눈치를 챘습니다.' },
    { needs: 'march_dropout', add: '훈련소 행군에서 낙오했던 내가 이번엔 끝까지 구호를 외쳤습니다. 마지막만 빼고요.' },
  ],
  rt_kctc: [
    { needs: 'rifle_ace', add: '훈련소 사격 특등의 감이 돌아와 첫 교전에서 한 명을 잡았습니다. 곧 나도 전사 판정이었지만요.' },
    { needs: 'rifle_poor', add: '훈련소에서 영점도 못 잡던 내가 마일즈 총을 들고 있다는 게 믿기지 않았습니다. 총은 나를 기억하지 못했습니다.' },
  ],
  rt_weapon_inspect: [
    { needs: 'rifle_poor', add: '훈련소 때처럼 총이 나를 기억하는 것 같았습니다. 그날은 총구를 평소보다 오래 닦았습니다.' },
  ],
  rt_cold_adapt: [
    { needs: 'boot_cold', add: '훈련소에서 감기로 고생한 기억 때문에 텐트에서도 목을 가장 단단히 감쌌습니다.' },
  ],
  rt_sports_day: [
    { needs: 'ankle', add: '훈련소에서 다친 발목은 족구 서브 순서에서 슬쩍 빠지는 이유가 되어 주었습니다.' },
  ],
  rt_standby_five: [
    { needs: 'gas_fled', add: '가스실을 뛰쳐나가던 그 속도가 처음으로 쓸모가 있었습니다.' },
  ],
  rt_reserve_week: [
    { needs: 'boot_squad_leader', add: '훈련소 분대장 버릇이 나와 아저씨들에게도 "줄 맞추세요"를 외쳐 버렸습니다. 아저씨들이 웃으며 맞췄습니다.' },
  ],
};
