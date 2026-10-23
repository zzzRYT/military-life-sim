// reel-scene.test.js — 주마등 장면: 로그 줄이 그때의 장소·페이즈·계급을 남기고, 주마등 한 장이 그 장면으로 그려진다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { newGame, enlist, runGame } from '../src/engine.js';
import { buildRecap } from '../src/recap.js';
import { reelScene, drawScene, castOf, actorOf, SCENE_KEYS, W, H } from '../src/scene.js';
import { EVENTS } from '../content/events.js';

const rules = loadRules();
const play = (seed) => {
  const S = newGame(seed, rules, { birth: '2006-05-01' });
  enlist(S, rules, '2025-12-01');
  return runGame(S, rules, { events: EVENTS, auto: true });
};
const mockCtx = () => ({ n: 0, fillStyle: '', fillRect() { this.n++; }, clearRect() {}, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, fill() {}, getImageData: () => ({ data: new Uint8ClampedArray(W * H * 4) }), putImageData() {} });
const SEEDS = ['rs1', 'rs2', 'rs3', 'rs4', 'rs5', 'rs6'];

test('reel scene: 모든 로그 줄에 그때의 장면(at)이 찍힌다', () => {
  for (const seed of SEEDS) {
    const S = play(seed);
    for (const l of S.log) {
      assert.ok(SCENE_KEYS.includes(l.at?.scene), `${seed} ${l.text}`);
      assert.ok(['pre', 'train', 'serve', 'end'].includes(l.at.phase) && Number.isFinite(l.at.rank) && Number.isFinite(l.at.mind), `${seed} ${l.text}`);
    }
    assert.equal(S.log.find((l) => /입소$/.test(l.text)).at.scene, 'parade', seed); // 입소는 pre에 찍혀도 훈련소 그림
    assert.equal(S.log.find((l) => /^신병교육 수료/.test(l.text)).at.phase, 'serve', seed);
  }
});

test('reel scene: 주마등 한 장마다 그릴 수 있는 장면과 그때의 판', () => {
  for (const seed of SEEDS) {
    const S = play(seed), R = buildRecap(S, rules);
    for (const l of R.movie) {
      const r = reelScene(S, l);
      assert.equal(r.scene.key, l.at.scene, `${seed} ${l.text}`);
      assert.equal(r.S.ym, l.ym);
      assert.equal(r.S.rank, l.at.rank);
      assert.ok(r.S.log.length === 1 && r.S.log[0] === l); // 상대는 그 줄 하나로
      const g = mockCtx();
      assert.equal(drawScene(g, r.S, null, 0, { scene: r.scene }).key, l.at.scene);
      assert.ok(g.n > 0, `${seed} ${l.text}`);
    }
  }
});

test('reel scene: 사람과 있었던 줄은 그 상대가, 휴가 줄은 고른 장소가 다시 나온다', () => {
  let cast = 0, leave = 0;
  for (const seed of [...SEEDS, 'rs7', 'rs8', 'rs9', 'rs10']) {
    const S = play(seed);
    for (const l of S.log) {
      const r = reelScene(S, l);
      if (actorOf(l.id)) { cast++; assert.equal(castOf(r.S)?.actor, actorOf(l.id), l.id); }
      if (l.id === 'leave_go') { leave++; assert.notEqual(l.at.scene, 'base', l.text); }
    }
  }
  assert.ok(cast > 0 && leave > 0, `상대 ${cast} · 휴가 ${leave}`);
});

test('reel scene: at이 없는 줄(예전 저장)은 그 달의 페이즈로 장면을 고른다', () => {
  const S = play('rs1');
  const strip = ({ at, ...l }) => l;
  const served = S.log.find((l) => /^신병교육 수료/.test(l.text)).ym;
  const trainLine = strip(S.log.find((l) => /^입영 \(/.test(l.text)));
  assert.equal(reelScene(S, trainLine).scene.key, 'parade');
  const serveLine = strip(S.log.find((l) => l.ym > served && !l.id));
  assert.equal(reelScene(S, serveLine).S.phase, 'serve');
  assert.ok(SCENE_KEYS.includes(reelScene(S, serveLine).scene.key) && reelScene(S, serveLine).scene.key !== 'town');
  const ev = strip(S.log.find((l) => l.id === 'eval_combat') ?? { ym: served, id: 'eval_combat', text: 'x' });
  assert.equal(reelScene(S, ev).scene.key, 'hill');
});
