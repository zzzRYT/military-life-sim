# 03. 개발 설계

## 1. 원칙

- **정적 웹 한 벌.** 빌드 도구·프레임워크·서버 없이 HTML + ES 모듈 + JSON.
- **규칙은 데이터, 엔진은 작게.** 법령 값은 `rules/*.json`, 사건은 `content/events.js`, 엔진은 RNG·큐·틱·날짜 계산만 담당.
- **결정론.** 같은 시드 → 같은 판. 공유 링크와 테스트가 이 성질에 기댄다.

## 2. 디렉터리

```
index.html            # 화면 골격 + 스타일 (인라인 CSS)
src/
  rng.js              # 시드 RNG, ri, pick, chance, wpick
  date.js             # 만료일(민법 160조), 다음달1일, 월 더하기
  rules.js            # rules/*.json 로드 + 조회 (복무기간, 진급, 정년, 휴가, 급여)
  draw.js             # 신체등급·신분·군종·경로·특기 추첨
  engine.js           # 상태(S), 월 계획(planMonth), tick, fire, endMonth
  ui.js               # 렌더링, 모달, 로그, 저장/불러오기
content/
  events.js           # 사건·결정 테이블
rules/
  service.json        # 신분·군종별 복무기간, 의무복무, 양성교육 기간
  promotion.json      # 병 2-6-6, 간부 최저복무·근속
  retirement.json     # 계급별 연령/근속/계급정년
  pay.json            # 병 월급, 간부 1호봉, 적금 한도·매칭
  leave.json          # 휴가 일수 (추정 플래그 포함)
  weights.json        # 추첨 가중치 + 출처 코드
  assumptions.json    # 공식 출처 없는 값 전부 (출처: "가정")
test/
  date.test.js  rules.test.js  draw.test.js  engine.test.js
```

## 3. 핵심 데이터 형

```js
// 상태 (한 판 = 하나의 S, JSON 직렬화 가능)
S = {
  seed, ver, slotId,
  phase: 'pre' | 'train' | 'serve' | 'reserve' | 'end',
  ym: '2026-03',               // 현재 연월
  birth: '2006-05-14',
  grade: 2,                    // 신체등급
  status: 'soldier' | 'nco' | 'officer' | 'warrant',
  branch: 'army' | 'navy' | 'airforce' | 'marine',
  route: 'conscript' | 'volunteer' | 'academy' | 'rotc' | 'ocs' | 'kma3' | 'nco_civil' | ...,
  mos: 'infantry',             // 특기
  unit: 'gocc',                // 상급부대 (지작사 등)
  rank: 1,                     // 계급 단계
  dates: { enlist, discharge, promotions: [] },   // 날짜 엔진 결과
  defer: { usedDays: 0, count: 0 },               // 연기 사용량
  st: { fit: 60, mind: 60, skill: 40, rel: 50 },  // 0~100
  money: { cash: 0, savings: 0, monthlyDeposit: 0 },
  leave: { left: 24, used: 0 },
  score: 0,                    // 성과 점수
  flags: {}, log: [], queue: [], recent: [],
  cohort: [ /* 같은 날 입영 4명: 각자 축약 상태 */ ]
}
```

```js
// 사건 / 결정
{ id: 'cold_drill',
  when: { phase: ['serve'], months: [1, 12], branch: ['army', 'marine'], season: 'winter' },
  w: 3, gap: 12,                               // 가중치, 재발 최소 간격(개월)
  c: S => S.rank >= 1,                         // 추가 조건
  run: S => ({ t: '혹한기 훈련이 끝났습니다.', fx: { fit: +3, mind: -4 }, src: 'S8' }) }

{ id: 'savings_amount', kind: 'decision',
  when: { phase: ['serve'], months: [1, 3] },
  build: S => ({ title, body, src, choices: [{ k, label, sub, disabled?, why? }] }),
  apply: (S, k) => ({ t, fx, later?: { inMonths: 12, id: 'savings_payoff' } }) }   // 지연 결과
```

## 4. 날짜 엔진 (`date.js`) — 법령 결정론

```
만료일(시작, m개월):
  (Y,M) = 시작 + m개월, d = 시작.day
  d <= 말일(Y,M) → date(Y,M,d) − 1일        // 민법 160조 ②
  else          → date(Y,M,말일(Y,M))       // 민법 160조 ③ (1일 빼지 않음)

다음달1일(날짜) = 날짜가 속한 달의 다음 달 1일

병 전역일 = 만료일(입영일, 복무개월[군종])                  // 2020년 이후 입영: 단축일 0
병 진급일 = [일병, 상병, 병장]
  일병 = 다음달1일(만료일(입영일, 2)), 상병 = 다음달1일(만료일(일병, 6)), 병장 = 다음달1일(만료일(상병, 6))
  전역일을 넘는 진급은 생성하지 않음
간부 의무만료 = 만료일(임관일, 의무개월[신분][경로])
장교 진급 후보 = max(다음달1일(만료일(임관일, 근속)), 다음달1일(만료일(직전진급, 직전계급복무)))
정년 전역일 = 정년 도달월의 다음 달 말일              // 군인사법 36조 ①
```

