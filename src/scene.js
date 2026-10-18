// src/scene.js — 픽셀 장면 (128×72). 이번 달 사건 id → 장소, 없으면 근무지·주특기의 기본 장소.
// 이미지 에셋 없이 사각형만으로 그린다. 캔버스가 없는 node에서도 sceneOf는 돌아간다 (테스트).

export const W = 128, H = 72;

// 사건 id → 장소. 위에서부터 첫 일치. 순서가 의미 있다 (cook_field는 kitchen보다 hill이 먼저).
const BY_ID = [
  [/_px_/, 'px'],
  [/drive/, 'drive'],
  [/shell_loading|kaav|_k9_/, 'tank'],
  [/march/, 'march'],
  [/gop_fence|cold_guard/, 'fence'],
  [/coast_watch|nll|island_fog|false_target|acoustic|signal_island/, 'tod'],
  [/sail|voyage|ship_|ferry|unrep|narrow_channel|magazine|vertrep/, 'ship'],
  [/port_day|shore_power/, 'port'],
  [/gas/, 'gas'],
  [/hell_week|rescue_course|ibs|recon/, 'beach'],
  [/engineroom|boiler|power_grid/, 'engine'],
  [/jet|fod|scramble|fuel|fire_foam|cargo|tower/, 'airbase'],
  [/peak|radar_site|airdefense|shingung/, 'peak'],
  [/cook_field|eval_combat|eval_marksman|w3_rifle|w4_combat|zeroing|firing_data|mine|field_wire|demolition|breaching|drone|depot_myth|farm|_sf_/, 'hill'],
  [/cook/, 'kitchen'],
  [/sitroom|clerk|orderly|photo_general|video|content_security|ops_crew|depot|ammo|handover|duty_draft|savings/, 'office'],
  [/illness|sick_call|accident|medic|unfit|injury|knee/, 'medic'],
  [/chaplain|religion/, 'chapel'],
  [/leave|_out$|tourist|home|cherry|date|birthday|holiday/, 'town'],
  [/enter|w2_basic|graduate|eval_foot|eval_fitness|leadership|ceremony|squad_leader|snow|mower|tennis|band/, 'parade'],
  [/hobby_|letter|phone|lounge|rough|abuse|group_punish|barber|laundry|craving|night_watch|old_brother|young_one|age|cold|gomsin|gomusin|d100|easy|desert|family|grandpa/, 'room'],
];
const NIGHT = /night|watch|sitroom|lounge|nll|guard|scramble/;
// 연간 훈련(drill)은 훈련 종류로 — 경계 투입은 근무지 기본 장소 그대로
const DRILL = { guardIn: null, snow: 'parade', division: 'march', hwarang: 'march' };
const POST = { gop: 'fence', coast: 'tod', shipLarge: 'ship', shipSmall: 'ship', base: 'port', island: 'tod', wing: 'airbase', site: 'peak' };
const MOS = [
  [/^(121101|122101|131107)$|전차|KAAV|K9/, 'tank'],
  [/^(231107|50)$|조리|급양/, 'kitchen'],
  [/^(241101|241103)$|운전|수송/, 'drive'],
  [/^(311101|331101|341101|461101|471101|175262|55|38)$|행정|정보체계|보안체계|콘텐츠/, 'office'],
  [/^(411101|49)$|의무/, 'medic'],
];

// 휴가 출발(leave_go)은 고른 행동의 흔적 leave.scene으로, 그 밖의 휴가 사건은 id 규칙 leave_<장면>(_…)으로
const idScene = (S, id) => id === 'drill'
  ? (({ id: d } = {}) => (d in DRILL ? DRILL[d] : 'hill'))(S.env.drills.find((x) => x.ym === S.ym))
  : id === 'leave_go' ? (S.marks?.leave?.ym === S.ym ? S.marks.leave.scene : 'town')
  : /^treat/.test(id) ? 'diner'
  : LEAVE.has(/^leave_([a-z]+)/.exec(id)?.[1]) ? id.split('_')[1]
    : /committee/.test(id) ? 'committee' : BY_ID.find(([re]) => re.test(id))?.[1];

export function baseScene(S) {
  if (S.phase === 'pre' || S.phase === 'end') return 'town';
  if (S.phase === 'train') return 'parade';
  return POST[S.env?.post] ?? MOS.find(([re]) => re.test(S.mos ?? ''))?.[1] ?? 'base';
}

/** 지금 그릴 장면 {key, night}. pendingId: 열려 있는 결정. 그다음 이번 달에 일어난 사건, 없으면 기본 장소 */
export function sceneOf(S, pendingId) {
  const ids = [pendingId, ...(S.recent ?? []).filter((id) => S.flags['last_' + id] === S.ym).reverse()];
  for (const id of ids) {
    const key = id && idScene(S, id);
    if (key) return { key, night: DARK.has(key) || NIGHT.test(id) };
  }
  return { key: baseScene(S), night: false };
}

// ── 그리기 ──
let g, f, ss, night; // ctx, 프레임 번호, 계절, 밤
const R = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const SKY = { winter: '#9fb3c0', spring: '#a9cde0', summer: '#7fc0e8', autumn: '#c9b59a' };
const GROUND = { winter: '#eef1f2', spring: '#8fae5a', summer: '#5e8f3b', autumn: '#a5874f' };
const LEAF = { winter: '#dfe7ea', spring: '#f4b7c8', summer: '#4f8f3a', autumn: '#d07a2c' };
const FIELD = new Set(['hill', 'march', 'fence', 'gas']);
const INDOOR = new Set(['room', 'px', 'office', 'medic', 'chapel', 'committee', 'diner']);
const OUTDOOR = new Set(['base', 'parade', 'hill', 'march', 'fence', 'ship', 'port', 'tank', 'gas', 'beach', 'airbase', 'peak', 'town', 'drive', 'downtown', 'date', 'travel', 'brawl']);
const LEAVE = new Set(['downtown', 'home', 'pcroom', 'pub', 'karaoke', 'date', 'travel', 'brawl']); // 휴가: 사복 + 짧은 머리
const DARK = new Set(['tod', 'downtown', 'pcroom', 'pub', 'karaoke', 'brawl']); // 밤이 그림에 박힌 장면 — 밤 덧칠 없음

