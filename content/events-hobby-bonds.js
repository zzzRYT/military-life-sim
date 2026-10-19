// content/events-hobby-bonds.js — 취미 사건 10 + 관계 사건 10 (§3 형식)
// 취미는 S.hobby (id 문자열 또는 null), 관계는 S.bonds = { lover: number|null, family: number }.
// 확률·수치는 전부 '가정'. 문체: 전역자의 썰(~습니다). 휴대폰이 없던 시절(phoneOn 거짓)엔 공중전화·편지 문구로 갈린다.
// 결정은 모든 선택지가 무언가를 잃는다 (docs/05 G4).

import { rand, where, phoneOn } from '../src/engine.js';

import { fmt } from '../src/text.js';

const clampB = (v) => Math.max(0, Math.min(100, v));
const roll = (S, p) => rand(S) < p;
const spend = (S, won) => { S.money.cash = Math.max(0, S.money.cash - won); }; // 힌트에 적힌 돈을 실제로 쓴다

/** 관계 스탯 접근. lover가 null이면 연인 없음(해당 사건 비활성, 증감 무연산). */
function bonds(S) {
  if (!S.bonds) S.bonds = { lover: null, family: 60 };
  return S.bonds;
}
const hasLover = (S) => bonds(S).lover != null;
const addLover = (S, d) => { const b = bonds(S); if (b.lover != null) b.lover = clampB(b.lover + d); };
const addFamily = (S, d) => { const b = bonds(S); b.family = clampB(b.family + d); };
const endLover = (S) => { bonds(S).lover = null; }; // 연인 축 종료 (고무신)

/** 휴가 중 만남 사건용: onLeave 플래그가 있으면 그때만, 없으면 낮은 확률로 serve 중에 */
const onLeaveish = (S) => S.onLeave === true || roll(S, 0.25);

// 어머니 생신 — 근무 환경(where)별 상황·선택지 (가정). 휴대폰 시대에 따라 전화 수단이 갈린다
function mom(S) {
  const on = phoneOn(S);
  const M = {
    land: { body: '동기가 "오늘 어머님 생신 아니냐"고 묻기 전까지 몰랐습니다. 달력에 동그라미를 쳐 놨는데, 그 달력을 안 봤습니다.',
      choices: [
        { k: 'call', label: on ? '바로 전화한다' : '공중전화 줄을 선다', hint: on ? '늦었지만 진심 · 쉬는 시간을 쓴다' : '늦었지만 진심 · 줄이 길고 카드가 모자라다' },
        { k: 'gift', label: '택배로 선물을 보낸다', hint: '3만 원 · 도착은 며칠 뒤' },
        { k: 'skip', label: '넘어간다', hint: '돈도 시간도 아낀다 · 어머니는 잊지 않는다' }],
      done: { call: on ? '바로 전화했습니다. "기억하고 있었지?" 하고 둘러댔습니다. 어머니는 "알았다"고만 했는데 목소리가 웃고 있었습니다.' : '공중전화에 줄을 서 전화카드를 긁었습니다. "기억하고 있었지?" 하고 둘러댔습니다. 어머니는 "알았다"고만 했는데 목소리가 웃고 있었습니다.',
        gift: '택배로 선물을 보냈습니다. 3만 원이 월급에서 나갔습니다. 어머니는 포장지를 뜯다가 "이런 건 왜 보내" 하고 전화로 우셨다고 합니다.' } },
    sea: { body: on ? '출항 사흘째, 달력을 보다 알았습니다. 오늘이 어머니 생신입니다. 바다 위에서는 휴대폰이 안 터집니다.' : '출항 사흘째, 달력을 보다 알았습니다. 오늘이 어머니 생신입니다. 바다 위에서는 전화가 닿지 않습니다.',
      choices: [
        { k: 'call', label: '함정 전화 줄을 선다', hint: '1분 남짓 · 당직 눈치' },
        { k: 'gift', label: '입항하면 꽃을 보낸다', hint: '늦지만 3만 원' },
        { k: 'skip', label: '편지로 대신한다… 다음에', hint: '결국 못 쓴다' }],
      done: { call: '함정 전화로 1분. "바다 소리 들린다"며 어머니가 웃었습니다. 뒤에서 당직 선임이 헛기침을 했습니다.', gift: '입항하자마자 꽃을 주문했습니다. 사흘 늦은 생신 선물입니다. 3만 원이 월급에서 나갔습니다.' } },
    remote: { body: on ? '외딴 소초, 휴대폰 사용 시간은 저녁 한 시간뿐입니다. 그 시간이 이미 지났다는 걸 이제야 알았습니다.' : '외딴 소초, 공중전화는 소초에 한 대뿐이고 전화카드는 오늘 아침에 다 썼습니다. 어머니 생신이라는 걸 이제야 알았습니다.',
      choices: [
        { k: 'call', label: on ? '소초장에게 사정한다' : '소초장실 전화를 빌린다', hint: '5분만 · 눈치' },
        { k: 'gift', label: 'PX 택배로 선물을 보낸다', hint: '3만 원 · 며칠 걸린다' },
        { k: 'skip', label: '내일 전화한다', hint: '하루 늦는다' }],
      done: { call: '소초장이 5분을 내줬습니다. 어머니는 "밥은 잘 먹냐"만 물었습니다. 5분이 5초처럼 지나갔습니다.', gift: '택배가 사흘 걸려 도착했습니다. 어머니가 선물 사진을 보내 주셨는데, 사진 속 어머니가 선물보다 크게 웃고 있었습니다.' } },
  };
  return M[where(S)] ?? M.land;
}

