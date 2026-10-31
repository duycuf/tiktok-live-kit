// Overlay chùa ảo: vẽ chánh điện, Phật tử (mỗi người xem một nhân vật), hiệu ứng quà / tim / bình luận.
// Toạ độ theo khung 1080x1920. Đổi bố cục ở object SCENE.

const SCENE = {
  W: 1080, H: 1920,
  buddha: { x: 540, y: 560 },
  burner: { x: 540, y: 965 },          // lư hương
  offerSpot: { x: 540, y: 1035 },      // chỗ đứng dâng hương
  cushions: [{ x: 215, y: 1035 }, { x: 345, y: 1035 }, { x: 735, y: 1035 }, { x: 865, y: 1035 }], // bồ đoàn lễ Phật
  aisleX: 540, aisleHalf: 62,
  floorTop: 1110, floorBottom: 1660, rowGap: 58, colGap: 76,
  figure: 1.55,                        // cỡ nhân vật
  maxTags: 28,                         // số nhãn tên hiện cùng lúc
  entry: { x: 540, y: 1990 },
};

const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
const BG_URL = params.get('bg') || 'assets/background.jpg';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');

function fit() {
  const s = Math.min(innerWidth / SCENE.W, innerHeight / SCENE.H);
  stage.style.left = `${(innerWidth - SCENE.W * s) / 2}px`;
  stage.style.top = `${(innerHeight - SCENE.H * s) / 2}px`;
  stage.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);
fit();

// ---------- Tiện ích ----------
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const now = () => performance.now();
const persp = (y) => 0.7 + 0.42 * clamp((y - 980) / 700, 0, 1); // xa nhỏ, gần to

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const imgCache = new Map();
function loadImg(url) {
  if (!url) return null;
  if (imgCache.has(url)) return imgCache.get(url);
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.src = url;
  imgCache.set(url, img);
  return img;
}

// ---------- Nền chánh điện (vẽ một lần vào canvas phụ) ----------
let bgCanvas = null;
let customBg = null;
const bgImg = new Image();
bgImg.onload = () => { customBg = bgImg; };
bgImg.src = BG_URL;

