// cast.test.js — 관계 장면 (docs/06): 사건 id → 상대, 결정·결과 상태, 디졸브, 모든 장면×상대×상태가 그려진다
import test from 'node:test';
import assert from 'node:assert/strict';
import { actorOf, castOf, drawScene, drawPortrait, dissolve, sceneOf, SCENE_KEYS, ACTORS, W, H } from '../src/scene.js';

const S0 = (o = {}) => ({ phase: 'serve', ym: '2027-03', branch: 'army', mos: '111101', rank: 1, st: { mind: 50 }, era: { id: 'e05' }, env: { post: 'front', drills: [], people: [] }, recent: [], flags: {}, log: [], ...o });

// 캔버스 없는 node용 2d 컨텍스트: fillRect를 세고, ImageData는 진짜 배열로
function mockCtx() {
  const px = new Uint8ClampedArray(W * H * 4);
  return {
    n: 0, fillStyle: '',
    fillRect() { this.n++; }, clearRect() {}, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, fill() {},
    getImageData: () => ({ data: px.slice() }),
    putImageData(img) { px.set(img.data); },
    px,
  };
}

test('cast: 사건 id → 상대 (rel_ 둘째 칸, 기존 사람 사건)', () => {
  assert.equal(actorOf('rel_junior_room_keys'), 'junior');
  assert.equal(actorOf('rel_officer_office_talk'), 'officer');
  assert.equal(actorOf('rel_nobody_room_x'), null);
  assert.equal(actorOf('p_pass_down'), 'senior');
  assert.equal(actorOf('p_junior_in'), 'junior');
  assert.equal(actorOf('p_sfc_pick'), 'nco');
  assert.equal(actorOf('bond_gomusin_breakup'), 'lover');
  assert.equal(actorOf('era_e1_visit_money'), 'family');
  assert.equal(actorOf('drill'), null);
  assert.equal(actorOf(undefined), null);
});

test('cast: rel_ id 셋째 칸이 장소다', () => {
  assert.equal(sceneOf(S0(), 'rel_family_visit_x').key, 'visit');
  assert.equal(sceneOf(S0(), 'rel_lover_booth_x').key, 'booth');
  assert.equal(sceneOf(S0(), 'rel_nco_office_x').key, 'office');
  assert.equal(sceneOf(S0(), 'era_e1_phonebooth').key, 'booth');
});

test('cast: 결정이 열려 있으면 ask, 이번 달 로그 줄이면 resolve + 관계 방향', () => {
  assert.deepEqual(castOf(S0(), 'p_pass_down'), { actor: 'senior', beat: 'ask', tone: 'mid', id: 'p_pass_down' });
  const S = S0({ log: [{ ym: '2027-02', id: 'p_junior_in', text: 'x' }] });
  assert.equal(castOf(S), null, '지난달 일은 장면에 안 남는다');
  S.log.push({ ym: '2027-03', id: 'rel_junior_room_x', text: 'x', fx: { mind: 5 }, rel: { junior: -10 } });
  assert.equal(castOf(S).tone, 'down', '내 멘탈보다 그 사람과의 관계가 먼저');
  S.log.push({ ym: '2027-03', id: 'rel_senior_room_x', text: 'x', rel: { roomSenior: 6 } });
  assert.deepEqual(castOf(S), { actor: 'senior', beat: 'resolve', tone: 'up', id: 'rel_senior_room_x' }, '역할(roomSenior)은 종류(senior)로 묶는다');
  S.log.push({ ym: '2027-03', text: '월급' });
  assert.equal(castOf(S).actor, 'senior', '상대 없는 줄은 건너뛴다');
});

test('cast: 디졸브 — p만큼 새 그림, 나머지는 이전 그림 (4×4 베이어)', () => {
  const g = mockCtx();
  g.px.fill(200); // 새 장면
  const prev = { data: new Uint8ClampedArray(W * H * 4).fill(10) };
  dissolve(g, prev, 0);
  assert.ok(g.px.every((v) => v === 10), 'p=0: 이전 그림 그대로');
  g.px.fill(200);
  dissolve(g, prev, 0.5);
  const fresh = [...Array(W * H).keys()].filter((i) => g.px[i * 4] === 200).length;
  assert.equal(fresh, (W * H) / 2, 'p=0.5: 정확히 절반');
  g.px.fill(200);
  dissolve(g, prev, 1);
  assert.ok(g.px.every((v) => v === 200), 'p=1: 손대지 않는다');
});

test('cast: 모든 장면 × 상대 × 상태 × 시대가 예외 없이 그려진다', () => {
  for (const key of SCENE_KEYS) for (const a of ACTORS) for (const beat of ['ask', 'up', 'down']) for (const era of ['e01', 'e03', 'e04', 'e05']) {
    const id = `rel_${a}_${key}_x`;
    const S = S0({ era: { id: era }, ym: era === 'e01' ? '1999-12' : '2027-07' });
    if (beat !== 'ask') { S.log.push({ ym: S.ym, id, text: 'x', fx: { mind: beat === 'up' ? 1 : -1 } }); S.recent.push(id); S.flags['last_' + id] = S.ym; }
    for (const t of [0, 2, 5]) {
      const g = mockCtx();
      const r = drawScene(g, S, beat === 'ask' ? id : undefined, t, { t });
      assert.ok(g.n > 0, `${key}/${a}`);
      if (sceneOf(S, beat === 'ask' ? id : undefined).key !== key) continue; // 장면 규칙이 다른 곳으로 보낸 경우
      assert.equal(r.key, key);
    }
  }
  for (const a of ACTORS) drawPortrait(mockCtx(), S0(), a);
});
