# Making a theme

**English** | [Tiếng Việt](THEME.vi.md)

A theme is a folder: images and sounds in `assets/`, scene layout in `scene.json`, content and rules in `theme.json`, custom parts (if needed) in `theme.js`. The core handles the live connection, dedupe, gift combos, gift rules, leaderboard, titles, goals and voice. Most themes **need no code**: just JSON.

```
themes/<theme-name>/
  index.html     loads the SDK (copy from themes/template, no edits needed)
  theme.json     actions, gift rules, chat commands, titles, goals, voice, characters, HUD
  scene.json     background, perspective, floor, aisle, seats, anchor points, ambient effects
  theme.js       (optional) custom actions / HUD
  assets/        background.jpg, characters, effects, music/*.mp3, sfx/<name>.mp3
```

## Quick start

1. Copy `themes/template` to `themes/<new-name>` (English, kebab-case). To keep the theme in its own repo, see "Keeping a theme in its own repo" in the README.
2. Put the background in `assets/`, open the overlay with `?scene` to see the measuring grid, then tune `scene.json` until people stand on the floor at the right size.
3. Edit `theme.json`: actions per gift tier, chat commands, voice.
4. Open the control panel, pick the theme, click the effect test buttons, turn on the demo to see a crowded scene.

Folders starting with `_` or `.` are ignored (use them for drafts).

## Checking the overlay

| URL | Purpose |
|---|---|
| `/overlay` | The page for OBS / LIVE Studio (1080 × 1920) |
| `/overlay?mute` | Muted (preview inside the control panel) |
| `/overlay?scene` | Draws the measuring grid: horizon, floor, aisle, obstacles, seats, anchor points |
| `/overlay?safe` | Shades in red the areas covered by TikTok's UI or cropped on tall phones (`Kit.safe`) |

Safe zones on the 1080 × 1920 frame: top 240px (channel name, viewers), 100px on each side (cropped on tall screens), the left half from y 1250 down (comments box), the bottom from y 1760 (input box, gift button). On a phone, text shrinks to about 1/3: keep readable text at 20px or more.

## scene.json

```jsonc
{
  "background": "assets/background.jpg",       // image / video (mp4, webm) / gif
  "horizonY": 700,                             // horizon: people get smaller the closer they are to it
  "person": {
    "refY": 1000, "refHeight": 60,             // at height refY a person is refHeight px tall
    "exponent": 0.45,                          // perspective steepness
    "idleStyle": "stand",                      // placeholder shape before character art exists: stand | kneel
    "cushion": { "width": 0.5, "depth": 0.32, "color": "#6e170f", "light": "#b8392a" }  // cushion under kneeling / seated people
  },
  "floor": { "top": 1040, "bottom": 1640, "left": 30, "right": 1050 },   // floor area for the crowd
  "aisle": { "x": 540, "half": [[1000, 34], [1900, 100]], "lane": 90 },  // center aisle (half width by depth), walking lane
  "spacing": { "col": 0.8, "row": 0.4 },       // spacing between people, in person heights
  "obstacles": [{ "x0": 0, "x1": 105, "y0": 0, "y1": 1130 }],            // pillar bases, tables... no people here
  "seats": [[440, 980], [640, 980]],           // honor seats for top gifters
  "points": { "stage": [540, 930], "focus": [540, 600], "entry": [540, 2000] },  // anchor points for actions, camera
  "emitters": [{ "preset": "smoke", "at": "stage", "every": 90 }],      // continuous effects (at: anchor, [x, y], or x / y)
  "glows": [[300, 760, 40]],                   // flickering lights [x, y, radius] (candles, lamps)
  "sunrays": { "from": 1060 },                 // soft diagonal sun rays
  "fill": { "rows": 2 },                       // always fill the first N rows with unnamed people (not counted as viewers)
  "maxTags": 8,                                // max name tags at once (besides top 3); tags never overlap
  "fps": 30                                    // frame cap, leaves CPU for the streaming app
}
```

The crowd spreads out on its own: sparse when the room is empty, denser when busy; when there is no room left, the person silent the longest leaves.

## theme.json

### Actions: lists of JSON steps

