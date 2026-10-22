// events-rel.js — 누구와 생긴 일인가: 후임·선임·동기·간부·가족·연인·외부인 사건 (docs/06, research/relationship-events.md)
// id 규칙: rel_<상대>_<장소>_<이름>. 상대(junior·senior·peer·nco·officer·family·lover·civ)는 장면이 내 옆에 세울 사람,
// 장소는 src/scene.js 장면 키다. 시대(when.era)는 rules/era.json — 같은 신고라도 e01에서 e05로 갈수록 값이 싸진다 (research §8-2).
// 결정은 모든 선택지가 무언가를 잃는다 (docs/05 G4). 선택지의 rel: {상대: ±1~2}는 결정 시트의 관계 방향 표시용. 확률·수치는 전부 '가정'.
import { rand, here, phoneOn, where } from '../src/engine.js';
import { shiftMonth } from '../src/date.js';
import { fmt } from '../src/text.js';

const roll = (S, p) => rand(S) < p;
const who = (S, role) => S.env.people.find((p) => p.role === role);
const era = (S) => S.era?.id ?? 'e05';
/** 시대별 값 [e01, e02, e03, e04, e05] */
const byEra = (S, a) => a[{ e01: 0, e02: 1, e03: 2, e04: 3, e05: 4 }[era(S)] ?? 4];
const room = (S) => (era(S) === 'e01' ? '내무반' : '생활관');
const spend = (S, won) => { S.money.cash = Math.max(0, S.money.cash - won); };
const leaveAdd = (S, d) => { S.leave.left += d; S.rewards.push({ ym: S.ym, kind: 'rel', days: d }); };
const leaveCut = (S, d) => { S.leave.left = Math.max(0, S.leave.left - d); };
const won = (n) => `${n.toLocaleString('ko-KR')}원`;
const junior = (S) => here(S, 'junior') && !!S.marks.junior_in;
// 2011-07 병영생활 행동강령: 분대장 외 병 상호 지시 금지 + 신고 의무 [R17] — 그 뒤에야 '신고'가 선택지가 된다
const canReport = (S) => S.ym >= '2011-07';
// 내리막(events-spiral.js) 중엔 따뜻한 관계 사건이 끼어들지 않는다 — 그 골짜기는 그 줄기의 몫이다
const calm = (S) => !S.flags.spiral;

const R = (e) => ({ ...e, when: { phase: ['serve'], ...e.when } });

