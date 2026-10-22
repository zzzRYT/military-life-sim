// events-crisis.js — 큰 이슈: 판마다 1~3번, 복무 중간에 반드시 터지는 사건
// 평탄한 군 생활을 깨는 장치. 판이 시작할 때 '언제' 터질지 정해 두고(별도 난수 줄기라 다른 추첨을 안 밀어낸다),
// 그 달이 오면 그때 조건이 맞는 위기 하나를 고른다. 모든 선택지가 크게 잃는다 — 멘탈이 30·20 아래로 내려가면
// 기존 탈영(desert_self → 군사재판)·부적합 심사(unfit_review → 강제 전역) 결정이 열린다.
// 영창은 2020-08 폐지 → 그 뒤엔 군기교육. 확률·효과는 전부 '가정'.
import { rand, here } from '../src/engine.js';
import { makeRng } from '../src/rng.js';
import { monthsBetweenYm, shiftMonth } from '../src/date.js';
import { fmt } from '../src/text.js';
import { HELP } from './events.js';

const roll = (S, p) => rand(S) < p;
const boss = (S) => (here(S, 'roomSenior') ? 'roomSenior' : here(S, 'senior') ? 'senior' : null);
const say = (S, str) => fmt(S, str.replaceAll('{boss', `{${boss(S) ?? 'senior'}`));
const lockup = (S, n) => (S.ym < '2020-08' ? { kind: 'brig', n } : { kind: 'drill', n });
const lockName = (S) => (S.ym < '2020-08' ? '영창' : '군기교육대');

