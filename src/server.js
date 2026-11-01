// TikTok Live Kit: lõi dùng chung. Nguồn live → đường ống → WebSocket → theme (overlay) + bảng điều khiển.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createEngine } from './core/engine.js';
import { createSession } from './core/session.js';
import { createGiftCatalog } from './core/gift-catalog.js';
import { sanitizeRules } from './core/rules.js';
import { createManager } from './providers/manager.js';
import { createDemo } from './providers/demo.js';
import { listThemes, loadTheme, settingValues } from './themes.js';
import { createVoice } from './core/voice.js';
import { createTTS } from './core/tts.js';
import { createDraws } from './core/draws.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Repo dự án (ví dụ một kênh live) có thể dùng kit này mà để theme + dữ liệu ở chỗ riêng:
//   KIT_THEMES_DIR  thư mục theme của dự án (ưu tiên hơn themes/ của kit)
//   KIT_DATA_DIR    thư mục dữ liệu (luật đã chỉnh, phiên live, giọng đọc...)
//   KIT_CONFIG      file cấu hình của dự án (ghi đè config.json của kit)
const DATA = path.resolve(process.env.KIT_DATA_DIR || path.join(ROOT, 'data'));
const THEME_DIRS = [process.env.KIT_THEMES_DIR, path.join(ROOT, 'themes')].filter(Boolean).map((d) => path.resolve(d));
// config.json là mặc định (trong git); lựa chọn đổi lúc chạy (kênh, nguồn, theme) lưu riêng ở data/settings.json
const SETTINGS_FILE = path.join(DATA, 'settings.json');
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const settings = readJson(SETTINGS_FILE);
const config = { ...readJson(path.join(ROOT, 'config.json')), ...(process.env.KIT_CONFIG ? readJson(path.resolve(process.env.KIT_CONFIG)) : {}), ...settings };
const PORT = Number(process.env.PORT || config.port || 3939);
const HOST = process.env.HOST || config.host || '127.0.0.1';

// ---------- Theme, luật, phiên ----------
let theme, rules, session, engine, themeSettings;
let periodicTimer = null;
let periodicIdx = 0;
const catalog = createGiftCatalog(path.join(DATA, 'gifts.json'));
const voice = createVoice();
const draws = createDraws();
const tts = createTTS({
  dir: path.join(DATA, 'tts'),
  onReady: (r) => broadcast({ type: 'event', ev: { kind: 'tts', at: Date.now(), url: `/tts/${r.file}`, text: r.text, for: r.for || '' } }),
  onError: (msg) => { console.warn('[giọng đọc]', msg); broadcast({ type: 'error', message: msg }, 'control'); },
});

/** Đọc một câu bằng giọng của theme (nếu đang bật). */
function speak(text, meta = {}) {
  if (!text || !themeSettings?.voiceEnabled) return;
  const v = theme.voice || {};
  tts.say(text, { voice: v.voice, meta });
}

/** Mọi sự kiện đi ra overlay đều qua đây: nhớ lời người xem nói, đọc câu theo mẫu của theme. */
function emitEvent(ev) {
  if (ev.kind === 'chat') voice.remember(ev.user?.id, ev.text);
  // lệnh chat có bốc thăm: server bốc để overlay và giọng đọc cùng một kết quả
  if (ev.kind === 'command' && typeof ev.draw === 'string') { const d = draws.pick(theme.draws, ev.draw, ev.user?.id || ''); if (d) ev.draw = d; else delete ev.draw; }
  broadcast({ type: 'event', ev });
  if (!ev.test) speak(voice.line(theme.voice, ev), { for: ev.user?.id || '' });
}
const rulesFile = (id) => path.join(DATA, `rules-${id}.json`);
const settingsFile = (id) => path.join(DATA, `theme-settings-${id}.json`);

