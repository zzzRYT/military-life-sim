// events-rank.js — 짬 규칙: 계급이 허락하는 것만 할 수 있다 / 역부조리: 짬이 차도 편하지 않다
// 규정엔 없는 불문율(이등병은 눕지 않는다, PX는 상병부터 …)을 어기면 쿠사리는 나만 먹지 않는다 — 동기 전체 집합, 맞선임 책임.
// 근거: research/era-culture.md ③-④ (육군이 2015년 직접 반박한 '카더라' 8개 [S_cul_24], 해병대 호봉 제한 증언 [S_cul_12]).
// 걸릴 확률·빈도는 부조리 지수(S.env.abuse)에 비례 → 옛 시대·나쁜 부대일수록 자주, 더 잘 걸린다. 확률·효과는 '가정'.
import { rand, here, phoneOn } from '../src/engine.js';
import { fmt } from '../src/text.js';

const ab = (S, lo, hi) => lo + ((hi - lo) * S.env.abuse) / 100;
const boss = (S) => (here(S, 'roomSenior') ? 'roomSenior' : here(S, 'senior') ? 'senior' : null);
const bed = (S) => (S.ym < '2012-01' ? '침상' : '침대'); // 침대 전환 2004 시작, 2012 전군 완료 [S_cul_10]
const say = (S, str) => fmt(S, str.replaceAll('{bed}', bed(S)).replaceAll('{boss', `{${boss(S)}`));

// allow: 이 계급부터 해도 된다 (0 이병 · 1 일병 · 2 상병 · 3 병장)
const TABOO = [
  { id: 'lie', allow: 2, src: 'era-culture ④-1 [S_cul_24]',
    body: '일과 끝, 저녁 점호까지 한 시간. 다리가 끊어질 것 같습니다. TV에선 축구를 하고, 상병들은 {bed}에 누워 있습니다. 내 자리가 바로 눈앞입니다.',
    keep: ['각 잡고 앉아 있는다', '허리가 끊어진다', '관물대에 등도 안 대고 한 시간을 앉아 있었습니다. 스코어는 기억나지 않고 허벅지 감각만 기억납니다.', { mind: -3, fit: -1 }],
    brk: ['슬쩍 눕는다', '편하다 · 보는 눈이 있다', '{bed}에 등을 대자 온몸이 녹았습니다. 아무도 뭐라 하지 않았습니다. 그게 더 무서웠지만, 오늘은 그냥 누워 있기로 했습니다.'],
    caught: '"야, 이병이 눕냐?" 생활관이 한순간에 조용해졌습니다.' },
  { id: 'px', allow: 2, src: 'era-culture ④-2 [S_cul_24]',
    body: '주말 오후, 냉동 만두가 미치도록 먹고 싶습니다. 그런데 이 부대에서 PX는 "상병부터"입니다. 그 밑은 선임 따라갈 때만 갑니다.',
    keep: ['참는다', '입이 쓰다', '만두 대신 건빵을 씹었습니다. 별사탕이 오늘따라 썼습니다.', { mind: -2 }],
    brk: ['혼자 다녀온다', '배부르다 · 보는 눈이 있다', '텅 빈 PX에서 만두를 데워 먹었습니다. 군 생활 중 가장 조용하고 완벽한 십 분이었습니다.'],
    caught: 'PX 문을 나서는데 계산대 줄에 {boss.name}이 서 있었습니다. 손에 든 만두를 숨길 데가 없었습니다.' },
  { id: 'cyber', allow: 1, src: 'era-culture ④-3 [S_cul_24][S_cul_11]', c: (S) => S.ym >= '2007-01',
    body: '사이버지식정보방에 빈자리가 두 개 보입니다. 집에 메일 한 통만 보내면 됩니다. 그런데 이등병이 사지방에 앉아 있는 걸 본 적이 없습니다.',
    keep: ['그냥 지나간다', '못 쓴 편지가 남는다', '빈자리를 지나쳐 생활관으로 돌아왔습니다. 보내려던 메일은 머릿속에서만 세 번 고쳐 썼습니다.', { mind: -2 }],
    brk: ['앉는다', '바깥과 이어진다 · 보는 눈이 있다', '삼십 분 동안 메일을 쓰고 뉴스를 봤습니다. 바깥 세상이 아직 그대로 있다는 게 이상하게 위로가 됐습니다.'],
    caught: '뒤에서 의자 다리를 툭 차는 소리가 났습니다. "여기 이병 자리 있냐?"' },
  { id: 'posture', allow: 1, src: 'era-culture ④-4 [S_cul_24]',
    body: '저녁 자유 시간. 다들 편하게 퍼져 있는데 이등병은 "각"을 잡아야 합니다. 허리 펴고, 손은 무릎에. 벌써 사십 분째입니다.',
    keep: ['끝까지 각을 잡는다', '자유 시간이 아니다', '각을 잡은 채 자유 시간이 끝났습니다. 자유라는 말은 내게 해당하지 않았습니다.', { mind: -3 }],
    brk: ['관물대에 등을 기댄다', '숨이 쉬어진다 · 보는 눈이 있다', '등을 기대자 그제야 숨이 쉬어졌습니다. 아무도 못 본 것 같았습니다.'],
    caught: '"많이 편하냐?" 등 뒤에서 {boss.name}의 목소리가 들렸습니다.' },
  { id: 'kkal', allow: 2, src: '가정 (깔깔이 계급 제한 — 출처 미확보, era-culture 은어표 [S_cul_42])', when: { season: 'winter' },
    body: '생활관이 춥습니다. 선임들은 다 깔깔이를 입고 있는데, 이 생활관에서 일병까지는 깔깔이를 "아직" 못 입습니다.',
    keep: ['떨면서 버틴다', '춥다', '이불 속에서 이를 덜덜 떨었습니다. 깔깔이는 관물대 맨 아래 칸에서 각 잡힌 채 겨울을 났습니다.', { mind: -2, fit: -2 }],
    brk: ['전투복 안에 몰래 껴입는다', '따뜻하다 · 보는 눈이 있다', '몸이 녹자 세상이 조금 너그러워 보였습니다. 소매 끝만 조심하면 됩니다.'],
    caught: '"너 그거 깔깔이냐? 벌써?" 소매 끝으로 초록 누빔이 삐져나와 있었습니다.' },
  { id: 'shower', allow: 2, src: 'era-culture ④ 해병대 증언 [S_cul_12]',
    body: '훈련 끝, 흙투성이입니다. 샤워장에 자리가 났는데, 이 생활관은 샤워도 짬 순서입니다. 상병들이 다 씻고 나와야 내 차례입니다.',
    keep: ['기다린다', '온수가 남을까', '내 차례가 왔을 때 온수가 끊겼습니다. 찬물로 삼 분 만에 씻고 나왔습니다.', { mind: -2, fit: -1 }],
    brk: ['먼저 들어간다', '뜨거운 물 · 보는 눈이 있다', '뜨거운 물이 머리 위로 쏟아졌습니다. 오 분 만에 씻고 나와 아무 일 없었다는 얼굴로 관물대를 정리했습니다.'],
    caught: '샤워장 문이 열리고 {boss.name}이 서 있었습니다. "벌써 씻냐? 짬이 몇인데."' },
];

