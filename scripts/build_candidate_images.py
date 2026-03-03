#!/usr/bin/env python3

import io
import json
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image, ImageOps

from image_sources import USER_AGENT, resolve_candidate_image_source

ROOT = Path(__file__).resolve().parent.parent
POLITICIANS_PATH = ROOT / "data" / "politicians.json"
FEDERAL_PATH = ROOT / "data" / "2026-federal-candidates.json"
IMAGE_DIR = ROOT / "assets" / "images" / "candidates"
MANIFEST_PATH = ROOT / "data" / "candidate-images.json"
MISSING_PATH = ROOT / "data" / "candidate-images-missing.json"
TARGET_HEIGHT = 160
WEBP_QUALITY = 74


def load_json(path: Path):
  return json.loads(path.read_text(encoding="utf-8"))


def combined_candidates() -> list[dict]:
  profiled = load_json(POLITICIANS_PATH)
  federal = load_json(FEDERAL_PATH)
  by_id: dict[str, dict] = {}
  for item in federal:
    by_id[item["id"]] = item
  for item in profiled:
    if item["id"] in by_id:
      merged = dict(by_id[item["id"]])
      merged.update(item)
      by_id[item["id"]] = merged
    else:
      by_id[item["id"]] = item
  return sorted(by_id.values(), key=lambda value: value.get("id", ""))


def write_json(path: Path, payload) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def resize_to_webp(raw: bytes, output_path: Path) -> tuple[int, int]:
  image = Image.open(io.BytesIO(raw))
  image = ImageOps.exif_transpose(image).convert("RGB")
  width, height = image.size
  if not width or not height:
    raise ValueError("Invalid source image dimensions")
  target_width = max(1, int(round((TARGET_HEIGHT / height) * width)))
  resized = image.resize((target_width, TARGET_HEIGHT), Image.Resampling.LANCZOS)
  output_path.parent.mkdir(parents=True, exist_ok=True)
  resized.save(output_path, format="WEBP", quality=WEBP_QUALITY, method=6)
  return target_width, TARGET_HEIGHT


def cleanup_stale_images(valid_paths: set[str]) -> None:
  if not IMAGE_DIR.exists():
    return
  for file_path in IMAGE_DIR.glob("*.webp"):
    rel = file_path.relative_to(ROOT).as_posix()
    if rel not in valid_paths:
      file_path.unlink()


def main() -> None:
  session = requests.Session()
  session.headers.update({"User-Agent": USER_AGENT})
  candidates = combined_candidates()
  generated_at = datetime.now(timezone.utc).isoformat()

  images: dict[str, dict] = {}
  missing: list[dict] = []
  valid_paths: set[str] = set()
  cache: dict[str, tuple[int, int, str]] = {}

  for idx, candidate in enumerate(candidates, start=1):
    candidate_id = candidate.get("id")
    if not candidate_id:
      continue
    source = resolve_candidate_image_source(session, candidate)
    if not source:
      missing.append(
        {
          "id": candidate_id,
          "name": candidate.get("name"),
          "reason": "no_open_license_source_found",
          "externalUrl": candidate.get("imageUrl") or None,
        }
      )
      continue
    source_url = source["source_url"]
    output_rel = f"assets/images/candidates/{candidate_id}.webp"
    output_path = ROOT / output_rel

    try:
      if source_url in cache:
        width, height, cached_rel = cache[source_url]
        if cached_rel != output_rel:
          shutil.copyfile(ROOT / cached_rel, output_path)
      else:
        response = session.get(source_url, timeout=40)
        response.raise_for_status()
        width, height = resize_to_webp(response.content, output_path)
        cache[source_url] = (width, height, output_rel)
      valid_paths.add(output_rel)
      images[candidate_id] = {
        "id": candidate_id,
        "name": candidate.get("name"),
        "imagePath": output_rel,
        "width": width,
        "height": height,
        "sourceUrl": source_url,
        "sourcePageUrl": source.get("source_page_url"),
        "license": source.get("license"),
        "licenseUrl": source.get("license_url"),
        "attributionRequired": source.get("attribution_required"),
        "usageTerms": source.get("usage_terms"),
        "matchMethod": source.get("match_method"),
        "retrievedAt": generated_at,
      }
    except Exception as exc:
      missing.append(
        {
          "id": candidate_id,
          "name": candidate.get("name"),
          "reason": f"download_or_resize_failed: {exc.__class__.__name__}",
          "externalUrl": source_url,
        }
      )
    if idx % 50 == 0:
      print(f"Processed {idx}/{len(candidates)} candidates...", flush=True)
    time.sleep(0.02)

  cleanup_stale_images(valid_paths)
  manifest_payload = {
    "generatedAt": generated_at,
    "targetHeight": TARGET_HEIGHT,
    "format": "webp",
    "count": len(images),
    "images": dict(sorted(images.items(), key=lambda item: item[0])),
  }
  missing_payload = {
    "generatedAt": generated_at,
    "count": len(missing),
    "items": sorted(missing, key=lambda item: item["id"]),
  }
  write_json(MANIFEST_PATH, manifest_payload)
  write_json(MISSING_PATH, missing_payload)
  print(f"Candidates total: {len(candidates)}")
  print(f"Images saved: {len(images)}")
  print(f"Missing: {len(missing)}")
  print(f"Manifest: {MANIFEST_PATH}")
  print(f"Missing queue: {MISSING_PATH}")


if __name__ == "__main__":
  main()
