// heart.test.js — 마음속 글 → 성향 태그 → 묻는 결정·취미·초점
import test from 'node:test';
import assert from 'node:assert/strict';
import { readHeart, asks, hobbyChoices, focusOf } from '../src/heart.js';
import { loadRules } from '../src/rules.js';

const rules = loadRules();

test('heart: 키워드로 성향 태그 (점수순)', () => {
  const h = readHeart('여자친구가 기다려 줄지 걱정이다. 돈을 모으고 싶다. 여친 보고 싶다');
  assert.deepEqual(h.tags, ['love', 'money', 'mind']);
  assert.deepEqual(readHeart('').tags, []);
});

test('heart: 성향에 맞는 결정만 묻고, 공통 결정은 항상 묻는다', () => {
  const h = readHeart('적금으로 목돈 만들기');
  assert.equal(asks(h, 'savings'), true);
  assert.equal(asks(h, 'bond_gomsin_crisis'), false);
  assert.equal(asks(h, 'mos_111101_zeroing'), false);
  assert.equal(asks(h, 'desert_self'), true); // 축 없음 → 항상
  assert.equal(asks(readHeart(''), 'bond_gomsin_crisis'), true); // 글 없음 → 전부
});

test('heart: 취미는 성향에 맞는 것만 4개 이내, 초점은 몸/군 생활에서', () => {
  const list = hobbyChoices(readHeart('헬스로 몸 만들기'), rules.hobbies.hobbies, () => 0);
  assert.deepEqual(list.map((h) => h.id).slice(0, 3).sort(), ['ballsports', 'running', 'weight']);
  assert.equal(list.length, 4);
  assert.equal(focusOf(readHeart('헬스')), 'fitness');
  assert.equal(focusOf(readHeart('분대장 해보고 싶다')), 'leadership');
  assert.equal(focusOf(readHeart('')), null);
});

test('heart: applyHeart — 연인 이야기를 쓰면 연인이 생기고, 초점이 잡힌다', async () => {
  const { newGame } = await import('../src/engine.js');
  const { applyHeart } = await import('../src/heart.js');
  for (let i = 0; i < 10; i++) {
    const S = newGame('h' + i, rules, { birth: '2006-05-01' });
    applyHeart(S, '여자친구 보고 싶다. 운동 열심히');
    assert.ok(S.bonds.lover != null);
    assert.equal(S.focus, 'fitness');
  }
});

test('반복 방지: 결정은 한 판에 max번(기본 1), 함정에선 막힌 취미·휴대폰 결정이 빠지고 문구가 바뀐다', async () => {
  const { newGame, autoEnlist, runGame, where } = await import('../src/engine.js');
  const { EVENTS } = await import('../content/events.js');
  const max = Object.fromEntries(EVENTS.filter((e) => e.kind === 'decision').map((e) => [e.id, e.max ?? 1]));
  for (let i = 0; i < 20; i++) {
    const S = newGame('rep' + i, rules, { birth: '2006-05-01' });
    autoEnlist(S, rules); runGame(S, rules, { events: EVENTS });
    const n = {};
    for (const c of S.choices || []) n[c.id] = (n[c.id] ?? 0) + 1;
    for (const [id, k] of Object.entries(n)) assert.ok(k <= max[id], `${id} ${k}회`);
  }
  const N = newGame('sea', rules, { birth: '2006-05-01', status: 'soldier', branch: 'navy' });
  autoEnlist(N, rules);
  N.env.post = 'shipSmall'; N.phase = 'serve';
  assert.equal(where(N), 'sea');
  const ids = hobbyChoices(null, rules.hobbies.hobbies, () => 0, 20, 'sea').map((h) => h.id);
  assert.ok(!ids.includes('ott') && !ids.includes('running') && ids.includes('reading'));
  assert.equal(EVENTS.find((e) => e.id === 'phone').c(N), false);
  assert.match(EVENTS.find((e) => e.id === 'bond_mother_birthday').build(N).body, /출항/);
});