function activate(themeId) {
  theme = loadTheme(THEME_DIRS, themeId);
  const actionIds = theme.actions.map((a) => a.id);
  let saved = null;
  try { saved = JSON.parse(fs.readFileSync(rulesFile(theme.id), 'utf8')); } catch {}
  rules = sanitizeRules(saved || theme.rules, actionIds);
  themeSettings = settingValues(theme, readJson(settingsFile(theme.id)));
  session?.save();
  session = createSession({
    file: path.join(DATA, `session-${theme.id}.json`),
    titles: theme.titles || [],
    goals: theme.goals || [],
    playerTtlMs: (config.playerTtlMinutes || 20) * 60000,
  });
  engine = createEngine({
    getRules: () => rules,
    session,
    catalog,
    emit: (ev) => { if (ev.internal) { broadcast({ type: 'gifts', gifts: catalog.list() }, 'control'); return; } emitEvent(ev); },
    onChange: () => pushState(),
    maxJoinsPerSecond: config.maxJoinsPerSecond || 15,
  });
  console.log(`[theme] ${theme.name} (${theme.id})`);
  schedulePeriodic();
}
activate(process.env.THEME || config.theme || 'starter');

// ---------- Nội dung định kỳ (tụng kinh, lời mời, câu hỏi...) khi chat vắng ----------
function schedulePeriodic() {
  clearInterval(periodicTimer);
  const p = theme.periodic || {};
  const items = Array.isArray(p.items) ? p.items : [];
  if (!items.length) return;
  const every = Math.max(0.5, Number(p.everyMinutes) || 3) * 60000;
  periodicTimer = setInterval(() => {
    if (!themeSettings.periodicEnabled) return;
    // chỉ chạy khi phòng vắng một lúc (mặc định 20 giây không có sự kiện)
    const quiet = (Number(p.quietSeconds ?? 20) || 0) * 1000;
    if (engine.lastEventAt && Date.now() - engine.lastEventAt < quiet) return;
    firePeriodic(items[periodicIdx++ % items.length]);
  }, every);
  periodicTimer.unref?.();
}
function firePeriodic(item) {
  const it = typeof item === 'string' ? { text: item } : item || {};
  broadcast({ type: 'event', ev: { kind: 'periodic', at: Date.now(), text: it.text || '', title: it.title || theme.periodic?.title || '', action: it.action || '' } });
  if (it.speak !== false) speak(it.say || it.text);
}

