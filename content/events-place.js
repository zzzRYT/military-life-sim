// events-place.js — 지역 사건: 같은 군종·근무지라도 "어디서" 복무하느냐에 따라 달라지는 일.
// when.place = 근무지 id 또는 지역 태그(rules/env.json post.*.places.tags) 중 하나라도 맞으면 후보.
// 태그: cold 혹한 · snow 폭설 · sea 바다 · island 배로만 · nll 접적 해역 · capital 수도권 · city 큰 도시 · town 군인 마을
//       tourist 관광지 · jet 비행단 · mountain 산꼭대기 · ship 함정 · small 소형 함정 · cherry 진해. 문구·확률·효과는 전부 '가정'.
// 흔적: frostbite, ferry_stuck, sea_legs/seasick, ship_stay/ship_off(육상 전환 — post·tags도 바뀐다), peak_cut
import { rand, placeIs } from '../src/engine.js';
import { monthsBetweenYm } from '../src/date.js';

const roll = (S, p) => rand(S) < p;
const pick = (S, xs) => xs[Math.floor(rand(S) * xs.length)];
const served = (S) => (S.flags.serveYm ? monthsBetweenYm(S.flags.serveYm, S.ym) : -1);
const where = (S) => S.env.place?.label ?? '';
const town = (S) => where(S).split('·')[0].split(' ').pop(); // '강원 춘천' → '춘천', '광주·전남' → '광주'
const P = (e) => ({ src: '가정', gap: 6, ...e, when: { phase: ['serve'], ...e.when } });