function sky() {
  R(night ? '#1b2440' : SKY[ss], 0, 0, W, H);
  if (!night) return;
  for (let i = 0; i < 14; i++) R(i % 5 ? '#c9d2ea' : '#fff', (i * 37) % W, (i * 13) % 26);
  R('#f3eecf', 104, 6, 5, 5); R('#1b2440', 106, 6, 3, 3); // 초승달
}
const ground = (y, c = GROUND[ss]) => R(c, 0, y, W, H - y);
function hills(y, amp, c, k = 0) {
  for (let x = 0; x < W; x++) R(c, x, y + Math.round(amp * (Math.sin(x / 11 + k) + 0.5 * Math.sin(x / 5 + k * 2))), 1, H);
}
function sea(y) {
  R(night ? '#13243a' : '#2f6f9e', 0, y, W, H - y);
  for (let x = -8; x < W; x += 8) R(night ? '#2c4a6a' : '#7fb6d8', x + (f % 8), y + 2 + ((x / 8) & 3) * 3, 3, 1);
}
function pine(x, base, h, c = ss === 'winter' ? '#cfdbd6' : '#2f5a32') {
  for (let i = 0; i < h; i++) R(c, x - (i >> 1), base - h + i, (i >> 1) * 2 + 1);
  R('#5a4030', x, base, 1, 2);
}
function tree(x, base) { R('#6b4a30', x, base - 8, 2, 8); R(LEAF[ss], x - 4, base - 15, 10, 8); R(LEAF[ss], x - 2, base - 17, 6, 2); }
const puff = (x, y, a = 0.7) => R(`rgba(240,240,220,${a})`, x, y, 4, 2);

// 사람: 10×24. x,y = 머리 왼쪽 위, 발은 y+24. o = outfit() 또는 npc(). o.civ = [상의, 하의] 사복
const SKIN = '#efc39a', SHADE = '#d6a57a', INK = '#2a211b';
function soldier(x, y, o) {
  const [U, U2] = o.civ ?? (o.navy ? ['#2b3a5a', '#3a4b70'] : ['#56653a', '#3f4b29']), U3 = o.navy ? '#22304c' : '#7a8455';
  const SK = o.drunk ? '#f2b08e' : SKIN;
  // 몸
  R(U, x + 1, y + 9, 8, 9); R(U, x, y + 10, 1, 7); R(U, x + 9, y + 10, 1, 7);
  if (!o.navy && !o.civ) for (const [dx, dy, c] of [[2, 10, U2], [6, 12, U3], [3, 14, U3], [7, 15, U2], [1, 16, U2], [5, 17, U2]]) R(c, x + dx, y + dy);
  else if (o.navy) R('#fff', x + 3, y + 9, 4, 1); // 세일러 칼라
  R(SK, x + 4, y + 9, 2, 1); // 목
  R(SK, x, y + 17); R(SK, x + 9, y + 17); // 손
  if (o.vest) { R('#e8742c', x + 1, y + 9, 8, 8); R('#c95e1f', x + 4, y + 10, 2, 7); }
  if (o.apron) R('#f4f4f0', x + 2, y + 11, 6, 9);
  if (o.pack) { R('#6b5638', x - 1, y + 7, 2, 4); R('#6b5638', x + 9, y + 7, 2, 4); R('#4a3b26', x + 2, y + 10, 1, 6); R('#4a3b26', x + 7, y + 10, 1, 6); }
  if (!o.civ) {
    R(o.marine ? '#c8322b' : '#e8e4d0', x + 1, y + 11, 3, 1); // 명찰 (해병 빨간 명찰)
    for (let i = 0; i <= o.rank; i++) R('#151515', x + 6, y + 11 + i * 2, 2, 1); // 계급장 (이병 1줄 ~ 병장 4줄)
  }
  // 다리·신발 (치마면 치마 + 맨다리)
  if (o.skirt) { R(U2, x + 1, y + 17, 8, 4); R(SK, x + 2, y + 21, 2, 2); R(SK, x + 6, y + 21, 2, 2); }
  else { R(U2, x + 2, y + 18, 2, 5); R(U2, x + 6, y + 18, 2, 5); }
  const SH = o.civ ? '#e8e8e8' : '#1a1a1a'; R(SH, x + 1, y + 23, 3, 1); R(SH, x + 6, y + 23, 3, 1);
  // 얼굴: 귀·눈썹·눈·코·입·볼
  R(SK, x + 1, y + 3, 8, 6); R(SK, x, y + 4, 1, 2); R(SK, x + 9, y + 4, 1, 2);
  R('#5a3d2a', x + 2, y + 4, 2, 1); R('#5a3d2a', x + 6, y + 4, 2, 1);
  if (o.drunk) { R(INK, x + 2, y + 5, 2, 1); R(INK, x + 6, y + 5, 2, 1); } else { R(INK, x + 3, y + 5); R(INK, x + 6, y + 5); } // 취하면 풀린 눈
  R(SHADE, x + 4, y + 6, 2, 1);
  const M = '#9a4436';
  if (o.mood >= 60) { R(M, x + 3, y + 7); R(M, x + 6, y + 7); R(M, x + 4, y + 8, 2, 1); R('#f2a0a0', x + 2, y + 7); R('#f2a0a0', x + 7, y + 7); }
  else if (o.mood < 35) { R(M, x + 4, y + 7, 2, 1); R(M, x + 3, y + 8); R(M, x + 6, y + 8); }
  else R(M, x + 4, y + 8, 2, 1);
  if (o.drunk) { R('#e0605a', x + 1, y + 6, 2, 2); R('#e0605a', x + 7, y + 6, 2, 2); R('#e0605a', x + 4, y + 6, 2, 1); }
  if (o.paint) { R('#34431f', x + 1, y + 6, 2, 1); R('#34431f', x + 7, y + 6, 2, 1); R('#1f2614', x + 2, y + 3, 6, 1); }
  // 모자
  const hat = {
    none: () => { R('#1e1a16', x + 2, y + 1, 6, 1); R('#1e1a16', x + 1, y + 2, 8, 1); },
    cap: () => { R(U, x + 1, y, 8, 2); R(U2, x, y + 2, 10, 1); },
    helmet: () => { R('#4b5730', x + 2, y, 6, 1); R('#4b5730', x + 1, y + 1, 8, 2); R('#3b4524', x, y + 3, 10, 1); R(INK, x + 1, y + 4, 1, 4); R(INK, x + 8, y + 4, 1, 4); },
    tank: () => { R('#3a3a2e', x + 1, y, 8, 3); R('#3a3a2e', x, y + 3, 10, 1); R('#111', x, y + 4, 1, 3); R('#111', x + 9, y + 4, 1, 3); },
    sailor: () => { R('#fafafa', x + 2, y, 6, 1); R('#fafafa', x + 1, y + 1, 8, 1); R('#e4e4e4', x, y + 2, 10, 1); },
    beret: () => { R('#1c1c1c', x + 1, y, 7, 1); R('#1c1c1c', x, y + 1, 9, 2); R('#d9b84a', x + 2, y + 1); },
    octa: () => { R(U, x, y, 10, 1); R(U, x + 1, y + 1, 8, 1); R(U2, x, y + 2, 10, 1); R('#d9b84a', x + 4, y + 1, 2, 1); },
    chef: () => { R('#fafafa', x + 1, y - 3, 8, 3); R('#ececec', x + 2, y, 6, 3); },
    hair: () => { R(o.hairC ?? '#2b2420', x + 1, y, 8, 2); R(o.hairC ?? '#2b2420', x, y + 1, 1, 3); R(o.hairC ?? '#2b2420', x + 9, y + 1, 1, 3); R(o.hairC ?? '#2b2420', x + 1, y + 2, 4, 1); },
    long: () => { const c = o.hairC ?? '#3a2418'; R(c, x + 1, y, 8, 3); R(c, x, y + 1, 1, 12); R(c, x + 9, y + 1, 1, 12); R(c, x + 1, y + 3, 1, 7); R(c, x + 8, y + 3, 1, 7); },
    perm: () => { const c = o.hairC ?? '#2e2420'; R(c, x, y, 10, 3); R(c, x - 1, y + 1, 1, 4); R(c, x + 10, y + 1, 1, 4); for (let i = 0; i < 5; i++) R('#463a32', x + i * 2, y + (i & 1)); },
    mask: () => { R('#3c3f3a', x, y + 1, 10, 8); R('#9fd0e0', x + 2, y + 4, 2, 2); R('#9fd0e0', x + 6, y + 4, 2, 2); R('#6b6e68', x + 4, y + 7, 2, 3); R('#2a2c28', x + 4, y + 9, 2, 1); },
  }[o.hat];
  hat();
  if (o.ear) { R(o.ear, x - 1, y + 3, 2, 4); R(o.ear, x + 9, y + 3, 2, 4); R('#333', x, y, 10, 1); } // 귀마개·헤드셋
  if (o.shades) R('#111', x + 2, y + 5, 6, 1);
  if (o.gun) for (let i = 0; i < 12; i++) R('#222', x - 1 + i, y + 19 - i);
  if (o.hold) R(o.hold, x + 3, y + 15, 4, 3);
}

