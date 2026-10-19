// events-people.js — 이름 있는 사람들의 생애 주기 (docs/05 G3·G4)
// 왕고가 전역하고, 맞후임이 들어오고, 맞선임이 나가면 내가 왕고가 된다. 관계치(p.rel)가 결과를 가른다.
// 핵심 줄기: 당하던 쪽이 물려주는 쪽이 되는 순간 — "너 때는 안 그랬냐?"
// 확률·효과는 전부 '가정'.
import { rand, here, leaveYm, phoneOn } from '../src/engine.js';
import { fmt } from '../src/text.js';

const roll = (S, p) => rand(S) < p;
const who = (S, role) => S.env.people.find((p) => p.role === role);
const rel = (S, role) => who(S, role)?.rel ?? 50;
// env.json abuse.temper와 같은 값 — 생활관을 쥔 사람이 바뀌면 부조리 지수도 바뀐다
const TEMPER_ABUSE = { scary: 10, showoff: 8, awkward: 5, sly: 5 };

const P = (e) => ({ src: '가정', ...e, when: { phase: ['serve'], ...e.when } });

export const PEOPLE_EVENTS = [
  // ── 생애 주기 (must: 그 달에 반드시) ──
  P({ id: 'p_junior_in', kind: 'event', must: true,
    c: (S) => here(S, 'junior') && !S.marks.junior_in,
    run: (S) => ({
      t: fmt(S, '{junior}이 전입 왔습니다. 관물대 정리하는 손이 덜덜 떨리는 게, 딱 몇 달 전 내 모습이었습니다.'),
      mark: { set: { junior_in: {} } }, fx: { mind: 3 } }) }),

  P({ id: 'p_roomsenior_out', kind: 'event', must: true,
    c: (S) => !S.marks.rs_out && leaveYm(S, 'roomSenior') === S.ym && !!who(S, 'roomSenior')?.next,
    run: (S) => {
      const old = who(S, 'roomSenior');
      const r = old.rel;
      const bye = r >= 65 ? fmt(S, '전역 전날 밤, {roomSenior}이 PX 앞으로 불러냈습니다. "너는 잘할 거다." 냉동 만두 하나랑 연락처를 받았습니다.')
        : r <= 35 ? fmt(S, '{roomSenior}이 전역했습니다. 위병소를 나서는 뒷모습을 보며 생활관 전체가 소리 없이 숨을 내쉬었습니다.')
          : fmt(S, '{roomSenior}이 전역했습니다. "고생해라" 한마디가 끝이었습니다.');
      // 자리 교체: 옛 왕고는 '전 생활관 선임'으로 남고, 다음 고참이 생활관을 쥔다
      S.env.people.push({ ...old, role: 'exRoomSenior', gone: true, next: undefined });
      Object.assign(old, old.next, { next: undefined });
      S.env.abuse = Math.max(0, Math.min(100, S.env.abuse - (TEMPER_ABUSE[S.env.people.at(-1).temper] ?? 0) + (TEMPER_ABUSE[old.temper] ?? 0)));
      return { t: `${bye} ${fmt(S, '이제 생활관은 {roomSenior.name} 차지입니다. 다들 {roomSenior.name}의 눈치를 새로 배우기 시작했습니다.')}`,
        fx: { mind: r <= 35 ? 8 : r >= 65 ? -2 : 2 }, mark: { set: { rs_out: {} } } };
    } }),

  P({ id: 'p_senior_out', kind: 'event', must: true,
    c: (S) => !S.marks.wanggo && leaveYm(S, 'senior') === S.ym,
    run: (S) => {
      const p = who(S, 'senior');
      p.gone = true;
      const r = p.rel;
      const t = r >= 65 ? fmt(S, '{senior}이 전역했습니다. 마지막 점호 때 "이제 네가 왕고다, 애들 잘 챙겨"라며 어깨를 두드렸습니다.')
        : r <= 35 ? fmt(S, '{senior}이 전역했습니다. 끝까지 한마디도 안 하고 나갔습니다. 이제 위에 아무도 없습니다.')
          : fmt(S, '{senior}이 전역했습니다. 생활관 맨 안쪽 자리가 내 자리가 됐습니다.');
      return { t, fx: { mind: 5 }, mark: { set: { wanggo: {} } } };
    } }),

  // ── 관계치가 돌아오는 순간 ──
  P({ id: 'p_senior_cover', kind: 'event', gap: 6, w: 3,
    c: (S) => here(S, 'senior') && rel(S, 'senior') >= 62,
    run: (S) => ({ t: fmt(S, '작업하다 공구를 잃어버렸습니다. 행보관이 범인을 찾는데 {senior.name}이 "제가 챙긴다는 걸 깜빡했습니다" 하고 먼저 나섰습니다. 나중에 PX에서 갚으라고 했습니다.'),
      fx: { mind: 6 }, rel: { senior: 5 } }) }),

  P({ id: 'p_senior_grudge', kind: 'event', gap: 4, w: 3,
    c: (S) => here(S, 'senior') && rel(S, 'senior') <= 32 && S.rank <= 2,
    run: (S) => ({ t: fmt(S, '{senior.name}이 나만 보면 일을 만듭니다. 오늘은 다 끝난 걸레질을 "다시"라는 한마디로 처음부터 하게 했습니다.'),
      fx: { mind: -8 }, rel: { senior: -3 } }) }),

  P({ id: 'p_sfc_pick', kind: 'event', gap: 8, w: 2,
    c: (S) => rel(S, 'sfc') >= 70 && S.rank >= 1,
    run: (S) => {
      S.leave.left += 2;
      S.rewards.push({ ym: S.ym, kind: 'sfc', days: 2 });
      return { t: fmt(S, '{sfc}이 "쟤는 시키면 군말이 없어"라며 대대 작업에 나를 콕 집었습니다. 끝나고 포상휴가 2일이 떨어졌습니다.'), fx: { fit: -3, mind: 4 } };
    } }),

  // ── 딜레마: 물려줄 것인가 ──
  P({ id: 'p_pass_down', kind: 'decision', max: 1, w: 6, p: 0.3,
    c: (S) => here(S, 'junior') && S.marks.junior_in && S.rank >= 1 && S.env.abuse >= 25 && (here(S, 'roomSenior') || here(S, 'senior')),
    build: (S) => {
      const boss = here(S, 'roomSenior') ? 'roomSenior' : 'senior';
      return {
        title: '너 때는 안 그랬냐?',
        body: fmt(S, `{${boss}}이 침상 끝에 걸터앉아 말합니다. "{junior.name}이 요즘 너무 풀렸다. 네가 맞선임이니까 군기 좀 잡아라. 너 때는 안 그랬냐?" 생활관이 조용해졌습니다.`),
        choices: [
          { k: 'do', label: '시키는 대로 갈군다', hint: '선임은 만족 · 후임이 나를 본다' },
          { k: 'shield', label: '"제가 알아서 하겠습니다"하고 감싼다', hint: '후임은 고마워한다 · 선임 눈 밖에 난다' },
          { k: 'fake', label: '선임 앞에서만 시늉한다', hint: '둘 다 반쯤 실망한다' },
        ],
      };
    },
    apply: (S, k) => {
      const boss = here(S, 'roomSenior') ? 'roomSenior' : 'senior';
      if (k === 'do') return { t: fmt(S, '점호 끝나고 {junior.name}을 세워 놓고 목소리를 높였습니다. 몇 달 전 내가 들었던 말이 내 입에서 그대로 나왔습니다.'),
        fx: { mind: -4 }, rel: { junior: -25, [boss]: 10 }, mark: { set: { passed_down: {} } }, later: { inMonths: 2, id: 'p_letter_back' } };
      if (k === 'shield') {
        const hot = roll(S, S.env.abuse / 100);
        return { t: fmt(S, hot ? '"알아서 한다"는 말이 건방지게 들렸나 봅니다. 그날 밤 {junior.name}과 나란히 집합당했습니다. 화장실에서 {junior.name}이 "죄송합니다"라고 작게 말했습니다.'
          : '{junior.name}을 감쌌습니다. {' + boss + '.name}은 혀를 찼지만 더 말하지 않았습니다.'),
        fx: { mind: hot ? -10 : -2 }, rel: { junior: 25, [boss]: -18 }, mark: { set: { shielded: {} } } };
      }
      return { t: fmt(S, '선임 앞에서만 큰소리를 냈습니다. {junior.name}은 진짜인지 아닌지 헷갈리는 눈치였고, 선임은 "그게 다냐"고 했습니다.'),
        fx: { mind: -5 }, rel: { junior: -8, [boss]: -5 } };
    } }),

  // 물려준 대가 — 휴대폰이 있는 시대일수록 신고가 쉽다 (가정)
  P({ id: 'p_letter_back', kind: 'event', src: '마음의 편지 (research/discipline-events.md §1)', c: () => false, // 지연 결과로만
    run: (S) => {
      if (roll(S, phoneOn(S) ? 0.45 : 0.15)) return { t: fmt(S, '분기 마음의 편지에 내 이름이 적혀 있었습니다. 쓴 사람은 말하지 않아도 알 것 같았습니다. 중대장 면담 끝에 징계위원회가 열렸습니다.'),
        fx: { mind: -12 }, rel: { junior: -10 }, punish: { kind: phoneOn(S) ? 'leaveCut' : 'reprimand', n: 4 } };
      return { t: fmt(S, '{junior.name}은 그 뒤로 내 앞에서 웃지 않았습니다. 아무 일도 없었지만, 아무 일도 없던 게 아니었습니다.'), fx: { mind: -3 } };
    } }),

  P({ id: 'p_junior_thanks', kind: 'event', gap: 0, max: 1,
    needs: 'shielded', c: (S) => S.monthsLeft != null && S.monthsLeft <= 1 && !S.flags.n_p_junior_thanks,
    run: (S) => ({ t: fmt(S, '전역 날 아침, {junior.name}이 위병소까지 따라 나왔습니다. "그때 감사했습니다." 무슨 일인지 바로 알았습니다.'),
      fx: { mind: 10 }, rel: { junior: 10 } }) }),

  // ── 딜레마: 동기 ──
  P({ id: 'p_peer_doze', kind: 'decision', max: 1, w: 4, p: 0.08,
    c: (S) => here(S, 'peer') && S.rank <= 2,
    build: (S) => ({
      title: '불침번, 졸고 있던 동기',
      body: fmt(S, '같이 불침번을 선 {peer.name}이 벽에 기대 졸다가 순찰 돌던 당직사관에게 걸렸습니다. 당직사관이 손전등을 내 얼굴로 돌립니다. "너는 뭐 했냐?"'),
      choices: [
        { k: 'share', label: '"저도 졸았습니다"', hint: '동기와 같이 맞는다' },
        { k: 'blind', label: '"못 봤습니다"', hint: '거짓말 · 들키면 더 크다' },
        { k: 'truth', label: '사실대로 말한다', hint: '나는 산다 · 동기는…' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'share') return { t: fmt(S, '둘이 나란히 군장을 멨습니다. 연병장을 돌며 {peer.name}이 "미안하다, 진짜"를 열 번쯤 했습니다.'),
        fx: { fit: -4, mind: -4 }, rel: { peer: 25 }, punish: { kind: 'leaveCut', n: 2 }, mark: { set: { peer_oath: {} } } };
      if (k === 'blind') return roll(S, 0.4)
        ? { t: '거짓말은 CCTV 앞에서 오래 못 갔습니다. 동기를 감싸려다 둘 다 더 크게 혼났습니다.', fx: { mind: -8 }, rel: { peer: 12 }, punish: { kind: 'leaveCut', n: 3 } }
        : { t: fmt(S, '당직사관은 고개를 갸웃했지만 넘어갔습니다. {peer.name}은 견책, 나는 무사했습니다.'), fx: { mind: -2 }, rel: { peer: 8 } };
      return { t: fmt(S, '사실대로 말했습니다. {peer.name}은 휴가가 잘렸고, 한동안 나와 밥을 따로 먹었습니다.'), fx: { mind: -3 }, rel: { peer: -30, sfc: 5 } };
    } }),

  P({ id: 'p_peer_payback', kind: 'event', gap: 0, w: 4, needs: 'peer_oath',
    c: (S) => here(S, 'peer') && S.rank >= 2 && !S.flags.n_p_peer_payback,
    run: (S) => ({ t: fmt(S, '말년 휴가 일정을 짜는데 {peer.name}이 자기 휴가를 하루 미뤄서 내 날짜를 맞춰 줬습니다. "불침번 빚이다."'),
      fx: { mind: 8 }, rel: { peer: 5 } }) }),
];

// ── 되부르기: 사람의 생애 주기 순간에 앞선 흔적을 불러온다 (echoes.js와 같은 형식, events.js가 붙인다) ──
const F = (txt) => (S) => fmt(S, txt);
export const PEOPLE_ECHOES = {
  p_junior_in: [
    { needs: 'boot_squad_leader', add: '훈련소 분대장 하던 버릇이 나와서, 관물대 각 잡는 법부터 같이 잡아 줬습니다.' },
    { needs: 'gas_fled', add: '훈련소 가스실에서 뛰쳐나가던 내가 이제 누군가의 선임이라는 게 조금 웃겼습니다.' },
    { needs: 'march_dropout', add: '행군에서 낙오했던 얘기는 당분간 하지 않기로 했습니다.' },
    { needs: 'grad_alone', add: '수료식에 아무도 안 왔던 날이 생각나서, 첫 주말 PX는 내가 데려갔습니다.' },
    { needs: 'rifle_poor', add: '사격 얘기가 나오면 화제를 돌리기로 마음먹었습니다.' },
  ],
  p_roomsenior_out: [
    { needs: 'passed_down', add: '그가 시켜서 후임을 세웠던 밤이 떠올랐습니다. 이제 시킬 사람도, 핑계도 없었습니다.' },
    { needs: 'shielded', add: F('후임을 감쌌다고 나를 세웠던 사람이 위병소를 나갔습니다. {junior.name}이 내 옆에서 같이 그 뒷모습을 봤습니다.') },
    { needs: 'fought', add: '반합이 날아가던 그날 이후, 그는 끝까지 내 눈을 피했습니다.' },
    { needs: 'covid', add: '휴가가 다 막혔던 그 계절을 한 생활관에서 같이 버틴 사람이기도 했습니다.' },
  ],
  p_senior_out: [
    { needs: 'peer_oath', add: F('{peer.name}이 옆에서 "불침번 때 생각나냐"고 물었습니다. 같이 군장 메던 밤이 벌써 옛날이었습니다.') },
    { needs: 'hero', add: '지하철 사건 이후 나를 "영웅"이라고 부르며 놀리던 사람이었습니다. 마지막 인사도 "잘 있어라, 영웅"이었습니다.' },
    { needs: 'march_strong', add: '훈련소 행군 완주한 다리로 이제 생활관 맨 안쪽까지 걸어 들어갔습니다.' },
    { needs: 'cat', add: '탄약고 고양이 "말년"의 생선 당번도 그와 함께 내 차지가 됐습니다.' },
  ],
};
