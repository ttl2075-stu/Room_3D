"""Generate browser-friendly previews and the exhibition manifest from public/media."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
from urllib.parse import quote

import imageio_ffmpeg
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()
root = Path(__file__).resolve().parents[1]
public = root / "public"
media = public / "media"
derived = public / "memories"
derived.mkdir(exist_ok=True)


def url(path):
    return "/" + quote(path.relative_to(public).as_posix(), safe="/")


def thumbnail(image, path):
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((480, 360), Image.Resampling.LANCZOS)
    image.save(path, "WEBP", quality=80)


manifest = {}
for folder in sorted(path for path in media.iterdir() if path.is_dir()):
    entries = []
    for path in sorted(folder.rglob("*")):
        extension = path.suffix.lower()
        if extension not in {".jpg", ".jpeg", ".png", ".webp", ".heic", ".mp4"}:
            continue
        key = hashlib.sha256(path.relative_to(media).as_posix().encode()).hexdigest()[:16]
        preview = derived / f"{key}.webp"
        source = path
        kind = "video" if extension == ".mp4" else "image"
        if kind == "video":
            with tempfile.TemporaryDirectory() as temp:
                frame = Path(temp) / "frame.png"
                subprocess.run(
                    [imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-i", str(path),
                     "-vf", "scale=480:360:force_original_aspect_ratio=decrease",
                     "-frames:v", "1", str(frame)],
                    check=True,
                )
                with Image.open(frame) as image:
                    thumbnail(image, preview)
        else:
            with Image.open(path) as image:
                thumbnail(image, preview)
                if extension == ".heic":
                    source = derived / f"{key}-full.jpg"
                    ImageOps.exif_transpose(image).convert("RGB").save(source, quality=92)
        entries.append({"kind": kind, "src": url(source), "preview": url(preview)})
    manifest[folder.name] = entries
(root / "src/time-journey/memory-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
