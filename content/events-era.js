// events-era.js — 시대 한정 장면·딜레마 (docs/05 G2·G4, research/era-culture.md §7)
// 시대 구간 e01 ~2004 / e02 2005~2013 / e03 2014~2017 / e04 2018~2021 / e05 2022~ (rules/era.json). when.era로 거른다.
// 부조리 계열은 p가 S.env.abuse에 비례 → 옛 시대·나쁜 부대일수록 자주. 확률·효과는 전부 '가정', 장면 소품 일부는 research §9 미확인 항목(연출용).
// 무거운 결정(소원수리·기수열외·암기 강요·단톡 따돌림·관심병사)은 help: HELP. 부조리는 구경거리로 쓰지 않는다 — 당하는 쪽·보는 쪽·물려주는 쪽 모두 값을 치른다.
import { rand, here, where } from '../src/engine.js';
import { fmt, HELP } from './events.js';

const roll = (S, p) => rand(S) < p;
const ab = (S, lo, hi) => lo + ((hi - lo) * S.env.abuse) / 100; // 부조리 지수 0~100 → lo~hi
const ymNum = (ym) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
const since = (S, mark, n) => !!S.marks[mark] && ymNum(S.ym) - ymNum(S.marks[mark].ym) >= n; // 흔적이 남은 지 n개월
const between = (S, a, b) => S.ym >= a && S.ym <= b;
const boss = (S) => (here(S, 'roomSenior') ? 'roomSenior' : here(S, 'senior') ? 'senior' : null);
const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`;

// 한 판에 시대 장면이 대략 4~8개 나오도록 후보가 될 확률(p)을 한 번 더 누른다. 흔적을 읽는 후속(needs)은 덜 누른다.
// 이 곱셈 계수(GATE)가 시대 장면의 전체 빈도 손잡이다 — 개별 p(ab 등)는 부조리 지수에 따른 상대 차이만 말한다
const GATE = { event: 0.6, decision: 0.5, follow: 0.85 };
const WSCALE = { event: 0.2, decision: 0.17 };
const gated = (e, g, k) => ({ ...e, w: (e.w ?? 3) * (e.needs ? 1 : WSCALE[k]), p: typeof e.p === 'function' ? (S) => g * e.p(S) : g * (e.p ?? 1) });
const E = (era, e) => ({ kind: 'event', src: '가정', max: 1, ...gated(e, e.needs ? GATE.follow : GATE.event, 'event'), when: { phase: ['serve'], era: [era], ...e.when } });
const D = (era, e) => ({ kind: 'decision', src: '가정', ...gated({ p: 0.5, ...e }, e.needs ? GATE.follow : GATE.decision, 'decision'), when: { phase: ['serve'], era: [era], ...e.when } });

export const ERA_EVENTS = [
  // ═══════════════ e01 ~2004 — 침상·호봉·공중전화 ═══════════════
  E('e01', { id: 'era_e1_phonebooth', src: 'era-culture §7-E1-1 [S_cul_2]', w: 3,
    run: () => ({ t: '저녁 일곱 시, 전화 부스 앞에 줄이 열 명입니다. 앞사람이 오 분을 넘기자 뒤에서 헛기침이 시작됐습니다. 내 차례는 허용 시간이 삼십 분 남았을 때 왔습니다. 동전은 있었는데, 할 말은 줄 서 있는 동안 다 써 버렸습니다.', fx: { mind: -2 } }) }),

  E('e01', { id: 'era_e1_70won', src: 'era-culture §7-E1-2 [S_cul_38]', w: 3,
    run: (S) => S.bonds?.lover != null
      ? { t: '삼 분에 칠십 원. 이십 초 남았을 때 "사랑한다"를 말하고 끊었습니다. 둘 다 어색해서 웃었습니다.', fx: { mind: 5 } }
      : { t: '삼 분에 칠십 원. 어머니는 "밥은 먹었냐"를 세 번 물으셨고 나는 "괜찮다"를 네 번 했습니다. 남은 이십 초에 한 말은 "끊을게"였습니다.', fx: { mind: 4 } } }),

  E('e01', { id: 'era_e1_collect', src: 'era-culture §7-E1-3 [S_cul_25]', w: 2,
    run: (S) => S.bonds?.lover != null
      ? { t: '소포 안에 전화카드가 들어 있었습니다. 편지에는 "이거 쓰고 콜렉트콜로는 걸지 마"라고만 적혀 있었습니다. 요금 고지서가 그녀의 집으로 날아간 모양이었습니다.', fx: { mind: 2 } }
      : { t: '집으로 건 콜렉트콜의 고지서가 아버지 손에 들어갔다고 합니다. 며칠 뒤 전화카드가 소포로 왔습니다. 겉봉에는 "아껴 써"가 적혀 있었고, 카드 뒷면에는 그보다 작게 "사랑한다"가 적혀 있었습니다.', fx: { mind: 3 } } }),

  E('e01', { id: 'era_e1_remote', src: 'era-culture §7-E1-4 [S_cul_7]', w: 3, p: (S) => ab(S, 0.25, 0.9),
    c: (S) => S.rank <= 1 && here(S, 'roomSenior'),
    run: (S) => ({ t: fmt(S, '{roomSenior}이 턱짓만 해도 나는 TV 앞에 서 있었습니다. 11번, 7번, 다시 11번. 이 방에서 내가 제일 많이 본 건 드라마가 아니라 채널 번호였습니다.'), fx: { mind: -2 } }) }),

  E('e01', { id: 'era_e1_sleepin', src: 'era-culture §7-E1-5 [S_cul_7]', w: 3, p: (S) => ab(S, 0.25, 0.9),
    c: (S) => S.rank <= 2 && here(S, 'roomSenior'),
    run: () => ({ t: '기상나팔이 울렸습니다. 말년 병장 자리는 이불이 봉긋했습니다. 우리는 연병장으로 나갔습니다. 인원 보고는 한 명 많게 나갔습니다.', fx: { mind: -2, fit: -1 } }) }),

  E('e01', { id: 'era_e1_nine', src: 'era-culture §7-E1-6 [S_cul_5]', w: 3, p: (S) => ab(S, 0.2, 0.9),
    c: (S) => S.rank <= 2,
    run: () => ({ t: '오늘 집합이 벌써 일곱 번째입니다. 누가 불렀는지는 아무도 몰랐습니다. 일단 뛰었습니다. 여덟 번째가 불리기 전에 저녁이 끝나기를 빌었습니다.', fx: { fit: -3, mind: -3 } }) }),

  E('e01', { id: 'era_e1_malhobong', src: 'era-culture §7-E1-7 [S_cul_5]', w: 3, p: (S) => ab(S, 0.25, 0.85),
    c: (S) => S.rank <= 2 && here(S, 'senior') && here(S, 'roomSenior'),
    run: (S) => ({ t: fmt(S, '{roomSenior.name}은 말이 없었습니다. 대신 {senior.name}이 "애들이 이래서 되겠냐"며 화를 냈습니다. 화의 출처는 저쪽 침상 끝에 누워 있는 사람이었습니다.'), fx: { mind: -4 }, rel: { senior: -2 } }) }),

  E('e01', { id: 'era_e1_iron', src: 'era-culture §7-E1-8 [S_cul_42][S_cul_44]', w: 2,
    c: (S) => S.rank <= 1 && S.branch !== 'navy',
    run: () => ({ t: '일병 때 처음 다림질을 배웠습니다. 선임이 "바지는 칼이다"라고 했습니다. 수건 위로, 분무기, 숨은 참고. 소매를 태우고 나서야 그 말을 알아들었습니다. 새 전투복은 보급까지 반 년이 걸린다고 했습니다.', fx: { skill: 2, mind: -3 } }) }),

  E('e01', { id: 'era_e1_payday', src: 'era-culture §7-E1-9 [S_cul_38]', w: 3,
    run: () => ({ t: '월급날 PX 줄이 깁니다. 라면 하나, 초코파이 하나. 월급봉투는 얇은데 마음은 불었습니다. 다 쓰는 데 십 분이 걸렸고, 즐거움은 이틀을 갔습니다.', fx: { mind: 4 } }) }),

  E('e01', { id: 'era_e1_hobong', src: 'era-culture §7-E1-10 [S_cul_5] (월 단위 24단계 호봉은 한 부대 사례)', w: 2, p: (S) => ab(S, 0.3, 0.9),
    c: (S) => S.rank <= 2,
    run: () => ({ t: '나는 삼월 호봉, 옆 소대 그 녀석은 사월 호봉입니다. 한 달 차이로 말투가 갈렸습니다. 같은 날 같은 짬밥을 먹는데, 숟가락 드는 순서는 달력이 정했습니다.', fx: { mind: -2 } }) }),

  E('e01', { id: 'era_e1_shovel', src: 'era-culture §7-E1-10 [S_cul_18] (삽질: 90년대~2000년대 초)', w: 2, p: (S) => ab(S, 0.3, 0.8),
    c: (S) => S.branch !== 'navy' && S.branch !== 'airforce',
    run: () => ({ t: '아침부터 삽질이었습니다. 구덩이를 파고, 점심을 먹고, 다시 메웠습니다. 나라시를 하는 동안 아무도 이유를 묻지 않았습니다. 구덩이가 왜 필요했는지는 지금도 모릅니다.', fx: { fit: -4, mind: -2 } }) }),

  // 되부르기: 채널을 돌려 준 이가 리모컨을 쥘 때
  E('e01', { id: 'era_e1_tv_wanggo', src: 'era-culture §7-E1 딜레마1 후속 [S_cul_7]', w: 5, needs: 'era_tv_obey',
    c: (S) => S.rank >= 3,
    run: (S) => ({ t: '이제 리모컨이 내 옆에 놓여 있습니다. 막내가 TV 옆으로 걸어가 서려는 걸 봤습니다. 입이 먼저 "앉아"라고 했는데, 귓속에서는 "11번"이 들렸습니다. 리모컨을 쥐고서야 그 방의 채널이 얼마나 무거웠는지 알았습니다.',
      fx: { mind: 5 }, rel: { junior: 6 } }) }),

  E('e01', { id: 'era_e1_tv_peer_back', src: 'era-culture §7-E1 딜레마1 후속 [S_cul_7]', w: 5, needs: 'era_tv_peer',
    c: (S) => since(S, 'era_tv_peer', 3) && here(S, 'peer'),
    run: (S) => ({ t: fmt(S, '{peer.name}이 PX 줄을 대신 서 주며 말했습니다. "그날 크레딧 값이다." 초코파이는 두 개였습니다.'), fx: { mind: 6 }, rel: { peer: 6 } }) }),

  E('e01', { id: 'era_e1_bank_back', src: 'era-culture §7-E1 딜레마2 후속 [S_cul_2]', w: 5, needs: 'era_bank',
    c: (S) => S.monthsLeft != null && S.monthsLeft <= 1,
    run: () => ({ t: '행보관이 중대 부대통장을 열었습니다. 면회 때마다 맡긴 돈이 한 번에 손에 쥐어졌습니다. 숫자보다 먼저, 그 숫자를 건네던 어머니 손이 떠올랐습니다.', fx: { mind: 7 } }) }),

  E('e01', { id: 'era_e1_vented_echo', src: 'era-culture §7-E1 딜레마4 후속 [S_cul_14 구조]', w: 5, needs: 'era_vented',
    c: (S) => since(S, 'era_vented', 2) && here(S, 'junior'),
    run: (S) => ({ t: fmt(S, '세탁실에서 {junior.name}이 누군가를 흉내 내고 있었습니다. "너 뭘 봐?" 억양이 낯익었습니다. 나를 보더니 그대로 얼어붙었습니다.'), fx: { mind: -5 }, rel: { junior: -3 } }) }),

  // ── e01 딜레마 ──
  D('e01', { id: 'era_e1_channel', src: 'era-culture §7-E1 딜레마1 [S_cul_7]', w: 4,
    c: (S) => S.rank <= 1 && here(S, 'roomSenior') && here(S, 'peer'),
    build: (S) => ({
      title: '채널 번호',
      body: fmt(S, '일요일 밤, {peer.name}이 보던 프로가 막 클라이맥스입니다. 그때 {roomSenior}이 말합니다. "야, 11번 돌려라." TV 옆에 서 있는 건 나뿐입니다.'),
      choices: [
        { k: 'obey', label: '11번으로 돌린다', hint: '선임 비위는 맞춘다 · 동기가 등을 돌린다' },
        { k: 'peer', label: '"잠깐만 보고 돌리겠습니다"', hint: '동기는 고마워한다 · 선임이 벼른다' },
        { k: 'stall', label: '안테나를 만지작거리며 시간을 끈다', hint: '둘 다 반쯤 눈치챈다 · 아무도 만족하지 않는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'obey') return { t: fmt(S, '11번으로 돌렸습니다. {peer.name}은 말없이 이불을 끌어당겨 돌아누웠습니다. 그날 이후 그는 TV 쪽을 보지 않았습니다.'), fx: { mind: -4 }, rel: { roomSenior: 5, peer: -12 }, mark: { set: { era_tv_obey: {} } } };
      if (k === 'peer') return { t: fmt(S, '"잠깐만"이 끝나기도 전에 {roomSenior.name}의 눈썹이 올라갔습니다. 엔딩 크레딧까지 버텼고, 크레딧이 끝나자 집합이 걸렸습니다. 소등 후 {peer.name}이 내 손에 초코파이를 쥐여 줬습니다.'),
        fx: { fit: -4, mind: -3 }, rel: { roomSenior: -15, peer: 15 }, mark: { set: { era_tv_peer: {} } } };
      return { t: fmt(S, '"채널이 안 잡힙니다"를 두 번 말했습니다. {roomSenior.name}이 직접 와서 한 번에 돌렸습니다. 그 한 번에 모든 게 들켰습니다.'), fx: { mind: -3 }, rel: { roomSenior: -8, peer: -3 } };
    } }),

  D('e01', { id: 'era_e1_visit_money', src: 'era-culture §7-E1 딜레마2 [S_cul_2][S_cul_38]', w: 3,
    c: (S) => S.rank <= 2,
    build: () => ({
      title: '면회 용돈',
      body: '일요일 면회. 어머니가 접힌 지폐를 손에 쥐여 주셨습니다. 원칙은 중대 부대통장에 맡기는 것이고, 돌려받는 날은 전역일입니다. 월급은 라면 몇 개면 끝납니다.',
      choices: [
        { k: 'spend', label: '몰래 PX에서 쓴다', hint: '라면과 과자가 생긴다 · "집이 사는 놈"이라는 눈초리를 받는다' },
        { k: 'bank', label: '부대통장에 맡긴다', hint: '규정대로 · 전역 날까지 PX는 못 간다' },
        { k: 'share', label: '생활관에 한 턱 쏜다', hint: '인심은 얻는다 · 다음 달에도 기대한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'spend') return { t: '그날 밤 뽀글이를 끓였습니다. 냄새는 숨길 수 없었습니다. 한 젓가락씩 나눠 줄 순 있어도 "집에서 보내 주니 좋겠다"는 말은 나눠 줄 수 없었습니다.', fx: { mind: 5 }, rel: { roomSenior: -6 } };
      if (k === 'bank') return { t: '행보관 앞에서 통장에 숫자가 적혔습니다. 그 숫자는 전역 날까지 내 것이 아니었습니다. 라면 냄새가 나는 밤마다 그 숫자가 생각났습니다.', fx: { mind: -5 }, rel: { sfc: 4 }, mark: { set: { era_bank: {} } } };
      return { t: fmt(S, '과자 열 봉지가 오 분 만에 사라졌습니다. 선임들은 "고맙다" 대신 "다음 면회 언제냐"고 물었습니다.'), fx: { mind: -3 }, rel: { roomSenior: 6, peer: 4 } };
    } }),

  D('e01', { id: 'era_e1_relay', src: 'era-culture §7-E1 딜레마3 [S_cul_5]', w: 3,
    c: (S) => S.rank >= 1 && S.rank <= 2 && here(S, 'roomSenior'),
    build: (S) => ({
      title: '집합 전달',
      body: fmt(S, '취침 전, {roomSenior}이 낮은 목소리로 말합니다. "막내들 십 분 뒤 침상 앞으로 집합시켜." 이유는 말하지 않았습니다. 막내들은 저쪽에서 이미 눈치를 보고 있습니다.'),
      choices: [
        { k: 'relay', label: '그대로 전달한다', hint: '선임 지시는 완수한다 · 나도 그 라인에 서게 된다' },
        { k: 'ask', label: '"제가 사정을 알아보겠습니다"', hint: '막내들은 지킨다 · 선임의 화살이 내게 온다' },
        { k: 'self', label: '집합 준비를 내가 대신 뛰어다닌다', hint: '아무도 다치지 않는다 · 몸이 먼저 닳는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'relay') return { t: fmt(S, '"십 분 뒤 침상 앞 집합입니다." 전달하는 내 목소리가 {roomSenior.name}을 닮아 있었습니다. 막내들은 이유를 묻지 않았습니다. 묻지 않는 법을 배운 얼굴이었습니다.'), fx: { mind: -4 }, rel: { roomSenior: 4, junior: -10 }, mark: { set: { era_relay: {} } } };
      if (k === 'ask') return { t: fmt(S, '"알아보겠습니다"가 끝나기도 전에 {roomSenior.name}의 눈이 가늘어졌습니다. 집합은 결국 열렸고, 맨 앞줄에 내가 서 있었습니다.'), fx: { fit: -5, mind: -3 }, rel: { roomSenior: -14, junior: 8, peer: 4 } };
      return { t: '집합 장소를 정리하고 군장 검사 순서를 미리 맞췄습니다. 집합은 십 분 만에 끝났습니다. 내 팔은 다음 날까지 올라가지 않았습니다.', fx: { fit: -6, mind: -2 }, rel: { roomSenior: 2, junior: 4 } };
    } }),

  D('e01', { id: 'era_e1_vent', src: 'era-culture §7-E1 딜레마4 [S_cul_14 구조]', w: 3,
    c: (S) => S.rank >= 1 && S.rank <= 2 && here(S, 'roomSenior') && here(S, 'junior'),
    build: (S) => ({
      title: '되돌려 줄까',
      body: fmt(S, '{roomSenior}에게 십 분 동안 쿠사리를 먹었습니다. 이유는 관물대 위의 먼지였습니다. 자리로 돌아오는 길에 {junior.name}이 신발 끈을 매다 나와 눈이 마주쳤습니다. 이상하게 쉬운 표적으로 보였습니다.'),
      choices: [
        { k: 'vent', label: '"너 뭘 봐"라고 되돌린다', hint: '속은 풀린다 · 후임의 눈에 내가 비친다' },
        { k: 'swallow', label: '삼킨다', hint: '후임은 무사하다 · 속이 썩는다' },
        { k: 'walk', label: '연병장을 한 바퀴 돌고 온다', hint: '아무에게도 풀지 않는다 · 점호에 늦을 수 있다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'vent') return { t: '"너 뭘 봐?"가 입에서 나왔습니다. 말하고서야 알았습니다. 방금 내가 들은 문장과 억양까지 같았습니다. 속은 십 초 풀렸고 십 분 더 쓰라렸습니다.', fx: { mind: 2 }, rel: { junior: -20 }, mark: { set: { era_vented: {} } } };
      if (k === 'swallow') return { t: fmt(S, '화장실에서 수도꼭지를 틀어 놓고 오 분을 서 있었습니다. 거울 속 얼굴은 방금 {roomSenior.name}에게 혼난 얼굴 그대로였습니다.'), fx: { mind: -8 }, rel: { junior: 3 } };
      return roll(S, 0.4)
        ? { t: fmt(S, '두 바퀴째에 점호 호루라기가 들렸습니다. 늦게 들어온 나를 {roomSenior.name}이 처음부터 다시 쳐다봤습니다.'), fx: { fit: -3, mind: -3 }, rel: { roomSenior: -8 } }
        : { t: '찬 공기를 한 바퀴 마시고 들어왔습니다. 아무도 몰랐습니다. 내가 방금 무엇을 참았는지는 나만 알았습니다.', fx: { fit: -2, mind: -2 } };
    } }),

  D('e01', { id: 'era_e1_call', src: 'era-culture §7-E1 딜레마5 [S_cul_38]', w: 4,
    c: (S) => S.bonds?.lover != null,
    build: () => ({
      title: '남은 동전',
      body: '동전이 세 개 남았습니다. 한 통이 삼 분입니다. 부스 밖으로 줄이 길고, 어머니와 그녀 모두에게 걸어야 할 밤입니다.',
      choices: [
        { k: 'girl', label: '그녀에게 건다', hint: '사랑이 쌓인다 · 어머니는 서운해하신다' },
        { k: 'home', label: '집에 건다', hint: '어머니 마음이 놓인다 · 그녀는 기다린다' },
        { k: 'both', label: '각각 일 분 반씩 나눈다', hint: '둘 다 닿는다 · 둘 다 아쉽다' },
      ],
    }),
    apply: (S, k) => {
      const lv = (d) => { if (S.bonds?.lover != null) S.bonds.lover = Math.max(0, Math.min(100, S.bonds.lover + d)); };
      if (k === 'girl') { lv(10); return { t: '수화기 너머에서 그녀가 먼저 "끊기기 전에 말할게"라고 했습니다. 남은 시간 동안 우리는 아무 말도 하지 않았습니다. 숨소리가 말보다 많았습니다. 다음 날 어머니는 아무 말씀도 없으셨습니다.', fx: { mind: 3, rel: -2 } }; }
      if (k === 'home') { lv(-10); return { t: '어머니는 "밥은 먹었냐"를 세 번 물으셨습니다. 끊고 나서 알았습니다. 그녀 번호는 오늘도 누르지 못했습니다.', fx: { mind: 3, rel: -3 } }; }
      lv(-2);
      return { t: '일 분 반이면 안부만 겨우 닿습니다. 둘 다 "벌써?"라고 했고, 나는 둘 다에게 "미안"이라고 했습니다.', fx: { mind: -3 } };
    } }),

  // ═══════════════ e02 2005~2013 — 주5일·사지방·침대 ═══════════════
  E('e02', { id: 'era_e2_saturday', src: 'era-culture §7-E2-1 [S_cul_8][S_cul_7]', w: 3, p: (S) => ab(S, 0.3, 0.9),
    c: (S) => S.ym >= '2005-07',
    run: () => ({ t: '토요일 오후가 쉬는 날이 됐습니다. 선임이 "쉬는 날이니까 축구나 하자"고 했습니다. 쉬는 날에 제일 많이 뛴 건 이등병이었습니다.', fx: { fit: -3, mind: 1 } }) }),

  E('e02', { id: 'era_e2_nojumho', src: 'era-culture §7-E2-2 [S_cul_8] (일부 부대)', w: 3, p: 0.6,
    c: (S) => S.ym >= '2006-02',
    run: () => ({ t: '일석점호가 사라졌습니다. 처음으로 아홉 시 반에 드라마를 봤습니다. 리모컨을 병장님이 쥔 것은 그대로였습니다.', fx: { mind: 3 } }) }),

  E('e02', { id: 'era_e2_psj', src: 'era-culture §7-E2-3 [S_cul_11] (시간당 요금은 연도별로 달라 수치를 쓰지 않음)', w: 3,
    c: (S) => S.ym >= '2007-01',
    run: () => ({ t: '사이버지식정보방, 한 시간에 초코파이 한두 개 값입니다. 메일 하나 쓰는 데 삼십 분이 걸렸습니다. 남은 삼십 분은 받은 편지함의 "읽지 않음" 숫자를 쳐다보는 데 썼습니다.', fx: { mind: 3 } }) }),

  E('e02', { id: 'era_e2_bed', src: 'era-culture §7-E2-4 [S_cul_10][S_cul_23]', w: 4, when: { branch: ['army'] },
    c: (S) => S.ym <= '2012-12',
    run: () => ({ t: '침상이 철거되고 침대가 들어왔습니다. 서른 명이 나란히 눕던 자리에 이 층 침대가 섰습니다. 선임이 "누울 자리가 있다는 게 이렇게 다르네"라고 했습니다. 어제까지 자기 자리는 한 뼘이었다고 합니다.', fx: { mind: 4 } }) }),

  E('e02', { id: 'era_e2_uniform', src: 'era-culture §7-E2-5 [S_cul_42][S_cul_43][S_cul_44]', w: 4, when: { branch: ['army'] },
    c: (S) => between(S, '2011-10', '2014-05'),
    run: () => ({ t: '한 소대에 개구리복 반, 디지털 반입니다. 신형은 열이 닿으면 기능이 죽는다고 다림질이 금지됐습니다. 칼주름이 자랑이던 병장님이 다리미를 한참 쳐다봤습니다.', fx: { mind: -1 } }) }),

  E('e02', { id: 'era_e2_marine_feed', src: 'era-culture §7-E2-7 [S_cul_48][S_cul_49]', w: 12, when: { branch: ['marine'] }, p: (S) => ab(S, 0.5, 1),
    c: (S) => S.rank <= 1 && here(S, 'senior'),
    run: (S) => ({ t: fmt(S, '자대 첫 주, {senior.name}이 PX로 데려가 빵을 쌓았습니다. 다 먹을 때까지 아무도 일어나지 않았습니다. "맛있지?" 대답이 정해져 있는 질문이었습니다.'), fx: { fit: -3, mind: -4 }, rel: { senior: 2 } }) }),

  E('e02', { id: 'era_e2_ostracize', src: 'era-culture §7-E2-8 [S_cul_13][S_cul_12]', w: 3,
    p: (S) => ab(S, 0.1, 0.5) * (S.branch === 'marine' ? 1.6 : 1),
    c: (S) => S.rank <= 2 && here(S, 'peer') && here(S, 'senior'),
    run: (S) => ({ t: fmt(S, '{senior.name}이 {peer.name}에게 말을 걸지 않았습니다. 그날부터 우리도 걸지 않았습니다. 이유는 아무도 몰랐습니다. 이유가 필요 없다는 걸 그때 알았습니다.'), fx: { mind: -4 }, mark: { set: { era_ostracized: {} } } }) }),

  E('e02', { id: 'era_e2_dongki_room', src: 'era-culture §7-E2-9 [S_cul_15][S_cul_16]', w: 4, when: { branch: ['army', 'airforce'] },
    c: (S) => S.ym >= '2012-01',
    run: (S) => {
      S.env.abuse = Math.max(0, S.env.abuse - 5);
      return { t: '생활관이 동기끼리로 바뀐 첫날입니다. 선임 없는 밤은 생각보다 조용했습니다. 조용해서 잠이 안 왔습니다. 누군가 "불 끌까"를 말하는 데 십 분이 걸렸습니다.', fx: { mind: 4 }, mark: { set: { era_dongki_room: {} } } };
    } }),

  E('e02', { id: 'era_e2_sitcom', src: 'era-culture §7-E2-10 [S_cul_63]', w: 3,
    c: (S) => S.ym >= '2013-04',
    run: () => ({ t: 'TV에서 군대 시트콤이 나옵니다. 이등병이 침상에서 짝다리를 짚습니다. 선임이 "저건 거짓말이다"라고 했습니다. 그런데 표정이 이상했습니다. 웃는 건지 찔리는 건지 알 수 없었습니다.', fx: { mind: 2 } }) }),

  E('e02', { id: 'era_e2_cyworld', src: 'era-culture §7-E2 소품 [S_cul_72] (병사 사용 후기는 미확인, 연출용)', w: 2,
    c: (S) => S.ym <= '2012-06' && (S.leave?.used ?? 0) > 0,
    run: () => ({ t: '휴가 첫날 PC방에서 미니홈피에 들어갔습니다. 도토리가 그대로 남아 있었고, 일촌 방명록에는 "언제 와"가 세 개 쌓여 있었습니다. 답글은 쓰지 않았습니다. 쓸 말이 군대 얘기밖에 없었습니다.', fx: { mind: 2 } }) }),

  E('e02', { id: 'era_e2_screening', src: 'era-culture §6 2005 이후 관심사병 분류 [S_cul_9]', w: 3,
    c: (S) => S.ym >= '2005-09',
    run: () => ({ t: '인성검사지가 돌았습니다. 문항이 삼백 개였고, 솔직하게 답하면 관리 대상이 된다는 소문이 먼저 돌았습니다. 우리는 서로의 답안을 보지 않으려고 애썼습니다. 그날 모두가 "보통"에 가까운 사람이 됐습니다.', fx: { mind: -2 } }) }),

  // 되부르기
  E('e02', { id: 'era_e2_silent_junior', src: 'era-culture §7-E2 딜레마1 후속 [S_cul_12]', w: 5, needs: 'era_silent',
    c: (S) => since(S, 'era_silent', 2) && here(S, 'junior'),
    run: (S) => ({ t: fmt(S, '{junior.name}이 침상 끝에 혼자 앉아 있었습니다. 어디서 많이 본 자세였습니다. 빈 칸으로 낸 소원수리 용지가 떠올랐습니다. 그 칸이 내 몫이었다는 걸 이제야 알았습니다.'), fx: { mind: -6 }, rel: { junior: -2 } }) }),

  E('e02', { id: 'era_e2_isolated_end', src: 'era-culture §7-E2 딜레마1 후속 [S_cul_12]', w: 5, needs: 'era_isolated',
    c: (S) => since(S, 'era_isolated', 1) && here(S, 'peer'),
    run: (S) => ({ t: fmt(S, '3주 동안 내게 말을 거는 사람이 없었습니다. 어느 날 식당에서 {peer.name}이 "그 글씨, 네 거 맞지?"라고 아주 작게 물었습니다. 대답하지 않았더니 내 식판에 김치를 올려 놓고 갔습니다.'), fx: { mind: 5 }, rel: { peer: 10 } }) }),

  E('e02', { id: 'era_e2_stood_end', src: 'era-culture §7-E2 딜레마2 후속 [S_cul_13]', w: 5, needs: 'era_stood_with',
    c: (S) => S.monthsLeft != null && S.monthsLeft <= 2 && here(S, 'peer'),
    run: (S) => ({ t: fmt(S, '{peer.name}이 PX 앞에서 내 이름을 불렀습니다. "그때 옆에 앉아 준 거, 평생 갚을게." 나는 냉동 만두를 받아 들고 아무 말도 하지 못했습니다.'), fx: { mind: 8 }, rel: { peer: 5 } }) }),

  E('e02', { id: 'era_e2_looked_away', src: 'era-culture §7-E2 딜레마2 후속 [S_cul_13]', w: 5, needs: 'era_looked_away',
    c: (S) => since(S, 'era_looked_away', 3) && here(S, 'peer'),
    run: (S) => ({ t: fmt(S, '휴가 복귀 버스에서 {peer.name}을 마주쳤습니다. 서로 인사만 했습니다. 그 인사가 그날 한 말 중에 제일 무거웠습니다.'), fx: { mind: -4 } }) }),

  // ── e02 딜레마 ──
  D('e02', { id: 'era_e2_wonsu', src: 'era-culture §7-E2 딜레마1 [S_cul_12] (필적 색출 증언은 해병대 사례)', w: 4,
    p: (S) => ab(S, 0.1, 0.5),
    c: (S) => S.rank >= 1 && S.env.abuse >= 25 && here(S, 'roomSenior'),
    build: (S) => ({
      title: '소원수리함',
      body: '분기마다 소원수리 용지가 돕니다. 이름은 안 써도 된다고 했습니다. 생활관에서 겪는 일을 쓸 칸은 한 줄입니다. 용지를 걷는 건 대표병이고, 읽는 건 중대장입니다.',
      help: HELP,
      choices: [
        { k: 'write', label: '사실대로 쓴다', hint: '바뀔 수도 있다 · 필적으로 찾아내려는 사람이 있다' },
        { k: 'silent', label: '쓰지 않는다', hint: '아무 일도 없다 · 같은 일이 다음 사람에게 간다' },
        { k: 'sfc', label: '행보관을 따로 찾아간다', hint: '필적은 안 남는다 · "일렀다"는 말을 듣는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'write') {
        const found = roll(S, ab(S, 0.15, 0.6) + (S.branch === 'marine' ? 0.15 : 0));
        if (found) return { t: fmt(S, '며칠 뒤 {roomSenior.name}이 내 필적을 알아본 듯 웃었습니다. "글씨 예쁘네." 그날부터 내게 말을 거는 사람이 줄었습니다.'), fx: { mind: -10 }, rel: { roomSenior: -25, peer: -8 }, mark: { set: { era_isolated: {} } } };
        S.env.abuse = Math.max(0, S.env.abuse - 8);
        return { t: '중대장이 생활관을 한 번 돌았고, 며칠 동안 아무도 큰소리를 내지 않았습니다. 누가 썼는지는 끝내 아무도 말하지 않았습니다.', fx: { mind: 2 }, rel: { roomSenior: -4 } };
      }
      if (k === 'silent') return { t: '용지를 접어 반납했습니다. 칸은 비어 있었습니다. 빈 칸이 그 방에서 내가 낸 유일한 의견이었습니다.', fx: { mind: -6 }, mark: { set: { era_silent: {} } } };
      S.env.abuse = Math.max(0, S.env.abuse - 4);
      return { t: '행보관 사무실 문을 닫고 십 분을 얘기했습니다. 행보관은 메모를 하지 않았습니다. 그게 안심이었는지 불안이었는지 아직도 모르겠습니다.', fx: { mind: -4 }, rel: { sfc: 8, peer: -6, roomSenior: -6 } };
    } }),

  D('e02', { id: 'era_e2_ostracized_peer', src: 'era-culture §7-E2 딜레마2 [S_cul_13]', w: 6, p: 0.7, needs: 'era_ostracized',
    c: (S) => here(S, 'peer') && since(S, 'era_ostracized', 1),
    build: (S) => ({
      title: '혼자 앉은 동기',
      body: fmt(S, '몇 주째 {peer.name}에게 말을 거는 사람이 없습니다. 식당에서도 그 자리만 비어 있습니다. 오늘 그가 배식줄 뒤에서 나를 기다리는 것 같습니다. 같이 앉으면 나도 같은 쪽으로 분류될 겁니다.'),
      help: HELP,
      choices: [
        { k: 'sit', label: '옆에 앉아 밥을 먹는다', hint: '동기는 숨을 쉰다 · 나도 열외 대상이 될 수 있다' },
        { k: 'ignore', label: '모른 척한다', hint: '나는 안전하다 · 동기는 내 얼굴을 기억한다' },
        { k: 'sfc', label: '행보관에게 상황을 말한다', hint: '공식 조치가 나온다 · "일렀다"는 소문이 돈다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'sit') {
        if (roll(S, ab(S, 0.2, 0.7))) return { t: '다음 날부터 내 식판 옆도 비었습니다. 둘이 앉은 식당 구석은 생각보다 조용하고 생각보다 넓었습니다.', fx: { mind: -8 }, rel: { peer: 25, senior: -10, roomSenior: -10 }, mark: { set: { era_stood_with: {} } } };
        return { t: '아무도 뭐라 하지 않았습니다. 그게 더 이상했습니다. 몇몇은 눈을 피했고, 몇몇은 다음 날 내 옆에 앉았습니다.', fx: { mind: -3 }, rel: { peer: 20, senior: -4 }, mark: { set: { era_stood_with: {} } } };
      }
      if (k === 'ignore') return { t: '식판을 들고 다른 줄로 갔습니다. 등 뒤에서 숟가락 소리가 났습니다. 그 소리는 오래 남았습니다.', fx: { mind: -6 }, rel: { peer: -30 }, mark: { set: { era_looked_away: {} } } };
      return { t: '행보관이 그를 불렀고, 며칠 뒤 생활관이 조용히 재배치됐습니다. 아무도 이유를 말하지 않았지만 모두가 내 쪽을 봤습니다.', fx: { mind: -5 }, rel: { sfc: 8, peer: 10, senior: -12, roomSenior: -8 } };
    } }),

  D('e02', { id: 'era_e2_football', src: 'era-culture §7-E2 딜레마3 [S_cul_7][S_cul_8]', w: 3, p: 0.3,
    c: (S) => S.ym >= '2005-07' && S.rank >= 1 && here(S, 'roomSenior'),
    build: (S) => ({
      title: '쉬는 날의 축구',
      body: fmt(S, '토요일 오후. {roomSenior}이 "쉬는 날이니까 전원 축구"를 선언했습니다. 어젯밤 불침번을 선 나는 눈이 반쯤 감겨 있고, 접질린 발목도 아직 욱신거립니다.'),
      choices: [
        { k: 'play', label: '나간다', hint: '눈치는 지킨다 · 쉬는 날을 잃고 발목이 걱정된다' },
        { k: 'ref', label: '발목을 핑계로 심판을 본다', hint: '덜 뛴다 · 꾀병 소리를 듣는다' },
        { k: 'nap', label: '낮잠을 택한다', hint: '몸은 쉰다 · 선임 눈 밖에 난다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'play') return { t: '전반에 한 번 넘어졌고 후반에 한 번 더 넘어졌습니다. 골은 선임이 넣었고 박수는 내가 제일 크게 쳤습니다.', fx: { fit: -6, mind: -3 }, rel: { roomSenior: 5 } };
      if (k === 'ref') return { t: '호루라기를 물고 터치라인에 섰습니다. 한 번 불 때마다 선임의 시선이 따라왔습니다. "다친 놈이 호루라기는 잘 부네."', fx: { fit: -2, mind: -3 }, rel: { roomSenior: -6 } };
      return { t: fmt(S, '이불을 뒤집어쓰고 두 시간을 잤습니다. 몸은 개운했습니다. 돌아온 {roomSenior.name}은 내 침대 앞에서 한참 서 있다 갔습니다.'), fx: { fit: 3, mind: 1 }, rel: { roomSenior: -14, peer: -3 } };
    } }),

  D('e02', { id: 'era_e2_visit_room', src: 'era-culture §7-E2 딜레마4 [S_cul_15] 가정', w: 6, p: 0.7, needs: 'era_dongki_room',
    c: (S) => S.rank >= 2 && here(S, 'roomSenior') && since(S, 'era_dongki_room', 2),
    build: (S) => ({
      title: '놀러 온 선임',
      who: 'roomSenior',
      body: fmt(S, '동기 생활관이 자리 잡은 지 석 달. 오늘 밤 {roomSenior}이 우리 방 문을 열고 들어와 침대 끝에 앉았습니다. "그냥 놀러 왔다." 방의 숨소리가 달라졌습니다.'),
      choices: [
        { k: 'welcome', label: '반갑게 받아 준다', hint: '선임과 가까워진다 · 옛 질서가 돌아온다' },
        { k: 'block', label: '"저희 방 점호 중입니다"라고 막는다', hint: '방을 지킨다 · "싸가지 없다"는 소문이 돈다' },
        { k: 'detour', label: '휴게실로 같이 나간다', hint: '충돌은 피한다 · 매번 써먹을 수는 없다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'welcome') { S.env.abuse = Math.min(100, S.env.abuse + 6); return { t: '음료수를 내오고 자리를 비웠습니다. 한 시간 뒤 방의 공기는 석 달 전으로 돌아가 있었습니다. 동기들은 말이 없었습니다.', fx: { mind: -4 }, rel: { roomSenior: 8, peer: -6 } }; }
      if (k === 'block') return { t: '선임은 웃으며 나갔습니다. 문이 닫히자마자 동기들이 내 어깨를 쳤습니다. 복도의 웃음소리는 한참 멀어지지 않았습니다.', fx: { mind: -2 }, rel: { roomSenior: -18, peer: 6 } };
      return { t: '"휴게실에 같이 가시죠." 계단을 내려가는 동안 우리 방 문 앞이 조용했습니다. 이 방법은 내일은 못 쓴다는 걸 알고 있었습니다.', fx: { mind: -3 }, rel: { roomSenior: -2 } };
    } }),

  D('e02', { id: 'era_e2_psj_money', src: 'era-culture §7-E2 딜레마5 [S_cul_11]', w: 3,
    c: (S) => S.ym >= '2007-01',
    build: () => ({
      title: '월급날의 계산',
      body: '월급날입니다. 사지방 한 시간은 초코파이 한두 개 값입니다. 소식은 메일로 오고, 라면은 PX에서 팝니다. 이번 달 월급으로는 한쪽만 됩니다.',
      choices: [
        { k: 'net', label: '사지방 두 시간', hint: '소식과 웃음이 온다 · 이번 달 PX는 건너뛴다' },
        { k: 'px', label: 'PX를 간다', hint: '배와 마음이 찬다 · 바깥 소식을 놓친다' },
        { k: 'save', label: '둘 다 참고 모은다', hint: '통장만 불어난다 · 이번 달은 낙이 없다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'net') { if (S.bonds?.lover != null) S.bonds.lover = Math.min(100, S.bonds.lover + 4); return { t: '두 시간을 꽉 채웠습니다. 읽지 않은 메일 열한 통을 한 통씩 천천히 읽었습니다. 나와서 보니 PX는 이미 닫혀 있었습니다.', fx: { mind: 2, fit: -2 } }; }
      if (k === 'px') { if (S.bonds?.lover != null) S.bonds.lover = Math.max(0, S.bonds.lover - 4); return { t: '냉동 만두에 컵라면까지 샀습니다. 배는 찼습니다. 그날 밤 받은 편지함에는 쌓인 답장이 아무에게도 가지 못한 채 남아 있었습니다.', fx: { mind: 3, rel: -3 } }; }
      return { t: '월급을 그대로 통장에 넣었습니다. 계산기 속 숫자는 예뻤습니다. 한 달 내내 달력의 X 말고는 즐거운 게 없었습니다.', fx: { mind: -5 } };
    } }),

  // ═══════════════ e03 2014~2017 — 병영혁신 ═══════════════
  E('e03', { id: 'era_e3_shared_phone', src: 'era-culture §7-E3-1 [S_cul_25]', w: 3, when: { phone: false },
    run: () => ({ t: '당직 근무자가 "면회 아니고 전화다"라며 수화기를 건넸습니다. 어머니 목소리가 부대 교환대를 거쳐서 왔습니다. 사생활은 없었고, 목소리는 있었습니다.', fx: { mind: 4 } }) }),

  E('e03', { id: 'era_e3_px_phone', src: 'era-culture §7-E3-2 [S_cul_24]', w: 2, when: { phone: false },
    c: (S) => S.ym >= '2015-04' && (S.leave?.used ?? 0) > 0,
    run: () => ({ t: '휴가 나가는 날 PX에서 폰을 빌렸습니다. 충전한 만큼만 쓰는 폰입니다. 위병소를 나서며 처음 건 전화에서 어머니가 "벌써 나왔냐"며 우셨습니다.', fx: { mind: 5 } }) }),

  E('e03', { id: 'era_e3_video', src: 'era-culture §7-E3-3 [S_cul_22][S_cul_25]', w: 2, when: { phone: false },
    c: (S) => S.ym >= '2015-06',
    run: () => ({ t: '영상 공중전화 앞에서 어머니가 내 얼굴을 보고 한동안 말이 없었습니다. 살이 빠졌다고 했습니다. 나는 괜찮다고 했고, 화면 속 어머니는 믿지 않는 얼굴이었습니다.', fx: { mind: 3 } }) }),

  E('e03', { id: 'era_e3_rule_meeting', src: 'era-culture §7-E3-4 [S_cul_23]', w: 3,
    c: (S) => S.ym >= '2014-11',
    run: () => ({ t: '대표병이 종이를 들고 왔습니다. 생활관 룰 회의입니다. "밤 열 시 이후 TV 금지." 병장님이 "그건 안 되지"라고 했습니다. 룰은 이틀 만에 수정됐습니다. 수정한 사람은 룰을 만든 사람이 아니었습니다.', fx: { mind: -1 }, mark: { set: { era_rules: {} } } }) }),

  E('e03', { id: 'era_e3_kadera', src: 'era-culture §7-E3-5 [S_cul_24][S_cul_26]', w: 3, p: (S) => ab(S, 0.3, 0.9),
    c: (S) => S.rank <= 1 && S.ym >= '2015-04',
    run: () => ({ t: '육군 홈페이지에 "이등병도 누워도 된다"는 글이 올라왔다고 합니다. 선임이 "그건 홈페이지 얘기고"라고 했습니다. 나는 서 있기로 했습니다.', fx: { mind: -1 } }) }),

  E('e03', { id: 'era_e3_yo', src: 'era-culture §7-E3-6 [S_cul_27]', w: 4,
    c: (S) => between(S, '2016-03', '2016-12'),
    run: () => ({ t: '"요"를 써도 된다는 지침이 내려왔습니다. 오늘 이병 하나가 처음으로 "그렇습니다요"라고 했습니다. 생활관이 조용해졌습니다. 선임은 웃지도 화내지도 않았습니다.', fx: { mind: 1 } }) }),

  E('e03', { id: 'era_e3_free_psj', src: 'era-culture §7-E3-7 [S_cul_11]', w: 4, when: { phone: false },
    c: (S) => S.ym >= '2017-01',
    run: () => ({ t: '사이버지식정보방이 공짜가 됐습니다. 그날부터 사지방은 사람이 아니라 대기 번호로 채워졌습니다. 번호표는 없는데 번호는 있었습니다. 내 번호는 열일곱 번이었습니다.', fx: { mind: 2 } }) }),

  E('e03', { id: 'era_e3_concern', src: 'era-culture §7-E3-8 [S_cul_9]', w: 3,
    c: (S) => S.ym >= '2014-06',
    run: () => ({ t: '관심병사 면담이 있었습니다. 면담이 끝나고도 내 등급은 알려 주지 않았습니다. 동기는 "넌 정상이야"라고 했는데, 위로인지 불안인지 모르겠습니다.', fx: { mind: -2 } }) }),

  E('e03', { id: 'era_e3_lotion', src: 'era-culture §7-E3-9 [S_cul_28]', w: 2,
    run: () => ({ t: '월급이 올랐다는 기사가 나왔는데 로션은 여전히 엄마가 보냈습니다. 엄마는 "월급은 모아"라고 했습니다. 모으는 법은 아무도 가르쳐 주지 않았습니다.', fx: { mind: 1 } }) }),

  E('e03', { id: 'era_e3_idol', src: 'era-culture §7-E3-10 [S_cul_75]', w: 2, when: { branch: ['army'] },
    run: () => ({ t: '연대에 걸그룹이 왔다고 했습니다. 우리 중대는 그날 막사 청소였습니다. 창문을 닦다가 멀리서 환호성만 들었습니다. 그날 우리 창문이 연대에서 제일 깨끗했습니다.', fx: { mind: -1 } }) }),

  E('e03', { id: 'era_e3_survey_week', src: 'era-culture §6 2014 가혹행위 사망 사건 이후 [S_cul_22][S_cul_20] (연도·유형만)', w: 10,
    c: (S) => between(S, '2014-08', '2015-03'),
    run: (S) => {
      S.env.abuse = Math.max(0, S.env.abuse - 3);
      return { t: '여름에 다른 사단의 가혹행위 사망 사건이 공개된 뒤로 우리 부대는 한 달 내내 설문과 교육이었습니다. 설문지 앞에서 모두가 같은 칸에 동그라미를 쳤습니다. 하루에 교육이 세 번이어서 아무도 졸 수 없었습니다.', fx: { mind: -3 } };
    } }),

  E('e03', { id: 'era_e3_rule_broken', src: 'era-culture §7-E3-4 후속 [S_cul_23]', w: 5, needs: 'era_rules',
    c: (S) => since(S, 'era_rules', 2),
    run: () => ({ t: '생활관 룰 제1조는 "선임도 후임도 서로 존중한다"였습니다. 오늘 그 종이가 문에서 사라졌습니다. 누가 뗐는지 아무도 묻지 않았고, 누가 붙였는지도 아무도 묻지 않았습니다. 테이프 자국만 남았습니다.', fx: { mind: -3 } }) }),

  E('e03', { id: 'era_e3_daepyo_squeeze', src: 'era-culture §7-E3 딜레마2 후속 [S_cul_23] 가정', w: 5, needs: 'era_daepyo',
    c: (S) => since(S, 'era_daepyo', 2),
    run: () => ({ t: '선임은 "룰 좀 고치자"고 했고 후임은 "룰대로 하자"고 했습니다. 두 장의 요구서가 내 관물대에 놓였습니다. 대표병은 룰 위에 앉은 사람이 아니라 룰 사이에 낀 사람이었습니다.', fx: { mind: -5 }, rel: { roomSenior: -3, junior: -3 } }) }),

  E('e03', { id: 'era_e3_cared_end', src: 'era-culture §7-E3 딜레마4 후속 [S_cul_9]', w: 5, needs: 'era_cared',
    c: (S) => since(S, 'era_cared', 3) && here(S, 'peer'),
    run: (S) => ({ t: fmt(S, '불침번 교대 때 {peer.name}이 자기 휴가 사진을 보여 줬습니다. 웃는 얼굴이 낯설었습니다. "그때 네가 안 물어봤으면 아무한테도 말 안 했을 거다."'), fx: { mind: 7 }, rel: { peer: 6 } }) }),

  // ── e03 딜레마 ──
  D('e03', { id: 'era_e3_gift', src: 'era-culture §7-E3 딜레마1 [S_cul_24]', w: 3,
    c: (S) => S.rank >= 1 && (S.leave?.used ?? 0) > 0 && here(S, 'roomSenior'),
    build: (S) => ({
      title: '휴가 복귀 전날',
      body: fmt(S, '복귀 전날 밤, 엄마가 가방에 과자를 눌러 담았습니다. 문득 {roomSenior}의 얼굴이 떠올랐습니다. "휴가 갔다 오면 뭐 하나 사 오는 거 알지?" 규정에는 없는 말입니다.'),
      choices: [
        { k: 'buy', label: '사 간다', hint: '선임 비위는 맞춘다 · 지갑이 비고, 걸리면 문제가 된다' },
        { k: 'no', label: '"규정상 안 된다고 들었습니다"', hint: '떳떳하다 · 눈 밖에 난다' },
        { k: 'small', label: '과자 한 봉지만 사 간다', hint: '애매하게 넘긴다 · 아무도 만족하지 않는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'buy') {
        if (roll(S, 0.2)) return { t: '위병소 가방 검사에서 포장된 선물이 걸렸습니다. 누구 줄 거냐는 질문에 대답하지 못했습니다. 선물은 압수됐고 시말서가 남았습니다.', fx: { mind: -6 }, rel: { roomSenior: 2 }, punish: { kind: 'reprimand' } };
        return { t: fmt(S, '{roomSenior.name}은 포장을 뜯으며 "뭐 이런 걸"이라고 했습니다. 표정은 "다음에도"였습니다.'), fx: { mind: -3 }, rel: { roomSenior: 8 } };
      }
      if (k === 'no') return { t: fmt(S, '"규정상 안 된다고 들었습니다." {roomSenior.name}은 웃었지만 눈은 웃지 않았습니다. 그 뒤로 내 휴가 얘기는 아무도 묻지 않았습니다.'), fx: { mind: -2 }, rel: { roomSenior: -14 } };
      return { t: '과자 한 봉지를 내밀었습니다. 선임은 "고맙다"라고 했고, 다른 선임은 "이게 다냐"고 했습니다. 한 봉지가 두 가지 말을 낳았습니다.', fx: { mind: -3 }, rel: { roomSenior: -4 } };
    } }),

  D('e03', { id: 'era_e3_daepyo', src: 'era-culture §7-E3 딜레마2 [S_cul_23] 가정', w: 3,
    c: (S) => S.rank >= 1 && S.ym >= '2014-11' && here(S, 'peer'),
    build: (S) => ({
      title: '생활관 대표병',
      body: fmt(S, '생활관 대표병을 뽑는답니다. 당직사관 지시를 전달하고 룰 회의를 여는 자리입니다. {peer.name}이 나를 쳐다보고 있습니다. 모두의 시선이 한 번씩 내 쪽을 스쳤습니다.'),
      choices: [
        { k: 'take', label: '맡는다', hint: '의견이 모인다 · 선임과 후임 사이에 낀다' },
        { k: 'decline', label: '거절한다', hint: '편하다 · 누군가 억지로 맡고, 행보관이 기억한다' },
        { k: 'push', label: '동기를 추천한다', hint: '위기를 넘긴다 · 동기가 알게 된다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'take') return { t: '"제가 하겠습니다"라고 했습니다. 첫 임무는 당직사관 지시를 받아 적는 것이었고, 첫 항의는 그날 밤에 왔습니다.', fx: { mind: -4 }, rel: { sfc: 6, roomSenior: -4 }, mark: { set: { era_daepyo: {} } } };
      if (k === 'decline') return { t: '"저는 말을 잘 못합니다"라고 했습니다. 거짓말은 아니었습니다. 대신 맡은 사람의 표정이 하루 종일 마음에 걸렸습니다.', fx: { mind: -1 }, rel: { sfc: -6, peer: -4 } };
      return { t: fmt(S, '{peer.name}의 이름을 말했습니다. 박수가 쳤고 그는 웃으며 일어섰습니다. 웃음이 끝나는 데 이 초가 걸렸습니다.'), fx: { mind: -3 }, rel: { peer: -15 } };
    } }),

  D('e03', { id: 'era_e3_phone_hog', src: 'era-culture §7-E3 딜레마3 [S_cul_22] 가정', w: 3, when: { phone: false },
    c: (S) => here(S, 'peer'),
    build: (S) => ({
      title: '이십 분째 통화',
      body: fmt(S, '공중전화 앞에서 {peer.name}이 이십 분째 통화 중입니다. 내 뒤로 줄이 늘었고, 어머니는 오늘이 아니면 시간이 안 된다고 하셨습니다.'),
      choices: [
        { k: 'ask', label: '"그만 끊어라"고 말한다', hint: '내 차례를 지킨다 · 동기와 서먹해진다' },
        { k: 'wait', label: '기다린다', hint: '관계는 지킨다 · 오늘 통화는 못 할 수 있다' },
        { k: 'report', label: '당직에게 시간 제한을 건의한다', hint: '공정하다 · 고자질로 보인다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'ask') return { t: fmt(S, '"야, 뒤에 줄 섰다." {peer.name}은 수화기를 막고 나를 노려보았다가 끊었습니다. 내 통화는 오 분 남았습니다.'), fx: { mind: -1 }, rel: { peer: -12 } };
      if (k === 'wait') return { t: '기다렸습니다. 소등 십 분 전에야 수화기가 내 손에 왔고, 어머니는 이미 주무시고 계셨습니다.', fx: { mind: -5 } };
      return { t: '당직에게 "통화 제한을 두면 좋겠습니다"라고 했습니다. 다음 날 부스 옆에 모래시계가 붙었습니다. 모래시계는 처음으로 나를 누구보다 먼저 재촉했습니다.', fx: { mind: -2 }, rel: { peer: -18, sfc: 3 } };
    } }),

  D('e03', { id: 'era_e3_concern_peer', src: 'era-culture §7-E3 딜레마4 [S_cul_9]', w: 4, p: 0.3,
    c: (S) => S.ym >= '2014-06' && here(S, 'peer') && S.st.mind >= 20,
    build: (S) => ({
      title: '말수가 줄어든 동기',
      body: fmt(S, '면담 이후 {peer.name}의 말수가 줄었습니다. 밥은 먹는데 뭘 먹는지는 모르는 눈입니다. 어제는 불침번 교대 시간에도 한참 늦게 나왔습니다.'),
      help: HELP,
      choices: [
        { k: 'stay', label: '옆에서 챙긴다', hint: '동기가 기댈 곳이 생긴다 · 나도 같은 눈으로 보일 수 있다' },
        { k: 'report', label: '행보관에게 알린다', hint: '전문 상담으로 이어진다 · 동기가 배신으로 느낄 수 있다' },
        { k: 'leave', label: '모른 척한다', hint: '내 일에 집중한다 · 마음이 계속 걸린다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'stay') return { t: fmt(S, '불침번 교대 때마다 {peer.name}에게 따뜻한 물을 건넸습니다. 말은 별로 하지 않았습니다. 대신 선임들이 "너희 둘 요즘 뭐 하냐"며 눈썹을 올렸습니다.'), fx: { mind: -6 }, rel: { peer: 20, roomSenior: -4 }, mark: { set: { era_cared: {} } } };
      if (k === 'report') return { t: fmt(S, '행보관이 {peer.name}을 불러 한참 얘기했습니다. 돌아온 그는 나를 지나쳐 가며 "고맙다"라고도, "배신자"라고도 하지 않았습니다. 그게 더 오래 남았습니다.'), fx: { mind: -3 }, rel: { peer: -15, sfc: 6 } };
      return { t: fmt(S, '못 본 척했습니다. {peer.name}은 며칠 뒤 상담을 받으러 갔다가 다른 중대로 옮겨 갔습니다. 인사할 틈이 없었다고 스스로에게 말했습니다.'), fx: { mind: -7 }, rel: { peer: -8 } };
    } }),

  D('e03', { id: 'era_e3_yo_junior', src: 'era-culture §7-E3 딜레마5 [S_cul_27]', w: 3,
    c: (S) => S.ym >= '2016-03' && S.rank >= 1 && here(S, 'junior') && here(S, 'roomSenior'),
    build: (S) => ({
      title: '"요" 한 글자',
      body: fmt(S, '지침이 바뀌었다고 {junior.name}이 말끝마다 "요"를 붙입니다. 오늘 {roomSenior}이 그걸 듣고 내게 눈짓했습니다. 가르치는 건 맞선임 몫이라는 눈짓입니다.'),
      choices: [
        { k: 'correct', label: '다나까로 고치게 한다', hint: '선임 눈은 맞춘다 · 지침을 어긴 쪽이 내가 된다' },
        { k: 'allow', label: '그냥 둔다', hint: '후임은 편해진다 · 선임이 군기를 물을 것이다' },
        { k: 'fake', label: '선임 앞에서만 고치게 한다', hint: '둘 다 반쯤 만족한다 · 둘 다 반쯤 의심한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'correct') return { t: fmt(S, '"{junior.name}, 다나까로 해라." 말하면서 지침이 적힌 게시판이 떠올랐습니다. {junior.name}은 "알겠습니다"라고 했고, 그 "알겠습니다"에 숨이 섞여 있었습니다.'), fx: { mind: -3 }, rel: { roomSenior: 6, junior: -10 } };
      if (k === 'allow') return { t: fmt(S, '그냥 뒀습니다. {roomSenior.name}은 점호 때 "요즘 군대 군기가 어디 갔냐"고 모두 들으라는 듯 말했습니다. 말 끝에 내 이름이 붙지는 않았지만 눈은 나를 향했습니다.'), fx: { mind: -2 }, rel: { roomSenior: -12, junior: 8 } };
      return { t: fmt(S, '선임이 있는 데서는 "~습니다", 없는 데서는 "~요". {junior.name}이 이틀 만에 규칙을 익혔습니다. 익히는 속도가 빨라서 마음이 쓰렸습니다.'), fx: { mind: -4 }, rel: { roomSenior: -2, junior: -3 } };
    } }),

  // ═══════════════ e04 2018~2021 — 휴대폰 과도기 ═══════════════
  E('e04', { id: 'era_e4_key', src: 'era-culture §7-E4-1 [S_cul_29]', w: 3, when: { phone: true },
    run: () => ({ t: '보관함 열쇠가 내 주머니에 있었습니다. 선임도 후임도 각자 열쇠가 있었습니다. 이게 책임인지 시험인지 한동안 몰랐습니다. 열쇠를 잃어버린 동기가 하루 종일 땀을 흘렸습니다.', fx: { mind: 1 } }) }),

  E('e04', { id: 'era_e4_6pm', src: 'era-culture §7-E4-2 [S_cul_29][S_cul_30]', w: 4, when: { phone: true },
    run: () => ({ t: '여섯 시가 되자 생활관이 조용해졌습니다. 대화 소리가 아니라 진동 소리였습니다. 불을 켠 방에서 열두 명이 각자 다른 곳에 있었습니다.', fx: { mind: 3, rel: -2 } }) }),

  E('e04', { id: 'era_e4_neighbor', src: 'era-culture §7-E4-3 [S_cul_32] 가정 (시범 4곳→36곳→전군)', w: 5, when: { phone: false },
    c: (S) => S.ym >= '2018-04',
    run: () => ({ t: '전화를 걸었더니 옆 부대 동기가 "야, 나 폰 있다"고 했습니다. 내 손에는 공용 수화기가 들려 있었습니다. 줄이 길었고, 나는 말없이 듣기만 했습니다.', fx: { mind: -3 } }) }),

  E('e04', { id: 'era_e4_chatroom', src: 'era-culture §7-E4-4 [S_cul_30]', w: 3, when: { phone: true }, p: (S) => ab(S, 0.2, 0.7),
    c: (S) => S.rank <= 2,
    run: () => ({ t: '생활관 단톡방이 있다고 했습니다. 나는 초대받지 못했습니다. 이유는 아무도 묻지 않았습니다. 다음 날 아침 점호 시간이 바뀐 걸 나만 몰랐습니다.', fx: { mind: -6 }, mark: { set: { era_chat_out: {} } } }) }),

  E('e04', { id: 'era_e4_chat_invite', src: 'era-culture §7-E4-4 후속 [S_cul_30]', w: 5, needs: 'era_chat_out',
    c: (S) => since(S, 'era_chat_out', 2) && here(S, 'peer'),
    run: (S) => ({ t: fmt(S, '{peer.name}이 개인톡으로 초대 링크를 보냈습니다. 방에 들어가니 대화가 이미 천 개였습니다. 첫 메시지는 "왔냐"였습니다.'), fx: { mind: 6 }, rel: { peer: 6 } }) }),

  E('e04', { id: 'era_e4_outlet', src: 'era-culture §7-E4-6 [S_cul_37] (충전 양보는 가정)', w: 3, when: { phone: true }, p: (S) => ab(S, 0.3, 0.9),
    c: (S) => S.rank <= 1,
    run: () => ({ t: '충전 콘센트는 선임 줄이 먼저입니다. 내 폰은 새벽 두 시에 꽂힙니다. 아침 점호 때 배터리 3퍼센트가 내 하루였습니다.', fx: { mind: -2 } }) }),

  E('e04', { id: 'era_e4_latte', src: 'era-culture §7-E4-7 [S_cul_32]', w: 3, when: { phone: true },
    c: (S) => here(S, 'roomSenior'),
    run: (S) => ({ t: fmt(S, '{roomSenior}이 폰을 들여다보는 후임들을 보며 말했습니다. "우리 땐 이런 거 없었다." 나는 그 말이 부러움인지 비난인지 구분하지 못했습니다. 본인의 폰은 손에서 한 번도 떨어지지 않았습니다.'), fx: { mind: -1 } }) }),

  E('e04', { id: 'era_e4_petition', src: 'era-culture §7-E4-8 [S_cul_32][S_cul_33]', w: 3, when: { phone: true }, p: (S) => ab(S, 0.2, 0.7),
    c: (S) => S.ym >= '2019-04',
    run: (S) => {
      S.env.abuse = Math.max(0, S.env.abuse - 3);
      return { t: '아침에 중대장이 우리를 불렀습니다. 어젯밤 누군가 올린 글이 하루 만에 퍼졌다고 했습니다. 누가 올렸냐고 물었습니다. 아무도 대답하지 않았습니다. 대답하지 않는 방식으로 모두가 같은 편이 됐습니다.', fx: { mind: -3 } };
    } }),

  E('e04', { id: 'era_e4_delivery', src: 'era-culture §7-E4-9 [S_cul_35]', w: 3, when: { phone: true, branch: ['army'] },
    c: (S) => S.ym >= '2020-07',
    run: () => ({ t: '제설함에 치킨을 숨겨 달라는 메모가 붙어 있었습니다. 제설함 위로 조명이 켜졌습니다. 위병이 나왔고, 배달 기사는 치킨 봉지를 든 채 아주 천천히 뒷걸음질 쳤습니다.', fx: { mind: 3 } }) }),

  E('e04', { id: 'era_e4_video_call', src: 'era-culture §7-E4-10 [S_cul_32]', w: 3, when: { phone: true },
    c: (S) => S.ym >= '2019-04',
    run: () => ({ t: '면회 신청서를 쓰다 말았습니다. 어머니가 영상통화면 충분하다고 했습니다. 충분하지 않았습니다. 화면 속에서는 어머니의 손이 내 어깨에 닿지 않았습니다.', fx: { mind: -2 } }) }),

  E('e04', { id: 'era_e4_game', src: 'era-culture §3-2 신종 부조리 [S_cul_30]', w: 3, when: { phone: true }, p: (S) => ab(S, 0.2, 0.8),
    c: (S) => S.rank <= 1 && here(S, 'senior'),
    run: (S) => ({ t: fmt(S, '{senior.name}이 "접속해"라고 했습니다. 게임 속 내 닉네임 앞에는 선임의 아이템이 붙었습니다. 전적은 선임의 것이고 패배는 내 것이었습니다.'), fx: { mind: -4 }, rel: { senior: -2 } }) }),

  E('e04', { id: 'era_e4_data_again', src: 'era-culture §7-E4-5 후속 [S_cul_30]', w: 5, needs: 'era_data_fed',
    c: (S) => since(S, 'era_data_fed', 1) && here(S, 'senior'),
    run: (S) => ({ t: fmt(S, '이틀 뒤 {senior.name}이 다시 "남지?"라고 물었습니다. 나는 처음으로 숫자를 세 봤습니다. 다섯 번째였습니다.'), fx: { mind: -4 } }) }),

  // ── e04 딜레마 ──
  D('e04', { id: 'era_e4_secret_phone', src: 'era-culture §7-E4 딜레마1 [S_cul_56][S_cul_73] 가정', w: 3, when: { phone: true },
    c: (S) => S.rank >= 1 && here(S, 'junior'),
    build: (S) => ({
      title: '불룩한 주머니',
      body: fmt(S, '일과 중 작업을 같이 나갔다가 {junior.name}의 전투복 주머니가 불룩한 걸 봤습니다. 보관함에 넣어야 할 폰입니다. 걸리면 후임만이 아니라 관리 책임으로 나까지 불려 갑니다.'),
      choices: [
        { k: 'eyes', label: '못 본 척한다', hint: '후임과는 편하다 · 걸리면 나도 책임을 진다' },
        { k: 'warn', label: '조용히 보관함에 넣게 한다', hint: '규정은 지킨다 · 후임이 서운해한다' },
        { k: 'report', label: '간부에게 보고한다', hint: '책임선에서 벗어난다 · 후임이 징계를 받는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'eyes') {
        if (roll(S, 0.3)) return { t: fmt(S, '그날 오후 불시 점검에서 {junior.name}의 폰이 나왔습니다. "같은 분대원 관리 소홀" 한 줄이 내 이름 옆에 붙었습니다.'), fx: { mind: -6 }, rel: { junior: -3 }, punish: { kind: 'reprimand' } };
        return { t: '못 본 척했습니다. 작업이 끝날 때까지 후임의 주머니는 계속 불룩했고, 나는 계속 모르는 척했습니다. 저녁에 후임이 말없이 컵라면을 건넸습니다.', fx: { mind: -3 }, rel: { junior: 8 } };
      }
      if (k === 'warn') return { t: fmt(S, '"넣어라." {junior.name}이 한참 내 얼굴을 보다가 알겠다고 했습니다. 알겠다는 대답이 가장 서운하게 들렸습니다.'), fx: { mind: -2 }, rel: { junior: -8 } };
      return { t: fmt(S, '소대장에게 보고했습니다. {junior.name}은 군기교육 대상이 됐고, 생활관에서 나를 쳐다보는 눈이 하나 줄었습니다. 눈이 줄었는데 시선은 더 무거웠습니다.'), fx: { mind: -5 }, rel: { junior: -25, lt: 5, sfc: 5 } };
    } }),

  D('e04', { id: 'era_e4_chat_gang', src: 'era-culture §7-E4 딜레마2 [S_cul_30]', w: 4, when: { phone: true }, p: (S) => ab(S, 0.2, 0.6),
    c: (S) => here(S, 'peer') && here(S, 'senior'),
    build: (S) => ({
      title: '단톡방의 한 줄',
      body: fmt(S, '단톡방에서 {senior.name}이 {peer.name}을 놀리기 시작했습니다. 방 사람들이 "ㅋㅋ"를 올리고, 이제 내 차례입니다. 화면에 쓰는 데 일 초면 됩니다.'),
      help: HELP,
      choices: [
        { k: 'join', label: '"ㅋㅋ"를 올린다', hint: '무리에 남는다 · 동기에게 등을 돌린다' },
        { k: 'object', label: '"그만하죠"라고 쓴다', hint: '동기 편이 된다 · 다음 표적이 될 수 있다' },
        { k: 'dm', label: '개인톡으로 동기를 위로한다', hint: '양쪽 눈치를 본다 · 방 안에서는 침묵이다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'join') return { t: fmt(S, '"ㅋㅋ" 두 글자를 올렸습니다. {peer.name}은 방에 남아 있었지만 읽음 표시만 올라왔습니다. 그날 이후 그의 프로필 사진이 바뀌지 않았습니다.'), fx: { mind: -6 }, rel: { peer: -20, senior: 4 } };
      if (k === 'object') return { t: '"그만하죠"를 올렸습니다. 방이 일 분 동안 조용했고, 그다음 "얘 뭐냐"가 올라왔습니다. 읽음 숫자만 하나씩 늘었습니다.', fx: { mind: -4 }, rel: { peer: 18, senior: -14 }, mark: { set: { era_chat_standup: {} } } };
      return { t: '개인톡으로 "신경 쓰지 마"를 보냈습니다. 방에서는 아무 말도 하지 않았습니다. 위로는 갔고 비겁함은 남았습니다.', fx: { mind: -5 }, rel: { peer: 6 } };
    } }),

  D('e04', { id: 'era_e4_report_or_post', src: 'era-culture §7-E4 딜레마3 [S_cul_32][S_cul_33]', w: 3, when: { phone: true }, p: (S) => ab(S, 0.15, 0.5),
    c: (S) => S.ym >= '2019-04' && S.env.abuse >= 20 && here(S, 'lt') && here(S, 'peer'),
    build: (S) => ({
      title: '글쓰기 창',
      body: fmt(S, '{lt}의 폭언이 이번 주에도 반복됐습니다. {peer.name}이 내게 보여 준 폰에는 글쓰기 창이 열려 있습니다. "올리면 오늘 밤 퍼진다." 지휘 계통으로 하자는 말은 아무도 꺼내지 않았습니다.'),
      help: HELP,
      choices: [
        { k: 'chain', label: '중대장 면담을 요청한다', hint: '절차대로 간다 · 덮일 수도 있다' },
        { k: 'post', label: '올리는 걸 말리지 않는다', hint: '빠르고 크게 터진다 · 부대 전체가 불이익을 본다' },
        { k: 'hold', label: '말린다', hint: '아무도 다치지 않는다 · 아무것도 바뀌지 않는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'chain') {
        if (roll(S, 0.4)) return { t: fmt(S, '면담은 "알겠다, 잘 처리하겠다"로 끝났습니다. 다음 주 {lt.name}은 이전보다 조용했고, 이전보다 정확히 나만 쳐다봤습니다.'), fx: { mind: -6 }, rel: { lt: -15 } };
        S.env.abuse = Math.max(0, S.env.abuse - 5);
        return { t: fmt(S, '중대장이 {lt.name}을 따로 불렀습니다. 그다음 주부터 폭언이 줄었습니다. 줄었을 뿐 사라지진 않았고, 그래도 나는 처음으로 절차가 움직이는 걸 봤습니다.'), fx: { mind: -2 }, rel: { lt: -10 } };
      }
      if (k === 'post') { S.env.abuse = Math.max(0, S.env.abuse - 10); return { t: '글은 새벽에 퍼졌습니다. 아침에 감찰이 왔고 그 주 외출은 전부 통제됐습니다. 소대는 처음으로 내가 누구 편인지 묻지 않았습니다. 그냥 쳐다봤습니다.', fx: { mind: -5 }, rel: { lt: -25, sfc: -10, peer: 5 }, ban: 1 }; }
      return { t: '"조금만 더 참아 보자." 말려 놓고 나서 알았습니다. 내가 말린 건 글이 아니라 내 순서였습니다.', fx: { mind: -7 }, rel: { peer: -6 } };
    } }),

  D('e04', { id: 'era_e4_data_gift', src: 'era-culture §7-E4 딜레마4 [S_cul_30]', w: 3, when: { phone: true },
    c: (S) => S.rank <= 1 && here(S, 'senior'),
    build: (S) => ({
      title: '"데이터 남지?"',
      body: fmt(S, '{senior.name}이 내 폰을 가리켰습니다. "야, 데이터 남지? 나 이번 달 다 썼다." 내 요금제는 부모님이 내 주시는 돈에서 나갑니다.'),
      choices: [
        { k: 'give', label: '5기가를 쏜다', hint: '선임은 흡족하다 · 다음 달에도 기대한다' },
        { k: 'refuse', label: '"저도 모자랍니다"', hint: '부모님 돈은 지킨다 · 선임이 삐친다' },
        { k: 'fake', label: '요금제가 작다고 속인다', hint: '당장은 넘긴다 · 들키면 거짓말쟁이가 된다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'give') return { t: fmt(S, '5기가를 보냈습니다. {senior.name}은 "역시"라고 했습니다. 그 "역시"는 칭찬이 아니라 서류 확인 같은 말이었습니다.'), fx: { mind: -3 }, rel: { senior: 6 }, mark: { set: { era_data_fed: {} } } };
      if (k === 'refuse') return { t: fmt(S, '"저도 모자랍니다." {senior.name}은 고개를 끄덕였지만 다음 날부터 내 이름 앞에 한숨이 붙었습니다.'), fx: { mind: -3 }, rel: { senior: -14 } };
      if (roll(S, 0.4)) return { t: fmt(S, '"2기가밖에 없습니다." 거짓말은 이틀 뒤 다른 후임의 입에서 무너졌습니다. {senior.name}의 표정은 화가 아니라 실망이었습니다.'), fx: { mind: -4 }, rel: { senior: -10 } };
      return { t: '"2기가밖에 없습니다." 선임은 "그럼 됐다"고 했습니다. 거짓말 하나로 부모님 돈 오천 원을 지켰습니다.', fx: { mind: -2 } };
    } }),

  D('e04', { id: 'era_e4_gamble', src: 'era-culture §7-E4 딜레마5 [S_cul_66]', w: 3, when: { phone: true },
    c: (S) => S.ym >= '2019-04' && S.rank >= 1 && here(S, 'peer'),
    build: (S) => ({
      title: '오천 원 두 배',
      body: fmt(S, '{peer.name}이 폰 화면을 내밀었습니다. "이거 오천 원 넣으면 두 배다. 한 번만." 불법 사이트라는 건 둘 다 알고 있습니다. 같이 하자는 표정이 진짜입니다.'),
      choices: [
        { k: 'join', label: '같이 한다', hint: '짜릿하다 · 잃거나 적발될 수 있다' },
        { k: 'refuse', label: '거절한다', hint: '깨끗하다 · 동기가 서먹해진다' },
        { k: 'report', label: '간부에게 알린다', hint: '동기를 막는다 · 신뢰를 잃는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'join') {
        if (roll(S, 0.25)) return { t: '보관함 앞 불시 점검에 사이트 기록이 걸렸습니다. 오천 원이 군기교육 오 일이 됐습니다. 계산을 다시 해 보니 두 배가 아니라 오천 배였습니다.', fx: { mind: -8 }, rel: { peer: -5 }, punish: { kind: 'drill', n: 5 } };
        if (roll(S, 0.6)) return { t: '오천 원은 십 분 만에 사라졌고 한 번 더가 두 번 더가 됐습니다. 그달 PX 영수증은 비어 있었습니다.', fx: { mind: -6 }, rel: { peer: 4 } };
        return { t: '처음엔 땄습니다. 기분이 좋았고, 그다음 날부터 폰이 계속 손에 쥐어져 있었습니다. 기분 좋은 건 하루였습니다.', fx: { mind: -2 }, rel: { peer: 4 } };
      }
      if (k === 'refuse') return { t: fmt(S, '"난 안 한다." {peer.name}은 어깨를 으쓱했습니다. 그날 이후 그의 화면이 내 쪽으로 돌아오지 않았습니다.'), fx: { mind: -2 }, rel: { peer: -10 } };
      return { t: fmt(S, '소대장에게 말했고 {peer.name}은 면담을 받았습니다. 그가 나를 쳐다보며 한 말은 "알려 줘서 고맙다"가 아니라 "그래?"였습니다.'), fx: { mind: -4 }, rel: { peer: -25, lt: 6, sfc: 4 } };
    } }),

  // ═══════════════ e05 2022~ — 월급 100만 원 시대 ═══════════════
  E('e05', { id: 'era_e5_payday', src: 'era-culture §7-E5-1 [S_cul_39]', w: 3,
    run: (S) => ({ t: `월급날 문자가 왔습니다. 숫자가 이렇게 커진 줄 몰랐습니다. ${S.money.monthlyDeposit > 0 ? `그중 ${won(S.money.monthlyDeposit)}이 적금으로 빠져나갔습니다. 남은 숫자는 생각보다 작았습니다.` : '적금은 넣지 않았으니 숫자는 그대로 남았습니다. 쓸 데가 마땅치 않다는 게 더 낯설었습니다.'}`, fx: { mind: 3 } }) }),

  E('e05', { id: 'era_e5_screens', src: 'era-culture §7-E5-2 [S_cul_37]', w: 4, when: { phone: true },
    run: () => ({ t: '일과 후 생활관에 일곱 명이 있었고 일곱 개의 화면이 빛났습니다. 말은 한 마디도 없었습니다. 누가 웃자 여섯 명이 고개를 들었다가 다시 내렸습니다.', fx: { mind: 2, rel: -2 } }) }),

  E('e05', { id: 'era_e5_9pm', src: 'era-culture §7-E5-3 [S_cul_36]', w: 3, when: { phone: true },
    run: () => ({ t: '아홉 시가 되자 폰을 보관함에 넣었습니다. 하루가 끝나는 소리가 철컥 났습니다. 그제야 오늘 입으로 몇 마디를 했는지 세어 봤습니다.', fx: { mind: -1 } }) }),

  E('e05', { id: 'era_e5_sunday_hour', src: 'era-culture §7-E5-4 [S_cul_36]', w: 20, max: 1, when: { phase: ['train'] },
    run: () => ({ t: '일요일에 한 시간 폰을 받았습니다. 어머니에게 건 첫마디는 "밥은요"였습니다. 이십 분쯤 지나서야 내가 아직 훈련병이라는 사실이 기억났습니다.', fx: { mind: 5 } }) }),

  E('e05', { id: 'era_e5_navy_sim', src: 'era-culture §7-E5-5 [S_cul_37]', w: 5, when: { branch: ['navy'], phone: true },
    c: (S) => where(S) === 'sea',
    run: () => ({ t: '출항 전에 유심을 뺐습니다. 항구가 멀어지자 화면이 꺼진 것처럼 하루가 조용해졌습니다. 갑판에서 본 바다는 와이파이 표시 없이도 넓었습니다.', fx: { mind: -2 } }) }),

  E('e05', { id: 'era_e5_special_meal', src: 'era-culture §7-E5-6 [S_cul_59]', w: 3,
    run: () => ({ t: '이달 특식은 치킨 반 마리와 치즈볼이었습니다. 투표에서 이겼습니다. 우리 중대가 뭔가에서 이긴 건 처음이었습니다. 이긴 방식이 투표라는 게 더 낯설었습니다.', fx: { mind: 5, fit: 1 } }) }),

  E('e05', { id: 'era_e5_convenience', src: 'era-culture §7-E5-7 [S_cul_57] (브랜드명 생략)', w: 2,
    c: (S) => (S.leave?.used ?? 0) > 0,
    run: () => ({ t: '휴가 중 편의점 냉동 코너에서 부대 PX에서 보던 포장을 만났습니다. 전자레인지 이 분 삼십 초. 먹어 보니 맛이 같았습니다. 달라진 건 먹는 나였습니다.', fx: { mind: 3 } }) }),

  E('e05', { id: 'era_e5_live', src: 'era-culture §7-E5-8 [S_cul_37]', w: 3, when: { phone: true }, p: 0.6,
    run: () => ({ t: '누군가 생활관에서 라이브 방송을 켰습니다. 시청자가 오십 명을 넘겼습니다. 소등 후에 불려 나간 건 우리 중대 전체였습니다. 방송 제목은 "군대 일상"이었습니다.', fx: { mind: -3, rel: -2 } }) }),

  E('e05', { id: 'era_e5_ombuds', src: 'era-culture §7-E5-9 [S_cul_61]', w: 3,
    c: (S) => S.ym >= '2022-07',
    run: () => ({ t: '대청소가 시작됐습니다. 누가 오느냐고 물었더니 "손님"이라고만 했습니다. 손님 오는 날짜는 삼 일 전에 정해져 있었습니다. 삼 일이면 먼지도 잘 닦입니다.', fx: { mind: -2, fit: -2 } }) }),

  E('e05', { id: 'era_e5_remote', src: 'era-culture §1-1 ④ TV 채널권 [S_cul_53]', w: 3, when: { phone: true }, p: (S) => ab(S, 0.3, 0.9),
    c: (S) => S.rank <= 1 && here(S, 'roomSenior'),
    run: (S) => ({ t: fmt(S, '생활관 TV 리모컨은 아직 {roomSenior.name} 옆에 있습니다. 모두 폰으로 보는데도 TV는 켜져 있고, 채널은 정해진 사람이 정합니다. 아무도 보지 않는 화면이 누구의 권력인지는 분명했습니다.'), fx: { mind: -2 } }) }),

  E('e05', { id: 'era_e5_bank_day', src: 'era-culture §5-2 E5 [S_cul_39]', w: 5,
    c: (S) => S.rank >= 3 && S.monthsLeft != null && S.monthsLeft <= 4 && S.money.savings > 0,
    run: (S) => ({ t: `통장에 찍힌 숫자를 세 번 읽었습니다. 적금 ${won(S.money.savings)}. 입대 전엔 만져 본 적 없는 자릿수입니다. 계산기를 두드리는 후임 옆에서 나는 숫자 대신 지난 일 년 반을 읽었습니다.`, fx: { mind: 6 } }) }),

  E('e05', { id: 'era_e5_notebook_back', src: 'era-culture §7-E5 딜레마2 후속 [S_cul_51]', w: 6, needs: 'era_memo',
    c: (S) => S.rank >= 2 && since(S, 'era_memo', 4),
    run: () => ({ t: '관물대 서랍에서 그때 그 수첩이 나왔습니다. 적힌 이름 스무 개 중 열여섯 명은 이미 전역했습니다. 한 장씩 찢어서 버렸습니다. 후임에게 물려줄 생각은 그 종이만큼도 들지 않았습니다.', fx: { mind: 5 }, mark: { del: ['era_memo'] } }) }),

  // ── e05 딜레마 ──
  D('e05', { id: 'era_e5_money_social', src: 'era-culture §7-E5 딜레마1 [S_cul_39]', w: 3,
    c: (S) => S.rank >= 1 && S.money.monthlyDeposit > 0 && here(S, 'peer'),
    build: (S) => ({
      title: '적금이냐 회식이냐',
      body: fmt(S, `적금은 매달 ${won(S.money.monthlyDeposit)}씩 쌓입니다. 휴가 나온 김에 동기들이 회식을 하자고 합니다. {peer.name}도 간다고 합니다. 가면 숫자가 줄고, 안 가면 사람이 줄 겁니다.`),
      choices: [
        { k: 'save', label: '적금을 지킨다', hint: '목돈은 지킨다 · "짠돌이"라는 소리를 듣는다' },
        { k: 'go', label: '회식에 간다', hint: '동기들과 가까워진다 · 적금 납입액이 줄어든다' },
        { k: 'half', label: '반만 내고 먼저 일어난다', hint: '양쪽 다 조금 서운하다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'save') return { t: '"나는 다음에 갈게." 문자를 보내고 통장 앱을 켰습니다. 숫자는 그대로였고, 단톡방의 사진은 다음 날 아침까지 올라왔습니다.', fx: { mind: -3 }, rel: { peer: -8 } };
      if (k === 'go') { S.money.monthlyDeposit = Math.max(0, S.money.monthlyDeposit - 100000); return { t: '고기를 구웠고 노래방까지 갔습니다. 계산서 숫자를 보고 적금 자동이체를 십만 원 줄였습니다. 그날 사진 속 내 얼굴이 제일 크게 웃고 있었고, 다음 날 아침의 내 얼굴이 제일 창백했습니다.', fx: { mind: 4, fit: -2 }, rel: { peer: 10 } }; }
      S.money.monthlyDeposit = Math.max(0, S.money.monthlyDeposit - 50000);
      return { t: '반만 내고 열 시에 일어났습니다. "먼저 들어갈게." 문을 닫고 나서야 안에서 내 이야기가 시작됐을 것 같았습니다.', fx: { mind: -2 }, rel: { peer: 2 } };
    } }),

  D('e05', { id: 'era_e5_memorize', src: 'era-culture §7-E5 딜레마2 [S_cul_51] (실제 사건은 연도·유형만)', w: 8, p: (S) => ab(S, 0.5, 1),
    c: (S) => S.rank <= 1 && here(S, 'senior'),
    build: (S) => ({
      title: '수첩의 이름들',
      body: fmt(S, '{senior}이 수첩을 건넸습니다. 간부 이름, 선임 이름, 기수. 스무 개쯤 됩니다. "내일까지." 틀리면 안 된다는 말은 웃으면서 했습니다. 지켜보는 눈은 생각보다 많습니다.'),
      help: HELP,
      choices: [
        { k: 'memorize', label: '외운다', hint: '당장은 조용하다 · 이게 당연해진다' },
        { k: 'report', label: '상담관과 간부에게 알린다', hint: '이어질 일을 끊는다 · 보복이나 따돌림이 걱정된다' },
        { k: 'together', label: '동기와 같이 거부한다', hint: '혼자가 아니다 · 단체로 찍힌다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'memorize') return { t: fmt(S, '화장실 불 밑에서 이름을 외웠습니다. 다음 날 {senior.name}이 하나씩 물었고 나는 열아홉 개를 맞혔습니다. 틀린 하나에 대한 이야기가 열아홉 개보다 길었습니다.'), fx: { mind: -6 }, rel: { senior: 2 }, mark: { set: { era_memo: {} } } };
      if (k === 'report') {
        if (roll(S, 0.35)) return { t: fmt(S, '상담관 면담 뒤에 조사가 시작됐고, 사흘 뒤엔 {senior.name}과 가까운 사람 전부가 누가 말했는지 알았습니다. 아무도 크게 말하지 않았지만 식당 자리가 조금씩 멀어졌습니다.'), fx: { mind: -8 }, rel: { senior: -25, peer: -5 } };
        S.env.abuse = Math.max(0, S.env.abuse - 12);
        return { t: fmt(S, '상담관은 내 이야기를 끝까지 들었습니다. 일주일 뒤 {senior.name}의 수첩이 압수됐고, 그 일을 아는 사람이 한 명 더 늘었습니다. 나는 처음으로 밤에 잠을 잤습니다.'), fx: { mind: -2 }, rel: { senior: -30, sfc: 8 } };
      }
      return { t: fmt(S, '동기와 함께 "저희는 못 외우겠습니다"라고 했습니다. {senior.name}은 웃음을 거뒀고, 그날 밤 우리 둘은 군장을 멨습니다. 연병장을 도는 동안 동기가 처음으로 내 이름을 크게 불렀습니다.'), fx: { fit: -3, mind: -3 }, rel: { peer: 10, senior: -18 } };
    } }),

  D('e05', { id: 'era_e5_live_post', src: 'era-culture §7-E5 딜레마3 [S_cul_37]', w: 3, when: { phone: true },
    c: (S) => here(S, 'peer'),
    build: (S) => ({
      title: '소등 후의 브이로그',
      body: fmt(S, '{peer.name}이 폰을 들어 보였습니다. "소등 후에 생활관 브이로그 찍을까? 조회수 잘 나올 것 같은데." 렌즈 속에 생활관 전체가 들어옵니다.'),
      choices: [
        { k: 'post', label: '같이 올린다', hint: '인기를 얻는다 · 징계가 따라온다' },
        { k: 'stop', label: '삭제하게 한다', hint: '모두 무사하다 · 동기와 서먹해진다' },
        { k: 'tell', label: '몰래 간부에게 알린다', hint: '규정을 지킨다 · 동기가 알게 된다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'post') return { t: '조회수는 이틀 만에 만을 넘겼습니다. 사흘째에 행정반에서 부름이 왔습니다. 댓글에 "여기 어디냐"가 제일 많았다고 합니다. 부대 이름이 그대로 보이는 간판이 찍혀 있었습니다.', fx: { mind: 4 }, rel: { peer: 8, sfc: -10, lt: -8 }, punish: { kind: 'reprimand' } };
      if (k === 'stop') return { t: fmt(S, '"지워라." {peer.name}은 아쉬운 얼굴로 영상을 지웠습니다. 휴지통 비우기까지 같이 지켜봤더니 그의 눈빛이 멀어졌습니다.'), fx: { mind: -2 }, rel: { peer: -10 } };
      return { t: fmt(S, '소대장에게 조용히 말했습니다. 영상은 올라가기 전에 지워졌습니다. 다음 날 {peer.name}이 나를 보며 "누가 말했을까"를 중얼거렸고, 나는 대답하지 않았습니다.'), fx: { mind: -4 }, rel: { peer: -22, lt: 6, sfc: 6 } };
    } }),

  D('e05', { id: 'era_e5_delivery', src: 'era-culture §7-E5 딜레마4 [S_cul_35]', w: 3, when: { phone: true },
    c: (S) => here(S, 'peer') && S.rank >= 1,
    build: (S) => ({
      title: '열두 시의 배수로',
      body: fmt(S, '{peer.name}이 속삭였습니다. "오늘 밤 열두 시, 위병소 쪽 배수로에 치킨 온다." 간부 몰래 배달입니다. 주문은 이미 들어갔고, 내 이름도 이미 불렸습니다.'),
      choices: [
        { k: 'join', label: '같이 시킨다', hint: '야식이 생긴다 · 적발되면 같이 징계다' },
        { k: 'refuse', label: '거절한다', hint: '안전하다 · 동기가 서운해한다' },
        { k: 'report', label: '간부에게 알린다', hint: '규정을 지킨다 · 배신자라는 말이 돈다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'join') {
        if (roll(S, 0.35)) return { t: '배수로 앞에서 치킨 봉지를 받는 순간 손전등이 켜졌습니다. 당직사관 목소리가 "그거 뭐냐"고 했습니다. 닭다리는 아직 뜨거웠고 나는 아직 뜨거웠습니다.', fx: { mind: -6 }, rel: { peer: -4 }, punish: { kind: 'leaveCut', n: 3 } };
        return { t: '치킨은 식어 있었지만 맛있었습니다. 소등 후 이불 속에서 먹는 소리가 났습니다. 다음 날 아침 다섯 명의 입에서 같은 냄새가 났습니다.', fx: { mind: 5, fit: -2 }, rel: { peer: 6 } };
      }
      if (k === 'refuse') return { t: fmt(S, '"난 빠질게." {peer.name}은 웃으며 "그래라"라고 했습니다. 다음 날 아침, 생활관에서 나만 모르는 냄새가 났습니다.'), fx: { mind: -2 }, rel: { peer: -8 } };
      return { t: '당직사관에게 "배수로 쪽 보시는 게 좋겠습니다"라고 했습니다. 열두 시에 불이 켜졌고, 다음 날 생활관에서 내 이름이 불리지 않는 방식으로 불렸습니다.', fx: { mind: -4 }, rel: { peer: -25, sfc: 6 } };
    } }),

  D('e05', { id: 'era_e5_ddae', src: 'era-culture §7-E5 딜레마5 [S_cul_65][S_new_12]', w: 3,
    c: (S) => S.rank >= 2 && here(S, 'junior') && here(S, 'roomSenior'),
    build: (S) => ({
      title: '"요즘 군대 편하다"',
      body: fmt(S, '{junior.name}이 한숨을 쉬었습니다. "휴가 나가면 다들 요즘 군대 편하다고만 해서 억울해요." 그 말을 {roomSenior}이 들었습니다. "우리 땐 말이야"를 꺼낼 표정입니다.'),
      choices: [
        { k: 'junior', label: '후임 편을 든다', hint: '후임 신뢰를 얻는다 · 선임이 나를 겨눈다' },
        { k: 'senior', label: '선임 편을 든다', hint: '선임 비위를 맞춘다 · 후임이 마음을 닫는다' },
        { k: 'laugh', label: '웃어넘기며 화제를 돌린다', hint: '충돌은 피한다 · 둘 다 서운해한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'junior') return { t: fmt(S, '"{junior.name}도 힘든 건 맞습니다." 생활관이 조용해졌습니다. {roomSenior.name}은 "많이 컸네"라고 했고, 그 말에는 칭찬 성분이 하나도 없었습니다.'), fx: { mind: -3 }, rel: { junior: 14, roomSenior: -12 } };
      if (k === 'senior') return { t: fmt(S, '"그래도 예전엔 더 힘들었다더라." 말하고 나서 {junior.name}의 표정을 봤습니다. 이미 닫혀 있었습니다. 열쇠는 내 손에도 없었습니다.'), fx: { mind: -4 }, rel: { roomSenior: 8, junior: -14 } };
      return { t: '"야, 치킨이나 시킬까요?" 웃음소리는 났습니다. 둘 다 웃었지만 둘 다 끝까지 웃지는 않았습니다.', fx: { mind: -3 }, rel: { roomSenior: -4, junior: -4 } };
    } }),
];