```jsonc
"actions": [
  {
    "id": "small", "label": "Small gift", "icon": "assets/icon.png", "card": "1 coin",
    "steps": [
      { "walk": "stage" },                                   // walk to an anchor / "home" back to own spot
      { "pose": "stand" },
      { "play": "bow", "times": 3, "each": [{ "sound": "bell" }] },   // play an animation n times ("count" = gift count)
      { "fx": "emit", "preset": "spark", "at": "head", "count": 12 },
      { "fx": "halo", "at": "focus", "image": "assets/fx/halo.png" },
      { "fx": "text", "at": "head", "text": "+{total}" },
      { "camera": "person", "zoom": 1.6 }, { "spotlight": true }, { "aura": 1 }, { "boost": 1.3 },
      { "say": "Thanks {ten}!" }, { "toast": "{ten} just sent {qua}" },
      { "crowd": [{ "play": "bow" }] },                      // the whole crowd does it
      { "js": "myAction" }                                   // calls Kit.action('myAction', fn) in theme.js
    ]
  }
]
```

Effects (`fx`): `emit` (smoke heart spark petal confetti snow leaf bubble firefly ember coin star), `rain`, `halo`, `rays`, `pillar`, `text`, `fly`, `sprite`, `fireworks`, `flash`, `shake`. Pass your own image with `"image"`.
Step text accepts `{ten}` (name) `{qua}` (gift) `{count}` `{total}` `{label}`.

### Rules

```jsonc
"rules": {
  "joinMode": "all",                         // "all": anyone who interacts enters; "keyword": must chat a keyword
  "joinKeywords": ["hello"],
  "bigGiftCoins": 100,                       // from this many coins "bigGift" also runs
  "giftTiers": [{ "minCoins": 1, "action": "small", "label": "Small gift" }],   // by the price of ONE gift
  "giftOverrides": [{ "giftId": "5655", "names": ["rose"], "action": "small" }],
  "chatCommands": [{ "keywords": ["draw"], "match": "contains", "action": "draw", "draw": "fortune", "label": "draw a card", "cooldownMs": 30000 }]
},
"bigGift":   { "steps": [...] },              // extra steps for big gifts
"reactions": { "like": [...], "chat": [...], "follow": [...], "share": [...], "title": [...], "goal": [...] },
"titles": [{ "minCoins": 200, "label": "Guardian", "aura": 0.45 }],  // aura: permanent glow by title (used in theme.js)
"goals":  [{ "id": "likes", "metric": "likes", "label": "Likes", "every": 1000 }]
```

Gift matching order: **gift ID** → **name / alias** (accent-insensitive) → **price tier**. Rules can be edited in the control panel and are saved to `data/rules-<id>.json`.

### Chat draws (fortune sticks, card draws, readings...)

```jsonc
"draws": { "fortune": { "perDay": true, "items": [{ "title": "Card 1 · Great luck", "text": "Everything goes your way today." }] } }
```

A chat command with `"draw": "fortune"` makes the server draw one item (one fixed item per person per day with `perDay`). The overlay receives it as `ev.draw` (the built-in HUD shows its `title` and `text` fields), and the voice uses the `voice.draw` template, where every item field is a variable (`{title}`, `{text}`…).

### Voice

```jsonc
"voice": {
  "enabled": true, "voice": "vi-VN-NamMinhNeural",            // or vi-VN-HoaiMyNeural
  "gift": ["Cảm ơn {ten} đã tặng {qua}{lan}. {loi}."], "bigGift": [...],
  "join": ["Chào {ten}!"], "chat": ["{ten} nhắn: {chat}."],   // comments are filtered for profanity, links, emoji
  "follow": [...], "title": [...], "goal": [...],
  "command:pray": ["{ten} cầu nguyện: {loi}."],               // a line per chat command (by action id)
  "draw": ["{ten} rút được {title}. {text}"], "drawAgain": [...],
  "cooldown": { "join": 18000, "chat": 10000 },               // gap per line kind (ms)
  "delay": { "draw": 2300 },                                  // wait so the voice matches when the visual appears
  "fallbackWords": ["Chúc gia đình bình an"],                // {loi} when the person hasn't chatted yet
  "fallback": "local"                                         // (optional) if the service fails, use Windows' built-in Vietnamese voice
}
```

