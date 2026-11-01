// Bảng điều khiển chung: kết nối live, Test Lab, chỉnh luật, xếp hạng. Tự đọc theme đang chạy.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

let ws;
let theme = null;
let rules = null;
let gifts = [];
const send = (m) => ws?.readyState === 1 && ws.send(JSON.stringify(m));

$('ovUrl').textContent = location.origin + '/overlay';
$('copyOv').onclick = () => navigator.clipboard?.writeText(location.origin + '/overlay');

// ---------- Kết nối live ----------
$('btnConnect').onclick = () => send({ type: 'connect', username: $('user').value, provider: $('provider').value });
$('btnStop').onclick = () => send({ type: 'disconnect' });
$('themeSel').onchange = () => send({ type: 'setTheme', id: $('themeSel').value });
$('btnReset').onclick = () => { if (confirm('Bắt đầu phiên mới? Bảng xếp hạng và số liệu phiên này sẽ về 0 (tải CSV trước nếu cần).')) send({ type: 'reset' }); };

const STATE_LABEL = { idle: 'Chưa kết nối', connecting: 'Đang kết nối…', reconnecting: 'Đang thử lại…', connected: 'Đã kết nối' };
const PROVIDER_LABEL = { tikfinity: 'TikFinity', connector: 'trực tiếp' };

function renderState(s) {
  const live = s.live || {};
  $('dot').className = 'dot ' + (live.state || 'idle');
  $('statusText').textContent = (STATE_LABEL[live.state] || live.state) + (live.provider ? ` · ${PROVIDER_LABEL[live.provider] || live.provider}` : '') + (live.message ? ` · ${live.message}` : '');
  $('lastEv').textContent = s.lastEventAgo != null ? `· sự kiện cuối ${Math.round(s.lastEventAgo / 1000)}s trước` : '';
  const t = s.totals || {};
  $('stats').innerHTML = [['Đang xem', s.viewers], ['Vào sân', t.joins], ['Tim', t.likes], ['Xu', t.coins], ['Lượt quà', t.gifts], ['Bình luận', t.chats], ['Theo dõi', t.follows]]
    .map(([k, v]) => `<div><b>${fmt(v)}</b>${k}</div>`).join('');
  $('top').innerHTML = (s.top || []).map((p) => `<li>${esc(p.name)}<span class="t">${esc(p.title)}</span><span class="c">${fmt(p.coins)}</span></li>`).join('') || '<span class="muted">Chưa có ai tặng quà</span>';
  $('goals').innerHTML = (s.goals || []).map((g) => `<div class="goal">${esc(g.label)}: ${fmt(g.value)} / ${fmt(g.target)}<div class="bar"><div style="width:${Math.round(g.progress * 100)}%"></div></div></div>`).join('') || '<span class="muted">Theme không đặt mục tiêu</span>';
  if (!s.demo) document.querySelectorAll('[data-rate]').forEach((b) => b.classList.toggle('on', b.dataset.rate === '0'));
}

// ---------- Test Lab ----------
const SIMS = [
  ['+1 người vào', { kind: 'member' }], ['+20 người vào', { kind: 'member', times: 20 }], ['Bình luận', { kind: 'chat' }],
  ['Thả tim', { kind: 'like' }], ['Theo dõi', { kind: 'follow' }], ['Chia sẻ', { kind: 'share' }],
  ['Quà 1 xu', { kind: 'gift', arg: 1 }], ['Quà 5 xu', { kind: 'gift', arg: 5 }], ['Quà 10 xu', { kind: 'gift', arg: 10 }],
  ['Combo 1 xu ×10', { kind: 'gift', arg: 1, arg2: 10 }], ['Quà 100 xu', { kind: 'gift', arg: 100 }],
];
$('simRow').innerHTML = SIMS.map(([label], i) => `<button data-sim="${i}">${label}</button>`).join('');
$('simRow').onclick = (e) => {
  const sim = SIMS[e.target.dataset.sim]?.[1];
  if (!sim) return;
  for (let i = 0; i < (sim.times || 1); i++) setTimeout(() => send({ type: 'sim', ...sim }), i * 80);
};
$('btnVoice').onclick = () => send({ type: 'testVoice', text: $('voiceText').value });
$('btnPeriodic').onclick = () => send({ type: 'periodicNow' });
document.querySelectorAll('[data-rate]').forEach((b) => b.onclick = () => {
  document.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('on', x === b));
  send({ type: 'demo', rate: Number(b.dataset.rate) });
});

