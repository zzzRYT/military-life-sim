// content/events-leave.js — 휴가 행동 + 휴가·외출 특수 사건 (§3 형식)
// 문체: 전역자의 썰. 휴가는 멘탈 회복 + 원동력(boost: 복귀 후 n개월 매달 멘탈 +2). 확률·수치·비용은 전부 '가정'.
// 장면: 고른 행동을 흔적 leave.scene으로 남기면 src/scene.js가 그 그림을 그린다.

import { rand } from '../src/engine.js';

const roll = (S, p) => rand(S) < p;
const pick = (S, arr) => arr[Math.floor(rand(S) * arr.length)];
const won = (n) => `${(n / 10000).toLocaleString('ko-KR')}만 원`;
const hasLover = (S) => S.bonds?.lover != null;

// 취객 시비: 번화가·술자리에서만. 기본 0.1% × 번화가 2 × 술 3 × 친구 1.5 × 기 센 성격 2 → 휴가 한 번에 최대 1.8% (가정 — "진짜 희소")
export const BRAWL_P = 0.001;
export const brawlChance = (S, a) => (a.town || a.drink
  ? BRAWL_P * (a.town ? 2 : 1) * (a.drink ? 3 : 1) * (a.friends ? 1.5 : 1) * (S.env.self?.temper ? 2 : 1) : 0);

// 휴가 행동. 첫 항목(집)이 자동 결정의 기본값. ok: 고를 수 있는 조건 (돈·연인)
export const ACTS = [
  { k: 'home', label: '집에서 엄마 밥 먹고 푹 잔다', hint: '돈 안 듦 · 가족 · 친구들은 못 만난다', cost: 0, fx: { mind: 7, fit: 3, rel: -2 }, boost: 2, family: 8,
    t: (S) => `집에 갔습니다. 엄마가 차린 밥상 앞에서 말없이 두 공기를 비웠고, 이틀 내리 열두 시간씩 잤습니다. ${S.ym >= '2012' ? '친구들 단톡방은 읽씹했고' : S.ym >= '2003' ? '친구들 문자는 답장을 미뤘고' : '친구들 삐삐 음성은 듣지도 않았고'}, 사흘째 엄마가 "너 휴가 맞니?" 하고 물었습니다.` },
  { k: 'pcroom', label: '친구들과 PC방에서 밤샌다', hint: '3만 원 · 게임', cost: 30000, fx: { mind: 9, fit: -2 }, boost: 1, friends: true,
    t: '친구들과 PC방에서 밤을 새웠습니다. 입대 전에 하던 게임은 패치가 너무 많이 돼서 처음부터 다시 배웠습니다. 친구가 "군대 갔다 오면 실력 느는 줄 알았는데"라며 웃었습니다.' },
  { k: 'karaoke', label: '친구들과 노래방에 간다', hint: '4만 원 · 친구 · 목이 쉰다', cost: 40000, fx: { mind: 9, fit: -1 }, boost: 1, friends: true,
    t: '친구들과 노래방에 갔습니다. 첫 곡 번호를 누르는데 손이 군가 번호를 눌렀습니다. 다 같이 웃다가 목이 쉴 때까지 불렀고, 복귀하는 날 아침에 말이 안 나왔습니다.' },
  { k: 'pub', label: '동네 포장마차에서 친구들과 한잔', hint: '5만 원 · 술', cost: 50000, fx: { mind: 10, fit: -2 }, boost: 2, friends: true, drink: true,
    t: '동네 포장마차에서 친구들과 소주를 마셨습니다. 군대 얘기는 안 하기로 해 놓고 세 잔째부터 그 얘기만 했습니다. 친구들은 처음엔 웃다가 나중엔 조용히 들었습니다.' },
  { k: 'downtown', label: '번화가에서 친구들과 밤새 논다', hint: '10만 원 · 번화가 · 술', cost: 100000, fx: { mind: 12, fit: -3 }, boost: 2, friends: true, drink: true, town: true,
    t: '번화가에서 친구들과 밤새 놀았습니다. 2차, 3차를 돌다 해 뜨는 걸 보고 헤어졌습니다. 택시 안에서 문득 복귀까지 남은 시간을 계산해 버렸습니다.' },
  { k: 'date', label: '여자친구와 데이트한다', hint: '8만 원 · 연인', cost: 80000, fx: { mind: 10 }, boost: 3, lover: 15, ok: hasLover,
    t: '여자친구와 강변을 걸었습니다. 해 지는 걸 보며 전역하면 하고 싶은 것들을 하나씩 말했습니다. 목록이 서른 개를 넘어가자 서로 말이 없어졌습니다.' },
  { k: 'travel', label: '혼자 바다로 여행을 간다', hint: '20만 원 · 혼자라 쓸쓸하다', cost: 200000, fx: { mind: 14, rel: -2 }, boost: 3,
    t: '혼자 기차를 타고 바다에 갔습니다. 아무도 경례하지 않는 곳에서 사흘을 보냈습니다. 모래사장에서 무심코 각을 잡고 걷다가 혼자 웃었습니다.' },
];
const usable = (S) => ACTS.filter((a) => (a.ok?.(S) ?? true) && S.money.cash >= a.cost);