Variables: `{ten}` name, `{qua}` gift, `{lan}` ", N times", `{xu}` coins, `{hanh_dong}` action label, `{danh_hieu}` title, `{muc_tieu}` goal, `{gia_tri}` goal value, `{loi}` the person's last words, `{chat}` the comment.

The voice uses Microsoft's free TTS service (needs internet, sometimes slow); only the two Vietnamese voices are supported. Gift, draw and title lines go first; greetings and comment read-outs only play when the queue is free. Fixed lines (draws, periodic chants, prompts) are **pre-rendered and cached in `data/tts-cache`**: next time they play instantly.

### Automatic content

```jsonc
"periodic": { "everyMinutes": 3, "quietSeconds": 0, "title": "ANNOUNCEMENT", "items": ["..."] },  // quietSeconds > 0: only when quiet
"prompts":  { "everySeconds": 90, "quietSeconds": 25, "items": ["Type draw to get your card."] }  // interaction prompts when chat is quiet
```

### Characters

```jsonc
"characters": [{
  "id": "guest", "label": "Guest", "keywords": ["guest"],          // chat a keyword to switch look
  "sheet": "assets/chars/guest.png", "frames": 32,                 // horizontal strip of equal frames, auto-trimmed by transparency
  "walkUp": [0, 1, 2], "walkDown": [8, 9], "walkSide": [12, 13],   // directional walk frames (side walk drawn facing right)
  "poses": { "idle": 16, "stand": 24, "cheer": 26 }
}],
"animations": { "bow": { "frames": ["idle", "idle@0.8", "idle"], "ms": 1300 } },   // "idle@0.8": squashed lower (bow)
"npcs": [{ "id": "host", "character": "guest", "at": [480, 870], "showName": false, "cushion": false, "reactions": { "bigGift": [...] } }]
```

AI-drawn character sheets are rarely evenly spaced: use the sheet cutter (detects each pose, removes the green background) `pnpm assets:cut ... --auto`, full workflow in [ASSETS-GUIDE.md](ASSETS-GUIDE.md).

### Built-in HUD, colors, sounds

```jsonc
"hud": { "title": { "text": "Channel name" }, "counters": true, "giftCard": { "verb": "sent", "unit": "coins" }, "tiers": true,
         "board": { "title": "TOP FANS", "size": 3 }, "ticker": { "title": "Just sent" }, "goal": true, "guide": { "title": "How to play" } },
"colors": { "accent": "#ffd987", "panel": "...", "border": "...", "glow": "..." },
"sounds": { "bell": { "cooldown": 3000, "duck": 0.7 }, "like": false }   // assets/sfx/<name>.mp3, music: assets/music/*.mp3
```

## theme.js: custom parts

```js
Kit.action('lantern', (person, ev) => { /* step { "js": "lantern" } */ });
Kit.on('frame', (t, dt) => { /* every frame */ });
Kit.on('speak', (e) => {}); Kit.on('speakEnd', (e) => {});   // voice line starts / ends (e.about: gift, draw, chat...)
Kit.hud = { init, giftCard, ticker, state, guide, toast, periodic, draw, remember, reset };  // replace the whole HUD
```

API: `Kit.scene` (people, anchor points, camera), `Kit.fx` (effects), `Kit.audio` (`sfx('bell')`), `Kit.safe` (safe zones), `Live.on(...)` (raw events: join, chat, like, gift, command, follow, share, title, goal, periodic, prompt, tts, state, reset).

## Keeping a theme stable on live

- **Stay bounded**: a busy live can send dozens of events per second; the kit already caps people, tags and sounds at once, don't add unbounded loops.
- **Don't trust viewer data**: names and comments put into HTML must go through `textContent` or an escape function.
- **The page can reload at any time** (OBS, network drop): the kit rebuilds the current people; if stuck on an empty screen for 12 seconds it reloads itself.
- **Have a real person on stream**: a live with only a self-running game is easily flagged by TikTok as "unoriginal content". A host camera and talking helps.
