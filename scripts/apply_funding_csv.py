#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POLITICIANS_PATH = ROOT / "data" / "politicians.json"
FEDERAL_PATH = ROOT / "data" / "2026-federal-candidates.json"
ISO = "2026-04-05T12:00:00+00:00"
SYNC_DATE = "2026-04-05"
TRACK_URL = "https://www.trackaipac.com/congress"


def slugify(value: str) -> str:
  value = value.lower().strip()
  value = re.sub(r"[^a-z0-9]+", "-", value)
  value = re.sub(r"-{2,}", "-", value)
  return value.strip("-")


def norm_tokens(s: str) -> list[str]:
  s = re.sub(r"[^a-z0-9\s]", " ", s.lower())
  return [t for t in s.split() if t]


def first_last_compatible(csv_name: str, db_name: str) -> bool:
  a = norm_tokens(csv_name)
  b = norm_tokens(db_name)
  if not a or not b:
    return False
  if a == b:
    return True
  if a[-1] != b[-1]:
    return False
  cf, df = a[0], b[0]
  if cf == df:
    return True
  if len(cf) >= 3 and len(df) >= 3 and cf[:3] == df[:3]:
    return True
  shorter, longer = (cf, df) if len(cf) <= len(df) else (df, cf)
  if len(shorter) >= 3 and longer.startswith(shorter):
    return True
  return False


def pol_office_key(p: dict) -> tuple | None:
  st = p.get("state") or ""
  do = p.get("districtOrOffice") or ""
  off = p.get("office") or ""
  if off == "U.S. Senate" or "Senate" in do:
    return ("SEN", st)
  m = re.search(r",\s*([A-Z]{2})-(\d{2})\s*$", do)
  if m and m.group(1) == st:
    return ("H", st, m.group(2))
  return None


def csv_office_key(state: str, district_col: str) -> tuple | None:
  d = district_col.strip()
  du = d.upper().replace("-", " ")
  if du == "SEN":
    return ("SEN", state)
  if du in ("AT LARGE", "AT LARGE "):
    return ("H", state, "00")
  try:
    n = int(d)
    return ("H", state, f"{n:02d}")
  except ValueError:
    return None


def parse_amount(cell: str) -> int | None:
  cell = (cell or "").strip()
  if not cell or cell.upper() in ("N/A", "TBD", "T.B.D."):
    return None
  digits = re.sub(r"[^0-9]", "", cell)
  if not digits:
    return None
  return int(digits)


def narrow_name_matches(csv_name: str, matches: list[dict]) -> list[dict]:
  if len(matches) <= 1:
    return matches
  exact = [p for p in matches if norm_tokens(csv_name) == norm_tokens(p.get("name", ""))]
  return exact if exact else matches


def track_label(state: str, key: tuple) -> str:
  if key[0] == "SEN":
    return f"{state}-SEN"
  return f"{state}-{key[2]}"


def make_pro_israel_summary(name: str, district_or_office: str, display: str) -> str:
  return (
    f"Track AIPAC (trackaipac.com/congress) reports an Israel Lobby Total of {display} for {name} in {district_or_office}. "
    "This candidate has taken funding from the Israel lobby."
  )


def make_pro_palestine_summary(name: str, district_or_office: str) -> str:
  return (
    f"Track AIPAC (trackaipac.com/congress) lists {name} in {district_or_office} as not receiving Israel lobby PAC money for this race. "
    "This dataset classifies such candidates as Pro-Palestine."
  )


def default_politician_baseline(
    pid: str,
    name: str,
    state: str,
    office: str,
    district_or_office: str,
    office_scope: str,
    district: str | None,
    party: str,
) -> dict:
  return {
    "id": pid,
    "name": name,
    "party": party,
    "state": state,
    "districtOrOffice": district_or_office,
    "office": office,
    "imageUrl": "",
    "stanceLabel": "Unknown",
    "stanceSummary": (
      f"No public Track AIPAC congressional total is currently linked for {name} in {district_or_office}. "
      "Official statements and congressional records were used as the primary basis for stance context in this profile."
    ),
    "timeline": [
      {
        "date": SYNC_DATE,
        "event": "Baseline profile created for Track AIPAC funding import.",
        "sourceIds": ["trackaipac-congress", "fec-candidate-master-2026", "house-resolution-tracker", "congress-floor-records"],
      }
    ],
    "sourceIds": ["trackaipac-congress", "fec-candidate-master-2026", "house-resolution-tracker", "congress-floor-records"],
    "profileLastUpdatedAt": ISO,
    **({"officeScope": office_scope, "district": district} if office_scope == "HOUSE" else {}),
    **({"officeScope": office_scope} if office_scope == "SENATE" else {}),
  }


