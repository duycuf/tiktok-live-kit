// Giọng đọc tiếng Việt qua dịch vụ đọc của Microsoft Edge (msedge-tts, miễn phí, cần mạng).
// Dịch vụ không chính thức: lỗi thì bỏ qua câu đó, live vẫn chạy. Hàng đợi có giới hạn để không đọc dồn.

import fs from 'node:fs';
import path from 'node:path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const VOICES = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'];
const escXml = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

export function createTTS({ dir, onReady, onError, maxQueue = 12, keepFiles = 40 }) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
  const queue = [];
  let busy = false;
  let seq = 0;

  function say(text, opts = {}) {
    const t = String(text || '').trim().slice(0, 400);
    if (!t) return false;
    if (queue.length >= maxQueue) { onError?.('Hàng đợi giọng đọc đầy, bỏ qua 1 câu'); return false; }
    queue.push({ text: t, opts });
    pump();
    return true;
  }

  async function synth(text, voice) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      // Dịch vụ hiện chỉ nhận tốc độ / cao độ mặc định (đổi là đóng kết nối, đã thử 11/2026), nên để nguyên mặc định.
      const { audioStream } = tts.toStream(escXml(text));
      const chunks = [];
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('quá thời gian')), 15000);
        audioStream.on('data', (c) => chunks.push(c));
        audioStream.on('end', () => { clearTimeout(timer); resolve(); });
        audioStream.on('error', (e) => { clearTimeout(timer); reject(e); });
      });
      if (!chunks.length) throw new Error('không nhận được âm thanh');
      return Buffer.concat(chunks);
    } finally { try { tts.close(); } catch {} }
  }

  // Dịch vụ chặn tạm khi gửi dồn: giãn cách giữa các câu, thử lại tối đa 2 lần, lỗi liên tiếp thì nghỉ một lúc
  let fails = 0;
  let pauseUntil = 0;
  async function pump() {
    if (busy || !queue.length) return;
    const wait = pauseUntil - Date.now();
    if (wait > 0) return void setTimeout(pump, wait);
    busy = true;
    const { text, opts } = queue.shift();
    const voice = VOICES.includes(opts.voice) ? opts.voice : VOICES[0];
    let audio = null, lastErr = null;
    for (let tryNo = 0; tryNo < 3 && !audio; tryNo++) {
      if (tryNo) await new Promise((r) => setTimeout(r, 1200 * tryNo));
      try { audio = await synth(text, voice); } catch (err) { lastErr = err; }
    }
    if (audio) {
      fails = 0;
      const file = `tts-${Date.now()}-${++seq}.mp3`;
      fs.writeFileSync(path.join(dir, file), audio);
      onReady?.({ file, text, ...opts.meta });
      const old = fs.readdirSync(dir).sort();
      while (old.length > keepFiles) { try { fs.unlinkSync(path.join(dir, old.shift())); } catch {} }
    } else {
      fails++;
      onError?.(`Giọng đọc lỗi: ${lastErr?.message || lastErr}`);
      if (fails >= 3) { pauseUntil = Date.now() + 15000; fails = 0; onError?.('Giọng đọc tạm nghỉ 15 giây'); }
    }
    busy = false;
    setTimeout(pump, 700);
  }

  return { say, get pending() { return queue.length; } };
}