export const HOBBY_BOND_EVENTS = [
  // ── 취미 사건 10 ──
  { id: 'hobby_reading_waitlist', kind: 'event', when: { phase: ['serve'] }, w: 2,
    c: (S) => S.hobby === 'reading',
    run: (S) => {
      if (roll(S, 0.7)) return { t: '진중문고에서 예약해 둔 책이 왔습니다. 두 달 기다린 인기 도서입니다. 표지가 너덜한 걸 보니 내 앞에 열두 명이 읽은 책이었습니다.', fx: { skill: 3, mind: 2 } };
      return { t: '진중문고 예약 대기 순번이 아직 멉니다. 기다리는 동안 다른 책을 읽었는데, 이 책이 의외로 더 재밌었습니다.', fx: { skill: 1, mind: -2 } };
    } },

  { id: 'hobby_weight_protein', kind: 'event', when: { phase: ['serve'] }, w: 2,
    c: (S) => S.hobby === 'weight',
    run: (S) => ({ t: phoneOn(S)
      ? 'PX 프로틴이 품절입니다. 온라인으로 주문했고 도착까지 사흘. 사흘 동안 닭가슴살만 쳐다봤습니다.'
      : 'PX에 프로틴이 없습니다. 면회 오는 친구에게 부탁했고 다음 면회는 3주 뒤입니다. 3주 동안 삶은 계란만 쳐다봤습니다.', fx: { fit: 2, mind: -1 } }) },

  { id: 'hobby_cert_d30', kind: 'event', when: { phase: ['serve'] }, w: 2, gap: 3, src: '가정',
    c: (S) => S.hobby === 'cert',
    run: () => ({ t: '자격증 시험이 30일 남았습니다. 자투리 시간을 전부 문제집에 썼습니다. 화장실에서도 보고 줄 서서도 보고 불침번 서면서도 봤습니다.', fx: { skill: 4, mind: -3 } }) },

  { id: 'hobby_guitar_string', kind: 'event', when: { phase: ['serve'] }, w: 2,
    c: (S) => S.hobby === 'guitar',
    run: (S) => ({ t: phoneOn(S)
      ? '기타 줄이 끊어졌습니다. PX에는 없어 온라인으로 주문했습니다. 새 줄로 갈고 나니 소리가 맑았고, 생활관이 조용히 귀를 기울였습니다.'
      : '기타 줄이 끊어졌습니다. 면회 온 친구에게 새 줄을 부탁했습니다. 새 줄로 갈고 나니 소리가 맑았고, 생활관이 조용히 귀를 기울였습니다.', fx: { mind: 2 } }) },

  { id: 'hobby_ball_injury', kind: 'event', when: { phase: ['serve'] }, w: 2, gap: 6, src: '가정',
    c: (S) => S.hobby === 'ball',
    run: (S) => ({ t: fmt(S, '축구 시합 중 {peer.name}과 부딪혀 발목을 접질렸습니다. 일주일은 운동 금지입니다. {peer.name}은 미안하다며 PX 음료수를 사 왔는데, 발목은 음료수로 안 나았습니다.'), fx: { fit: -8, mind: -4 } }) },

  { id: 'hobby_mobilegame_whale', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    c: (S) => S.hobby === 'mobilegame',
    build: () => ({
      title: '현질 유혹',
      body: '신규 한정 캐릭터 픽업이 열렸습니다. 생활관 동기들은 벌써 뽑기 화면을 돌려 가며 소리를 지르고 있었습니다. 지갑이 근질근질합니다.',
      src: '픽업 기간이 끝나면 한정 캐릭터는 못 뽑는다. 병사 월급으로 풀 패키지는 한 달 치에 가깝다.',
      choices: [
        { k: 'hold', label: '참는다', hint: '돈은 지킨다 · 한정 캐릭터를 놓친다' },
        { k: 'pass', label: '배틀패스만 산다', hint: '1만 1천 원 · 애매하게 아쉽다' },
        { k: 'whale', label: '풀 패키지를 지른다', hint: '9만 9천 원 · 이번 달은 빠듯하다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'pass') { spend(S, 11000); return { t: '배틀패스만 샀습니다. 1만 1천 원이 월급에서 나갔습니다. 뽑기 결과는 한정 캐릭터 대신 그 캐릭터의 친구였고, 밤새 퀘스트를 깨느라 책은 못 펴 봤습니다.', fx: { mind: 3, skill: -1 } }; }
      if (k === 'whale') { spend(S, 99000); return { t: '풀 패키지를 질렀습니다. 9만 9천 원. 한정 캐릭터가 나왔을 때는 소리를 질렀고, 통장 잔고를 볼 때는 조용해졌습니다. 이벤트 보상 챙기느라 사흘을 밤샜습니다.', fx: { mind: 5, skill: -2 } }; }
      return { t: '참았습니다. 무과금의 자존심입니다. 동기가 한정 캐릭터를 뽑는 걸 구경만 하는데 화면이 유난히 눈부셨습니다.', fx: { mind: -1 } };
    } },

  { id: 'hobby_board_champion', kind: 'event', when: { phase: ['serve'] }, w: 2, gap: 4,
    c: (S) => S.hobby === 'board',
    run: (S) => {
      if (roll(S, 0.4)) return { t: fmt(S, '생활관 바둑 최강자전에서 우승했습니다. 결승 상대는 {peer.name}이었고, 상품은 PX 이용권이었습니다. 이용권을 받고 {peer.name}에게 한 병 사 줬습니다.'), fx: { skill: 2, mind: 3 } };
      return { t: fmt(S, '생활관 바둑 최강자전 결승에서 {peer.name}에게 졌습니다. 마지막 한 수가 아직도 눈에 아른거립니다. 다음 달 설욕전입니다.'), fx: { skill: 1, mind: 1 } };
    } },

  { id: 'hobby_running_knee', kind: 'event', when: { phase: ['serve'] }, w: 2, gap: 6, src: '가정',
    c: (S) => S.hobby === 'running',
    run: () => ({ t: '무릎에 통증이 왔습니다. 과훈련 신호입니다. 일주일 쉬고 페이스를 낮췄습니다. 달리지 않는 저녁이 이렇게 길 줄 몰랐습니다.', fx: { fit: -3, mind: -1 } }) },

  { id: 'hobby_photo_regulation', kind: 'event', when: { phase: ['serve'] }, w: 1, gap: 6, src: '가정',
    c: (S) => S.hobby === 'photo',
    run: (S) => ({ t: phoneOn(S)
      ? '생활관 사진을 올렸다가 촬영 규정 위반으로 주의를 받았습니다. 사진 뒤 창밖에 부대 시설이 찍혀 있었습니다. 보안 구역 촬영 금지를 다시 읽었습니다.'
      : '일회용 카메라로 찍은 생활관 사진을 면회 온 가족에게 넘기려다 촬영 규정 위반으로 주의를 받았습니다. 필름은 압수됐습니다. 보안 구역 촬영 금지를 다시 읽었습니다.', fx: { mind: -4 } }) },

  { id: 'hobby_elearning_exam', kind: 'decision', when: { phase: ['serve'] }, w: 2, gap: 6,
    c: (S) => S.hobby === 'elearning',
    build: (S) => ({
      title: '온라인 시험과 당직이 겹쳤다',
      body: fmt(S, '군 e-러닝 기말 시험 시간에 하필 당직이 잡혔습니다. 당직표를 한참 보다가 {peer.name}의 이름 옆에 시선이 멈췄습니다.'),
      src: '시험을 놓치면 이번 학기 학점은 못 받고 다음 학기에 다시 들어야 한다.',
      choices: [
        { k: 'shift', label: '당직 교대를 부탁한다', hint: '성공하면 시험 응시 · 동기에게 빚을 진다' },
        { k: 'giveup', label: '이번 학기는 포기한다', hint: '빚은 없다 · 다음 학기에 다시' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'shift') {
        if (roll(S, 0.6)) return { t: fmt(S, '{peer.name}이 당직을 바꿔 줬습니다. 시험을 치렀고, 점수는 나쁘지 않았습니다. 다음 달 {peer.name}의 외출 날 PX 음료수를 사 주기로 했습니다.'), fx: { skill: 4 }, rel: { peer: -5 } };
        return { t: '교대해 줄 사람이 없었습니다. 시험은 놓쳤고, 부탁만 하고 다닌 사람이 됐습니다.', fx: { mind: -4 }, rel: { peer: -3 } };
      }
      return { t: '이번 학기는 포기하고 다음 학기에 다시 듣기로 했습니다. 당직 서는 밤, 모니터에 뜬 시험 안내 창을 조용히 닫았습니다.', fx: { mind: -2 } };
    } },

  // ── 관계 사건 10 ──
  // 수료식(연인·가족)은 events-bootcamp.js 마지막 주 일정으로 옮김

  { id: 'bond_gomsin_crisis', kind: 'decision', when: { phase: ['serve'] }, w: 2, gap: 3, src: '가정',
    c: (S) => hasLover(S) && bonds(S).lover <= 30,
    build: (S) => ({
      title: '연락이 뜸해졌다',
      body: phoneOn(S)
        ? '요즘 답장이 늦어지고 통화가 짧아졌습니다. "바빠"라는 말이 잦습니다. 읽음 표시만 있는 대화창을 몇 번이고 열어 봤습니다.'
        : '요즘 편지 간격이 벌어지고 통화가 짧아졌습니다. "바빠"라는 말이 잦습니다. 우편함 앞을 지나며 괜히 속도를 늦췄습니다.',
      src: '연인 관계는 연락 빈도에 따라 식는다. 30 이하에서는 위기 신호가 켜진다 (가정).',
      choices: [
        { k: 'call', label: phoneOn(S) ? '전화한다' : '공중전화 줄을 선다', hint: '목소리를 듣는다 · 쉬는 시간이 날아간다' },
        { k: 'letter', label: '손편지를 쓴다', hint: '진심이 닿는다 · 밤을 새운다, 며칠 걸린다' },
        { k: 'ignore', label: '그냥 둔다', hint: '잠은 잔다 · 마음이 식는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'call') { addLover(S, 10); return { t: '짬을 내 전화를 걸었습니다. 목소리를 듣고 조금 안심했습니다. 통화 끝에 "사랑해"를 말하려다 뒤에 줄 선 병사들 때문에 "잘 지내"로 바꿨습니다.', fx: { mind: 2, fit: -1 } }; }
      if (k === 'letter') { addLover(S, 15); return { t: '손편지를 썼습니다. 세 장을 썼다가 두 장을 구겼습니다. 며칠 뒤 답장이 왔는데, 봉투에서 향수 냄새가 났습니다.', fx: { mind: 3, fit: -2 } }; }
      addLover(S, -15);
      return { t: '그냥 두었습니다. 그날 밤은 푹 잤습니다. 연락은 더 뜸해졌고, 그게 편한 건지 슬픈 건지 모르겠습니다.', fx: { mind: -4, fit: 1 } };
    } },

  { id: 'bond_gomusin_breakup', kind: 'decision', when: { phase: ['serve'] }, w: 2, gap: 6, src: '가정',
    c: (S) => hasLover(S) && bonds(S).lover <= 10,
    build: (S) => ({
      title: '"우리 잠깐 생각할 시간을 갖자"',
      body: phoneOn(S)
        ? '밤늦게 메시지가 왔습니다. 답이 정해져 있는 것 같습니다. 침상에 누워 천장을 보는데 화면이 먼저 꺼졌습니다.'
        : '며칠 만에 편지가 왔습니다. 봉투가 얇습니다. 답이 정해져 있는 것 같습니다. 불침번 교대 시간까지 뜯지 못했습니다.',
      src: '연인 관계가 10 이하이면 이별 신호가 켜진다. 붙잡으면 확률이 반반이다 (가정).',
      choices: [
        { k: 'hold', label: '붙잡는다', hint: '반반 · 실패하면 자존심까지 잃는다' },
        { k: 'letgo', label: '쿨하게 보낸다', hint: '자존심은 지킨다 · 연인 관계 종료' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'hold') {
        if (roll(S, 0.5)) { addLover(S, 25); return { t: '긴 통화 끝에 붙잡았습니다. 끝나고 보니 전화카드가 한 장 통째로 사라져 있었습니다. 아직 끝나지 않았습니다.', fx: { mind: 5, fit: -1 } }; }
        endLover(S);
        return { t: '붙잡았지만 놓쳤습니다. 고무신을 거꾸로 신었습니다. 동기들이 말없이 컵라면을 하나 끓여 줬습니다.', fx: { mind: -20 } };
      }
      endLover(S);
      return { t: '쿨하게 보냈습니다. "그래, 잘 지내"라고 썼다가 지우고 다시 썼습니다. 밤이 길어졌습니다.', fx: { mind: -20 } };
    } },

  { id: 'bond_leave_date', kind: 'event', when: { phase: ['serve'] }, w: 1, src: '가정',
    c: (S) => hasLover(S) && onLeaveish(S),
    run: (S) => { addLover(S, 15); return { t: '휴가 중 여자친구와 데이트했습니다. 영화 한 편, 밥 한 끼. 5만 원이 나갔습니다. 팝콘 통에 손이 닿을 때마다 서로 놀라서 웃었습니다.', fx: { mind: 8 } }; } },

  { id: 'bond_mother_birthday', kind: 'decision', when: { phase: ['serve'] }, w: 1, gap: 12, src: '가정',
    build: (S) => ({ title: '어머니 생신을 깜빡했다', src: '생신을 넘기면 가족 관계가 떨어지고, 선물은 돈이 든다 (가정).', ...mom(S) }),
    apply: (S, k) => {
      const v = mom(S);
      if (k === 'call') { addFamily(S, 5); return { t: v.done.call, fx: { mind: -1 } }; }
      if (k === 'gift') { addFamily(S, 10); spend(S, 30000); return { t: v.done.gift, fx: { mind: -1 } }; }
      addFamily(S, -10);
      return { t: '넘어갔습니다. 어머니는 아무 말도 안 했고, 명절에 두고 보자고만 했습니다. 두고 보는 어머니가 제일 무섭습니다.', fx: { mind: -3 } };
    } },

  { id: 'bond_holiday_leave', kind: 'event', when: { phase: ['serve'] }, w: 2, src: '가정',
    c: (S) => ['01', '02', '09'].includes(S.ym.slice(5, 7)),
    run: (S) => {
      if (roll(S, 0.5)) { addFamily(S, 15); return { t: '명절 휴가에 당첨됐습니다. 본가에서 차례를 지냈습니다. 친척들이 전부 한 번씩 "군대 어디냐"고 물었는데, 열두 번째 대답은 거의 자동이었습니다.', fx: { mind: 5 } }; }
      return { t: '명절 휴가에서 탈락했습니다. 명절 당직을 섰습니다. 부대 PX에서 산 약과를 혼자 까먹으며 달을 봤습니다.', fx: { mind: -10 } };
    } },

  { id: 'bond_easy_military', kind: 'decision', when: { phase: ['serve'] }, w: 1, src: '가정',
    c: (S) => onLeaveish(S),
    build: () => ({
      title: '"요즘 군대 편해졌다"',
      body: '휴가 중 식사 자리에서 삼촌이 말했습니다. "요즘 군대는 편하다며?" 온 가족이 웃었고, 내 밥숟가락이 허공에서 멈췄습니다.',
      src: '휴가 중 가족 모임에서 흔히 나오는 말이다. 대꾸하는 방식에 따라 분위기가 갈린다 (가정).',
      choices: [
        { k: 'laugh', label: '웃어넘긴다', hint: '분위기는 지킨다 · 속은 쓰리다' },
        { k: 'sulk', label: '토라진다', hint: '속은 풀린다 · 분위기가 싸해진다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'laugh') return { t: '같이 웃었습니다. 웃으면서 소주잔을 두 번 더 비웠습니다. 속은 조금 쓰렸습니다.', fx: { mind: -5 } };
      addFamily(S, -5);
      return { t: '토라졌습니다. 숟가락을 내려놓았더니 식사 자리가 싸해졌습니다. 삼촌은 "농담이다" 했고 어머니는 눈짓으로 나를 불렀습니다.', fx: { mind: -10 } };
    } },

  { id: 'bond_funeral_leave', kind: 'event', when: { phase: ['serve'] }, w: 1, gap: 12, src: '가정',
    p: () => 0.08,
    run: (S) => {
      S.leave.left = Math.max(0, S.leave.left - 3);
      addFamily(S, 10);
      return { t: '집안에 경조사가 생겼습니다. 청원휴가 3일로 다녀왔습니다. 오랜만에 모인 친척들 사이에서 나만 군인의 걸음걸이를 하고 있었습니다.', fx: { mind: 2 } };
    } },

  { id: 'bond_d100', kind: 'decision', when: { phase: ['serve'] }, w: 2, src: '가정',
    c: (S) => hasLover(S) && S.monthsLeft != null && S.monthsLeft <= 4,
    build: () => ({
      title: '전역 D-100 커플 기념일',
      body: '전역 100일 전, 사귄 지 700일. 달력의 동그라미를 보며 한참 계산해야 했습니다.',
      src: '기념일을 챙기면 관계가 오르고 선물 값이 든다. 못 챙기면 서운해한다 (가정).',
      choices: [
        { k: 'celebrate', label: '챙긴다', hint: '관계가 오른다 · 선물 값 5만 원' },
        { k: 'miss', label: '못 챙긴다', hint: '돈은 아낀다 · 서운해한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'celebrate') { addLover(S, 10); spend(S, 50000); return { t: '기념일을 챙겼습니다. 선물 값 5만 원이 월급에서 나갔고, 선물 고르느라 외출 하루를 통째로 걸었습니다. 택배가 도착했다는 연락에 "고마워"가 세 줄 넘게 왔습니다.', fx: { mind: 3, fit: -1 } }; }
      addLover(S, -5);
      return { t: '기념일을 챙기지 못했습니다. 서운해했습니다. "바빴지?"라는 말 끝에 아무 말이 없는 게 더 무서웠습니다.', fx: { mind: -3 } };
    } },
];
