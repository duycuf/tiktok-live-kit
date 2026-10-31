// Nạp theme từ thư mục themes/<id>/theme.json.

import fs from 'node:fs';
import path from 'node:path';

export function listThemes(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(dir, d.name, 'theme.json')))
    .map((d) => {
      try { const t = JSON.parse(fs.readFileSync(path.join(dir, d.name, 'theme.json'), 'utf8')); return { id: d.name, name: t.name || d.name, description: t.description || '' }; }
      catch { return null; }
    })
    .filter(Boolean);
}

export function loadTheme(dir, id) {
  const ids = listThemes(dir).map((t) => t.id);
  const pick = ids.includes(id) ? id : ids[0];
  if (!pick) throw new Error(`Không có theme nào trong ${dir}`);
  if (pick !== id) console.warn(`[theme] không thấy "${id}", dùng "${pick}"`);
  const t = JSON.parse(fs.readFileSync(path.join(dir, pick, 'theme.json'), 'utf8'));
  return {
    id: pick,
    name: t.name || pick,
    width: t.width || 1080,
    height: t.height || 1920,
    actions: Array.isArray(t.actions) && t.actions.length ? t.actions : [{ id: 'default', label: 'Mặc định' }],
    titles: t.titles || [],
    goals: t.goals || [],
    rules: t.rules || {},
    text: t.text || {},
    settings: Array.isArray(t.settings) ? t.settings : [],
  };
}

/** Giá trị cài đặt của theme: mặc định trong theme.json, ghi đè bằng giá trị đã lưu (chỉ nhận khoá có khai báo). */
export function settingValues(theme, saved = {}) {
  const out = {};
  for (const f of theme.settings) {
    let v = saved[f.id] ?? f.default;
    if (f.type === 'range') v = Math.min(f.max ?? 100, Math.max(f.min ?? 0, Number(v) || 0));
    else if (f.type === 'toggle') v = Boolean(v);
    else if (f.type === 'select') v = (f.options || []).some((o) => o.value === v) ? v : f.default;
    else v = String(v ?? '').slice(0, 500);
    out[f.id] = v;
  }
  return out;
}
