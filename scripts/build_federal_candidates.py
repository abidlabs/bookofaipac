#!/usr/bin/env python3

import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import requests

FEC_CYCLE_URL = "https://www.fec.gov/files/bulk-downloads/2026/cn26.zip"
OUTPUT_PATH = Path("data/2026-federal-candidates.json")


def slugify(value: str) -> str:
  value = value.lower().strip()
  value = re.sub(r"[^a-z0-9]+", "-", value)
  value = re.sub(r"-{2,}", "-", value)
  return value.strip("-")


def normalize_name(value: str) -> str:
  parts = [part.strip() for part in value.split(",")]
  if len(parts) >= 2:
    combined = f"{parts[1]} {parts[0]}".replace("  ", " ").strip()
  else:
    combined = value.strip()
  return combined.title()


def office_scope(office_code: str, district: str, state: str) -> str:
  if office_code == "S":
    return "SENATE"
  if office_code == "H":
    if state in {"AS", "DC", "GU", "MP", "PR", "VI"}:
      if state == "PR":
        return "RESIDENT_COMMISSIONER"
      return "DELEGATE"
    return "HOUSE"
  return "OTHER"


def district_or_office(office_code: str, district: str, state: str) -> str:
  if office_code == "S":
    return f"U.S. Senate, {state}"
  if office_code == "H":
    if state == "PR":
      return "Resident Commissioner, Puerto Rico"
    if state in {"AS", "DC", "GU", "MP", "VI"}:
      return f"Delegate, {state}"
    return f"U.S. House, {state}-{district.zfill(2)}"
  return "Federal office"


def party_name(code: str) -> str:
  mapping = {
    "DEM": "Democratic",
    "REP": "Republican",
    "IND": "Independent",
    "LIB": "Libertarian",
    "GRE": "Green",
  }
  return mapping.get(code, code or "Unknown")


def incumbency_label(code: str) -> str:
  mapping = {
    "I": "Incumbent",
    "C": "Challenger",
    "O": "Open-seat",
  }
  return mapping.get(code, "Unknown")


def build_rows(lines: list[str]) -> list[dict]:
  rows = []
  seen = set()
  now = datetime.now(timezone.utc).date().isoformat()
  for line in lines:
    values = line.rstrip("\n").split("|")
    if len(values) < 15:
      continue
    candidate_id = values[0].strip()
    raw_name = values[1].strip()
    party_code = values[2].strip()
    election_year = values[3].strip()
    state = values[4].strip()
    office = values[5].strip()
    district = values[6].strip()
    incumbency_code = values[7].strip()
    active = values[8].strip()
    if election_year != "2026":
      continue
    if office not in {"H", "S"}:
      continue
    if active != "C":
      continue
    if candidate_id in seen:
      continue
    seen.add(candidate_id)
    name = normalize_name(raw_name)
    scope = office_scope(office, district, state)
    row = {
      "id": slugify(f"{name}-{state}-{office}-{district or 'atlarge'}"),
      "candidateKey": slugify(candidate_id),
      "fecCandidateId": candidate_id,
      "name": name,
      "party": party_name(party_code),
      "partyCode": party_code,
      "state": state,
      "district": district or None,
      "office": "U.S. Senate" if office == "S" else "U.S. House",
      "districtOrOffice": district_or_office(office, district, state),
      "officeScope": scope,
      "electionType": "regular",
      "status": "filed",
      "incumbencyCode": incumbency_code or None,
      "incumbency": incumbency_label(incumbency_code),
      "statusAuthority": "FEC",
      "stanceLabel": "Unknown",
      "stanceSummary": "No profile summary yet.",
      "sourceSet": ["FEC-candidate-master-cn26"],
      "sourceCount": 1,
      "lastConfirmedAt": now,
      "overallConfidence": 0.72,
      "requiresManualReview": True,
      "reviewReason": "Status and ballot qualification require state election authority confirmation.",
    }
    rows.append(row)
  rows.sort(key=lambda item: (item["state"], item["officeScope"], item["name"]))
  return rows


def main() -> None:
  response = requests.get(FEC_CYCLE_URL, timeout=90)
  response.raise_for_status()
  raw_zip = response.content
  zf = zipfile.ZipFile(io.BytesIO(raw_zip))
  name = zf.namelist()[0]
  with zf.open(name) as file_handle:
    lines = [line.decode("latin-1") for line in file_handle]
  rows = build_rows(lines)
  OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
  OUTPUT_PATH.write_text(json.dumps(rows, indent=2), encoding="utf-8")
  print(f"Wrote {len(rows)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
  main()
