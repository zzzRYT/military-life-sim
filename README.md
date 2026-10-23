# 군 생활 시뮬레이터 (가칭)

스무 살, 입영 통지서를 받은 그날부터. 어느 군에서, 어디서 복무할지는 고를 수 없다.
병무청·국방부 공개 통계로 뽑힌 한 번뿐인 군 생활을 입영 전부터 전역까지 살아 보는 웹 시뮬레이터.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/01-product-spec.md](docs/01-product-spec.md) | 설계 문서: 한 판의 흐름, 입영 연기, 군종·경로·특기 추첨, 복무 규칙, 사건, 엔딩 |
| [docs/02-ux-design.md](docs/02-ux-design.md) | 디자인 문서: 화면 목록, 메인 레이아웃, 결정 모달 문법, 잠시 멈춤, 엔딩, 시각 체계 |
| [docs/03-dev-design.md](docs/03-dev-design.md) | 개발 설계: 구조, 데이터 형, 날짜 엔진(민법 160조), 시간 엔진, 추첨, 저장, 테스트, 마일스톤 |
| [docs/04-narrative-design.md](docs/04-narrative-design.md) | 서사 설계: 흔적·줄기·되부르기·연출 감독, 판마다 다른 이야기를 위한 지표와 단계 |
| [docs/05-era-and-fun.md](docs/05-era-and-fun.md) | 시대와 재미: 입대 연도 추첨, 이름 있는 사람들, 딜레마, 꼬리 사건, 같은 날 입대한 사람들 |
| [docs/06-relationship-events.md](docs/06-relationship-events.md) | 관계 사건과 장면 전이: 후임·선임·동기·간부·가족·연인·외부인 사건, 장면 위 상대·말풍선, 결정 레터박스, 장소 디졸브 |
| [docs/fun-brainstorm.md](docs/fun-brainstorm.md) | 재미 브레인스토밍: 지금 재미있는 곳·평평한 곳, 아이디어 22개와 순위, 구현한 '나의 복무 한 줄'(src/timeline.js)과 '갈림길'(src/fork.js) |
| [research/official.md](research/official.md) | 병무청·국방부·법령 공식 데이터 조사 (출처 코드 `[Sx]`) |
| [research/era-official.md](research/era-official.md) | 입대 연도별 복무기간·봉급·적금·휴대폰·사건사고 (1990~2026) |
| [research/era-culture.md](research/era-culture.md) | 시대별 병영 문화·부조리·여가·은어 |
| [research/community-lore.md](research/community-lore.md) | 커뮤니티·언론 '군대 공감' 썰 35개 (짬타이거, 맛다시, 제설, 군대스리가, 전역 미신 등) |
| [research/yearly-routine.md](research/yearly-routine.md) | 병사의 1년: 계절 훈련·작업 리듬과 군종별 반복 일과 |
| [research/history-moments.md](research/history-moments.md) | 복무 중에 터진 나라 일(1995~2026)과 전역하니 바뀐 세상 |
| content/events-lore.js · events-routine.js · events-nation.js | 위 세 리서치 노트를 사건·딜레마·되부르기로 옮긴 콘텐츠 (생활 썰 · 계절·군종 일과 · 국가 사건과 "전역하고 보니") |
| [research/relationship-events.md](research/relationship-events.md) | 상대별(후임·선임·동기·간부·가족·연인·외부인) 사건 리서치와 시대별 관계 변화 (출처 `[R1]`~`[R55]`) |
| content/events-rel.js | 위 리서치를 옮긴 관계 사건 49개 (`rel_<상대>_<장소>_<이름>`) |

## 지원 타입

병사만 (육군·해군·공군·해병대) — 군종과 **입대 연도(1995~2026)** 에 따라 복무기간·봉급·휴대폰·분위기가 달라진다. 부사관·장교·준사관은 다루지 않는다.

| 입대 시점 | 육군·해병대 | 해군 | 공군 |
|---|---|---|---|
| 1995 | 26개월 | 28개월 | 30개월 |
| 2003-10 | 24개월 | 26개월 | 28→27개월 |
| 2006~2010 | 3주마다 하루씩 단축 | | |
| 2011 | 21개월 | 23개월 | 24개월 |
| 2017~2020 | 2주마다 하루씩 단축 | | |
| 2020~ | 18개월 | 20개월 | 21개월 |

입대 연도는 항상 추첨이다 (검증용으로만 `?year=2003` 고정).
