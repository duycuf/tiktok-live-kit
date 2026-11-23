// Vietnamese text-to-speech via Microsoft Edge's read-aloud service (msedge-tts, free, needs internet).
// The service is unofficial and flaky: retry a few times; if the theme sets voice.fallback = "local", a hard failure
// falls back to Windows' built-in Vietnamese voice (Microsoft An, more robotic but works offline).
// Bounded queue; important lines (priority) jump to the front, minor lines (low) are dropped when backed up.
// Repeated lines (draw readings...) are cached in cacheDir: played instantly next time without waiting on the service. warm() pre-synthesizes in the background.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const VOICES = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'];
const escXml = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;
const PWSH = process.env.KIT_PWSH || 'pwsh';

export function createTTS({ dir, cacheDir, onReady, onError, maxQueue = 12, keepFiles = 40, synthesize }) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
  if (cacheDir) fs.mkdirSync(cacheDir, { recursive: true });
  const queue = [];
  const warmQ = []; // lines to pre-synthesize, processed only when idle
  let busy = false;
  let speaking = false; // working on a real line (background pre-synthesis doesn't count)
  let seq = 0;
  const cacheFile = (text, voice) => cacheDir && path.join(cacheDir, crypto.createHash('sha1').update(`${voice}|${text}`).digest('hex').slice(0, 20) + '.mp3');
  const pickVoice = (v) => (VOICES.includes(v) ? v : VOICES[0]);
  function publish(audio, ext, text, meta) {
    const file = `tts-${Date.now()}-${++seq}.${ext}`;
    fs.writeFileSync(path.join(dir, file), audio);
    onReady?.({ file, text, ...meta });
    const old = fs.readdirSync(dir).sort();
    while (old.length > keepFiles) { try { fs.unlinkSync(path.join(dir, old.shift())); } catch {} }
  }

  function say(text, opts = {}) {
    const t = String(text || '').trim().slice(0, 400);
    if (!t) return false;
    const cf = opts.cache && cacheFile(t, pickVoice(opts.voice));
    if (cf && fs.existsSync(cf)) { publish(fs.readFileSync(cf), 'mp3', t, opts.meta); return true; } // already pre-synthesized: play now
    if (opts.low && (speaking || queue.length)) return false; // minor lines (greetings, chat read-outs) don't cut in while lines are waiting; background pre-synthesis doesn't count
    if (queue.length >= maxQueue) { onError?.('Hàng đợi giọng đọc đầy, bỏ qua 1 câu'); return false; }
    if (opts.priority) { const i = queue.findIndex((q) => !q.opts.priority); queue.splice(i < 0 ? queue.length : i, 0, { text: t, opts }); }
    else queue.push({ text: t, opts });
    pump();
    return true;
  }

  async function synth(text, voice, timeoutMs) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      // The service currently only accepts the default rate / pitch (changing them closes the connection, tested 11/2026), so keep the defaults.
      const { audioStream } = tts.toStream(escXml(text));
      const chunks = [];
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('quá thời gian')), timeoutMs);
        audioStream.on('data', (c) => chunks.push(c));
        audioStream.on('end', () => { clearTimeout(timer); resolve(); });
        audioStream.on('error', (e) => { clearTimeout(timer); reject(e); });
      });
      if (!chunks.length) throw new Error('không nhận được âm thanh');
      return Buffer.concat(chunks);
    } finally { try { tts.close(); } catch {} }
  }

  // Vietnamese voice built into Windows (System.Speech), output to a WAV file
  function localSynth(text) {
    return new Promise((resolve, reject) => {
      const base = path.join(os.tmpdir(), `kit-tts-${process.pid}-${++seq}`);
      fs.writeFileSync(`${base}.txt`, text, 'utf8');
      const ps = [
        'Add-Type -AssemblyName System.Speech',
        '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
        "$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'vi-VN' } | Select-Object -First 1",
        'if (-not $v) { exit 3 }',
        '$s.SelectVoice($v.VoiceInfo.Name)',
        '$s.Rate = -1',
        `$s.SetOutputToWaveFile(${psQuote(`${base}.wav`)})`,
        `$s.Speak([IO.File]::ReadAllText(${psQuote(`${base}.txt`)}, [Text.Encoding]::UTF8))`,
        '$s.Dispose()',
      ].join('; ');
      // PowerShell 7 (pwsh) also sees OneCore voices such as Microsoft An; Windows PowerShell 5 only sees the old SAPI voices
      execFile(PWSH, ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 20000, windowsHide: true }, (err) => {
        try { fs.unlinkSync(`${base}.txt`); } catch {}
        if (err) return reject(err.code === 3 ? new Error('máy không có giọng tiếng Việt') : err);
        try { const buf = fs.readFileSync(`${base}.wav`); fs.unlinkSync(`${base}.wav`); resolve(buf); } catch (e) { reject(e); }
      });
    });
  }

  // The service temporarily blocks bursts: up to 3 attempts with increasing delay
  async function pump() {
    if (busy || (!queue.length && !warmQ.length)) return;
    busy = true;
    const { text, opts } = queue.length ? queue.shift() : warmQ.shift();
    speaking = !opts.warm;
    const voice = pickVoice(opts.voice);
    let audio = null, ext = 'mp3', lastErr = null;
    for (let tryNo = 0; tryNo < 3 && !audio; tryNo++) {
      if (tryNo) await new Promise((r) => setTimeout(r, 800 * tryNo));
      try { audio = await (synthesize || synth)(text, voice, 12000); } catch (err) { lastErr = err; }
    }
    if (!audio && opts.fallback === 'local' && process.platform === 'win32') {
      try { audio = await localSynth(text); ext = 'wav'; } catch (err) { lastErr = err; }
    }
    if (audio && opts.cache && ext === 'mp3') { try { fs.writeFileSync(cacheFile(text, voice), audio); } catch {} }
    if (audio && !opts.warm) publish(audio, ext, text, opts.meta);
    else if (!audio && !opts.warm) onError?.(`Giọng đọc lỗi: ${lastErr?.message || lastErr}`);
    busy = false;
    speaking = false;
    setTimeout(pump, opts.warm && !queue.length ? 1200 : 300); // space out pre-synthesis so the service doesn't block; if a real line is waiting, do it now
  }

  /** Pre-synthesize lines (not yet cached) in the background so they play instantly when needed. */
  function warm(texts, voice) {
    if (!cacheDir) return 0;
    const v = pickVoice(voice);
    let n = 0;
    for (const raw of texts) {
      const t = String(raw || '').trim().slice(0, 400);
      if (!t || fs.existsSync(cacheFile(t, v)) || warmQ.some((w) => w.text === t)) continue;
      warmQ.push({ text: t, opts: { voice: v, cache: true, warm: true } });
      n++;
    }
    pump();
    return n;
  }

  return { say, warm, get pending() { return queue.length; } };
}
