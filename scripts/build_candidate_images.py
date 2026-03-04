#!/usr/bin/env python3

import io
import json
import shutil
import time
import argparse
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml
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
LEGISLATORS_CURRENT_URL = (
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml"
)


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


def profiled_ids() -> set[str]:
  profiled = load_json(POLITICIANS_PATH)
  return {item["id"] for item in profiled if item.get("id")}


def write_json(path: Path, payload) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def normalize_name_key(value: str) -> str:
  value = value.lower().strip()
  value = re.sub(r"[^a-z0-9\\s]", " ", value)
  value = re.sub(r"\\s+", " ", value).strip()
  return value


def candidate_name_keys(name: str) -> list[str]:
  canonical = normalize_name_key(name)
  tokens = canonical.split()
  keys = []
  if canonical:
    keys.append(canonical)
  if len(tokens) >= 2:
    keys.append(f"{tokens[0]} {tokens[-1]}")
  return list(dict.fromkeys(keys))


def load_legislator_portrait_map(session: requests.Session) -> dict[str, str]:
  response = session.get(LEGISLATORS_CURRENT_URL, timeout=35)
  response.raise_for_status()
  payload = yaml.safe_load(response.text)
  portrait_map: dict[str, str] = {}
  for row in payload:
    bioguide = row.get("id", {}).get("bioguide")
    if not bioguide:
      continue
    official = row.get("name", {}).get("official_full") or ""
    first = row.get("name", {}).get("first") or ""
    last = row.get("name", {}).get("last") or ""
    terms = row.get("terms", [])
    if not terms:
      continue
    state = terms[-1].get("state")
    if not state:
      continue
    keys = set()
    for candidate_name in [official, f"{first} {last}".strip()]:
      for key in candidate_name_keys(candidate_name):
        keys.add(f"{key}|{state}")
    portrait_url = f"https://unitedstates.github.io/images/congress/450x550/{bioguide}.jpg"
    for key in keys:
      portrait_map[key] = portrait_url
  return portrait_map


def resolve_legislator_map_source(candidate: dict, portrait_map: dict[str, str]) -> dict | None:
  name = candidate.get("name") or ""
  state = candidate.get("state") or ""
  if not name or not state:
    return None
  for key in candidate_name_keys(name):
    lookup = portrait_map.get(f"{key}|{state}")
    if lookup:
      return {
        "source_url": lookup,
        "source_page_url": "https://github.com/unitedstates/congress-legislators",
        "match_method": "congress_legislators_bioguide",
        "license": "us_government_public_domain_or_open",
      }
  return None


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


def fetch_binary_with_retry(session: requests.Session, url: str, attempts: int = 3) -> bytes:
  delay = 0.5
  last_error = None
  for _ in range(attempts):
    try:
      response = session.get(url, timeout=40)
      if response.status_code in {429, 500, 502, 503, 504}:
        raise requests.HTTPError(response=response)
      response.raise_for_status()
      return response.content
    except Exception as exc:
      last_error = exc
      time.sleep(delay)
      delay = min(delay * 2, 3.0)
  raise last_error if last_error else RuntimeError("download failed")


def cleanup_stale_images(valid_paths: set[str]) -> None:
  if not IMAGE_DIR.exists():
    return
  for file_path in IMAGE_DIR.glob("*.webp"):
    rel = file_path.relative_to(ROOT).as_posix()
    if rel not in valid_paths:
      file_path.unlink()


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--profiled-only", action="store_true")
  args = parser.parse_args()

  session = requests.Session()
  session.headers.update({"User-Agent": USER_AGENT})
  legislator_map = load_legislator_portrait_map(session)
  candidates = combined_candidates()
  if args.profiled_only:
    ids = profiled_ids()
    candidates = [candidate for candidate in candidates if candidate.get("id") in ids]
  generated_at = datetime.now(timezone.utc).isoformat()

  existing_manifest = load_json(MANIFEST_PATH) if MANIFEST_PATH.exists() else {}
  existing_images = existing_manifest.get("images", {}) if isinstance(existing_manifest, dict) else {}
  images: dict[str, dict] = dict(existing_images)

  existing_missing_payload = load_json(MISSING_PATH) if MISSING_PATH.exists() else {}
  existing_missing = existing_missing_payload.get("items", []) if isinstance(existing_missing_payload, dict) else []
  missing_by_id: dict[str, dict] = {item["id"]: item for item in existing_missing if item.get("id")}

  valid_paths: set[str] = set()
  cache: dict[str, tuple[int, int, str]] = {}

  for idx, candidate in enumerate(candidates, start=1):
    candidate_id = candidate.get("id")
    if not candidate_id:
      continue
    source = resolve_legislator_map_source(candidate, legislator_map)
    if not source:
      source = resolve_candidate_image_source(session, candidate)
    if not source:
      missing_by_id[candidate_id] = {
        "id": candidate_id,
        "name": candidate.get("name"),
        "reason": "no_open_license_source_found",
        "externalUrl": candidate.get("imageUrl") or None,
      }
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
        raw = fetch_binary_with_retry(session, source_url)
        width, height = resize_to_webp(raw, output_path)
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
      missing_by_id.pop(candidate_id, None)
    except Exception as exc:
      missing_by_id[candidate_id] = {
        "id": candidate_id,
        "name": candidate.get("name"),
        "reason": f"download_or_resize_failed: {exc.__class__.__name__}",
        "externalUrl": source_url,
      }
    if idx % 50 == 0:
      print(f"Processed {idx}/{len(candidates)} candidates...", flush=True)
    time.sleep(0.02)

  if not args.profiled_only:
    valid_paths.update({entry.get("imagePath") for entry in images.values() if entry.get("imagePath")})
    cleanup_stale_images({path for path in valid_paths if path})
  manifest_payload = {
    "generatedAt": generated_at,
    "targetHeight": TARGET_HEIGHT,
    "format": "webp",
    "count": len(images),
    "images": dict(sorted(images.items(), key=lambda item: item[0])),
  }
  missing = sorted(missing_by_id.values(), key=lambda item: item["id"])
  missing = [item for item in missing if item["id"] not in images]
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