function renderActions() {
  $('actionRow').innerHTML = theme.actions.map((a) => `<button data-action="${esc(a.id)}" title="${esc(a.description || '')}">${a.icon || ''} ${esc(a.label)}</button>`).join('')
    + '<label style="flex-direction:row;align-items:center"><input type="checkbox" id="bigTest"> quà lớn</label>';
  $('actionRow').onclick = (e) => { const id = e.target.closest('[data-action]')?.dataset.action; if (id) send({ type: 'test', action: id, big: $('bigTest').checked }); };
}

// ---------- Luật ----------
const actionOptions = (sel) => theme.actions.map((a) => `<option value="${esc(a.id)}"${a.id === sel ? ' selected' : ''}>${a.icon || ''} ${esc(a.label)}</option>`).join('');
const del = '<td><button class="ghost sm" data-del>✕</button></td>';

function rowTier(t = {}) { return `<tr><td class="n"><input type="number" min="1" data-k="minCoins" value="${t.minCoins || 1}"></td><td><select data-k="action">${actionOptions(t.action)}</select></td><td><input data-k="label" value="${esc(t.label)}"></td>${del}</tr>`; }
function rowOverride(o = {}) { return `<tr><td class="n"><input data-k="giftId" value="${esc(o.giftId)}"></td><td><input data-k="names" value="${esc((o.names || []).join(', '))}"></td><td><select data-k="action">${actionOptions(o.action)}</select></td><td><input data-k="label" value="${esc(o.label)}"></td>${del}</tr>`; }
function rowCommand(c = {}) {
  return `<tr><td><input data-k="keywords" value="${esc((c.keywords || []).join(', '))}"></td><td><select data-k="match"><option value="exact"${c.match !== 'contains' ? ' selected' : ''}>đúng cả câu</option><option value="contains"${c.match === 'contains' ? ' selected' : ''}>có chứa</option></select></td><td><select data-k="action">${actionOptions(c.action)}</select></td><td><input data-k="label" value="${esc(c.label)}"></td><td class="n"><input type="number" min="0" data-k="cooldown" value="${Math.round((c.cooldownMs || 0) / 1000)}"></td>${del}</tr>`;
}

function renderRules() {
  $('joinMode').value = rules.joinMode;
  $('joinKeywords').value = rules.joinKeywords.join(', ');
  $('bigGiftCoins').value = rules.bigGiftCoins;
  $('tiers').innerHTML = rules.giftTiers.map(rowTier).join('');
  $('overrides').innerHTML = rules.giftOverrides.map(rowOverride).join('');
  $('commands').innerHTML = rules.chatCommands.map(rowCommand).join('');
}

function renderCatalog() {
  $('catalog').innerHTML = '<option value="">+ Chọn từ quà đã gặp trên live…</option>' +
    gifts.map((g) => `<option value="${esc(g.id)}">${esc(g.name)} · ${g.coins} xu · ID ${esc(g.id)}</option>`).join('');
}

const rowsOf = (id) => [...$(id).querySelectorAll('tr')].map((tr) => Object.fromEntries([...tr.querySelectorAll('[data-k]')].map((el) => [el.dataset.k, el.value])));

function collectRules() {
  return {
    joinMode: $('joinMode').value,
    joinKeywords: $('joinKeywords').value,
    bigGiftCoins: Number($('bigGiftCoins').value),
    giftTiers: rowsOf('tiers').map((r) => ({ ...r, minCoins: Number(r.minCoins) })),
    giftOverrides: rowsOf('overrides'),
    chatCommands: rowsOf('commands').map((r) => ({ ...r, cooldownMs: Number(r.cooldown) * 1000 })),
  };
}

document.addEventListener('click', (e) => { if (e.target.matches('[data-del]')) e.target.closest('tr').remove(); });
$('addTier').onclick = () => $('tiers').insertAdjacentHTML('beforeend', rowTier({ action: theme.actions[0]?.id }));
$('addOverride').onclick = () => $('overrides').insertAdjacentHTML('beforeend', rowOverride({ action: theme.actions[0]?.id }));
$('addCommand').onclick = () => $('commands').insertAdjacentHTML('beforeend', rowCommand({ action: theme.actions[0]?.id }));
$('catalog').onchange = () => {
  const g = gifts.find((x) => x.id === $('catalog').value);
  if (g) $('overrides').insertAdjacentHTML('beforeend', rowOverride({ giftId: g.id, names: [g.name], action: theme.actions[0]?.id, label: g.name }));
  $('catalog').value = '';
};
$('saveRules').onclick = () => { send({ type: 'saveRules', rules: collectRules() }); $('rulesMsg').textContent = 'Đã lưu ✓'; setTimeout(() => ($('rulesMsg').textContent = ''), 2500); };
$('resetRules').onclick = () => { if (confirm('Bỏ luật đã chỉnh, dùng lại luật mặc định của theme?')) send({ type: 'resetRules' }); };

