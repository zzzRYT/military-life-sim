// events-duty.js — 차출 보직: 주특기와 별개로 자대에서 뽑혀 가는 겸직·보직 (research/drafted-roles.md §3·§5)
// 흐름: duty_draft가 한 판에 한 번 보직을 뽑아 흔적(duty + duty_<id>)을 남기고 → 보직 사건은 needs로 그 흔적을 읽고
//       → 병장이 되면 duty_handover로 후임에게 넘긴다(흔적 삭제). 한 판에 보직은 하나 (단순화, 가정).
// 폐지된 보직(공관병·테니스병·이발병 등)도 연도 조건 없이 넣는다 — 그 시절을 기억하는 사람과 처음 보는 사람 모두를 위해.
// 근거는 대부분 커뮤니티 후기라 문구·확률·효과는 전부 '가정'. src는 근거가 된 후기 코드.
import { rand } from '../src/engine.js';
import { wpick } from '../src/rng.js';
import { monthsBetweenYm } from '../src/date.js';

const roll = (S, p) => rand(S) < p;
const served = (S) => (S.flags.serveYm ? monthsBetweenYm(S.flags.serveYm, S.ym) : -1);
const P = (e) => ({ src: '가정', gap: 6, ...e, when: { phase: ['serve'], ...e.when } });
const reward = (S, days) => {
  S.leave.left += days;
  S.rewards.push({ ym: S.ym, kind: 'duty', days });
};

/** 보직 표. b: 나오는 군종, w: 상대 가중치(가정), not: 이미 그 일이 본업인 주특기, draft: 뽑히는 장면 */
export const DUTIES = {
  px: { label: 'PX병', b: ['army', 'navy', 'airforce'], w: 3, src: 'drafted:S_new_35+S_new_36+S_new_37',
    draft: '행보관 면담에서 "정리 잘하냐"는 질문에 그렇다고 답했습니다. 사수가 전역하던 날, PX 열쇠가 넘어왔습니다.' },
  barber: { label: '이발병', b: ['army', 'navy', 'airforce', 'marine'], w: 3, src: 'drafted:S_new_26+S_new_39',
    draft: '전입 첫 주, 선임이 "머리 좀 만져 본 사람?" 하고 물었습니다. 잠깐 망설이는 사이 바리캉이 손에 쥐어졌습니다.' },
  chaplain: { label: '군종병', b: ['army', 'airforce'], w: 2, src: 'drafted:S_new_28+S_new_42',
    draft: '"교회든 성당이든 절이든, 다녀 본 사람 손!" 손을 든 건 나 하나였습니다. 그 주부터 일요일은 종교행사 준비로 채워졌습니다.' },
  mower: { label: '예초병', b: ['army', 'marine'], w: 3, src: 'drafted:S_new_44+S_new_45',
    draft: '"일 잘하는 애들 몇 명 따라와." 그렇게 예초기를 메게 되었습니다. 여름 내내 이 일을 합니다.' },
  boiler: { label: '보일러병', b: ['army', 'airforce'], w: 2, src: 'drafted:S_new_30+S_new_52',
    draft: '겨울을 앞두고 보일러실 열쇠를 받았습니다. 전임자는 "겨울엔 꿀, 여름엔 각오해"라는 말만 남겼습니다.' },
  sitroom: { label: '상황병', b: ['army', 'navy'], w: 2, src: 'drafted:S_new_29+S_new_51',
    draft: '상황병 자리에 결원이 생겼습니다. 지휘통제실 상황판 앞자리가 내 근무지가 되었습니다.' },
  clerk: { label: '계원', b: ['army', 'navy', 'marine'], w: 3, not: ['311101'], src: 'drafted:S_new_31+S_new_59+S_new_60',
    draft: '자대에 온 지 며칠 만에 간부가 말했습니다. "너 오늘부터 인사계원이다." 컴퓨터 앞자리가 생겼습니다.' },
  orderly: { label: '공관병', b: ['army', 'navy', 'airforce'], w: 1, src: 'drafted:S_new_25+S_new_49',
    draft: '눈치가 빠르다는 소문이 돌았던 모양입니다. 지휘관 공관으로 가라는 명령이 떨어졌습니다.' },
  tennis: { label: '테니스병', b: ['army'], w: 1, src: 'drafted:S_new_46+S_new_47+S_new_48',
    draft: '신상 기록에 "테니스 동아리"가 적혀 있었습니다. 그 한 줄로 테니스장 관리가 내 일이 되었습니다.' },
  photo: { label: '사진병', b: ['army'], w: 1, src: 'drafted:S_new_48+S_new_54',
    draft: '정훈에서 사진병을 찾았습니다. 카메라 실력보다 단정한 외모와 큰 목소리가 먼저였습니다.' },
  depot: { label: '탄약고 관리병', b: ['army', 'marine'], w: 2, src: 'drafted:S_new_34+S_new_56',
    draft: '탄약고 관리병 자리가 비었습니다. "탄약고만 지키면 되는 꿀"이라는 말을 들으며 열쇠를 받았습니다.' },
  laundry: { label: '세탁병', b: ['army'], w: 1, src: 'drafted:S_new_33+S_new_63',
    draft: '세탁소대에 사람이 모자랐습니다. 대형 세탁기 여섯 대가 돌아가는 세탁장이 근무지가 되었습니다.' },
  medic: { label: '의무대 지원', b: ['army'], w: 1, not: ['411101'], src: 'drafted:S_new_57+S_new_58',
    draft: '보건 계열 전공이 신상 기록에 있었습니다. 의무대 일손이 모자란다며 그쪽으로 불려 갔습니다.' },
  lounge: { label: '회관병', b: ['army'], w: 1, src: 'drafted:S_new_48+S_new_61',
    draft: '복지회관에 결원이 생겼다는 공지가 붙었습니다. 경계근무 대신 회관 일을 해 보겠다고 지원했습니다.' },
};