// 걸리면 셋 중 하나 — 나만, 동기 전체(연대책임), 맞선임(교육 책임). 불문율이라 징계 기록은 남지 않는다
function caught(S, tb) {
  const head = say(S, tb.caught);
  const r = rand(S);
  if (r < 0.4 || !here(S, 'peer')) return { t: say(S, `${head} 그날 밤 내내 {boss}에게 "개념"이라는 단어를 들었습니다. 규정 어디에도 없는 규칙인데, 어긴 건 분명 나였습니다.`),
    fx: { mind: -8 }, rel: { [boss(S)]: -8 } };
  if (r < 0.75 || !here(S, 'senior') || boss(S) === 'senior') return { t: say(S, `${head} 그날 밤 동기 전체 집합. "동기가 저 모양인데 너네는 뭐 했냐." {peer.name}은 아무 말 안 했지만, 얼차려 내내 내 쪽을 보지 않았습니다.`),
    fx: { mind: -6, fit: -2 }, rel: { peer: -10, [boss(S)]: -5 }, mark: { set: { r_group: {} } } };
  return { t: say(S, `${head} 불려 간 건 {senior}이었습니다. "애 교육을 어떻게 시킨 거야." 그 화살은 그날 밤 고스란히 내게 돌아왔습니다.`),
    fx: { mind: -7 }, rel: { senior: -12 } };
}

