// events-spiral.js — 내리막: 애써도 무너지는 군 생활 → 관심병사 → 그린캠프
// 몇몇 판은 처음부터 맞지 않는다(부적응 성향, 판마다 숨은 추첨). 큰 이슈로 멘탈이 바닥을 쳐도 같은 길에 들어선다.
// 내리막에 들어서면 매달 멘탈이 빠지고(engine applyMonthly: S.flags.spiral), 버티려는 노력은 잠깐만 듣는다.
// 끝은 그린캠프(군단·사단의 복무 부적응 병사 집단 치유 과정, 약 3주) → 원대 복귀 또는 현역복무 부적합 심사.
// 근거: 그린캠프 = 부적응 병사 집단 심리사회 치료 [koreascience JAKO201025247234263], 3주 9회기 프로그램 사례 [earticle A175611],
// "자살 우려자 수용소에서 치유 중심으로" (2014 육군 관계자) [세계일보 2014-08-12]. 도입 연도는 미확인 → 2010(논문 확인 시점) 이전엔 국군병원 정신건강의학과로.
// 자극적 묘사 금지, 결정마다 도움 창구(HELP). 확률·효과는 전부 '가정'.
import { rand, here } from '../src/engine.js';
import { makeRng } from '../src/rng.js';
import { monthsBetweenYm } from '../src/date.js';
import { fmt } from '../src/text.js';
import { HELP } from './events.js';

const roll = (S, p) => rand(S) < p;
// 부적응 성향: 3~12% (부조리가 심한 부대일수록) — 판이 시작될 때 정해진다
const fragile = (S) => (S.flags.fragile ??= makeRng(S.seed ^ 0x6772656e)() < 0.03 + S.env.abuse / 1100);
const camp = (S) => (S.ym >= '2010-01' ? '그린캠프' : '국군병원 정신건강의학과');
const inSpiral = (S) => (S.flags.spiral ?? 0) > 0;

