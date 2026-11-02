# Put the 3D theme's assets here

**English** | [Tiếng Việt](README.vi.md)

The blank 3D template ships no models. Without them the engine draws placeholder people on a flat floor. See "3D scenes" in the kit's `docs/THEME.md`.

| Where | Used for | Declared in |
|---|---|---|
| `3d/*.glb` (or `.gltf`) | rigged characters with animation clips (Idle, Walk, Wave…) | `theme.json` → `characters[].model`, `clips` |
| `3d/stage.glb` | the place: stage, room, bar, garden… | `scene.json` → `world` |
| `bg.jpg` | flat backdrop behind the 3D scene (optional) | `scene.json` → `background` |
| `video/*.mp4` | looped on the stage screen, played in order (like a DJ screen) | `scene.json` → `stage.screens[].folder` |
| `sfx/<name>.mp3`, `music/*.mp3` | sound effects, background music | same as 2D |

Free CC0 sources: Quaternius (animated characters), Kenney and KayKit (props, rooms, characters), Poly Pizza. Mixamo has free animations for your own rigged characters. Keep characters light (under ~5k triangles, 1–2 materials) so 100+ people stay smooth.

Record the source and license of each asset in the theme's `CREDITS.md`.
