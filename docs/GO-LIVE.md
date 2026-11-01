# Going live

**English** | [Tiếng Việt](GO-LIVE.vi.md)

The technical part of putting a theme on a TikTok LIVE. Account requirements and TikTok's content rules: see TikTok / LIVE Studio.

```
TikTok LIVE ──(gifts, likes, chat)──> TikFinity Desktop ──ws://127.0.0.1:21213──┐
            └──(fallback) direct connection ─────────────────────────────────────┤
                                                                                  ▼
                                                            Kit (run.bat, port 3939)
                                                                                  │
                        LIVE Studio / OBS <── overlay http://localhost:3939/overlay
```

## 1. Requirements

| Software | Notes |
|---|---|
| Node.js 20+ | https://nodejs.org (`run.bat` tells you if it's missing) |
| Chrome | Opens the overlay window for LIVE Studio to capture (Studio lists Chrome windows) |
| TikTok LIVE Studio or OBS | Streaming app |
| TikFinity **Desktop** (recommended) | The installed app (the web version does not expose port 21213). Without it, use the direct connection |

## 2. Run the kit

1. Run `run.bat` (installs dependencies the first time). The black window is the server: **keep it open for the whole live**.
2. The control panel opens at http://localhost:3939: pick a theme, check connection status, test effects, toggle the demo.

## 3. Put the overlay into the streaming app

**TikTok LIVE Studio**
1. Run `overlay.bat`: opens the overlay as its own vertical Chrome window that **plays sound on its own** and **doesn't freeze when covered by other windows**.
2. Studio: vertical layout → **Add source → Window capture → chrome.exe** (the title is the theme name).
3. Select the source → set it to **fill** (not stretch) to cover the frame. The live frame is taller than 9:16, so about 100px is cropped on each side: keep text and panels inside the safe zone (`/overlay?safe`).
4. Don't minimize the overlay window; having it behind other windows is fine.
5. Sound: enable desktop audio capture in Studio's audio settings.

**OBS**
1. Settings → Video: 1080 × 1920, 30 FPS.
2. Sources → Browser: URL `http://localhost:3939/overlay`, 1080 × 1920, tick *Control audio via OBS*. Right-click → Interact, click the overlay once to enable sound.
3. Send to LIVE Studio with *Start Virtual Camera* (Studio picks the Camera source → OBS Virtual Camera), or stream directly with a stream key if you have one.

Stream at 30 FPS: the overlay already caps its frame rate (`scene.json` `"fps": 30`), leaving the CPU to the streaming app's encoder.

## 4. Connect live data (gifts, likes, chat)

The control panel is in Vietnamese; button names are given in brackets.

**Via TikFinity Desktop**: open TikFinity, sign in, enter the channel's exact @handle in the username box (without @), wait for TikFinity to say it's connected to the live. Control panel: choose **TikFinity Desktop** → **Connect** (*Kết nối*).

**Direct**: in the control panel choose **Direct** (*Trực tiếp*), type the channel name → **Connect** (after the channel is live).

**Auto** (*Tự động*): uses TikFinity if it's there, otherwise connects directly. On disconnect it retries (backing off up to 30 seconds).

A green status dot and a ticking "last event … ago" line mean data is flowing.

## 5. Before going on air

- Test the effects, use **Test voice** (*Đọc thử*).
- Run the Test Lab auto mode (*Tự chạy*) to see a crowded scene; **turn it off** and click **New session** (*Phiên mới*) before the real live (connecting to a real live also stops the demo).
- Open `/overlay?safe` to check text and panels are inside the safe zone.
- Fixed lines (draws, periodic chants, prompts) are pre-rendered a few minutes after the server starts: start the kit well before the live.

## Common problems

| Symptom | What to do |
|---|---|
| Studio's window capture is black, "video signal lost" | Open the overlay with `overlay.bat` (Chrome), pick the right chrome.exe; reload the source in Studio |
| The overlay window isn't in Studio's list | Studio doesn't list Edge app windows: use Chrome (`overlay.bat` prefers Chrome) |
| Overlay is silent | The `overlay.bat` window plays sound on its own; in a normal browser tab click once. Enable desktop audio in Studio |
| Overlay is empty, no scene | Usually opened while the server was restarting; the page reloads itself after 12 seconds, or press F5 |
| "TikFinity not found at ws://127.0.0.1:21213" | TikFinity Desktop isn't open / not connected to the live, or you're using the web version. Or switch to Direct |
| Direct connection can't get the Room ID | The channel isn't live yet, or the channel name is wrong |
| TikFinity says `user_not_found` | Enter the @handle, not the display name |
| Voice is slow or patchy | Microsoft's TTS service is flaky: fixed lines are pre-rendered; set `"voice": { "fallback": "local" }` in the theme to use Windows' built-in Vietnamese voice when it fails outright |
| Text and panels cropped on phones | Keep them in the safe zone (`?safe`), at least 100px from the edges |
| Closed the black window by mistake | Run `run.bat` again, click Connect again, re-select the source in Studio if the picture is gone |
