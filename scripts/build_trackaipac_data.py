#!/usr/bin/env python3

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
POLITICIANS_PATH = ROOT / "data" / "politicians.json"
FEDERAL_PATH = ROOT / "data" / "2026-federal-candidates.json"
SOURCES_PATH = ROOT / "data" / "sources.json"
RAW_PATH = ROOT / "data" / "trackaipac-congress.json"
UNMATCHED_PATH = ROOT / "data" / "trackaipac-unmatched.json"

TRACK_AIPAC_URL = "https://www.trackaipac.com/congress"

OFFICE_RE = re.compile(r"^([A-Z]{2}-(?:SEN|\d{2}))\s+\[([A-Z])\]$")
AMOUNT_RE = re.compile(r"Israel Lobby Total:\s*\$([0-9,]+)")


def load_json(path: Path):
  if not path.exists():
    return {}
  return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def clean_text(html: str) -> str:
  html = re.sub(r"(?is)<script.*?</script>", " ", html)
  html = re.sub(r"(?is)<style.*?</style>", " ", html)
  html = re.sub(r"(?i)<br\\s*/?>", "\n", html)
  html = re.sub(r"(?i)</h[1-6]>", "\n", html)
  html = re.sub(r"(?i)</p>", "\n", html)
  text = re.sub(r"(?is)<[^>]+>", " ", html)
  text = text.replace("&nbsp;", " ")
  lines = [re.sub(r"\\s+", " ", line).strip() for line in text.splitlines()]
  lines = [line for line in lines if line]
  return "\n".join(lines)


def normalize_name(value: str) -> str:
  value = value.strip()
  value = re.sub(r"^#+\\s*", "", value)
  value = re.sub(r"\\s+", " ", value)
  return value


def slugify(value: str) -> str:
  value = value.lower().strip()
  value = re.sub(r"[^a-z0-9]+", "-", value)
  value = re.sub(r"-{2,}", "-", value)
  return value.strip("-")


def parse_party(code: str) -> str:
  return {
    "R": "Republican",
    "D": "Democratic",
    "I": "Independent",
  }.get(code, "Unknown")


def parse_track_records(page_text: str) -> list[dict]:
  lines = [line.strip() for line in page_text.splitlines() if line.strip()]
  records: list[dict] = []
  for idx, line in enumerate(lines):
    amount_match = AMOUNT_RE.search(line)
    if not amount_match:
      continue
    office_idx = None
    office_label = None
    party_code = None
    for j in range(max(0, idx - 8), idx):
      match = OFFICE_RE.match(lines[j])
      if match:
        office_idx = j
        office_label = match.group(1)
        party_code = match.group(2)
    if office_idx is None:
      continue
    name_idx = office_idx - 1
    while name_idx >= 0 and not lines[name_idx]:
      name_idx -= 1
    if name_idx < 0:
      continue
    name = normalize_name(lines[name_idx])
    if name in {"The Israel Lobby in Us Congress", "Figures listed on this page reflect federal career totals from all pro-Israel PACs & their bundlers:"}:
      continue
    amount = int(amount_match.group(1).replace(",", ""))
    state = office_label.split("-", 1)[0]
    records.append(
      {
        "name": name,
        "officeLabel": office_label,
        "partyCode": party_code,
        "party": parse_party(party_code),
        "state": state,
        "israelLobbyTotal": amount,
        "israelLobbyTotalDisplay": f"${amount:,}",
        "sourceUrl": TRACK_AIPAC_URL,
      }
    )
  dedup = {}
  for record in records:
    key = f"{record['name']}|{record['officeLabel']}"
    dedup[key] = record
  return sorted(dedup.values(), key=lambda item: (item["state"], item["name"]))


def normalized_name_key(name: str) -> str:
  value = name.lower().strip()
  value = re.sub(r"[^a-z0-9\\s]", " ", value)
  value = re.sub(r"\\s+", " ", value)
  return value.strip()


def office_from_label(label: str) -> tuple[str, str, str]:
  state, suffix = label.split("-", 1)
  if suffix == "SEN":
    return "U.S. Senate", f"U.S. Senate, {state}", "SENATE"
  return "U.S. House", f"U.S. House, {state}-{suffix}", "HOUSE"


def find_matches(record: dict, rows: list[dict]) -> list[dict]:
  target_name = normalized_name_key(record["name"])
  state = record["state"]
  office_label = record["officeLabel"]
  matches = []
  for row in rows:
    row_name = normalized_name_key(row.get("name", ""))
    if row_name != target_name:
      continue
    if row.get("state") != state:
      continue
    if office_label.endswith("SEN"):
      if "Senate" not in (row.get("districtOrOffice") or row.get("office") or ""):
        continue
    else:
      district = office_label.split("-", 1)[1]
      if district != "SEN":
        row_district = (row.get("district") or "").zfill(2)
        if row_district and row_district != district:
          continue
    matches.append(row)
  return matches


