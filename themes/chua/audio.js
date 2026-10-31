// Âm thanh chùa, tổng hợp bằng Web Audio (tự tạo nên không vướng bản quyền).
//
// Mọi tiếng đi qua MỘT bộ điều phối để live đông vẫn êm:
//  - mỗi loại tiếng có thời gian nghỉ riêng (chuông lớn 20s, chuông nhỏ 3s...), gọi dồn thì bỏ bớt
//  - tối đa vài tiếng trong một khoảng ngắn, tiếng phụ (mõ, chuông gió) nhường tiếng chính
//  - tiếng rơi đúng nhịp (lưới 350ms) nên không lộn xộn
//  - cùng một giọng Rê ngũ cung, chồng lên nhau vẫn hoà
//  - có nén tiếng tổng, nhạc nền tự nhỏ lại khi chuông kêu
// Nhạc nền / tiếng tụng: thả mp3 thật vào themes/chua/assets/music và chọn nguồn "File" (code không tự tạo giai điệu).

const ChuaAudio = (() => {
  let ctx = null, sfxBus = null, musicBus = null, duck = null;
  const st = { music: 'off', musicVol: 0.3, sfxVol: 0.45, chanting: false };

  // ---------- Dựng chuỗi âm thanh ----------
  function init() {
    if (ctx) return ctx;
    ctx = Live.audio();
    if (!ctx) return null;
    const comp = ctx.createDynamicsCompressor(); // nén nhẹ, chặn tiếng chói đột ngột
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.4;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200; // bỏ dải cao gắt
    comp.connect(tone); tone.connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = impulse(2.2, 3.2);
    const wet = ctx.createGain(); wet.gain.value = 0.18;
    verb.connect(wet); wet.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.connect(comp); sfxBus.connect(verb);
    duck = ctx.createGain();
    musicBus = ctx.createGain(); musicBus.connect(duck); duck.connect(comp); duck.connect(verb);
    apply();
    return ctx;
  }

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function apply() {
    if (!ctx) return;
    sfxBus.gain.setTargetAtTime(st.sfxVol, ctx.currentTime, 0.2);
    musicBus.gain.setTargetAtTime(st.music === 'off' ? 0 : st.musicVol, ctx.currentTime, 0.8);
    if (fileAudio) fileAudio.volume = 1;
  }

  // Nhạc nền nhỏ lại một chút khi có chuông, rồi lên lại từ từ
  function duckMusic(amount = 0.45, seconds = 3) {
    const t = ctx.currentTime;
    duck.gain.cancelScheduledValues(t);
    duck.gain.setTargetAtTime(amount, t, 0.15);
    duck.gain.setTargetAtTime(1, t + seconds, 1.2);
  }

  // ---------- Bộ điều phối ----------
  const GRID = 0.35; // giây
  const RULES = {
    bigBell:   { cooldown: 20000, priority: 3 },
    bell:      { cooldown: 3000,  priority: 2 },
    lotus:     { cooldown: 4000,  priority: 2 },
    shake:     { cooldown: 2500,  priority: 2 },
    mo:        { cooldown: 550,   priority: 1 },
    chantMo:   { cooldown: 0,     priority: 0 },
  };
  const lastAt = {};
  let recent = []; // thời điểm các tiếng vừa phát

  function play(name, opts) {
    if (!init()) return;
    const rule = RULES[name];
    const now = performance.now();
    if (now - (lastAt[name] || -1e9) < rule.cooldown) return;
    recent = recent.filter((t) => now - t < 1500);
    // đông tiếng thì chỉ cho tiếng quan trọng
    if (recent.length >= 3 && rule.priority < 2) return;
    if (recent.length >= 5) return;
    lastAt[name] = now;
    recent.push(now);
    const t = Math.ceil(ctx.currentTime / GRID) * GRID + 0.02; // vào đúng nhịp
    VOICES[name](t, opts);
  }

  // ---------- Các giọng ----------
  // Chuông: hoạ âm gần hài hoà, tiếng đánh mềm, tắt dần
  function bellVoice(t, freq, { dur, gain, partials, cutoff = 2600 }) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff;
    lp.connect(sfxBus);
    for (const [ratio, amp] of partials) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain * amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / Math.sqrt(ratio));
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  const VOICES = {
    // Chuông đại hồng: trầm ấm, không chói
    bigBell(t) {
      duckMusic(0.35, 5);
      bellVoice(t, 146.83, { dur: 7, gain: 0.32, cutoff: 1400, partials: [[1, 1], [2, 0.35], [2.98, 0.18], [4.1, 0.06]] });
    },
    // Chuông gia trì: trong, ngắn
    bell(t) {
      duckMusic(0.7, 1.5);
      bellVoice(t, 587.33, { dur: 3.2, gain: 0.16, partials: [[1, 1], [2.01, 0.25], [3.02, 0.08]] });
    },
    // Hoa sen: ba nốt chuông gió lên dần (Rê - Mi - La), rất nhẹ
    lotus(t) {
      [[587.33, 0], [659.25, 0.35], [880, 0.7]].forEach(([f, dt]) =>
        bellVoice(t + dt, f, { dur: 2.4, gain: 0.08, partials: [[1, 1], [2, 0.15]] }));
    },
    // Mõ: tiếng gỗ "cốc" tròn
    mo(t, strength = 1) { woodVoice(t, 0.32 * strength); },
    chantMo(t) { woodVoice(t, 0.2); },
    // Lắc ống xăm: lách cách nhỏ dần
    shake(t) {
      for (let s = 0; s < 1.4; s += 0.07 + Math.random() * 0.05) clickVoice(t + s, 0.1 * (1 - s / 1.6));
    },
  };

  function woodVoice(t, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sine';
    o.frequency.setValueAtTime(560, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.06);
    f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(f); f.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + 0.16);
  }

  function clickVoice(t, gain) {
    const len = Math.ceil(ctx.sampleRate * 0.02);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 800; f.Q.value = 2; g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t);
  }

  // ---------- Nhịp tụng kinh (mõ đều + chuông) ----------
  // Không tự tạo giai điệu: nhạc tổng hợp nghe không ra chất Phật pháp. Nhạc nền dùng file thật (assets/music).
  let musicTimer = null, beat = 0;

  function tick() {
    beat++;
    if (st.chanting) {
      play('chantMo');
      if (beat % 16 === 0) play('bell');
    }
  }

  function startLoop() {
    stopLoop();
    musicTimer = setInterval(tick, 700); // ~86 nhịp/phút, vừa nhịp tụng
  }
  function stopLoop() { clearInterval(musicTimer); musicTimer = null; }

  // ---------- Nhạc từ file (themes/chua/assets/music) ----------
  let fileAudio = null, playlist = [], idx = 0;
  async function startFiles() {
    try { playlist = (await (await fetch('/api/theme-files?dir=music')).json()).files || []; } catch { playlist = []; }
    if (!playlist.length) { console.warn('[chùa] chưa có file nhạc trong assets/music'); return startLoop(); }
    if (!fileAudio) {
      fileAudio = new Audio();
      fileAudio.onended = () => { idx = (idx + 1) % playlist.length; playFile(); };
      ctx.createMediaElementSource(fileAudio).connect(musicBus);
    }
    playFile();
    startLoop(); // vẫn chạy nhịp tụng nếu bật
  }
  function playFile() { fileAudio.src = 'assets/music/' + encodeURIComponent(playlist[idx]); fileAudio.play().catch(() => {}); }

  function configure(s) {
    const prev = st.music;
    st.music = s.musicMode === 'files' ? 'files' : 'off';
    st.musicVol = (s.musicVolume ?? 30) / 100;
    st.sfxVol = (s.sfxVolume ?? 45) / 100;
    st.chanting = Boolean(s.chanting);
    if (!init()) return;
    if (prev !== st.music || !musicTimer) {
      if (fileAudio) { fileAudio.pause(); fileAudio.removeAttribute('src'); }
      if (st.music === 'files') startFiles(); else startLoop();
    }
    apply();
  }

  return {
    configure,
    bigBell: () => play('bigBell'),
    bell: () => play('bell'),
    lotus: () => play('lotus'),
    mo: (strength) => play('mo', strength),
    shake: () => play('shake'),
  };
})();
