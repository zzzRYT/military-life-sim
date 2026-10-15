// events-cadre.js — 간부(장교·부사관·준사관) 전용 사건 (docs/04 §11). 문구·확률·효과는 전부 '가정'.
// 병사는 "따르는 쪽", 간부는 "책임지는 쪽" — 병사 관리·당직·상급자·근무평정·장기복무·결혼.
// 흔적: style_strict/style_soft, duty_*, soldier_helped/soldier_brushed, boss_*, brass_skip, rating, long_apply, married
import { rand } from '../src/engine.js';
import { monthsBetweenYm } from '../src/date.js';

const roll = (S, p) => rand(S) < p;
const pick = (S, xs) => xs[Math.floor(rand(S) * xs.length)];
const since = (S, ym) => (ym ? monthsBetweenYm(ym, S.ym) : -1); // ym 이후 지난 개월
const served = (S) => since(S, S.flags.serveYm); // 자대(임관 후 부대) 개월
const m = (S, id) => S.marks?.[id];
const role = (S) => ({ officer: '소대장', nco: '분대장', warrant: '정비반장' })[S.status] ?? '간부';
const boss = (S) => (S.status === 'officer' ? '중대장' : '행보관');
const C = (e) => ({ src: '가정', ...e, when: { phase: ['serve'], status: ['officer', 'nco', 'warrant'], ...e.when } });

