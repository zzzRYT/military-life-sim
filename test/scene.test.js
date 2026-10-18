// scene.test.js — 장면: 사건 id·근무지·주특기가 맞는 장소로 간다
import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneOf, baseScene, SCENE_KEYS } from '../src/scene.js';
import { EVENTS } from '../content/events.js';

const S0 = (o = {}) => ({ phase: 'serve', ym: '2027-03', branch: 'army', mos: '111101', rank: 1, st: { mind: 50 }, env: { post: 'front', drills: [] }, recent: [], flags: {}, ...o });
const at = (id, o) => sceneOf(S0(o), id).key;

test('장면: 모든 사건 id는 그릴 수 있는 장소로 간다', () => {
  for (const e of EVENTS) assert.ok(SCENE_KEYS.includes(sceneOf(S0(), e.id).key), e.id);
  const mapped = EVENTS.filter((e) => sceneOf(S0(), e.id).key !== 'base').length;
  assert.ok(mapped / EVENTS.length >= 0.85, `장소가 붙은 사건 ${mapped}/${EVENTS.length}`);
});

test('장면: 요청한 장소 대응', () => {
  assert.equal(at('duty_px_unload'), 'px');
  assert.equal(at('place_voyage'), 'ship');
  assert.equal(at('boot_w5_march'), 'march');
  assert.equal(at('mos_121101_shell_loading'), 'tank');
  assert.equal(at('place_gop_fence'), 'fence');
  assert.equal(at('place_coast_watch'), 'tod');
  assert.equal(at('eval_combat'), 'hill');
  assert.equal(at('spec_cook_field'), 'hill'); // 야외 취사는 주방이 아니라 야산
  assert.equal(at('spec_cook_dawn'), 'kitchen');
  assert.equal(at('duty_px_leave'), 'px'); // PX 휴가 포상은 PX 쪽이 먼저
});

test('장면: 기본 장소 — 근무지 > 주특기 > 막사', () => {
  assert.equal(baseScene(S0({ env: { post: 'gop' } })), 'fence');
  assert.equal(baseScene(S0({ branch: 'navy', env: { post: 'shipSmall' }, mos: '50' })), 'ship');
  assert.equal(baseScene(S0({ mos: '121101' })), 'tank');
  assert.equal(baseScene(S0({ branch: 'marine', env: { post: 'mainland' }, mos: '조리병' })), 'kitchen');
  assert.equal(baseScene(S0()), 'base');
  assert.equal(baseScene(S0({ phase: 'train' })), 'parade');
});

test('장면: 이번 달 사건만 반영하고, 결정 창이 먼저다', () => {
  const S = S0({ recent: ['duty_px_unload', 'place_voyage'], flags: { last_duty_px_unload: '2027-03', last_place_voyage: '2027-02' } });
  assert.equal(sceneOf(S).key, 'px');
  assert.equal(sceneOf(S, 'place_coast_watch').key, 'tod');
  assert.equal(sceneOf(S0({ env: { post: 'front', drills: [{ ym: '2027-03', id: 'division' }] }, recent: ['drill'], flags: { last_drill: '2027-03' } })).key, 'march');
  assert.ok(sceneOf(S0(), 'boot_night_watch').night);
});