function buildBackground() {
  const c = document.createElement('canvas');
  c.width = SCENE.W; c.height = SCENE.H;
  const g = c.getContext('2d');
  const { W, H } = SCENE;

  // tường
  let gr = g.createLinearGradient(0, 0, 0, 1050);
  gr.addColorStop(0, '#2b0d04'); gr.addColorStop(0.6, '#5a2208'); gr.addColorStop(1, '#3a1405');
  g.fillStyle = gr; g.fillRect(0, 0, W, 1060);
  // ô gỗ chạm vàng
  g.strokeStyle = 'rgba(214,160,70,.25)'; g.lineWidth = 3;
  for (let x = 20; x < W; x += 130) for (let y = 120; y < 900; y += 190) { g.strokeRect(x, y, 110, 170); g.strokeRect(x + 12, y + 12, 86, 146); }
  // cột đỏ
  for (const x of [40, 960]) {
    gr = g.createLinearGradient(x, 0, x + 80, 0);
    gr.addColorStop(0, '#4a0b06'); gr.addColorStop(0.5, '#b0261a'); gr.addColorStop(1, '#4a0b06');
    g.fillStyle = gr; g.fillRect(x, 0, 80, 1080);
    g.fillStyle = '#d6a852'; g.fillRect(x - 6, 0, 92, 18); g.fillRect(x - 6, 1040, 92, 24);
  }
  // hào quang
  gr = g.createRadialGradient(540, 520, 20, 540, 520, 380);
  gr.addColorStop(0, 'rgba(255,236,170,.95)'); gr.addColorStop(0.45, 'rgba(255,190,80,.55)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(540, 520, 380, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,214,120,.8)'; g.lineWidth = 6;
  g.beginPath(); g.arc(540, 470, 250, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(540, 470, 270, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.beginPath(); g.moveTo(540 + Math.cos(a) * 275, 470 + Math.sin(a) * 275); g.lineTo(540 + Math.cos(a) * 300, 470 + Math.sin(a) * 300); g.stroke();
  }

  // tượng Phật
  const gold = (y0, y1) => { const t = g.createLinearGradient(380, y0, 700, y1); t.addColorStop(0, '#fff0b0'); t.addColorStop(0.35, '#e6b347'); t.addColorStop(0.7, '#a86d16'); t.addColorStop(1, '#f2c95c'); return t; };
  // đài sen
  g.fillStyle = gold(760, 880);
  for (let i = -5; i <= 5; i++) {
    g.beginPath(); g.ellipse(540 + i * 34, 840, 26, 52, i * 0.12, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#c4508a';
  for (let i = -4; i <= 4; i++) { g.globalAlpha = .55; g.beginPath(); g.ellipse(540 + i * 38, 862, 20, 34, i * 0.15, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  // chân (ngồi kiết già)
  g.fillStyle = gold(700, 820);
  g.beginPath(); g.ellipse(540, 780, 190, 62, 0, 0, Math.PI * 2); g.fill();
  // thân
  g.beginPath(); g.moveTo(420, 770); g.quadraticCurveTo(410, 560, 480, 500); g.lineTo(600, 500); g.quadraticCurveTo(670, 560, 660, 770); g.closePath(); g.fill();
  // tay ấn thiền định
  g.fillStyle = '#f7d77a'; g.beginPath(); g.ellipse(540, 730, 70, 26, 0, 0, Math.PI * 2); g.fill();
  // y áo
  g.strokeStyle = 'rgba(120,70,10,.55)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(490, 510); g.quadraticCurveTo(560, 620, 640, 740); g.stroke();
  g.beginPath(); g.moveTo(450, 640); g.quadraticCurveTo(500, 700, 470, 770); g.stroke();
  // cổ, đầu
  g.fillStyle = gold(380, 500);
  g.fillRect(515, 470, 50, 40);
  g.beginPath(); g.ellipse(540, 420, 62, 74, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(482, 432, 12, 34, 0.1, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(598, 432, 12, 34, -0.1, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7a4a10';
  g.beginPath(); g.ellipse(540, 362, 60, 30, 0, Math.PI, 0); g.fill();
  g.beginPath(); g.arc(540, 330, 24, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7a4a10'; g.lineWidth = 3;
  g.beginPath(); g.arc(518, 418, 12, 0.2, Math.PI - 0.2); g.stroke();
  g.beginPath(); g.arc(562, 418, 12, 0.2, Math.PI - 0.2); g.stroke();
  g.beginPath(); g.arc(540, 452, 10, 0.3, Math.PI - 0.3); g.stroke();
  g.fillStyle = '#c0392b'; g.beginPath(); g.arc(540, 392, 4, 0, Math.PI * 2); g.fill();

  // bàn thờ
  gr = g.createLinearGradient(0, 880, 0, 990);
  gr.addColorStop(0, '#7a1a0e'); gr.addColorStop(1, '#3d0905');
  g.fillStyle = gr; g.fillRect(250, 900, 580, 90);
  g.fillStyle = '#d6a852'; g.fillRect(240, 892, 600, 12); g.fillRect(250, 980, 580, 6);
  // bình hoa sen hai bên
  for (const x of [300, 780]) {
    g.fillStyle = '#c99a3a'; g.beginPath(); g.ellipse(x, 880, 24, 30, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 2 ? '#f29ac0' : '#e86fa5';
      g.beginPath(); g.ellipse(x + rand(-40, 40), 800 + rand(-30, 30), 20, 15, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#3f7a3a'; g.beginPath(); g.ellipse(x, 845, 46, 14, 0, 0, Math.PI * 2); g.fill();
  }
  // mâm quả
  for (const x of [400, 680]) {
    g.fillStyle = '#d6a852'; g.fillRect(x - 40, 880, 80, 10);
    for (let i = 0; i < 6; i++) { g.fillStyle = ['#f0a020', '#e2c22a', '#d9562a'][i % 3]; g.beginPath(); g.arc(x - 25 + (i % 3) * 25, 870 - Math.floor(i / 3) * 18, 13, 0, Math.PI * 2); g.fill(); }
  }

  // sàn gỗ
  gr = g.createLinearGradient(0, 990, 0, H);
  gr.addColorStop(0, '#3a1a08'); gr.addColorStop(1, '#170902');
  g.fillStyle = gr; g.fillRect(0, 990, W, H - 990);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2;
  for (let y = 1000; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // thảm đỏ
  gr = g.createLinearGradient(470, 0, 610, 0);
  gr.addColorStop(0, '#5c0d0a'); gr.addColorStop(0.5, '#a3201a'); gr.addColorStop(1, '#5c0d0a');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(500, 1000); g.lineTo(580, 1000); g.lineTo(615, H); g.lineTo(465, H); g.closePath(); g.fill();
  g.strokeStyle = '#d6a852'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(506, 1000); g.lineTo(474, H); g.moveTo(574, 1000); g.lineTo(606, H); g.stroke();
  // bồ đoàn
  for (const p of SCENE.cushions) {
    g.fillStyle = '#9e1c14'; g.beginPath(); g.ellipse(p.x, p.y + 6, 50, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9352a'; g.beginPath(); g.ellipse(p.x, p.y, 46, 13, 0, 0, Math.PI * 2); g.fill();
  }
  return c;
}

function drawBackground(t) {
  if (customBg) {
    const s = Math.max(SCENE.W / customBg.width, SCENE.H / customBg.height);
    const w = customBg.width * s, h = customBg.height * s;
    ctx.drawImage(customBg, (SCENE.W - w) / 2, (SCENE.H - h) / 2, w, h);
  } else {
    bgCanvas ||= buildBackground();
    ctx.drawImage(bgCanvas, 0, 0);
  }
  // hào quang thở nhẹ
  const pulse = 0.25 + 0.1 * Math.sin(t / 900) + glow.level * 0.6;
  const gr = ctx.createRadialGradient(SCENE.buddha.x, SCENE.buddha.y - 40, 10, SCENE.buddha.x, SCENE.buddha.y - 40, 520);
  gr.addColorStop(0, `rgba(255,230,160,${pulse})`); gr.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, SCENE.W, 1100);
  // nến lung linh
  for (const x of [270, 330, 750, 810]) {
    const f = 0.7 + 0.3 * Math.sin(t / 90 + x);
    ctx.fillStyle = '#f5ead0'; ctx.fillRect(x - 5, 870, 10, 26);
    const fg = ctx.createRadialGradient(x, 862, 1, x, 862, 26 * f);
    fg.addColorStop(0, 'rgba(255,240,180,1)'); fg.addColorStop(0.4, 'rgba(255,170,50,.8)'); fg.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, 862, 26 * f, 0, Math.PI * 2); ctx.fill();
  }
  // lư hương
  const b = SCENE.burner;
  ctx.fillStyle = '#8a5a14'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 54, 20, 0, 0, Math.PI * 2); ctx.fill();
  const bg2 = ctx.createLinearGradient(b.x - 50, 0, b.x + 50, 0);
  bg2.addColorStop(0, '#6b430c'); bg2.addColorStop(0.5, '#e8b54a'); bg2.addColorStop(1, '#6b430c');
  ctx.fillStyle = bg2; ctx.beginPath(); ctx.moveTo(b.x - 50, b.y - 4); ctx.quadraticCurveTo(b.x, b.y + 70, b.x + 50, b.y - 4); ctx.fill();
  ctx.fillRect(b.x - 30, b.y + 26, 8, 22); ctx.fillRect(b.x + 22, b.y + 26, 8, 22);
  ctx.fillStyle = '#c23a20';
  for (let i = -2; i <= 2; i++) { ctx.fillRect(b.x + i * 9 - 1, b.y - 40, 3, 36); }
}

// ---------- Hạt: khói, tim, sen, lấp lánh ----------
const particles = [];
function spawn(p) { particles.push(Object.assign({ born: now(), life: 2000, vx: 0, vy: 0, size: 10, kind: 'spark' }, p)); }
function smoke(n = 1, strong = false) {
  for (let i = 0; i < n; i++) spawn({ kind: 'smoke', x: SCENE.burner.x + rand(-18, 18), y: SCENE.burner.y - 40, vx: rand(-0.15, 0.15), vy: rand(-0.9, -0.5) * (strong ? 1.6 : 1), size: rand(10, 18) * (strong ? 1.4 : 1), life: rand(3000, 5000) });
}
function hearts(x, y, n) {
  for (let i = 0; i < n; i++) spawn({ kind: 'heart', x: x + rand(-12, 12), y, vx: rand(-0.6, 0.6), vy: rand(-2.4, -1.4), size: rand(14, 22), life: rand(1400, 2200), hue: rand(330, 360) });
}
function sparkles(x, y, n, spread = 60) {
  for (let i = 0; i < n; i++) spawn({ kind: 'spark', x: x + rand(-spread, spread), y: y + rand(-spread, spread / 2), vx: rand(-0.5, 0.5), vy: rand(-1.6, -0.4), size: rand(3, 7), life: rand(900, 1800) });
}
function lotusFly(fromX, fromY, n) {
  for (let i = 0; i < n; i++) {
    const tx = SCENE.buddha.x + rand(-160, 160), ty = 840 + rand(-30, 20);
    spawn({ kind: 'lotus', x: fromX, y: fromY, sx: fromX, sy: fromY, tx, ty, size: rand(18, 28), life: 2200 + i * 120, delay: i * 120 });
  }
}
function lotusRain(n) {
  for (let i = 0; i < n; i++) spawn({ kind: 'petal', x: rand(0, SCENE.W), y: rand(-200, 0), vx: rand(-0.6, 0.6), vy: rand(1.6, 3.2), size: rand(8, 14), life: rand(4000, 6500), rot: rand(0, 6) });
}

function drawParticles(t) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const age = t - p.born - (p.delay || 0);
    if (age < 0) continue;
    const k = age / p.life;
    if (k >= 1) { particles.splice(i, 1); continue; }
    if (p.kind === 'lotus') {
      const e = ease(k);
      p.x = p.sx + (p.tx - p.sx) * e;
      p.y = p.sy + (p.ty - p.sy) * e - Math.sin(e * Math.PI) * 180;
    } else { p.x += p.vx; p.y += p.vy; }
    ctx.save();
    ctx.globalAlpha = p.kind === 'smoke' ? 0.28 * Math.sin(Math.PI * Math.min(1, k * 1.4 + 0.05)) : 1 - Math.pow(k, 3);
    if (p.kind === 'smoke') {
      p.vx += Math.sin((t + p.born) / 600) * 0.01;
      const r = p.size * (1 + k * 2.5);
      const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      sg.addColorStop(0, 'rgba(240,236,228,.8)'); sg.addColorStop(1, 'rgba(240,236,228,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'heart') {
      ctx.fillStyle = `hsl(${p.hue},90%,62%)`; drawHeart(p.x, p.y, p.size);
    } else if (p.kind === 'spark') {
      ctx.fillStyle = '#fff2b8'; ctx.shadowColor = '#ffcc55'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'lotus') {
      drawLotus(p.x, p.y, p.size);
    } else if (p.kind === 'petal') {
      p.vx += Math.sin((t + p.born) / 400) * 0.03;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot + age / 600);
      ctx.fillStyle = '#f39ac2'; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawHeart(x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

function drawLotus(x, y, s) {
  ctx.shadowColor = '#ffb3d6'; ctx.shadowBlur = 14;
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = i % 2 ? '#f7a8cb' : '#ec6fa6';
    ctx.beginPath(); ctx.ellipse(x + i * s * 0.32, y, s * 0.28, s * 0.6, i * 0.35, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y + s * 0.15, s * 0.16, 0, Math.PI * 2); ctx.fill();
}

// ---------- Phật tử ----------
const devotees = new Map();
let maxDevotees = 180;
const slots = buildSlots();

function buildSlots() {
  const list = [];
  for (let y = SCENE.floorTop; y <= SCENE.floorBottom; y += SCENE.rowGap) {
    const s = persp(y);
    const gap = SCENE.colGap * s;
    for (let x = SCENE.aisleX - SCENE.aisleHalf * s - gap / 2; x > 30; x -= gap) list.push({ x, y, taken: null });
    for (let x = SCENE.aisleX + SCENE.aisleHalf * s + gap / 2; x < SCENE.W - 30; x += gap) list.push({ x, y, taken: null });
  }
  // ưu tiên chỗ gần lối giữa, hàng trên trước
  return list.sort((a, b) => (a.y - b.y) || (Math.abs(a.x - 540) - Math.abs(b.x - 540)));
}

function freeSlot() {
  let s = slots.find((x) => !x.taken);
  if (s) return s;
  // điện đầy: mời người im lặng lâu nhất ra về
  let oldest = null;
  for (const d of devotees.values()) if (!d.leaving && d.tasks.length === 0 && (!oldest || d.lastActive < oldest.lastActive)) oldest = d;
  if (!oldest) return null;
  s = oldest.slot;
  leave(oldest);
  return s;
}

function leave(d) {
  d.slot.taken = null;
  d.leaving = true;
  d.fadeStart = now();
}

function ensureDevotee(user) {
  let d = devotees.get(user.id);
  if (d) {
    d.name = user.name || d.name;
    if (user.avatar && !d.avatar) d.avatar = loadImg(user.avatar);
    return d;
  }
  if (devotees.size >= maxDevotees + 20) return null;
  const slot = freeSlot();
  if (!slot) return null;
  d = {
    id: user.id, name: user.name || 'Phật tử', avatar: loadImg(user.avatar),
    slot, x: SCENE.entry.x + rand(-20, 20), y: SCENE.entry.y, pose: 'stand', bow: 0,
    tasks: [], task: null, lastActive: now(), bubble: null, aura: 0, tint: rand(-8, 8),
  };
  slot.taken = d.id;
  devotees.set(user.id, d);
  queue(d, walkPath(d, [{ x: SCENE.aisleX + rand(-10, 10), y: slot.y }, { x: slot.x, y: slot.y }]), { type: 'kneel' });
  return d;
}

// pts có thể là hàm (d) => [...] để tính đường đi lúc bắt đầu bước, không phải lúc xếp hàng
const walkPath = (d, pts) => ({ type: 'walk', pts });
const queue = (d, ...tasks) => { d.tasks.push(...tasks); };
const toSlotPath = (d) => [{ x: SCENE.aisleX + rand(-10, 10), y: d.y }, { x: SCENE.aisleX, y: d.slot.y }, { x: d.slot.x, y: d.slot.y }];
const toAislePath = (d, target) => [{ x: SCENE.aisleX + rand(-8, 8), y: d.y }, target];

function updateDevotee(d, t, dt) {
  if (!d.task && d.tasks.length) { d.task = d.tasks.shift(); d.task.start = t; }
  const task = d.task;
  if (task) {
    if (task.type === 'walk') {
      d.pose = 'stand';
      if (typeof task.pts === 'function') task.pts = task.pts(d);
      const target = task.pts[0];
      if (!target) { d.task = null; }
      else {
        const dx = target.x - d.x, dy = target.y - d.y;
        const dist = Math.hypot(dx, dy);
        const speed = 0.38 * dt * persp(d.y);
        if (dist <= speed) { d.x = target.x; d.y = target.y; task.pts.shift(); }
        else { d.x += (dx / dist) * speed; d.y += (dy / dist) * speed; }
        d.walkPhase = (d.walkPhase || 0) + dt / 140;
      }
    } else if (task.type === 'kneel') {
      d.pose = 'kneel'; d.bow = 0; d.task = null;
    } else if (task.type === 'stand') {
      d.pose = 'stand'; d.bow = 0; d.task = null;
    } else if (task.type === 'bow') {
      // lạy: cúi xuống rồi lên, n lần
      d.pose = task.standing ? 'stand' : 'kneel';
      const per = task.per || 1300;
      const k = (t - task.start) / per;
      d.bow = Math.sin(clamp(k % 1, 0, 1) * Math.PI);
      if (task.onEach && Math.floor(k) !== task.last) { task.last = Math.floor(k); task.onEach(d); }
      if (k >= (task.n || 1)) { d.bow = 0; d.task = null; }
    } else if (task.type === 'wait') {
      if (t - task.start >= task.ms) d.task = null;
    } else if (task.type === 'do') {
      task.fn(d); d.task = null;
    }
  }
  if (d.aura > 0) d.aura = Math.max(0, d.aura - dt / 4000);
  if (d.bubble && t > d.bubble.until) d.bubble = null;
}

function drawDevotee(d, t) {
  const s = persp(d.y) * SCENE.figure;
  let alpha = 1;
  if (d.leaving) { alpha = 1 - (t - d.fadeStart) / 1500; if (alpha <= 0) { devotees.delete(d.id); return; } }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(d.x, d.y);
  ctx.scale(s, s);
  if (d.aura > 0) {
    const g = ctx.createRadialGradient(0, -30, 4, 0, -30, 70);
    g.addColorStop(0, `rgba(255,220,120,${0.85 * d.aura})`); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -30, 70, 0, Math.PI * 2); ctx.fill();
  }
  // bóng
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 2, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  const robe = `hsl(${220 + d.tint},16%,${62 + d.tint / 2}%)`;
  const robeDark = `hsl(${220 + d.tint},18%,44%)`;
  const bow = d.bow || 0;
  if (d.pose === 'stand') {
    const bob = d.task?.type === 'walk' ? Math.abs(Math.sin(d.walkPhase || 0)) * 3 : 0;
    // áo tràng dáng đứng
    const g = ctx.createLinearGradient(-20, 0, 20, 0);
    g.addColorStop(0, robeDark); g.addColorStop(0.5, robe); g.addColorStop(1, robeDark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-13, -58 - bob + bow * 14); ctx.lineTo(13, -58 - bob + bow * 14); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill();
    drawHead(0, -68 - bob + bow * 26);
  } else {
    // quỳ: thân thấp, lạy thì cúi rạp
    const h = 38 - bow * 18;
    const g = ctx.createLinearGradient(-22, 0, 22, 0);
    g.addColorStop(0, robeDark); g.addColorStop(0.5, robe); g.addColorStop(1, robeDark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-23, 0); ctx.quadraticCurveTo(-24, -h, -10, -h - 4); ctx.lineTo(10, -h - 4); ctx.quadraticCurveTo(24, -h, 23, 0); ctx.closePath(); ctx.fill();
    drawHead(0, -h - 12 + bow * 4, bow);
  }
  ctx.restore();
}

function drawHead(x, y, bow = 0) {
  ctx.fillStyle = '#1d1512';
  ctx.beginPath(); ctx.ellipse(x, y, 10, 11 - bow * 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 9 + bow * 6, 5.5, 0, Math.PI * 2); ctx.fill(); // búi tóc
  ctx.fillStyle = '#e4c3a3'; ctx.fillRect(x - 4, y + 8 - bow * 3, 8, 4); // gáy
}

function drawTag(d, t) {
  const s = persp(d.y);
  const headY = d.y - (d.pose === 'stand' ? 84 : 58) * s * SCENE.figure;
  const recent = d.showTag;
  if (d.bubble) drawBubble(d.x, headY - (recent ? 38 : 4), d.bubble.text);
  if (!recent) return;
  ctx.save();
  ctx.font = '600 20px "Be Vietnam Pro", system-ui, sans-serif';
  const name = d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name;
  const w = ctx.measureText(name).width + 44, h = 30;
  const x = d.x - w / 2, y = headY - h;
  ctx.globalAlpha = d.leaving ? 0 : 0.92;
  ctx.fillStyle = 'rgba(25,14,10,.78)'; roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(214,168,82,.5)'; ctx.lineWidth = 1; ctx.stroke();
  const av = d.avatar;
  ctx.save(); ctx.beginPath(); ctx.arc(x + 16, y + h / 2, 11, 0, Math.PI * 2); ctx.clip();
  if (av && av.complete && av.naturalWidth) ctx.drawImage(av, x + 5, y + h / 2 - 11, 22, 22);
  else { ctx.fillStyle = '#8a7a6a'; ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(name, x + 32, y + h / 2 + 1);
  ctx.restore();
}

function drawBubble(cx, bottom, text) {
  ctx.save();
  ctx.font = '500 21px "Be Vietnam Pro", system-ui, sans-serif';
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > 200 && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, 18) + '…'; }
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28;
  const h = lines.length * 26 + 16;
  const x = clamp(cx - w / 2, 6, SCENE.W - w - 6), y = bottom - h;
  ctx.fillStyle = 'rgba(30,22,20,.82)'; roundRect(x, y, w, h, 12); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 9 + i * 26));
  ctx.restore();
}

// ---------- Hành động khi nhận sự kiện ----------
const glow = { level: 0 };
let rays = 0;

const ACTIONS = {
  // Dâng hương: lên lư hương, đứng vái 3 lần, khói bốc, về chỗ
  incense(d, count) {
    queue(d, { type: 'stand' }, walkPath(d, (x) => toAislePath(x, { ...SCENE.offerSpot, x: SCENE.offerSpot.x + rand(-16, 16) })));
    queue(d, { type: 'bow', standing: true, n: Math.min(3, Math.max(1, count)), per: 1100, onEach: () => { smoke(10, true); sparkles(SCENE.burner.x, SCENE.burner.y - 50, 8, 30); } });
    queue(d, walkPath(d, toSlotPath), { type: 'kneel' });
  },
  // Lễ Phật: lên bồ đoàn, lạy 3 lạy, hào quang
  bow(d, count) {
    const c = SCENE.cushions[Math.floor(Math.random() * SCENE.cushions.length)];
    queue(d, { type: 'stand' }, walkPath(d, (x) => [{ x: SCENE.aisleX, y: x.y }, { x: SCENE.aisleX, y: c.y + 30 }, c]));
    queue(d, { type: 'do', fn: (x) => { x.aura = 1; } }, { type: 'kneel' });
    queue(d, { type: 'bow', n: Math.min(5, 2 + count), per: 1400, onEach: (x) => { x.aura = 1; sparkles(x.x, x.y - 40, 14, 40); } });
    queue(d, { type: 'stand' }, walkPath(d, (x) => [{ x: SCENE.aisleX, y: c.y + 30 }, { x: SCENE.aisleX, y: x.slot.y }, { x: x.slot.x, y: x.slot.y }]), { type: 'kneel' });
  },
  // Dâng hoa sen: sen bay từ người tặng lên bàn thờ, mưa cánh sen
  lotus(d, count) {
    d.aura = 1;
    lotusFly(d.x, d.y - 60, Math.min(12, 3 + count * 2));
    lotusRain(Math.min(80, 20 + count * 6));
    glow.level = Math.min(1, glow.level + 0.5);
    queue(d, { type: 'bow', n: 3, per: 1300, onEach: (x) => { x.aura = 1; } });
  },
  // Đại lễ: cả điện cùng lạy, ánh sáng toả
  grand(d, count) {
    ACTIONS.lotus(d, count);
    rays = 1;
    glow.level = 1;
    for (const x of devotees.values()) if (!x.leaving && !x.task && x.tasks.length === 0) queue(x, { type: 'wait', ms: rand(0, 400) }, { type: 'bow', n: 3, per: 1500 });
  },
};

function handleEvent(ev) {
  const t = now();
  if (ev.kind === 'blessing') {
    rays = 1; glow.level = Math.min(1, glow.level + 0.6); lotusRain(30);
    toast(`Cả điện đã gửi ${ev.likes.toLocaleString('vi-VN')} tim 🙏`);
    return;
  }
  const d = ensureDevotee(ev.user || {});
  if (!d) return;
  d.lastActive = t;
  if (ev.kind === 'chat') d.bubble = { text: ev.text, until: t + 7000 };
  else if (ev.kind === 'like') hearts(d.x, d.y - 70 * persp(d.y), Math.min(6, Math.ceil(ev.count / 3)));
  else if (ev.kind === 'follow') { d.bubble = { text: '🙏 Đã theo dõi', until: t + 4000 }; sparkles(d.x, d.y - 60, 10, 25); }
  else if (ev.kind === 'share') { d.bubble = { text: '🔗 Đã chia sẻ live', until: t + 4000 }; sparkles(d.x, d.y - 60, 10, 25); }
  else if (ev.kind === 'gift') {
    (ACTIONS[ev.action] || ACTIONS.incense)(d, ev.count || 1);
    showBanner(ev);
  }
}

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
const ICONS = { incense: '🪔', bow: '🙏', lotus: '🪷', grand: '✨' };
let tiers = [
  { minCoins: 1, action: 'incense', label: 'Dâng hương', badge: '1 COIN' },
  { minCoins: 5, action: 'bow', label: 'Lễ Phật', badge: '5 COINS' },
  { minCoins: 10, action: 'lotus', label: 'Hoa sen', badge: '10+ COINS' },
];

function renderCards() {
  $('cards').innerHTML = tiers.filter((x) => !x.hidden).slice(0, 3).map((x) =>
    `<div class="card panel" data-action="${x.action}"><div class="ico">${ICONS[x.action] || '🪷'}</div><div class="coin">${x.badge}</div><div class="lbl">${x.label}</div></div>`).join('');
}

function renderTop(top = []) {
  const rows = [0, 1, 2].map((i) => {
    const d = top[i];
    return d ? `<li><span class="n">${i + 1}</span><span class="nm">${esc(d.name)}</span><span class="c">${d.coins}</span></li>`
      : `<li class="empty"><span class="n">${i + 1}</span><span class="nm">—</span><span class="c"></span></li>`;
  });
  $('top').innerHTML = rows.join('');
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const bannerQ = [];
let bannerBusy = false;
let bannerInit = false;
function showBanner(ev) { bannerQ.push(ev); if (!bannerBusy) nextBanner(); }
function nextBanner() {
  const ev = bannerQ.shift();
  if (!ev) { bannerBusy = false; return; }
  bannerBusy = true;
  $('bWho').textContent = ev.user?.name || 'Phật tử';
  $('bWhat').textContent = ev.label + (ev.count > 1 ? ` ×${ev.count}` : '');
  const b = $('banner'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
  const card = document.querySelector(`.card[data-action="${ev.action}"]`);
  if (card) { card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit'); }
  setTimeout(nextBanner, bannerQ.length > 5 ? 600 : 2200);
}

let toastTimer;
function toast(text) {
  const el = $('toast'); el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function applyState(s) {
  if (s.config) {
    tiers = s.config.giftTiers || tiers;
    maxDevotees = s.config.maxDevotees || maxDevotees;
    renderCards();
    if (!bannerInit && !bannerBusy) { bannerInit = true; $('bWho').textContent = s.config.host || ''; $('bWhat').textContent = s.config.hallName || ''; }
  }
  $('viewers').textContent = `👥 ${Number(s.viewers || 0).toLocaleString('vi-VN')}`;
  $('likes').textContent = `❤️ ${Number(s.likes || 0).toLocaleString('vi-VN')}`;
  renderTop(s.top);
}

// ---------- Vòng vẽ ----------
let last = now();
let smokeAcc = 0;
function frame(t) {
  const dt = Math.min(50, t - last); last = t;
  smokeAcc += dt; if (smokeAcc > 220) { smokeAcc = 0; smoke(1); }
  glow.level = Math.max(0, glow.level - dt / 6000);
  ctx.clearRect(0, 0, SCENE.W, SCENE.H);
  drawBackground(t);
  if (rays > 0) {
    rays = Math.max(0, rays - dt / 5000);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + (i - 4) * 0.16 + Math.sin(t / 1200 + i) * 0.03;
      ctx.fillStyle = `rgba(255,220,140,${0.12 * rays})`;
      ctx.beginPath(); ctx.moveTo(SCENE.buddha.x, SCENE.buddha.y - 100);
      ctx.lineTo(SCENE.buddha.x + Math.cos(a - 0.05) * 1800, SCENE.buddha.y - 100 + Math.sin(a - 0.05) * 1800);
      ctx.lineTo(SCENE.buddha.x + Math.cos(a + 0.05) * 1800, SCENE.buddha.y - 100 + Math.sin(a + 0.05) * 1800);
      ctx.fill();
    }
    ctx.restore();
  }
  const list = [...devotees.values()];
  for (const d of list) updateDevotee(d, t, dt);
  list.sort((a, b) => a.y - b.y);
  for (const d of list) drawDevotee(d, t);
  drawParticles(t);
  // nhãn tên + bong bóng vẽ sau cùng, người mới hoạt động nằm trên
  list.sort((a, b) => b.lastActive - a.lastActive);
  let tags = 0;
  for (const d of list) d.showTag = !d.leaving && (d.task || d.tasks.length > 0 ? tags++ < SCENE.maxTags + 10 : t - d.lastActive < 20000 && tags++ < SCENE.maxTags);
  for (let i = list.length - 1; i >= 0; i--) if (devotees.has(list[i].id)) drawTag(list[i], t);
  requestAnimationFrame(frame);
}
renderCards();
renderTop();
requestAnimationFrame(frame);

// ---------- Kết nối server ----------
function connectWs() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onopen = () => { $('conn').style.display = 'none'; };
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.type === 'event') handleEvent(msg.ev);
    else if (msg.type === 'state') applyState(msg);
  };
  ws.onclose = () => { $('conn').style.display = 'block'; setTimeout(connectWs, 2000); };
}

// ---------- Demo không cần server: overlay.html?demo ----------
const FAKE_NAMES = ['Thảo My', 'Hoàng Dương', 'oanh luu', 'Phúc', 'Thị Lê', 'Li.am', 'Pnthinh', 'Minh Tâm', 'An Nhiên', 'Bảo Ngọc', 'Gia Huy', 'Thanh Tú', 'Kim Chi', 'Đức Anh', 'Hải Yến', 'Quang Vinh', 'Ngọc Hân', 'Trúc Lâm', 'Diệu Linh', 'Văn Khải'];
const FAKE_CHATS = ['Nam Mô A Di Đà Phật', 'A di đà phật 🙏', 'Đi chùa onl nữa hả', 'Cầu cho gia đình bình an', 'Chúc tú mạnh khoẻ', 'Mô Phật', 'Cho đốt 1 cây', 'Con cầu thi đỗ', '🙏🙏🙏', 'Nam mô Quán Thế Âm Bồ Tát'];
const fakeUser = (i = Math.floor(Math.random() * 400)) => ({ id: 'u' + i, name: i < FAKE_NAMES.length ? FAKE_NAMES[i] : FAKE_NAMES[i % FAKE_NAMES.length] + ' ' + i, avatar: '' });
const fakeTop = new Map();

function startDemo() {
  applyState({ viewers: 0, likes: 0, top: [] });
  let likes = 0;
  for (let i = 0; i < 60; i++) setTimeout(() => handleEvent({ kind: 'join', user: fakeUser(i) }), i * 120);
  setInterval(() => {
    const r = Math.random();
    const ids = [...devotees.keys()];
    const known = ids.length ? { ...fakeUser(), id: ids[Math.floor(Math.random() * ids.length)] } : fakeUser();
    if (known.id.startsWith('u')) known.name = fakeUser(Number(known.id.slice(1))).name;
    if (r < 0.3) handleEvent({ kind: 'join', user: fakeUser() });
    else if (r < 0.6) handleEvent({ kind: 'chat', user: known, text: FAKE_CHATS[Math.floor(Math.random() * FAKE_CHATS.length)] });
    else if (r < 0.85) { const c = Math.ceil(rand(1, 15)); likes += c; handleEvent({ kind: 'like', user: known, count: c }); if (Math.floor(likes / 300) > Math.floor((likes - c) / 300)) handleEvent({ kind: 'blessing', likes: Math.floor(likes / 300) * 300 }); }
    else {
      const coins = [1, 1, 1, 5, 5, 10, 30, 100][Math.floor(Math.random() * 8)];
      const tier = [...tiers].sort((a, b) => b.minCoins - a.minCoins).find((x) => coins >= x.minCoins) || tiers[0];
      const action = coins >= 100 ? 'grand' : tier.action;
      const label = coins >= 100 ? 'Đại lễ' : tier.label;
      fakeTop.set(known.id, { name: known.name, coins: (fakeTop.get(known.id)?.coins || 0) + coins });
      handleEvent({ kind: 'gift', user: known, action, label, count: 1, total: coins });
      applyState({ viewers: devotees.size * 7, likes, top: [...fakeTop.values()].sort((a, b) => b.coins - a.coins) });
    }
  }, 700);
}

if (DEMO) startDemo(); else connectWs();
