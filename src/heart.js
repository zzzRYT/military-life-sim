// heart.js — 입소 첫날 밤 "마음속 글" → 성향 태그. 태그가 묻는 결정·고를 취미·훈련 초점을 정한다.
// 순수 함수 + 키워드 사전. ponytail: 부분 문자열 매칭이라 부정문("돈은 상관없다")도 돈으로 읽는다 — 정확도가 문제되면 LLM 분석으로

export const AXES = {
  love: { label: '연인', words: ['여자친구', '여친', '남자친구', '남친', '애인', '연애', '사랑', '기다려', '곰신', '고무신', '헤어'] },
  family: { label: '가족', words: ['엄마', '아빠', '어머니', '아버지', '부모', '가족', '동생', '형', '누나', '언니', '할머니', '할아버지', '효도'] },
  money: { label: '돈', words: ['돈', '저축', '적금', '모으', '목돈', '주식', '코인', '투자', '월급', '등록금', '빚'] },
  study: { label: '공부', words: ['공부', '자격증', '시험', '토익', '영어', '어학', '편입', '수능', '복학', '학점', '독서', '취업'] },
  fitness: { label: '몸', words: ['운동', '헬스', '체력', '근육', '몸', '다이어트', '달리', '러닝', '축구', '농구'] },
  duty: { label: '군 생활', words: ['주특기', '훈련', '열심', '인정', '성실', '책임', '리더', '분대장', '포상', '특급전사', '잘하'] },
  mind: { label: '마음', words: ['걱정', '불안', '두렵', '무섭', '힘들', '외롭', '우울', '스트레스', '버티', '견디'] },
  rest: { label: '휴식', words: ['게임', '쉬', '잠', '영화', '드라마', '유튜브', '휴대폰', '폰', '음악'] },
};

/** 글 → { text, tags: 점수순 상위 3개 축 } */
export function readHeart(text = '') {
  const tags = Object.entries(AXES)
    .map(([k, a]) => [k, a.words.reduce((n, w) => n + text.split(w).length - 1, 0)])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
  return { text: text.trim(), tags };
}

/** 결정 id → 축. 여기 없는 결정(탈영·부조리·부적합 심사·가정 형편)은 누구에게나 묻는다 */
const TOPIC = [
  [/^savings$|^hobby_mobilegame_whale$/, 'money'],
  [/^bond_(gomsin|gomusin|d100)/, 'love'],
  [/^bond_(mother_birthday|easy_military)$/, 'family'],
  [/^hobby_elearning_exam$|^mos_af_(tower_english|cargo_hazmat)$/, 'study'],
  [/^phone$/, 'rest'],
  [/^mos_/, 'duty'],
];
export const topicOf = (id) => TOPIC.find(([re]) => re.test(id))?.[1] ?? null;

/** 이 결정을 플레이어에게 물을까? 글이 없으면 전부 묻는다. 안 묻는 결정은 첫 선택지로 자동 처리 */
export function asks(heart, id) {
  const t = topicOf(id);
  return !heart?.tags.length || !t || heart.tags.includes(t);
}

/** 취미 id → 축 */
const HOBBY_AXIS = {
  weight: 'fitness', running: 'fitness', ballsports: 'fitness',
  reading: 'study', license: 'study', language: 'study', csat: 'study', elearning: 'study',
  stock: 'money',
  mobilegame: 'rest', ott: 'rest', boardgame: 'rest', baduk: 'rest',
  meditation: 'mind', knitting: 'mind', drawing: 'mind', coffee: 'mind',
  writing: 'love', photo: 'family', guitar: 'love',
};

/** 고를 수 있는 취미: 근무 환경(place = engine where)에서 막힌 건 빼고, 성향에 맞는 것만 (최대 n). 모자라면 rf로 나머지에서 채운다 */
export function hobbyChoices(heart, hobbies, rf, n = 4, place) {
  const tags = heart?.tags ?? [];
  hobbies = hobbies.filter((h) => !h.block?.[place]);
  const fit = hobbies.filter((h) => tags.includes(HOBBY_AXIS[h.id]))
    .sort((a, b) => tags.indexOf(HOBBY_AXIS[a.id]) - tags.indexOf(HOBBY_AXIS[b.id]));
  const rest = hobbies.filter((h) => !fit.includes(h));
  while (fit.length < n && rest.length) fit.push(rest.splice(Math.floor(rf() * rest.length), 1)[0]);
  return fit.slice(0, n);
}

/** 성향 → 시작 훈련 초점 (TRAINING 키) */
export const focusOf = (heart) => ({ fitness: 'fitness', duty: 'leadership' })[heart?.tags.find((t) => t === 'fitness' || t === 'duty')] ?? null;

/** 새 판에 글을 반영: S.heart · 시작 훈련 초점 · 연인 이야기를 썼다면 입대 전 연인이 있다 */
export function applyHeart(S, text) {
  S.heart = readHeart(text);
  S.focus = focusOf(S.heart) ?? S.focus;
  if (S.heart.tags.includes('love') && S.bonds && S.bonds.lover == null) S.bonds.lover = 70;
}