def apply_track_fields(row: dict, record: dict, timestamp: str) -> None:
  row["israelLobbyTotal"] = record["israelLobbyTotal"]
  row["israelLobbyTotalDisplay"] = record["israelLobbyTotalDisplay"]
  row["trackAipacOfficeLabel"] = record["officeLabel"]
  row["trackAipacLastSyncedAt"] = timestamp
  row["trackAipacSourceUrl"] = TRACK_AIPAC_URL


def create_new_federal(record: dict, timestamp: str) -> dict:
  office, district_or_office, scope = office_from_label(record["officeLabel"])
  district = None
  if scope == "HOUSE":
    district = record["officeLabel"].split("-", 1)[1]
  row = {
    "id": slugify(f"{record['name']}-{record['state']}-{record['officeLabel'].split('-', 1)[1].lower()}"),
    "candidateKey": slugify(f"trackaipac-{record['name']}-{record['officeLabel']}"),
    "fecCandidateId": None,
    "name": record["name"],
    "party": record["party"],
    "partyCode": record["partyCode"],
    "state": record["state"],
    "district": district,
    "office": office,
    "districtOrOffice": district_or_office,
    "officeScope": scope,
    "electionType": "regular",
    "status": "tracked",
    "incumbencyCode": None,
    "incumbency": "Unknown",
    "statusAuthority": "TrackAIPAC",
    "stanceLabel": "Unknown",
    "stanceSummary": "No profile summary yet.",
    "sourceSet": ["trackaipac-congress"],
    "sourceCount": 1,
    "lastConfirmedAt": timestamp.split("T")[0],
    "overallConfidence": 0.8,
    "requiresManualReview": True,
    "reviewReason": "Added from Track AIPAC congressional list.",
  }
  apply_track_fields(row, record, timestamp)
  return row


def create_new_profile(record: dict, timestamp: str) -> dict:
  office, district_or_office, _scope = office_from_label(record["officeLabel"])
  row = {
    "id": slugify(f"{record['name']}-{record['state']}-{record['officeLabel'].split('-', 1)[1].lower()}"),
    "name": record["name"],
    "party": record["party"],
    "state": record["state"],
    "districtOrOffice": district_or_office,
    "office": office,
    "imageUrl": "",
    "stanceLabel": "Unknown",
    "stanceSummary": "Profile sourced from Track AIPAC data. Timeline and position details are pending.",
    "timeline": [],
    "sourceIds": ["trackaipac-congress"],
  }
  apply_track_fields(row, record, timestamp)
  return row


def ensure_track_source() -> None:
  sources = load_json(SOURCES_PATH)
  sources["trackaipac-congress"] = {
    "title": "The Israel Lobby in US Congress",
    "publisher": "Track AIPAC",
    "url": TRACK_AIPAC_URL,
    "accessedAt": datetime.now(timezone.utc).date().isoformat(),
  }
  write_json(SOURCES_PATH, sources)


def main() -> None:
  response = requests.get(TRACK_AIPAC_URL, timeout=45)
  response.raise_for_status()
  cleaned = clean_text(response.text)
  records = parse_track_records(cleaned)
  timestamp = datetime.now(timezone.utc).isoformat()

  federal = load_json(FEDERAL_PATH)
  profiles = load_json(POLITICIANS_PATH)
  unmatched = []

  for record in records:
    federal_matches = find_matches(record, federal)
    profile_matches = find_matches(record, profiles)

    if len(federal_matches) > 1:
      unmatched.append({**record, "reason": "ambiguous_federal_match"})
    elif len(federal_matches) == 1:
      apply_track_fields(federal_matches[0], record, timestamp)
    else:
      federal.append(create_new_federal(record, timestamp))

    if len(profile_matches) > 1:
      unmatched.append({**record, "reason": "ambiguous_profile_match"})
    elif len(profile_matches) == 1:
      apply_track_fields(profile_matches[0], record, timestamp)
    else:
      profiles.append(create_new_profile(record, timestamp))

  federal.sort(key=lambda item: (item.get("state", ""), item.get("name", "")))
  profiles.sort(key=lambda item: item.get("name", ""))

  raw_payload = {
    "generatedAt": timestamp,
    "sourceUrl": TRACK_AIPAC_URL,
    "count": len(records),
    "records": records,
  }
  unmatched_payload = {
    "generatedAt": timestamp,
    "count": len(unmatched),
    "items": unmatched,
  }

  write_json(RAW_PATH, raw_payload)
  write_json(UNMATCHED_PATH, unmatched_payload)
  write_json(FEDERAL_PATH, federal)
  write_json(POLITICIANS_PATH, profiles)
  ensure_track_source()

  print(f"Track AIPAC parsed: {len(records)} records")
  print(f"Federal dataset size: {len(federal)}")
  print(f"Profile dataset size: {len(profiles)}")
  print(f"Unmatched: {len(unmatched)}")


if __name__ == "__main__":
  main()
