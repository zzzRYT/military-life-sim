// echoes.js — 되부르기 (docs/04 §3-3): 기존 사건에 붙는 "그때 그 일" 문구. 사건 id → echo 배열.
// needs: 흔적 id (배열이면 전부). t: 문구 교체, add: 덧붙임. 함수면 (S, out) — out.t로 성공/실패를 본다. '' 이면 건너뜀.
// 흔적은 content/events-bootcamp.js·events-place.js가 남긴다. 문구는 전부 '가정'.
const won = (o) => o.t.includes('!'); // 평가 사건: 포상이면 "…!"가 들어간다
const REL = { church: '교회', catholic: '성당', temple: '법당' };

export const ECHOES = {
  eval_marksman: [
    { needs: 'rifle_ace', add: (S, o) => (won(o) ? '훈련소 때 20발 중 18발, 그 손맛 그대로였습니다.' : '훈련소 특등 소문이 무색하게 손이 떨렸습니다.') },
    { needs: 'rifle_poor', add: (S, o) => (won(o) ? '훈련소에서 영점도 못 잡던 내가.' : '훈련소 때처럼 영점부터 말썽이었습니다.') },
  ],
  eval_fitness: [
    { needs: 'march_dropout', add: (S, o) => (won(o) ? '행군에서 낙오했던 그날 이후 매일 밤 연병장을 돌았습니다.' : '훈련소 행군에서 낙오했던 기억이 다시 떠올랐습니다.') },
    { needs: 'march_strong', add: (S, o) => (won(o) ? '훈련소 행군을 완주한 다리는 아직 살아 있었습니다.' : '훈련소 행군을 완주하던 체력은 어디 갔는지.') },
    { needs: 'ankle', add: '뛰는 내내 훈련소에서 다친 발목이 신경 쓰였습니다.' },
  ],
  eval_leadership: [
    { needs: 'boot_squad_leader', add: '훈련소 분대장 시절 혼나며 배운 게 이제야 쓸모가 있었습니다.' },
    { needs: 'boot_quiet', add: '훈련소에서 손을 들지 않았던 게 조금 후회됐습니다.' },
  ],
  eval_combat: [
    { needs: 'march_strong', add: '훈련소 각개전투 교장보다는 할 만했습니다.' },
  ],
  drill: [
    { needs: 'gas_fled', add: '방독면을 쓸 때마다 훈련소 가스실이 떠올랐습니다.' },
    { needs: 'ankle', add: '훈련 내내 훈련소 때 다친 발목이 시큰거렸습니다.' },
  ],
  mos_211101_gasmask_drill: [
    { needs: 'gas_fled', add: '훈련소 가스실에서 뛰쳐나갔던 기억에 손이 먼저 떨렸습니다.' },
  ],
  rough_day: [
    { needs: 'boot_squad_leader', add: '"훈련소 분대장 했다며? 그것밖에 안 돼?"라는 말까지 들었습니다.' },
    { needs: 'group_punish', add: '훈련소 때 연대 책임으로 같이 구르던 동기들이 생각났습니다.' },
  ],
  quiet_month: [
    { needs: 'grad_alone', t: '조용한 한 달. 수료식에 아무도 오지 않았던 날을 생각했습니다. 지금은 그럭저럭 괜찮습니다.' },
    { needs: 'peer_dropout', t: '조용한 한 달. 훈련소에서 귀가했던 그 동기의 SNS에 새 사진이 올라왔습니다. 잘 지내는 것 같았습니다.' },
    { needs: 'letter_mom', t: '조용한 한 달. 훈련소 때 받은 어머니의 인터넷 편지를 사물함에서 꺼내 다시 읽었습니다.' },
    { needs: 'religion', t: (S) => (REL[S.marks.religion.v] ? `조용한 한 달. 일요일이면 훈련소 때처럼 ${REL[S.marks.religion.v]}에 갔습니다. 간식은 그때만 못했습니다.` : '') },
    { needs: 'boot_cold', t: '조용한 한 달. 생활관에 기침 소리가 들리자 훈련소 감기가 떠올라 마스크부터 찾았습니다.' },
  ],
  desertion_other: [
    { needs: 'peer_dropout', add: '훈련소에서 짐을 싸던 동기의 뒷모습이 겹쳐 보였습니다.' },
  ],
  abuse_seen: [
    { needs: 'group_punish', add: '훈련소 연대 책임 때 아무 말 못 했던 게 오래 마음에 걸려 있었습니다.' },
  ],
  desert_self: [
    { needs: 'religion', add: (S, o) => (o.t.includes('상담') && REL[S.marks.religion.v] ? `훈련소 ${REL[S.marks.religion.v]}에서 만났던 군종 장교가 먼저 떠올랐습니다.` : '') },
    { needs: 'letter_mom', add: (S, o) => (o.t.includes('버티') || o.t.includes('상담') ? '사물함 속 어머니 편지가 마음을 붙잡았습니다.' : '') },
  ],
  bond_mother_birthday: [
    { needs: 'letter_mom', add: '훈련소에서 매일 편지를 보내 주던 어머니였습니다.' },
  ],
  bond_gomsin_crisis: [
    { needs: 'grad_lover', add: '수료식 날 계급장을 달아 주던 사람이었는데.' },
  ],
  bond_d100: [
    { needs: 'letter_lover', add: '훈련소 인편의 첫 줄은 아직도 외웁니다.' },
  ],
  bond_holiday_leave: [
    { needs: 'grad_family', add: (S, o) => (o.t.includes('당첨') ? '수료식 날 고기를 사 주시던 부모님이 이번엔 집밥을 차려 주셨습니다.' : '') },
  ],
  bond_leave_date: [
    { needs: 'grad_lover', add: '수료식 날 받은 꽃다발 사진을 같이 다시 봤습니다.' },
  ],
};
