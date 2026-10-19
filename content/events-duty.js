// events-duty.js — 차출 보직: 주특기와 별개로 자대에서 뽑혀 가는 겸직·보직 (research/drafted-roles.md §3·§5)
// 흐름: duty_draft가 한 판에 한 번 보직을 뽑아 흔적(duty + duty_<id>)을 남기고 → 보직 사건은 needs로 그 흔적을 읽고
//       → 병장이 되면 duty_handover로 후임에게 넘긴다(흔적 삭제). 한 판에 보직은 하나 (단순화, 가정).
// 폐지된 보직(공관병·테니스병·이발병 등)도 연도 조건 없이 넣는다 — 그 시절을 기억하는 사람과 처음 보는 사람 모두를 위해.
// 문체는 전역자의 썰, 결정은 모든 선택지가 무언가를 잃는다. 근거는 대부분 커뮤니티 후기라 문구·확률·효과는 전부 '가정'. src는 근거가 된 후기 코드.
import { rand, here } from '../src/engine.js';
import { fmt } from '../src/text.js';
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
      const to = here(S, 'junior') ? '{junior.name}에게' : '후임에게';
      return { t: fmt(S, `${to} ${label(S, id)} 일을 넘겼습니다. 인수인계 노트 맨 끝에 "잘 부탁한다"고 적었다가, 지우고, 다시 적었습니다.`), fx: { mind: 3 }, mark: { del: ['duty', `duty_${id}`] } };
    } }),

  // ── PX병 — "꿀" 소문 vs 재고·금전 책임 [§3-3] ──
  D('px', { id: 'duty_px_unload', kind: 'event', w: 3,
    run: () => ({ t: '입고 날, 라면 박스 천 개가 트럭에서 내려왔습니다. 유통기한 빠른 것을 앞에 놓는 데 두 시간. 줄 선 병사가 "PX병은 놀고먹어서 좋겠다"고 했고, 나는 박스 모서리에 베인 손으로 웃었습니다.', fx: { fit: -2, mind: -2 } }) }),
  D('px', { id: 'duty_px_perk', kind: 'event', w: 2,
    run: () => ({ t: '작업 집합 방송이 나왔는데 "PX는 영업 중"이라는 한마디로 열외가 됐습니다. 마감 후 계산대 뒤 의자가 내 아지트였고, 그날 먹은 냉동만두는 정가로 계산했습니다.', fx: { mind: 3 } }) }),
  D('px', { id: 'duty_px_audit', kind: 'decision', w: 3, c: (S) => since(S) >= 2,
    build: (S) => ({
      title: '월말 재물조사',
      body: fmt(S, '전산 재고와 실물이 맞지 않습니다. 2만 원어치가 비었습니다. 바코드를 잘못 찍었는지 누가 집어 갔는지는 모릅니다. {sfc}이 "맞춰 놔라" 하고 장부를 책상에 던졌습니다.'),
      src: '월말 재물조사에서 결손이 나면 PX병이 사비로 메우거나 보고한다. 보고하면 관리 책임 조사가 따른다 (가정).',
      choices: [
        { k: 'pay', label: '사비로 채운다', hint: '조용히 끝난다 · 내 돈 2만 원' },
        { k: 'report', label: '그대로 보고한다', hint: '행보관의 신뢰 · 한 달 넘게 잔소리' },
      ],
    }),
    apply: (S, k) => (k === 'pay'
      ? { t: '내 돈 2만 원으로 채웠습니다. 장부는 맞았고 마음은 쓰렸습니다. 이번 달 월급에서 냉동만두 열 봉지가 사라진 셈입니다.', fx: { mind: -2 } }
      : { t: fmt(S, '결손을 그대로 보고했습니다. {sfc}이 "솔직해서 좋다"며 고개를 끄덕였고, 그 뒤로 한 달 넘게 재고 관리 잔소리를 들었습니다. 이제 바코드를 두 번씩 찍습니다.'), fx: { mind: -6, skill: 2 }, rel: { sfc: 4 } }) }),
  D('px', { id: 'duty_px_leave', kind: 'event', w: 2, c: (S) => S.leave.left > 0,
    run: (S) => ({ t: fmt(S, '{sfc}이 내 휴가 신청서를 보더니 PX 쪽을 쳐다봤습니다. "네가 가면 PX 문 닫는다." 신청서는 한 달 뒤로 밀렸습니다. 문은 안 닫혔는데 내 마음은 닫혔습니다.'), fx: { mind: -4 } }) }),

  // ── 이발병 — 육군은 겸직이라 주말이 사라진다 [§3-5] ──
  D('barber', { id: 'duty_barber_weekend', kind: 'event', w: 3,
    run: () => ({ t: '토요일 오후, 샤워실 앞에 의자를 놓고 스무 명을 깎았습니다. 손목이 바리캉만큼 떨렸습니다. 이번 달 주말은 전부 머리카락과 함께 쓸려 나갔습니다.', fx: { mind: -2, skill: 2 } }) }),
  D('barber', { id: 'duty_barber_rush', kind: 'event', w: 2,
    run: (S) => (roll(S, 0.4)
      ? { t: '점호 직전, 간부가 머리 긴 병사 셋을 끌고 왔습니다. "5분 안에." 급하게 깎다 구레나룻이 짝짝이가 됐고, 내무검사에서 다 같이 얼차려를 받았습니다.', fx: { fit: -1, mind: -4 } }
      : { t: '전역 전날 밤 병장 셋이 찾아왔습니다. "마지막은 깔끔하게." 자정이 넘어서야 바리캉을 내려놓았습니다. 마지막 병장이 거울을 보더니 "야, 나 잘생겼다" 했습니다.', fx: { mind: -1 }, rel: { senior: 3 } }) }),
  D('barber', { id: 'duty_barber_record', kind: 'event', w: 2, gap: 12, c: (S) => since(S) >= 4,
    run: (S) => {
      if (roll(S, 0.4)) {
        reward(S, 3);
        return { t: '이발 노트가 300명을 넘었습니다. 중대장이 노트를 넘겨 보다 "이거 진짜 다 깎은 거냐" 하더니 포상휴가 3일을 줬습니다!', fx: { mind: 6 } };
      }
      return { t: '이발 노트가 300명을 넘었습니다. 알아주는 사람은 없었습니다. 다만 이제 사람 머리를 보면 바리캉 번호가 먼저 떠오릅니다.', fx: { skill: 2 } };
    } }),

  // ── 군종병 — 주말이 사라지는 1인 편제 [§3-6] ──
  D('chaplain', { id: 'duty_chaplain_sunday', kind: 'event', w: 3,
    run: () => ({ t: '일요일 새벽, 의자를 깔고 헌금함을 챙기고 행사가 끝나면 다시 치웠습니다. 남들이 쉬는 날이 제일 바쁜 날입니다. 신은 안식일에 쉬었다는데.', fx: { mind: -2 } }) }),
  D('chaplain', { id: 'duty_chaplain_escort', kind: 'event', w: 2,
    run: (S) => (roll(S, 0.5)
      ? { t: '영외 성당 행사에 병사들을 인솔했습니다. 돌아오는 버스에서 인원을 세고 또 셌습니다. 한 명도 빠지지 않았는데도 불안해서 한 번 더 셌습니다.', fx: { mind: -1, skill: 1 } }
      : { t: '종교행사 뒤 위로 간식이 나왔습니다. 초코파이 한 상자를 나누다가 오랜만에 사람들과 크게 웃었습니다. 이 맛에 군종병을 한다는 선임 말이 이해됐습니다.', fx: { mind: 3 } }) }),

  // ── 예초병 — 꿀과 헬이 갈린다 [§3-7] ──
  D('mower', { id: 'duty_mower_summer', kind: 'event', w: 4, when: { season: 'summer' },
    run: (S) => (roll(S, 0.5)
      ? { t: '간부가 퇴근한 뒤라 예초기를 내려놓고 그늘에서 쉬었습니다. 매미 소리와 풀 냄새. 이 맛에 예초를 한다는 말이 이해됐습니다. 딱 한 시간만.', fx: { fit: 1, mind: 2 } }
      : { t: '땡볕에 예초기를 메고 산비탈을 오르내렸습니다. 이번 주 예초는 왜인지 일병들에게만 돌아왔습니다. 풀에는 죄가 없습니다.', fx: { fit: -3, mind: -3 } }) }),
  D('mower', { id: 'duty_mower_frog', kind: 'event', w: 1, gap: 12, when: { season: 'summer' },
    run: () => ({ t: '풀숲에서 개구리가 튀어나왔는데 미처 피하지 못했습니다. 그날 저녁 반찬이 하필 오징어채였습니다. 오래 씹을수록 개구리 생각이 났습니다.', fx: { mind: -3 } }) }),

  // ── 보일러병 — 겨울 꿀, 여름 작업 [§3-8] ──
  D('boiler', { id: 'duty_boiler_winter', kind: 'event', w: 3, when: { season: 'winter' },
    run: () => ({ t: '새벽 네 시, 보일러를 돌리고 계기판을 확인했습니다. 밖은 영하 15도, 보일러실은 부대에서 가장 따뜻한 곳이었습니다. 불침번 선임들이 "잠깐만 쉬었다 가도 되냐"며 하나둘 찾아왔습니다.', fx: { mind: 3 } }) }),
  D('boiler', { id: 'duty_boiler_summer', kind: 'event', w: 3, when: { season: 'summer' },
    run: () => ({ t: '보일러가 쉬는 계절이 오자 시설 보수와 예초에 불려 나갔습니다. "겨울엔 꿀, 여름엔 각오해"라는 전임자 말이 정확히 맞았습니다. 그 말을 한 전임자는 지금 집에 있습니다.', fx: { fit: -2, mind: -2 } }) }),

  // ── 상황병 — 가장 먼저 알고, 실수하면 혼자 책임 [§3-10] ──
  D('sitroom', { id: 'duty_sitroom_night', kind: 'event', w: 3,
    run: () => ({ t: '밤샘 상황근무. 점호와 아침 구보는 빠졌고, 새벽 세 시에 당직사관이 라면을 끓여 줬습니다. 다음 주 훈련 일정을 누구보다 먼저 알았는데, 말할 수 없는 게 제일 괴로웠습니다.', fx: { fit: -1, mind: 2, skill: 1 } }) }),
  D('sitroom', { id: 'duty_sitroom_report', kind: 'decision', w: 3,
    build: () => ({
      title: '새벽 두 시, 미상 물체',
      body: '새벽 두 시, 경계 초소에서 미상 물체를 봤다는 무전이 들어왔습니다. 당직사령은 잠깐 자리를 비웠고, 수화기는 내 앞에 있었습니다.',
      src: '상황병은 보고 라인의 첫 단계다. 오보도 늑장도 상황병 책임으로 남는다 (가정).',
      choices: [
        { k: 'now', label: '바로 상급부대에 보고한다', hint: '절차대로 · 오보면 전화 폭탄' },
        { k: 'wait', label: '확인될 때까지 기다린다', hint: '신중 · 늑장이면 경위서' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'now') return roll(S, 0.5)
        ? { t: '바로 보고했습니다. 멧돼지로 밝혀졌는데 "절차대로 했다"며 오히려 칭찬을 들었습니다. 멧돼지는 아무것도 모르고 갔습니다.', fx: { mind: 3, skill: 2 } }
        : { t: '바로 보고했다가 오보로 밝혀졌습니다. 상급부대 전화를 밤새 몇 통이나 받았습니다. 마지막 전화에서는 "수고 많다"는 말이 비꼼처럼 들렸습니다.', fx: { mind: -3 } };
      return roll(S, 0.3)
        ? { t: '기다리는 사이 상급부대가 먼저 알고 전화했습니다. 늑장 보고로 경위서를 썼습니다. 경위서의 "상황 인지 시각" 칸이 제일 길었습니다.', fx: { mind: -8 }, punish: { kind: 'reprimand' } }
        : { t: '10분 뒤 초소에서 "멧돼지였습니다"라는 무전이 왔습니다. 조용히 상황일지에 한 줄을 적었습니다. 당직사령은 돌아와서 아무것도 모르고 커피를 마셨습니다.', fx: { mind: 1 } };
    } }),

  // ── 계원 — 능력을 드러내면 일이 늘어난다 [§3-11] ──
  D('clerk', { id: 'duty_clerk_change', kind: 'event', w: 3,
    run: () => ({ t: '휴가 명단을 대대에 올리기 10분 전, 세 명이 날짜를 바꿔 달라고 전화했습니다. 첫 번째는 사정이 있었고, 두 번째도 사정이 있었고, 세 번째는 사정이 없었습니다. 개인정비 시간은 엑셀과 함께 사라졌습니다.', fx: { mind: -3, skill: 2 } }) }),
  D('clerk', { id: 'duty_clerk_skill', kind: 'decision', w: 3, c: (S) => since(S) >= 2,
    build: (S) => ({
      title: '엑셀 자동화',
      body: fmt(S, '매주 손으로 하던 병력 현황을 수식 몇 줄이면 자동으로 만들 수 있을 것 같습니다. {sfc}에게 보여 드리면 칭찬이야 받겠지만, 선임은 "잘하면 일만 는다"고 했습니다.'),
      src: '계원은 병력 현황·휴가 명단 같은 행정 서류를 맡는다. 잘하는 계원에게 일이 몰리는 경우가 많다 (가정).',
      choices: [
        { k: 'show', label: '만들어서 보고한다', hint: '인정받는다 · 다음 주부터 일이 는다' },
        { k: 'hide', label: '시킨 만큼만 한다', hint: '내 시간은 지킨다 · "요령 피운다"는 눈총' },
      ],
    }),
    apply: (S, k) => (k === 'show'
      ? { t: fmt(S, '자동화 파일을 보고했습니다. {sfc}이 "오, 이거 돼?" 하며 칭찬했고, 그다음 주부터 작전계 서류까지 내 책상으로 넘어왔습니다. 칭찬은 한 번, 서류는 매주였습니다.'), fx: { mind: -2, skill: 5 }, rel: { sfc: 4 } }
      : { t: fmt(S, '수식은 나만 썼습니다. 남는 시간에 책을 읽었습니다. {sfc}은 "쟤는 시킨 것만 한다"고 한마디 했는데, 그 말이 칭찬은 아니었습니다.'), fx: { mind: 3, skill: 1 }, rel: { sfc: -4 } }) }),

  // ── 공관병 — 어떤 집을 만나느냐 [§3-1] ──
  D('orderly', { id: 'duty_orderly_family', kind: 'event', w: 4, gap: 48,
    run: (S) => (roll(S, 0.5)
      ? { t: '지휘관 가족은 따뜻했습니다. 사모님이 해 준 집밥을 먹으며, 고참 없는 하루가 이렇게 조용한 줄 처음 알았습니다. 눈물이 날 뻔한 건 반찬 때문이 아니었습니다.', fx: { mind: 6 } }
      : { t: '빨래, 청소, 장보기 짐, 아이 등하교, 텃밭까지 붙었습니다. 군인인지 집사인지 모를 하루가 이어졌습니다. 텃밭의 상추가 나보다 대접받았습니다.', fx: { mind: -7 } }) }),
  D('orderly', { id: 'duty_orderly_errand', kind: 'decision', w: 2, c: (S) => since(S) >= 2,
    build: () => ({
      title: '사모님의 부탁',
      body: '사모님이 지휘관 아들의 수학 과외를 부탁했습니다. "주말에 두 시간만." 거절하기 어려운 웃음이었습니다. 부엌에서는 내 몫의 갈비찜 냄새가 났습니다.',
      src: '공관병에게 공적 업무 외의 사적 부탁이 들어오는 경우가 있다 (가정).',
      choices: [
        { k: 'yes', label: '해 드린다', hint: '공관 분위기 좋아진다 · 주말이 사라진다' },
        { k: 'no', label: '곤란하다고 말씀드린다', hint: '내 주말은 지킨다 · 공관 공기가 차가워지고 소문이 돈다' },
      ],
    }),
    apply: (S, k) => (k === 'yes'
      ? { t: '주말마다 과외를 했습니다. 아들은 수학을 포기했고, 나는 갈비찜을 얻었습니다. 공관 분위기는 좋아졌지만 그 두 시간은 내 것이 아니었습니다.', fx: { mind: -3 } }
      : { t: fmt(S, '조심스럽게 거절했습니다. 며칠 공관 공기가 차가웠습니다. 부탁은 다시 오지 않았지만, 어느 날 {sfc}이 "너 공관에서 말 안 듣는다며?" 하고 지나갔습니다.'), fx: { mind: 1 }, rel: { sfc: -4 } }) }),

  // ── 테니스병 — 코트 관리와 간부 상대 [§3-2] ──
  D('tennis', { id: 'duty_tennis_court', kind: 'event', w: 3,
    run: (S) => {
      const m = Number(S.ym.slice(5, 7));
      return [6, 7, 8].includes(m)
        ? { t: '장마 예보에 혼자 방수포를 덮었습니다. 비가 그치자 다시 롤러로 코트를 다지고 라인을 그었습니다. 일기예보를 믿은 내가 바보였습니다.', fx: { fit: -2, mind: -2 } }
        : { t: '주말 아침, 혼자 롤러로 코트를 다지고 라인을 그었습니다. 점호와 훈련은 빠졌지만 주말도 함께 빠졌습니다. 코트는 오늘도 깨끗했고 간부는 오지 않았습니다.', fx: { fit: 1, mind: -1 } };
    } }),
  D('tennis', { id: 'duty_tennis_match', kind: 'decision', w: 3,
    build: () => ({
      title: '대대장과 한 게임',
      body: '대대장이 라켓을 들고 코트에 섰습니다. "봐주지 마라." 눈은 웃고 있었는데 라켓 쥔 손은 웃지 않았습니다.',
      src: '테니스병은 코트 관리뿐 아니라 간부의 상대도 맡는다. 간부 앞에서 이기느냐 지느냐는 눈치 싸움이다 (가정).',
      choices: [
        { k: 'lose', label: '받기 좋게 쳐 준다', hint: '대대장 기분 · 마음이 지친다' },
        { k: 'win', label: '실력대로 친다', hint: '도박 · 이기면 포상, 이겨도 뒤끝' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'lose') return { t: '받기 좋은 공만 보냈습니다. 대대장은 기분 좋게 땀을 흘렸고, 나는 마음이 지쳤습니다. 코트 라인이 오늘따라 흐릿해 보였습니다.', fx: { mind: -2 } };
      if (roll(S, 0.5)) {
        reward(S, 2);
        return { t: '6대 2로 이겼습니다. 대대장이 껄껄 웃더니 "제대로 치는 놈 처음 봤다"며 포상휴가 2일을 줬습니다!', fx: { mind: 6 } };
      }
      return { t: '6대 1로 이겼습니다. 대대장은 말없이 라켓을 내려놓았고, 다음 날 코트 관리 지적이 세 배로 늘었습니다. 라인이 1cm 삐뚤다고 했습니다.', fx: { mind: -5 } };
    } }),

  // ── 사진병 — 장군 일정이 곧 내 일정 [§3-12] ──
  D('photo', { id: 'duty_photo_general', kind: 'event', w: 3,
    run: (S) => (roll(S, 0.3)
      ? { t: '장군 시찰을 따라 헬기에 올랐습니다. 창밖으로 부대가 손톱만 해졌습니다. 카메라를 들고 서 있는 내 모습이 이상하게 우스웠습니다. 전역해도 못 할 경험입니다.', fx: { mind: 5, skill: 2 } }
      : { t: '장군 일정이 새벽 다섯 시에 시작해 밤 열 시에 끝났습니다. 정해진 퇴근 시간은 없었고, 경계근무는 그대로였습니다. 찍은 사진은 천 장, 장군 눈에 든 사진은 세 장이었습니다.', fx: { fit: -2, mind: -3, skill: 2 } }) }),

  // ── 탄약고 관리병 — "꿀"이 아니다 [§3-13] ──
  D('depot', { id: 'duty_depot_myth', kind: 'event', w: 3,
    run: () => ({ t: '"탄약고만 지키면 된다"던 말은 거짓이었습니다. 탄통을 나르고, 산비탈 탄약고 주변 풀을 베고, 녹슨 자물쇠를 바꿨습니다. 그 말을 한 선임은 지금 집에서 TV를 보고 있겠지요.', fx: { fit: -2, mind: -2 } }) }),
  D('depot', { id: 'duty_depot_count', kind: 'event', w: 2,
    run: () => ({ t: '분기 재고조사에서 수량 하나가 맞지 않았습니다. 창고 네 곳을 사흘간 뒤졌습니다. 구석 상자 밑에서 찾아냈을 때 모두가 박수를 쳤는데, 나는 웃을 힘이 없었습니다.', fx: { mind: -3, skill: 2 } }) }),

  // ── 세탁병 [§3-9] ──
  D('laundry', { id: 'duty_laundry_pile', kind: 'event', w: 3,
    run: (S) => (roll(S, 0.5)
      ? { t: '간부가 모포 백 장을 한꺼번에 가져왔습니다. 물 먹은 모포를 탈수기에 넣고 빼느라 팔이 떨렸습니다. 모포 한 장이 20kg쯤 되는 줄 그날 알았습니다.', fx: { fit: -3, mind: -2 } }
      : { t: '세탁기가 도는 한 시간 동안 의자에 앉아 책을 읽었습니다. 이번 달에만 네 권을 읽었습니다. 세탁 냄새가 책에서 날 때도 있습니다.', fx: { mind: 4 } }) }),

  // ── 의무대 지원 [§3-15] ──
  D('medic', { id: 'duty_medic_guard', kind: 'event', w: 3,
    run: (S) => ({ t: fmt(S, '낮에는 의무대에서 환자를 받고 밤에는 위병소 근무를 섰습니다. 의무대 일과 근무가 둘 다 내 몫이었습니다. {sfc}이 "너는 몸이 두 개냐" 하고 웃었는데 웃을 일이 아니었습니다.'), fx: { fit: -2, mind: -3, skill: 2 } }) }),

  // ── 회관병 [§3-4] ──
  D('lounge', { id: 'duty_lounge_night', kind: 'event', w: 3,
    run: () => ({ t: '오후엔 객실을 치우고 저녁 다섯 시 반부터 열 시까지 영업했습니다. 남은 치킨을 나눠 먹는 맛에 하루를 버팁니다. 가끔은 간부 가족이 남긴 치킨이 그날의 저녁입니다.', fx: { fit: -1, mind: 3 } }) }),
];