function saveConfig(patch) {
  Object.assign(config, patch);
  Object.assign(settings, patch);
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function serveFile(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) && file !== base) return res.writeHead(403).end();
  fs.stat(file, (err, st) => {
    if (err) return res.writeHead(404).end('Not found');
    const target = st.isDirectory() ? path.join(file, 'index.html') : file;
    fs.readFile(target, (e, buf) => {
      if (e) return res.writeHead(404).end('Not found');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  });
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const hostOk = (h) => config.allowLan || LOCAL_HOSTS.has(String(h || '').replace(/:\d+$/, '').toLowerCase());

const server = http.createServer((req, res) => {
  if (!hostOk(req.headers.host)) return res.writeHead(403).end('Forbidden host');
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  if (p === '/') return res.writeHead(302, { Location: '/control/' }).end();
  if (p === '/overlay' || p === '/overlay/') return res.writeHead(302, { Location: `/themes/${theme.id}/${url.search}` }).end();
  if (p === '/api/health') return json(res, { status: 'ok', app: 'tiktok-live-kit', theme: theme.id, live: manager.status.state });
  if (p === '/api/export.csv') {
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="top-${theme.id}-${new Date().toISOString().slice(0, 10)}.csv"` });
    return res.end(session.csv());
  }
  if (p === '/api/theme-files') {
    // liệt kê file trong themes/<theme>/assets/<dir> (nhạc, ảnh) để theme tự nạp những gì người dùng thả vào
    const dir = String(url.searchParams.get('dir') || '').replace(/[^a-z0-9_-]/gi, '');
    let files = [];
    try { files = fs.readdirSync(path.join(theme.dir, 'assets', dir)).filter((f) => /\.(mp3|ogg|wav|m4a|png|jpe?g|webp|gif|mp4|webm|json)$/i.test(f)).sort(); } catch {}
    return json(res, { files });
  }
  if (p.startsWith('/tts/')) return serveFile(res, path.join(DATA, 'tts'), p.slice(5));
  if (p === '/vendor/lottie.min.js') return serveFile(res, path.join(ROOT, 'node_modules', 'lottie-web', 'build', 'player'), 'lottie.min.js');
  if (p.startsWith('/control/')) return serveFile(res, path.join(ROOT, 'public', 'control'), p.slice(9) || 'index.html');
  if (p.startsWith('/sdk/')) return serveFile(res, path.join(ROOT, 'public', 'sdk'), p.slice(5));
  if (p.startsWith('/themes/')) {
    const [id, ...rest] = p.slice(8).split('/');
    const t = listThemes(THEME_DIRS).find((x) => x.id === id);
    return t ? serveFile(res, t.dir, rest.join('/') || 'index.html') : res.writeHead(404).end('Not found');
  }
  res.writeHead(404).end('Not found');
});
const json = (res, obj) => res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(obj));

// ---------- WebSocket ----------
const wss = new WebSocketServer({
  server, path: '/ws', maxPayload: 256 * 1024,
  verifyClient: ({ origin, req }) => {
    if (!hostOk(req.headers.host)) return false;
    if (!origin) return true; // client gốc (game Unity, script) không gửi Origin
    try { return config.allowLan || LOCAL_HOSTS.has(new URL(origin).hostname); } catch { return false; }
  },
});

const send = (ws, msg) => { if (ws.readyState === 1) ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); };
function broadcast(msg, role) {
  const data = JSON.stringify(msg);
  for (const c of wss.clients) if (c.role && (!role || c.role === role)) send(c, data);
}

let stateTimer = null;
function stateMsg() {
  return {
    type: 'state',
    viewers: session.data.viewers,
    totals: session.data.totals,
    top: session.top(16),
    goals: session.goalsView(),
    live: manager.status,
    demo: demo.running,
    lastEventAgo: engine.lastEventAt ? Date.now() - engine.lastEventAt : null,
  };
}
function pushState() {
  if (stateTimer) return;
  stateTimer = setTimeout(() => { stateTimer = null; broadcast(stateMsg()); }, 250);
}

const publicTheme = () => ({
  id: theme.id, name: theme.name, width: theme.width, height: theme.height, actions: theme.actions, titles: theme.titles,
  text: theme.text || {}, settings: theme.settings, characters: theme.characters, animations: theme.animations, npcs: theme.npcs,
  hud: theme.hud, colors: theme.colors, sounds: theme.sounds, bigGift: theme.bigGift, reactions: theme.reactions, scene: theme.scene, goals: theme.goals,
});
// Overlay cần luật để tự sinh bảng "tặng gì được gì"; kèm tên và ảnh các quà đã gặp
const guideData = () => ({ rules, gifts: catalog.list().map((g) => ({ id: g.id, name: g.name, coins: g.coins, image: g.image })) });

function init(ws) {
  const base = { type: 'init', theme: publicTheme(), state: stateMsg(), settings: themeSettings };
  if (ws.role === 'control') send(ws, { ...base, rules, gifts: catalog.list(), themes: listThemes(THEME_DIRS).map(({ dir, ...t }) => t), config: { provider: config.provider || 'auto', tiktokUsername: config.tiktokUsername || '', tikfinityUrl: config.tikfinityUrl } });
  else send(ws, { ...base, players: session.active(config.snapshotPlayers || 300), guide: guideData() });
}

const demo = createDemo({ onEvent: (ev) => engine.ingest(ev, { simulated: true }) });

const CONTROL = {
  async connect(m) {
    demo.stop();
    saveConfig({ tiktokUsername: String(m.username || '').replace(/^@/, '').trim(), provider: ['auto', 'tikfinity', 'connector'].includes(m.provider) ? m.provider : 'auto' });
    manager.connect(config.tiktokUsername, config.provider);
  },
  async disconnect() { await manager.stop(); },
  sim(m) { demo.fire(m.kind, m.arg, m.arg2); },
  demo(m) { demo.auto(Number(m.rate) || 0); pushState(); },
  test(m) {
    // Bắn thẳng một hành động của theme để xem hiệu ứng, không cộng điểm
    const a = theme.actions.find((x) => x.id === m.action);
    if (!a) return;
    const p = session.active(1)[0] || { id: 'test', name: 'Người thử', avatar: '', coins: 0, title: '', rank: 0 };
    const ev = { kind: 'gift', at: Date.now(), user: { ...p, isPlayer: true }, gift: { id: '', name: 'Thử', image: '', coins: 0 }, count: 1, total: m.big ? 100 : 1, action: a.id, label: a.label, big: Boolean(m.big), test: true };
    broadcast({ type: 'event', ev });
    speak(voice.line(theme.voice, { ...ev, test: false }), { for: p.id });
  },
  reset() { session.reset(); engine.reset(); broadcast({ type: 'reset' }); pushState(); },
  saveRules(m) {
    rules = sanitizeRules(m.rules, theme.actions.map((a) => a.id));
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(rulesFile(theme.id), JSON.stringify(rules, null, 2));
    broadcast({ type: 'rules', rules }, 'control');
    broadcast({ type: 'guide', ...guideData() }, 'overlay');
  },
  saveSettings(m) {
    themeSettings = settingValues(theme, { ...themeSettings, ...(m.values || {}) });
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(settingsFile(theme.id), JSON.stringify(themeSettings, null, 2));
    broadcast({ type: 'settings', values: themeSettings });
  },
  testVoice(m) { const was = themeSettings.voiceEnabled; themeSettings.voiceEnabled = true; speak(String(m.text || 'Xin chào, đây là giọng đọc thử').slice(0, 200)); themeSettings.voiceEnabled = was; },
  periodicNow() { const items = theme.periodic?.items || []; if (items.length) firePeriodic(items[periodicIdx++ % items.length]); },
  resetRules() { try { fs.unlinkSync(rulesFile(theme.id)); } catch {} rules = sanitizeRules(theme.rules, theme.actions.map((a) => a.id)); broadcast({ type: 'rules', rules }, 'control'); },
  setTheme(m) {
    if (!listThemes(THEME_DIRS).some((t) => t.id === m.id)) return;
    saveConfig({ theme: m.id });
    activate(m.id);
    broadcast({ type: 'reload' }, 'overlay');
    for (const c of wss.clients) if (c.role === 'control') init(c);
  },
};

wss.on('connection', (ws) => {
  ws.role = null;
  ws.alive = true;
  ws.budget = { at: Date.now(), n: 0 };
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', async (raw, isBinary) => {
    if (isBinary) return ws.close(1003, 'text only');
    const now = Date.now();
    if (now - ws.budget.at > 5000) ws.budget = { at: now, n: 0 };
    if (++ws.budget.n > 120) return ws.close(1008, 'rate limit');
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.type !== 'string') return;
    if (m.type === 'hello') {
      if (!['control', 'overlay'].includes(m.role)) return send(ws, { type: 'error', message: 'role không hợp lệ' });
      ws.role = m.role;
      return init(ws);
    }
    if (m.type === 'ping') return send(ws, { type: 'pong', t: m.t });
    if (ws.role !== 'control') return send(ws, { type: 'error', message: 'Lệnh chỉ dành cho bảng điều khiển' });
    const fn = CONTROL[m.type];
    if (!fn) return;
    try { await fn(m); } catch (err) { console.error('[control]', m.type, err); send(ws, { type: 'error', message: String(err.message || err) }); }
  });
});

const heartbeat = setInterval(() => {
  for (const c of wss.clients) { if (!c.alive) { c.terminate(); continue; } c.alive = false; c.ping(); }
  if (manager.status.state === 'connected') pushState(); // cập nhật "sự kiện cuối cách đây"
}, 15000);

// ---------- Kết nối live ----------
const manager = createManager({
  config,
  onEvent: (ev) => engine.ingest(ev),
  onStatus: () => pushState(),
  lastEventAt: () => engine.lastEventAt,
});

server.listen(PORT, HOST, () => {
  console.log(`\n  TikTok Live Kit · theme: ${theme.name}`);
  console.log(`  - Bảng điều khiển: http://localhost:${PORT}/`);
  console.log(`  - Overlay (OBS Browser source, ${theme.width}x${theme.height}): http://localhost:${PORT}/overlay\n`);
  if (config.autoConnect && (config.tiktokUsername || config.provider === 'tikfinity')) manager.connect(config.tiktokUsername, config.provider);
});

async function shutdown() {
  clearInterval(heartbeat);
  clearInterval(periodicTimer);
  demo.stop();
  session.save();
  await manager.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => console.error('[lỗi chưa bắt]', err));
process.on('unhandledRejection', (err) => console.error('[promise lỗi]', err));
