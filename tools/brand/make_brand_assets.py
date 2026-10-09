"""Cut ParaPo! logo assets out of the brand board (tools/brand/brand-board.png).

    ml/.venv/bin/python tools/brand/make_brand_assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BOARD = Image.open(Path(__file__).with_name("brand-board.png")).convert("RGB")
BG = np.array([252, 244, 231], np.float32)  # the board's warm cream background
YELLOW, CREAM = (249, 200, 70), (255, 249, 233)


def edge_connected(mask):
    """Pixels of `mask` reachable from the image border through `mask` (4-neighbour flood fill)."""
    reached = np.zeros_like(mask)
    reached[0], reached[-1], reached[:, 0], reached[:, -1] = mask[0], mask[-1], mask[:, 0], mask[:, -1]
    while True:
        grown = reached.copy()
        grown[1:] |= reached[:-1]
        grown[:-1] |= reached[1:]
        grown[:, 1:] |= reached[:, :-1]
        grown[:, :-1] |= reached[:, 1:]
        grown &= mask
        if (grown == reached).all():
            return reached
        reached = grown


def cutout(box, connected_only=True):
    """Make the cream background transparent with soft edges. connected_only keeps enclosed cream
    (e.g. the white pin centre) opaque; otherwise every cream pixel (letter counters) becomes clear."""
    rgb = np.asarray(BOARD.crop(box), np.float32)
    dist = np.sqrt(((rgb - BG) ** 2).sum(-1))
    alpha = np.clip((dist - 5) / 15, 0, 1)  # pure white (the pin outline) is ~25 away: stays opaque
    if connected_only:
        # cream regions that touch the crop's edge are background; enclosed cream stays opaque
        background = edge_connected(dist < 16)
        alpha = np.where(background, alpha, 1.0)
    a = np.maximum(alpha, 1e-3)[..., None]
    color = np.clip((rgb - BG * (1 - a)) / a, 0, 255)  # undo blending with the cream for soft edges
    out = Image.fromarray(np.dstack([color, alpha * 255]).astype(np.uint8), "RGBA")
    return out.crop(out.getbbox())


def on_canvas(art, size, fill, scale):
    canvas = Image.new("RGBA", (size, size), fill)
    target = int(size * scale)
    ratio = target / max(art.size)
    art = art.resize((round(art.width * ratio), round(art.height * ratio)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas


mark = cutout((118, 45, 500, 436))
wordmark = cutout((48, 425, 598, 585), connected_only=False)
# The jeepney's ground shadow reaches into the wordmark's box above the letters "Para": clear it.
clear = np.asarray(wordmark).copy()
clear[:14, :430, 3] = 0
wordmark = Image.fromarray(clear, "RGBA")
wordmark = wordmark.crop(wordmark.getbbox())
brand = ROOT / "assets/brand"
brand.mkdir(exist_ok=True)
mark.save(brand / "parapo-mark.png")
wordmark.save(brand / "parapo-wordmark.png")
images = ROOT / "assets/images"
on_canvas(mark, 1024, YELLOW + (255,), 0.74).convert("RGB").save(images / "icon.png")
on_canvas(mark, 1024, (0, 0, 0, 0), 0.56).save(images / "android-icon-foreground.png")
Image.new("RGB", (1024, 1024), YELLOW).save(images / "android-icon-background.png")
silhouette = on_canvas(mark, 1024, (0, 0, 0, 0), 0.56)
silhouette = Image.fromarray(np.dstack([np.full(silhouette.size[::-1] + (3,), 255, np.uint8), np.asarray(silhouette)[..., 3]]), "RGBA")
silhouette.save(images / "android-icon-monochrome.png")
on_canvas(mark, 1024, (0, 0, 0, 0), 0.9).save(images / "splash-icon.png")
on_canvas(mark, 196, CREAM + (255,), 0.86).resize((48, 48), Image.Resampling.LANCZOS).save(images / "favicon.png")
print("mark", mark.size, "wordmark", wordmark.size)

# "Para" and "Po!" as separate images, so "Para" can be tinted light on dark backgrounds (the board's
# dark-mode logo) while "Po!" keeps its yellow and orange. Same height, so they line up side by side.
SPLIT = 332  # between the last dark-teal column of "Para" and the first yellow column of "Po"
wordmark.crop((0, 0, SPLIT, wordmark.height)).save(brand / "parapo-wordmark-para.png")
wordmark.crop((SPLIT, 0, wordmark.width, wordmark.height)).save(brand / "parapo-wordmark-po.png")
