// echoes.js — 되부르기 (docs/04 §3-3): 기존 사건에 붙는 "그때 그 일" 문구. 사건 id → echo 배열.
// needs: 흔적 id (배열이면 전부). t: 문구 교체, add: 덧붙임. 함수면 (S, out) — out.t로 성공/실패를 본다. '' 이면 건너뜀.
// 흔적은 content/events-bootcamp.js·events-place.js가 남긴다. 문구는 전부 '가정'. 문체는 전역자의 썰, 휴대폰이 없던 시절은 phoneOn으로 갈린다.
import { phoneOn } from '../src/engine.js';

const won = (o) => o.t.includes('!'); // 평가 사건: 포상이면 "…!"가 들어간다
const REL = { church: '교회', catholic: '성당', temple: '법당' };

export const ECHOES = {
  eval_marksman: [
    { needs: 'rifle_ace', add: (S, o) => (won(o) ? '훈련소 때 20발 중 18발, 그 손맛이 그대로 돌아왔습니다.' : '훈련소 특등 소문이 무색하게 손이 떨렸습니다. 소문은 소문일 뿐이었습니다.') },
    { needs: 'rifle_poor', add: (S, o) => (won(o) ? '훈련소에서 영점도 못 잡던 내가, 하늘에 쏘던 내가.' : '훈련소 때처럼 영점부터 말썽이었습니다. 총이 나를 기억하고 있는 것 같았습니다.') },
  ],
  eval_fitness: [
    { needs: 'march_dropout', add: (S, o) => (won(o) ? '행군에서 낙오했던 그날 이후 매일 밤 연병장을 돌았습니다. 오늘이 그 값입니다.' : '훈련소 행군에서 낙오하던 날의 구급차 소리가 귓가를 스쳤습니다.') },
    { needs: 'march_strong', add: (S, o) => (won(o) ? '훈련소 행군을 완주한 다리는 아직 살아 있었습니다.' : '훈련소 행군을 완주하던 체력은 어디로 갔는지, 다리가 모른 척했습니다.') },
    { needs: 'ankle', add: '뛰는 내내 훈련소에서 다친 발목이 신경 쓰였습니다. 발목이 "나 아직 여기 있다"고 말했습니다.' },
  ],
  eval_leadership: [
    { needs: 'boot_squad_leader', add: '훈련소 분대장 시절 혼나며 배운 게 이제야 쓸모가 있었습니다. 그때의 조교에게 고맙다고 해야 할지 고민했습니다.' },
    { needs: 'boot_quiet', add: '훈련소에서 손을 들지 않았던 게 조금 후회됐습니다. 조금요.' },
  ],
  eval_combat: [
    { needs: 'march_strong', add: '훈련소 각개전투 교장보다는 할 만했습니다. 그 교장은 흙이 아니라 악몽이었습니다.' },
  ],
  drill: [
    { needs: 'gas_fled', add: '방독면을 쓸 때마다 훈련소 가스실이 떠올랐습니다. 이번엔 도망치지 않았다는 것만 기억하기로 했습니다.' },
    { needs: 'ankle', add: '훈련 내내 훈련소 때 다친 발목이 시큰거렸습니다. 날씨 예보는 발목이 먼저 했습니다.' },
  ],
  mos_211101_gasmask_drill: [
    { needs: 'gas_fled', add: '훈련소 가스실에서 뛰쳐나갔던 기억에 손이 먼저 떨렸습니다. 방독면 끈을 두 번 고쳐 맸습니다.' },
  ],
  rough_day: [
    { needs: 'boot_squad_leader', add: '"훈련소 분대장 했다며? 그것밖에 안 돼?"라는 말까지 들었습니다. 분대장 경력은 이럴 때만 소환됩니다.' },
    { needs: 'group_punish', add: '훈련소 때 연대 책임으로 같이 구르던 동기들이 생각났습니다. 그땐 다 같이 맞았는데.' },
  ],
  quiet_month: [
    { needs: 'grad_alone', t: '조용한 한 달. 수료식에 아무도 오지 않았던 날을 생각했습니다. 그때 고기를 올려 주신 동기 어머님이 가끔 생각납니다. 지금은 그럭저럭 괜찮습니다.' },
    { needs: 'peer_dropout', t: (S) => (phoneOn(S)
      ? '조용한 한 달. 훈련소에서 귀가했던 그 동기의 SNS에 새 사진이 올라왔습니다. 잘 지내는 것 같았습니다. 좋아요를 누를까 하다가 말았습니다.'
      : '조용한 한 달. 훈련소에서 귀가했던 그 동기가 잘 지낸다는 소문을 들었습니다. 소문은 이름 석 자와 함께 왔고, 그 이름이 오래 입에 남았습니다.') },
    { needs: 'letter_mom', t: (S) => (phoneOn(S)
      ? '조용한 한 달. 훈련소 때 받은 어머니의 인터넷 편지를 사물함에서 꺼내 다시 읽었습니다. 같은 문장이 다르게 읽혔습니다.'
      : '조용한 한 달. 훈련소 때 받은 어머니의 손편지를 사물함에서 꺼내 다시 읽었습니다. 같은 문장이 다르게 읽혔습니다.') },
    { needs: 'religion', t: (S) => (REL[S.marks.religion.v] ? `조용한 한 달. 일요일이면 훈련소 때처럼 ${REL[S.marks.religion.v]}에 갔습니다. 간식은 그때만 못했습니다.` : '') },
    { needs: 'boot_cold', t: '조용한 한 달. 생활관에 기침 소리가 들리자 훈련소 감기가 떠올라 마스크부터 찾았습니다.' },
  ],
  desertion_other: [
    { needs: 'peer_dropout', add: '훈련소에서 짐을 싸던 동기의 뒷모습이 겹쳐 보였습니다. 그때 빈 침상이 아직도 눈에 선합니다.' },
  ],
  abuse_seen: [
    { needs: 'group_punish', add: '훈련소 연대 책임 때 아무 말 못 했던 게 오래 마음에 걸려 있었습니다. 이번에도 입이 먼저 닫혔습니다.' },
  ],
  desert_self: [
    { needs: 'religion', add: (S, o) => (o.t.includes('상담') && REL[S.marks.religion.v] ? `훈련소 ${REL[S.marks.religion.v]}에서 만났던 군종 장교가 먼저 떠올랐습니다. 초코파이 맛이 같이 떠올랐습니다.` : '') },
    { needs: 'letter_mom', add: (S, o) => (o.t.includes('버티') || o.t.includes('상담') ? '사물함 속 어머니 편지가 마음을 붙잡았습니다.' : '') },
  ],
  bond_mother_birthday: [
    { needs: 'letter_mom', add: '훈련소에서 매일 편지를 보내 주던 어머니였는데, 그 편지의 첫 줄은 늘 "밥은 잘 먹니"였습니다.' },
  ],
  bond_gomsin_crisis: [
    { needs: 'grad_lover', add: '수료식 날 계급장을 달아 주던 사람이었는데. 그날 손끝이 얼마나 떨렸는지 아직 기억합니다.' },
  ],
  bond_d100: [
    { needs: 'letter_lover', add: '훈련소 인편의 첫 줄은 아직도 외웁니다. 외운 줄 알았는데 한 글자가 다릅니다.' },
  ],
  bond_holiday_leave: [
    { needs: 'grad_family', add: (S, o) => (o.t.includes('당첨') ? '수료식 날 고기를 사 주시던 부모님이 이번엔 집밥을 차려 주셨습니다. 고기는 두 배였습니다.' : '') },
  ],
  bond_leave_date: [
    { needs: 'grad_lover', add: '수료식 날 받은 꽃다발 사진을 같이 다시 봤습니다. 꽃은 시들었지만 사진은 그대로였습니다.' },
  ],
};