const taboo = (tb) => ({
  id: `r_${tb.id}`, kind: 'decision', src: tb.src, max: 1, w: 3, gap: 2,
  when: { phase: ['serve'], ...tb.when },
  p: (S) => ab(S, 0.02, 0.35),
  c: (S) => S.rank < tb.allow && !!boss(S) && (!tb.c || tb.c(S)),
  build: (S) => ({
    title: '짬이 안 되는 일',
    body: say(S, tb.body),
    choices: [{ k: 'keep', label: tb.keep[0], hint: tb.keep[1] }, { k: 'break', label: tb.brk[0], hint: tb.brk[1] }],
  }),
  apply: (S, k) => {
    S.marks.r_seen ??= { ym: S.ym };
    if (k === 'keep') return { t: say(S, tb.keep[2]), fx: tb.keep[3] };
    if (rand(S) < ab(S, 0.15, 0.9)) return caught(S, tb);
    return { t: say(S, tb.brk[2]), fx: { mind: 5 } };
  },
});

// ═══ 역부조리 — 신고 창구가 넓어진 뒤(2014-08 병영문화혁신 이후), 이번엔 위가 아래 눈치를 본다 ═══
// 근거: 헬프콜 신고·상담 2014 17,258 → 2020 58,378건, 입건 증가를 "신고 문화 확대"로 해석 [S_era_6];
// 후임들의 과장된 마음의 편지 신고 → 조사 → 혐의없음 사례 (로톡, research 미수록 · 1건 후기급); 리모컨 독점으로 마음의 편지 [S_cul_53];
// 몰래 폰 반입 — 눈감으면 연대책임 [S_cul_73]. 빈도는 부조리가 낮을수록(=신고가 쉬울수록) 높다. 확률·효과는 '가정'.
const rev = (S, lo, hi) => lo + ((hi - lo) * (100 - S.env.abuse)) / 100;
const modern = (S) => S.ym >= '2014-08';
// 지적했다가 마음의 편지에 이름이 오를 확률 — 휴대폰 시대엔 제보 창구가 하나 더 있다
const letterRisk = (S) => rev(S, 0.08, 0.35) * (phoneOn(S) ? 1.3 : 1);
function letterOnMe(S, why) {
  const t = `분기 마음의 편지에 내 이름이 적혀 있었습니다. "${why}" 중대장 면담, 진술서, 대대 감찰. `;
  if (rand(S) < 0.2) return { t: fmt(S, t + '말투가 "모욕적 언행"으로 인정됐습니다. 견책. 내가 이병 때 들은 말에 비하면 아무것도 아니었는데, 그건 진술서에 쓸 칸이 없었습니다.'),
    fx: { mind: -12 }, rel: { junior: -10 }, punish: { kind: 'reprimand' }, mark: { set: { r_letter_me: {} } } };
  return { t: fmt(S, t + '두 달 뒤 혐의없음으로 끝났습니다. 그 두 달 동안 나는 "조사받는 병장"이었고, 생활관에서 아무에게도 아무 말도 하지 않았습니다.'),
    fx: { mind: -10 }, rel: { junior: -6 }, mark: { set: { r_letter_me: {} } } };
}
const R = (e) => ({ src: '가정', max: 1, w: 3, ...e, when: { phase: ['serve'], ...e.when } });
const senior = (S) => S.rank >= 2 && modern(S) && here(S, 'junior') && !!S.marks.junior_in;