def default_federal_row(
    pid: str,
    name: str,
    state: str,
    office: str,
    district_or_office: str,
    office_scope: str,
    district: str | None,
    party: str,
) -> dict:
  return {
    "id": pid,
    "candidateKey": f"trackaipac-import-{pid}",
    "fecCandidateId": None,
    "name": name,
    "party": party,
    "partyCode": "UNK",
    "state": state,
    "district": district,
    "office": office,
    "districtOrOffice": district_or_office,
    "officeScope": office_scope,
    "electionType": "regular",
    "status": "tracked",
    "incumbencyCode": None,
    "incumbency": "Unknown",
    "statusAuthority": "TrackAIPAC",
    "stanceLabel": "Unknown",
    "stanceSummary": "No profile summary yet.",
    "sourceSet": ["trackaipac-congress"],
    "sourceCount": 1,
    "lastConfirmedAt": SYNC_DATE,
    "overallConfidence": 0.8,
    "requiresManualReview": True,
    "reviewReason": "Added from Track AIPAC funding table import.",
    "profileLastUpdatedAt": ISO,
  }


TIMELINE_MARKER = f"[trackaipac-funding {SYNC_DATE}]"


def apply_row_to_politician(p: dict, approved: bool, amount: int | None, tlabel: str, display: str | None) -> None:
  dname = p.get("districtOrOffice", "")
  pname = p.get("name", "")
  if approved:
    p["stanceLabel"] = "Pro-Palestine"
    p["stanceSummary"] = make_pro_palestine_summary(pname, dname)
    for k in ("israelLobbyTotal", "israelLobbyTotalDisplay"):
      p.pop(k, None)
    ev = (
      f"{TIMELINE_MARKER} Track AIPAC congressional listing ({tlabel}): candidate listed as not receiving Israel lobby PAC money; classified Pro-Palestine."
    )
  else:
    if amount is None:
      raise ValueError("NO without amount")
    p["stanceLabel"] = "Pro-Israel"
    p["israelLobbyTotal"] = amount
    p["israelLobbyTotalDisplay"] = display
    p["stanceSummary"] = make_pro_israel_summary(pname, dname, display)
    ev = f"{TIMELINE_MARKER} Track AIPAC congressional listing records Israel Lobby Total: {display} ({tlabel})."
  p["trackAipacOfficeLabel"] = tlabel
  p["trackAipacLastSyncedAt"] = ISO
  p["trackAipacSourceUrl"] = TRACK_URL
  p["profileLastUpdatedAt"] = ISO
  sids = list(p.get("sourceIds") or [])
  if "trackaipac-congress" not in sids:
    sids.insert(0, "trackaipac-congress")
  p["sourceIds"] = sids
  tl = list(p.get("timeline") or [])
  if not any(TIMELINE_MARKER in (e.get("event") or "") for e in tl):
    tl.append(
      {
        "date": SYNC_DATE,
        "event": ev,
        "sourceIds": ["trackaipac-congress"],
      }
    )
  p["timeline"] = tl


def sync_federal_row(f: dict, p: dict) -> None:
  f["stanceLabel"] = p.get("stanceLabel", "Unknown")
  f["stanceSummary"] = p.get("stanceSummary", f.get("stanceSummary", ""))
  f["profileLastUpdatedAt"] = p.get("profileLastUpdatedAt", ISO)
  if "israelLobbyTotal" in p:
    f["israelLobbyTotal"] = p["israelLobbyTotal"]
    f["israelLobbyTotalDisplay"] = p["israelLobbyTotalDisplay"]
  else:
    f.pop("israelLobbyTotal", None)
    f.pop("israelLobbyTotalDisplay", None)
  if p.get("trackAipacOfficeLabel"):
    f["trackAipacOfficeLabel"] = p["trackAipacOfficeLabel"]
    f["trackAipacLastSyncedAt"] = p.get("trackAipacLastSyncedAt")
    f["trackAipacSourceUrl"] = p.get("trackAipacSourceUrl")
  ss = set(f.get("sourceSet") or [])
  ss.add("trackaipac-congress")
  f["sourceSet"] = sorted(ss)
  f["sourceCount"] = len(f["sourceSet"])


