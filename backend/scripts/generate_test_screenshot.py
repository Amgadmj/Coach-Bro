"""Renders a synthetic chat screenshot (iMessage-ish) for testing vision extraction.

Usage: python scripts/generate_test_screenshot.py [out_path]
Default output: scripts/fixtures/test_chat.png
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

MESSAGES = [
    ("match", "hey stranger 👀"),
    ("user", "just thinking about you, wyd"),
    ("match", "hmm maybe. depends what you're offering"),
    ("user", "good coffee and better company"),
    ("match", "bold of you to assume I'm free"),
]

W, H = 750, 900
BUBBLE_MAX = 470
PAD = 22


def main(out_path: Path) -> None:
    img = Image.new("RGB", (W, H), "#FFFFFF")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("segoeui.ttf", 30)
        small = ImageFont.truetype("segoeui.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
        small = font

    draw.text((W // 2 - 60, 30), "Sarah", fill="#111111", font=font)
    draw.text((W // 2 - 90, 75), "Today 9:41 PM", fill="#8E8E93", font=small)

    y = 140
    for sender, text in MESSAGES:
        left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
        tw, th = right - left, bottom - top
        bw = min(tw + PAD * 2, BUBBLE_MAX)
        bh = th + PAD * 1.6
        if sender == "user":
            x0, x1 = W - 30 - bw, W - 30
            fill, tcol = "#0B93F6", "#FFFFFF"
        else:
            x0, x1 = 30, 30 + bw
            fill, tcol = "#E9E9EB", "#111111"
        draw.rounded_rectangle([x0, y, x1, y + bh], radius=24, fill=fill)
        draw.text((x0 + PAD, y + PAD * 0.7), text, fill=tcol, font=font)
        y += bh + 18

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path)
    print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "fixtures" / "test_chat.png"
    main(out)