const CRISIS = [
  { id: 'c_brass', title: '탄피 하나', src: '가정',
    body: '사격 끝나고 탄피를 세는데 하나가 모자랍니다. 중대 전체가 사격장 흙을 손으로 뒤지기 시작했습니다. 해가 지고 있습니다. 그 사로는 내 사로였습니다.',
    choices: [
      { k: 'search', label: '끝까지 찾는다', hint: '밤을 샌다 · 다 같이' },
      { k: 'fill', label: '어디서 구해 채운다', hint: '오늘 밤은 끝난다 · 걸리면 끝장' },
      { k: 'own', label: '내 실수라고 보고한다', hint: '화살이 나로 모인다' },
    ],
    apply: (S, k) => {
      if (k === 'search') return { t: fmt(S, '새벽 두 시, 플래시 불빛 아래서 {peer.name}이 탄피를 찾았습니다. 중대는 한 달 출타 통제. 아무도 대놓고 말하지 않았지만, 다들 그게 내 사로였다는 걸 압니다.'), fx: { mind: -15, fit: -5 }, rel: { peer: 4 }, ban: 1 };
      if (k === 'fill') return roll(S, 0.35)
        ? { t: `수량은 맞았는데 탄피 로트 번호가 달랐습니다. 탄약 관리 위반에 허위 보고까지 붙었습니다. ${lockName(S)}에 가는 날, 아무도 배웅하지 않았습니다.`, fx: { mind: -22 }, rel: { sfc: -20 }, punish: lockup(S, 15) }
        : { t: '수량이 맞았습니다. 모두 들어가 잤습니다. 나만 못 잤습니다. 그 탄피가 어디서 왔는지는 지금도 말하지 않습니다.', fx: { mind: -10 }, mark: { set: { c_secret: {} } } };
      return { t: '"제 사로입니다. 제가 확인을 못 했습니다." 수색은 이어졌지만 화살은 나 하나로 모였습니다. 휴가가 깎이고, 행보관은 한동안 내 이름을 성까지 붙여 불렀습니다.', fx: { mind: -12 }, rel: { peer: 8, sfc: -5 }, punish: { kind: 'leaveCut', n: 3 } };
    } },

  { id: 'c_hit', title: '창고 뒤', src: 'era-culture ① 구타·가혹행위 · 가정', help: true, ok: (S) => !!boss(S) && S.rank <= 2,
    body: '{boss}이 창고 뒤로 불렀습니다. 이유는 끝까지 듣지 못했습니다. 정강이에 전투화가 두 번 꽂혔고, 마지막에 "말하면 알지?"가 왔습니다.',
    choices: [
      { k: 'report', label: '신고한다', hint: '가해자는 처벌 · 나는 "그놈"이 된다' },
      { k: 'endure', label: '참는다', hint: '조용하다 · 또 온다' },
      { k: 'fight', label: '되받아친다', hint: '참을 만큼 참았다' },
    ],
    apply: (S, k) => {
      const b = boss(S) ?? 'senior';
      if (k === 'report') return roll(S, 0.2 + S.env.abuse / 200)
        ? { t: say(S, '{boss}은 징계를 받았습니다. 대신 나는 생활관에서 투명인간이 됐습니다. 밥을 먹을 때도, 점호를 받을 때도 내 옆자리는 비어 있었습니다.'), fx: { mind: -16 }, rel: { peer: -12, [b]: -40 } }
        : { t: say(S, '{boss}은 다른 부대로 전출됐습니다. 생활관은 한동안 조용했고, 나는 그날 처음으로 밤에 깊이 잤습니다. 그래도 창고 앞을 지날 때마다 발이 느려졌습니다.'), fx: { mind: -6 }, rel: { [b]: -40, sfc: 5 } };
      if (k === 'endure') return { t: '아무 말도 하지 않았습니다. 정강이 멍은 일주일이면 빠졌는데, 창고 쪽으로 가는 길은 전역할 때까지 돌아서 다녔습니다.', fx: { mind: -18 }, rel: { [b]: 3 }, mark: { set: { c_hit_endure: {} } } };
      if (roll(S, 0.15)) return { t: say(S, '{boss}에게 주먹이 먼저 나갔습니다. 코뼈가 부러졌습니다. 이유가 무엇이었든 "더 크게 다치게 한 쪽"이 됐고, 폭행 혐의로 군사재판에 넘겨졌습니다.'), fx: { mind: -20 }, ending: 'court' };
      return { t: say(S, `{boss}에게 주먹이 먼저 나갔습니다. 쌍방 폭행으로 정리됐고, 먼저 맞은 건 아무 의미가 없었습니다. ${lockName(S)}에서 돌아오니 {boss}은 아무렇지 않게 웃고 있었습니다.`), fx: { mind: -15 }, rel: { [b]: -30 }, punish: lockup(S, 10) };
    } },

  { id: 'c_theft', title: '내 주머니의 지갑', src: '가정',
    body: '생활관에서 지갑이 없어졌습니다. 전원 관물대 검사. 내 전투복 주머니에서 그 지갑이 나왔습니다. 나는 그 지갑을 오늘 처음 봤습니다.',
    choices: [
      { k: 'deny', label: '끝까지 아니라고 한다', hint: '진실은 내 편 · 조사는 길다' },
      { k: 'point', label: '짚이는 사람을 말한다', hint: '나는 빠져나간다 · 틀리면?' },
      { k: 'admit', label: '그냥 내가 했다고 한다', hint: '빨리 끝난다 · 기록이 남는다' },
    ],
    apply: (S, k) => {
      if (k === 'deny') return roll(S, 0.5)
        ? { t: '한 달 만에 진짜 범인이 나왔습니다. 사과는 없었습니다. 그 한 달 동안 아무도 내 옆에 앉지 않았습니다.', fx: { mind: -18 }, rel: { peer: -5 } }
        : { t: '증거 불충분으로 끝났습니다. 무혐의인데, 생활관에선 아무도 그렇게 부르지 않았습니다. 나는 전역할 때까지 "그 지갑"이었습니다.', fx: { mind: -20 }, rel: { peer: -15 } };
      if (k === 'point') return { t: fmt(S, '이름을 말하는 순간 생활관이 둘로 갈라졌습니다. 맞았는지 틀렸는지는 끝내 밝혀지지 않았고, {peer.name}은 내가 아니라 그쪽에 앉았습니다.'), fx: { mind: -14 }, rel: { peer: -20 } };
      return { t: fmt(S, '{sfc} 앞에서 "제가 그랬습니다"라고 했습니다. 조사는 그날로 끝났고, 징계위원회는 다음 주에 열렸습니다. 하지 않은 일로 받는 벌은 이상하게 더 무거웠습니다.'), fx: { mind: -16 }, punish: { kind: 'leaveCut', n: 5 } };
    } },

  { id: 'c_bus', title: '막차를 놓쳤다', src: '군형법 제79조 무단이탈 · 가정',
    body: '휴가 마지막 날, 고속버스가 사고 정체에 갇혔습니다. 복귀 시간까지 두 시간, 남은 거리는 네 시간입니다.',
    choices: [
      { k: 'call', label: '먼저 전화해 사실대로 말한다', hint: '혼난다 · 기록은 가볍다' },
      { k: 'lie', label: '아팠다고 둘러댄다', hint: '통하면 끝 · 진단서가 필요하다' },
      { k: 'taxi', label: '택시를 잡는다', hint: '시간은 맞춘다 · 돈이 날아간다' },
    ],
    apply: (S, k) => {
      if (k === 'call') return { t: '"버스가 멈췄습니다." 수화기 너머 한숨이 길었습니다. 세 시간 늦게 위병소를 통과했고, 휴가 단축이 따라왔습니다.', fx: { mind: -8 }, rel: { sfc: -6 }, punish: { kind: 'leaveCut', n: 2 } };
      if (k === 'lie') return roll(S, 0.4)
        ? { t: `진단서 날짜가 하루 어긋났습니다. 늦은 복귀에 허위 보고가 붙었습니다. ${lockName(S)}에서 나는 그 하루를 계속 다시 셌습니다.`, fx: { mind: -20 }, rel: { sfc: -15 }, punish: lockup(S, 10) }
        : { t: '동네 의원 진단서 한 장으로 넘어갔습니다. 대신 그 의원 간판을 볼 때마다 속이 울렁거렸습니다.', fx: { mind: -6 } };
      const fare = Math.min(S.money.cash, 150000);
      S.money.cash -= fare;
      return { t: `택시비 ${fare.toLocaleString('ko-KR')}원. 복귀 오 분 전에 위병소를 통과했습니다. 몇 달 치 월급이 한 시간 반 만에 미터기 숫자가 됐습니다.`, fx: { mind: -9 } };
    } },

  { id: 'c_knee', title: '무릎', src: '병역법 제65조 (병역처분 변경) · 가정',
    body: '야간 행군 중 경사로에서 무릎이 꺾였습니다. 군의관은 "인대가 끊어졌을 수도 있다"고 했습니다. 수술하면 몇 달, 안 하면 평생 시큰거릴 수 있습니다.',
    choices: [
      { k: 'surgery', label: '수술받는다', hint: '복무는 이어진다 · 길고 외롭다' },
      { k: 'review', label: '의병 전역 심사를 받는다', hint: '집에 갈 수도 · 떨어지면 더 무겁다' },
      { k: 'endure', label: '파스로 버틴다', hint: '아무도 모른다 · 무릎만 안다' },
    ],
    apply: (S, k) => {
      if (k === 'surgery') return { t: fmt(S, '{peer.name}이 병원 침대 옆에 PX 과자를 두고 갔습니다. 석 달 동안 병원과 생활관을 오갔습니다. 돌아오니 생활관 서열 사이에서 내 자리가 애매해졌습니다. 아무도 나를 부르지 않았고, 그게 배려인지 아닌지 몰랐습니다.'), fx: { fit: -25, mind: -12 }, rel: { peer: -5 } };
      if (k === 'review') return roll(S, 0.3)
        ? { t: fmt(S, '심사 결과 전역 판정. {peer.name}이 위병소까지 가방을 들어 줬습니다. 목발로 나서는 나에게 아무도 박수 치지 않았고, 나도 웃지 않았습니다.'), fx: { mind: -8 }, ending: 'medical' }
        : { t: '심사 결과 계속 복무. 무릎은 그대로인데 기대했던 만큼 마음이 더 무거워졌습니다.', fx: { fit: -15, mind: -16 } };
      return { t: '파스와 진통제로 버텼습니다. 그 뒤로 비 오는 날마다 무릎이 일기예보를 했습니다.', fx: { fit: -18, mind: -6 } };
    } },

  { id: 'c_home', title: '집에서 온 연락', src: '병역법 제63조 ① (의가사) · 가정',
    body: '어머니에게서 연락이 왔습니다. 아버지 가게가 문을 닫았다고. "너는 신경 쓰지 말고 몸 건강히"라는 말이 세 번 반복됐습니다.',
    choices: [
      { k: 'leave', label: '청원휴가를 신청한다', hint: '집에 간다 · 할 수 있는 건 없다' },
      { k: 'apply', label: '의가사 전역을 알아본다', hint: '집을 돕는다 · 통과는 어렵다' },
      { k: 'silent', label: '모른 척 복무한다', hint: '할 수 있는 게 없다' },
    ],
    apply: (S, k) => {
      if (k === 'leave') return { t: '닷새 동안 가게 셔터를 내리는 걸 도왔습니다. 복귀하는 버스에서 처음으로 울었습니다.', fx: { mind: -12 } };
      if (k === 'apply') return roll(S, 0.3)
        ? { t: '생계 곤란이 인정되었습니다. 전역증 대신 "전시근로역 편입" 통지서를 받았습니다. 동기들에게 인사할 시간은 반나절이었습니다.', fx: { mind: -5 }, ending: 'family' }
        : { t: '요건이 부족하다는 답이 왔습니다. 희망을 가졌던 만큼 더 떨어졌습니다.', fx: { mind: -20 } };
      return { t: '그 연락을 마음 깊숙이 넣어 두었습니다. 그 뒤로 월급날마다 통장 숫자가 다르게 보였습니다.', fx: { mind: -18 } };
    } },
];