const label = (S, id) => (id === 'px' && S.branch === 'airforce' ? 'BX병' : DUTIES[id].label);
const since = (S) => (S.marks.duty ? monthsBetweenYm(S.marks.duty.ym, S.ym) : -1);
// 보직 사건은 다른 사건과 경쟁하므로 가중치를 2배로 — 보직을 맡은 동안 판당 몇 번은 보이게 (가정)
const D = (id, e) => P({ src: DUTIES[id].src, ...e, w: e.w * 2, needs: `duty_${id}` });

export const DUTY_EVENTS = [
  // ── 차출과 인수인계 ──
  P({ id: 'duty_draft', kind: 'event', w: 4, gap: 0, p: 0.2, src: 'drafted:§4-1',
    c: (S) => !S.marks.duty && served(S) >= 1 && served(S) <= 10,
    run: (S) => {
      const ok = Object.entries(DUTIES).filter(([, d]) => d.b.includes(S.branch) && !d.not?.includes(S.mos));
      const id = wpick(() => rand(S), ok.map(([k, d]) => [k, d.w]));
      return { t: `${DUTIES[id].draft} (${label(S, id)})`, fx: { mind: 1 }, mark: { set: { duty: { role: id }, [`duty_${id}`]: {} } } };
    } }),
  P({ id: 'duty_handover', kind: 'event', w: 4, gap: 0, src: 'drafted:S_new_36+S_new_61',
    c: (S) => S.marks.duty && S.rank >= 3 && since(S) >= 8,
    run: (S) => {
      const id = S.marks.duty.role;
      return { t: `후임에게 ${label(S, id)} 일을 넘겼습니다. 인수인계 노트 맨 끝에 "잘 부탁한다"고 적었습니다.`, fx: { mind: 3 }, mark: { del: ['duty', `duty_${id}`] } };
    } }),

  // ── PX병 — "꿀" 소문 vs 재고·금전 책임 [§3-3] ──
  D('px', { id: 'duty_px_unload', kind: 'event', w: 3,
    run: () => ({ t: '입고 날, 천 박스를 내리고 선입선출로 진열했습니다. 줄 선 병사들은 "PX병은 놀고먹는다"고 했습니다.', fx: { fit: -2, mind: -2 } }) }),
  D('px', { id: 'duty_px_perk', kind: 'event', w: 2,
    run: () => ({ t: '작업 집합 방송이 나왔지만 PX 영업 시간이라 빠졌습니다. 판매가 끝난 뒤 계산대 뒤 의자가 나만의 아지트였습니다.', fx: { mind: 3 } }) }),
  D('px', { id: 'duty_px_audit', kind: 'decision', w: 3, c: (S) => since(S) >= 2,
    build: () => ({
      title: '월말 재물조사',
      body: '전산 재고와 실물이 맞지 않습니다. 2만 원어치가 비었습니다. 바코드를 잘못 찍었는지, 누가 가져갔는지는 모릅니다.',
      choices: [
        { k: 'pay', label: '사비로 채운다', hint: '조용히 · 내 돈' },
        { k: 'report', label: '그대로 보고한다', hint: '원칙 · 질책' },
      ],
    }),
    apply: (S, k) => (k === 'pay'
      ? { t: '내 돈 2만 원으로 채웠습니다. 장부는 맞았고, 마음은 조금 쓰렸습니다.', fx: { mind: -2 } }
      : { t: '결손을 보고했습니다. 한 달 넘게 관리관의 잔소리를 들었습니다. 다음 달부터 바코드를 두 번씩 확인합니다.', fx: { mind: -6, skill: 2 } }) }),
  D('px', { id: 'duty_px_leave', kind: 'event', w: 2, c: (S) => S.leave.left > 0,
    run: () => ({ t: '휴가를 내려 했지만 부사수가 없었습니다. "너 가면 PX 문 닫는다." 휴가가 한 달 밀렸습니다.', fx: { mind: -4 } }) }),

  // ── 이발병 — 육군은 겸직이라 주말이 사라진다 [§3-5] ──
  D('barber', { id: 'duty_barber_weekend', kind: 'event', w: 3,
    run: () => ({ t: '토요일 오후, 샤워실 앞에 의자를 놓고 스무 명을 깎았습니다. 이번 달 주말은 바리캉 소리로 끝났습니다.', fx: { mind: -2, skill: 2 } }) }),
  D('barber', { id: 'duty_barber_rush', kind: 'event', w: 2,
    run: (S) => (roll(S, 0.4)
      ? { t: '점호 직전, 간부가 머리 긴 병사 셋을 데려왔습니다. 급하게 깎다 내무검사에 걸려 다 같이 얼차려를 받았습니다.', fx: { fit: -1, mind: -4 } }
      : { t: '전역 전날 밤 병장 셋이 찾아왔습니다. "마지막은 깔끔하게." 자정이 넘어서야 바리캉을 내려놓았습니다.', fx: { mind: -1 }, rel: { senior: 3 } }) }),
  D('barber', { id: 'duty_barber_record', kind: 'event', w: 2, gap: 12, c: (S) => since(S) >= 4,
    run: (S) => {
      if (roll(S, 0.4)) {
        reward(S, 3);
        return { t: '이발 노트가 300명을 넘었습니다. 중대장이 그 기록을 보고 포상휴가 3일을 줬습니다!', fx: { mind: 6 } };
      }
      return { t: '이발 노트가 300명을 넘었습니다. 알아주는 사람은 없었지만, 손은 확실히 빨라졌습니다.', fx: { skill: 2 } };
    } }),

  // ── 군종병 — 주말이 사라지는 1인 편제 [§3-6] ──
  D('chaplain', { id: 'duty_chaplain_sunday', kind: 'event', w: 3,
    run: () => ({ t: '일요일 새벽, 의자를 깔고 헌금을 세고 행사가 끝나면 다시 치웠습니다. 남들이 쉬는 날이 가장 바쁜 날입니다.', fx: { mind: -2 } }) }),
  D('chaplain', { id: 'duty_chaplain_escort', kind: 'event', w: 2,
    run: (S) => (roll(S, 0.5)
      ? { t: '영외 성당 행사에 병사들을 인솔했습니다. 돌아오는 버스에서 인원을 세고 또 셌습니다. 한 명도 빠지지 않았습니다.', fx: { mind: -1, skill: 1 } }
      : { t: '종교행사 뒤 위로 간식이 나왔습니다. 초코파이 한 상자를 나누며 오랜만에 사람들과 웃었습니다.', fx: { mind: 3 } }) }),

  // ── 예초병 — 꿀과 헬이 갈린다 [§3-7] ──
  D('mower', { id: 'duty_mower_summer', kind: 'event', w: 4, when: { season: 'summer' },
    run: (S) => (roll(S, 0.5)
      ? { t: '간부가 퇴근한 뒤라 예초기를 내려놓고 그늘에서 쉬었습니다. 이 맛에 예초를 한다는 말이 이해됐습니다.', fx: { fit: 1, mind: 2 } }
      : { t: '땡볕에 예초기를 메고 산비탈을 오르내렸습니다. 이번 주 예초는 왜인지 일병들에게만 돌아왔습니다.', fx: { fit: -3, mind: -3 } }) }),
  D('mower', { id: 'duty_mower_frog', kind: 'event', w: 1, gap: 12, when: { season: 'summer' },
    run: () => ({ t: '풀숲에서 튀어나온 개구리를 미처 피하지 못했습니다. 그날 저녁밥이 잘 넘어가지 않았습니다.', fx: { mind: -3 } }) }),

  // ── 보일러병 — 겨울 꿀, 여름 작업 [§3-8] ──
  D('boiler', { id: 'duty_boiler_winter', kind: 'event', w: 3, when: { season: 'winter' },
    run: () => ({ t: '새벽 네 시, 보일러를 돌리고 계기판을 확인했습니다. 밖은 영하 15도, 보일러실은 부대에서 가장 따뜻한 곳이었습니다.', fx: { mind: 3 } }) }),
  D('boiler', { id: 'duty_boiler_summer', kind: 'event', w: 3, when: { season: 'summer' },
    run: () => ({ t: '보일러가 쉬는 계절이 오자 시설 보수와 예초에 불려 나갔습니다. "보일러병은 여름에 갚는다"는 전임자 말이 맞았습니다.', fx: { fit: -2, mind: -2 } }) }),

  // ── 상황병 — 가장 먼저 알고, 실수하면 혼자 책임 [§3-10] ──
  D('sitroom', { id: 'duty_sitroom_night', kind: 'event', w: 3,
    run: () => ({ t: '밤샘 상황근무. 점호와 아침 구보는 빠졌고, 새벽 세 시 당직사관이 라면을 끓여 줬습니다. 다음 주 훈련 일정을 누구보다 먼저 알았습니다.', fx: { fit: -1, mind: 2, skill: 1 } }) }),
  D('sitroom', { id: 'duty_sitroom_report', kind: 'decision', w: 3,
    build: () => ({
      title: '새벽 보고',
      body: '새벽 두 시, 경계 초소에서 미상 물체를 봤다는 무전이 들어왔습니다. 당직사령은 잠깐 자리를 비웠습니다.',
      choices: [
        { k: 'now', label: '바로 상급부대에 보고한다', hint: '절차 · 오보 위험' },
        { k: 'wait', label: '확인될 때까지 기다린다', hint: '신중 · 늑장 위험' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'now') return roll(S, 0.5)
        ? { t: '바로 보고했습니다. 멧돼지로 밝혀졌지만, 절차대로 했다며 오히려 칭찬을 들었습니다.', fx: { mind: 3, skill: 2 } }
        : { t: '바로 보고했다가 오보로 밝혀졌습니다. 상급부대 전화를 몇 통이나 받았습니다.', fx: { mind: -3 } };
      return roll(S, 0.3)
        ? { t: '기다리는 사이 상급부대가 먼저 알고 전화했습니다. 늑장 보고로 경위서를 썼습니다.', fx: { mind: -8 }, punish: { kind: 'reprimand' } }
        : { t: '10분 뒤 초소에서 "멧돼지였습니다"라는 무전이 왔습니다. 조용히 상황일지에 한 줄을 적었습니다.', fx: { mind: 1 } };
    } }),

  // ── 계원 — 능력을 드러내면 일이 늘어난다 [§3-11] ──
  D('clerk', { id: 'duty_clerk_change', kind: 'event', w: 3,
    run: () => ({ t: '휴가 명단을 대대에 올리기 10분 전, 세 명이 날짜를 바꿔 달라고 전화했습니다. 개인정비 시간은 엑셀과 함께 사라졌습니다.', fx: { mind: -3, skill: 2 } }) }),
  D('clerk', { id: 'duty_clerk_skill', kind: 'decision', w: 3, c: (S) => since(S) >= 2,
    build: () => ({
      title: '엑셀 자동화',
      body: '매주 손으로 하던 병력 현황을 수식 몇 줄이면 자동으로 만들 수 있을 것 같습니다. 선임은 "잘하면 일만 늘어난다"고 했습니다.',
      choices: [
        { k: 'show', label: '만들어서 보고한다', hint: '인정 · 일 증가' },
        { k: 'hide', label: '시킨 만큼만 한다', hint: '조용히' },
      ],
    }),
    apply: (S, k) => (k === 'show'
      ? { t: '자동화 파일을 보고했습니다. 칭찬을 들은 다음 주부터 작전계 서류까지 넘어왔습니다.', fx: { mind: -2, skill: 5 } }
      : { t: '수식은 혼자만 썼습니다. 남는 시간에 책을 읽었습니다.', fx: { mind: 3, skill: 1 } }) }),

  // ── 공관병 — 어떤 집을 만나느냐 [§3-1] ──
  D('orderly', { id: 'duty_orderly_family', kind: 'event', w: 4, gap: 48,
    run: (S) => (roll(S, 0.5)
      ? { t: '지휘관 가족은 따뜻했습니다. 사모님이 해 준 집밥을 먹으며, 고참 없는 하루가 이렇게 조용한 줄 처음 알았습니다.', fx: { mind: 6 } }
      : { t: '빨래와 청소에 장보기 짐, 아이 등하교, 텃밭까지 붙었습니다. 군인인지 집사인지 모를 하루가 이어졌습니다.', fx: { mind: -7 } }) }),
  D('orderly', { id: 'duty_orderly_errand', kind: 'decision', w: 2, c: (S) => since(S) >= 2,
    build: () => ({
      title: '사적인 부탁',
      body: '사모님이 지휘관 아들의 수학 과외를 부탁합니다. "주말에 두 시간만." 거절하기 어려운 웃음입니다.',
      choices: [
        { k: 'yes', label: '해 드린다', hint: '눈치 · 주말' },
        { k: 'no', label: '곤란하다고 말씀드린다', hint: '원칙 · 어색함' },
      ],
    }),
    apply: (S, k) => (k === 'yes'
      ? { t: '주말마다 과외를 했습니다. 공관 분위기는 좋아졌지만, 그 시간은 내 것이 아니었습니다.', fx: { mind: -3 } }
      : { t: '조심스럽게 거절했습니다. 며칠 공관 공기가 차가웠지만, 부탁은 다시 오지 않았습니다.', fx: { mind: 1 } }) }),

  // ── 테니스병 — 코트 관리와 간부 상대 [§3-2] ──
  D('tennis', { id: 'duty_tennis_court', kind: 'event', w: 3,
    run: (S) => {
      const m = Number(S.ym.slice(5, 7));
      return [6, 7, 8].includes(m)
        ? { t: '장마 예보에 혼자 방수포를 덮었습니다. 비가 그치자 다시 롤러로 코트를 다지고 라인을 그었습니다.', fx: { fit: -2, mind: -2 } }
        : { t: '주말 아침, 혼자 롤러로 코트를 다지고 라인을 그었습니다. 점호와 훈련은 빠졌지만 주말도 함께 빠졌습니다.', fx: { fit: 1, mind: -1 } };
    } }),
  D('tennis', { id: 'duty_tennis_match', kind: 'decision', w: 3,
    build: () => ({
      title: '대대장과 한 게임',
      body: '대대장이 라켓을 들고 코트에 섰습니다. "봐주지 마라." 정말 봐주지 말아야 할까요.',
      choices: [
        { k: 'lose', label: '받기 좋게 쳐 준다', hint: '기분 · 피곤' },
        { k: 'win', label: '실력대로 친다', hint: '도박' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'lose') return { t: '받기 좋은 공만 보냈습니다. 대대장은 기분 좋게 땀을 흘렸고, 나는 마음이 지쳤습니다.', fx: { mind: -2 } };
      if (roll(S, 0.5)) {
        reward(S, 2);
        return { t: '6대 2로 이겼습니다. 대대장이 껄껄 웃더니 "제대로 치는 놈 처음 봤다"며 포상휴가 2일을 줬습니다!', fx: { mind: 6 } };
      }
      return { t: '6대 1로 이겼습니다. 대대장은 말없이 라켓을 내려놓았고, 다음 날 코트 관리 지적이 세 배로 늘었습니다.', fx: { mind: -5 } };
    } }),

  // ── 사진병 — 장군 일정이 곧 내 일정 [§3-12] ──
  D('photo', { id: 'duty_photo_general', kind: 'event', w: 3,
    run: (S) => (roll(S, 0.3)
      ? { t: '장군 시찰을 따라 헬기에 올랐습니다. 창밖으로 부대가 손톱만 해졌습니다. 전역해도 못 할 경험입니다.', fx: { mind: 5, skill: 2 } }
      : { t: '장군 일정이 새벽 다섯 시에 시작해 밤 열 시에 끝났습니다. 정해진 퇴근 시간은 없었고, 경계근무는 그대로였습니다.', fx: { fit: -2, mind: -3, skill: 2 } }) }),

  // ── 탄약고 관리병 — "꿀"이 아니다 [§3-13] ──
  D('depot', { id: 'duty_depot_myth', kind: 'event', w: 3,
    run: () => ({ t: '탄약고만 지키면 된다던 말과 달리, 탄통을 나르고 산비탈 탄약고 주변 풀을 베고 녹슨 자물쇠를 바꿨습니다.', fx: { fit: -2, mind: -2 } }) }),
  D('depot', { id: 'duty_depot_count', kind: 'event', w: 2,
    run: () => ({ t: '분기 재고조사에서 수량 하나가 맞지 않았습니다. 창고 네 곳을 사흘간 뒤져 구석의 상자를 찾아냈습니다.', fx: { mind: -3, skill: 2 } }) }),

  // ── 세탁병 [§3-9] ──
  D('laundry', { id: 'duty_laundry_pile', kind: 'event', w: 3,
    run: (S) => (roll(S, 0.5)
      ? { t: '간부가 모포 백 장을 한꺼번에 가져왔습니다. 물 먹은 모포를 탈수기에 넣고 빼느라 팔이 떨렸습니다.', fx: { fit: -3, mind: -2 } }
      : { t: '세탁기가 도는 한 시간 동안 의자에 앉아 책을 읽었습니다. 이번 달에만 네 권을 읽었습니다.', fx: { mind: 4 } }) }),

  // ── 의무대 지원 [§3-15] ──
  D('medic', { id: 'duty_medic_guard', kind: 'event', w: 3,
    run: () => ({ t: '낮에는 의무대에서 환자를 받고, 밤에는 위병소 근무를 섰습니다. 의무대 일과 근무가 둘 다 내 몫이었습니다.', fx: { fit: -2, mind: -3, skill: 2 } }) }),

  // ── 회관병 [§3-4] ──
  D('lounge', { id: 'duty_lounge_night', kind: 'event', w: 3,
    run: () => ({ t: '오후엔 객실을 치우고 저녁 다섯 시 반부터 열 시까지 영업했습니다. 남은 치킨을 나눠 먹는 맛에 하루를 버팁니다.', fx: { fit: -1, mind: 3 } }) }),
];