/** 장면별 옷차림 */
export function outfit(S, key) {
  const dress = { navy: 'sailor', marine: 'octa' }[S.branch];
  const hat = { kitchen: 'chef', gas: 'mask', tank: 'tank', beach: 'none' }[key]
    ?? (FIELD.has(key) || (key === 'parade' && S.phase === 'train') ? 'helmet'
      : INDOOR.has(key) ? 'none' : key === 'town' ? dress ?? 'beret' : dress ?? 'cap');
  return {
    hat, rank: S.rank ?? 0, mood: S.st?.mind ?? 50, marine: S.branch === 'marine',
    navy: S.branch === 'navy' && !FIELD.has(key) && key !== 'tank',
    gun: FIELD.has(key) && key !== 'gas', pack: key === 'march', paint: key === 'hill',
    ear: { airbase: '#e8c234', pcroom: '#222' }[key], apron: key === 'kitchen', vest: key === 'beach',
    hold: { px: '#e2473c', karaoke: '#333', travel: '#222', pub: '#3d9a5a' }[key] ?? null,
    ...(LEAVE.has(key) && { hat: 'none', civ: ['#3b6ea8', '#2d3a4f'], drunk: key === 'pub' || key === 'brawl', shades: key === 'travel' }),
  };
}
// 주변 인물 (친구·여자친구·가족·취객). 기본은 짧은 머리 사복
const npc = (o) => ({ hat: 'hair', rank: 0, mood: 65, civ: ['#7a8a5a', '#3a3a4a'], ...o });
const FRIENDS = [npc({ civ: ['#c8503a', '#2d3a4f'] }), npc({ civ: ['#e8e2d0', '#4a4a52'], hairC: '#5a3a22' })];
const LOVER = npc({ hat: 'long', civ: ['#f4f0e6', '#d27a96'], skirt: true, mood: 80 });

const glyph = (rows, x, y, c) => rows.forEach((r, j) => [...r].forEach((b, i) => b === '1' && R(c, x + i, y + j)));

