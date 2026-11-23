// Live SDK for themes: connects to the core, reconnects automatically, scales the frame, emits events. A theme only needs Live.on(...).
//
//   Live.on('ready',    ({ theme, players, state }) => {})  // on connect (and reconnect): rebuild the existing crowd
//   Live.on('join',     (e) => {})   e.user = { id, name, avatar, title, coins, rank, isPlayer }
//   Live.on('chat',     (e) => {})   e.text
//   Live.on('like',     (e) => {})   e.count
//   Live.on('gift',     (e) => {})   e.action, e.label, e.gift{name,image,coins}, e.count, e.total, e.big, e.combo
//   Live.on('command',  (e) => {})   chat command that matched a rule: e.action
//   Live.on('follow' | 'share' | 'title' | 'goal' | 'streamEnd', (e) => {})
//   Live.on('state',    (s) => {})   s.viewers, s.totals, s.top, s.goals
//   Live.on('reset',    () => {})    "Phiên mới" (New session) pressed in the control panel
//   Live.on('settings', (v) => {})   the theme's own settings (declared under "settings" in theme.json) changed
//   Live.on('*',        (e) => {})   every event
//
//   Live.stage(el)      scale element el (native size per theme) to fit the window, keeping the aspect ratio
//   Live.sound(url, vol) play a sound (caps the number of simultaneous sounds)
//   Live.img(url)       cached image, sent without a referrer so TikTok images load
//   Live.audio()        shared AudioContext (null when muted); Live.muted = true in the preview frame (?mute)
//   Live.settings       the theme's current settings values

(function () {
  const handlers = {};
  const Live = {
    theme: null,
    state: null,
    settings: {},
    muted: new URLSearchParams(location.search).has('mute'),
    connected: false,
    on(kind, fn) { (handlers[kind] ||= []).push(fn); return Live; },
    emit(kind, data) {
      for (const fn of handlers[kind] || []) try { fn(data); } catch (e) { console.error(`[Live] lỗi trong handler "${kind}"`, e); }
      if (kind !== 'state' && kind !== 'ready') for (const fn of handlers['*'] || []) try { fn(data); } catch (e) { console.error(e); }
    },
  };

  // ---------- Connection ----------
  let retry = 500;
  function connect() {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws.onopen = () => { retry = 500; ws.send(JSON.stringify({ type: 'hello', role: 'overlay' })); };
    ws.onmessage = (m) => {
      let msg;
      try { msg = JSON.parse(m.data); } catch { return; }
      if (msg.type === 'init') {
        Live.theme = msg.theme;
        Live.state = msg.state;
        Live.settings = msg.settings || {};
        Live.connected = true;
        banner(false);
        Live.emit('ready', { theme: msg.theme, players: msg.players || [], state: msg.state, guide: msg.guide });
        Live.emit('state', msg.state);
      } else if (msg.type === 'event') Live.emit(msg.ev.kind, msg.ev);
      else if (msg.type === 'state') { Live.state = msg; Live.emit('state', msg); }
      else if (msg.type === 'reset') Live.emit('reset', {});
      else if (msg.type === 'guide') Live.emit('guide', msg);
      else if (msg.type === 'settings') { Live.settings = msg.values || {}; Live.emit('settings', Live.settings); }
      else if (msg.type === 'reload') location.reload();
    };
    ws.onclose = () => {
      Live.connected = false;
      banner(true);
      setTimeout(connect, retry);
      retry = Math.min(5000, retry * 2);
    };
  }

  // Connection-lost notice (hide with ?quiet)
  let bannerEl = null;
  function banner(show) {
    if (new URLSearchParams(location.search).has('quiet')) return;
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.textContent = 'Mất kết nối server, đang nối lại…';
      bannerEl.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;padding:4px 10px;border-radius:6px;background:rgba(170,30,30,.9);color:#fff;font:14px system-ui;display:none';
      document.addEventListener('DOMContentLoaded', () => document.body.appendChild(bannerEl));
      if (document.body) document.body.appendChild(bannerEl);
    }
    bannerEl.style.display = show ? 'block' : 'none';
  }

  // ---------- Co khung ----------
  Live.stage = function (el, w, h) {
    const W = w || Live.theme?.width || el.offsetWidth || 1080;
    const H = h || Live.theme?.height || el.offsetHeight || 1920;
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', transformOrigin: '0 0' });
    const fit = () => {
      const s = Math.min(innerWidth / W, innerHeight / H);
      el.style.left = (innerWidth - W * s) / 2 + 'px';
      el.style.top = (innerHeight - H * s) / 2 + 'px';
      el.style.transform = `scale(${s})`;
    };
    addEventListener('resize', fit);
    fit();
    return fit;
  };

  // ---------- Images, sound ----------
  const imgs = new Map();
  Live.img = function (url) {
    if (!url) return null;
    if (imgs.has(url)) return imgs.get(url);
    const im = new Image();
    im.referrerPolicy = 'no-referrer';
    im.crossOrigin = 'anonymous';
    im.onerror = () => { if (im.crossOrigin) { im.crossOrigin = null; im.src = url; } };
    im.src = url;
    imgs.set(url, im);
    if (imgs.size > 800) imgs.delete(imgs.keys().next().value);
    return im;
  };

  let ctx = null;
  Live.audio = function () {
    if (Live.muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // browsers usually block audio until a user interaction; OBS does not
      const unlock = () => ctx.state === 'suspended' && ctx.resume();
      addEventListener('pointerdown', unlock);
      addEventListener('keydown', unlock);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };

  let playing = 0;
  Live.sound = function (url, volume = 0.8) {
    if (!url || playing >= 4 || Live.muted) return;
    const a = new Audio(url);
    a.volume = volume;
    playing++;
    a.onended = a.onerror = () => { playing--; };
    a.play().catch(() => { playing--; });
  };

  window.Live = Live;
  connect();
})();