export const PLACE_EVENTS = [
  // ── 혹한 (강원 내륙·전방) ──
  P({ id: 'place_cold_guard', kind: 'event', w: 4, gap: 10, when: { place: ['cold'], season: 'winter' },
    run: (S) => (roll(S, 0.15)
      ? { t: `${where(S)}의 새벽은 영하 25도였습니다. 근무를 마치고 나니 발가락 감각이 돌아오지 않았습니다. 의무대에서 가벼운 동상 진단을 받았습니다.`, fx: { fit: -4, mind: -4 }, mark: { set: { frostbite: {} } } }
      : { t: `${where(S)}의 새벽은 영하 20도를 넘겼습니다. 방한복 위에 핫팩을 세 개 붙이고 근무를 섰습니다.`, fx: { fit: 1, mind: -3 } }) }),
  P({ id: 'place_cold_pipe', kind: 'event', w: 2, gap: 12, when: { place: ['cold', 'mountain'], season: 'winter' },
    run: () => ({ t: '수도관이 얼어 사흘 동안 물이 나오지 않았습니다. 취사장에서 끓인 물을 받아 세수했습니다.', fx: { mind: -3 } }) }),

  // ── 폭설 (영동·강원 해안) ──
  P({ id: 'place_snow', kind: 'event', w: 4, gap: 10, when: { place: ['snow'], season: 'winter' },
    run: (S) => ({ t: `밤새 ${where(S)}에 눈이 허리까지 쌓였습니다. 아침부터 해 질 때까지 넉가래를 밀었습니다. 다음 날 또 왔습니다.`, fx: { fit: 3, mind: -4 } }) }),

  // ── 접적 해역·서북도서 ──
  P({ id: 'place_nll_alert', kind: 'event', w: 2, gap: 8, when: { place: ['nll'] },
    run: (S) => ({ t: `${where(S)} 근해에 경계 태세가 높아졌습니다. 사흘 동안 전투복을 입은 채 잠들었습니다.`, fx: { mind: -4, skill: 3 } }) }),
  P({ id: 'place_ferry', kind: 'event', w: 3, gap: 8, when: { place: ['island'] },
    c: (S) => S.leave.left > 0,
    run: (S) => (roll(S, 0.5)
      ? { t: '휴가 출발 날 풍랑주의보로 배가 끊겼습니다. 선착장에서 이틀을 기다린 끝에 겨우 배에 올랐습니다.', fx: { mind: -6 }, mark: { set: { ferry_stuck: {} } } }
      : { t: `휴가 가는 길. ${where(S)}에서 배를 타고 육지에 닿기까지 반나절이 걸렸습니다. 멀미약 기운에 버스에서 내내 잤습니다.`, fx: { mind: 2 } }) }),
  P({ id: 'place_island_fog', kind: 'event', w: 2, gap: 10, when: { place: ['island'], months: [4, 5, 6, 7] },
    run: () => ({ t: '해무가 일주일째 섬을 덮었습니다. 보급선이 늦어져 PX 라면이 동났습니다.', fx: { mind: -3 } }) }),

  // ── 함정 ──
  P({ id: 'place_first_sail', kind: 'event', w: 30, gap: 99, when: { place: ['ship'] },
    c: (S) => !S.marks.sea_legs && !S.marks.seasick,
    run: (S) => (roll(S, 0.5)
      ? { t: '첫 출항. 파도가 높아지자 화장실 앞에 줄이 섰습니다. 나도 그 줄에 있었습니다.', fx: { mind: -5, fit: -2 }, mark: { set: { seasick: {} } } }
      : { t: '첫 출항. 다들 멀미로 쓰러졌는데 이상하게 나는 멀쩡했습니다. 선임이 "체질"이라고 했습니다.', fx: { mind: 3 }, mark: { set: { sea_legs: {} } } }) }),
  P({ id: 'place_voyage', kind: 'event', w: 4, gap: 3, when: { place: ['ship'] },
    run: (S) => {
      const weeks = placeIs(S, 'small') ? pick(S, [3, 4, 5]) + '일' : pick(S, [2, 3, 4]) + '주';
      const sick = S.marks.seasick ? ' 이번에도 사흘은 멀미에 시달렸습니다.' : S.marks.sea_legs ? ' 멀미하는 후임에게 물을 떠다 줬습니다.' : '';
      return { t: `${weeks} 동안 출동을 나갔습니다. 수평선을 벗어나자 휴대폰 신호가 끊겼습니다.${sick}`, fx: { mind: -4, skill: 3 } };
    } }),
  P({ id: 'place_port_day', kind: 'event', w: 2, gap: 6, when: { place: ['ship'] },
    run: (S) => ({ t: `입항일. 부두에 가족들이 손을 흔들고 있었습니다.${S.bonds?.lover >= 50 ? ' 그 사이에 익숙한 얼굴도 있었습니다.' : ''} 신호가 잡히자마자 밀린 메시지가 쏟아졌습니다.`, fx: { mind: 5 } }) }),
  P({ id: 'place_ship_bunk', kind: 'event', w: 2, gap: 12, when: { place: ['small'] },
    run: () => ({ t: '3층 침대 맨 위 칸. 몸을 뒤집으면 천장 배관에 어깨가 닿습니다. 엔진 소리를 자장가 삼아 자는 법을 익혔습니다.', fx: { mind: -2 } }) }),
  P({ id: 'place_ship_transfer', kind: 'decision', w: 4, when: { place: ['ship'] },
    c: (S) => served(S) >= 8,
    build: (S) => ({
      title: '육상 근무로 옮길까',
      body: `배를 탄 지 ${served(S)}개월. 육상 부대 결원 공고가 붙었습니다.${S.marks.seasick ? ' 멀미는 아직도 적응이 안 됩니다.' : ''}`,
      choices: [
        { k: 'stay', label: '배에 남는다', hint: '출동은 계속 · 함정 동료는 그대로' },
        { k: 'move', label: '육상 근무를 신청한다', hint: '될지는 모른다 · 생활이 달라진다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') return { t: '배에 남기로 했습니다. 갑판장이 말없이 커피를 건넸습니다.', fx: { mind: 2 }, mark: { set: { ship_stay: {} } } };
      if (!roll(S, 0.5)) return { t: '육상 근무를 신청했지만 자리가 없다는 답이 왔습니다. 다음 출항 준비를 했습니다.', fx: { mind: -4 } };
      // 근무지가 바뀐다 → 함정 사건이 멈추고 기지 사건이 나온다
      S.env.post = 'base';
      S.env.place = { ...S.env.place, tags: S.env.place.tags.filter((t) => t !== 'ship' && t !== 'small') };
      return { t: '육상 부대로 옮겼습니다. 매일 밤 휴대폰이 켜지는 게 낯설었습니다.', fx: { mind: 5 }, mark: { set: { ship_off: {} } } };
    } }),

  // ── 비행단 ──
  P({ id: 'place_jet_noise', kind: 'event', w: 3, gap: 12, when: { place: ['jet'] },
    run: (S) => ({ t: served(S) < 3
      ? '전투기가 머리 위로 뜰 때마다 생활관 창문이 떨렸습니다. 귀마개를 끼고도 잠을 설쳤습니다.'
      : '이제 전투기 소리로 시간을 압니다. 야간 비행이 없는 날은 오히려 너무 조용해서 깹니다.', fx: { mind: served(S) < 3 ? -3 : 1 } }) }),
  P({ id: 'place_fod', kind: 'event', w: 3, gap: 6, when: { place: ['jet'] },
    run: () => ({ t: '전 부대원이 활주로에 한 줄로 서서 걸었습니다. 손톱만 한 돌 하나도 엔진에 들어가면 사고라고 했습니다. 주운 건 볼트 하나와 자갈 한 줌.', fx: { fit: 1, skill: 1 } }) }),
  P({ id: 'place_scramble', kind: 'event', w: 2, gap: 8, when: { place: ['jet'] },
    run: () => ({ t: '새벽 3시, 비상 출격 경보. 전투기 두 대가 뜨고 나서야 다시 누웠습니다. 무슨 일이었는지는 끝내 몰랐습니다.', fx: { mind: -2, skill: 2 } }) }),

  // ── 산꼭대기 사이트 ──
  P({ id: 'place_peak_cut', kind: 'event', w: 4, gap: 12, when: { place: ['mountain'], season: 'winter' },
    run: () => ({ t: '폭설로 산 아래 길이 끊겼습니다. 열흘 동안 아무도 올라오지 못했고, 부식이 떨어져 마지막엔 건빵으로 버텼습니다.', fx: { mind: -6, fit: -1 }, mark: { set: { peak_cut: {} } } }) }),
  P({ id: 'place_peak_view', kind: 'event', w: 2, gap: 8, when: { place: ['mountain'] },
    run: () => ({ t: '근무를 마치고 나오니 발아래로 구름이 깔려 있었습니다. 해가 구름 바다 위로 올라왔습니다. 이 맛에 버틴다는 선임 말을 조금 알 것 같았습니다.', fx: { mind: 5 } }) }),

  // ── 해안 경계 ──
  P({ id: 'place_coast_watch', kind: 'event', w: 3, gap: 6, when: { place: ['coast'] },
    run: (S) => (roll(S, 0.7)
      ? { t: '야간 해안 경계 중 열상 장비에 떠다니는 물체가 잡혔습니다. 5분 대기조까지 출동했는데, 어민이 놓친 부표였습니다.', fx: { mind: -1, skill: 2 } }
      : { t: '새벽 해안 순찰. 밀려온 쓰레기를 치우다 보니 해가 떴습니다. 바다는 생각보다 시끄러웠습니다.', fx: { fit: 1 } }) }),

  // ── GOP 철책 ──
  P({ id: 'place_gop_fence', kind: 'event', w: 3, gap: 6, when: { place: ['gop'] },
    run: (S) => ({ t: pick(S, [
      '철책 감지 센서가 울려 5분 대기조로 뛰어나갔습니다. 고라니 한 마리가 철책 아래를 파고 있었습니다.',
      '철책 순찰로 하루 수천 개의 계단을 오르내렸습니다. 내려올 때 무릎이 먼저 웃었습니다.',
      '소초 밖으로 나갈 일이 없는 몇 달. 같은 얼굴, 같은 근무표, 같은 철책.',
    ]), fx: { fit: 2, mind: -2 } }) }),

  // ── 후방: 대민 지원 ──
  P({ id: 'place_farm_help', kind: 'event', w: 3, gap: 12, when: { place: ['rear'], months: [5, 6, 9, 10] },
    run: () => ({ t: '대민 지원으로 마을 일손을 도왔습니다. 할머니가 내온 새참 국수가 부대 밥보다 맛있었습니다.', fx: { mind: 4, fit: 1 } }) }),

  // ── 사령부·직할: 행사 동원 ──
  P({ id: 'place_ceremony', kind: 'event', w: 3, gap: 8, when: { place: ['support', 'hq'] },
    run: (S) => ({ t: S.env.place?.id === 'gyeryong' && S.ym.endsWith('-10')
      ? '지상군 축제 기간. 부대 앞이 관광객으로 붐볐고, 행사장 안내를 하루 종일 섰습니다.'
      : '높은 분 방문 행사에 동원됐습니다. 도로 연석을 닦고, 리허설만 세 번 했습니다.', fx: { mind: -3 } }) }),

  // ── 진해 군항제 ──
  P({ id: 'place_cherry', kind: 'event', w: 6, gap: 12, when: { place: ['cherry'], months: [4] },
    run: () => ({ t: '군항제 기간. 부대가 개방돼 벚꽃 사이로 관광객이 몰렸습니다. 사진 찍어 달라는 부탁을 수십 번 받았습니다.', fx: { mind: 3 } }) }),

  // ── 외출·면회: 지역에 따라 갈 곳과 올 사람이 다르다 ──
  P({ id: 'place_town_out', kind: 'event', w: 3, gap: 10, when: { place: ['town'] },
    run: (S) => ({ t: pick(S, [
      '외출. 갈 곳은 읍내 PC방, 치킨집, 다시 PC방. 가게마다 군인뿐이고 값은 서울보다 비쌌습니다.',
      '외출. 읍내 유일한 카페에 들어가니 손님이 전부 같은 부대였습니다. 서로 못 본 척했습니다.',
      `외출. ${town(S)} 터미널 앞 분식집 아주머니가 "또 왔네" 하며 떡볶이를 더 얹어 줬습니다.`,
    ]), fx: { mind: 2 } }) }),
  P({ id: 'place_city_out', kind: 'event', w: 3, gap: 10, when: { place: ['city'] },
    run: (S) => ({ t: pick(S, [
      `외출. 버스로 20분이면 ${town(S)} 시내입니다. 영화 한 편 보고 맛집에서 밥을 먹었습니다. 잠깐 군인인 걸 잊었습니다.`,
      `외출. ${town(S)} 시내 서점에서 두 시간을 보냈습니다. 복귀 버스에서 산 책을 절반 읽었습니다.`,
      `외출. 동기와 ${town(S)} 시내 찜질방에 갔습니다. 둘 다 30분 만에 잠들었습니다.`,
    ]), fx: { mind: 4 } }) }),
  P({ id: 'place_tourist', kind: 'event', w: 2, gap: 10, when: { place: ['tourist'] },
    run: () => ({ t: '외출해 보니 거리가 관광객으로 가득했습니다. 남들은 여행 오는 곳에서 군 생활을 한다는 게 묘했습니다.', fx: { mind: 3 } }) }),
  P({ id: 'place_near_home', kind: 'event', w: 3, gap: 10, when: { place: ['capital'] },
    c: (S) => S.env.place?.travel <= 2,
    run: () => ({ t: '부모님이 주말에 면회를 왔습니다. 집에서 한 시간 반. 가방 가득 반찬을 싸 오셨습니다.', fx: { mind: 5 } }) }),
  P({ id: 'place_far_home', kind: 'event', w: 2, gap: 12,
    c: (S) => S.env.place?.travel >= 4 && S.leave.left > 0 && !placeIs(S, 'island'),
    run: (S) => ({ t: S.flags.n_place_far_home
      ? `복귀 날. ${town(S)}행 막차 시간을 거꾸로 계산해 집을 나섰습니다. ${S.env.place.travel}시간 내내 창밖만 봤습니다.`
      : `휴가 첫날. ${town(S)}에서 집까지 버스와 기차를 갈아타며 ${S.env.place.travel}시간. 휴가의 반나절이 길에서 사라졌습니다.`, fx: { mind: -1 } }) }),
];

/** 기존 사건에 붙는 지역 문구 (echoes.js 형식, 흔적 대신 지역을 본다) */
export const PLACE_ECHOES = {
  quiet_month: [
    { t: (S) => (placeIs(S, 'cold') ? `조용한 한 달. 창밖으로 ${where(S)} 들판에 눈이 쌓여 갔습니다.` : '') },
    { t: (S) => (placeIs(S, 'ship') ? '조용한 한 달. 정박 중인 배에서 갑판 녹을 닦고 또 닦았습니다.' : '') },
    { t: (S) => (placeIs(S, 'island') ? '조용한 한 달. 선착장에 들어오는 배를 세는 게 일과가 됐습니다.' : '') },
    { t: (S) => (placeIs(S, 'mountain') ? '조용한 한 달. 산꼭대기에는 바람 소리밖에 없었습니다.' : '') },
  ],
  drill: [
    { add: (S) => (placeIs(S, 'cold') && ['12', '01', '02'].includes(S.ym.slice(5)) ? `${where(S)}의 겨울 훈련은 텐트 안 물통까지 얼렸습니다.` : '') },
  ],
  eval_fitness: [
    { needs: 'frostbite', add: '겨울에 동상을 입었던 발가락이 뛸 때마다 저렸습니다.' },
  ],
  bond_holiday_leave: [
    { needs: 'ferry_stuck', add: (S, o) => (o.t.includes('당첨') ? '이번엔 배가 제때 떴습니다.' : '') },
    { add: (S, o) => (o.t.includes('당첨') && S.env.place?.travel >= 4 ? `명절 귀성길이라 ${where(S)}에서 집까지 평소보다 두 배가 걸렸습니다.` : '') },
  ],
  bond_mother_birthday: [
    { add: (S) => (placeIs(S, 'island') ? '택배도 배로 사흘이 걸리는 섬이었습니다.' : '') },
  ],
};
