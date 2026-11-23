"""Effect images on a black background (light, smoke, rays) -> PNG with a transparent background, keeping natural softness.

Run (in the kit folder, needs uv: https://docs.astral.sh/uv/):
    pnpm assets:alpha themes/<id>/assets/raw/halo.jpg themes/<id>/assets/fx/halo.png --max 1024

Brightness becomes opacity: pure black becomes fully transparent, bright areas keep their color.
--corner 0.07: erase a square in the bottom-right corner (the ✦ mark Gemini / Flow add), set 0 to keep it.
"""
import argparse

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--max', type=int, default=0, help='cạnh dài nhất sau khi thu nhỏ (0 = giữ cỡ gốc)')
ap.add_argument('--corner', type=float, default=0.07)
a = ap.parse_args()

im = Image.open(a.src).convert('RGB')
if a.max and max(im.size) > a.max:
    im.thumbnail((a.max, a.max), Image.LANCZOS)
rgb = np.asarray(im).astype(np.float32)
h, w, _ = rgb.shape
if a.corner > 0:
    s = int(min(w, h) * a.corner)
    rgb[h - s:, w - s:] = 0
alpha = rgb.max(axis=2)
alpha = np.clip((alpha - 6) / (255 - 6), 0, 1)  # drop near-black compression noise
safe = np.maximum(alpha, 1e-3)[..., None]
color = np.clip(rgb / 255 / safe, 0, 1)  # un-premultiply black so colors don't look dull over a background
out = np.dstack([color * 255, alpha * 255]).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(a.out, optimize=True)
print(f'{a.out}: {w}x{h}')