def main() -> None:
  import sys

  csv_path = Path(sys.argv[1] if len(sys.argv) > 1 else "/Users/abubakar/Downloads/Candidate Funding Data Table - Candidate Funding Data Table.csv")
  politicians: list[dict] = json.loads(POLITICIANS_PATH.read_text(encoding="utf-8"))
  federal: list[dict] = json.loads(FEDERAL_PATH.read_text(encoding="utf-8"))
  fed_by_id = {r["id"]: r for r in federal if r.get("id")}
  existing_ids = {p["id"] for p in politicians if p.get("id")} | set(fed_by_id.keys())

  unmatched: list[str] = []
  ambiguous: list[str] = []
  skipped_tbd: list[str] = []

  with csv_path.open(newline="", encoding="utf-8") as fp:
    rows = list(csv.DictReader(fp))

  for row in rows:
    name = (row.get("Candidate Name") or "").strip()
    state = (row.get("State") or "").strip().upper()
    dist = (row.get("District") or "").strip()
    appraw = (row.get("Track AIPAC Approved") or "").strip().upper()
    approved = appraw == "YES"
    lobby = row.get("Lobby Total (If NOT Approved)") or ""
    key = csv_office_key(state, dist)
    if not name or not state or key is None:
      unmatched.append(f"bad row: {name!r} {state!r} {dist!r}")
      continue

    pool_p = [p for p in politicians if pol_office_key(p) == key]
    raw_matches = [p for p in pool_p if first_last_compatible(name, p.get("name", ""))]
    matches = narrow_name_matches(name, raw_matches)

    targets: list[dict] = []
    if matches:
      targets = matches
    else:
      pool_f = [r for r in federal if pol_office_key(r) == key]
      fm = [r for r in pool_f if first_last_compatible(name, r.get("name", ""))]
      fm = narrow_name_matches(name, fm)
      if len(fm) > 1:
        ambiguous.append(f"[federal] {name} / {state} / {dist} -> {len(fm)}")
        continue
      if len(fm) == 1:
        fid = fm[0]["id"]
        base = fm[0]
        if fid not in {p.get("id") for p in politicians}:
          pol = dict(base)
          for k in (
            "candidateKey",
            "fecCandidateId",
            "partyCode",
            "electionType",
            "status",
            "incumbencyCode",
            "incumbency",
            "statusAuthority",
            "sourceSet",
            "sourceCount",
            "lastConfirmedAt",
            "overallConfidence",
            "requiresManualReview",
            "reviewReason",
          ):
            pol.pop(k, None)
          pol["imageUrl"] = ""
          pol.setdefault("timeline", [])
          pol.setdefault("sourceIds", ["fec-candidate-master-2026"])
          politicians.append(pol)
        targets = [next(p for p in politicians if p.get("id") == fid)]

    if not targets:
      tlabel = track_label(state, key)
      if key[0] == "SEN":
        office = "U.S. Senate"
        dstr = f"U.S. Senate, {state}"
        office_scope = "SENATE"
        district_val = None
      else:
        office = "U.S. House"
        dd = key[2]
        dstr = f"U.S. House, {state}-{dd}"
        office_scope = "HOUSE"
        district_val = str(int(dd)).zfill(2) if dd != "00" else "00"
      slug_base = slugify(name)
      pid = f"{slug_base}-{state.lower()}-{'sen' if key[0] == 'SEN' else 'h-' + key[2]}"
      n = 0
      cand_id = pid
      while cand_id in existing_ids:
        n += 1
        cand_id = f"{pid}-{n}"
      existing_ids.add(cand_id)
      party = "Unknown"
      pol = default_politician_baseline(
        cand_id, name, state, office, dstr, office_scope, district_val, party
      )
      politicians.append(pol)
      fr = default_federal_row(cand_id, name, state, office, dstr, office_scope, district_val, party)
      federal.append(fr)
      fed_by_id[cand_id] = fr
      targets = [pol]

    tlabel = track_label(state, key)
    if not approved and lobby.strip().upper() in ("TBD", "T.B.D."):
      skipped_tbd.append(f"{name} ({state} {dist})")
      continue
    disp: str | None = None
    amt: int | None = None
    if not approved:
      amt = parse_amount(lobby)
      if amt is None:
        unmatched.append(f"NO without parseable amount: {name} {lobby!r}")
        continue
      disp = f"${amt:,}"
    fed_synced: set[str] = set()
    for pol in targets:
      if approved:
        apply_row_to_politician(pol, True, None, tlabel, None)
      else:
        apply_row_to_politician(pol, False, amt, tlabel, disp)

      pid = pol["id"]
      if pid in fed_by_id and pid not in fed_synced:
        sync_federal_row(fed_by_id[pid], pol)
        fed_synced.add(pid)

  POLITICIANS_PATH.write_text(json.dumps(politicians, indent=2), encoding="utf-8")
  FEDERAL_PATH.write_text(json.dumps(federal, indent=2), encoding="utf-8")

  print(f"Updated politicians: {len(politicians)} rows")
  print(f"Federal rows: {len(federal)}")
  print(f"Unmatched: {len(unmatched)}")
  for u in unmatched[:25]:
    print("  ", u)
  if len(unmatched) > 25:
    print("  ...")
  print(f"Skipped TBD: {len(skipped_tbd)}")
  for s in skipped_tbd[:15]:
    print("  ", s)
  print(f"Ambiguous: {len(ambiguous)}")
  for a in ambiguous[:40]:
    print("  ", a)
  if len(ambiguous) > 40:
    print("  ...")


if __name__ == "__main__":
  main()