const SCENES = {
  base(me) { // 부대 막사
    sky(); hills(30, 4, night ? '#2a3348' : '#8aa39a'); ground(48);
    R('#cfc8b0', 66, 26, 54, 22); R('#6b5a45', 63, 22, 60, 4);
    for (let x = 70; x < 116; x += 9) R(night ? '#f0d878' : '#9cc3d8', x, 30, 5, 5);
    R('#5a4a38', 88, 38, 7, 10); R('#2e5a2e', 85, 35, 13, 2);
    R('#666', 20, 10, 1, 38); R('#fafafa', 21, 10, 9, 6); R('#c33', 24, 12, 2, 1); R('#336', 24, 13, 2, 1);
    me(40, 28);
  },
  parade(me) { // 연병장·사열대
    sky(); hills(28, 4, night ? '#2a3348' : '#86a08f'); ground(46, ss === 'winter' ? GROUND.winter : '#c2ab7f');
    R('#8a8f84', 84, 30, 36, 16); R('#5a3e2b', 80, 24, 44, 4); R('#e6e1d3', 86, 28, 2, 10); R('#e6e1d3', 116, 28, 2, 10); R('#a3392f', 90, 26, 24, 2);
    R('#666', 10, 6, 1, 40); R('#fafafa', 11, 6, 8, 5); R('#c33', 14, 7, 2, 1); R('#336', 14, 8, 2, 1);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) { const x = 18 + c * 8 + r * 2, y = 36 + r * 5; R('#4b5730', x, y, 3, 1); R(SKIN, x, y + 1, 3, 1); R('#56653a', x, y + 2, 3, 3); }
    me(54, 30);
  },
  room(me) { // 생활관
    R('#d8d1bb', 0, 0, W, 44); R('#9a7650', 0, 44, W, 28); for (const y of [50, 58, 66]) R('#86643f', 0, y, W, 1);
    R('#6b5a45', 6, 8, 28, 20); R(night ? '#1b2440' : SKY[ss], 8, 10, 24, 16); R('#6b5a45', 19, 10, 2, 16); R('#6b5a45', 8, 17, 24, 2);
    for (let i = 0; i < 5; i++) { R('#7d8a6b', 46 + i * 16, 6, 14, 26); R('#e8e4d0', 50 + i * 16, 10, 6, 2); R('#3f4b29', 57 + i * 16, 18, 1, 3); }
    R('#5b4a3a', 40, 36, 88, 8); for (let i = 0; i < 5; i++) R('#5b6d3e', 46 + i * 16, 32, 11, 4);
    R(night ? '#7a7a6a' : '#fafaf0', 50, 1, 40, 1);
    me(20, 32);
  },
  px(me) { // PX
    R('#f1ede2', 0, 0, W, 50); for (let x = 0; x < W; x += 8) for (let y = 50; y < H; y += 8) R((x + y) & 8 ? '#bcc5c8' : '#cfd6d8', x, y, 8, 8);
    R('#1f4f8a', 6, 3, 18, 9); glyph(['111', '101', '111', '100', '100'], 10, 5, '#fff'); glyph(['101', '101', '010', '101', '101'], 15, 5, '#fff');
    const C = ['#e2473c', '#f2c230', '#3c7be2', '#e8823a', '#52a35a', '#c94fb0', '#fafafa'];
    for (let k = 0; k < 4; k++) { R('#b9a27a', 38, 10 + k * 10, 52, 2); for (let i = 0; i < 12; i++) R(C[(i * 5 + k * 3) % C.length], 39 + i * 4, 5 + k * 10, 3, 5); }
    R('#dfe6ea', 96, 6, 28, 44); R('#a8d8ef', 98, 8, 24, 40);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) R(C[(i + r * 2) % C.length], 100 + i * 6, 11 + r * 9, 3, 6);
    R('#7a5a3e', 2, 40, 30, 12); R('#333', 6, 34, 10, 6); R('#6fd36f', 8, 35, 6, 2);
    me(54, 34);
  },
  hill(me) { // 야산 훈련
    sky(); hills(22, 5, night ? '#26304a' : '#7c9a7a'); hills(34, 4, night ? '#1f2a1f' : '#4e6e3a', 2); ground(50);
    for (const [x, h] of [[8, 16], [20, 12], [98, 14], [112, 18], [122, 10]]) pine(x, 50, h);
    R('#3f5a2a', 36, 47, 8, 3); R('#3f5a2a', 80, 46, 10, 4);
    me(56, 28);
  },
  march(me) { // 행군
    sky(); hills(24, 6, night ? '#26304a' : '#6e8478'); ground(46); R('#b5a07a', 0, 50, W, 10); R('#a08b66', 0, 54, W, 1);
    const o = { ...me.o, mood: 45 };
    for (let i = 0; i < 3; i++) soldier(8 + i * 28, 27 + ((f + i) & 1), o);
    me(92, 27 + (f & 1));
  },
  fence(me) { // 철책
    sky(); hills(24, 7, night ? '#26304a' : '#5f7564'); ground(48, ss === 'winter' ? GROUND.winter : '#a99a76');
    for (let x = 0; x < W; x += 4) { R('#c3c7be', x, 14 + ((x >> 2) & 1), 3, 1); R('#c3c7be', x + 1, 16 - ((x >> 2) & 1), 2, 1); }
    for (let x = 4; x < W; x += 12) R('#8b8f86', x, 17, 2, 31);
    for (let y = 20; y <= 44; y += 4) R('#a9ada4', 0, y, W, 1);
    for (let i = 0; i < 5; i++) R('#c33', 32 - i, 30 + i, 1 + 2 * i, 1); R('#fff', 32, 32, 1, 2);
    R('#6c6a55', 98, 30, 22, 18); R('#4a4a3a', 96, 27, 26, 3); R('#1a1a14', 102, 34, 14, 3);
    if (night) { g.fillStyle = 'rgba(255,250,200,.18)'; g.beginPath(); g.moveTo(102, 35); g.lineTo(40, 60); g.lineTo(70, 66); g.fill(); }
    me(54, 28);
  },
  tod(me) { // 해안 초소: TOD·감시 모니터
    R('#2b3030', 0, 0, W, H); R('#1a1d1d', 6, 6, 70, 34); R('#0f1a30', 8, 8, 66, 20); R('#0d2a40', 8, 28, 66, 10);
    R('#f3eecf', 60, 11, 4, 4); for (let i = 0; i < 4; i++) R('#cfc9a8', 58 + ((f + i) % 3), 30 + i * 2, 6 - i, 1);
    for (let x = 10; x < 72; x += 9) R('#24496a', x + (f % 3), 33 + ((x / 9) & 1) * 2, 3, 1);
    R('#454b4b', 0, 46, W, 26); R('#5d6464', 70, 40, 58, 4);
    R('#111', 92, 16, 30, 22); R('#2a2a2a', 94, 18, 26, 18); R('#585858', 94, 30, 26, 1);
    const bx = 100 + (f >> 2) % 12; R('#f4f4f4', bx, 27, 6, 3); R('#cfcfcf', bx + 2, 25, 2, 2); // 열상에 잡힌 배
    R('#6f6', 107, 18, 1, 18); R('#6f6', 94, 27, 26, 1); R('#111', 105, 38, 4, 2);
    R('#3c4a3a', 72, 18, 14, 8); R('#111', 68, 20, 4, 4); R('#c33', 84, 19, 1, 1);
    R('#222', 78, 26, 1, 14); for (let i = 0; i < 12; i++) { R('#222', 78 - (i >> 1), 28 + i); R('#222', 79 + (i >> 1), 28 + i); }
    me(42, 32);
    R('rgba(90,255,140,.06)', 0, 0, W, H);
  },
  ship(me) { // 함정 갑판
    sky(); sea(30);
    for (let x = 88; x < 126; x++) R(night ? '#26304a' : '#6a7d86', x, 30 - Math.round(4 * Math.sin(((x - 88) / 38) * Math.PI)), 1, 1 + Math.round(4 * Math.sin(((x - 88) / 38) * Math.PI)));
    R('#8c9599', 0, 54, W, 18); R('#7a8387', 0, 60, W, 1); R('#7a8387', 0, 66, W, 1);
    for (let x = 34; x < W; x += 10) R('#d8dcdc', x, 44, 1, 10); R('#d8dcdc', 30, 44, 98, 1); R('#d8dcdc', 30, 49, 98, 1);
    R('#a7afb2', 0, 14, 30, 40); R('#22323a', 3, 18, 24, 4); R('#8c9599', 14, 2, 2, 12);
    const rw = [12, 8, 2, 8][f & 3]; R('#555', 15 - rw / 2, 4, rw, 1);
    R('#e8742c', 100, 45, 6, 6); R('#2f6f9e', 102, 47, 2, 2); R('#fafafa', 102, 45, 2, 1); R('#fafafa', 102, 50, 2, 1);
    me(60, 30);
  },
  port(me) { // 항구·해군기지
    sky(); sea(40); R('#a8a59a', 0, 56, W, 16); R('#6f6d64', 0, 56, W, 2); R('#333', 20, 52, 4, 4);
    R('#7d878c', 60, 36, 68, 12); R('#9aa3a7', 80, 24, 30, 12); R('#22323a', 84, 27, 22, 3); R('#8c9599', 94, 12, 2, 12); R('#fafafa', 66, 39, 2, 4); R('#fafafa', 70, 39, 2, 4);
    R('#c7742c', 6, 8, 2, 48); R('#c7742c', 6, 8, 30, 2); R('#333', 30, 10, 1, 14);
    me(36, 32);
  },
  tank(me) { // 전차 해치
    sky(); hills(30, 5, night ? '#26304a' : '#7c9a7a'); ground(50, ss === 'winter' ? GROUND.winter : '#7a6a4a');
    me(68, 17);
    R('#55603a', 30, 40, 74, 9); R('#55603a', 26, 43, 4, 6); R('#2b2b26', 28, 48, 78, 7); for (let i = 0; i < 7; i++) R('#5a5a52', 33 + i * 10, 50, 5, 4);
    R('#4b5530', 52, 30, 34, 10); R('#3f4828', 8, 33, 44, 2); R('#333', 6, 32, 3, 4); R('#3f4828', 66, 29, 14, 2); R('#222', 84, 12, 1, 18);
  },
  gas(me) { // 화생방 가스실
    sky(); hills(28, 4, night ? '#26304a' : '#8aa39a'); ground(50);
    R('#a9aba3', 74, 22, 46, 28); R('#7d7f78', 72, 20, 50, 3); R('#5b5d57', 90, 34, 10, 16); R('#e8c234', 88, 26, 14, 4); R('#222', 93, 27, 4, 2);
    for (let i = 0; i < 9; i++) puff(80 + ((i * 17 + f) % 40) - 10, 30 + ((i * 7) % 20) - ((f + i * 3) % 8), 0.55);
    for (let i = 0; i < 4; i++) puff(32 + i * 6, 22 + ((f + i * 2) % 10), 0.35);
    me(40, 28);
  },
  beach(me) { // 해안 훈련 (UDT·IBS)
    sky(); sea(26); for (let x = 0; x < W; x += 2) R('#eef4f4', x, 46 + (((x + f * 2) >> 3) & 1), 2, 1);
    R('#dcc79a', 0, 48, W, 24); R('#c7b07f', 0, 48, W, 3);
    R('#222', 70, 48, 44, 6); R('#222', 68, 49, 2, 4); R('#222', 114, 49, 2, 4); R('#3a3a3a', 70, 48, 44, 1); R('#8a6b44', 78, 44, 1, 8); R('#8a6b44', 100, 44, 1, 8);
    me(40, 30);
  },
  engine(me) { // 기관실·보일러실
    R('#4a4f50', 0, 0, W, 52); R('#3a3d3e', 0, 52, W, 20); for (let x = 0; x < W; x += 4) R('#2e3132', x, 54, 1, 18);
    for (let x = 0; x < W; x += 8) { R('#e8c234', x, 52, 4, 2); R('#222', x + 4, 52, 4, 2); }
    R('#b07a4a', 0, 10, W, 4); R('#8f9a9c', 0, 20, W, 3); R('#8f9a9c', 30, 0, 3, 52); R('#b07a4a', 100, 0, 4, 52); R('#666', 29, 18, 5, 1); R('#666', 99, 9, 6, 1);
    for (const gx of [58, 70]) { R('#eee', gx, 28, 5, 5); R('#c33', gx + 2, 29 + ((f + gx) % 3), 1, 2); }
    R('#6b7577', 40, 36, 50, 16); R('#58625f', 42, 38, 46, 2); R('#58625f', 42, 42, 46, 2); R(f & 2 ? '#f33' : '#622', 86, 32, 3, 3);
    R('#c33', 110, 30, 7, 1); R('#c33', 113, 27, 1, 7);
    me(12, 30);
  },
  airbase(me) { // 비행단 활주로
    sky(); hills(32, 2, night ? '#26304a' : '#8aa39a'); ground(38); R('#5e6266', 0, 50, W, 12); R('#eee', 0, 50, W, 1);
    for (let x = 0; x < W; x += 14) R('#eee', x, 55, 6, 1);
    for (let x = 4; x <= 40; x++) { const h = Math.round(Math.sqrt(1 - ((x - 22) / 18) ** 2) * 14); R('#9aa1a3', x, 44 - h, 1, h); }
    R('#6b7275', 14, 36, 16, 8);
    R('#c9c4b8', 108, 16, 6, 34); R('#3b4b55', 104, 11, 14, 5); R('#666', 103, 10, 16, 1);
    const jx = 48 + (f % 4 ? 0 : 1), J = '#8d969b';
    R(J, jx + 8, 44, 40, 4); R(J, jx + 4, 45, 4, 2); R('#666', jx + 2, 46, 2, 1); R('#2a3a4a', jx + 12, 42, 8, 2); R('#7b8489', jx + 22, 47, 16, 2);
    for (let i = 0; i < 8; i++) R(J, jx + 44 - (i >> 1), 36 + i, 3 + (i >> 1), 1);
    R(f & 1 ? '#f2a03a' : '#f7d27a', jx + 48, 45, 2 + (f & 1), 2);
    me(16, 34);
  },
  peak(me) { // 산악 레이더 사이트
    sky();
    for (let x = 0; x < W; x++) { const top = 20 + Math.round(Math.abs(x - 64) * 0.45 + Math.sin(x / 3)); R(night ? '#1f2a1f' : '#5e7151', x, top, 1, H); if (ss === 'winter' && top < 30) R('#eef1f2', x, top, 1, 3); }
    for (let dy = -7; dy <= 0; dy++) { const w = Math.round(Math.sqrt(49 - dy * dy)); R('#f2f2ee', 64 - w, 14 + dy, 2 * w, 1); }
    R('#bbb', 58, 14, 12, 6); R('#999', 82, 4, 1, 22); for (let y = 6; y < 26; y += 5) R('#999', 80, y, 5, 1);
    const cx = (f >> 1) % W;
    for (const [x, y, w] of [[0, 52, 40], [84, 56, 44], [40, 62, 36]]) { R('#f4f6f7', (x + cx) % (W + 40) - 40, y, w, 4); R('#e4e8ea', (x + cx) % (W + 40) - 36, y + 4, w - 8, 2); }
    me(40, 6);
  },
  kitchen(me) { // 취사장
    R('#e9f0f2', 0, 0, W, 50); for (let x = 0; x < W; x += 6) R('#cdd8dc', x, 0, 1, 50); for (let y = 0; y < 50; y += 6) R('#cdd8dc', 0, y, W, 1);
    R('#6f8f7c', 0, 50, W, 22);
    R('#b9bfc2', 80, 30, 36, 20); R('#8a9093', 78, 28, 40, 3); R('#444', 82, 50, 32, 4);
    for (let i = 0; i < 4; i++) puff(86 + i * 7, 22 - ((f + i * 2) % 8) * 2, 0.8);
    R('#c7ced1', 0, 38, 34, 4); R('#9aa1a4', 2, 42, 2, 10); R('#9aa1a4', 30, 42, 2, 10);
    R('#e2c070', 4, 35, 8, 3); R('#7da34a', 14, 35, 8, 3); R('#c4472e', 24, 35, 8, 3);
    R('#888', 62, 8, 1, 8); R('#888', 60, 16, 4, 2);
    me(46, 28);
  },
  office(me) { // 행정반·상황실
    R('#d9dccf', 0, 0, W, 52); R('#8a8f80', 0, 52, W, 20);
    R('#6b5a45', 6, 4, 44, 28); R('#9fbf86', 8, 6, 18, 24); R('#7fa8c8', 26, 6, 22, 24); R('#c33', 14, 12, 2, 2); R('#c33', 20, 20, 2, 2); R('#c33', 30, 14, 2, 2);
    R('#fafafa', 60, 6, 7, 7); R('#222', 63, 7, 1, 3); R('#222', 63, 9, 2, 1);
    R('#7a5c3c', 40, 40, 84, 4); R('#5e4630', 44, 44, 3, 8); R('#5e4630', 116, 44, 3, 8);
    R('#222', 76, 26, 20, 14); R(night ? '#5a8fe6' : '#4a7fd6', 78, 28, 16, 10); for (let i = 0; i < 3; i++) R('#cde', 80, 30 + i * 3, 6 + ((i * 5 + f) % 7), 1);
    R('#333', 104, 37, 8, 3); R('#fafafa', 52, 38, 12, 2);
    me(22, 28);
  },
  medic(me) { // 의무실
    R('#eef2f0', 0, 0, W, 52); R('#bfc9c4', 0, 52, W, 20);
    R('#fafafa', 6, 6, 14, 14); R('#d33', 11, 8, 4, 10); R('#d33', 8, 11, 10, 4);
    R('#bcd8d0', 40, 0, 14, 50); for (let y = 0; y < 50; y += 6) R('#a8c8be', 40, y, 14, 1);
    R('#9aa', 62, 40, 58, 3); R('#9aa', 64, 43, 2, 9); R('#9aa', 116, 43, 2, 9); R('#fafafa', 62, 34, 58, 6); R('#e8eef0', 64, 32, 12, 3); R('#a8c4d8', 78, 34, 42, 6);
    R('#999', 122, 10, 1, 42); R('#cfe8f2', 119, 10, 7, 9);
    me(22, 28);
  },
  chapel(me) { // 종교 행사
    R('#e8dcc4', 0, 0, W, 52); R('#8a6643', 0, 52, W, 20);
    R('#6b5a45', 52, 4, 24, 32); R('#e2a63c', 56, 6, 16, 2); R('#e2a63c', 54, 8, 10, 12); R('#4f86c6', 64, 8, 10, 12); R('#c84f4f', 54, 20, 10, 14); R('#5aa36a', 64, 20, 10, 14);
    R('rgba(255,230,160,.25)', 46, 36, 36, 16);
    for (let r = 0; r < 2; r++) { R('#6e4f33', 6, 46 + r * 10, 40, 3); R('#6e4f33', 82, 46 + r * 10, 40, 3); }
    R('#f5e7b0', 30, 36, 1, 4); R(f & 1 ? '#f2a03a' : '#f7c24a', 30, 35); R('#f5e7b0', 98, 36, 1, 4); R(f & 1 ? '#f7c24a' : '#f2a03a', 98, 35);
    me(59, 30);
  },
  town(me) { // 외출·휴가
    sky();
    for (const [x, w, h, c] of [[0, 14, 30, '#8c8f9a'], [14, 18, 20, '#a3a08f'], [32, 12, 36, '#7d8796'], [80, 16, 26, '#9a8f86'], [96, 14, 38, '#808a94'], [110, 18, 24, '#a29c8c']]) {
      R(c, x, 52 - h, w, h);
      for (let wy = 52 - h + 3; wy < 48; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) R(night ? ((wx + wy) % 3 ? '#f0d878' : '#4a4a40') : '#c8dce6', wx, wy, 2, 2);
    }
    tree(52, 52); tree(72, 52);
    R('#c9c4b8', 0, 52, W, 6); R('#555a5e', 0, 58, W, 14); for (let x = 0; x < W; x += 14) R('#eee', x, 64, 6, 1);
    R('#888', 100, 36, 1, 16); R('#2a6fd1', 97, 32, 7, 5);
    me(58, 30);
  },
  drive(me) { // 군용 트럭 운전
    sky(); hills(28, 5, night ? '#26304a' : '#7c9a7a'); ground(46); R('#5f6265', 0, 52, W, 12);
    for (let x = 0; x < W + 16; x += 16) R('#eee', x - ((f * 3) % 16), 58, 8, 1);
    R('#5a6640', 10, 28, 56, 18); R('#4a5434', 10, 28, 56, 2); for (let x = 18; x < 66; x += 12) R('#4a5434', x, 30, 1, 16);
    g.save(); g.beginPath(); g.rect(66, 31, 22, 17); g.clip(); me(73, 31); g.restore();
    R('#55603a', 66, 31, 22, 3); R('#55603a', 66, 34, 5, 7); R('#55603a', 85, 34, 3, 7); R('#55603a', 66, 41, 22, 7); R('rgba(160,200,220,.15)', 71, 34, 14, 7);
    R('#55603a', 88, 38, 10, 10); R('#f2e4a0', 96, 40, 2, 2); R('#333', 10, 46, 90, 2);
    for (const wx of [16, 48, 78]) { R('#222', wx, 45, 9, 9); R('#777', wx + 3, 48, 3, 3); }
  },

  // ── 휴가 ──
  downtown(me) { // 번화가 (친구와)
    street();
    soldier(38, 31, FRIENDS[0]); soldier(70, 31, FRIENDS[1]); me(54, 30);
  },
  home(me) { // 집: 엄마 밥상
    R('#efe3cf', 0, 0, W, 50); R('#c79a64', 0, 50, W, 22); for (const y of [56, 63]) R('#b4884f', 0, y, W, 1);
    R('#7a5a3e', 8, 8, 14, 11); R('#e8d0a0', 10, 10, 10, 7); R('#56653a', 13, 12, 4, 5); R(SKIN, 14, 11, 2, 2); // 입대 사진
    R('#6b5a45', 30, 6, 30, 20); R(night ? '#1b2440' : SKY[ss], 32, 8, 26, 16); R('#e6b8a0', 30, 6, 6, 22); R('#e6b8a0', 54, 6, 6, 22);
    R('#222', 86, 16, 32, 20); R(f & 2 ? '#5a8fd6' : '#6aa0e0', 88, 18, 28, 16); R('#f2c230', 92, 26, 6, 6); R('#fafafa', 102, 22, 10, 2); R('#7a5a3e', 84, 36, 36, 8);
    soldier(56, 26, npc({ hat: 'perm', civ: ['#d97a8a', '#5a4a6a'], apron: true, mood: 85 })); me(36, 26);
    R('#a8743f', 26, 46, 52, 3); R('#8a5a32', 28, 49, 48, 2); R('#8a5a32', 30, 51, 3, 6); R('#8a5a32', 71, 51, 3, 6);
    R('#fafafa', 30, 43, 5, 3); R('#c96a3a', 37, 43, 6, 3); R('#d24a2a', 45, 44, 5, 2); R('#7aa04a', 52, 44, 5, 2); R('#8a4a2a', 59, 43, 8, 3); R('#f2d05a', 69, 44, 5, 2);
    for (let i = 0; i < 2; i++) puff(37 + i * 3, 38 - ((f + i * 3) % 6), 0.6);
  },
  pcroom(me) { // PC방 (게임)
    R('#1c1e2a', 0, 0, W, 50); R('#2a2a33', 0, 50, W, 22);
    R('#141420', 4, 3, 16, 9); glyph(['111', '101', '111', '100', '100'], 7, 5, '#4fe0ff'); glyph(['111', '100', '100', '100', '111'], 12, 5, '#4fe0ff');
    const SCR = ['#3a8a4a', '#8a3a6a', '#3a5a9a', '#9a7a2a'];
    for (let i = 0; i < 5; i++) { const x = 26 + i * 20; R('#111', x, 14, 16, 11); R(SCR[(i + (f >> 2)) % 4], x + 1, 15, 14, 9); R('#d33', x + 3 + ((f + i) % 8), 18, 2, 2); R('#4fe0ff', x + 9, 20 - ((f + i) % 3), 2, 2); }
    R('#3a3a48', 0, 25, W, 3);
    me(34, 28); soldier(84, 28, { ...FRIENDS[0], ear: '#222' });
    R('#4a4a58', 0, 44, W, 3); R('#3a3a48', 0, 47, W, 4);
    for (const x of [48, 98]) { R('#4a4a5e', x, 31, 18, 13); R('#5a5a70', x, 31, 18, 1); R('#4fe0ff', x + 8, 37, 2, 1); R('rgba(90,160,255,.18)', x - 16, 28, 16, 16); }
    R('#e8d8b0', 20, 39, 6, 5); R('#c33', 20, 40, 6, 1); puff(21, 34 - (f % 4), 0.5); // 컵라면
    R('#5a5a68', 30, 43, 14, 1); R('#5a5a68', 80, 43, 14, 1);
  },
  pub(me) { // 포장마차 (술)
    sky(); street(false);
    R('rgba(230,120,60,.45)', 8, 14, 112, 44); R('rgba(255,200,120,.15)', 8, 14, 112, 44);
    for (let x = 6; x < 122; x += 8) { R('#d9572c', x, 8, 4, 7); R('#f08a3a', x + 4, 8, 4, 7); }
    R('#ffe9a0', 63, 16, 3, 3); R('rgba(255,233,160,.25)', 55, 14, 19, 10);
    soldier(22, 23, { ...FRIENDS[0], drunk: true, mood: 80 }); me(46, 23); soldier(80, 23, { ...FRIENDS[1], drunk: true, mood: 70, hold: '#3d9a5a' });
    R('#e46a2a', 16, 45, 90, 3); R('#c4551f', 22, 48, 2, 12); R('#c4551f', 98, 48, 2, 12);
    for (let i = 0; i < 4; i++) { R('#3d9a5a', 36 + i * 6, 38, 3, 7); R('#2e7a46', 37 + i * 6, 37); }
    R('#e8f0f0', 62, 42, 2, 3); R('#e8f0f0', 66, 42, 2, 3); R('#fafafa', 72, 42, 14, 3); R('#c8502a', 74, 41, 10, 2);
    for (const x of [24, 54, 86]) R('#3a7ad1', x, 60, 8, 3);
  },
  karaoke(me) { // 노래방 (친구와)
    R('#2a1c3a', 0, 0, W, 52); R('#3a2a4a', 0, 52, W, 20);
    const L = ['#ff4fa0', '#4fe0ff', '#ffd24f', '#8aff6a'];
    for (let i = 0; i < 16; i++) R(L[(i + f) % 4], (i * 29 + f * 3) % W, (i * 17) % 44, 2, 2);
    R('#111', 34, 4, 60, 26); R('#1d3b7a', 36, 6, 56, 22); R('#fafafa', 42, 20, 32, 1); R('#ffd24f', 42, 20, (f * 2) % 33, 1); R('#fafafa', 46, 24, 24, 1);
    R('#7a2a4a', 0, 40, W, 10); R('#5a1f38', 0, 40, W, 2);
    soldier(18, 27, { ...FRIENDS[0], hold: '#f2c230', mood: 85 }); soldier(98, 27, { ...FRIENDS[1], mood: 85 }); me(58, 26 + (f & 1));
    R('#3a3a3a', 61, 37 + (f & 1), 1, 4); R('#999', 60, 36 + (f & 1), 3, 2); // 마이크
  },
  date(me) { // 여자친구와 강변
    for (const [y, c] of [[0, '#f6c27a'], [9, '#f4a26a'], [18, '#e8806a'], [27, '#c86a7a']]) R(c, 0, y, W, 9);
    R('#ffe08a', 92, 28, 10, 6); R('#4a3a5a', 0, 31, W, 2); for (let x = 4; x < W; x += 16) R('#4a3a5a', x, 31, 2, 6);
    R('#5a6a9a', 0, 36, W, 12); for (let x = 0; x < W; x += 9) R('#f4c28a', x + (f % 9), 38 + ((x / 9) & 3) * 2, 3, 1);
    ground(48); tree(16, 50);
    R('#8a5a32', 86, 48, 30, 2); R('#8a5a32', 88, 50, 2, 6); R('#8a5a32', 112, 50, 2, 6);
    me(50, 27); soldier(60, 27, LOVER);
    glyph(['01010', '11111', '11111', '01110', '00100'], 57, 17 - (f & 1), '#ff5a7a');
  },
  travel(me) { // 여행: 바닷가
    sky(); sea(36); R('#e6d2a0', 0, 50, W, 22); R('#d4bd88', 0, 50, W, 2);
    R('#7a7570', 96, 34, 28, 6); R('#fafafa', 106, 12, 8, 24); R('#d33', 106, 16, 8, 3); R('#d33', 106, 26, 8, 3); R('#333', 105, 8, 10, 4); R(f & 1 ? '#ffe98a' : '#fafafa', 108, 9, 4, 2);
    for (let i = 0; i < 3; i++) { const x = (i * 31 + f * 2) % W, y = 8 + i * 6; R('#fafafa', x, y); R('#fafafa', x + 1, y + 1); R('#fafafa', x + 2, y); }
    me(52, 28);
    R('#3a7ad1', 66, 42, 8, 10); R('#2a5aa1', 66, 46, 8, 1); R('#222', 69, 39, 1, 3); R('#222', 69, 39, 3, 1); R('#222', 67, 52, 2, 1); R('#222', 72, 52, 2, 1);
  },
  brawl(me) { // 번화가 취객 시비
    street();
    const sx = 26 + (f & 1);
    soldier(sx, 29, npc({ civ: ['#9a8a6a', '#3a3a3a'], hairC: '#4a4a4a', drunk: true, mood: 10, hold: '#3d9a5a' }));
    R('#fafafa', sx - 4, 15, 18, 9); R('#fafafa', sx + 4, 24, 2, 2);
    glyph(['01010', '11111', '01010', '11111', '01010'], sx - 2, 17, '#d33'); glyph(['1', '1', '1', '0', '1'], sx + 5, 17, '#222'); glyph(['111', '001', '010', '000', '010'], sx + 8, 17, '#222');
    me(50, 29); soldier(64, 30, { ...FRIENDS[0], mood: 30 });
    R('#9ad0a0', 40, 55); R('#9ad0a0', 43, 56); R('#9ad0a0', 38, 57);
    R('#f4f4f4', 90, 44, 36, 8); R('#1a3a7a', 90, 48, 36, 2); R('#f4f4f4', 98, 38, 22, 6); R('#2a3a4a', 100, 39, 18, 4);
    R(f & 1 ? '#f33' : '#33f', 103, 36, 7, 2); R(f & 1 ? '#33f' : '#f33', 110, 36, 7, 2); R('#222', 94, 51, 7, 4); R('#222', 114, 51, 7, 4);
    R(f & 1 ? 'rgba(255,50,50,.12)' : 'rgba(50,80,255,.12)', 0, 0, W, H);
  },
  diner(me) { // 부대 앞 식당: 누군가 대신 계산하고 갔다
    R('#f2e2c4', 0, 0, W, 50); R('#a8743f', 0, 50, W, 22); for (const y of [56, 63]) R('#93622f', 0, y, W, 1);
    R('#3a2e24', 8, 6, 44, 18); for (let i = 0; i < 4; i++) { R('#fafafa', 12, 9 + i * 4, 22, 1); R('#f2c230', 40, 9 + i * 4, 8, 1); } // 차림표
    R('#6b5a45', 100, 10, 20, 40); R('#cfe2ea', 102, 12, 16, 26); R('#2a2a2a', 108 + (f % 6), 22, 3, 14); R('#2a2a2a', 108 + (f % 6), 19, 3, 3); // 문 밖으로 사라지는 사람
    R('#e8d0a0', 60, 6, 30, 3); R('#c33', 70, 9, 10, 4); // 가게 간판·등
    me(40, 26);
    R('#c8935a', 24, 44, 52, 3); R('#a8743f', 28, 47, 3, 10); R('#a8743f', 69, 47, 3, 10);
    R('#3a3a3a', 40, 40, 10, 4); R('#e8c49a', 41, 40, 8, 2); puff(42, 34 - (f % 5), 0.7); // 국밥
    R('#fafafa', 56, 41, 9, 6); R('#ccc', 57, 42, 7, 1); glyph(['01010', '11111', '01110', '00100'], 58, 43, '#ff5a7a'); // 영수증 뒤 메모
  },
  committee(me) { // 징계위원회
    R('#d9dccf', 0, 0, W, 54); R('#7a7f70', 0, 54, W, 18);
    R('#666', 10, 6, 1, 46); R('#fafafa', 11, 6, 12, 8); R('#c33', 15, 8, 4, 2); R('#336', 15, 10, 4, 2);
    R('#666', 117, 6, 1, 46); R('#2e5a2e', 106, 6, 11, 8); R('#d9b84a', 110, 9, 3, 2);
    R('#2e5a2e', 36, 2, 56, 6); R('#fafafa', 40, 4, 48, 2);
    for (const x of [36, 59, 82]) soldier(x, 13, npc({ hat: 'cap', civ: null, rank: 3, mood: 40 }));
    R('#2e5a3a', 26, 30, 76, 14); R('#244a2e', 26, 30, 76, 1);
    for (const x of [37, 60, 83]) { R('#fafafa', x, 31, 8, 3); R('#222', x + 1, 32, 6, 1); }
    me(59, 44);
  },
};
// 번화가 밤거리 (downtown·brawl·pub 배경). crowd=false면 행인 없이
function street(crowd = true) {
  sky();
  for (const [x, w, h, c] of [[0, 18, 34, '#2a2d3a'], [18, 22, 44, '#33304a'], [40, 16, 30, '#2b3a44'], [78, 20, 40, '#352a3a'], [98, 14, 28, '#2a3340'], [112, 16, 46, '#30304a']]) {
    R(c, x, 52 - h, w, h);
    for (let wy = 52 - h + 4; wy < 46; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) R((wx * 7 + wy) % 5 ? '#f0d878' : '#3a3a40', wx, wy, 2, 2);
  }
  const N = ['#ff4fa0', '#4fe0ff', '#ffd24f', '#8aff6a'];
  for (const [x, y, w, k] of [[20, 14, 18, 0], [80, 16, 16, 1], [2, 22, 14, 2], [114, 10, 12, 3], [42, 26, 12, 1]]) R((f + k) % 7 ? N[k] : '#555', x, y, w, 3);
  R('#ff4fa0', 32, 20, 4, 18); for (let i = 0; i < 4; i++) R('#7a1f50', 32, 22 + i * 4, 4, 1);
  R('#55545e', 0, 52, W, 4); R('#3a3a44', 0, 56, W, 16);
  R('rgba(255,79,160,.25)', 18, 60, 16, 2); R('rgba(79,224,255,.2)', 80, 62, 14, 2);
  if (crowd) for (let i = 0; i < 7; i++) { const x = (i * 19 + 4) % W; R('#16161e', x, 44, 3, 8); R('#16161e', x, 42, 3, 2); }
}

/** 장면 그리기. g2: 128×72 캔버스 2d 컨텍스트, frame: 애니메이션용 프레임 번호 */
export function drawScene(g2, S, pendingId, frame = 0) {
  g = g2; f = frame;
  const m = +S.ym.slice(5); ss = m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
  const sc = sceneOf(S, pendingId); night = sc.night;
  const o = outfit(S, sc.key), me = (x, y) => soldier(x, y, o);
  me.o = o;
  SCENES[sc.key](me);
  if (ss === 'winter' && OUTDOOR.has(sc.key)) for (let i = 0; i < 24; i++) R('#fff', (i * 37 + f) % W, (i * 23 + f * 2) % H);
  if (night && !DARK.has(sc.key)) R('rgba(12,18,44,.4)', 0, 0, W, H);
  return sc.key;
}

/** 신원 카드 얼굴 (16×16) */
export function drawAvatar(g2, S) {
  g = g2; g.clearRect(0, 0, 16, 16);
  soldier(3, 2, outfit(S, 'base'));
}

export const SCENE_KEYS = Object.keys(SCENES);