export const LEAVE_EVENTS = [
  { id: 'leave_go', kind: 'decision', when: { phase: ['serve'] }, w: 6, gap: 3, max: 20, src: '가정',
    c: (S) => S.leave.left >= 3 && !(S.flags.leaveBanUntil > S.ym),
    build: (S) => ({
      title: '위병소를 나서는 순간',
      body: '위병소를 나서는 순간부터 계획은 하나뿐입니다. 어디에 이 며칠을 쓸까요. 가방은 가볍고 발걸음은 이미 빠릅니다.',
      src: `남은 휴가 ${S.leave.left}일 · 한 번에 4~6일을 쓴다. 쓴 돈은 월급에서 빠지고, 복귀 후 한동안 매달 멘탈이 오른다.`,
      choices: usable(S).map((a) => ({ k: a.k, label: a.label, hint: a.hint })),
    }),
    apply: (S, k) => {
      const a = ACTS.find((x) => x.k === k);
      const days = Math.min(S.leave.left, 4 + Math.floor(rand(S) * 3)); // 4~6일
      S.leave.left -= days; S.leave.used += days;
      S.money.cash -= a.cost;
      if (a.family) S.bonds.family = Math.min(100, S.bonds.family + a.family);
      if (a.lover && hasLover(S)) S.bonds.lover = Math.min(100, S.bonds.lover + a.lover);
      const head = `휴가 ${days}일${a.cost ? ` · ${won(a.cost)}` : ''} — `;
      if (roll(S, brawlChance(S, a))) {
        const reported = roll(S, 0.6); // 피했든 아니든 신고되면 부대에 통보된다
        return {
          t: `${head}술에 취해 난동을 부리던 사람이 시비를 걸어왔습니다. 피하려 했지만 소매를 붙잡혔고, 곧 경찰이 도착했습니다.${reported ? ' 신원 조회 끝에 부대로 통보가 갔습니다. 휴가의 마지막 날은 파출소에서 끝났습니다.' : ' 조서만 쓰고 풀려났습니다. 휴가의 마지막 날은 파출소에서 끝났습니다.'}`,
          fx: { mind: -6 }, boost: 1, mark: { set: { leave: { scene: 'brawl' }, brawl: {} } },
          ...(reported && { later: { id: 'committee_brawl', inMonths: 1 } }),
        };
      }
      return { t: head + (typeof a.t === 'function' ? a.t(S) : a.t), fx: a.fx, boost: a.boost, mark: { set: { leave: { scene: a.k } } } };
    } },

  // 시비 다음 달: 징계위원회 (leave_go의 later로만 온다). 결과는 운 — 무혐의 40 · 견책 35 · 휴가단축 20 · 군기교육 5 (가정)
  { id: 'committee_brawl', kind: 'event', c: () => false, src: '가정',
    run: (S) => {
      const r = rand(S);
      const head = '휴가 중 시비 건으로 징계위원회가 열렸습니다. 복도 의자에 앉아 있는 시간이 휴가보다 길게 느껴졌습니다.';
      if (r < 0.4) return { t: `${head} 일방적으로 당한 게 CCTV에 그대로 찍혀 있어 혐의 없음으로 끝났습니다.`, fx: { mind: -3 } };
      if (r < 0.75) return { t: `${head} 품위유지 의무 위반으로 견책을 받았습니다. 서류 한 장이 이렇게 무거운 줄 몰랐습니다.`, fx: { mind: -6 }, punish: { kind: 'reprimand' } };
      if (r < 0.95) return { t: `${head} 다툼에 가담한 것으로 판단되어 휴가가 깎였습니다. 억울하다고 말하자 위원장이 "억울한 건 알겠다"고만 했습니다.`, fx: { mind: -8 }, punish: { kind: 'leaveCut', n: 3 } };
      return { t: `${head} 상대가 크게 다쳐 무거운 징계가 내려졌습니다.`, fx: { mind: -12 }, punish: { kind: 'drill', n: 5 } };
    } },

  // 익명의 계산: 외출·외박·휴가 길 식사 자리에서 누군가 대신 계산하고 사라진다. 한 판에 한 번 (가정)
  { id: 'treat_anon', kind: 'event', when: { phase: ['serve'] }, p: 0.025, w: 5, src: '가정',
    c: (S) => !S.flags.n_treat_anon,
    run: (S) => ({
      t: pick(S, [
        '외출 나와 부대 앞 국밥집에서 밥을 먹었습니다. 계산하려니 사장님이 "아까 그 손님이 이미 내고 가셨어요"라고 했습니다. 영수증 뒤에 볼펜으로 "고생 많아요"라고 적혀 있었습니다. 국밥이 평소보다 오래 따뜻했습니다.',
        '외박 나와 동기들과 고깃집에 갔습니다. 다 먹고 일어서는데 옆 테이블 부부가 이미 계산했다고 했습니다. 얼굴도 제대로 못 봤는데, 고기가 갑자기 두 배로 맛있어졌습니다.',
        '휴가 복귀 길에 터미널 분식집에서 김밥을 샀습니다. 뒤에 서 있던 할머니가 "군인 양반 거는 내가 낼게" 하며 먼저 카드를 내밀었습니다. 사양하려는데 할머니가 이미 김밥을 내 가방에 넣고 있었습니다.',
        '부대 앞 중국집에서 짜장면을 먹었는데 계산서가 없었습니다. 누가 냈는지 사장님은 끝까지 말해 주지 않았습니다. 짜장면 면발이 평소보다 길게 느껴졌습니다.',
      ]),
      fx: { mind: 10 }, boost: 2, mark: { set: { kindness: {} } },
    }) },
];
