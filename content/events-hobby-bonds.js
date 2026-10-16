// content/events-hobby-bonds.js — 취미 사건 10 + 관계 사건 10 (§3 형식)
// 취미는 S.hobby (id 문자열 또는 null), 관계는 S.bonds = { lover: number|null, family: number }.
// 확률·수치는 전부 '가정'. 톤: 절제된 다큐멘터리, 비그래픽.

import { rand, where } from '../src/engine.js';

const clampB = (v) => Math.max(0, Math.min(100, v));
const roll = (S, p) => rand(S) < p;

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

// 어머니 생신 — 근무 환경(where)별 상황·선택지 (가정)
const MOM = {
  land: { body: '동기가 "오늘이 어머님 생신 아니냐"고 묻기 전까지 몰랐다.',
    choices: [{ k: 'call', label: '바로 전화한다', hint: '늦었지만 진심으로' }, { k: 'gift', label: '택배로 선물을 보낸다', hint: '3만 원' }, { k: 'skip', label: '넘어간다', hint: '잊힐 리가 없다' }],
    done: { call: '바로 전화했다. "기억하고 있었지?"라고 둘러댔다.', gift: '택배로 선물을 보냈다. 3만 원이 월급에서 나갔다.' } },
  sea: { body: '출항 사흘째, 달력을 보다 알았다. 오늘이 어머니 생신이다. 바다 위에선 휴대폰이 안 터진다.',
    choices: [{ k: 'call', label: '함정 전화 줄을 선다', hint: '1분 남짓 · 당직 눈치' }, { k: 'gift', label: '입항하면 꽃을 보낸다', hint: '늦지만 3만 원' }, { k: 'skip', label: '편지로 대신한다… 다음에', hint: '결국 못 쓴다' }],
    done: { call: '함정 전화로 1분. "바다 소리 들린다"며 어머니가 웃었다.', gift: '입항하자마자 꽃을 주문했다. 사흘 늦은 생신 선물.' } },
  remote: { body: '외딴 소초, 휴대폰 사용 시간은 저녁 한 시간뿐. 그 시간이 이미 지났다는 걸 알았다.',
    choices: [{ k: 'call', label: '소초장에게 사정한다', hint: '5분만 · 눈치' }, { k: 'gift', label: 'PX 택배로 선물을 보낸다', hint: '3만 원 · 며칠 걸린다' }, { k: 'skip', label: '내일 전화한다', hint: '하루 늦는다' }],
    done: { call: '소초장이 5분을 내줬다. 어머니는 "밥은 잘 먹냐"만 물었다.', gift: '택배가 사흘 걸려 도착했다. 어머니가 사진을 보내왔다.' } },
};