export const SPIRAL_EVENTS = [
  // ── 들어서는 순간 ──
  { id: 's_onset', kind: 'event', src: '가정', must: true, when: { phase: ['serve'] },
    c: (S) => !S.flags.spiralSeen && (S.st.mind < 11 || (fragile(S) && roll(S, 0.12))), // 부적응 성향이면 평균 8개월쯤 지나 시작
    run: (S) => {
      S.flags.spiral = 2;
      S.flags.spiralSeen = S.ym;
      return { t: '언제부터인지 잠이 오지 않았습니다. 기상나팔이 울리기 한 시간 전에 눈이 떠졌고, 그때부터 하루가 너무 길었습니다. 아무도 눈치채지 못했습니다. 나도 아직은 괜찮다고 생각했습니다.', fx: { mind: -6 } };
    } },

  // ── 내려가는 동안의 장면들 (멘탈이 매달 빠지는 걸 보여 준다) ──
  ...[
    '밥이 모래 같았습니다. 식판을 절반 남기고 일어나는 날이 늘었고, 취사병이 "어디 아프냐"고 물었습니다.',
    '점호 때 내 이름이 불렸는데 대답을 못 했습니다. 두 번째에야 "네"가 나왔습니다. 당직사관이 나를 한참 봤습니다.',
    '집에 편지를 쓰다 말았습니다. "잘 지내고 있습니다" 다음 줄이 써지지 않았습니다.',
    '근무 중 초소 밖 어둠을 오래 봤습니다. 아무 생각도 안 났고, 그게 무서웠습니다.',
    '동기들이 웃는 소리가 멀게 들렸습니다. 같은 생활관인데 나만 유리벽 너머에 있는 것 같았습니다.',
  ].map((t, i) => ({ id: `s_sign${i}`, kind: 'event', src: '가정', max: 1, w: 6, p: 0.6, when: { phase: ['serve'] },
    c: inSpiral, run: () => ({ t, fx: { mind: -3 } }) })),

  // ── 버텨 보려는 노력 — 잠깐은 듣는다. 내리막 자체는 멈추지 않는다 ──
  { id: 's_try', kind: 'decision', src: '가정', max: 3, gap: 2, w: 8, p: 0.7, when: { phase: ['serve'] },
    c: inSpiral,
    build: (S) => ({
      title: '버텨 보려고',
      body: '이대로는 안 된다는 건 압니다. 뭐라도 해 보기로 했습니다.',
      help: HELP,
      choices: [
        { k: 'run', label: '새벽에 혼자 뛴다', hint: '머리가 잠깐 맑아진다 · 몸이 깎인다' },
        { k: 'talk', label: fmt(S, '{peer.name}에게 털어놓는다'), hint: '덜 외롭다 · 말이 돌 수 있다' },
        { k: 'work', label: '일에 파묻힌다', hint: '생각할 틈이 없다 · 더 지친다' },
        { k: 'counsel', label: '상담관을 찾아간다', hint: '도움을 받는다 · 관심병사가 된다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'run') return { t: '새벽 연병장을 열 바퀴 돌았습니다. 뛰는 동안은 괜찮았습니다. 샤워를 마치자 그 무게가 그대로 돌아와 있었습니다.', fx: { mind: 5, fit: -3 } };
      if (k === 'talk') return roll(S, 0.35)
        ? { t: fmt(S, '{peer.name}은 끝까지 들어 줬습니다. 그런데 사흘 뒤, 옆 생활관 상병이 "요즘 힘들다며?"라고 물었습니다. 그 뒤로는 아무에게도 말하지 않았습니다.'), fx: { mind: -4 }, rel: { peer: -6 } }
        : { t: fmt(S, '{peer.name}은 아무 말 없이 끝까지 들어 줬습니다. 해결된 건 없었지만, 그날 밤은 조금 잤습니다.'), fx: { mind: 6 }, rel: { peer: 8 } };
      if (k === 'work') return { t: '남들이 피하는 작업마다 손을 들었습니다. 행보관은 "요즘 쟤 왜 저래, 좋네"라고 했습니다. 생각할 틈이 없었고, 밤이 되면 생각만 남았습니다.', fx: { mind: 2, fit: -5 }, rel: { sfc: 6 } };
      S.flags.spiral = 1; // 상담은 내리막을 늦춘다 — 멈추진 못한다
      return { t: '상담관 앞에서 처음으로 "힘들다"는 말을 소리 내어 했습니다. 그날부터 나는 관심병사였습니다. 근무표에서 내 이름이 빠졌고, 다들 그 이유를 알았습니다.', fx: { mind: 8 }, rel: { peer: -5, roomSenior: -5 }, mark: { set: { s_counsel: {} } } };
    } },

  // ── 바닥: 그린캠프 ──
  { id: 's_camp', kind: 'decision', src: '그린캠프 [koreascience JAKO201025247234263][earticle A175611] · 가정', must: true, when: { phase: ['serve'] },
    c: (S) => inSpiral(S) && monthsBetweenYm(S.flags.spiralSeen, S.ym) >= 3 && (S.st.mind < 10 || (S.marks.s_counsel && S.st.mind < 18)),
    build: (S) => ({
      title: camp(S),
      body: S.ym >= '2010-01'
        ? '중대장이 불렀습니다. "군단에서 3주짜리 과정이 있다. 그린캠프라고." 다들 그게 어떤 곳인지 압니다. 짐을 싸는 동안 생활관이 조용했습니다.'
        : '중대장이 불렀습니다. 국군병원 정신건강의학과에 자리가 났다고 했습니다. 짐을 싸는 동안 생활관이 조용했습니다.',
      help: HELP,
      choices: [
        { k: 'return', label: '치료를 마치고 부대로 돌아간다', hint: '다시 해 본다 · "거기 다녀온 애"가 된다' },
        { k: 'review', label: '현역복무 부적합 심사를 받는다', hint: '여기서 멈춘다' },
      ],
    }),
    apply: (S, k) => {
      const where = camp(S);
      if (k === 'return') {
        S.flags.spiral = roll(S, 0.4) ? 1 : 0; // 돌아와도 다 낫진 않는다
        return { t: fmt(S, `${where}에서 3주를 보냈습니다. 매일 같은 시간에 자고, 같은 사람들 앞에서 조금씩 말했습니다. 돌아온 날 {peer.name}이 아무 일 없었다는 듯 "왔냐" 했고, 그 한마디가 고마웠습니다. 다른 생활관에선 나를 "거기 다녀온 애"라고 불렀습니다.`),
          fx: { mind: 18 }, rel: { peer: 4, roomSenior: -8 }, mark: { set: { s_camp: {} } } };
      }
      if (roll(S, 0.5)) return { t: `${where} 과정이 끝나고 심사가 열렸습니다. 현역복무 부적합. 위병소를 나서며 뒤를 한 번도 돌아보지 않았습니다. 실패라고 생각했는데, 집에 가는 버스에서 몇 달 만에 깊이 잠들었습니다.`, ending: 'unfit' };
      S.flags.spiral = 1;
      return { t: `심사 결과는 "계속 복무"였습니다. 부대를 옮겨 다시 시작합니다. 새 생활관 사람들은 아무것도 몰랐고, 그게 이상하게 숨이 쉬어졌습니다.`, fx: { mind: 8 }, rel: { senior: -20, roomSenior: -20 } };
    } },
];
