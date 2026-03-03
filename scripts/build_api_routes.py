#!/usr/bin/env python3

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POLITICIANS_PATH = ROOT / "data" / "politicians.json"
FEDERAL_PATH = ROOT / "data" / "2026-federal-candidates.json"
API_ROOT = ROOT / "api"
API_CANDIDATES = API_ROOT / "candidates"


def load_json(path: Path):
  return json.loads(path.read_text(encoding="utf-8"))


def ensure_dirs() -> None:
  API_ROOT.mkdir(parents=True, exist_ok=True)
  API_CANDIDATES.mkdir(parents=True, exist_ok=True)


def stance_color(label: str) -> str:
  if label == "Pro-Palestine":
    return "green"
  if label == "Pro-Israel":
    return "red"
  if label == "Mixed-unclear":
    return "gray"
  return "neutral"


def build_candidate_endpoints(profiled: list[dict]) -> list[dict]:
  rows = []
  for candidate in profiled:
    payload = {
      "id": candidate["id"],
      "name": candidate["name"],
      "party": candidate.get("party", ""),
      "state": candidate.get("state", ""),
      "office": candidate.get("office", ""),
      "districtOrOffice": candidate.get("districtOrOffice", ""),
      "imageUrl": candidate.get("imageUrl", ""),
      "stanceLabel": candidate.get("stanceLabel", "Unknown"),
      "stanceColor": stance_color(candidate.get("stanceLabel", "Unknown")),
      "stanceSummary": candidate.get("stanceSummary", ""),
      "timeline": candidate.get("timeline", []),
      "sourceIds": candidate.get("sourceIds", []),
      "sourcesEndpoint": "/data/sources.json",
    }
    endpoint_path = API_CANDIDATES / f"{candidate['id']}.json"
    endpoint_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    rows.append(
      {
        "id": candidate["id"],
        "name": candidate["name"],
        "districtOrOffice": candidate.get("districtOrOffice", ""),
        "stanceLabel": payload["stanceLabel"],
        "stanceColor": payload["stanceColor"],
        "endpoint": f"/api/candidates/{candidate['id']}.json",
      }
    )
  rows.sort(key=lambda item: item["name"])
  return rows


def main() -> None:
  ensure_dirs()
  profiled = load_json(POLITICIANS_PATH)
  federal = load_json(FEDERAL_PATH)
  candidate_rows = build_candidate_endpoints(profiled)

  stances = {
    "generatedAt": "2026-03-03",
    "count": len(candidate_rows),
    "items": candidate_rows,
  }
  (API_ROOT / "stances.json").write_text(json.dumps(stances, indent=2), encoding="utf-8")

  index_payload = {
    "service": "Book of AIPAC static API",
    "version": "v1",
    "routes": {
      "apiIndex": "/api/index.json",
      "candidateStances": "/api/stances.json",
      "candidateByIdTemplate": "/api/candidates/{id}.json",
      "sources": "/data/sources.json",
      "federalCandidates2026": "/data/2026-federal-candidates.json",
    },
    "profiledCandidatesCount": len(candidate_rows),
    "federalCandidatesCount": len(federal),
  }
  (API_ROOT / "index.json").write_text(json.dumps(index_payload, indent=2), encoding="utf-8")
  print(f"Wrote {len(candidate_rows)} profiled candidate endpoints.")


if __name__ == "__main__":
  main()
