// Theme voice lines: pick a template per event and fill in {ten}, {qua}, {lan}, {xu}, {loi}...
// {loi} = that person's own latest comment (a prayer, a wish); falls back to a backup phrase if there is none.

const lowerFirst = (s) => (s ? s[0].toLocaleLowerCase('vi') + s.slice(1) : s);
const pick = (list) => (Array.isArray(list) && list.length ? list[Math.floor(Math.random() * list.length)] : '');

/** Name made easy to read aloud: strip odd characters, underscores, dots, @. */
export const spokenName = (s) => String(s || '').replace(/[_@.]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'bạn';

// Comments read aloud on live: skip links, profanity, and messages that are only emoji / numbers
const BLOCK = ['đm', 'dm', 'đmm', 'dmm', 'đcm', 'dcm', 'đéo', 'deo', 'địt', 'dit', 'lồn', 'lon', 'cặc', 'cac', 'buồi', 'đĩ', 'vcl', 'vl', 'vkl', 'clm', 'cmm', 'fuck', 'shit', 'đụ', 'du ma', 'đù má'];
const plainWords = (s) => ` ${String(s).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
export function readableChat(text, extraBlock = []) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length < 2 || t.length > 90) return '';
  if (/https?:|www\.|\.(com|vn|net|me)\b|@\w/i.test(t)) return '';
  if (!/\p{L}{2,}/u.test(t)) return '';
  const w = plainWords(t);
  if ([...BLOCK, ...extraBlock].some((b) => w.includes(` ${String(b).toLowerCase()} `))) return '';
  return t.replace(/[^\p{L}\p{N}\s.,!?'"-]/gu, '').trim();
}

export function createVoice() {
  const lastWords = new Map(); // id -> { text, at }
  const lastAt = new Map(); // line type -> last time spoken (spaced out per voice.cooldown)

  function remember(userId, text) {
    const t = String(text || '').trim();
    if (t.length >= 6) lastWords.set(userId, { text: t.slice(0, 120), at: Date.now() });
    if (lastWords.size > 2000) lastWords.delete(lastWords.keys().next().value);
  }

  /** The line for an event, or '' if the theme has no template for that event. */
  function line(voiceCfg = {}, ev) {
    if (!voiceCfg.enabled) return '';
    const kind = ev.kind === 'gift' ? (ev.big && voiceCfg.bigGift?.length ? 'bigGift' : 'gift')
      : ev.kind === 'command' && ev.draw ? (ev.draw.again && voiceCfg.drawAgain?.length ? 'drawAgain' : 'draw')
      : ev.kind === 'command' && voiceCfg[`command:${ev.action}`] ? `command:${ev.action}` // a dedicated line per chat command
      : ev.kind;
    if (kind === 'gift' && (ev.total || 0) < (voiceCfg.giftMinCoins ?? 1)) return '';
    let chat = '';
    if (kind === 'chat') {
      if (ev.command) return ''; // game command: spoken with that command's own line
      chat = readableChat(ev.text, voiceCfg.blockWords);
      if (!chat) return '';
    }
    const cd = voiceCfg.cooldown?.[kind];
    if (cd && Date.now() - (lastAt.get(kind) || 0) < cd) return '';
    const template = pick(voiceCfg[kind]);
    if (!template) return '';
    if (cd) lastAt.set(kind, Date.now());
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
      chat,
      // draws: every field of the draw item becomes a variable ({so}, {loai}, {tho}...), arrays joined with commas
      ...Object.fromEntries(Object.entries(ev.draw || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])),
    });
  }

  return { remember, line };
}

/** Fill in {key}; missing keys become empty. Tidy up leftover punctuation after filling. */
export function fill(template, vars) {
  return String(template)
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString())
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/([.,!?]){2,}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
