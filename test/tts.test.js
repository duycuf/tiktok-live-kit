import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTTS } from '../src/core/tts.js';

const tmpDir = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `tlk-tts-${name}-`));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Fake speech service: waits until released, to hold a line "in progress"
function fakeSynth() {
  const pending = [];
  const synthesize = (text) => new Promise((resolve) => pending.push(() => resolve(Buffer.from(text))));
  return { synthesize, release: () => pending.shift()?.(), get waiting() { return pending.length; } };
}

test('tts: minor lines still play when only background pre-synthesis is running', async () => {
  const fake = fakeSynth();
  const ready = [];
  const tts = createTTS({ dir: tmpDir('out'), cacheDir: tmpDir('cache'), synthesize: fake.synthesize, onReady: (r) => ready.push(r.text) });
  tts.warm(['câu đọc sẵn 1', 'câu đọc sẵn 2']);
  assert.equal(fake.waiting, 1); // pre-synthesizing line 1
  assert.equal(tts.say('Chào An!', { low: true }), true);
  fake.release(); // pre-synthesized line done: the main queue is processed before the warm-up queue
  await wait(400);
  fake.release();
  await wait(50);
  assert.deepEqual(ready, ['Chào An!']);
});

test('tts: minor lines are dropped while a real line is playing', async () => {
  const fake = fakeSynth();
  const tts = createTTS({ dir: tmpDir('out'), synthesize: fake.synthesize });
  assert.equal(tts.say('Cảm ơn An đã tặng hoa hồng', { priority: true }), true);
  assert.equal(tts.say('Chào Bình!', { low: true }), false);
  fake.release();
});
