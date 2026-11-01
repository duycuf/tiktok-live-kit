# Changelog

**English** | [Tiếng Việt](CHANGELOG.vi.md)

## Unreleased

- Voice: greetings and comment read-outs are no longer dropped while fixed lines are pre-rendered in the background.
- Docs in English, Vietnamese versions in `*.vi.md`.

## 1.0.0 (2026-11-01)

First shared release.

- **Live sources**: TikFinity Desktop, direct connection (`tiktok-live-connector`), demo; auto source selection, auto reconnect, silence watch.
- **Core**: dedupe, gift combos, gift rules (ID → name → price tier), chat commands with cooldowns, join keywords, leaderboard, titles, goals, session persistence, CSV export.
- **Control panel**: connection, Test Lab (fake viewers, gifts, combos, auto mode), rule editing on the web, theme switching while running.
- **Overlay SDK**: perspective crowd (aisle, seats, obstacles, front rows always filled with `fill`), characters from an animation sheet (directional walks, poses, moves), effects (particles, fireworks, rays, image / GIF / video / Lottie), sounds with cooldowns, camera, built-in HUD, safe zones `?safe`, `fps` cap, auto reload when stuck.
- **JSON actions**: each gift tier / chat command is a list of steps, no code needed; `theme.js` for custom parts.
- **Vietnamese voice**: gift thanks, join greetings, comment read-outs (profanity and link filtering), per-command lines, priority for important lines, pre-rendered fixed lines, Windows voice fallback.
- **Automatic content**: chat draws (`draws`), periodic announcements (`periodic`), interaction prompts when chat is quiet (`prompts`).
- **Theme in its own repo**: `KIT_THEMES_DIR`, `KIT_DATA_DIR`, `KIT_CONFIG`.
- **Asset tools**: `pnpm assets:cut` (cuts a green-screen character sheet, auto-detects each pose), `pnpm assets:alpha` (black background → transparent, removes corner marks).
- **Docs**: `docs/THEME.md`, `docs/ASSETS-GUIDE.md`, `docs/GO-LIVE.md`, `AGENTS.md` for AI coding agents.