// 판마다 위기 일정: 1~3번(옛 시대·나쁜 부대일수록 많이), 자대 3개월째부터 전역 2개월 전 사이에 고르게 흩뿌린다
function plan(S) {
  if (S.flags.crisis) return S.flags.crisis;
  const r = makeRng(S.seed ^ 0x63726973);
  const start = shiftMonth(S.dates.enlist.slice(0, 7), 3);
  const span = Math.max(1, monthsBetweenYm(start, S.dates.discharge.slice(0, 7)) - 2);
  const n = 1 + (r() < 0.6) + (r() < S.env.abuse / 250);
  S.flags.crisis = Array.from({ length: n }, (_, i) => ({ ym: shiftMonth(start, Math.floor(((i + r()) * span) / n)), u: r() }));
  return S.flags.crisis;
}
// 이 달이 위기 달이면, 지금 조건이 맞고 아직 안 나온 위기 중 하나의 id
function due(S) {
  const slot = plan(S).find((x) => x.ym === S.ym);
  if (!slot) return null;
  const ok = CRISIS.filter((c) => !S.flags['n_' + c.id] && (!c.ok || c.ok(S)));
  return ok.length ? ok[Math.floor(slot.u * ok.length)].id : null;
}

export const CRISIS_EVENTS = CRISIS.map((c) => ({
  id: c.id, kind: 'decision', src: c.src, must: true, when: { phase: ['serve'] },
  c: (S) => due(S) === c.id,
  build: (S) => ({ title: c.title, body: say(S, c.body), ...(c.help ? { help: HELP } : {}), choices: c.choices }),
  apply: c.apply,
}));

