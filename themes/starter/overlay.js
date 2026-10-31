// Theme mẫu: mỗi người xem là một avatar trên sân. Đọc file này để biết cách viết theme mới.
// Lõi đã lo kết nối, luật quà, xếp hạng; theme chỉ cần nghe sự kiện và vẽ.

const $ = (id) => document.getElementById(id);
const crowd = $('crowd');
const players = new Map(); // id -> phần tử
const MAX = 60;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

Live.stage($('stage'));

function avatarHtml(user) {
  return user.avatar ? `<img src="${esc(user.avatar)}" referrerpolicy="no-referrer" alt="">` : '<div class="av"></div>';
}

// Vị trí ngẫu nhiên trên sân; quá MAX người thì người cũ nhất rời sân
function addPlayer(user) {
  let el = players.get(user.id);
  if (el) { el.classList.toggle('vip', user.rank > 0); return el; }
  if (players.size >= MAX) { const [oldId, oldEl] = players.entries().next().value; oldEl.remove(); players.delete(oldId); }
  el = document.createElement('div');
  el.className = 'p';
  el.innerHTML = `${avatarHtml(user)}<div class="nm">${esc(user.name)}</div>`;
  el.style.left = Math.random() * (crowd.clientWidth - 96) + 'px';
  el.style.top = Math.random() * (crowd.clientHeight - 120) + 'px';
  crowd.appendChild(el);
  players.set(user.id, el);
  return el;
}

function flash(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

function bubble(el, text) {
  el.querySelector('.bubble')?.remove();
  const b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = text;
  el.appendChild(b);
  setTimeout(() => b.remove(), 5000);
}

function hearts(el, n) {
  for (let i = 0; i < Math.min(n, 6); i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = '❤️';
    h.style.left = el.offsetLeft + 30 + Math.random() * 40 + 'px';
    h.style.top = el.offsetTop + 'px';
    h.style.animationDelay = i * 0.1 + 's';
    crowd.appendChild(h);
    setTimeout(() => h.remove(), 2000);
  }
}

function confetti(n = 80) {
  const colors = ['#ff7cd1', '#7c83ff', '#ffd34d', '#5ef0c0', '#fff'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 1080 + 'px';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2 + Math.random() * 2 + 's';
    c.style.animationDelay = Math.random() * 0.8 + 's';
    $('stage').appendChild(c);
    setTimeout(() => c.remove(), 5000);
  }
}

// Màn "tâm điểm" chạy lần lượt, không chồng lên nhau
const spotQueue = [];
function spotlight(ev) {
  spotQueue.push(ev);
  if (spotQueue.length === 1) nextSpot();
}
function nextSpot() {
  const ev = spotQueue[0];
  if (!ev) return;
  $('spotAv').innerHTML = avatarHtml(ev.user);
  $('spotText').textContent = `${ev.user.name} · ${ev.label}${ev.count > 1 ? ' ×' + ev.count : ''}`;
  $('spot').classList.add('on');
  confetti(120);
  setTimeout(() => { $('spot').classList.remove('on'); spotQueue.shift(); setTimeout(nextSpot, 300); }, 4000);
}

let toastTimer;
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
}

// Mỗi action khai báo trong theme.json cần một hàm ở đây
const ACTIONS = {
  pop: (el) => flash(el, 'pop'),
  confetti: (el) => { flash(el, 'pop'); confetti(); },
  spotlight: (el, ev) => spotlight(ev),
  wave: (el) => flash(el, 'wave'),
};

// ---------- Sự kiện từ lõi ----------
Live.on('ready', ({ theme, players: list }) => {
  $('title').textContent = theme.text.title || theme.name;
  for (const p of list.slice(0, MAX).reverse()) if (p.isPlayer) addPlayer(p);
});
Live.on('join', (ev) => addPlayer(ev.user));
Live.on('chat', (ev) => { if (ev.user.isPlayer) bubble(addPlayer(ev.user), ev.text); });
Live.on('like', (ev) => { if (ev.user.isPlayer) hearts(addPlayer(ev.user), Math.ceil(ev.count / 3)); });
Live.on('follow', (ev) => bubble(addPlayer(ev.user), '➕ Đã theo dõi'));
Live.on('share', (ev) => bubble(addPlayer(ev.user), '🔗 Đã chia sẻ'));
Live.on('gift', (ev) => { const el = addPlayer(ev.user); (ACTIONS[ev.action] || ACTIONS.pop)(el, ev); });
Live.on('command', (ev) => { const el = addPlayer(ev.user); ACTIONS[ev.action]?.(el, ev); });
Live.on('title', (ev) => toast(`${ev.user.name} lên ${ev.title}!`));
Live.on('goal', (ev) => { toast(`🎯 ${ev.label}: ${ev.value}`); confetti(); });
Live.on('reset', () => { crowd.innerHTML = ''; players.clear(); });
Live.on('state', (s) => {
  $('top').innerHTML = (s.top || []).slice(0, 3).map((p) => `${p.rank}. ${esc(p.name)} · ${p.coins}`).join('<br>') || '—';
  const g = s.goals?.[0];
  if (g) {
    $('goalLabel').textContent = g.label;
    $('goalText').textContent = `${g.value} / ${g.target}`;
    $('goalFill').style.width = Math.round(g.progress * 100) + '%';
  }
});