// ---------- Cài đặt theme ----------
function renderSettings(values, keepFocus = false) {
  const fields = theme.settings || [];
  $('settingsBox').hidden = !fields.length;
  if (keepFocus && $('settings').contains(document.activeElement)) return;
  $('settings').innerHTML = fields.map((f) => {
    const v = values[f.id];
    if (f.type === 'toggle') return `<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-set="${esc(f.id)}"${v ? ' checked' : ''}> ${esc(f.label)}</label>`;
    if (f.type === 'select') return `<label>${esc(f.label)}<select data-set="${esc(f.id)}">${(f.options || []).map((o) => `<option value="${esc(o.value)}"${o.value === v ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    if (f.type === 'range') return `<label>${esc(f.label)} <output>${v}</output><input type="range" data-set="${esc(f.id)}" min="${f.min ?? 0}" max="${f.max ?? 100}" step="${f.step ?? 1}" value="${v}"></label>`;
    return `<label>${esc(f.label)}<input data-set="${esc(f.id)}" value="${esc(v)}"></label>`;
  }).join('');
}
let settingsTimer;
$('settings').addEventListener('input', (e) => {
  const el = e.target.closest('[data-set]');
  if (!el) return;
  if (el.type === 'range') el.previousElementSibling.textContent = el.value;
  const value = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => send({ type: 'saveSettings', values: { [el.dataset.set]: value } }), 150);
});

// ---------- Nhật ký ----------
function log(text) {
  const el = document.createElement('div');
  el.textContent = new Date().toLocaleTimeString('vi-VN') + '  ' + text;
  $('log').prepend(el);
  while ($('log').children.length > 300) $('log').lastChild.remove();
}
function describe(ev) {
  const n = ev.user?.name || '';
  switch (ev.kind) {
    case 'join': return `${n} vào sân`;
    case 'chat': return `${n}: ${ev.text}`;
    case 'gift': return `${ev.test ? '[thử] ' : ''}${n} tặng ${ev.gift?.name} ×${ev.count} (${ev.total} xu) → ${ev.label}${ev.big ? ' · QUÀ LỚN' : ''}`;
    case 'command': return `${n} gõ lệnh "${ev.text}" → ${ev.label || ev.action}`;
    case 'follow': return `${n} theo dõi`;
    case 'share': return `${n} chia sẻ`;
    case 'title': return `${n} lên danh hiệu ${ev.title}`;
    case 'goal': return `🎯 Đạt mục tiêu ${ev.label}: ${fmt(ev.value)}`;
    case 'streamEnd': return 'Buổi live đã kết thúc';
    default: return null;
  }
}

// ---------- WebSocket ----------
function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onopen = () => send({ type: 'hello', role: 'control' });
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.type === 'init') {
      const changed = theme && theme.id !== msg.theme.id;
      theme = msg.theme; rules = msg.rules; gifts = msg.gifts || [];
      document.title = `${theme.name} · TikTok Live Kit`;
      $('themeSel').innerHTML = msg.themes.map((t) => `<option value="${esc(t.id)}"${t.id === theme.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
      $('provider').value = msg.config.provider;
      if (!$('user').value) $('user').value = msg.config.tiktokUsername;
      renderActions(); renderRules(); renderCatalog(); renderState(msg.state); renderSettings(msg.settings || {});
      if (changed) setTimeout(() => ($('preview').src = '/overlay?quiet&mute'), 300);
    } else if (msg.type === 'state') renderState(msg);
    else if (msg.type === 'rules') { rules = msg.rules; renderRules(); }
    else if (msg.type === 'settings') renderSettings(msg.values, true);
    else if (msg.type === 'gifts') { gifts = msg.gifts; renderCatalog(); log('Gặp quà mới, đã thêm vào danh sách quà'); }
    else if (msg.type === 'event' && msg.ev.kind !== 'like') { const t = describe(msg.ev); if (t) log(t); }
    else if (msg.type === 'error') log('Lỗi: ' + msg.message);
  };
  ws.onclose = () => { $('statusText').textContent = 'Mất kết nối tới server, đang nối lại…'; $('dot').className = 'dot'; setTimeout(connect, 1500); };
}
connect();