export const REL_EVENTS = [
  // ── 후임 (§1) ──
  R({ id: 'rel_junior_base_handover', kind: 'decision', max: 1, w: 2, p: 0.4, src: 'relationship-events §1 [R50] 썰 · 가정',
    c: (S) => junior(S) && S.rank >= 1,
    build: (S) => ({
      title: '인수인계',
      body: fmt(S, '내가 맡던 일을 이제 {junior}에게 넘겨야 합니다. 장비 목록, 근무 요령, 행보관이 싫어하는 것까지. 다 가르치려면 며칠 저녁이 날아갑니다.'),
      choices: [
        { k: 'teach', label: '하나하나 꼼꼼히 가르친다', hint: '저녁 시간을 쓴다 · 후임이 기억한다', rel: { junior: 2 } },
        { k: 'quick', label: '목록만 주고 "보면 안다"', hint: '편하다 · 언젠가 내게 돌아온다', rel: { junior: -1 } },
      ],
    }),
    apply: (S, k) => k === 'teach'
      ? { t: fmt(S, '사흘 저녁을 {junior.name}과 창고에서 보냈습니다. 마지막 날 {junior.name}이 수첩을 덮으며 "이제 알 것 같습니다"라고 했습니다.'), fx: { mind: -3, skill: 2 }, rel: { junior: 6 }, mark: { set: { junior_trained: {} } } }
      : { t: fmt(S, '{junior.name}에게 목록을 건넸습니다. "보면 안다." 나도 그렇게 배웠습니다.'), fx: { mind: 1 }, rel: { junior: -3 }, later: { inMonths: 2, id: 'rel_junior_base_slip' } } }),

  R({ id: 'rel_junior_base_slip', kind: 'event', src: 'relationship-events §1 가정', c: () => false, // 지연 결과로만
    run: (S) => ({ t: fmt(S, '{junior.name}이 넘겨받은 일에서 구멍이 났습니다. 행보관은 {junior.name}이 아니라 나를 불렀습니다. "인계를 어떻게 한 거야."'), fx: { mind: -4 }, rel: { sfc: -3 } }) }),

  R({ id: 'rel_junior_base_lost', kind: 'decision', max: 1, w: 2, p: 0.25, src: 'relationship-events §1 [R53] 썰 · [R17] 공식',
    c: (S) => junior(S) && S.rank >= 1,
    build: (S) => ({
      title: '점검 전날 밤',
      body: fmt(S, '내일 아침 행보관 점검인데, {junior}이 장비 하나가 안 보인다며 사색이 되어 찾아왔습니다. 이대로면 내일 아침 둘 다 불려 갑니다.'),
      choices: [
        { k: 'cover', label: '"내가 알아서 할게" 덮어 준다', hint: '후임은 평생 기억한다 · 들키면 같이 징계', rel: { junior: 2, nco: -1 } },
        { k: 'report', label: '지금 당직에게 보고한다', hint: '규정대로 · 후임이 나를 원망한다', rel: { nco: 1, junior: -1 } },
        { k: 'search', label: '같이 밤새 찾는다', hint: '잠을 버린다 · 찾을지는 모른다', rel: { junior: 1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'cover') return roll(S, 0.3)
        ? { t: fmt(S, '덮은 게 사흘 만에 드러났습니다. 행보관이 장부를 두드리며 "둘 다 똑같다"고 했습니다. {junior.name}은 고개를 못 들었습니다.'), fx: { mind: -6 }, rel: { junior: 10, sfc: -8 }, punish: { kind: 'reprimand' } }
        : { t: fmt(S, '어떻게든 맞췄습니다. 점검은 조용히 지나갔고, {junior.name}은 그날 밤 내 관물대에 초코파이를 하나 넣어 두었습니다.'), fx: { mind: -2 }, rel: { junior: 10 } };
      if (k === 'report') return { t: fmt(S, '당직에게 보고했습니다. 장비는 다음 날 창고 뒤에서 나왔고, {junior.name}은 한동안 내 눈을 피했습니다.'), fx: { mind: -3 }, rel: { sfc: 3, junior: -8 } };
      return roll(S, 0.5)
        ? { t: fmt(S, '새벽 세 시, 탄피 상자 밑에서 나왔습니다. {junior.name}이 주저앉아 웃었습니다. 둘 다 눈이 시뻘겠습니다.'), fx: { fit: -5, mind: 1 }, rel: { junior: 7 } }
        : { t: fmt(S, '밤새 찾았지만 못 찾았습니다. 아침 점검에서 {junior.name} 옆에 나란히 섰습니다.'), fx: { fit: -5, mind: -3 }, rel: { junior: 5, sfc: -3 } };
    } }),

  R({ id: 'rel_junior_room_order', kind: 'decision', max: 1, w: 2, p: 0.3, when: { era: ['e02', 'e03'] }, src: 'relationship-events §1 [R17] 공식 · [R18][R43] 보도',
    c: (S) => junior(S) && S.rank >= 1 && here(S, 'roomSenior') && !S.flags.n_p_pass_down,
    build: (S) => ({
      title: '애들 군기 좀 잡아라',
      body: fmt(S, `{roomSenior}이 "요즘 애들 풀렸다, 네가 잡아라"라고 합니다. ${canReport(S) ? '행동강령대로라면 분대장이 아닌 나는 후임에게 지시할 권한이 없고, 이런 걸 알면 신고할 의무가 있습니다.' : '말 한마디면 {junior.name}의 한 달이 달라집니다.'}`),
      choices: [
        { k: 'pass', label: '그대로 전달한다', hint: '선임은 만족 · 후임이 나를 본다', rel: { senior: 1, junior: -2 } },
        { k: 'refuse', label: '"제가 할 일은 아닙니다"', hint: '선임 눈 밖에 난다', rel: { senior: -2 } },
        ...(canReport(S) ? [{ k: 'report', label: '소대장에게 알린다', hint: '강령의 신고 의무 · 생활관이 등을 돌릴 수 있다', rel: { officer: 1, senior: -2 } }] : []),
      ],
    }),
    apply: (S, k) => {
      if (k === 'pass') return { t: fmt(S, '점호 뒤 {junior.name}을 세웠습니다. 몇 달 전 내가 듣던 말이 그대로 나왔습니다.'), fx: { mind: -4 }, rel: { roomSenior: 5, junior: -10 }, mark: { set: { abuse_line: {} } } };
      if (k === 'refuse') return { t: fmt(S, '"제가 할 일은 아닙니다." {roomSenior.name}이 한참 나를 쳐다보다 돌아누웠습니다. 다음 주 근무표가 이상하게 바뀌었습니다.'), fx: { mind: -6 }, rel: { roomSenior: -10, junior: 4 } };
      S.env.abuse = Math.max(0, S.env.abuse - 8);
      return { t: fmt(S, `소대장에게 알렸습니다. ${era(S) === 'e03' ? '보복하면 가중 처벌이라는 공지가 붙었고, ' : ''}{roomSenior.name}은 면담에 불려 갔다 왔습니다. 그날부터 생활관에서 나와 말하는 사람이 반으로 줄었습니다.`), fx: { mind: era(S) === 'e03' ? -4 : -8 }, rel: { roomSenior: -20, lt: 5 }, mark: { set: { reporter: {} } } };
    } }),

  R({ id: 'rel_junior_office_letter', kind: 'decision', max: 1, w: 2, p: 0.2, src: 'relationship-events §1 [R2][R3][R28] 보도 · discipline-events §1',
    c: (S) => junior(S) && here(S, 'roomSenior') && S.env.abuse >= 15,
    build: (S) => ({
      title: '본 적 있나',
      body: fmt(S, `${byEra(S, ['소원수리 함', '마음의 편지', '마음의 편지', '국방헬프콜 1303', '국방헬프콜 1303'])}에 생활관 일이 올라갔습니다. 쓴 사람은 {junior}인 것 같습니다. 나는 목격자로 행정반에 불려 왔습니다. 중대장이 묻습니다. "본 적 있나?"`),
      choices: [
        { k: 'truth', label: '본 대로 말한다', hint: '후임 편 · 생활관 선임이 안다', rel: { junior: 2, senior: -2 } },
        { k: 'deny', label: '"못 봤습니다"', hint: '생활관은 조용 · 진술이 엇갈리면 내가 다친다', rel: { junior: -2 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'truth') { S.env.abuse = Math.max(0, S.env.abuse - 6); return { t: fmt(S, '본 대로 말했습니다. 행정반을 나오는데 {junior.name}이 복도 끝에서 고개를 숙였습니다. {roomSenior.name}은 그날 밤 내게 등을 돌리고 누웠습니다.'), fx: { mind: -2 }, rel: { junior: 6, roomSenior: -10 }, mark: { set: { witness: {} } } }; }
      return roll(S, 0.15)
        ? { t: '"못 봤습니다." 다른 사람 진술과 내 말이 엇갈렸습니다. 거짓 진술로 견책을 받았습니다.', fx: { mind: -6 }, rel: { junior: -10 }, punish: { kind: 'reprimand' } }
        : { t: fmt(S, '"못 봤습니다." 조사는 흐지부지 끝났습니다. {junior.name}은 그 뒤로 내게 아무것도 묻지 않았습니다.'), fx: { mind: -3 }, rel: { junior: -10 } };
    } }),

  R({ id: 'rel_junior_room_counsel', kind: 'decision', max: 1, w: 2, p: 0.2, src: 'relationship-events §1 [R15][R16][R47][R55] 보도',
    c: (S) => junior(S) && S.rank >= 1,
    build: (S) => ({
      title: '이불 속 불빛',
      body: fmt(S, phoneOn(S) ? '며칠째 {junior}이 소등 뒤에도 이불 속에서 휴대폰을 붙잡고 있습니다. 화면 불빛에 비친 얼굴이 젖어 있습니다. 여자친구 문제인 것 같습니다.' : '며칠째 {junior}이 소등 뒤에도 편지 한 장을 붙잡고 있습니다. 같은 편지를 몇 번이고 다시 접습니다. 여자친구 문제인 것 같습니다.'),
      choices: [
        { k: 'listen', label: 'PX 뒤로 불러 들어 준다', hint: '내 쉬는 시간을 쓴다', rel: { junior: 2 } },
        { k: 'tell', label: '소대장에게 알린다', hint: '도움은 확실 · 후임이 관심병사가 될 수 있다', rel: { officer: 1, junior: -1 } },
        { k: 'leave', label: '모른 척한다', hint: '내 일이 아니다 · 일이 커질 수도', rel: { junior: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'listen') return { t: fmt(S, '{junior.name}은 한 시간 동안 말했고 나는 거의 듣기만 했습니다. 마지막에 "형한테 말하니까 좀 낫습니다"라고 했습니다. 계급 대신 형이라는 말이 처음 나왔습니다.'), fx: { mind: -3 }, rel: { junior: 8 } };
      if (k === 'tell') return roll(S, 0.4)
        ? { t: fmt(S, `소대장에게 알렸습니다. {junior.name}은 ${era(S) === 'e01' ? '관심사병' : S.ym >= '2017' ? '도움배려병사' : '관심병사'}로 지정돼 근무에서 빠졌고, 빈 근무는 내 몫이 됐습니다. {junior.name}은 고마워하면서도 부끄러워했습니다.`), fx: { fit: -3, mind: -2 }, rel: { lt: 3, junior: -4 } }
        : { t: fmt(S, `소대장이 {junior.name}을 따로 불렀습니다. ${S.ym >= '2005' ? '상담관 면담이 잡혔고, ' : ''}일주일 뒤 {junior.name}의 얼굴이 조금 펴졌습니다.`), fx: { mind: -1 }, rel: { lt: 3, junior: 2 } };
      return { t: '모른 척했습니다. 내 코가 석 자였습니다.', fx: { mind: 1 }, later: { inMonths: 1, id: 'rel_junior_room_late' } };
    } }),

  R({ id: 'rel_junior_room_late', kind: 'event', src: 'relationship-events §1 [R55] 보도', c: () => false, // 지연 결과로만
    run: (S) => ({ t: fmt(S, '{junior.name}이 휴가에서 하루 늦게 복귀했습니다. 위병소에서 연락이 왔을 때 생활관 전체가 그 이불 속 불빛을 떠올렸습니다.'), fx: { mind: -5 }, rel: { junior: -5 }, ban: 1 }) }),

  R({ id: 'rel_junior_town_dinner', kind: 'decision', max: 1, w: 2, p: 0.25, when: { era: ['e04', 'e05'] }, src: 'relationship-events §1 [R11][R19] 보도',
    c: (S) => junior(S) && S.rank >= 2,
    build: (S) => ({
      title: '단결활동, 빠지겠다는 후임',
      body: fmt(S, '평일 저녁 분대 단결활동 외출. 치킨집도 예약했는데 {junior}이 "오늘은 그냥 쉬고 싶습니다"라고 합니다. 분대장은 나를 봅니다.'),
      choices: [
        { k: 'respect', label: '"그래, 쉬어"', hint: '후임의 저녁 · 분대 모양이 빠진다', rel: { junior: 1, officer: -1 } },
        { k: 'persuade', label: '"한 시간만 있다 가자"', hint: '반쯤 통한다', rel: { junior: -1 } },
        { k: 'force', label: '"분대 행사다, 나와"', hint: '모양은 산다 · 진정감이다', rel: { junior: -2 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'respect') return { t: fmt(S, '{junior.name}을 두고 나왔습니다. 치킨은 남았고, 소대장은 "애들 관리 좀 하라"고 했습니다. 다음 날 {junior.name}이 먼저 인사를 했습니다.'), fx: { mind: 1 }, rel: { junior: 5, lt: -2 } };
      if (k === 'persuade') return roll(S, 0.5)
        ? { t: fmt(S, '{junior.name}은 한 시간만 있다 먼저 들어갔습니다. 그래도 사진에는 같이 찍혔습니다.'), fx: { mind: 1 }, rel: { junior: -2 } }
        : { t: fmt(S, '{junior.name}은 끝내 안 나왔습니다. 괜히 말을 보탠 것만 남았습니다.'), fx: { mind: -2 }, rel: { junior: -3 } };
      return roll(S, 0.05)
        ? { t: fmt(S, '{junior.name}은 나왔지만 한마디도 안 했습니다. 일주일 뒤 "휴식권 침해" 진정이 들어갔고 견책을 받았습니다.'), fx: { mind: -6 }, rel: { junior: -8 }, punish: { kind: 'reprimand' } }
        : { t: fmt(S, '{junior.name}은 나왔지만 치킨에 손도 안 댔습니다. 분대 사진 속 {junior.name}만 웃지 않았습니다.'), fx: { mind: -2 }, rel: { junior: -8 } };
    } }),

  R({ id: 'rel_junior_office_leaveswap', kind: 'decision', max: 1, w: 2, p: 0.2, src: 'relationship-events §1 [R11][R9] 보도',
    c: (S) => junior(S) && S.rank >= 1 && S.leave.left >= 5,
    build: (S) => ({
      title: '휴가 자리 하나',
      body: fmt(S, `휴가 인원 ${era(S) === 'e04' ? '20%' : '비율'} 제한 때문에 이번 달엔 내 정기휴가와 {junior}의 첫 휴가 중 하나만 됩니다. {junior.name}은 입대하고 아직 집에 못 가 봤습니다.`),
      choices: [
        { k: 'yield', label: '후임 먼저 보낸다', hint: '내 휴가가 두 주 밀린다', rel: { junior: 2 } },
        { k: 'keep', label: '내 차례대로 간다', hint: '당연한 권리 · 후임은 서운하다', rel: { junior: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'yield') {
        const stuck = era(S) === 'e04' && roll(S, 0.3);
        return { t: fmt(S, `{junior.name}을 먼저 보냈습니다. 위병소를 나가며 두 번이나 뒤돌아 경례를 했습니다.${stuck ? ' 그리고 다음 주, 휴가 통제가 다시 걸렸습니다. 내 휴가는 기약 없이 밀렸습니다.' : ''}`), fx: { mind: stuck ? -7 : -3 }, rel: { junior: 10 } };
      }
      return { t: fmt(S, '내 차례대로 나갔습니다. 집밥은 맛있었는데, 복귀해 보니 {junior.name}의 관물대에 달력이 새로 붙어 있었습니다.'), fx: { mind: 2 }, rel: { junior: -4 } };
    } }),

  R({ id: 'rel_junior_px_payforward', kind: 'event', max: 1, w: 4, needs: 'owe_px', src: 'relationship-events §2 가정 (rel_senior_px_treat의 되갚기)',
    c: (S) => junior(S) && S.rank >= 2 && calm(S),
    run: (S) => {
      const cost = byEra(S, [3000, 6000, 10000, 15000, 25000]);
      spend(S, cost);
      return { t: fmt(S, `월급날, {junior.name}을 PX로 데려가 냉동식품을 샀습니다(${won(cost)}). "나중에 너도 후임한테 사 줘라." 그 말이 내 입에서 나왔습니다.`), fx: { mind: 3 }, rel: { junior: 6 }, mark: { del: ['owe_px'] } };
    } }),

  // ── 선임 (§2) ──
  R({ id: 'rel_senior_px_treat', kind: 'event', max: 1, w: 2, src: 'relationship-events §2 era-culture §5 · 가정',
    c: (S) => here(S, 'senior') && S.rank === 1 && calm(S),
    run: (S) => ({ t: fmt(S, era(S) === 'e05'
      ? '월급날, 각자 계산이 기본인데 {senior.name}이 내 것까지 계산대에 올렸습니다. "나중에 너도 후임한테 사 줘라."'
      : '월급날, {senior.name}이 PX에서 냉동 만두를 집어 들더니 내 것까지 계산했습니다. "나중에 너도 후임한테 사 줘라."'),
    fx: { mind: 4 }, rel: { senior: 4 }, mark: { set: { owe_px: {} } } }) }),

  R({ id: 'rel_senior_room_memorize', kind: 'decision', max: 1, w: 2, p: 0.35, when: { era: ['e01', 'e02', 'e03'] }, src: 'relationship-events §2 [R43][R18][R19] 보도 · era-culture §1',
    c: (S) => S.rank === 0 && here(S, 'roomSenior'),
    build: (S) => ({
      title: '내일까지 외워 와라',
      body: fmt(S, `{roomSenior}이 종이 한 장을 내밀었습니다. 선임 전원의 이름과 입대 순서, ${S.branch === 'marine' ? '기수표' : '군가 3절까지'}. "내일 아침까지."`),
      choices: [
        { k: 'learn', label: '밤새 외운다', hint: '잠과 멘탈을 쓴다', rel: { senior: 1 } },
        { k: 'hold', label: '못 외운 척 버틴다', hint: '찍힌다', rel: { senior: -2 } },
        ...(canReport(S) ? [{ k: 'report', label: '소대장에게 말한다', hint: '강령 위반이다 · 생활관이 안다', rel: { officer: 1, senior: -2 } }] : []),
      ],
    }),
    apply: (S, k) => {
      if (k === 'learn') return { t: `불침번 손전등 아래서 외웠습니다. 아침에 한 글자도 안 틀렸는데 "${era(S) === 'e03' ? '이제 됐다' : '내일은 4절이다'}"라는 말이 돌아왔습니다.`, fx: { mind: -6, skill: 1, fit: -2 }, rel: { roomSenior: 4 } };
      if (k === 'hold') { S.env.abuse = Math.min(100, S.env.abuse + 3); return { t: fmt(S, '"아직 못 외웠습니다." {roomSenior.name}의 얼굴이 굳었습니다. 그 주 내내 걸레는 내 차지였습니다.'), fx: { mind: -4 }, rel: { roomSenior: -10 } }; }
      return { t: fmt(S, '소대장에게 종이를 보여 줬습니다. {roomSenior.name}은 면담을 다녀왔고, 종이는 다시 나오지 않았습니다. 대신 생활관의 대화가 내 앞에서 끊기기 시작했습니다.'), fx: { mind: -5 }, rel: { roomSenior: -20, lt: 4 }, mark: { set: { reporter: {} } } };
    } }),

  R({ id: 'rel_senior_fence_dutyswap', kind: 'decision', max: 1, w: 2, p: 0.3, src: 'relationship-events §2 [R54] 썰 · [R48] 보도',
    c: (S) => here(S, 'senior'),
    build: (S) => ({
      title: '근무 좀 바꿔 줘',
      body: fmt(S, `{senior}이 슬쩍 와서 말합니다. "토요일에 ${+S.ym.slice(5) % 2 ? '여자친구가' : '부모님이'} 면회 온대. 내 새벽 근무 좀 서 줘라. 꼭 갚는다."${era(S) >= 'e04' ? ' 근무표 변경은 원래 간부 승인이 필요합니다.' : ''}`),
      choices: [
        { k: 'take', label: '서 준다', hint: '새벽 두 시간 · 빚이 생긴다', rel: { senior: 2 } },
        { k: 'no', label: '"저도 그날은 좀…"', hint: '선임이 서운해한다', rel: { senior: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'no') return { t: fmt(S, '거절했습니다. {senior.name}은 "알았다"고만 했는데 그 주 내내 말수가 적었습니다.'), fx: { mind: -1 }, rel: { senior: -6 } };
      if (era(S) >= 'e04' && roll(S, 0.1)) return { t: '몰래 바꾼 근무표가 당직사관에게 걸렸습니다. 둘 다 견책을 받았고, 선임은 미안해서 어쩔 줄 몰라 했습니다.', fx: { fit: -4, mind: -5 }, rel: { senior: 8 }, punish: { kind: 'reprimand' }, mark: { set: { senior_iou: {} } } };
      return { t: fmt(S, '새벽 근무를 대신 섰습니다. 별이 많았고 졸렸습니다. 일요일 밤 {senior.name}이 면회 때 받은 떡을 내 관물대에 넣어 뒀습니다.'), fx: { fit: -4, mind: -3 }, rel: { senior: 8 }, mark: { set: { senior_iou: {} } } };
    } }),

  R({ id: 'rel_senior_room_payback', kind: 'event', max: 1, w: 4, needs: 'senior_iou', src: 'relationship-events §2 가정 (빚 갚기)',
    c: (S) => here(S, 'senior') && calm(S) && roll(S, 0.3),
    run: (S) => ({ t: fmt(S, '{senior.name}이 "그때 빚"이라며 내 주말 작업을 대신 나갔습니다. 돌아와서 "이제 우리 쌤쌤이다"라고 했지만, 나는 아직 내가 받은 게 많다고 생각했습니다.'), fx: { mind: 5, fit: 2 }, rel: { senior: 4 }, mark: { del: ['senior_iou'] } }) }),

  R({ id: 'rel_senior_office_leaveyield', kind: 'event', max: 1, w: 2, when: { months: [1, 2, 9, 10] }, src: 'relationship-events §2 [R11][R9] 보도 · 가정',
    c: (S) => here(S, 'senior') && who(S, 'senior').rel >= 55 && calm(S),
    run: (S) => ({ t: fmt(S, '명절 휴가 자리가 하나 남았는데 {senior.name}이 "너 먼저 가라, 나는 다음에 간다"며 이름을 지웠습니다. 차례상 앞에서 어머니가 "누가 양보해 줬다고?" 하고 두 번 물으셨습니다.'),
      fx: { mind: 5 }, rel: { senior: 6, family: 6 }, mark: { set: { senior_iou: {} } } }) }),

  R({ id: 'rel_senior_room_gisu', kind: 'decision', max: 1, w: 2, p: 0.25, when: { era: ['e01', 'e02'] }, src: 'relationship-events §2 [R18] 보도 · [R17] 공식',
    c: (S) => here(S, 'roomSenior') && S.env.abuse >= 20 && !S.flags.n_era_e2_ostracize,
    build: (S) => ({
      title: '없는 사람',
      body: fmt(S, `${room(S)}이 한 사람을 "없는 사람" 취급합니다. 밥도 혼자, 말도 혼자. {roomSenior}이 내게도 말합니다. "너도 걔랑 말 섞지 마."`),
      choices: [
        { k: 'join', label: '시키는 대로 한다', hint: '안전하다 · 내가 뭘 했는지는 남는다', rel: { senior: 1 } },
        { k: 'care', label: '몰래 챙긴다', hint: '그 사람이 버틴다 · 들키면 나도 없는 사람', rel: { senior: -1 } },
        ...(canReport(S) ? [{ k: 'report', label: '신고한다', hint: '집단따돌림 금지 · 생활관 전체가 적이 된다', rel: { officer: 1, senior: -2 } }] : []),
      ],
    }),
    apply: (S, k) => {
      if (k === 'join') return { t: '말을 섞지 않았습니다. 그 사람이 식판을 들고 혼자 앉는 걸 매일 봤습니다. 보기만 했습니다.', fx: { mind: -5 }, rel: { roomSenior: 5 }, mark: { set: { abuse_line: {} } } };
      if (k === 'care') return roll(S, 0.4)
        ? { t: fmt(S, '불침번 때 건넨 초코파이가 들켰습니다. 다음 날부터 나도 "없는 사람"이 됐습니다. 둘이 같이 밥을 먹게 됐습니다.'), fx: { mind: -10 }, rel: { roomSenior: -10 }, mark: { set: { kept_company: {} } } }
        : { t: '불침번 교대 때마다 몇 마디씩 건넸습니다. 그 사람은 전역 날 "그 몇 마디로 버텼다"고 했습니다.', fx: { mind: -2 }, mark: { set: { kept_company: {} } } };
      S.env.abuse = Math.max(0, S.env.abuse - 10);
      return { t: fmt(S, '신고했습니다. 조사가 끝나고 몇 명이 다른 중대로 갔습니다. 남은 사람들은 나를 "그 사람"이라고 불렀습니다.'), fx: { mind: -6 }, rel: { roomSenior: -20, lt: 5 }, mark: { set: { reporter: {} } } };
    } }),

  R({ id: 'rel_senior_office_blame', kind: 'decision', max: 1, w: 2, p: 0.2, src: 'relationship-events §2 가정 (p_senior_cover의 반대편)',
    c: (S) => here(S, 'senior') && who(S, 'senior').rel <= 55 && S.rank <= 1,
    build: (S) => ({
      title: '내가 챙기기로 했다고?',
      body: fmt(S, '탄약고 열쇠 하나가 사라졌습니다. 행보관 앞에서 {senior}이 말합니다. "그거 쟤가 챙기기로 했습니다." 그런 말을 들은 적이 없습니다.'),
      choices: [
        { k: 'take', label: '그냥 받아들인다', hint: '내가 혼난다 · 선임에게 빚을 지운다', rel: { senior: 1 } },
        { k: 'deny', label: '"들은 적 없습니다"', hint: '진실 · 선임과 척진다', rel: { senior: -2 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'take') return { t: fmt(S, '"죄송합니다." 행보관에게 한참 혼났습니다. 저녁에 {senior.name}이 PX 앞에서 "미안하다"고 작게 말했습니다.'), fx: { mind: -8 }, rel: { senior: 6 }, mark: { set: { senior_iou: {} } } };
      const ok = roll(S, era(S) >= 'e04' ? 0.7 : 0.4);
      return ok
        ? { t: fmt(S, `"들은 적 없습니다."${era(S) >= 'e04' ? ' 휴대폰에 남은 근무 인수 메모를 보여 줬습니다.' : ''} 행보관이 {senior.name}을 따로 불렀습니다. 그날부터 {senior.name}과 나는 같은 방에서 다른 공기를 마셨습니다.`), fx: { mind: -2 }, rel: { senior: -12, sfc: 3 } }
        : { t: fmt(S, '"들은 적 없습니다." 증거가 없었습니다. 행보관은 "선임한테 떠넘기냐"며 나를 더 혼냈습니다.'), fx: { mind: -6 }, rel: { senior: -12, sfc: -3 } };
    } }),

  R({ id: 'rel_senior_diner_outing', kind: 'event', max: 1, w: 2, when: { era: ['e04', 'e05'] }, src: 'relationship-events §2 [R11][R12] 보도',
    c: (S) => here(S, 'senior') && S.ym >= '2019-02' && calm(S),
    run: (S) => {
      const half = era(S) === 'e04' ? 15000 : 12000;
      spend(S, half);
      return { t: fmt(S, era(S) === 'e04'
        ? `평일 외출 단결활동. {senior.name}이 부대 앞 치킨집에 데려갔습니다. 계산할 때 "반만 내라"며 웃었습니다(${won(half)}).`
        : `평일 외출 단결활동. {senior.name}과 부대 앞 치킨집에 갔습니다. 계산은 당연하다는 듯 N분의 1이었습니다(${won(half)}). 그게 오히려 편했습니다.`),
      fx: { mind: 5 }, rel: { senior: 5 } };
    } }),

  R({ id: 'rel_senior_room_afterdc', kind: 'decision', max: 1, w: 2, p: 0.3, when: { era: ['e04', 'e05'] }, src: 'relationship-events §2 [R24][R37] 보도 (보안 위반 증가)',
    c: (S) => !!who(S, 'exRoomSenior') && phoneOn(S),
    build: (S) => ({
      title: '사진 하나 보내 봐',
      who: 'exRoomSenior',
      body: fmt(S, '전역한 {exRoomSenior}에게서 메시지가 왔습니다. "요즘 부대 어떠냐. 생활관 사진 하나 보내 봐, 보고 싶다."'),
      choices: [
        { k: 'words', label: '말로만 근황을 전한다', hint: '안전 · 조금 서운해한다', rel: { senior: 1 } },
        { k: 'photo', label: '사진을 찍어 보낸다', hint: '반가워한다 · 보안 위반이다', rel: { senior: 2 } },
        { k: 'ignore', label: '읽고 답하지 않는다', hint: '끝난 사이다', rel: { senior: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'words') return { t: fmt(S, '"사진은 안 됩니다, 다들 잘 있습니다." {exRoomSenior.name}은 "FM이네" 하고 웃는 이모티콘을 보냈습니다.'), fx: { mind: -1 }, rel: { exRoomSenior: 3 } };
      if (k === 'photo') return roll(S, 0.2)
        ? { t: '보낸 사진이 그 선임의 SNS에 올라갔고, 보안 점검에 걸렸습니다. 휴가가 사흘 깎였습니다.', fx: { mind: -8 }, rel: { exRoomSenior: 5 }, punish: { kind: 'leaveCut', n: 3 } }
        : { t: fmt(S, '사진을 보냈습니다. "아직도 저 관물대냐" 하고 {exRoomSenior.name}이 한참 웃었습니다. 보내 놓고 며칠 마음이 불편했습니다.'), fx: { mind: -2 }, rel: { exRoomSenior: 5 } };
      return { t: '답하지 않았습니다. 대화방 맨 위에서 그 이름이 천천히 아래로 내려갔습니다.', fx: { mind: -1 }, rel: { exRoomSenior: -3 } };
    } }),

  // ── 동기 (§3) ──
  R({ id: 'rel_peer_room_buddy', kind: 'event', max: 1, w: 2, p: 0.1, src: 'relationship-events §3 [R31] 보도 (동반입대 2003~)',
    c: (S) => S.ym >= '2003' && S.branch === 'army' && here(S, 'peer') && S.rank === 0,
    run: (S) => {
      const p = who(S, 'peer');
      p.rel = Math.max(p.rel, 70);
      return { t: fmt(S, '{peer.name}은 사실 고향 친구입니다. 동반입대로 같이 들어와 같은 생활관에 떨어졌습니다. 편한데, 한 명이 혼나면 둘 다 찍힙니다.'), fx: { mind: 3 }, mark: { set: { buddy: {} } } };
    } }),

  R({ id: 'rel_peer_office_leavesync', kind: 'decision', max: 1, w: 2, p: 0.25, src: 'relationship-events §3 [R11][R9] 보도 · 가정',
    c: (S) => here(S, 'peer') && S.rank >= 1 && S.leave.left >= 5,
    build: (S) => ({
      title: '같은 날, 한 자리',
      body: fmt(S, '{peer}과 같은 날 휴가를 맞춰 나가기로 했는데, 휴가 비율 제한 때문에 그 주엔 한 자리뿐입니다.'),
      choices: [
        { k: 'yield', label: '동기에게 양보한다', hint: '내 휴가가 밀린다', rel: { peer: 2 } },
        { k: 'rps', label: '가위바위보', hint: '깔끔하다 · 지는 쪽은 진다', rel: { peer: -1 } },
        { k: 'lobby', label: '둘이 같이 행보관을 조른다', hint: '될 수도 · 찍힐 수도', rel: { nco: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'yield') return { t: fmt(S, '{peer.name}에게 양보했습니다. 복귀하는 날 {peer.name}이 집에서 싸 온 반찬을 생활관에 풀었습니다.'), fx: { mind: -3 }, rel: { peer: 8 } };
      if (k === 'rps') return roll(S, 0.5)
        ? { t: fmt(S, '보를 냈고 이겼습니다. {peer.name}은 "다음엔 내가 이긴다"며 웃었지만 그 주 내내 달력을 쳐다봤습니다.'), fx: { mind: 3 }, rel: { peer: -3 } }
        : { t: fmt(S, '주먹을 냈고 졌습니다. {peer.name}이 미안해서 PX를 샀습니다.'), fx: { mind: -3 }, rel: { peer: 2 } };
      return roll(S, 0.3)
        ? { t: '행보관이 한숨을 쉬더니 둘 다 보내 줬습니다. 대신 남은 사람들의 근무가 빡빡해졌고, 복귀하니 후임들 얼굴이 퀭했습니다.', fx: { mind: 5 }, rel: { sfc: -3, junior: -3, peer: 4 } }
        : { t: '"너희가 휴가를 정하냐?" 둘 다 혼만 나고 나왔습니다.', fx: { mind: -2 }, rel: { sfc: -3, peer: 2 } };
    } }),

  R({ id: 'rel_peer_booth_lovecard', kind: 'event', max: 1, w: 2, when: { era: ['e01', 'e02', 'e03'] }, src: 'relationship-events §3 relationships §1 · 가정',
    c: (S) => here(S, 'peer') && !phoneOn(S),
    run: (S) => {
      const cost = byEra(S, [5000, 5000, 10000, 10000, 10000]);
      spend(S, cost);
      return { t: fmt(S, `{peer.name}이 여자친구와 연락이 끊겼다며 공중전화 앞에서 서성였습니다. 내 전화카드(${won(cost)})를 통째로 건넸습니다. 통화는 4분 만에 끝났고, {peer.name}은 부스 안에서 한참 나오지 않았습니다.`), fx: { mind: -1 }, rel: { peer: 8 } };
    } }),

  R({ id: 'rel_peer_room_love', kind: 'decision', max: 1, w: 2, p: 0.25, src: 'relationship-events §3 relationships §1 · [R55] 보도',
    c: (S) => here(S, 'peer') && phoneOn(S),
    build: (S) => ({
      title: '읽씹 해석',
      body: fmt(S, '{peer}이 휴대폰 화면을 내밀며 묻습니다. "하루째 읽고 답이 없어. 이거 무슨 뜻이냐." 표정을 보니 이미 답을 알고 있는 얼굴입니다.'),
      choices: [
        { k: 'listen', label: '밤새 같이 해석해 준다', hint: '잠을 버린다', rel: { peer: 2 } },
        { k: 'tell', label: '소대장에게 슬쩍 말해 둔다', hint: '안전장치 · 동기는 배신감을 느낀다', rel: { officer: 1, peer: -1 } },
      ],
    }),
    apply: (S, k) => k === 'listen'
      ? { t: fmt(S, '새벽 두 시까지 메시지 한 줄을 스무 가지로 해석했습니다. 결론은 안 났지만 {peer.name}은 "그래도 너라서 다행이다"라며 잠들었습니다.'), fx: { mind: -2, fit: -1 }, rel: { peer: 6 } }
      : { t: fmt(S, '소대장에게 말해 뒀습니다. 다음 날 면담에 불려 갔다 온 {peer.name}이 "네가 말했냐"고 물었습니다. 대답하지 못했습니다.'), fx: { mind: -2 }, rel: { lt: 2, peer: -4 } } }),

  R({ id: 'rel_peer_office_squadrace', kind: 'decision', max: 1, w: 2, p: 0.3, src: 'relationship-events §3 [R17] 공식 · 가정',
    c: (S) => here(S, 'peer') && S.rank === 2 && !S.marks.squad_leader,
    build: (S) => ({
      title: '분대장 자리',
      body: fmt(S, `분대장 자리가 하나 납니다. 후보는 {peer}과 나. ${canReport(S) ? '분대장만 병사에게 지시할 수 있습니다.' : '분대장이 되면 생활관에서 말의 무게가 달라집니다.'}`),
      choices: [
        { k: 'run', label: '지원한다', hint: '책임과 권한 · "너 변했다"는 말', rel: { officer: 1, peer: -1 } },
        { k: 'yield', label: '동기에게 양보한다', hint: '편하다 · 소대장이 아쉬워한다', rel: { peer: 1, officer: -1 } },
      ],
    }),
    apply: (S, k) => k === 'run'
      ? { t: fmt(S, '분대장 견장을 달았습니다. 첫 지시를 내린 날 {peer.name}이 "너 진짜 변했다"며 웃었습니다. 반은 농담이었습니다.'), fx: { skill: 3, mind: -2 }, rel: { lt: 5, peer: -6 }, mark: { set: { squad_leader: {} } } }
      : { t: fmt(S, '{peer.name}이 분대장이 됐습니다. 이제 동기가 내게 지시를 내립니다. 생각보다 어색하지 않았습니다. 생각보다만.'), fx: { mind: -1 }, rel: { peer: 6, lt: -2 } } }),

  R({ id: 'rel_peer_hill_award', kind: 'decision', max: 1, w: 2, p: 0.3, src: 'relationship-events §3 [R35] 보도 · [R53] 썰',
    c: (S) => here(S, 'peer') && (S.train?.marksman ?? 0) >= 20,
    build: (S) => ({
      title: '특등사수는 한 명',
      body: fmt(S, '사격 측정에서 {peer}과 동점이 나왔습니다. 포상휴가는 한 장. 중대장이 "둘이 정해라"라고 합니다.'),
      choices: [
        { k: 'shoot', label: '재사격으로 가린다', hint: '실력대로 · 진 쪽은 남는다', rel: { peer: -1 } },
        { k: 'yield', label: '동기에게 양보한다', hint: '휴가를 버린다', rel: { peer: 2 } },
        { k: 'both', label: '"둘 다 주십시오"', hint: '될 리가 · 중대장이 웃을지 모른다', rel: { officer: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'shoot') {
        if (roll(S, 0.3 + (S.train?.marksman ?? 0) / 200)) { leaveAdd(S, 3); return { t: fmt(S, '재사격 열 발 중 아홉. 포상휴가 3일이 내 이름으로 나왔습니다. {peer.name}은 사로에서 한참 총을 내려다봤습니다.'), fx: { mind: 4 }, rel: { peer: -3 } }; }
        return { t: fmt(S, '재사격에서 한 발 차이로 졌습니다. {peer.name}이 "다음 휴가 때 내가 쏜다"고 했습니다.'), fx: { mind: -3 }, rel: { peer: -1 } };
      }
      if (k === 'yield') return { t: fmt(S, '{peer.name}에게 넘겼습니다. {peer.name}은 휴가에서 돌아와 내 관물대에 고향 과자를 한 봉지 넣었습니다.'), fx: { mind: -3 }, rel: { peer: 8 } };
      if (roll(S, 0.2)) { leaveAdd(S, 3); return { t: '"둘 다 주십시오." 중대장이 어이없다는 듯 웃더니 정말 둘 다 줬습니다. 소대장은 "다음엔 그러지 마라"고 했습니다.', fx: { mind: 5 }, rel: { lt: -2, peer: 4 } }; }
      return { t: '"둘 다 주십시오." 중대장은 웃지 않았습니다. 포상은 다음 측정으로 미뤄졌습니다.', fx: { mind: -2 }, rel: { lt: -2 } };
    } }),

  R({ id: 'rel_peer_room_watch', kind: 'decision', max: 1, w: 2, p: 0.2, when: { era: ['e02', 'e04', 'e05'] }, src: 'relationship-events §3 [R15][R16] 보도',
    c: (S) => here(S, 'peer') && S.rank >= 1,
    build: (S) => ({
      title: '옆에서 잘 봐라',
      who: 'lt',
      body: fmt(S, `{peer.name}이 ${S.ym >= '2017' ? '도움배려병사' : '관심병사'}로 지정됐습니다. {lt}이 나를 부릅니다. "네가 동기니까 옆에서 잘 봐라. 이상하면 바로 보고하고."`),
      choices: [
        { k: 'yes', label: '"알겠습니다"', hint: '동기를 지킨다 · 감시자가 된다', rel: { officer: 1 } },
        { k: 'no', label: '"동기를 감시할 순 없습니다"', hint: '소대장이 실망한다', rel: { officer: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'no') return { t: fmt(S, '"동기를 감시할 순 없습니다." {lt.name}은 한참 말이 없다가 "그래, 대신 같이 밥은 먹어라"라고 했습니다.'), fx: { mind: -1 }, rel: { lt: -4 } };
      return roll(S, 0.3)
        ? { t: fmt(S, '한 달쯤 지나 {peer.name}이 알아챘습니다. "너도 나 보고하냐?" 아니라고 하지 못했습니다.'), fx: { mind: -6 }, rel: { lt: 4, peer: -8 } }
        : { t: fmt(S, '매일 저녁 {peer.name}과 PX까지 같이 걸었습니다. 보고할 일은 생기지 않았고, 그게 보고의 전부였습니다.'), fx: { mind: -4 }, rel: { lt: 4, peer: 3 } };
    } }),

  R({ id: 'rel_peer_ship_shun', kind: 'decision', max: 1, w: 2, p: 0.25, when: { era: ['e04', 'e05'], branch: ['navy'] }, src: 'relationship-events §3 [R44] 보도',
    c: (S) => here(S, 'peer') && (S.env.post ?? '').startsWith('ship'),
    build: (S) => ({
      title: '승조원실에서 다들 나간다',
      body: fmt(S, '{peer.name}이 승조원실에 들어오면 다들 하나둘 일어나 나갑니다. 몇 주째입니다. 오늘은 내 옆자리에 앉았습니다. 다른 사람들이 나를 봅니다.'),
      choices: [
        { k: 'follow', label: '나도 일어난다', hint: '무리에 남는다 · 동기를 잃는다', rel: { peer: -2 } },
        { k: 'stay', label: '그대로 앉아 있는다', hint: '동기 편 · 나도 표적이 된다', rel: { peer: 2 } },
        { k: 'report', label: '함장에게 보고한다', hint: '분리 조치가 제대로 될지는 모른다', rel: { officer: 1, peer: 1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'follow') return { t: fmt(S, '나도 일어났습니다. 문을 닫으며 돌아보니 {peer.name}이 식판만 내려다보고 있었습니다.'), fx: { mind: -4 }, rel: { peer: -15 }, mark: { set: { abuse_line: {} } } };
      if (k === 'stay') return { t: fmt(S, '그대로 앉아 있었습니다. 그날부터 승조원실에서 나가는 사람이 둘로 늘었습니다. {peer.name}이 "고맙다, 근데 너까지 그럴 필요 없다"고 했습니다.'), fx: { mind: -5 }, rel: { peer: 10 } };
      return roll(S, 0.4)
        ? { t: fmt(S, '보고했습니다. 그런데 하선한 건 가해자가 아니라 {peer.name}이었습니다. 보직이 바뀌어 다른 함정으로 갔습니다. 신고는 통했는데, 뭔가는 통하지 않았습니다.'), fx: { mind: -6 }, rel: { peer: 4 }, mark: { set: { reporter: {} } } }
        : { t: '보고했습니다. 몇 명이 하선했고 승조원실의 공기가 바뀌었습니다. 나는 한동안 "보고한 애"였습니다.', fx: { mind: -2 }, rel: { peer: 8 }, mark: { set: { reporter: {} } } };
    } }),

  R({ id: 'rel_peer_px_loan', kind: 'decision', max: 1, w: 2, p: 0.25, when: { era: ['e05'] }, src: 'relationship-events §3 [R38][R39] 보도 · 가정',
    c: (S) => here(S, 'peer') && S.money.cash >= 100000 && !S.flags.n_era_e5_money_social,
    build: (S) => ({
      title: '십만 원만',
      body: fmt(S, '월급을 배달 음식과 PX로 다 쓴 {peer}이 내게 와서 말합니다. "십만 원만 빌려줘. 다음 달에 바로 줄게." 나는 적금을 꽉 채워 넣고 있습니다.'),
      choices: [
        { k: 'lend', label: '빌려준다', hint: '10만 원 · 돌아올지는 모른다', rel: { peer: 1 } },
        { k: 'no', label: '"나도 빠듯해"', hint: '동기가 서운해한다', rel: { peer: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'no') return { t: fmt(S, '"나도 빠듯해." {peer.name}은 "알았어" 하고 돌아섰습니다. 거짓말은 아니었는데 거짓말 같았습니다.'), fx: { mind: -1 }, rel: { peer: -4 } };
      spend(S, 100000);
      if (roll(S, 0.3)) return { t: fmt(S, '십만 원을 빌려줬습니다. 다음 달에도, 그다음 달에도 {peer.name}은 그 얘기를 꺼내지 않았습니다. 나도 꺼내지 못했습니다.'), fx: { mind: -4 }, rel: { peer: -2 } };
      S.money.cash += 100000;
      return { t: fmt(S, '십만 원을 빌려줬고, 다음 월급날 {peer.name}이 치킨 쿠폰까지 얹어서 갚았습니다.'), fx: { mind: -1 }, rel: { peer: 5 } };
    } }),

  // ── 간부 (§4) ──
  R({ id: 'rel_officer_office_interview', kind: 'decision', max: 1, w: 2, p: 0.3, src: 'relationship-events §4 [R2][R28] 보도 · discipline-events §1',
    c: (S) => S.rank <= 1 && S.env.abuse >= 20,
    build: (S) => ({
      title: '힘든 거 있으면 말해 봐',
      who: 'lt',
      body: fmt(S, '{lt}의 분기 면담. 문은 닫혀 있지만 벽은 얇습니다. "요즘 생활관 어때? 힘든 거 있으면 말해 봐."'),
      choices: [
        { k: 'speak', label: '본 대로 말한다', hint: `생활관이 바뀔 수 있다 · 소문이 새면 끝`, rel: { officer: 1, senior: -1 } },
        { k: 'fine', label: '"없습니다"', hint: '아무 일도 안 생긴다 · 그게 문제다', rel: {} },
        ...(phoneOn(S) && S.ym >= '2013-08' ? [{ k: 'call', label: '면담은 넘기고 1303에 직접 건다', hint: '소문은 덜 난다 · 소대장은 모른다', rel: { officer: -1 } }] : []),
      ],
    }),
    apply: (S, k) => {
      if (k === 'fine') return { t: '"없습니다." 소대장은 고개를 끄덕이고 다음 사람을 불렀습니다.', fx: { mind: -2 } };
      if (k === 'call') { S.env.abuse = Math.max(0, S.env.abuse - 8); return roll(S, 0.05)
        ? { t: '1303에 걸었습니다. 그런데 조사 나온 사람이 "누가 신고했는지"를 너무 대놓고 물었습니다. 생활관이 금세 알았습니다.', fx: { mind: -8 }, rel: { roomSenior: -10 }, mark: { set: { reporter: {} } } }
        : { t: '일과 후 1303에 걸었습니다. 2주 뒤 대대에서 점검이 나왔고, 누가 걸었는지는 아무도 몰랐습니다.', fx: { mind: -1 }, mark: { set: { reporter: {} } } }; }
      S.env.abuse = Math.max(0, S.env.abuse - 10);
      return roll(S, byEra(S, [0.5, 0.4, 0.25, 0.15, 0.1]))
        ? { t: fmt(S, '본 대로 말했습니다. 다음 날 아침 {roomSenior.name}이 "면담 길더라?"라고 물었습니다. 말이 샌 것 같았습니다.'), fx: { mind: -6 }, rel: { lt: 5, roomSenior: -10 } }
        : { t: '본 대로 말했습니다. 한 달 뒤 생활관의 몇 가지 규칙이 슬그머니 없어졌습니다. 누가 말했는지는 아무도 몰랐습니다.', fx: { mind: 2 }, rel: { lt: 5 } };
    } }),

  R({ id: 'rel_officer_office_squadlead', kind: 'decision', max: 1, w: 2, p: 0.3, src: 'relationship-events §4 [R17] 공식 · 가정',
    c: (S) => S.rank >= 2 && !S.marks.squad_leader && !S.flags.n_rel_peer_office_squadrace,
    build: (S) => ({
      title: '분대장 해 볼래?',
      who: 'lt',
      body: fmt(S, '{lt}이 부릅니다. "다음 달부터 분대장 맡아라. 애들 너 말은 잘 듣더라."'),
      choices: [
        { k: 'yes', label: '맡겠습니다', hint: '권한과 책임 · 말년이 바빠진다', rel: { officer: 2 } },
        { k: 'no', label: '사양한다', hint: '편하다 · 소대장이 아쉬워한다', rel: { officer: -1 } },
      ],
    }),
    apply: (S, k) => k === 'yes'
      ? { t: '분대장 견장을 받았습니다. 그날부터 분대원의 휴가 날짜와 근무표와 고민이 다 내 일이 됐습니다.', fx: { skill: 3, mind: -3 }, rel: { lt: 6 }, mark: { set: { squad_leader: {} } } }
      : { t: fmt(S, '"부족합니다." {lt.name}은 "아깝다"고만 했습니다. 분대장은 다른 사람이 됐습니다.'), fx: { mind: 1 }, rel: { lt: -4 } } }),

  R({ id: 'rel_officer_base_errand', kind: 'decision', max: 1, w: 2, p: 0.25, src: 'relationship-events §4 [R1][R19] 보도 (2017 공관병 폐지·사적 지시 금지)',
    c: (S) => S.rank <= 2,
    build: (S) => {
      const banned = S.ym >= '2017-08';
      return {
        title: '주말에 잠깐만',
        who: 'lt',
        body: fmt(S, `{lt}이 금요일 저녁에 부릅니다. "주말에 관사 이삿짐 좀 같이 옮기자. 금방 끝나."${banned ? ' 간부의 사적 지시는 2017년부터 금지입니다.' : ''}`),
        choices: [
          { k: 'go', label: '따라간다', hint: '주말이 사라진다', rel: { officer: 1 } },
          { k: 'no', label: '정중히 거절한다', hint: banned ? '권리다 · 그래도 눈치가 보인다' : '근무 배정이 달라질 수 있다', rel: { officer: -2 } },
          ...(banned ? [{ k: 'report', label: '신고한다', hint: '간부가 징계를 받는다 · 부대가 시끄러워진다', rel: { officer: -2 } }] : []),
        ],
      };
    },
    apply: (S, k) => {
      const banned = S.ym >= '2017-08';
      if (k === 'go') return { t: fmt(S, `토요일 내내 냉장고와 장롱을 날랐습니다. {lt.name}이 짜장면을 사 줬습니다.${banned ? ' 돌아오는 길에 이게 원래 안 되는 일이라는 게 계속 마음에 걸렸습니다.' : ''}`), fx: { fit: -4, mind: banned ? -3 : -1 }, rel: { lt: banned ? 2 : 4 }, ...(banned && { mark: { set: { witness_errand: {} } } }) };
      if (k === 'no') return banned
        ? { t: fmt(S, '"주말엔 쉬고 싶습니다." {lt.name}은 "그래, 그래야지" 했지만 웃음이 어색했습니다.'), fx: { mind: -1 }, rel: { lt: -3 } }
        : { t: fmt(S, '거절했습니다. 다음 달 근무표에서 내 이름이 새벽 칸에만 있었습니다.'), fx: { fit: -2, mind: -4 }, rel: { lt: -10 } };
      return { t: fmt(S, '신고했습니다. {lt.name}은 견책을 받았고, 소대 분위기는 한동안 얼어붙었습니다. 몇몇은 잘했다고, 몇몇은 굳이 그랬어야 했냐고 했습니다.'), fx: { mind: -3 }, rel: { lt: -15 }, mark: { set: { reporter: {} } } };
    } }),

  R({ id: 'rel_nco_office_haircut', kind: 'decision', max: 1, w: 2, p: 0.4, src: 'relationship-events §4 [R33][R19] 보도 (두발 진정 2020~)',
    c: (S) => S.monthsLeft != null && S.monthsLeft <= 2 && S.rank >= 3,
    build: (S) => ({
      title: '말년도 예외 없다',
      who: 'sfc',
      body: fmt(S, '{sfc}이 중대 전원을 짧게 깎으라고 합니다. 전역이 코앞인 나도 예외가 아니랍니다. 사회에 나가는 날 머리가 이럴 줄은 몰랐습니다.'),
      choices: [
        { k: 'cut', label: '군말 없이 깎는다', hint: '행보관은 만족 · 거울을 피하게 된다', rel: { nco: 1 } },
        { k: 'plead', label: '"전역자는 봐주십시오"', hint: '될 수도 · 찍힐 수도', rel: { nco: -1 } },
        ...(S.ym >= '2018' ? [{ k: 'petition', label: '두발 규정으로 진정한다', hint: '권리다 · 행보관과 척진다', rel: { nco: -2 } }] : []),
      ],
    }),
    apply: (S, k) => {
      if (k === 'cut') return { t: '깎았습니다. 전역 사진 속 내 머리는 이등병 때와 같았습니다.', fx: { mind: -4 }, rel: { sfc: 3 } };
      if (k === 'plead') return roll(S, 0.3)
        ? { t: fmt(S, '{sfc.name}이 한숨을 쉬더니 "옆머리만 정리해"라고 했습니다.'), fx: { mind: 2 }, rel: { sfc: -6 } }
        : { t: '"말년이 무슨 벼슬이냐." 결국 깎았고, 한마디 더 들었습니다.', fx: { mind: -5 }, rel: { sfc: -6 } };
      return roll(S, 0.6)
        ? { t: '진정을 넣었고, "전역 예정자 일괄 이발은 과하다"는 주의 조치가 내려왔습니다. 행보관은 남은 날 동안 내 이름을 부르지 않았습니다.', fx: { mind: 2 }, rel: { sfc: -15 } }
        : { t: '진정은 "부대 재량"으로 끝났습니다. 머리도 깎고, 행보관과도 멀어졌습니다.', fx: { mind: -5 }, rel: { sfc: -15 } };
    } }),

  R({ id: 'rel_officer_office_revoked', kind: 'decision', max: 1, w: 2, p: 0.2, src: 'relationship-events §4 [R35] 보도 (2024 권익위 특별휴가 권고)',
    c: (S) => S.leave.left >= 3 && here(S, 'peer'),
    build: (S) => ({
      title: '중대 전체 포상 취소',
      who: { name: '중대장', rel: null },
      body: fmt(S, `생활관 한 사람의 잘못으로 중대 전체의 포상휴가가 취소됐다는 통보가 내려왔습니다. 그 한 사람은 {peer.name}입니다.${S.ym >= '2024-07' ? ' 얼마 전 권익위가 이런 일괄 취소를 고치라고 권고했다는 기사를 봤습니다.' : ''}`),
      choices: [
        { k: 'accept', label: '받아들인다', hint: '휴가 3일이 사라진다', rel: {} },
        { k: 'appeal', label: '소원수리로 이의를 낸다', hint: '돌려받을 수도 · 중대장 눈에 띈다', rel: { officer: -1 } },
        { k: 'blame', label: '동기 탓을 한다', hint: '속은 풀린다 · 휴가는 안 돌아온다', rel: { peer: -2 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'appeal') {
        if (roll(S, byEra(S, [0.1, 0.2, 0.3, 0.45, 0.6]))) return { t: '이의가 받아들여졌습니다. 잘못한 사람만 빼고 휴가가 돌아왔습니다. 중대장은 "규정대로 하자"고만 했습니다.', fx: { mind: 3 }, rel: { lt: -2 } };
        leaveCut(S, 3);
        return { t: '이의는 "지휘관 재량"이라는 한 줄로 돌아왔습니다. 휴가도 잃고, 이름도 알려졌습니다.', fx: { mind: -4 }, rel: { lt: -5 } };
      }
      leaveCut(S, 3);
      if (k === 'blame') return { t: fmt(S, '저녁 점호 뒤 {peer.name}에게 한마디 했습니다. {peer.name}은 아무 말도 하지 않았습니다. 휴가는 돌아오지 않았습니다.'), fx: { mind: -4 }, rel: { peer: -8 } };
      return { t: '받아들였습니다. 달력에 그려 둔 동그라미 세 개를 지웠습니다.', fx: { mind: -6 } };
    } }),

  R({ id: 'rel_officer_parade_fitness', kind: 'event', gap: 12, w: 1, src: 'relationship-events §4 [R46] 논문 · 가정',
    c: (S) => S.ym >= '2005' && S.rank >= 1,
    run: (S) => {
      const p = 0.15 + (S.train?.fitness ?? 0) / 150 + (S.st.fit - 50) / 200;
      if (roll(S, p)) { leaveAdd(S, 3); return { t: '중대장이 "특급이면 포상"을 걸었던 체력 측정. 마지막 바퀴에서 숨이 넘어가는 줄 알았지만 특급이 나왔습니다. 포상휴가 3일.', fx: { mind: 5 }, rel: { lt: 3 } }; }
      return { t: '중대장이 "특급이면 포상"을 걸었던 체력 측정. 팔굽혀펴기에서 세 개가 모자랐습니다. 다음 달에 다시 도전하기로 했습니다.', fx: { mind: -3, fit: 1 } };
    } }),

  R({ id: 'rel_officer_room_nightround', kind: 'event', gap: 8, w: 2, src: 'relationship-events §4 [R54] 썰 · [R47] 보도 (상담관 2005~)',
    c: (S) => S.st.mind <= 45 && calm(S),
    run: (S) => ({ t: S.ym >= '2014'
      ? '새벽, 잠 못 들고 복도에 나와 있는데 당직사관이 순찰을 돌다 멈췄습니다. "무슨 일 있냐." 몇 마디 털어놓았더니 다음 주에 상담관 면담을 잡아 주었습니다.'
      : '새벽, 잠 못 들고 복도에 나와 있는데 당직사관이 순찰을 돌다 멈췄습니다. "무슨 일 있냐." 몇 마디 털어놓았고, 그는 커피믹스 하나를 건네고 갔습니다.',
    fx: { mind: S.ym >= '2014' ? 6 : 4 }, rel: { lt: 3 } }) }),

  R({ id: 'rel_nco_room_phonecollect', kind: 'decision', max: 1, w: 2, p: 0.3, when: { era: ['e04', 'e05'] }, src: 'relationship-events §4 [R36][R37][R14] 보도',
    c: (S) => phoneOn(S) && here(S, 'peer'),
    build: (S) => ({
      title: '누가 안 냈나',
      who: 'sfc',
      body: fmt(S, '누군가 휴대폰 반납 시간을 어겼습니다. {sfc}이 생활관 전체의 휴대폰을 사흘간 걷겠다며 말합니다. "누군지 대면 그 사람만 걷는다." 나는 누군지 압니다. {peer.name}입니다.'),
      choices: [
        { k: 'name', label: '이름을 말한다', hint: '생활관은 산다 · 동기를 판다', rel: { nco: 1, peer: -2 } },
        { k: 'silent', label: '입을 다문다', hint: '사흘 동안 다 같이 폰 없음', rel: {} },
        { k: 'me', label: '"제가 그랬습니다"', hint: '동기를 덮는다 · 징계를 대신 받는다', rel: { peer: 2 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'name') return { t: fmt(S, '{peer.name}의 이름을 말했습니다. 다들 폰을 돌려받았고, {peer.name}만 사흘을 빈손으로 보냈습니다. 그 사흘 동안 나와 눈을 마주치지 않았습니다.'), fx: { mind: -3 }, rel: { sfc: 3, peer: -8 } };
      if (k === 'silent') return { t: '아무도 말하지 않았습니다. 사흘 동안 생활관에 옛날처럼 카드 게임과 수다가 돌아왔습니다. 좋기도 했고, 다들 조금 날카로웠습니다.', fx: { mind: -5 }, rel: { peer: 2 } };
      return roll(S, 0.3)
        ? { t: fmt(S, '"제가 그랬습니다." 휴가가 이틀 깎였습니다. {peer.name}이 밤에 와서 "왜 그랬냐"고만 했습니다.'), fx: { mind: -4 }, rel: { peer: 10 }, punish: { kind: 'leaveCut', n: 2 } }
        : { t: fmt(S, '"제가 그랬습니다." 사흘간 내 폰만 걷혔습니다. {peer.name}이 매일 밤 자기 폰을 슬쩍 빌려줬습니다.'), fx: { mind: -3 }, rel: { peer: 10 } };
    } }),

  // ── 가족·연인 (§5) ──
  R({ id: 'rel_family_diner_visitout', kind: 'decision', max: 1, w: 2, p: 0.35, when: { era: ['e01', 'e02', 'e03'] }, src: 'relationship-events §5 relationships [S_new_8] 썰 · 가정',
    c: (S) => S.rank <= 2,
    build: (S) => ({
      title: '면회외출, 마지막 30분',
      body: '부모님이 면회를 와서 네 시간 면회외출을 나왔습니다. 부대 앞 식당에서 고기를 굽다 보니 복귀까지 30분 남았습니다. 어머니가 "조금만 더 있다 가" 하십니다.',
      choices: [
        { k: 'stay', label: '조금만 더 있는다', hint: '어머니가 좋아하신다 · 지각할 수 있다', rel: { family: 1 } },
        { k: 'chicken', label: '생활관 몫 통닭을 사 들고 일찍 간다', hint: '선임들이 반긴다 · 돈과 시간을 쓴다', rel: { senior: 1, family: -1 } },
        { k: 'early', label: '바로 일어난다', hint: '안전하다 · 어머니 손이 아쉽다 · 빈손 복귀', rel: { family: -1, senior: -1 } },
      ],
    }),
    apply: (S, k) => {
      const base = { rel: { family: 10 }, fx: { mind: 8 } };
      if (k === 'stay') return roll(S, 0.25)
        ? { ...base, t: '"10분만"이 20분이 됐습니다. 위병소에 5분 늦게 도착했고 근신을 받았습니다. 그래도 어머니 얼굴은 오래 남았습니다.', fx: { mind: 4 }, rel: { family: 13 }, punish: { kind: 'confine' } }
        : { ...base, t: '10분을 더 있었습니다. 어머니는 내 손등을 계속 쓰다듬으셨습니다. 위병소에 1분 남기고 들어갔습니다.', fx: { mind: 7 }, rel: { family: 13 } };
      if (k === 'chicken') { spend(S, byEra(S, [15000, 20000, 25000, 25000, 25000])); return { t: '통닭 두 마리를 들고 들어갔습니다. 생활관 선임들이 처음으로 내 이름을 다정하게 불렀습니다. 어머니와는 위병소 앞에서 급하게 헤어졌습니다.', fx: { mind: 6 }, rel: { family: 8, roomSenior: 4 } }; }
      return { t: '바로 일어났습니다. 어머니가 차창 너머로 손을 흔드는 게 위병소 모퉁이를 돌 때까지 보였습니다. 빈손으로 들어온 나를 생활관 선임이 힐끔 쳐다봤습니다.', fx: { mind: 6 }, rel: { family: 8, roomSenior: -2 } };
    } }),

  R({ id: 'rel_family_visit_gop', kind: 'event', max: 1, w: 5, when: { era: ['e03', 'e04', 'e05'] }, src: 'relationship-events §5 [R28] 보도 (2014-08 GOP 근무병 면회 신설)',
    c: (S) => S.env.post === 'gop' && S.ym >= '2014-08' && !(S.ym >= '2020-02' && S.ym < '2022-04'),
    run: (S) => ({ t: '철책 근무에 올라와 처음으로 면회가 허용됐습니다. 부모님이 2주 전에 신청서를 냈다고 했습니다. 면회실 창밖으로 철책이 보였고, 아버지는 그쪽을 한참 쳐다보셨습니다. 내 근무는 동기가 대신 섰습니다.',
      fx: { mind: 8 }, rel: { family: 12, peer: -2 } }) }),

  R({ id: 'rel_family_office_weekday', kind: 'decision', max: 1, w: 2, p: 0.3, when: { era: ['e03'] }, src: 'relationship-events §5 [R27] 보도 (2014-09 평일 면회)',
    c: (S) => S.rank <= 1 && S.ym >= '2014-09' && here(S, 'roomSenior'),
    build: (S) => ({
      title: '평일 면회 신청서',
      body: fmt(S, '평일 저녁 면회가 생겼습니다. 부모님이 이번 주 수요일에 오고 싶다고 합니다. 신청서를 들고 행정반 앞에 섰는데, 뒤에서 {roomSenior.name}이 "이등병이 평일 면회?"라고 중얼거립니다.'),
      choices: [
        { k: 'apply', label: '신청서를 낸다', hint: '부모님을 만난다 · 선임 눈치', rel: { family: 1, senior: -1 } },
        { k: 'drop', label: '주말로 미루자고 한다', hint: '조용하다 · 부모님이 서운해한다', rel: { family: -1 } },
      ],
    }),
    apply: (S, k) => k === 'apply'
      ? { t: '신청서를 냈습니다. 수요일 저녁 면회실에서 어머니가 싸 온 김밥을 먹었습니다. 돌아오니 내 침상 모포가 다시 개어져 있었습니다. 누가 그랬는지는 묻지 않았습니다.', fx: { mind: 5 }, rel: { family: 8, roomSenior: -4 } }
      : { t: '"주말에 오세요." 수화기 너머 어머니가 "그래, 그래" 하셨는데, 두 번 말하실 때는 서운하실 때입니다.', fx: { mind: -2 }, rel: { family: -3 } } }),

  R({ id: 'rel_family_parade_noceremony', kind: 'event', max: 1, w: 6, when: { phase: ['train'], era: ['e04'] }, src: 'relationship-events §5 [R40] 보도 (2020-02 수료식 가족 초청 금지)',
    c: (S) => S.ym >= '2020-02' && S.ym < '2022-04',
    run: () => ({ t: '수료식에 가족이 올 수 없었습니다. 연병장엔 동기들뿐이었고, 대신 30초짜리 영상 편지를 찍었습니다. 카메라 앞에서 "건강하게 잘 있다"는 말만 세 번 했습니다.', fx: { mind: -5 }, rel: { family: 4 } }) }),

  R({ id: 'rel_family_home_covidurgent', kind: 'decision', max: 1, w: 2, p: 0.1, when: { era: ['e04', 'e05'] }, src: 'relationship-events §5 [R6][R7] 보도 (휴가 통제 중 청원휴가 예외)',
    c: (S) => S.ym >= '2020-02' && S.ym < '2022-04' && !S.flags.n_bond_funeral_leave,
    build: (S) => ({
      title: '할머니가 위독하시다',
      who: { name: '부모님', rel: S.bonds?.family ?? null },
      body: '휴가가 전부 막힌 지 몇 달째, 집에서 연락이 왔습니다. 할머니가 위독하시답니다. 청원휴가는 나갈 수 있지만, 복귀하면 2주를 격리실에서 보내야 하고 그동안 내 근무는 동기들이 나눠 섭니다.',
      choices: [
        { k: 'go', label: '청원휴가를 낸다', hint: '할머니를 뵙는다 · 격리 2주, 동기들의 짐', rel: { family: 2, peer: -1 } },
        { k: 'stay', label: '영상통화로 대신한다', hint: '부대엔 짐이 안 된다 · 평생 남는다', rel: { family: -2 } },
      ],
    }),
    apply: (S, k) => k === 'go'
      ? { t: '청원휴가를 나갔습니다. 할머니는 내 손을 알아보셨습니다. 복귀 뒤 격리실 2주는 길었고, 문 밑으로 동기들이 과자를 밀어 넣어 줬습니다.', fx: { mind: -4 }, rel: { family: 10, peer: -3 } }
      : { t: '영상통화 화면 속 할머니는 나를 알아보지 못하셨습니다. 통화를 끊고 한참 화장실에 있었습니다.', fx: { mind: -10 }, rel: { family: -10 } } }),

  R({ id: 'rel_family_room_sendhome', kind: 'decision', max: 1, w: 2, p: 0.3, when: { era: ['e05'] }, src: 'relationship-events §5 [R38][R39] 보도 · 가정',
    c: (S) => S.rank >= 2 && S.money.cash >= 300000,
    build: (S) => ({
      title: '월급이 백만 원을 넘었다',
      body: '통장에 찍힌 월급이 백만 원을 넘었습니다. 입대 전엔 용돈을 받던 쪽이었습니다. 부모님께 조금 보낼까, 적금을 채울까.',
      choices: [
        { k: 'send', label: '30만 원을 보낸다', hint: '처음으로 드리는 돈 · 전역 자금이 준다', rel: { family: 2 } },
        { k: 'save', label: '내 미래에 넣는다', hint: '전역 때 목돈 · 마음 한쪽이 걸린다', rel: {} },
      ],
    }),
    apply: (S, k) => {
      if (k === 'send') { spend(S, 300000); return { t: '30만 원을 보냈습니다. 아버지에게서 "이런 거 하지 마라"는 문자가 왔고, 5분 뒤 "고맙다"가 따로 왔습니다.', fx: { mind: 3 }, rel: { family: 8 } }; }
      return { t: '보내지 않았습니다. 통화 중에 말을 꺼냈더니 어머니가 "너 써, 너 나와서 써"라고 하셨습니다. 그 말이 오래 마음에 걸렸습니다.', fx: { mind: -1 }, rel: { family: 1 } };
    } }),

  R({ id: 'rel_lover_room_callquota', kind: 'decision', max: 1, w: 2, p: 0.35, when: { era: ['e04', 'e05'] }, src: 'relationship-events §5 [R36] 보도 · relationships [S_new_7] 썰',
    c: (S) => phoneOn(S) && S.bonds?.lover != null,
    build: () => ({
      title: '매일 9시 전에',
      body: '휴대폰을 쓸 수 있게 되자 그녀가 약속을 하자고 합니다. "매일 9시 전에 꼭 전화해. 하루도 빠짐없이." 다음 주는 야간 훈련 주간입니다.',
      choices: [
        { k: 'promise', label: '약속한다', hint: '매일 이어진다 · 못 지키는 날이 생긴다', rel: { lover: 2 } },
        { k: 'weekend', label: '"주말 영상통화로 하자"', hint: '현실적 · 그녀가 서운해한다', rel: { lover: -1 } },
      ],
    }),
    apply: (S, k) => k === 'promise'
      ? { t: '약속했습니다. 훈련 주간 사흘째 밤, 9시 2분에 전화를 걸었습니다. 그녀는 "2분 늦었네" 하고 웃었는데, 나는 웃지 못했습니다.', fx: { mind: -3 }, rel: { lover: 8 } }
      : { t: '"주말에 길게 하자." 한참 답이 없다가 "그래"가 왔습니다. 마침표가 찍혀 있었습니다.', fx: { mind: -1 }, rel: { lover: -5 } } }),

  R({ id: 'rel_lover_room_breakup', kind: 'decision', max: 1, w: 2, src: 'relationship-events §5 [R55][R15][R47] 보도 · bond_gomusin_breakup 뒤',
    c: (S) => { const t = S.flags.last_bond_gomusin_breakup; return S.bonds?.lover == null && !!t && t < S.ym && t >= shiftMonth(S.ym, -2) && here(S, 'peer'); }, // 헤어진 지 한두 달
    build: (S) => ({
      title: '누구에게 말할까',
      who: 'lt',
      body: fmt(S, '헤어지고 며칠, 밥이 잘 안 넘어갑니다. {lt.name}이 "요즘 얼굴이 왜 그러냐"고 묻고, {peer.name}은 아무것도 묻지 않고 옆에 앉아 있습니다.'),
      choices: [
        { k: 'officer', label: '소대장에게 털어놓는다', hint: `${S.ym >= '2005' ? '상담관이 붙는다' : '면담이 잡힌다'} · 관심 대상이 될 수 있다`, rel: { officer: 1 } },
        { k: 'peer', label: '동기에게만 말한다', hint: '편하다 · 밤이 길다', rel: { peer: 1 } },
        { k: 'alone', label: '혼자 삭인다', hint: '아무도 모른다 · 무겁다', rel: {} },
      ],
    }),
    apply: (S, k) => {
      if (k === 'officer') return roll(S, 0.4)
        ? { t: '소대장에게 털어놓았습니다. 상담을 받았고, 한동안 근무에서 빠졌습니다. 고마웠지만 생활관에서 나를 보는 눈이 조금 조심스러워졌습니다.', fx: { mind: 3, fit: 1 }, rel: { lt: 3, peer: -3 } }
        : { t: '소대장에게 털어놓았습니다. 상담 두 번에 생각보다 많이 가벼워졌습니다.', fx: { mind: 5 }, rel: { lt: 3 } };
      if (k === 'peer') return { t: fmt(S, '{peer.name}에게만 말했습니다. 그날 밤 불침번을 바꿔서 같이 섰습니다. 별 얘기는 안 했습니다.'), fx: { mind: -5 }, rel: { peer: 5 } };
      return { t: '아무에게도 말하지 않았습니다. 일과는 똑같이 흘러갔고, 나만 조금 느리게 걸었습니다.', fx: { mind: -10 } };
    } }),

  // ── 외부인 (§6) ──
  R({ id: 'rel_civ_diner_owner', kind: 'event', max: 1, w: 2, src: 'relationship-events §6 [R49] 썰 · [R12][R25] 보도',
    c: (S) => S.rank >= 2 && calm(S),
    run: (S) => ({ t: era(S) === 'e04'
      ? '복귀하는 날 부대 앞 식당 사장님이 봉지를 쥐여 줬습니다. "요즘 애들이 통 안 나와서 남았어. 들어가서 나눠 먹어." 가게 안이 텅 비어 있었습니다.'
      : '복귀하는 날 부대 앞 식당 사장님이 봉지를 쥐여 줬습니다. "애들이랑 나눠 먹어라." 생활관에 풀어 놓으니 순식간에 없어졌습니다.',
    fx: { mind: 4 }, rel: { peer: 3, junior: 3 } }) }),

  R({ id: 'rel_civ_base_daemin', kind: 'decision', max: 1, w: 2, p: 0.25, when: { months: [5, 6, 7, 8, 9, 10] }, src: 'relationship-events §6 [R21][R22][R23] 보도',
    c: (S) => S.branch === 'army' || S.branch === 'marine',
    build: (S) => ({
      title: '할머니의 봉투',
      body: `${[7, 8, 9].includes(+S.ym.slice(5)) ? '수해 복구' : '농촌 일손 돕기'} 대민지원. 하루 종일 일하고 나니 할머니가 새참과 함께 막걸리 한 병, 그리고 흰 봉투를 내미십니다. "고생했어, 이거 받아."${era(S) === 'e05' ? ' 오늘은 구명조끼와 보험 이야기부터 듣고 나왔습니다.' : ''}`,
      choices: [
        { k: 'snack', label: '새참만 받는다', hint: '정중하다 · 할머니가 서운해한다', rel: { civ: 1 } },
        { k: 'drink', label: '막걸리 한 잔만', hint: '거절하기 어렵다 · 근무 중 음주다', rel: { civ: 2 } },
        { k: 'envelope', label: '봉투까지 받는다', hint: '할머니 마음 · 들키면 징계', rel: { civ: 2 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'snack') return { t: '새참만 받고 봉투는 손사래를 쳤습니다. 할머니가 "그럼 이거라도" 하며 옥수수를 한 봉지 더 쥐여 주셨습니다.', fx: { fit: -3, mind: 4 } };
      if (k === 'drink') return roll(S, 0.1)
        ? { t: '한 잔이 두 잔이 됐고, 복귀 차량에서 간부에게 냄새를 들켰습니다. 견책.', fx: { fit: -3, mind: -2 }, punish: { kind: 'reprimand' } }
        : { t: '한 잔만 받았습니다. 할머니가 "우리 손주도 군대 갔어" 하셨습니다.', fx: { fit: -3, mind: 6 } };
      if (roll(S, 0.15)) return { t: '봉투 이야기가 결국 대대까지 올라갔습니다. 돌려드리러 다시 마을에 갔고, 휴가가 사흘 깎였습니다.', fx: { fit: -3, mind: -6 }, punish: { kind: 'leaveCut', n: 3 } };
      S.money.cash += 30000;
      return { t: '봉투에는 3만 원이 들어 있었습니다. 동기들과 PX에서 나눠 썼는데, 이상하게 다 쓰고 나서 마음이 무거웠습니다.', fx: { fit: -3, mind: -1 } };
    } }),

  R({ id: 'rel_civ_room_letter', kind: 'decision', max: 1, w: 2, when: { era: ['e05'] }, src: 'relationship-events §6 [R4][R5] 보도 (2022-01 위문편지 논란)',
    c: (S) => S.ym >= '2022-01' && S.ym <= '2022-03' && here(S, 'peer') && !S.flags.n_lore_school_letter,
    build: (S) => ({
      title: '비꼬는 위문편지',
      body: fmt(S, '단체로 온 위문편지 중 하나가 노골적으로 비꼬는 내용입니다. {peer.name}이 "이거 커뮤니티에 올리자, 다들 봐야 돼"라고 합니다. 뉴스에서도 비슷한 이야기가 한창입니다.'),
      choices: [
        { k: 'laugh', label: '웃고 넘긴다', hint: '쓴 사람도 학생이다 · 찜찜하다', rel: {} },
        { k: 'post', label: '같이 올린다', hint: '속은 시원하다 · 논란이 커질 수 있다', rel: { peer: 1 } },
        { k: 'reply', label: '정중한 답장을 쓴다', hint: '어른스럽다 · 시간이 든다', rel: { civ: 1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'laugh') return { t: '웃고 넘겼습니다. 억지로 쓴 편지였을 겁니다. 그래도 그 문장은 며칠 머릿속을 맴돌았습니다.', fx: { mind: -1 } };
      if (k === 'post') return roll(S, 0.05)
        ? { t: '올린 사진에 부대 정보가 찍혀 있었습니다. 품위·보안 위반으로 견책을 받았습니다.', fx: { mind: -6 }, rel: { peer: 3 }, punish: { kind: 'reprimand' } }
        : { t: '올렸고, 하루 만에 퍼졌습니다. 댓글 싸움을 보다가 오히려 마음이 더 상했습니다.', fx: { mind: -4 }, rel: { peer: 3 } };
      return { t: '"억지로 쓰게 해서 미안하다, 공부 열심히 해라." 답장을 썼습니다. 한 시간이 걸렸고, 쓰고 나니 마음이 가벼워졌습니다.', fx: { mind: 2, fit: -1 } };
    } }),

  R({ id: 'rel_civ_px_proxy', kind: 'decision', max: 1, w: 2, p: 0.25, when: { era: ['e04', 'e05'] }, src: 'relationship-events §6 [R34] 보도',
    c: (S) => phoneOn(S) && where(S) !== 'sea',
    build: () => ({
      title: 'PX 화장품 다섯 개만',
      body: '오래 연락 없던 지인에게서 메시지가 왔습니다. "PX 달팽이크림 다섯 개만 사다 줘. 돈 줄게." 시중가의 몇 분의 일 값입니다. 되팔이는 처벌 대상이라는 공지를 본 적이 있습니다.',
      choices: [
        { k: 'one', label: '한두 개만 사 준다', hint: '본인 쓸 만큼 · 아쉬워한다', rel: { civ: 1 } },
        { k: 'five', label: '다섯 개 다 사 준다', hint: '반가워한다 · 되팔이로 의심받을 수 있다', rel: { civ: 2 } },
        { k: 'no', label: '거절한다', hint: '규정대로 · 서운한 소리를 듣는다', rel: { civ: -1 } },
      ],
    }),
    apply: (S, k) => {
      if (k === 'one') { spend(S, 16000); return { t: '두 개만 사서 보냈습니다. "겨우 두 개?"라는 답이 왔습니다.', fx: { mind: -1 } }; }
      if (k === 'five') { spend(S, 40000); return roll(S, 0.15)
        ? { t: '다섯 개를 한꺼번에 사다 PX 관리관 눈에 띄었습니다. 되팔이 의심으로 조사를 받고 견책을 받았습니다.', fx: { mind: -6 }, punish: { kind: 'reprimand' } }
        : { t: '다섯 개를 보냈습니다. 돈은 일주일 뒤에야 들어왔고, 그 뒤로 다시 연락은 없었습니다.', fx: { mind: -2 } }; }
      return { t: '"규정상 안 돼." 답장 대신 "군인이 뭐 대단하다고"라는 말이 돌아왔습니다. 그 지인은 대화방에서 나갔습니다.', fx: { mind: -3 } };
    } }),

  R({ id: 'rel_civ_fence_noshow', kind: 'event', max: 1, w: 4, when: { era: ['e05'] }, src: 'relationship-events §6 [R41][R42] 보도 (2025 군인 사칭 노쇼, 1303 진위 확인)',
    c: (S) => S.ym >= '2025-01',
    run: () => ({ t: '부대 앞 식당 사장님이 위병소에 찾아왔습니다. "○○부대 간부"라는 사람이 단체 주문을 해 놓고 나타나지 않았다고 했습니다. 행정반이 1303 진위 확인 창구를 알려 드렸습니다. 사장님은 "군인이 그럴 리 없다고 믿었는데"라며 돌아갔습니다.', fx: { mind: -2 } }) }),
];

// ── 되부르기: 관계 사건이 남긴 흔적을 사람의 생애 주기 순간에 불러온다 (echoes.js 형식, events.js가 붙인다) ──
const F = (txt) => (S) => fmt(S, txt);
export const REL_ECHOES = {
  p_junior_in: [
    { needs: 'owe_px', add: '선임이 사 줬던 냉동 만두가 생각났습니다. "나중에 너도 후임한테 사 줘라." 이번엔 내 차례입니다.' },
    { needs: 'buddy', add: F('옆에서 {peer.name}이 "우리도 저랬냐"며 웃었습니다. 고향에서부터 같이 온 사이라 둘 다 저랬다는 걸 압니다.') },
  ],
  p_senior_out: [
    { needs: 'senior_iou', add: '그에게 진 빚은 끝내 다 갚지 못했습니다. 위병소 앞에서 "연락드리겠습니다"로 대신했습니다.' },
    { needs: 'squad_leader', add: '분대장 견장이 갑자기 무거워졌습니다. 이제 위에서 막아 줄 사람이 없습니다.' },
  ],
  p_roomsenior_out: [
    { needs: 'reporter', add: '내가 신고했던 일을 그는 끝까지 입에 올리지 않았습니다. 마지막 악수도 하지 않았습니다.' },
    { needs: 'abuse_line', add: '그가 시키는 대로 했던 날들이 떠올랐습니다. 이제 시킬 사람은 없고, 한 일만 남았습니다.' },
    { needs: 'kept_company', add: '"없는 사람"이던 그 동기와 나란히 서서 배웅했습니다. 둘 다 아무 말도 하지 않았습니다.' },
  ],
  p_junior_thanks: [
    { needs: 'junior_trained', add: F('{junior.name}의 수첩에는 아직 내가 불러 준 인수인계 목록이 적혀 있다고 했습니다.') },
  ],
  p_peer_payback: [
    { needs: 'buddy', add: '고향 친구라서가 아니라, 같은 생활관에서 버틴 사이라서였습니다.' },
  ],
  // 관계 사건이 훈련소·앞선 사건의 흔적을 읽는다
  rel_family_diner_visitout: [{ needs: 'grad_family', add: '수료식 날 연병장 끝에서 손을 흔들던 그 얼굴이 맞은편에 있었습니다.' }],
  rel_family_office_weekday: [{ needs: 'grad_family', add: '수료식 때 다음엔 더 자주 오겠다던 약속을 부모님은 잊지 않고 계셨습니다.' }],
  rel_lover_room_callquota: [{ needs: 'grad_lover', add: '수료식 날 꽃다발을 들고 왔던 사람의 부탁이었습니다.' }],
  rel_peer_room_love: [{ needs: 'grad_lover', add: '수료식 날 내 꽃다발을 부러워하던 게 {peer.name}이었습니다. 그때는 둘 다 그게 영원할 줄 알았습니다.' }],
  rel_junior_room_counsel: [{ needs: 'grad_lover', add: '수료식 날 받았던 꽃다발이 생각났습니다. 남의 일 같지 않았습니다.' }, { needs: 'letter_lover', add: '나도 그런 편지를 기다리던 밤이 있었습니다.' }],
  rel_peer_hill_award: [{ needs: 'rifle_ace', add: '훈련소 사격 1등 하던 감이 아직 손에 남아 있었습니다.' }, { needs: 'rifle_poor', add: '훈련소에서 사격을 망쳤던 내가 특등사수 동점이라니, 나도 믿기지 않았습니다.' }],
  rel_officer_parade_fitness: [{ needs: 'march_strong', add: '훈련소 행군을 완주한 다리가 아직 기억하고 있었습니다.' }, { needs: 'march_dropout', add: '훈련소 행군에서 낙오했던 날이 마지막 바퀴 내내 떠올랐습니다.' }],
  rel_junior_base_lost: [{ needs: 'carried', add: F('행군 때 군장을 대신 메 줬던 일을 {junior.name}도 기억하고 있었습니다.') }],
  rel_junior_room_order: [{ needs: 'group_punish', add: '단체로 얼차려 받던 밤이 떠올랐습니다. 그때 시킨 사람도 같은 말을 했습니다.' }],
  rel_senior_room_memorize: [{ needs: 'group_punish', add: '지난번 단체 얼차려가 이 종이 한 장에서 시작됐다는 걸 다들 알고 있었습니다.' }],
  rel_peer_office_squadrace: [{ needs: 'boot_quiet', add: '훈련소에서 손을 들지 않았던 날, 근질거리던 손바닥이 생각났습니다.' }, { needs: 'boot_squad_leader', add: '훈련소 분대장 하던 버릇이 아직 목소리에 남아 있었습니다.' }],
  rel_officer_office_squadlead: [{ needs: 'boot_quiet', add: '훈련소에서 가만히 있다가 놓친 자리가 이렇게 다시 왔습니다.' }, { needs: 'boot_squad_leader', add: '훈련소에서 분대장을 해 본 게 소대장 귀에도 들어가 있었습니다.' }],
  rel_officer_office_interview: [{ needs: 'group_punish', add: '단체 얼차려 얘기를 꺼낼지 말지, 면담 내내 그 생각만 했습니다.' }],
};
