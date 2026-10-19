// events-tail.js — 판을 크게 가르는 사건 (docs/05 G5)
// 1) 역사적 순간: 그 달에 복무 중이면 누구나 겪는다. 입대 연도가 곧 운명
//    실제 사건은 연도·유형까지만 (피해자 실명·선정적 묘사 금지). 날짜는 공개 보도 기준, 체감·효과는 가정.
// 2) 꼬리 사건: 드물지만 터지면 그 판의 한 줄이 되는 일. 확률·효과는 전부 '가정'.
import { rand, where, phoneOn, here } from '../src/engine.js';
import { addDays } from '../src/date.js';
import { fmt } from '../src/text.js';

const roll = (S, p) => rand(S) < p;
const between = (S, a, b) => S.ym >= a && S.ym <= b;
const once = (S, id) => !S.flags['n_' + id];
const H = (e) => ({ kind: 'event', must: true, ...e, when: { phase: ['train', 'serve'], ...e.when }, c: (S) => once(S, e.id) && e.c(S) });
const T = (e) => ({ src: '가정', ...e, when: { phase: ['serve'], ...e.when } });

export const TAIL_EVENTS = [
  // ── 역사적 순간 ──
  H({ id: 'h_worldcup_2002', src: '2002 한일 월드컵 (2002-06)', c: (S) => between(S, '2002-06', '2002-06'),
    run: () => ({ t: '월드컵 4강. 중대장이 TV 앞 취침 점호를 미뤘고, 연장전 골든골에 생활관 침상이 무너질 뻔했습니다. 그날만큼은 이등병도 소리를 질러도 됐습니다.', fx: { mind: 12 }, boost: 1 }) }),

  H({ id: 'h_cheonan_2010', src: '천안함 피격 (2010-03-26)', c: (S) => between(S, '2010-03', '2010-04'),
    run: (S) => ({ t: S.branch === 'navy'
      ? '서해에서 초계함이 침몰했다는 소식이 들어왔습니다. 같은 배를 탔던 동기가 있는지 다들 이름을 확인했습니다. 그 봄 내내 함정 안이 조용했습니다.'
      : '서해에서 초계함이 침몰했다는 뉴스가 생활관 TV에 계속 나왔습니다. 경계 근무가 두 배로 늘었고, 누구도 불평하지 않았습니다.',
    fx: { mind: -8 }, ban: 1 }) }),

  H({ id: 'h_yeonpyeong_2010', src: '연평도 포격 (2010-11-23)', c: (S) => between(S, '2010-11', '2010-12'),
    run: (S) => ({ t: S.branch === 'marine'
      ? '연평도에 포탄이 떨어졌습니다. 해병대 전 부대 휴가가 묶였고, 전투복을 입은 채 잠드는 날이 이어졌습니다. 집에서 온 편지엔 "괜찮냐"만 다섯 번 적혀 있었습니다.'
      : '연평도 포격 뉴스가 나온 밤, 전 부대 비상이 걸렸습니다. 잡혀 있던 휴가가 그 자리에서 취소됐습니다.',
    fx: { mind: -10 }, ban: 2 }) }),

  { id: 'h_mine_2015', kind: 'decision', must: true, src: '목함지뢰·포격 도발 (2015-08) — 전역 연기를 자원한 장병 사례 보도',
    when: { phase: ['serve'] }, c: (S) => between(S, '2015-08', '2015-08') && S.monthsLeft != null && S.monthsLeft <= 2 && once(S, 'h_mine_2015'),
    build: () => ({
      title: '전역을 미루겠습니까?',
      body: 'DMZ에서 지뢰가 터졌고, 며칠 뒤 포탄이 넘어왔습니다. 전역 열흘 앞둔 밤, 중대장이 말년들만 불러 모았습니다. "강요 아니다. 남을 사람은 남아도 된다." 옆자리 동기가 먼저 손을 들었습니다.',
      src: '2015년 8월 남북 군사 긴장 때 전역 연기를 신청한 장병들이 보도되었다 (자원, 강제 아님)',
      choices: [
        { k: 'stay', label: '남겠다고 손을 든다', hint: '전역이 미뤄진다 · 그 밤을 평생 얘기하게 된다' },
        { k: 'go', label: '예정대로 전역한다', hint: '아무도 탓하지 않는다 · 동기 얼굴이 남는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') {
        S.dates.discharge = addDays(S.dates.discharge, 30);
        return { t: '손을 들었습니다. 긴장이 풀린 건 그로부터 한참 뒤였고, 전역은 한 달 늦어졌습니다. 그 얘기는 이후 모든 술자리의 안주가 됐습니다.', fx: { mind: 8, fit: -3 }, mark: { set: { stayed_2015: {} } } };
      }
      return { t: '예정대로 짐을 쌌습니다. 위병소를 나서며 돌아본 막사에 불이 다 켜져 있었습니다.', fx: { mind: -4 } };
    } },

  H({ id: 'h_gp_2018', src: '9·19 군사합의, GP 시범 철수 (2018-11)', c: (S) => between(S, '2018-11', '2018-12') && S.env.post === 'gop',
    run: () => ({ t: '우리가 올려다보던 GP 하나가 폭파됐습니다. 철거 장면을 TV로 보면서 선임이 "저기서 겨울 두 번 났다"고 중얼거렸습니다.', fx: { mind: 2 } }) }),

  H({ id: 'h_covid_2020', src: '코로나19 장병 휴가·외출 통제 (2020-02~)', c: (S) => between(S, '2020-02', '2021-06'),
    run: (S) => ({ t: `코로나로 휴가·외출·면회가 한꺼번에 막혔습니다. 휴가 복귀자는 2주 격리, 생활관은 마스크를 쓴 채 잤습니다. ${phoneOn(S) ? '휴대폰이 없었으면 버티지 못했을 거라고 다들 말했습니다.' : '바깥 소식은 TV 뉴스가 전부였습니다.'}`,
    fx: { mind: -10 }, ban: 3, mark: { set: { covid: {} } } }) }),

  // ── 꼬리 사건 ──
  T({ id: 't_hero', kind: 'event', w: 2, p: 0.004, max: 1,
    c: (S) => !S.marks.hero,
    run: (S) => {
      S.leave.left += 7;
      S.rewards.push({ ym: S.ym, kind: 'hero', days: 7 });
      return { t: '휴가 나와 탄 지하철에서 사람이 쓰러졌습니다. 훈련소에서 배운 심폐소생술이 몸에서 먼저 나왔습니다. 일주일 뒤 부대로 감사 편지가 왔고, 사단장 표창과 포상휴가 7일이 따라왔습니다.',
        fx: { mind: 15 }, boost: 2, mark: { set: { hero: {} } } };
    } }),

  T({ id: 't_fight', kind: 'decision', w: 3, p: (S) => 0.004 + S.env.abuse / 100 * 0.02, max: 1,
    c: (S) => S.rank >= 1 && S.st.mind < 45 && (here(S, 'roomSenior') || here(S, 'senior')),
    build: (S) => {
      const boss = here(S, 'roomSenior') ? 'roomSenior' : 'senior';
      return {
        title: '이번엔 못 참겠다',
        body: fmt(S, `세 번째입니다. {${boss}}이 내 부모님 얘기를 꺼내며 웃었습니다. 손에 쥔 반합이 떨립니다. 생활관 사람들이 숨을 죽이고 이쪽을 봅니다.`),
        src: S.ym < '2020-08' ? '2020년 8월 영창이 폐지되기 전까지 병 징계에는 영창(15일 이내, 복무기간 불산입)이 있었다' : '영창 폐지(2020-08) 이후 병 징계는 군기교육·감봉·휴가단축·근신·견책',
        choices: [
          { k: 'swallow', label: '삼킨다', hint: '아무 일도 없다 · 속이 썩는다' },
          { k: 'hit', label: '들이받는다', hint: '생활관이 뒤집힌다 · 징계는 피할 수 없다' },
          { k: 'report', label: '그 길로 행정반에 간다', hint: '절차대로 · 고자질쟁이 소리를 듣는다' },
        ],
      };
    },
    apply: (S, k) => {
      const boss = here(S, 'roomSenior') ? 'roomSenior' : 'senior';
      if (k === 'swallow') return { t: '반합을 내려놓았습니다. 그날 밤 화장실에서 오래 있었습니다.', fx: { mind: -12 }, rel: { [boss]: -5 } };
      if (k === 'hit') {
        S.env.abuse = Math.max(0, S.env.abuse - 15);
        const brig = S.ym < '2020-08';
        return { t: fmt(S, brig ? '반합이 날아갔고, 다음 장면은 헌병대였습니다. 영창 열흘. 돌아오니 생활관이 묘하게 조용했고, {' + boss + '.name}은 나를 건드리지 않았습니다.'
          : '반합이 날아갔고, 다음 장면은 행정반이었습니다. 군기교육대 열흘. 돌아오니 {' + boss + '.name}은 다른 중대로 옮겨 가 있었습니다.'),
        fx: { mind: -6, fit: -4 }, rel: { [boss]: -30, peer: 10 }, punish: { kind: brig ? 'brig' : 'drill', n: 10 }, mark: { set: { fought: {} } } };
      }
      S.env.abuse = Math.max(0, S.env.abuse - 10);
      return { t: fmt(S, '행정반 문을 두드렸습니다. 조사가 시작됐고 {' + boss + '.name}은 징계를 받았습니다. 한동안 생활관에서 나에게 말 거는 사람이 없었습니다.'),
        fx: { mind: -4 }, rel: { [boss]: -30, peer: -5, sfc: 8 } };
    } }),

  T({ id: 't_celebrity', kind: 'event', w: 2, p: 0.006, max: 1, c: (S) => !S.marks.celeb,
    run: (S) => ({ t: pick(S, [
      '옆 생활관에 아이돌 출신 이병이 전입 왔습니다. 그 주 면회실은 처음 보는 사람들로 꽉 찼고, 덕분에 PX 냉동식품이 동났습니다.',
      '같은 중대에 프로야구 2군 선수가 왔습니다. 족구 판의 질서가 하루아침에 바뀌었습니다.',
      '드라마에서 본 얼굴이 내 맞은편에서 짬밥을 먹고 있었습니다. 그는 김치를 남기지 않았습니다.']),
    fx: { mind: 6 }, mark: { set: { celeb: {} } } }) }),

  T({ id: 't_relief', kind: 'event', w: 3, p: 0.03, max: 1, when: { season: 'summer' },
    run: (S) => {
      const good = roll(S, 0.35);
      if (good) { S.leave.left += 3; S.rewards.push({ ym: S.ym, kind: 'relief', days: 3 }); }
      return { t: `폭우로 근처 마을이 잠겼습니다. 삽을 들고 3주 동안 진흙을 퍼냈습니다. 할머니가 삶아 준 옥수수가 군 생활 최고의 간식이었습니다.${good ? ' 군수님 감사장과 포상휴가 3일이 나왔습니다.' : ''}`,
        fx: { fit: -6, mind: good ? 6 : 2 }, mark: { set: { relief: {} } } };
    } }),

  T({ id: 't_cat', kind: 'event', w: 2, p: 0.02, max: 1, c: (S) => where(S) !== 'sea' && !S.marks.cat,
    run: () => ({ t: '탄약고 뒤에 새끼 고양이가 나타났습니다. 다들 짬밥에서 생선을 몰래 빼돌렸고, 행보관은 못 본 척했습니다. 고양이 이름은 "말년"이 됐습니다.',
      fx: { mind: 8 }, mark: { set: { cat: {} } } }) }),

  T({ id: 't_cat_bye', kind: 'event', w: 4, needs: 'cat', max: 1,
    c: (S) => S.monthsLeft != null && S.monthsLeft <= 1 && once(S, 't_cat_bye'),
    run: () => ({ t: '전역 전날, "말년"이 탄약고 지붕에서 끝까지 내려오지 않았습니다. 후임에게 생선 담당을 넘겼습니다.', fx: { mind: 4 } }) }),

  T({ id: 't_last_accident', kind: 'event', w: 3, p: 0.015, max: 1,
    c: (S) => S.monthsLeft != null && S.monthsLeft <= 1 && S.rank >= 3,
    run: () => ({ t: '말년엔 떨어지는 낙엽도 조심하랬는데. 전역 2주 앞두고 족구하다 발목이 돌아갔습니다. 목발 짚고 위병소를 나가게 생겼습니다.', fx: { fit: -15, mind: -5 } }) }),

  T({ id: 't_snow_discharge', kind: 'event', w: 3, p: 0.25, max: 1, when: { season: 'winter', place: ['snow', 'cold'] },
    c: (S) => S.monthsLeft === 0,
    run: () => ({ t: '전역 날 새벽 폭설이 내렸습니다. 마지막 임무는 위병소까지 가는 길의 눈을 직접 치우는 것이었습니다.', fx: { mind: -2, fit: -2 } }) }),
];

const pick = (S, arr) => arr[Math.floor(rand(S) * arr.length)];
