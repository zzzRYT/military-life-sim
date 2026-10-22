// text.js — 인물 자리표시자와 한국어 조사. content/*가 공유한다 (순환 import 없이 쓰려고 src에 둔다)

export const ROLE_NAME = { senior: '맞선임', roomSenior: '생활관 선임', peer: '동기', sfc: '행보관', lt: '소대장', junior: '맞후임', exRoomSenior: '전 생활관 선임', family: '가족', lover: '연인' };

// 받침 있는 말 뒤 → 앞 형태, 없으면 뒤 형태. 으로/로는 ㄹ받침도 '로'
const JOSA = { 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'], 으로: ['으로', '로'], 로: ['으로', '로'], 이랑: ['이랑', '랑'], 랑: ['이랑', '랑'], 아: ['아', '야'], 야: ['아', '야'], 이었: ['이었', '였'], 였: ['이었', '였'], 이다: ['이다', '다'], 이라고: ['이라고', '라고'], 이라는: ['이라는', '라는'], 이에요: ['이에요', '예요'] };
export function josa(word, j) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  if (c < 0 || c > 11171) return j;
  const jong = c % 28;
  const [a, b] = JOSA[j];
  if (a === '으로') return jong && jong !== 8 ? a : b;
  return jong ? a : b;
}

/** 템플릿 문자열의 {role}을 "역할 이름"으로, {role.name}을 이름으로. 바로 뒤 조사(이/가·은/는·을/를…)는 받침에 맞춘다 */
export function fmt(S, str) {
  return str.replace(/\{(\w+)(\.name)?\}(이라고|이라는|이에요|이었|이랑|이다|으로|[이가은는을를과와로랑아야였](?![가-힣]*니다))?/g, (m, role, bare, j) => {
    const p = S.env.people.find((x) => x.role === role);
    if (!p) return m;
    const w = bare && p.name ? p.name : p.name ? `${ROLE_NAME[role]} ${p.name}` : `${p.label} ${ROLE_NAME[role]}`;
    return j ? w + josa(w, j) : w;
  });
}
