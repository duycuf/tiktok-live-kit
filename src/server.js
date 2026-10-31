import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { normUser, normGift, likeCount, totalLikes, viewerCount } from './tiktok.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const PORT = Number(process.env.PORT || config.port || 3939);

// ---------- Trạng thái phiên live ----------
const state = {
  status: 'idle', // idle | connecting | connected | offline | error
  username: process.env.TIKTOK_USERNAME || config.tiktokUsername || '',
  message: '',
  viewers: 0,
  likes: 0,
  coins: 0,
  donors: new Map(), // id -> { id, name, avatar, coins }
};
let lastBlessingAt = 0;

const tiers = [...config.giftTiers].sort((a, b) => b.minCoins - a.minCoins);
const tierFor = (coins) => tiers.find((t) => coins >= t.minCoins) || tiers[tiers.length - 1];

function leaderboard() {
  return [...state.donors.values()].sort((a, b) => b.coins - a.coins).slice(0, 5);
}

function snapshot() {
  return {
    type: 'state',
    status: state.status,
    username: state.username,
    message: state.message,
    viewers: state.viewers,
    likes: state.likes,
    coins: state.coins,
    top: leaderboard(),
    config: {
      hallName: config.hallName,
      host: config.host,
      maxDevotees: config.maxDevotees,
      giftTiers: config.giftTiers,
      likesPerBlessing: config.likesPerBlessing,
    },
  };
}

// ---------- WebSocket tới overlay và bảng điều khiển ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  if (!path.extname(file)) file += '.html';
  fs.readFile(file, (err, buf) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
});

const wss = new WebSocketServer({ server, path: '/ws' });
const broadcast = (msg) => {
  const data = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(data);
};
const emit = (ev) => broadcast({ type: 'event', ev: { ...ev, at: Date.now() } });
const pushState = () => broadcast(snapshot());

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(snapshot()));
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'connect') connectTikTok(String(msg.username || '').replace(/^@/, '').trim());
    else if (msg.type === 'disconnect') disconnectTikTok();
    else if (msg.type === 'sim') handleSim(msg.ev);
    else if (msg.type === 'reset') { state.donors.clear(); state.coins = 0; state.likes = 0; pushState(); }
  });
});

// ---------- Xử lý sự kiện (dùng chung cho live thật và giả lập) ----------
function onJoin(user) { emit({ kind: 'join', user }); }
function onChat(user, text) { emit({ kind: 'chat', user, text: String(text).slice(0, 80) }); }

function onLike(user, count, total) {
  state.likes = total || state.likes + count;
  emit({ kind: 'like', user, count });
  const step = config.likesPerBlessing || 0;
  if (step && Math.floor(state.likes / step) > lastBlessingAt) {
    lastBlessingAt = Math.floor(state.likes / step);
    emit({ kind: 'blessing', likes: lastBlessingAt * step });
  }
  pushState();
}

function onGift(user, gift, count) {
  const total = gift.coins * count;
  const donor = state.donors.get(user.id) || { ...user, coins: 0 };
  donor.coins += total;
  donor.name = user.name;
  donor.avatar = user.avatar || donor.avatar;
  state.donors.set(user.id, donor);
  state.coins += total;
  const tier = tierFor(gift.coins);
  emit({ kind: 'gift', user, gift: { name: gift.name, image: gift.image, coins: gift.coins }, count, total, action: tier.action, label: tier.label });
  pushState();
}

function onFollow(user) { emit({ kind: 'follow', user }); }
function onShare(user) { emit({ kind: 'share', user }); }

function handleSim(ev = {}) {
  const user = ev.user || { id: 'khach', name: 'Khách', avatar: '' };
  if (ev.kind === 'join') onJoin(user);
  else if (ev.kind === 'chat') onChat(user, ev.text || 'Nam Mô A Di Đà Phật');
  else if (ev.kind === 'like') onLike(user, ev.count || 5, 0);
  else if (ev.kind === 'gift') onGift(user, { name: ev.giftName || 'Quà', image: '', coins: ev.coins || 1 }, ev.count || 1);
  else if (ev.kind === 'follow') onFollow(user);
  else if (ev.kind === 'share') onShare(user);
  else if (ev.kind === 'viewers') { state.viewers = ev.count || 0; pushState(); }
}

