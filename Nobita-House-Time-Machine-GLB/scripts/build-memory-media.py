"""Generate browser-friendly previews and the exhibition manifest from public/media."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
from urllib.parse import quote

import imageio_ffmpeg
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--force", action="store_true", help="Regenerate previews for media replaced in place.")
force = parser.parse_args().force

register_heif_opener()
root = Path(__file__).resolve().parents[1]
public = root / "public"
media = public / "media"
derived = public / "memories"
derived.mkdir(exist_ok=True)
curation = json.loads((root / "src/time-journey/memory-curation.json").read_text(encoding="utf-8-sig"))
featured_keys = {choices[0] for choices in curation.values() if choices}


def url(path):
    return "/" + quote(path.relative_to(public).as_posix(), safe="/")


def thumbnail(image, path, bounds, quality):
    if not force and path.exists():
        with Image.open(path) as existing:
            return existing.size
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail(bounds, Image.Resampling.LANCZOS)
    image.save(path, "WEBP", quality=quality)
    return image.size


manifest = {}
for folder in sorted(path for path in media.iterdir() if path.is_dir()):
    entries = []
    files = sorted(path for path in folder.rglob("*") if path.is_file())
    default_cover = next((path for path in files if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".heic"}), None)
    default_cover = default_cover or next((path for path in files if path.suffix.lower() == ".mp4"), None)
    for path in files:
        extension = path.suffix.lower()
        if extension not in {".jpg", ".jpeg", ".png", ".webp", ".heic", ".mp4"}:
            continue
        key = hashlib.sha256(path.relative_to(media).as_posix().encode()).hexdigest()[:16]
        preview = derived / f"{key}.webp"
        source = path
        large = derived / f"{key}-feature.webp" if path == default_cover or key in featured_keys else None
        kind = "video" if extension == ".mp4" else "image"
        if not force and preview.exists() and (large is None or large.exists()):
            with Image.open(preview) as image:
                width, height = image.size
            if extension == ".heic":
                source = derived / f"{key}-full.jpg"
                if not source.exists():
                    with Image.open(path) as image:
                        ImageOps.exif_transpose(image).convert("RGB").save(source, quality=92)
        elif kind == "video":
            with tempfile.TemporaryDirectory() as temp:
                frame = Path(temp) / "frame.png"
                subprocess.run(
                    [imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-i", str(path),
                     "-vf", "scale=1024:768:force_original_aspect_ratio=decrease:force_divisible_by=2",
                     "-frames:v", "1", str(frame)],
                    check=True,
                )
                with Image.open(frame) as image:
                    width, height = thumbnail(image, preview, (480, 360), 80)
                    if large:
                        thumbnail(image, large, (960, 720), 86)
        else:
            with Image.open(path) as image:
                width, height = thumbnail(image, preview, (480, 360), 80)
                if large:
                    thumbnail(image, large, (960, 720), 86)
                if extension == ".heic":
                    source = derived / f"{key}-full.jpg"
                    ImageOps.exif_transpose(image).convert("RGB").save(source, quality=92)
        entry = {"kind": kind, "src": url(source), "preview": url(preview), "width": width, "height": height}
        if large:
            entry["featurePreview"] = url(large)
        entries.append(entry)
    manifest[folder.name] = entries
(root / "src/time-journey/memory-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
