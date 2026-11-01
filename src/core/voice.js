// Câu giọng đọc của theme: chọn mẫu câu theo sự kiện, điền {ten}, {qua}, {lan}, {xu}, {loi}...
// {loi} = bình luận gần nhất của chính người đó (lời nguyện, lời chúc), không có thì lấy câu dự phòng.

const lowerFirst = (s) => (s ? s[0].toLocaleLowerCase('vi') + s.slice(1) : s);
const pick = (list) => (Array.isArray(list) && list.length ? list[Math.floor(Math.random() * list.length)] : '');

/** Tên đọc cho dễ nghe: bỏ ký tự lạ, gạch dưới, chấm, @. */
export const spokenName = (s) => String(s || '').replace(/[_@.]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'bạn';

export function createVoice() {
  const lastWords = new Map(); // id -> { text, at }

  function remember(userId, text) {
    const t = String(text || '').trim();
    if (t.length >= 6) lastWords.set(userId, { text: t.slice(0, 120), at: Date.now() });
    if (lastWords.size > 2000) lastWords.delete(lastWords.keys().next().value);
  }

  /** Câu đọc cho một sự kiện, hoặc '' nếu theme không có mẫu cho sự kiện đó. */
  function line(voiceCfg = {}, ev) {
    if (!voiceCfg.enabled) return '';
    const kind = ev.kind === 'gift' ? (ev.big && voiceCfg.bigGift?.length ? 'bigGift' : 'gift')
      : ev.kind === 'command' && ev.draw ? (ev.draw.again && voiceCfg.drawAgain?.length ? 'drawAgain' : 'draw')
      : ev.kind;
    if (kind === 'gift' && (ev.total || 0) < (voiceCfg.giftMinCoins ?? 1)) return '';
    const template = pick(voiceCfg[kind]);
    if (!template) return '';
    const u = ev.user || {};
    const said = lastWords.get(u.id);
    const loi = said && Date.now() - said.at < 120000 ? said.text : pick(voiceCfg.fallbackWords);
    return fill(template, {
      ten: spokenName(u.name),
      qua: ev.gift?.name || ev.label || 'quà',
      lan: ev.count > 1 ? `, ${ev.count} lần` : '',
      xu: ev.total ?? '',
      hanh_dong: lowerFirst(ev.label || ''),
      danh_hieu: ev.title || u.title || '',
      muc_tieu: ev.label || '',
      gia_tri: ev.value ?? '',
      loi,
      // bốc thăm: mọi trường của lá thăm thành biến ({so}, {loai}, {tho}...), mảng nối bằng dấu phẩy
      ...Object.fromEntries(Object.entries(ev.draw || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])),
    });
  }

  return { remember, line };
}

/** Điền {khoa}; khoá không có thì bỏ trống. Gọn dấu câu thừa sau khi điền. */
export function fill(template, vars) {
  return String(template)
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString())
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/([.,!?]){2,}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
