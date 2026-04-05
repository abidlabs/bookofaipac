#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POLITICIANS_PATH = ROOT / "data" / "politicians.json"
FEDERAL_PATH = ROOT / "data" / "2026-federal-candidates.json"
ISO = "2026-04-05T12:00:00+00:00"


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


def norm_tokens(s: str) -> list[str]:
  s = re.sub(r"[^a-z0-9\s]", " ", s.lower())
  return [t for t in s.split() if t]


def first_last_compatible(a_name: str, b_name: str) -> bool:
  a = norm_tokens(a_name)
  b = norm_tokens(b_name)
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


def score_canonical(p: dict, fed: dict | None) -> int:
  s = 0
  if fed and fed.get("fecCandidateId"):
    s += 200
  src = p.get("sourceIds") or []
  if "fec-candidate-master-2026" in src:
    s += 50
  ck = (fed or {}).get("candidateKey") or ""
  if ck.startswith("trackaipac-import"):
    s -= 150
  return s


def cluster_same_person(group: list[dict]) -> list[list[dict]]:
  clusters: list[list[dict]] = []
  for p in group:
    placed = False
    for c in clusters:
      if any(first_last_compatible(p.get("name", ""), x.get("name", "")) for x in c):
        c.append(p)
        placed = True
        break
    if not placed:
      clusters.append([p])
  return [c for c in clusters if len(c) > 1]


def main() -> None:
  politicians: list[dict] = json.loads(POLITICIANS_PATH.read_text(encoding="utf-8"))
  federal: list[dict] = json.loads(FEDERAL_PATH.read_text(encoding="utf-8"))
  fed_by_id = {r["id"]: r for r in federal if r.get("id")}

  by_key: dict[tuple, list[dict]] = {}
  for p in politicians:
    k = pol_office_key(p)
    if not k:
      continue
    by_key.setdefault(k, []).append(p)

  def merge_track_into(target: dict, src: dict) -> None:
    for k in (
      "stanceLabel",
      "israelLobbyTotal",
      "israelLobbyTotalDisplay",
      "trackAipacOfficeLabel",
      "trackAipacLastSyncedAt",
      "trackAipacSourceUrl",
      "profileLastUpdatedAt",
    ):
      if k in src and src[k] not in (None, ""):
        target[k] = src[k]
    if src.get("stanceSummary"):
      tname = target.get("name") or ""
      s = src["stanceSummary"]
      if tname and src.get("name") and src["name"] != tname:
        s = s.replace(src["name"], tname)
      target["stanceSummary"] = s
    if src.get("israelLobbyTotal") is None:
      target.pop("israelLobbyTotal", None)
      target.pop("israelLobbyTotalDisplay", None)
    ts = set(target.get("sourceIds") or [])
    ts.update(src.get("sourceIds") or [])
    if "trackaipac-congress" in ts:
      ts.discard("trackaipac-congress")
      target["sourceIds"] = ["trackaipac-congress"] + sorted(ts - {"trackaipac-congress"})
    else:
      target["sourceIds"] = sorted(ts)
    tl = list(target.get("timeline") or [])
    existing_ev = {(x.get("date"), x.get("event")) for x in tl}
    for e in src.get("timeline") or []:
      key = (e.get("date"), e.get("event"))
      if key not in existing_ev:
        tl.append(e)
        existing_ev.add(key)
    target["timeline"] = tl

  remove_ids: set[str] = set()
  for group in by_key.values():
    for cluster in cluster_same_person(group):
      imports = [
        p
        for p in cluster
        if (fed_by_id.get(p["id"]) or {}).get("candidateKey", "").startswith("trackaipac-import")
      ]
      if not imports:
        continue
      non_imp = [p for p in cluster if p not in imports]
      if non_imp:
        best = max(non_imp, key=lambda p: score_canonical(p, fed_by_id.get(p["id"])))
        for p in imports:
          merge_track_into(best, p)
        fid = best["id"]
        if fid in fed_by_id:
          sync_federal_row(fed_by_id[fid], best)
        for p in imports:
          remove_ids.add(p["id"])
        continue
      scored = sorted(
        ((p, score_canonical(p, fed_by_id.get(p["id"]))) for p in cluster),
        key=lambda x: x[1],
        reverse=True,
      )
      for p, _ in scored[1:]:
        remove_ids.add(p["id"])

  if not remove_ids:
    print("No duplicate name variants to remove.")
    return

  politicians = [p for p in politicians if p.get("id") not in remove_ids]
  federal = [r for r in federal if r.get("id") not in remove_ids]

  POLITICIANS_PATH.write_text(json.dumps(politicians, indent=2), encoding="utf-8")
  FEDERAL_PATH.write_text(json.dumps(federal, indent=2), encoding="utf-8")
  print(f"Removed {len(remove_ids)} duplicate profiles")
  for rid in sorted(remove_ids):
    print(" ", rid)


if __name__ == "__main__":
  main()