// 말년의 그늘 — 전역이 가까워질수록 바깥이 무겁다. 말년이 일직선으로 좋아지지만은 않게
const M = (e) => ({ kind: 'event', src: '가정', max: 1, w: 4, p: 0.35, when: { phase: ['serve'] }, ...e, c: (S) => (S.monthsLeft ?? 99) <= 4 && (!e.c || e.c(S)) });
export const LATE_EVENTS = [
  M({ id: 'c_late_future', run: () => ({ t: '전역이 석 달 남았습니다. 복학 서류, 자격증, 알바 자리가 한꺼번에 머리에 들어왔습니다. 처음으로 전역이 무서웠습니다. 여기선 적어도 내일 할 일이 정해져 있었습니다.', fx: { mind: -8 } }) }),
  M({ id: 'c_late_home', run: () => ({ t: '말년 휴가 첫날 저녁, 아버지가 "나와서 뭐 할 거냐"고 물었습니다. 대답을 못 했고, 밥상은 조용히 끝났습니다. 남은 휴가 내내 그 질문이 따라다녔습니다.', fx: { mind: -9 } }) }),
  M({ id: 'c_late_gap', run: (S) => ({ t: S.ym >= '2010-01'
    ? '친구들 단톡방 대화가 낯설어졌습니다. 모르는 이름, 모르는 수업, 모르는 가게. 나만 이 년 전에 멈춰 있었습니다.'
    : '친구 편지에 모르는 이름이 늘었습니다. 모르는 수업, 모르는 술집. 나만 이 년 전에 멈춰 있었습니다.', fx: { mind: -6 } }) }),
];
