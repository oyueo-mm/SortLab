#!/usr/bin/env python3
"""Build optimised, locally served artwork presets from documented Wikimedia Commons files."""
from __future__ import annotations
import io
import pathlib
import sys
import time
import urllib.parse
import urllib.request
from PIL import Image, ImageOps, UnidentifiedImageError
Image.MAX_IMAGE_PIXELS = 40_000_000
ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / "assets" / "art"
SOURCES = {
    "greatwave": "The Great Wave off Kanagawa.jpg",
    "starrynight": "Van Gogh - Starry Night - Google Art Project.jpg",
    "monalisa": "Mona Lisa.jpg",
    "grandejatte": "A Sunday on La Grande Jatte, Georges Seurat, 1884.jpg",
    "irises": "Vincent van Gogh - Irises (1889).jpg",
    "waterlilies": "Claude Monet - Water Lilies - 1933.1157 - Art Institute of Chicago.jpg",
    "bluemarble": "The Earth seen from Apollo 17.jpg",
}
TARGET.mkdir(parents=True, exist_ok=True)
failed = []
for name, filename in SOURCES.items():
    dest = TARGET / (name + ".webp")
    if dest.exists() and dest.stat().st_size > 12_000:
        print(f"SKIP {name}: asset already present ({dest.stat().st_size} bytes)", flush=True)
        continue
    escaped = urllib.parse.quote(filename, safe="")
    endpoints = [
        f"https://commons.wikimedia.org/wiki/Special:Redirect/file/{escaped}?width=960",
        f"https://commons.wikimedia.org/wiki/Special:FilePath/{escaped}?width=960",
    ]
    done = False
    for endpoint in endpoints:
        for attempt in range(3):
            try:
                req = urllib.request.Request(endpoint, headers={
                    "User-Agent": "SortLab/1.0 (public-domain educational image samples; https://github.com/oyueo-mm/SortLab)",
                    "Accept": "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
                })
                with urllib.request.urlopen(req, timeout=45) as response:
                    blob = response.read(30_000_000)
                    mime = response.headers.get("Content-Type", "")
                if not mime.startswith("image/"):
                    raise ValueError(f"non-image response: {mime}")
                with Image.open(io.BytesIO(blob)) as original:
                    image = ImageOps.exif_transpose(original)
                    image.thumbnail((960, 900), Image.Resampling.LANCZOS)
                    if image.mode == "RGBA":
                        backing = Image.new("RGBA", image.size, (255, 255, 255, 255))
                        backing.alpha_composite(image)
                        image = backing.convert("RGB")
                    else:
                        image = image.convert("RGB")
                    image.save(dest, "WEBP", quality=86, method=5)
                print(f"OK {name}: {image.width}×{image.height}, {dest.stat().st_size} bytes", flush=True)
                done = True
                break
            except Exception as error:
                print(f"RETRY {name} ({attempt + 1}/3): {error}", file=sys.stderr, flush=True)
                time.sleep(1 + attempt * 2)
        if done:
            break
    if not done:
        failed.append(name)
if failed:
    print("FAILED: " + ", ".join(failed), file=sys.stderr, flush=True)
    sys.exit(1)
print("All seven public-domain artwork presets are stored locally.", flush=True)
