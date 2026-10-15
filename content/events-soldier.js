// content/events-soldier.js — 병사 주특기 고유 사건 (research/situations/soldier/ 기반, 전부 가정)
// S.mos 키: 육군 = 주특기 코드('111101'), 해군 = 직별 표기('갑판(11)'),
//           공군·해병대 = 요약표 주특기명. rules/soldier-mos.json 키와 일치해야 함.
import { rand } from '../src/engine.js';

const SOLDIER = (branch, mos) => (S) => S.status === 'soldier' && S.branch === branch && S.mos === mos;

export const SOLDIER_EVENTS = [
  // ── 육군 ──
  { id: 'mos_111101_zeroing', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-army:S_new_4+S_new_5',
    c: SOLDIER('army', '111101'),
    build: () => ({
      title: '영점사격',
      body: '자대에서는 분대 단위 기동사격과 야간사격이 병행된다. 영점이 어긋난 소총으로는 표적을 맞히기 어렵다.',
      choices: [
        { k: 'aim', label: '영점사격에 집중한다', hint: '특급전사 후보' },
        { k: 'skip', label: '대충 넘긴다', hint: '재사격 가능' },
      ],
    }),
    apply: (S, k) => k === 'aim'
      ? { t: '영점을 잡고 사격에 집중했습니다. 분대 사격 성적이 올랐습니다.', fx: { skill: 4, mind: 2 } }
      : { t: '사격을 대충 넘겼다가 재사격을 받았습니다.', fx: { mind: -4 } } },

  { id: 'mos_111108_firing_data', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-army:S_new_1+S_new_3',
    c: SOLDIER('army', '111108'),
    build: () => ({
      title: '사격제원 계산',
      body: '신형 박격포는 사격정보를 자동 산출하지만, 구형 포는 계산병의 손계산에 명중률이 좌우된다. 포반의 정설이다.',
      choices: [
        { k: 'manual', label: '수동 계산을 숙달한다', hint: '구형 포에서도 명중률' },
        { k: 'auto', label: '자동 체계에 의존한다', hint: '신형 포 한정' },
      ],
    }),
    apply: (S, k) => k === 'manual'
      ? { t: '사격제원 수동 계산을 익혔습니다. 어떤 포에서도 쓸 수 있는 손이 되었습니다.', fx: { skill: 5, mind: 1 } }
      : { t: '자동 체계에만 의존했습니다. 구형 포가 들어오면 적응이 걱정됩니다.', fx: { skill: 1, mind: -2 } } },

  { id: 'mos_112101_demolition_school', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-army:S_new_9',
    c: SOLDIER('army', '112101'),
    build: () => ({
      title: '폭파 주특기 교육',
      body: '특전팀은 폭파·통신·화기·의무·정찰 중 주특기를 받아 전문 교육을 이수한다. 팀 안의 자리를 정하는 시간이다.',
      choices: [
        { k: 'deep', label: '폭파를 심화한다', hint: '팀 내 전문가 입지' },
        { k: 'broad', label: '다능화를 추구한다', hint: '범용성' },
      ],
    }),
    apply: (S, k) => k === 'deep'
      ? { t: '폭파 절차를 파고들었습니다. 팀에서 폭파는 그에게 맡긴다는 말이 나옵니다.', fx: { skill: 5, mind: -3 } }
      : { t: '여러 주특기를 골고루 익혔습니다. 어디에 붙여도 돌아가는 병사가 되었습니다.', fx: { skill: 3, mind: 1 } } },

  { id: 'mos_121101_shell_loading', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-army:S_new_11',
    c: SOLDIER('army', '121101'),
    build: () => ({
      title: '탄약 장전',
      body: '탄약 한 발이 30kg에 달한다. 사격훈련 때는 수십 발을 반복 장전하며 포반의 사격 속도를 떠받친다. 허리가 먼저 운다.',
      choices: [
        { k: 'fast', label: '장전 속도를 올린다', hint: '사격 성과 · 허리 부담' },
        { k: 'steady', label: '자세와 호흡을 관리한다', hint: '지속가능' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'fast') {
        if (rand(S) < 0.25) return { t: '속도를 올리다 허리를 다쳤습니다. 한동안 장전에서 빠졌습니다.', fx: { fit: -12, mind: -4 } };
        return { t: '장전 속도를 끌어올렸습니다. 포반의 사격 템포가 살아났습니다.', fx: { fit: -4, skill: 3 } };
      }
      return { t: '자세와 호흡을 지키며 장전했습니다. 무리 없이 훈련을 마쳤습니다.', fx: { fit: 1, mind: 2 } };
    } },

  { id: 'mos_141105_shingung_drill', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-army:S_new_18',
    c: SOLDIER('army', '141105'),
    build: () => ({
      title: '교전 절차 숙달',
      body: '신궁 운용병은 탐지부터 조준·발사까지의 교전 절차를 수 초 안에 완수해야 한다. 실사격 기회는 희소하다.',
      choices: [
        { k: 'drill', label: '교전 절차를 몸에 밴다', hint: '방공 태세' },
        { k: 'maintain', label: '장비 점검·보관에 전념한다', hint: '안정적' },
      ],
    }),
    apply: (S, k) => k === 'drill'
      ? { t: '교전 절차를 반복 숙달했습니다. 사이렌이 울려도 손이 먼저 움직입니다.', fx: { skill: 4, mind: -2 } }
      : { t: '장비 점검·보관에 집중했습니다. 맡은 장비는 늘 최상 상태입니다.', fx: { skill: 3, mind: 2 } } },

  { id: 'mos_155101_video_analysis', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-army:S_new_21',
    c: SOLDIER('army', '155101'),
    build: () => ({
      title: '영상 판독',
      body: '정찰 비행으로 수집된 영상을 판독해 이상 징후를 식별하고 보고하는 것이 임무다. 장시간 모니터 앞의 눈이 피로하다.',
      choices: [
        { k: 'focus', label: '판독에 집중한다', hint: '이상 징후 조기 포착' },
        { k: 'auto', label: '자동 분석 도구를 활용한다', hint: '효율 · 오탐 주의' },
      ],
    }),
    apply: (S, k) => k === 'focus'
      ? { t: '화면을 샅샅이 판독했습니다. 작은 이상 징후를 조기에 포착해 보고했습니다.', fx: { skill: 5, mind: -3 } }
      : { t: '자동 분석 도구를 활용해 업무를 처리했습니다. 효율은 올랐으나 세밀함은 아쉽습니다.', fx: { skill: 2, mind: 1 } } },

  { id: 'mos_161101_mine_clearing', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-army:S_new_23+S_new_24',
    c: SOLDIER('army', '161101'),
    build: () => ({
      title: '지뢰 탐지·제거',
      body: '전방 공병부대의 탐지 임무는 위험 부담이 크다. 지뢰제거장비와 휴대용 탐지기를 들고 수색로 개척에 투입된다.',
      choices: [
        { k: 'volunteer', label: '탐지 임무에 자원한다', hint: '사명감 · 위험 부담' },
        { k: 'support', label: '후방 지원 임무를 맡는다', hint: '안전' },
      ],
    }),
    apply: (S, k) => k === 'volunteer'
      ? { t: '탐지 임무에 자원했습니다. 긴장 속에서 절차를 지켰고, 부대는 그를 믿기 시작했습니다.', fx: { skill: 3, mind: -6 } }
      : { t: '후방 지원 임무를 맡았습니다. 무리 없이 복무를 이어갑니다.', fx: { mind: 2 } } },

  { id: 'mos_163102_snow_removal', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: '가정',
    c: SOLDIER('army', '163102'),
    build: () => ({
      title: '동계 제설',
      body: '겨울철 부대 제설에는 굴삭기와 페이로더가 동원된다. 새벽부터 제설에 투입되는 것이 공병장비 운용병의 겨울 일상이다.',
      choices: [
        { k: 'duty', label: '제설 임무를 성실히 수행한다', hint: '부대 평판 · 혹한 노출' },
        { k: 'rest', label: '정비실에서 대기한다', hint: '체력 보존' },
      ],
    }),
    apply: (S, k) => k === 'duty'
      ? { t: '새벽 제설에 성실히 임했습니다. 부대 길목이 먼저 뚫렸고, 평가도 따라왔습니다.', fx: { fit: -4, mind: 3 } }
      : { t: '정비실에서 대기하며 체력을 아꼈습니다. 현장 경험은 얻지 못했습니다.', fx: { fit: 2, mind: -1 } } },

  { id: 'mos_171101_field_wire', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: '가정',
    c: SOLDIER('army', '171101'),
    build: () => ({
      title: '선깔기',
      body: '훈련이 시작되면 통신선부터 깔아야 지휘망이 열린다. 야지를 오가며 선을 풀고, 끊어진 구간을 찾아 잇는다.',
      choices: [
        { k: 'lay', label: '가설 숙련에 집중한다', hint: '개통 속도' },
        { k: 'radio', label: '무전 운용을 전담한다', hint: '전문성' },
      ],
    }),
    apply: (S, k) => k === 'lay'
      ? { t: '선 가설에 익숙해졌습니다. 훈련 때마다 지휘망이 가장 먼저 열립니다.', fx: { fit: -3, skill: 4 } }
      : { t: '무전 운용을 전담했습니다. 교신 절차는 그에게 맡기면 된다.', fx: { skill: 4, mind: 1 } } },

  { id: 'mos_211101_gasmask_drill', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-army:S_new_26',
    c: SOLDIER('army', '211101'),
    build: () => ({
      title: '방독면 착용 훈련',
      body: '화생방전 상황을 가정한 훈련이다. 제한된 시야와 호흡 곤란 속에서 임무를 수행하고, 방호복까지 걸치면 체력 소모가 크다.',
      choices: [
        { k: 'master', label: '착용을 숙달한다', hint: '실전 대비' },
        { k: 'easy', label: '천천히 적응한다', hint: '안전' },
      ],
    }),
    apply: (S, k) => k === 'master'
      ? { t: '방독면 착용과 동작을 숙달했습니다. 착용 시간이 눈에 띄게 줄었습니다.', fx: { skill: 4, fit: -2 } }
      : { t: '무리하지 않고 천천히 적응했습니다. 평가 압박은 있지만 몸은 괜찮습니다.', fx: { mind: -2, fit: 2 } } },

  // ── 해군 ──
  { id: 'mos_n11_unrep_line', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-navy:S_new_1+S_new_21',
    c: SOLDIER('navy', '11'),
    build: () => ({
      title: '해상보급의 앞줄',
      body: '항해 중 보급함과 나란히 서서 연료·탄약·식량을 옮기는 함간 보급. 두 함정을 잇는 밧줄·호스를 건네받는 것은 갑판병의 몫이다.',
      choices: [
        { k: 'front', label: '앞줄에 자원한다', hint: '전문성 · 관계' },
        { k: 'back', label: '뒷줄 지원에 머문다', hint: '안전' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'front') {
        if (rand(S) < 0.2) return { t: '파도에 흔들린 갑판에서 밧줄에 손을 다쳤습니다. 앞줄은 역시 위험했습니다.', fx: { fit: -8, skill: 2 } };
        return { t: '선임에게 보급 절차를 배워 앞줄에 섰습니다. 밧줄을 건네받는 타이밍이 익숙해졌습니다.', fx: { skill: 4, mind: 2 } };
      }
      return { t: '뒷줄 지원에만 머물렀습니다. 무리 없었지만 성장의 속도는 느립니다.', fx: { mind: 1 } };
    } },

  { id: 'mos_n12_narrow_channel', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-navy:S_new_2',
    c: SOLDIER('navy', '12'),
    build: () => ({
      title: '협수로 야간항해',
      body: '협수로·악기상·야간항해에서는 타기 조작이 빈번해진다. 어두운 함교에서 짧은 간격으로 떨어지는 변침 명령을 복명복창·조작·보고로 처리한다.',
      choices: [
        { k: 'procedure', label: '긴장 속에서 절차를 지킨다', hint: '신뢰' },
        { k: 'watch', label: '선임 조타수의 동작을 익힌다', hint: '전문성' },
      ],
    }),
    apply: (S, k) => k === 'procedure'
      ? { t: '긴장 속에서도 복명복창과 보고를 끝까지 지켰습니다. 당직사관의 신뢰가 쌓였습니다.', fx: { skill: 4, mind: -4 } }
      : { t: '선임 조타수의 타기 운용을 눈으로 익히며 당직을 마쳤습니다.', fx: { skill: 3, mind: -1 } } },

  { id: 'mos_n13_magazine_control', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-navy:S_new_5',
    c: SOLDIER('navy', '13'),
    build: () => ({
      title: '탄약고 관리',
      body: '총기·탄약 관리자는 출납 장부와 실제 보유량을 매일 실셈으로 대조한다. 무기고·탄약고 출입은 간부 2명이 동행하는 이중통제가 원칙이다.',
      choices: [
        { k: 'strict', label: '실셈·이중통제를 원칙대로 지킨다', hint: '안전 · 신뢰' },
        { k: 'loose', label: '대충 넘긴다', hint: '편의 · 리스크' },
      ],
    }),
    apply: (S, k) => k === 'strict'
      ? { t: '실셈과 이중통제를 원칙대로 지켰습니다. 간부들이 탄약고는 그에게 맡긴다고 합니다.', fx: { skill: 4, mind: -2 } }
      : { t: '귀찮다며 절차를 대충 넘겼습니다. 당장은 편하지만 걸리면 끝입니다.', fx: { mind: -3 } } },

  { id: 'mos_n15_false_target', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: '가정',
    c: SOLDIER('navy', '15'),
    build: () => ({
      title: '오경보와 허위표적',
      body: '레이더 화면에는 파도 반사와 기상 현상에 의한 허위표적이 수없이 뜬다. 진짜인지 잡음인지 가려내는 것은 전탐병의 눈과 경험에 달려 있다.',
      choices: [
        { k: 'learn', label: '선임의 판별 노하우를 배운다', hint: '정확도' },
        { k: 'report', label: '애매하면 일단 보고한다', hint: '안전 지향 · 오경보' },
      ],
    }),
    apply: (S, k) => k === 'learn'
      ? { t: '선임의 판별 노하우를 배웠습니다. 허위표적에 흔들리는 일이 줄었습니다.', fx: { skill: 5, mind: -1 } }
      : { t: '애매한 표적은 일단 보고했습니다. 안전하지만 오경보가 잦다는 말이 나옵니다.', fx: { skill: 2, mind: -2 } } },

  { id: 'mos_n16_acoustic_signature', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-navy:S_new_24',
    c: SOLDIER('navy', '16'),
    build: () => ({
      title: '음향지문',
      body: '숙련된 음탐병은 잠수함이 내는 미세한 소리를 음향지문으로 식별해 기종까지 가려낸다. 병사에게는 아직 먼 영역이지만, 선임의 식별을 옆에서 보는 것부터 시작된다.',
      choices: [
        { k: 'study', label: '음향 식별 공부에 매진한다', hint: '장기 전문성' },
        { k: 'duty', label: '당직 운용에만 충실한다', hint: '안정' },
      ],
    }),
    apply: (S, k) => k === 'study'
      ? { t: '헤드폰 너머 소리의 결을 공부했습니다. 프로펠러음의 차이를 구분하기 시작했습니다.', fx: { skill: 5, mind: -2 } }
      : { t: '당직 운용에만 충실했습니다. 무리 없이 근무를 마쳤습니다.', fx: { mind: 2 } } },

  { id: 'mos_n42_engineroom_duty', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-navy:S_new_18',
    c: SOLDIER('navy', '42'),
    build: () => ({
      title: '기관실 당직',
      body: '기관실은 소음·진동·고열이 상시적인 공간이다. 계기판을 확인하고 순찰하며 이상 징후를 보고하는 것이 주 임무다. 보호장구 준수가 생명줄이다.',
      choices: [
        { k: 'protect', label: '보호장구를 철저히 착용한다', hint: '장기 건강' },
        { k: 'endure', label: '불편해도 그냥 근무한다', hint: '편의 · 리스크' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'protect') return { t: '귀마개와 보호구를 철저히 착용하고 근무했습니다. 기관실 당직이 조금 덜 두렵습니다.', fx: { fit: 2, mind: 1 } };
      if (rand(S) < 0.2) return { t: '보호구 없이 장기간 근무한 여파가 왔습니다. 귀가 먹먹하고 머리가 아픕니다.', fx: { fit: -8, mind: -3 } };
      return { t: '불편함을 참고 보호구 없이 근무했습니다. 당장은 괜찮아 보입니다.', fx: { fit: -2, mind: 1 } };
    } },

  { id: 'mos_n44_shore_power', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-navy:S_new_22',
    c: SOLDIER('navy', '44'),
    build: () => ({
      title: '육상전원 케이블',
      body: '정박 중에는 육상전원 케이블을 연결해 함내 발전기 가동을 멈춘다. 100m가 넘는 무거운 케이블 작업이 최근 민간 외주로 전환되는 과도기다.',
      choices: [
        { k: 'learn', label: '외주 인력과 호흡을 맞춰 절차를 익힌다', hint: '전문성' },
        { k: 'teach', label: '직접 작업하던 시절의 요령을 전수한다', hint: '관계' },
      ],
    }),
    apply: (S, k) => k === 'learn'
      ? { t: '외주 인력과 호흡을 맞추며 연결 절차를 익혔습니다. 체력은 들었지만 손에 남는 것이 있습니다.', fx: { skill: 4, fit: -3 } }
      : { t: '직접 작업하던 시절의 요령을 외주 인력에게 전수했습니다. 현장에서의 평판이 올랐습니다.', fx: { mind: 3, skill: 2 } } },

  { id: 'mos_n28_vertrep', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-navy:S_new_21',
    c: SOLDIER('navy', '28'),
    build: () => ({
      title: 'VERTREP',
      body: '항해 중 보급은 함간 보급이나 헬기로 화물을 옮기는 수직보급으로 이뤄진다. 헬기가 내려놓은 화물을 갑판에서 받아 창고로 분배하는 것이 해상보급병의 몫이다.',
      choices: [
        { k: 'join', label: '보급 작업에 적극 참여한다', hint: '전문성 · 관계' },
        { k: 'store', label: '자기 창고 업무에만 머문다', hint: '안정' },
      ],
    }),
    apply: (S, k) => k === 'join'
      ? { t: '수직보급 작업에 적극 참여했습니다. 화물 분배 요령이 몸에 익었고 동료들과도 가까워졌습니다.', fx: { fit: -3, skill: 3, mind: 2 } }
      : { t: '자기 창고 업무에만 머물렀습니다. 무리 없이 복무를 이어갑니다.', fx: { mind: 1 } } },

  { id: 'mos_n62_hell_week', kind: 'decision', when: { phase: ['train'] }, w: 2, gap: 12,
    src: 'soldier-navy:S_new_14+S_new_27',
    c: SOLDIER('navy', '62'),
    build: () => ({
      title: '특수전 기본과정',
      body: '특수전 기본과정은 특수전 요원으로서의 자질을 평가·선발하는 과정이다. 기본전술·체력·수영·특전기질 함양이 핵심이며, 극기 구간이 정점이다.',
      choices: [
        { k: 'endure', label: '동기들과 버티며 끝까지 간다', hint: '자부심' },
        { k: 'quit', label: '한계를 느끼면 퇴교한다', hint: '안전 · 다른 직별 전환' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'endure') {
        if (rand(S) < 0.3) return { t: '극기 구간을 넘지 못하고 중도 하차했습니다. 몸은 망가졌지만 무사히 빠져나왔습니다.', fx: { fit: -15, mind: -8 } };
        return { t: '극기 구간을 통과했습니다. 동기들과 나눈 악수가 오래 기억에 남을 것입니다.', fx: { fit: -6, mind: 8, skill: 4 } };
      }
      return { t: '한계를 인정하고 퇴교했습니다. 다른 직별로 전환되어 복무를 이어갑니다.', fx: { mind: -6, fit: 2 } };
    } },

  { id: 'mos_n64_rescue_course', kind: 'decision', when: { phase: ['serve'] }, w: 1, gap: 12,
    src: 'soldier-navy:S_new_8+S_new_9',
    c: SOLDIER('navy', '64'),
    build: () => ({
      title: '해난구조 기본과정',
      body: '심해잠수사가 되려면 12주 해난구조 기본과정을 통과해야 한다. 후반부에는 매일 장거리 달리기와 잠수 숙달이 이어진다. 병도 도전할 수 있는 과정이다.',
      choices: [
        { k: 'apply', label: '해난구조 기본과정에 지원한다', hint: '전문성 · 명예' },
        { k: 'stay', label: '일반 보직에 남는다', hint: '안정' },
      ],
    }),
    apply: (S, k) => k === 'apply'
      ? { t: '해난구조 기본과정에 지원했습니다. 12주의 문턱 앞에서 몸과 마음을 다잡습니다.', fx: { fit: -5, mind: 4, skill: 3 } }
      : { t: '일반 보직에 남기로 했습니다. 특수전의 길은 접어두었습니다.', fx: { mind: 2 } } },

  // ── 공군 ──
  { id: 'mos_af_airdefense_shift', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-airforce:S_new_2',
    c: SOLDIER('airforce', '방공포운용병'),
    build: () => ({
      title: '교대 대기',
      body: '방공포대는 상시 대기 태세를 유지한다. 운용병은 교대로 탐지·사격통제 장비를 감시하며, 항적 이상이 없으면 대기 시간이 길어진다.',
      choices: [
        { k: 'watch', label: '교대 중 감시에 집중한다', hint: '대처 능력 · 피로' },
        { k: 'study', label: '대기 시간에 자기계발을 한다', hint: '스펙 · 돌발 대응 주의' },
      ],
    }),
    apply: (S, k) => k === 'watch'
      ? { t: '교대 내내 감시에 집중했습니다. 돌발 상황 대처 능력이 붙었지만 피로가 쌓였습니다.', fx: { skill: 4, mind: -3 } }
      : { t: '대기 시간을 쪼개 공부했습니다. 자격증 공부가 진척됐습니다.', fx: { skill: 3, mind: -1 } } },

  { id: 'mos_af_mp_gate', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-airforce:S_new_4',
    c: SOLDIER('airforce', '군사경찰병'),
    build: () => ({
      title: '위병소 출입통제',
      body: '비행단 위병소와 정문에서 출입자 신원 확인과 차량 검문을 맡는다. 기밀 시설인 비행단 특성상 출입통제 절차가 엄격하다.',
      choices: [
        { k: 'strict', label: '절차대로 꼼꼼하게 검문한다', hint: '보안' },
        { k: 'flex', label: '융통성 있게 처리한다', hint: '원활 · 보안 주의' },
      ],
    }),
    apply: (S, k) => k === 'strict'
      ? { t: '검문을 절차대로 꼼꼼히 했습니다. 보안은 지켰지만 대기 줄에서 민원이 나왔습니다.', fx: { skill: 3, mind: -2 } }
      : { t: '융통성 있게 처리했습니다. 통제는 원활했지만 보안 구멍이 걱정됩니다.', fx: { mind: 1, skill: -1 } } },

  { id: 'mos_af_ops_crew', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-airforce:S_new_6+S_new_25',
    c: SOLDIER('airforce', '운항관제병'),
    build: () => ({
      title: '크루와 조출야비',
      body: '운항관제병의 생활은 교대와 조출야비가 지배한다. 야간 비행이 있으면 아침부터 나와 밤까지 굴리는 날도 있다. 생활 리듬이 불규칙하다.',
      choices: [
        { k: 'manage', label: '불규칙 근무에 맞춰 체력을 관리한다', hint: '적응' },
        { k: 'endure', label: '그냥 버틴다', hint: '피로 · 실수 주의' },
      ],
    }),
    apply: (S, k) => k === 'manage'
      ? { t: '교대 사이 수면과 운동 리듬을 만들었습니다. 불규칙 근무에 몸이 적응하고 있습니다.', fx: { fit: 2, mind: 2 } }
      : { t: '그냥 버텼습니다. 피로가 누적되고 실수할 뻔한 순간이 있었습니다.', fx: { fit: -4, mind: -4 } } },

  { id: 'mos_af_tower_english', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-airforce:S_new_7+S_new_26',
    c: SOLDIER('airforce', '항공통제병'),
    build: () => ({
      title: '영어 교신',
      body: '관제 업무의 모든 대화는 영어로 이뤄지며, 다양한 국적의 조종사와 통신해야 한다. 영어 실력이 곧 업무 능력이다.',
      choices: [
        { k: 'study', label: '일과 후 항공영어를 공부한다', hint: '교신 능력' },
        { k: 'basic', label: '최소한의 표현만 익힌다', hint: '편함' },
      ],
    }),
    apply: (S, k) => k === 'study'
      ? { t: '일과 후 항공영어 표현을 익혔습니다. 무전 너머 조종사와의 교신이 한결 수월해졌습니다.', fx: { skill: 5, mind: -2 } }
      : { t: '최소한의 표현만 익혔습니다. 일상은 편하지만 긴급 상황 대응이 걱정됩니다.', fx: { skill: 1, mind: 1 } } },

  { id: 'mos_af_fuel_mixing', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-airforce:S_new_11',
    c: SOLDIER('airforce', '유류보급병'),
    build: () => ({
      title: '유종 혼합의 압박',
      body: '기름 종류 하나만 잘못 섞어도 대형 사고로 이어질 수 있다. 항공유 품질 불량은 엔진 고장으로 직결된다. 불출 전 확인 절차가 생명이다.',
      choices: [
        { k: 'check', label: '유종 확인 절차를 철저히 지킨다', hint: '사고 방지 · 속도' },
        { k: 'fast', label: '숙련에 의존해 빠르게 처리한다', hint: '효율 · 혼합 주의' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'check') return { t: '유종·수분 확인 절차를 철저히 지켰습니다. 느리지만 사고 없는 불출이 이어집니다.', fx: { skill: 4, mind: -1 } };
      if (rand(S) < 0.15) return { t: '숙련에 의존해 빠르게 처리하다 유종을 혼합할 뻔했습니다. 간부에게 적발되어 크게 혼났습니다.', fx: { mind: -8, skill: -1 } };
      return { t: '숙련에 의존해 빠르게 처리했습니다. 효율은 올랐지만 매번 아찔합니다.', fx: { skill: 2, mind: -2 } };
    } },

  { id: 'mos_af_fire_foam', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-airforce:S_new_12',
    c: SOLDIER('airforce', '소방구조병'),
    build: () => ({
      title: '항공기 화재대응 훈련',
      body: '항공기 화재는 연료 화재라 물이 아닌 폼으로 진압하며, 수십 초 안에 화염 온도를 낮춰야 기체 폭발을 막을 수 있다. 모의 화재진압 훈련을 반복한다.',
      choices: [
        { k: 'drill', label: '훈련 매뉴얼대로 폼 방사 절차를 숙달한다', hint: '실전 대응' },
        { k: 'casual', label: '형식적으로 참여한다', hint: '편함' },
      ],
    }),
    apply: (S, k) => k === 'drill'
      ? { t: '폼 방사 절차를 반복 숙달했습니다. 출동 시 손이 먼저 움직일 것입니다.', fx: { skill: 4, fit: -3 } }
      : { t: '형식적으로만 참여했습니다. 편했지만 실전 투입이 두렵습니다.', fx: { mind: -2 } } },

  { id: 'mos_af_maint_fod', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-airforce:S_new_37',
    c: SOLDIER('airforce', '항공기기체정비병'),
    build: () => ({
      title: 'FOD와 안전수칙',
      body: '활주로·격납고의 이물질은 엔진에 빨려 들어가 대형 사고를 일으킬 수 있다. 작업 전후 공구 점호와 이물질 점검이 정비병의 일상이다.',
      choices: [
        { k: 'strict', label: '공구 점호와 점검을 철저히 한다', hint: '안전' },
        { k: 'skip', label: '대충 넘긴다', hint: '빠름 · 중책임 주의' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'strict') return { t: '공구 점호와 이물질 점검을 철저히 했습니다. 안전 기록이 깨끗하게 이어집니다.', fx: { skill: 4, mind: 1 } };
      if (rand(S) < 0.15) return { t: '점검을 대충 넘겼다가 공구 하나를 분실했습니다. 기체에 빨려 들어갈 뻔한 사고로 조사받았습니다.', fx: { mind: -10, skill: -2 } };
      return { t: '점검을 대충 넘겼습니다. 빠르지만 불안한 하루였습니다.', fx: { mind: -2 } };
    } },

  { id: 'mos_af_power_grid', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-airforce:S_new_22',
    c: SOLDIER('airforce', '전력설비병'),
    build: () => ({
      title: '기지의 전기를 책임지다',
      body: '기지 변전·발전설비의 운용·정비를 맡는다. 여름철 전력 피크나 정전 시 긴급 복구가 임무다. 감전 위험이 있어 안전수칙이 엄격하다.',
      choices: [
        { k: 'safe', label: '안전수칙을 철저히 지키며 정비한다', hint: '안전' },
        { k: 'fast', label: '숙련에 의존한다', hint: '빠름 · 감전 주의' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'safe') return { t: '안전수칙을 지키며 정비를 마쳤습니다. 느리지만 누구도 다치지 않았습니다.', fx: { skill: 3, mind: 1 } };
      if (rand(S) < 0.12) return { t: '숙련에 의존하다 감전 사고를 당했습니다. 다행히 경미했지만 한동안 정비에서 빠졌습니다.', fx: { fit: -10, mind: -5 } };
      return { t: '숙련에 의존해 빠르게 정비했습니다. 운이 좋았습니다.', fx: { skill: 2, mind: -1 } };
    } },

  { id: 'mos_af_radar_site', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-airforce:S_new_34',
    c: SOLDIER('airforce', '지상레이더정비병'),
    build: () => ({
      title: '산꼭대기 레이더 사이트',
      body: '산꼭대기 레이더 사이트는 소규모 인원으로 24시간 체제를 유지한다. 편제가 3명인 곳은 한 명이 휴가를 가면 두 명이 이틀에 한 번꼴로 24시간 근무를 선다.',
      choices: [
        { k: 'plan', label: '교대표를 미리 짜서 휴가 공백에 대비한다', hint: '동료 관계 · 피로' },
        { k: 'endure', label: '그냥 버틴다', hint: '피로 주의' },
      ],
    }),
    apply: (S, k) => k === 'plan'
      ? { t: '교대표를 미리 짜서 휴가 공백에 대비했습니다. 동료들과의 관계가 좋아졌습니다.', fx: { mind: 2, fit: -2 } }
      : { t: '그냥 버텼습니다. 피로가 쌓이고 실수할 뻔한 순간이 있었습니다.', fx: { fit: -5, mind: -3 } } },

  { id: 'mos_af_cargo_hazmat', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-airforce:S_new_13',
    c: SOLDIER('airforce', '항공운수병'),
    build: () => ({
      title: '위험물기능사',
      body: '위험물기능사를 보유하면 항공운수나 유류보급 같은 인기 특기 배정에 유리하다. 자격증 하나가 특기 배정의 티켓이 되는 구조다.',
      choices: [
        { k: 'cert', label: '위험물기능사 취득에 도전한다', hint: '특기 배정 유리 · 공부' },
        { k: 'skip', label: '일반 선발에 맡긴다', hint: '편함' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'cert') {
        if (rand(S) < 0.5) return { t: '위험물기능사를 취득했습니다. 특기 배정에서 유리한 고지를 점했습니다.', fx: { skill: 6, mind: 3 } };
        return { t: '위험물기능사 시험에 떨어졌습니다. 다시 도전할지 고민 중입니다.', fx: { skill: 2, mind: -3 } };
      }
      return { t: '일반 선발에 맡겼습니다. 편하지만 인기 특기는 경쟁이 치열합니다.', fx: { mind: 1 } };
    } },

  // ── 해병대 ──
  { id: 'mos_mc_recon_apply', kind: 'decision', when: { phase: ['serve'] }, w: 1, gap: 12,
    src: 'soldier-marine:S_new_1+S_new_3',
    c: SOLDIER('marine', '수색병'),
    build: () => ({
      title: '수색교육 지원',
      body: '수색 지원은 부대 내 선발 성격으로, 지원 자격 단계에서 수영 테스트 등으로 능력을 검정한다. 수영·스킨스쿠버 자격증 소지자는 가점을 받는다.',
      choices: [
        { k: 'apply', label: '수색교육에 지원한다', hint: '선발 시 10주 교육 · 탈락 시 원대 복귀' },
        { k: 'stay', label: '일반 보병 복무를 유지한다', hint: '안정' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'apply') {
        if (rand(S) < 0.5) return { t: '수색교육 선발을 통과했습니다. 10주 교육의 문턱에 섰습니다.', fx: { fit: -4, mind: 6, skill: 3 } };
        return { t: '수색교육 선발에서 탈락했습니다. 원대로 복귀해 복무를 이어갑니다.', fx: { mind: -5, fit: 2 } };
      }
      return { t: '일반 보병 복무를 유지하기로 했습니다. 안정된 선택입니다.', fx: { mind: 2 } };
    } },

  { id: 'mos_mc_ibs_drill', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-marine:S_new_5+S_new_6',
    c: SOLDIER('marine', '소총수'),
    build: () => ({
      title: 'IBS 특성화 훈련',
      body: '120kg이 넘는 소형고무보트를 6명이 한 몸처럼 움직여 파도를 뚫는 2주 과정의 해병대 고유 특성화 훈련이다. 수료 시 특성화 휘장이 수여된다.',
      choices: [
        { k: 'team', label: '팀워크에 집중해 수료한다', hint: '체력 · 휘장 · 자부심' },
        { k: 'quit', label: '체력 부담으로 중도 이탈한다', hint: '휘장 미획득' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'team') {
        if (rand(S) < 0.25) return { t: '팀워크에 집중했지만 파도 앞에서 보트가 뒤집혔습니다. 부상으로 훈련에서 빠졌습니다.', fx: { fit: -10, mind: -4 } };
        return { t: '6명이 한 몸처럼 보트를 움직여 파도를 뚫었습니다. 특성화 휘장을 받았습니다.', fx: { fit: 4, mind: 6 } };
      }
      return { t: '체력 부담으로 중도 이탈했습니다. 휘장은 얻지 못했지만 몸은 무사합니다.', fx: { mind: -4, fit: 2 } };
    } },

  { id: 'mos_mc_k9_ears', kind: 'decision', when: { phase: ['serve'] }, w: 3,
    src: 'soldier-marine:S_new_7',
    c: SOLDIER('marine', 'K9 자주포 운용병'),
    build: () => ({
      title: '포반동',
      body: '포반은 사격·기동 소음에 상시 노출된다. 분기별 해상사격훈련이 반복되면 청력 보호가 일상적 과제가 된다.',
      choices: [
        { k: 'protect', label: '청력 보호를 철저히 한다', hint: '건강' },
        { k: 'focus', label: '훈련에 집중하다 소홀히 한다', hint: '청력 리스크' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'protect') return { t: '청력 보호구를 철저히 착용했습니다. 포성 속에서도 귀가 지킴받고 있습니다.', fx: { fit: 2, mind: 1 } };
      if (rand(S) < 0.25) return { t: '훈련에 집중하느라 보호를 소홀히 했습니다. 며칠째 귀에서 삐 소리가 납니다.', fx: { fit: -8, mind: -3 } };
      return { t: '훈련에 집중하느라 보호를 소홀히 했습니다. 당장은 괜찮아 보입니다.', fx: { skill: 2, fit: -2 } };
    } },

  { id: 'mos_mc_kaav_assault', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-marine:S_new_15',
    c: SOLDIER('marine', 'KAAV 운용병'),
    build: () => ({
      title: '결정적 행동',
      body: '합동상륙훈련에서 KAAV는 함정에서 진수해 해안으로 돌격하는 최초돌격 전력이다. 상륙장갑 병사에게 이 훈련은 병과 정체성의 정점이다.',
      choices: [
        { k: 'lead', label: '최초돌격조에 자원한다', hint: '자부심 · 체력' },
        { k: 'support', label: '후속 지원 임무를 맡는다', hint: '안정' },
      ],
    }),
    apply: (S, k) => k === 'lead'
      ? { t: '최초돌격조에 자원했습니다. 파도를 뚫고 해안에 상륙했습니다. 병과 정체성의 정점을 찍었습니다.', fx: { fit: -5, mind: 8, skill: 3 } }
      : { t: '후속 지원 임무를 맡았습니다. 무리 없이 훈련을 마쳤습니다.', fx: { mind: 2 } } },

  { id: 'mos_mc_breaching_safety', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: '가정',
    c: SOLDIER('marine', '장애물개척병'),
    build: () => ({
      title: '폭파물 취급',
      body: '폭약 설치와 회로 구성은 작은 실수도 큰 사고로 이어질 수 있다. 절차를 지킬수록 훈련 속도는 느려지고, 속도를 내면 리스크가 커진다.',
      choices: [
        { k: 'safe', label: '안전 절차를 완벽히 준수한다', hint: '안전' },
        { k: 'fast', label: '속도 단축에 도전한다', hint: '평가 · 리스크' },
      ],
    }),
    apply: (S, k) => {
      if (k === 'safe') return { t: '안전 절차를 완벽히 준수했습니다. 느리지만 무사고로 훈련을 마쳤습니다.', fx: { skill: 3, mind: 1 } };
      if (rand(S) < 0.2) return { t: '속도를 내다 회로 구성에서 실수했습니다. 다행히 폭발은 없었지만 크게 혼났습니다.', fx: { mind: -8, skill: -1 } };
      return { t: '속도 단축에 성공했습니다. 평가에서 좋은 말을 들었습니다.', fx: { skill: 4, mind: -2 } };
    } },

  { id: 'mos_mc_drone_manual', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: 'soldier-marine:S_new_19',
    c: SOLDIER('marine', '공병지원드론 운용병'),
    build: () => ({
      title: '교범 없는 장비',
      body: '도입 초기 장비라 운용 교범이 정립되지 않은 영역이 있다. 병사는 운용 경험을 축적하는 사실상 1세대가 된다.',
      choices: [
        { k: 'record', label: '운용 노하우를 기록하고 공유한다', hint: '전문성 · 관계' },
        { k: 'follow', label: '주어진 절차만 따른다', hint: '안정' },
      ],
    }),
    apply: (S, k) => k === 'record'
      ? { t: '운용 노하우를 기록하고 공유했습니다. 부대 내 드론 운용의 1세대가 되었습니다.', fx: { skill: 5, mind: 2 } }
      : { t: '주어진 절차만 따랐습니다. 무리 없이 복무를 이어갑니다.', fx: { mind: 1 } } },

  { id: 'mos_mc_signal_island', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: '가정',
    c: SOLDIER('marine', '해병통신 운용병'),
    build: () => ({
      title: '도서 통신망 운용',
      body: '백령도·연평도·제주 등 도서 부대 통신병은 중계소와 통신장비 운용, 장애 복구를 담당한다. 태풍·폭설로 통신이 두절되면 자력 복구가 최우선 임무다.',
      choices: [
        { k: 'repair', label: '장애 복구 역량을 강화한다', hint: '전문성' },
        { k: 'prevent', label: '예방 점검을 철저히 한다', hint: '안정' },
      ],
    }),
    apply: (S, k) => k === 'repair'
      ? { t: '장애 복구 역량을 키웠습니다. 태풍에 끊긴 통신을 자력으로 복구했습니다.', fx: { skill: 5, mind: 3 } }
      : { t: '예방 점검을 철저히 했습니다. 장애 발생률이 눈에 띄게 줄었습니다.', fx: { skill: 3, mind: 2 } } },

  { id: 'mos_mc_ammo_count', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: '가정',
    c: SOLDIER('marine', '병기탄약병'),
    build: () => ({
      title: '실탄 회수',
      body: '사격훈련 후 실탄 회수와 탄약 관리 절차가 규정대로 이행되는지 확인하는 것이 핵심 일상이다. 탄약 수불의 정확성은 부대 안전과 직결된다.',
      choices: [
        { k: 'strict', label: '절차를 완벽히 준수한다', hint: '신뢰' },
        { k: 'help', label: '사격 지원 임무를 병행한다', hint: '관계 · 피로' },
      ],
    }),
    apply: (S, k) => k === 'strict'
      ? { t: '실탄 수불을 한 발도 빠짐없이 확인했습니다. 부대에서 그를 믿고 탄약고를 맡깁니다.', fx: { skill: 4, mind: 2 } }
      : { t: '사격 지원 임무를 병행했습니다. 동료들과 가까워졌지만 몸은 피곤합니다.', fx: { fit: -3, mind: 3 } } },

  { id: 'mos_mc_content_security', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: '가정',
    c: SOLDIER('marine', '콘텐츠운영병'),
    build: () => ({
      title: '부대 홍보 콘텐츠 제작',
      body: '부대 훈련과 행사를 촬영해 SNS·유튜브용 홍보 콘텐츠를 제작한다. 군사보안 심의를 거쳐야 하는 절차가 작업의 특징이다.',
      choices: [
        { k: 'quality', label: '콘텐츠 품질에 집중한다', hint: '전문성 · 포트폴리오' },
        { k: 'security', label: '보안 절차를 철저히 지킨다', hint: '신뢰' },
      ],
    }),
    apply: (S, k) => k === 'quality'
      ? { t: '훈련 영상의 완성도를 높였습니다. 포트폴리오가 될 작업물이 쌓이고 있습니다.', fx: { skill: 5, mind: 2 } }
      : { t: '보안 심의 절차를 철저히 지켰습니다. 실수 없는 콘텐츠 운영으로 신뢰를 얻었습니다.', fx: { skill: 3, mind: 1 } } },

  { id: 'mos_mc_cook_island', kind: 'decision', when: { phase: ['serve'] }, w: 2,
    src: '가정',
    c: SOLDIER('marine', '조리병'),
    build: () => ({
      title: '격오지 급양',
      body: '서북도서 격오지에서는 해상 보급 일정이 식자재 수급을 좌우한다. 배편이 끊기면 제한된 식자재로 식단을 짜야 하고, 조리병 한 명의 판단이 전 부대의 식탁이 된다.',
      choices: [
        { k: 'stock', label: '비축 식자재로 식단을 유지한다', hint: '신뢰' },
        { k: 'request', label: '보급 일정 조율을 건의한다', hint: '관계' },
      ],
    }),
    apply: (S, k) => k === 'stock'
      ? { t: '비축 식자재로 식단을 유지했습니다. 배편이 끊긴 날에도 부대는 밥을 먹었습니다.', fx: { skill: 4, mind: 3 } }
      : { t: '보급 일정 조율을 건의했습니다. 반영 여부는 미지수지만 목소리는 냈습니다.', fx: { mind: 1 } } },
];
