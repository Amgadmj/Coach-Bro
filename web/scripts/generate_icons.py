"""Generates the PWA icon set from the Dusk design system's accent gradient.

Usage: python scripts/generate_icons.py
Writes into web/public/icons/ - re-run any time the brand mark changes.
Requires Pillow (already a backend dependency; run with any Python that has it,
e.g. the same interpreter used for backend/scripts/generate_test_screenshot.py).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ACCENT = (226, 78, 113)  # --accent
ACCENT_DEEP = (185, 51, 89)  # --accent-deep
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"


def _gradient_square(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        t = y / size
        r = int(ACCENT[0] + (ACCENT_DEEP[0] - ACCENT[0]) * t)
        g = int(ACCENT[1] + (ACCENT_DEEP[1] - ACCENT[1]) * t)
        b = int(ACCENT[2] + (ACCENT_DEEP[2] - ACCENT[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return img


def _monogram_font(size: int) -> ImageFont.FreeTypeFont:
    for name in ("segoeuib.ttf", "seguisb.ttf", "arialbd.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_icon(size: int, *, corner_radius_ratio: float = 0.22, padding_ratio: float = 0.0) -> Image.Image:
    pad = int(size * padding_ratio)
    inner = size - pad * 2
    bg = _gradient_square(inner)

    mask = Image.new("L", (inner, inner), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, inner, inner], radius=int(inner * corner_radius_ratio), fill=255
    )

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(bg, (pad, pad), mask)

    draw = ImageDraw.Draw(canvas)
    font = _monogram_font(int(inner * 0.46))
    text = "BC"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (size / 2 - tw / 2 - bbox[0], size / 2 - th / 2 - bbox[1]),
        text,
        fill="white",
        font=font,
    )
    return canvas


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    make_icon(192).save(OUT_DIR / "icon-192.png")
    make_icon(512).save(OUT_DIR / "icon-512.png")
    # Maskable: extra padding so Android's adaptive-icon crop never clips the mark.
    make_icon(512, corner_radius_ratio=0.0, padding_ratio=0.12).save(OUT_DIR / "icon-512-maskable.png")
    # Apple touch icon: no alpha, no rounding (iOS applies its own mask).
    make_icon(180, corner_radius_ratio=0.0).convert("RGB").save(OUT_DIR / "apple-icon.png")

    for f in sorted(OUT_DIR.iterdir()):
        print(f"wrote {f} ({f.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
