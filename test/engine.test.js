import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fill, createVoice, spokenName } from '../src/core/voice.js';
import '../public/sdk/geometry.js';

const G = globalThis.Kit.geometry;
const SCENE = {
  horizonY: 592,
  person: { refY: 870, refHeight: 48, exponent: 0.38 },
  floor: { top: 1075, bottom: 1640, left: 20, right: 1060 },
  aisle: { x: 540, half: [[835, 20], [1200, 50]], lane: 78 },
  obstacles: [{ x0: 0, x1: 105, y0: 0, y1: 1130 }],
  seats: [[480, 870], [613, 870]],
};

test('perspective: far people small, near people large, correct height at the reference line', () => {
  const s = G.normalize(SCENE);
  assert.equal(Math.round(G.personH(s, 870)), 48);
  assert.ok(G.personH(s, 1600) > G.personH(s, 1100));
  assert.ok(G.personH(s, 600) > 0, 'still has positive height near the horizon');
});

test('center aisle: interpolated by depth, never negative', () => {
  const s = G.normalize(SCENE);
  assert.equal(G.aisleHalf(s, 835), 20);
  assert.equal(G.aisleHalf(s, 1200), 50);
  assert.ok(G.aisleHalf(s, 500) >= 0);
});

test('standing slots: inside the floor area, avoid the aisle and obstacles, top rows first', () => {
  const s = G.normalize(SCENE);
  const slots = G.buildSlots(s, 1);
  assert.ok(slots.length > 150, `enough room for a crowd (${slots.length})`);
  for (const p of slots) {
    assert.ok(p.y >= s.floor.top && p.y <= s.floor.bottom);
    assert.ok(Math.abs(p.x - 540) > G.aisleHalf(s, p.y), 'not standing in the aisle');
    assert.ok(!(p.x < 105 && p.y < 1130), 'not overlapping the pillar base');
  }
  for (let i = 1; i < slots.length; i++) assert.ok(slots[i].y >= slots[i - 1].y);
});

test('auto spacing: sparse slots for a quiet room, dense when crowded', () => {
  const few = G.layoutFor(SCENE, 10), many = G.layoutFor(SCENE, 400);
  assert.ok(few.density > many.density);
  assert.ok(few.slots.length < many.slots.length);
  assert.ok(few.slots.length >= 10 * 1.15);
});

test('voice: fills templates, tidies punctuation, speakable names', () => {
  assert.equal(fill('Cảm ơn {ten} đã tặng {qua}{lan}!', { ten: 'An', qua: 'Rose', lan: '' }), 'Cảm ơn An đã tặng Rose!');
  assert.equal(fill('{a} . {b}', { a: 'x', b: '' }), 'x.');
  assert.equal(spokenName('oanh_luu.99'), 'oanh luu 99');
  assert.equal(spokenName('🔥🔥'), 'bạn');
});

test('voice: inserts what the person just chatted, respects the coin threshold, big gifts use their own template', () => {
  const v = createVoice();
  const cfg = { enabled: true, giftMinCoins: 5, gift: ['{ten} {hanh_dong}. {loi}'], bigGift: ['LỚN {ten}'], fallbackWords: ['Dự phòng'] };
  const user = { id: 'u1', name: 'Bảo Ngọc' };
  assert.equal(v.line(cfg, { kind: 'gift', user, total: 1, label: 'Dâng hương' }), '', 'silent below the threshold');
  assert.equal(v.line(cfg, { kind: 'gift', user, total: 5, label: 'Dâng hương' }), 'Bảo Ngọc dâng hương. Dự phòng');
  v.remember('u1', 'Con cầu gia đình bình an');
  assert.equal(v.line(cfg, { kind: 'gift', user, total: 5, label: 'Dâng hương' }), 'Bảo Ngọc dâng hương. Con cầu gia đình bình an');
  assert.equal(v.line(cfg, { kind: 'gift', user, total: 500, big: true }), 'LỚN Bảo Ngọc');
  assert.equal(v.line({ ...cfg, enabled: false }, { kind: 'gift', user, total: 5 }), '');
});

test('draws: one result per person per day, asking again sets the again flag, voice fills in the draw fields', async () => {
  const { createDraws } = await import('../src/core/draws.js');
  const d = createDraws();
  const draws = { xam: { items: Array.from({ length: 30 }, (_, i) => ({ so: i + 1, tho: ['a', 'b'] })) } };
  const day = new Date('2026-11-01T10:00:00');
  const first = d.pick(draws, 'xam', 'u1', day);
  const again = d.pick(draws, 'xam', 'u1', day);
  assert.equal(first.so, again.so);
  assert.equal(first.again, false);
  assert.equal(again.again, true);
  assert.equal(d.pick(draws, 'khong-co', 'u1', day), null);
  const v = createVoice();
  const line = v.line({ enabled: true, draw: ['{ten} được quẻ {so}: {tho}'] }, { kind: 'command', user: { id: 'u1', name: 'Lan' }, draw: first });
  assert.equal(line, `Lan được quẻ ${first.so}: a, b`);
});

test('chat read-out: drops profanity, links, emoji; game commands are not read twice; has a cooldown', async () => {
  const { readableChat } = await import('../src/core/voice.js');
  assert.equal(readableChat('Chúc cả nhà vui vẻ'), 'Chúc cả nhà vui vẻ');
  assert.equal(readableChat('đm vl'), '');
  assert.equal(readableChat('vào http://abc.com'), '');
  assert.equal(readableChat('😍😍😍'), '');
  const v = createVoice();
  const cfg = { enabled: true, chat: ['{ten} nhắn: {chat}.'], cooldown: { chat: 10000 } };
  assert.equal(v.line(cfg, { kind: 'chat', user: { id: 'a', name: 'Lan' }, text: 'Chúc cả nhà vui vẻ' }), 'Lan nhắn: Chúc cả nhà vui vẻ.');
  assert.equal(v.line(cfg, { kind: 'chat', user: { id: 'b', name: 'Hoa' }, text: 'Hay quá' }), '');
  assert.equal(v.line({ ...cfg, cooldown: {} }, { kind: 'chat', user: { id: 'c', name: 'Tú' }, text: 'xin xăm', command: 'xam' }), '');
});