// ---------- Kết nối TikTok LIVE ----------
let conn = null;
let retryTimer = null;
let wanted = false;
const streaks = new Map(); // quà bấm liên tiếp: chỉ tính phần tăng thêm của repeatCount

function setStatus(status, message = '') {
  state.status = status;
  state.message = message;
  console.log(`[tiktok] ${status}${message ? ': ' + message : ''}`);
  pushState();
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  if (!wanted || !config.autoReconnectSeconds) return;
  retryTimer = setTimeout(() => connectTikTok(state.username), config.autoReconnectSeconds * 1000);
}

async function connectTikTok(username) {
  if (!username) return setStatus('error', 'Chưa nhập tên TikTok');
  await disconnectTikTok(true);
  wanted = true;
  state.username = username;
  setStatus('connecting', '@' + username);

  const c = new TikTokLiveConnection(username, {
    enableExtendedGiftInfo: true,
    processInitialData: false,
    ...(config.signApiKey || process.env.EULER_API_KEY ? { signApiKey: config.signApiKey || process.env.EULER_API_KEY } : {}),
  });
  conn = c;

  c.on(WebcastEvent.MEMBER, (d) => onJoin(normUser(d.user)));
  c.on(WebcastEvent.CHAT, (d) => onChat(normUser(d.user), d.comment || d.content || ''));
  c.on(WebcastEvent.LIKE, (d) => onLike(normUser(d.user), likeCount(d), totalLikes(d)));
  c.on(WebcastEvent.FOLLOW, (d) => onFollow(normUser(d.user)));
  c.on(WebcastEvent.SHARE, (d) => onShare(normUser(d.user)));
  c.on(WebcastEvent.ROOM_USER, (d) => { state.viewers = viewerCount(d); pushState(); });
  c.on(WebcastEvent.GIFT, (d) => {
    const user = normUser(d.user);
    const gift = normGift(d);
    if (!gift.streakable) return onGift(user, gift, gift.repeatCount);
    const key = `${user.id}:${gift.giftId}:${gift.groupId}`;
    const delta = gift.repeatCount - (streaks.get(key) || 0);
    if (delta > 0) onGift(user, gift, delta);
    if (gift.repeatEnd) streaks.delete(key);
    else streaks.set(key, gift.repeatCount);
  });
  c.on(WebcastEvent.STREAM_END, () => { setStatus('offline', 'Buổi live đã kết thúc'); scheduleRetry(); });
  c.on(ControlEvent.DISCONNECTED, () => {
    if (conn !== c) return;
    if (state.status === 'connected') setStatus('offline', 'Mất kết nối, đang thử lại');
    scheduleRetry();
  });
  c.on(ControlEvent.ERROR, (e) => console.warn('[tiktok] error', e?.info || e?.message || e));

  try {
    const s = await c.connect();
    if (conn !== c) return;
    setStatus('connected', `@${username} · room ${s.roomId}`);
  } catch (err) {
    if (conn !== c) return;
    const offline = /offline|not live|isn't online/i.test(String(err?.message || err?.name || ''));
    setStatus(offline ? 'offline' : 'error', offline ? `@${username} chưa lên live, sẽ tự thử lại` : String(err?.message || err));
    scheduleRetry();
  }
}

async function disconnectTikTok(keepWanted = false) {
  clearTimeout(retryTimer);
  if (!keepWanted) wanted = false;
  const c = conn;
  conn = null;
  streaks.clear();
  if (c) { try { await c.disconnect(); } catch {} }
  if (!keepWanted) setStatus('idle');
}

server.listen(PORT, () => {
  console.log(`\n  Chùa ảo đang chạy:`);
  console.log(`  - Bảng điều khiển: http://localhost:${PORT}/`);
  console.log(`  - Overlay (OBS / TikTok LIVE Studio): http://localhost:${PORT}/overlay\n`);
  if (state.username) connectTikTok(state.username);
});
