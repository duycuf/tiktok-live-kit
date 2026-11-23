// Draws for chat commands (fortune sticks, card pulls, divination...). Declared by the theme in theme.json:
//   "draws": { "loi-chuc": { "perDay": true, "items": [ { "title": "...", "text": "..." } ] } }
// then point a chat command at it: "chatCommands": [{ "keywords": ["rút thăm"], "action": "draw", "draw": "loi-chuc" }].
// perDay (default): one fixed result per person per day; asking again returns the same one (with the again flag).

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export function createDraws() {
  const given = new Map(); // person + day + draw set key → drawn item

  function pick(draws, name, userId, now = new Date()) {
    const d = draws?.[name];
    const items = Array.isArray(d?.items) ? d.items : [];
    if (!items.length) return null;
    const day = now.toLocaleDateString('sv-SE');
    const key = `${userId}|${day}|${name}`;
    const i = d.perDay === false ? Math.floor(Math.random() * items.length) : hash(key) % items.length;
    const again = d.perDay !== false && given.has(key);
    given.set(key, true);
    if (given.size > 5000) given.delete(given.keys().next().value);
    return { name, n: i + 1, again, ...items[i] };
  }

  return { pick };
}