export const CADRE_EVENTS = [
  // ── 첫 부대 (장면) ──
  C({ id: 'cadre_first_unit', kind: 'event', w: 30, c: (S) => served(S) === 0,
    run: (S) => ({ t: {
      officer: '첫 소대. 소대원 서른두 명의 이름과 얼굴을 외우는 데 일주일이 걸렸습니다. "소대장님" 소리가 아직 어색합니다.',
      nco: '첫 분대. 병장 둘이 나보다 나이가 많았습니다. "하사님" 소리에 대답이 한 박자 늦었습니다.',
    }[S.status] ?? '첫 부대. 정비반 병사들이 새 반장을 힐끔거렸습니다.', fx: { mind: -2 } }) }),

  // ── 어떤 간부가 될까 (이후 여러 사건이 이 흔적을 읽는다) ──
  C({ id: 'cadre_style', kind: 'decision', w: 8, c: (S) => served(S) >= 1,
    build: (S) => ({
      title: '어떤 간부가 될까',
      body: S.status === 'nco'
        ? '분대 병장이 슬쩍 반말을 섞습니다. 나이로는 형입니다. 다른 분대장들은 각자 방식이 있습니다.'
        : `${role(S)}로 두 달. 병사들이 나를 어떻게 부를지는 지금 정해질 것 같습니다.`,
      choices: [
        { k: 'strict', label: '원칙대로 한다', hint: '존중은 얻는다 · 정은 덜 간다' },
        { k: 'soft', label: '형처럼 다가간다', hint: '편해진다 · 선이 흐려질 수 있다' },
      ],
    }),
    apply: (S, k) => (k === 'strict'
      ? { t: '규정대로 하기로 했습니다. 생활관이 조금 조용해졌습니다.', fx: { skill: 2 }, mark: { set: { style_strict: {} } } }
      : { t: '먼저 말을 걸기로 했습니다. 병사들이 고민을 털어놓기 시작했습니다.', fx: { mind: 3 }, mark: { set: { style_soft: {} } } }) }),

  // ── 당직 (흔적에 따라 결과가 갈린다) ──
  C({ id: 'cadre_duty_night', kind: 'decision', w: 5, c: (S) => served(S) >= 2,
    build: (S) => ({
      title: `당직${S.status === 'officer' ? '사관' : '부사관'}, 새벽 두 시`,
      body: '순찰 중 생활관 구석에서 휴대폰 불빛이 보입니다. 반납 시간은 한참 지났습니다.',
      choices: [
        { k: 'talk', label: '조용히 불러 타이른다', hint: '이번만 · 내 재량' },
        { k: 'report', label: '당직 일지에 적는다', hint: '규정대로 · 병사는 징계' },
        { k: 'blind', label: '못 본 척한다', hint: '편하다 · 나중에 문제가 될 수도' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'report') return { t: '일지에 적었습니다. 다음 날 그 병사는 군기교육 대상이 됐습니다.', fx: { mind: -2 }, mark: { set: { duty_report: {} } } };
      if (k === 'blind') return { t: '못 본 척 지나갔습니다.', mark: { set: { duty_blind: {} } } };
      return m(S, 'style_strict')
        ? { t: '불러서 타일렀습니다. 평소 원칙대로라던 사람이 봐주니 병사가 오히려 놀란 눈치였습니다.', fx: { mind: 3 }, mark: { set: { duty_talk: {} } } }
        : { t: '불러서 타일렀습니다. 병사는 "다음부터 안 그러겠습니다"라고 했지만, 그 말을 몇 번째 듣는지 모르겠습니다.', fx: { mind: 1 }, mark: { set: { duty_talk: {} } } };
    } }),
  C({ id: 'cadre_duty_blind_back', kind: 'event', w: 6, needs: 'duty_blind', c: (S) => since(S, m(S, 'duty_blind').ym) >= 2,
    run: () => ({ t: '감찰에서 그날 밤 휴대폰 사용이 드러났습니다. "당직이 뭘 했냐"는 질문에 대답하지 못했습니다.', fx: { mind: -8 }, punish: { kind: 'reprimand' }, mark: { set: { rating_minus: {} }, del: ['duty_blind'] } }) }),

  // ── 병사 면담 → 몇 달 뒤 돌아오는 결과 ──
  C({ id: 'cadre_soldier_talk', kind: 'decision', w: 5, c: (S) => served(S) >= 2,
    build: (S) => ({
      title: '면담 요청',
      body: m(S, 'style_soft')
        ? '"형처럼" 지낸 덕인지, 일병 하나가 밤에 찾아왔습니다. 집이 어려워 아버지가 일을 그만두셨다고 합니다.'
        : '일병 하나가 면담을 요청했습니다. 표정이 굳어 있습니다. 집이 어려워 아버지가 일을 그만두셨다고 합니다.',
      choices: [
        { k: 'help', label: '청원휴가·지원 제도를 알아본다', hint: '서류가 많다 · 내 시간이 든다' },
        { k: 'pass', label: `${boss(S)}에게 보고하고 넘긴다`, hint: '규정대로' },
        { k: 'brush', label: '"다들 힘들다, 버텨 보자"', hint: '오늘은 끝난다' },
      ],
    }),
    apply: (S, k) => ({
      help: { t: '이틀 밤을 새워 청원휴가와 생계 지원을 올렸습니다.', fx: { mind: -2 }, mark: { set: { soldier_helped: {} } } },
      pass: { t: `${boss(S)}에게 보고했습니다. 그 뒤로는 소식을 듣지 못했습니다.`, mark: { set: { soldier_passed: {} } } },
      brush: { t: '버텨 보자고 했습니다. 병사는 "알겠습니다"라고만 했습니다.', mark: { set: { soldier_brushed: {} } } },
    })[k] }),
  C({ id: 'cadre_soldier_letter', kind: 'event', w: 8, needs: 'soldier_helped', c: (S) => since(S, m(S, 'soldier_helped').ym) >= 4,
    run: () => ({ t: '그때 면담했던 병사가 전역하며 손편지를 두고 갔습니다. "그때 아니었으면 못 버텼습니다."', fx: { mind: 12 }, mark: { set: { rating_plus: {} }, del: ['soldier_helped'] } }) }),
  C({ id: 'cadre_soldier_unfit', kind: 'event', w: 8, needs: 'soldier_brushed', c: (S) => since(S, m(S, 'soldier_brushed').ym) >= 2,
    run: (S) => ({ t: `그때 버티자고 했던 병사가 결국 부적합 심사를 받았습니다. ${boss(S)}이 "면담 기록은 남겼냐"고 물었습니다.`, fx: { mind: -10 }, mark: { set: { rating_minus: {} }, del: ['soldier_brushed'] } }) }),

  // ── 사격장 통제 → 숨긴 일은 돌아온다 ──
  C({ id: 'cadre_brass', kind: 'decision', w: 4, c: (S) => served(S) >= 1,
    build: () => ({
      title: '탄피 하나가 모자란다',
      body: '사격 통제를 마치고 세어 보니 탄피가 하나 모자랍니다. 해가 지고 있습니다.',
      choices: [
        { k: 'search', label: '다 같이 찾는다', hint: '밤까지 · 병사들 원성' },
        { k: 'report', label: '보고하고 수색을 요청한다', hint: '훈련 중지 · 내 평정에 흠' },
        { k: 'skip', label: '수량을 맞춰 적는다', hint: '오늘은 끝난다 · 들키면 크다' },
      ],
    }),
    apply: (S, k) => ({
      search: { t: '밤 열 시, 풀숲에서 탄피를 찾았습니다. 병사들 눈빛이 곱지 않았지만 아무 일 없었습니다.', fx: { fit: -2, mind: -3 } },
      report: { t: '보고했습니다. 대대 전체가 수색했고, 다음 날 아침 찾았습니다.', fx: { mind: -5 }, mark: { set: { rating_minus: {} } } },
      skip: { t: '수량을 맞춰 적었습니다. 그날 밤 잠이 오지 않았습니다.', fx: { mind: -4 }, mark: { set: { brass_skip: {} } } },
    })[k] }),
  C({ id: 'cadre_brass_found', kind: 'event', w: 10, needs: 'brass_skip', c: (S) => since(S, m(S, 'brass_skip').ym) >= 3,
    run: () => ({ t: '사격장 정비 중 탄피가 발견됐고, 그날 기록이 거짓이었다는 게 드러났습니다. 징계위원회에 섰습니다.', fx: { mind: -15 }, punish: { kind: 'confine' }, mark: { set: { rating_minus: {} }, del: ['brass_skip'] } }) }),

  // ── 상급자의 사적 지시 ──
  C({ id: 'cadre_boss', kind: 'decision', w: 4, c: (S) => served(S) >= 3,
    build: (S) => ({
      title: '주말에 이삿짐 좀',
      body: `${S.status === 'officer' ? '대대장' : '주임원사'}이 주말에 관사 이사를 도와 달라고 합니다. "병사 몇 명 데리고 오고."`,
      choices: [
        { k: 'comply', label: '병사들을 데리고 간다', hint: '눈 밖에 나지 않는다 · 병사들 주말이 사라진다' },
        { k: 'self', label: '혼자 가서 돕는다', hint: '내 주말만 쓴다' },
        { k: 'refuse', label: '정중히 거절한다', hint: '규정상 맞다 · 찍힐 수 있다' },
      ],
    }),
    apply: (S, k) => ({
      comply: { t: '병사 셋과 이삿짐을 날랐습니다. 월요일 아침 병사들 표정이 어두웠습니다.', fx: { fit: -2, mind: -3 }, mark: { set: { boss_comply: {} } } },
      self: { t: '혼자 가서 짐을 날랐습니다. 짜장면을 얻어먹었습니다.', fx: { fit: -3 }, mark: { set: { boss_self: {} } } },
      refuse: { t: '병사 사역은 어렵다고 말씀드렸습니다. 한동안 결재가 늦게 났습니다.', fx: { mind: -4 }, mark: { set: { boss_refuse: {} } } },
    })[k] }),

  // ── 근무평정 (흔적을 모아 읽는다) ──
  C({ id: 'cadre_rating', kind: 'event', w: 20, gap: 10, max: 3, when: { months: [6, 12] }, c: (S) => served(S) >= 4,
    run: (S) => {
      const plus = ['rating_plus', 'boss_comply', 'boss_self', 'duty_report'].filter((k) => m(S, k)).length + (S.rewards?.length ? 1 : 0);
      const minus = ['rating_minus', 'boss_refuse', 'duty_blind'].filter((k) => m(S, k)).length;
      const v = plus - minus;
      const why = m(S, 'boss_refuse') ? ' 이삿짐을 거절한 일이 아직 남아 있는 듯했습니다.' : m(S, 'rating_plus') ? ' 그 병사 일로 대대장이 이름을 기억했습니다.' : '';
      const t = v >= 2 ? `근무평정 — 상위권. ${boss(S)}이 장기복무를 생각해 보라고 했습니다.${why}`
        : v <= -1 ? `근무평정 — 하위권.${why || ' 지난 일이 발목을 잡았습니다.'}`
          : `근무평정 — 중간. 무난하다는 말을 들었습니다.${why}`;
      return { t, fx: { mind: v >= 2 ? 6 : v <= -1 ? -6 : 0 }, mark: { set: { rating: { v } } } };
    } }),

  // ── 장기복무 (돌아오는 결과 → 선발되면 이 판은 여기서 끝난다) ──
  C({ id: 'cadre_long_term', kind: 'decision', w: 20,
    c: (S) => S.route !== 'academy' && S.route !== 'nco_long' && S.monthsLeft != null && S.monthsLeft <= 14 && S.monthsLeft >= 4,
    build: (S) => ({
      title: '장기복무, 지원할까?',
      body: `의무복무가 ${S.monthsLeft}개월 남았습니다. 장기복무 선발 공고가 떴습니다.${m(S, 'rating') ? ` 지난 평정은 ${m(S, 'rating').v >= 2 ? '상위권' : m(S, 'rating').v <= -1 ? '하위권' : '중간'}이었습니다.` : ''}`,
      choices: [
        { k: 'apply', label: '지원한다', hint: '선발되면 군에 남는다' },
        { k: 'leave', label: '예정대로 전역한다', hint: '취업 준비를 시작한다' },
      ],
    }),
    apply: (S, k) => (k === 'apply'
      ? { t: '장기복무 지원서를 냈습니다. 결과는 몇 달 뒤에 나옵니다.', mark: { set: { long_apply: {} } } }
      : { t: '전역하기로 했습니다. 주말마다 자기소개서를 썼습니다.', fx: { skill: 2 }, mark: { set: { long_no: {} } } }) }),
  C({ id: 'cadre_long_result', kind: 'event', w: 30, needs: 'long_apply', c: (S) => since(S, m(S, 'long_apply').ym) >= 2,
    run: (S) => {
      const v = m(S, 'rating')?.v ?? 0;
      if (roll(S, Math.min(0.85, Math.max(0.1, 0.4 + 0.15 * v)))) return { t: '장기복무 선발 명단에 이름이 있었습니다.', fx: { mind: 15 }, ending: 'longTerm', mark: { del: ['long_apply'] } };
      return { t: `장기복무에서 떨어졌습니다.${v <= -1 ? ' 평정이 발목을 잡았습니다.' : ''} 예정대로 전역합니다.`, fx: { mind: -10 }, mark: { set: { long_fail: {} }, del: ['long_apply'] } };
    } }),

  // ── 연인 → 결혼 (간부만: 관사·주말부부) ──
  C({ id: 'cadre_marry', kind: 'decision', w: 4, c: (S) => S.bonds?.lover != null && S.bonds.lover >= 40 && served(S) >= 6,
    build: () => ({
      title: '결혼 얘기가 나왔다',
      body: '여자친구가 조심스럽게 물었습니다. "우리, 관사 들어가면 어때?"',
      choices: [
        { k: 'yes', label: '하자', hint: '관사 · 다음 전출지도 같이' },
        { k: 'later', label: '전역하고 생각하자', hint: '서운해할 수 있다' },
      ],
    }),
    apply: (S, k) => (k === 'yes'
      ? { t: '부대 근처 예식장에서 결혼했습니다. 대대 간부들이 축가를 불렀습니다.', fx: { mind: 15 }, mark: { set: { married: {} } } }
      : { t: '전역 뒤에 생각하자고 했습니다. 한동안 통화가 짧았습니다.', fx: { mind: -4 } }) }),
  C({ id: 'cadre_married_life', kind: 'event', w: 6, gap: 8, needs: 'married', c: (S) => since(S, m(S, 'married').ym) >= 2,
    run: (S) => ({ t: pick(S, [
      '비상 소집에 새벽 세 시에 나갔습니다. 아내가 현관 불을 켜 두었습니다.',
      '관사 옆집 중대장 가족과 김장을 했습니다.',
    ]), fx: { mind: 4 } }) }),

  // ── 일상 (간부판 "조용한 달" 대신) ──
  C({ id: 'cadre_paperwork', kind: 'event', w: 4, gap: 6,
    run: (S) => ({ t: pick(S, [
      '교육훈련 계획서를 세 번 고쳤습니다. 새벽 한 시에 퇴근했습니다.',
      '분기 보고서 마감. 부대 앞 편의점 도시락이 저녁이었습니다.',
      '정신전력 교육 자료를 만들다 PPT 서식에서 하루가 갔습니다.',
    ]), fx: { mind: -3, skill: 2 } }) }),
  C({ id: 'cadre_soldiers_leave', kind: 'event', w: 6, gap: 99, c: (S) => served(S) >= 16,
    run: (S) => ({ t: m(S, 'style_strict')
      ? '처음 맡았던 병사들이 전역했습니다. 고맙다는 말은 없었지만 마지막 경례가 유난히 반듯했습니다.'
      : m(S, 'style_soft')
        ? `처음 맡았던 병사들이 전역했습니다. 단톡방에 초대받았고, "${role(S)}님 밥 한번 사세요"가 첫 메시지였습니다.`
        : '처음 맡았던 병사들이 전역했습니다. 생활관이 낯선 얼굴로 채워졌습니다.', fx: { mind: 4 } }) }),
];