- 시뮬레이터는 **현재 입영자만** 다루므로 2020년 이전 단축 조견표는 넣지 않는다(YAGNI). 과거 시대 모드가 생기면 그때 추가.
- 테스트 기대값 (민법 계산으로 검증 가능한 값):

| 입력 | 기대값 |
|---|---|
| 육군 입영 2021-03-15 | 전역 2022-09-14, 일병 2021-06-01, 상병 2021-12-01, 병장 2022-06-01 |
| 육군 입영 2021-08-31 (18개월) | 전역 2023-02-28 (말일 분기) |
| 입영 2026-06-09 | 육군 2027-12-08, 해군 2028-02-08, 공군 2028-03-08 |

## 5. 시간 엔진 (`engine.js`)

- 단위는 **월**. 훈련소 구간만 **주** 단위(5~6주를 각 1틱)로 해상도를 올린다.
- 1개월 실제 길이 = (선택한 한 판 길이) / (총 복무 개월). 병사 18개월·30분이면 1개월 ≈ 100초, 배속 1×~8×.
- 장기 간부(10년 이상)는 복무 구간 해상도를 분기로 낮추고 결정 밀도를 유지한다.

```
planMonth():  큐 비우기 → 고정 일정(진급일, 휴가, 월급일, 잠시 멈춤) 넣기
              → chooseFeed()로 사건 1~2개 + 결정 최대 1개를 시점(0~1) 무작위로 넣기
tick(dt):     t += dt * speed / monthSec; 큐에서 t 이하 항목 fire(); 결정이면 멈춤
endMonth():   초점 반영 → 월급·적금 → 상태 감쇠 → 진급/전역/정년 판정 → 지연 결과 → 다음 달
chooseFeed(): when·c 조건 통과한 사건을 w로 wpick, 최근 사건은 ×0.1, gap 미충족 제외
```

- 동기 4명은 같은 엔진을 **사건 없이 결과만** 돌린다(추첨 + 날짜 엔진 + 확률 결말). 성능 부담 없음.

## 6. 추첨 (`draw.js`)

```js
const W = rules.weights;   // weights.json: { grade: {...}, status: {...}, branch: { soldier: {...}, nco: {...} }, ... }
grade   = wpick(W.grade)                         // 7급이면 재추첨 결정 이벤트
status  = S.applied ? S.applied : wpick(W.status)
branch  = wpick(W.branch[status])
route   = wpick(filterEligible(W.route[status][branch], S))   // 나이·학력으로 비활성
mos     = wpick(adjust(W.mos[branch], S.flags.certs, S.flags.major))
```

- 모든 가중치 항목에 `src`(출처 코드) 또는 `"가정"`을 필수로 둔다. 테스트가 누락을 막는다.
- 추첨 연출 화면에는 해당 단계의 확률(%)을 그대로 보여준다.

## 7. 저장

- `localStorage` 키 `mls.save.<slotId>`, 판마다 slotId(시드 기반)를 따로 둔다. 탭 간 덮어쓰기를 피하기 위해서다.
- 모든 읽기·쓰기를 try/catch로 감싼다. 저장이 안 되는 환경(사생활 보호 모드)에서도 플레이할 수 있다.
- 공유 링크는 `?seed=…&choices=…`. 시드와 결정 기록만 담아 같은 판을 재생한다.

## 8. 테스트

- `node --test` (의존성 0).
  - `date.test.js`: §4 표의 기대값.
  - `rules.test.js`: 군종별 복무개월(18/20/21/18), 진급 2-6-6, 정년 표, 모든 가중치의 합 > 0, `src` 존재.
  - `draw.test.js`: 고정 시드 10만 회 추첨 → 군종 비율이 77.8/10.1/6.4/5.7%에 ±0.5%p 이내.
  - `engine.test.js`: 고정 시드 판을 자동 결정으로 끝까지 → 전역일·진급일이 날짜 엔진과 일치, 예외 없음.
- 콘텐츠 린트: 모든 사건의 `src`가 `research/official.md`의 출처 코드이거나 `"가정"`인지 확인한다.

## 9. 배포

- GitHub Pages(정적). 외부 스크립트 없음, 폰트만 Google Fonts.
- 분석·로그 수집은 v1에서 하지 않는다.

## 10. 마일스톤

| 단계 | 산출물 | 완료 기준 |
|---|---|---|
| M1 엔진 | rng·date·rules·draw + 테스트 | §8 테스트 통과 |
| M2 최소 플레이 | 육군 병사 한 판(입영 전 → 전역), 사건 15개 | 끝까지 플레이 가능 |
| M3 7타입 | 해·공·해병 병사 + 부사관·장교·준사관(진로 이벤트) | 7타입 모두 전역/정년 도달 |
| M4 콘텐츠 | 사건 60개, 잠시 멈춤 4개, 엔딩 카드 | 밸런싱 플레이 10판 |
| M5 공개 | 공유 링크, 모바일, 다크 모드 | Pages 배포 |