export const HOBBY_BOND_EVENTS = [
  // ── 취미 사건 10 ──
  { id: 'hobby_reading_waitlist', kind: 'event', when: { phase: ['serve'] }, w: 2,
    c: (S) => S.hobby === 'reading',
    run: (S) => {
      if (roll(S, 0.7)) return { t: '진중문고에서 예약해 둔 책이 왔다. 두 달 기다린 인기 도서다.', fx: { skill: 3, mind: 2 } };
      return { t: '진중문고 예약 대기 순번이 아직 멀다. 기다리는 동안 다른 책을 읽었다.', fx: { skill: 1, mind: -2 } };
    } },

  { id: 'hobby_weight_protein', kind: 'event', when: { phase: ['serve'] }, w: 2,
    c: (S) => S.hobby === 'weight',
    run: () => ({ t: 'PX 프로틴이 품절이다. 온라인으로 주문했고, 도착까지 사흘.', fx: { fit: 2, mind: -1 } }) },

  { id: 'hobby_cert_d30', kind: 'event', when: { phase: ['serve'] }, w: 2, gap: 3, src: '가정',
    c: (S) => S.hobby === 'cert',
    run: () => ({ t: '자격증 시험이 30일 남았다. 자투리 시간을 전부 문제집에 썼다.', fx: { skill: 4, mind: -3 } }) },

  { id: 'hobby_guitar_string', kind: 'event', when: { phase: ['serve'] }, w: 2,
    c: (S) => S.hobby === 'guitar',
    run: () => ({ t: '기타 줄이 끊어졌다. PX에는 없어 온라인으로 주문했다. 새 줄로 갈고 나니 소리가 맑다.', fx: { mind: 2 } }) },

  { id: 'hobby_ball_injury', kind: 'event', when: { phase: ['serve'] }, w: 2, gap: 6, src: '가정',
    c: (S) => S.hobby === 'ball',
    run: () => ({ t: '축구 시합 중 발목을 접질렀다. 일주일은 운동 금지다.', fx: { fit: -8, mind: -4 } }) },

  { id: 'hobby_mobilegame_whale', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    c: (S) => S.hobby === 'mobilegame',
    build: () => ({
      title: '현질 유혹',
      body: '신규 한정 캐릭터 픽업이 열렸다. 지갑이 근질근질하다.',
      choices: [
        { k: 'hold', label: '참는다', hint: '무과금의 자존심' },
        { k: 'pass', label: '배틀패스만 산다', hint: '1만 1천 원' },
        { k: 'whale', label: '풀 패키지를 지른다', hint: '9만 9천 원 · 이번 달은 빠듯하다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'pass') return { t: '배틀패스만 샀다. 1만 1천 원이 월급에서 나갔다.', fx: { mind: 4 } };
      if (k === 'whale') return { t: '풀 패키지를 질렀다. 9만 9천 원. 이번 달은 빠듯해졌다.', fx: { mind: 5 } };
      return { t: '참았다. 무과금으로 버틴다.', fx: { mind: 2 } };
    } },

  { id: 'hobby_board_champion', kind: 'event', when: { phase: ['serve'] }, w: 2, gap: 4,
    c: (S) => S.hobby === 'board',
    run: (S) => {
      if (roll(S, 0.4)) return { t: '생활관 바둑 최강자전에서 우승했다.', fx: { skill: 2, mind: 3 } };
      return { t: '생활관 바둑 최강자전 결승에서 졌다. 다음 달 설욕전이다.', fx: { skill: 1, mind: 1 } };
    } },

  { id: 'hobby_running_knee', kind: 'event', when: { phase: ['serve'] }, w: 2, gap: 6, src: '가정',
    c: (S) => S.hobby === 'running',
    run: () => ({ t: '무릎에 통증이 왔다. 과훈련 신호다. 일주일 쉬고 페이스를 낮췄다.', fx: { fit: -3, mind: -1 } }) },

  { id: 'hobby_photo_regulation', kind: 'event', when: { phase: ['serve'] }, w: 1, gap: 6, src: '가정',
    c: (S) => S.hobby === 'photo',
    run: () => ({ t: '생활관 사진을 올렸다가 촬영 규정 위반으로 주의를 받았다. 보안 구역 촬영 금지를 다시 확인했다.', fx: { mind: -4 } }) },

  { id: 'hobby_elearning_exam', kind: 'decision', when: { phase: ['serve'] }, w: 2, gap: 6,
    c: (S) => S.hobby === 'elearning',
    build: () => ({
      title: '온라인 시험과 당직이 겹쳤다',
      body: '군 e-러닝 기말 시험 시간에 당직이 잡혔다.',
      choices: [
        { k: 'shift', label: '당직 교대를 부탁한다', hint: '성공하면 시험 응시' },
        { k: 'giveup', label: '이번 학기는 포기한다', hint: '다음 학기에 다시' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'shift') {
        if (roll(S, 0.6)) return { t: '동기가 당직을 바꿔줬다. 시험을 치렀다.', fx: { skill: 4 } };
        return { t: '교대할 사람이 없었다. 시험을 놓쳤다.', fx: { mind: -4 } };
      }
      return { t: '이번 학기는 포기하고 다음 학기에 다시 듣기로 했다.', fx: { mind: -2 } };
    } },

  // ── 관계 사건 10 ──
  // 수료식(연인·가족)은 events-bootcamp.js 마지막 주 일정으로 옮김

  { id: 'bond_gomsin_crisis', kind: 'decision', when: { phase: ['serve'] }, w: 2, gap: 3, src: '가정',
    c: (S) => hasLover(S) && bonds(S).lover <= 30,
    build: () => ({
      title: '연락이 뜸해졌다',
      body: '요즘 전화가 짧아졌다. "바빠"라는 말이 잦다.',
      choices: [
        { k: 'call', label: '전화한다', hint: '시간을 쪼갠다' },
        { k: 'letter', label: '손편지를 쓴다', hint: '닿는 데 며칠 걸린다' },
        { k: 'ignore', label: '그냥 둔다', hint: '마음이 식는다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'call') { addLover(S, 10); return { t: '짬을 내 전화를 걸었다. 목소리를 듣고 조금 안심했다.', fx: { mind: 2 } }; }
      if (k === 'letter') { addLover(S, 15); return { t: '손편지를 썼다. 며칠 뒤 답장이 왔다.', fx: { mind: 3 } }; }
      addLover(S, -15);
      return { t: '그냥 두었다. 연락은 더 뜸해졌다.', fx: { mind: -4 } };
    } },

  { id: 'bond_gomusin_breakup', kind: 'decision', when: { phase: ['serve'] }, w: 2, gap: 6, src: '가정',
    c: (S) => hasLover(S) && bonds(S).lover <= 10,
    build: () => ({
      title: '"우리 잠깐 생각할 시간을 갖자"',
      body: '밤늦게 온 메시지. 답이 정해져 있는 것 같다.',
      choices: [
        { k: 'hold', label: '붙잡는다', hint: '확률 반반' },
        { k: 'letgo', label: '쿨하게 보낸다', hint: '연인 관계 종료' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'hold') {
        if (roll(S, 0.5)) { addLover(S, 25); return { t: '긴 통화 끝에 붙잡았다. 아직 끝나지 않았다.', fx: { mind: 5 } }; }
        endLover(S);
        return { t: '붙잡았지만 놓쳤다. 고무신을 거꾸로 신었다.', fx: { mind: -20 } };
      }
      endLover(S);
      return { t: '쿨하게 보냈다. 밤이 길어졌다.', fx: { mind: -20 } };
    } },

  { id: 'bond_leave_date', kind: 'event', when: { phase: ['serve'] }, w: 1, src: '가정',
    c: (S) => hasLover(S) && onLeaveish(S),
    run: (S) => { addLover(S, 15); return { t: '휴가 중 여자친구와 데이트했다. 영화 한 편, 밥 한 끼. 5만 원이 나갔다.', fx: { mind: 8 } }; } },

  { id: 'bond_mother_birthday', kind: 'decision', when: { phase: ['serve'] }, w: 1, gap: 12, src: '가정',
    build: (S) => ({ title: '어머니 생신을 깜빡했다', ...MOM[where(S)] ?? MOM.land }),
    apply: (S, k) => {
      const v = MOM[where(S)] ?? MOM.land;
      if (k === 'call') { addFamily(S, 5); return { t: v.done.call, fx: {} }; }
      if (k === 'gift') { addFamily(S, 10); return { t: v.done.gift, fx: {} }; }
      addFamily(S, -10);
      return { t: '넘어갔다. 명절에 두고 보자고 어머니가 말했다.', fx: { mind: -3 } };
    } },

  { id: 'bond_holiday_leave', kind: 'event', when: { phase: ['serve'] }, w: 2, src: '가정',
    c: (S) => ['01', '02', '09'].includes(S.ym.slice(5, 7)),
    run: (S) => {
      if (roll(S, 0.5)) { addFamily(S, 15); return { t: '명절 휴가에 당첨됐다. 본가에서 차례를 지냈다.', fx: { mind: 5 } }; }
      return { t: '명절 휴가에서 탈락했다. 명절 당직을 섰다.', fx: { mind: -10 } };
    } },

  { id: 'bond_easy_military', kind: 'decision', when: { phase: ['serve'] }, w: 1, src: '가정',
    c: (S) => onLeaveish(S),
    build: () => ({
      title: '"요즘 군대 편해졌다"',
      body: '휴가 중 식사 자리에서 삼촌이 말했다. 온 가족이 웃었다.',
      choices: [
        { k: 'laugh', label: '웃어넘긴다', hint: '속은 쓰리다' },
        { k: 'sulk', label: '토라진다', hint: '분위기가 싸해진다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'laugh') return { t: '같이 웃었다. 속은 조금 쓰렸다.', fx: { mind: -5 } };
      addFamily(S, -5);
      return { t: '토라졌다. 식사 자리가 싸해졌다.', fx: { mind: -10 } };
    } },

  { id: 'bond_funeral_leave', kind: 'event', when: { phase: ['serve'] }, w: 1, gap: 12, src: '가정',
    p: () => 0.08,
    run: (S) => {
      S.leave.left = Math.max(0, S.leave.left - 3);
      addFamily(S, 10);
      return { t: '집안에 경조사가 생겼다. 청원휴가 3일로 다녀왔다.', fx: { mind: 2 } };
    } },

  { id: 'bond_d100', kind: 'decision', when: { phase: ['serve'] }, w: 2, src: '가정',
    c: (S) => hasLover(S) && S.monthsLeft != null && S.monthsLeft <= 4,
    build: () => ({
      title: '전역 D-100 커플 기념일',
      body: '전역 100일 전, 사귄 지 700일.',
      choices: [
        { k: 'celebrate', label: '챙긴다', hint: '선물 비용이 든다' },
        { k: 'miss', label: '못 챙긴다', hint: '서운해한다' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'celebrate') { addLover(S, 10); return { t: '기념일을 챙겼다. 선물 비용이 월급에서 나갔다.', fx: { mind: 3 } }; }
      addLover(S, -5);
      return { t: '기념일을 챙기지 못했다. 서운해한다.', fx: { mind: -3 } };
    } },
];