const REVERSE = [
  R({ id: 'r_rev_order', kind: 'decision', src: '역부조리 [S_era_6] · 로톡 과장 신고 사례 · 가정', gap: 3,
    p: (S) => rev(S, 0.04, 0.35), c: senior,
    build: (S) => ({
      title: '시켜야 하는데',
      body: fmt(S, '내일 대대 점검인데 화장실 청소 상태가 엉망입니다. 담당은 {junior.name}입니다. 행보관은 "상병이 애들 관리 안 하냐"고 할 테고, {junior.name}은 요즘 표정이 안 좋습니다. 분기 마음의 편지 걷는 날이 다음 주입니다.'),
      choices: [
        { k: 'say', label: '똑바로 지적한다', hint: '청소는 된다 · 편지에 오를 수 있다' },
        { k: 'ask', label: '부탁하듯 말한다', hint: '"혹시 다시 해 줄 수 있어?" · 동기들이 비웃는다' },
        { k: 'self', label: '내가 한다', hint: '조용하다 · 상병이 걸레를 든다' },
      ] }),
    apply: (S, k) => {
      if (k === 'say') return rand(S) < letterRisk(S) ? letterOnMe(S, '선임이 고압적으로 청소를 다시 시켰습니다.')
        : { t: fmt(S, '"다시 해." 딱 그 한마디였습니다. {junior.name}은 대답 없이 걸레를 들었습니다. 그날 밤 나는 그 한마디를 몇 번이나 다시 떠올렸습니다. 혹시 말투가 셌나.'), fx: { mind: -3 }, rel: { junior: -4 } };
      if (k === 'ask') return { t: fmt(S, '"혹시… 한 번만 더 봐 줄 수 있을까?" {junior.name}은 고개를 끄덕였습니다. 옆에서 {peer.name}이 "너 지금 후임한테 결재 올리냐"며 웃었습니다. 청소는 반만 됐습니다.'), fx: { mind: -3 }, rel: { junior: 3, peer: -4, sfc: -3 } };
      return { t: '밤 열 시, 상병이 화장실 타일을 닦고 있습니다. 지나가던 당직사관이 "네가 왜 그걸 하냐"고 물었고, 나는 대답할 말이 없었습니다.', fx: { fit: -2, mind: -5 } };
    } }),

  R({ id: 'r_rev_call', kind: 'event', p: (S) => rev(S, 0.03, 0.35), c: senior,
    run: (S) => ({ t: fmt(S, '"야, {junior.name}." 부르고 나서 혀가 굳었습니다. 지난주 교육에서 "야"도 폭언 사례로 나왔습니다. "…{junior.name}아, 잠깐 와 볼래?" 내가 이병 때 들은 말을 지금 쓰면, 나는 전역을 못 합니다.'), fx: { mind: -3 } }) }),

  R({ id: 'r_rev_week', kind: 'event', p: (S) => rev(S, 0.03, 0.3), c: (S) => S.rank >= 2 && modern(S),
    run: () => ({ t: '마음의 편지 걷기 사흘 전. 상병·병장들이 갑자기 친절해졌습니다. PX에서 냉동 만두가 돌고, "요즘 힘든 거 없냐"는 말이 생활관을 떠다닙니다. 나도 만두를 샀습니다. 내 돈으로 산 보험이었습니다.', fx: { mind: -2 } }) }),

  R({ id: 'r_rev_phone', kind: 'decision', src: '몰래 폰 반입 [S_cul_73] · 가정', p: (S) => rev(S, 0.03, 0.3),
    c: (S) => senior(S) && phoneOn(S),
    build: (S) => ({
      title: '반납 안 한 폰',
      body: fmt(S, '점호 뒤, {junior.name}의 이불 속에서 화면 불빛이 새어 나옵니다. 휴대폰을 반납하지 않았습니다. 걸리면 생활관 전체가 사용 정지고, 내가 말하면 나는 "꼰대 선임"입니다.'),
      choices: [
        { k: 'tell', label: '당직에게 보고한다', hint: '규정대로 · 후임과는 끝' },
        { k: 'talk', label: '조용히 불러 말한다', hint: '사람 대 사람 · 편지에 오를 수 있다' },
        { k: 'skip', label: '못 본 척한다', hint: '평화 · 걸리면 다 같이' },
      ] }),
    apply: (S, k) => {
      if (k === 'tell') return { t: fmt(S, '{junior.name}은 군기교육대에 갔다 왔습니다. 돌아온 날부터 나와 눈을 마주치지 않았습니다. 규정은 내 편이었고, 생활관은 아니었습니다.'), fx: { mind: -5 }, rel: { junior: -20, sfc: 4 } };
      if (k === 'talk') return rand(S) < letterRisk(S) ? letterOnMe(S, '선임이 개인 휴대폰 사용을 이유로 따로 불러 압박했습니다.')
        : { t: fmt(S, '복도 끝에서 "내일부턴 내자" 한마디만 했습니다. {junior.name}은 "네"라고 했습니다. 다음 날 폰은 반납함에 있었고, 우리 사이는 조금 어색해졌습니다.'), fx: { mind: -2 }, rel: { junior: -3 } };
      return rand(S) < rev(S, 0.2, 0.5)
        ? { t: '불시 점검에 걸렸습니다. 생활관 전체 휴대폰 사용 2주 정지. "선임들은 뭐 했냐"는 말에 나는 고개를 숙였습니다. 아무도 내게 고맙다고 하지 않았습니다.', fx: { mind: -8 }, rel: { peer: -6, sfc: -6 }, mark: { set: { r_group: {} } } }
        : { t: '못 본 척했습니다. 아무 일도 없었습니다. 그런데 매일 밤 그 이불 속 불빛이 신경 쓰였습니다.', fx: { mind: -3 } };
    } }),

  // 낀 세대 — 아래에선 짬 규칙을 다 지켰는데, 위에 올라오니 시대가 바뀌었다
  R({ id: 'r_rev_sandwich', kind: 'event', w: 6, p: 0.4,
    c: (S) => S.rank >= 2 && modern(S) && !!S.marks.r_seen && here(S, 'junior'),
    run: (S) => ({ t: fmt(S, '이병 땐 {bed}에 등 한번 못 댔습니다. 상병이 되니 {junior.name}이 대낮에 누워 있습니다. 뭐라고 하려다 입을 다물었습니다. 그게 맞는 거라는 걸 압니다. 그래도 내 짬은 어디로 환불받아야 하는지 모르겠습니다.'.replaceAll('{bed}', bed(S))), fx: { mind: -4 } }) }),
];

export const RANK_EVENTS = [
  ...TABOO.map(taboo),

  // 연대책임 — 이번엔 동기가 어겼다. 누가 대가를 치를지 내가 정한다
  { id: 'r_whodid', kind: 'decision', src: 'era-culture ② 집합·단체기합 [S_cul_5] · 가정', max: 1, w: 3,
    when: { phase: ['serve'] },
    p: (S) => ab(S, 0.01, 0.3),
    c: (S) => S.rank <= 1 && here(S, 'peer') && !!boss(S),
    build: (S) => ({
      title: '누가 그랬냐',
      body: say(S, '{peer.name}이 점호 전에 {bed}에 누워 있다 걸렸습니다. 그날 밤 동기 전체 집합. 엎드려뻗쳐 삼십 분째, {boss}이 묻습니다. "누가 먼저 누웠는지 말하면 나머지는 들어간다."'),
      choices: [
        { k: 'tell', label: '{peer.name}이라고 말한다', hint: '나머지는 들어간다 · 동기를 판다' },
        { k: 'silent', label: '입을 다문다', hint: '다 같이 구른다' },
        { k: 'self', label: '내가 그랬다고 한다', hint: '동기들은 산다 · 내가 표적이 된다' },
      ].map((c) => ({ ...c, label: fmt(S, c.label) })),
    }),
    apply: (S, k) => {
      if (k === 'tell') return { t: say(S, '"{peer.name}입니다." 나머지는 생활관으로 들어갔습니다. 연병장엔 {peer.name} 혼자 남았습니다. 그날 이후 {peer.name}은 나를 이름 대신 "야"라고 불렀습니다.'),
        fx: { mind: -5 }, rel: { peer: -20, [boss(S)]: 5 } };
      if (k === 'silent') return { t: say(S, '아무도 입을 열지 않았습니다. 얼차려는 한 시간을 채우고 끝났습니다. 생활관으로 돌아오는 길에 {peer.name}이 내 등을 한 번 쳤습니다.'),
        fx: { fit: -3, mind: -6 }, rel: { peer: 8, [boss(S)]: -4 }, mark: { set: { r_group: {} } } };
      return { t: say(S, '"제가 먼저 누웠습니다." {boss}의 눈이 나에게 꽂혔습니다. 동기들은 들어가고 나는 남았습니다. 그 뒤로 한 달, 생활관의 모든 잔소리는 내 이름으로 시작했습니다.'),
        fx: { mind: -9 }, rel: { peer: 18, [boss(S)]: -12 }, mark: { set: { r_scapegoat: {} } } };
    } },

  // 짬이 찬 날 — 지키던(또는 어기던) 규칙이 내 것이 된다
  { id: 'r_payoff', kind: 'event', src: '가정', max: 1, w: 8, p: 0.5,
    when: { phase: ['serve'] },
    c: (S) => S.rank >= 2 && !!S.marks.r_seen && S.env.abuse >= 20,
    run: (S) => ({ t: say(S, '짬이 차고 처음으로 대낮에 {bed}에 누워 TV를 봤습니다. 천장이 이렇게 생긴 줄 몰랐습니다. 그런데 문 옆에 각 잡고 앉은 막내가 자꾸 눈에 걸렸습니다.'),
      fx: { mind: 6 } }) },

  ...REVERSE,
];
