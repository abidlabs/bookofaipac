#!/usr/bin/env python3

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POLITICIANS_PATH = ROOT / "data" / "politicians.json"
FEDERAL_PATH = ROOT / "data" / "2026-federal-candidates.json"
SOURCES_PATH = ROOT / "data" / "sources.json"

UPDATED_AT = datetime.now(timezone.utc).isoformat()

EXECUTIVES = [
  {
    "id": "donald-trump-us-president",
    "name": "Donald Trump",
    "party": "Republican",
    "office": "U.S. President",
    "districtOrOffice": "U.S. President",
    "officeScope": "EXECUTIVE",
    "status": "incumbent",
    "incumbency": "Incumbent",
    "stanceLabel": "Pro-Israel",
    "stanceSummary": (
      "Donald Trump is the incumbent U.S. President. Track AIPAC congressional totals do not "
      "apply to executive officeholders. Official White House records show sustained U.S. security "
      "partnership with Israel and a September 2025 Gaza peace framework announced alongside "
      "Israeli Prime Minister Benjamin Netanyahu."
    ),
    "timeline": [
      {
        "date": "2017-12-06",
        "event": (
          "As president, Trump recognized Jerusalem as Israel's capital and directed the U.S. "
          "embassy to move there, framing the decision as recognition of Israel's sovereignty."
        ),
        "sourceIds": ["trump-jerusalem-recognition-2017"],
      },
      {
        "date": "2025-09-29",
        "event": (
          "White House released Trump's 20-point Comprehensive Plan to End the Gaza Conflict, "
          "including ceasefire, hostage release, demilitarization, and reconstruction phases "
          "with explicit U.S. commitment to Israel's security."
        ),
        "sourceIds": ["trump-gaza-peace-plan-2025"],
      },
    ],
    "sourceIds": [
      "trump-jerusalem-recognition-2017",
      "trump-gaza-peace-plan-2025",
    ],
  },
  {
    "id": "jd-vance-us-vice-president",
    "name": "JD Vance",
    "party": "Republican",
    "office": "U.S. Vice President",
    "districtOrOffice": "U.S. Vice President",
    "officeScope": "EXECUTIVE",
    "status": "incumbent",
    "incumbency": "Incumbent",
    "stanceLabel": "Pro-Israel",
    "stanceSummary": (
      "JD Vance is the incumbent U.S. Vice President. Track AIPAC congressional totals do not "
      "apply. Official remarks during his October 2025 Israel visit emphasized U.S.-Israel "
      "partnership and implementation of the Trump administration Gaza ceasefire and peace plan."
    ),
    "timeline": [
      {
        "date": "2025-10-21",
        "event": (
          "During an Israel visit, Vance said the Gaza ceasefire was progressing better than "
          "expected and that the administration would keep working to disarm Hamas and rebuild Gaza "
          "while ensuring Israel's security."
        ),
        "sourceIds": ["vance-israel-gaza-visit-2025"],
      },
      {
        "date": "2025-10-22",
        "event": (
          "Standing with Prime Minister Netanyahu, Vance rejected claims that Israel is a U.S. "
          "'client state' and described the relationship as a partnership focused on advancing "
          "the Gaza peace plan."
        ),
        "sourceIds": ["vance-israel-gaza-visit-2025"],
      },
    ],
    "sourceIds": ["vance-israel-gaza-visit-2025"],
  },
  {
    "id": "joe-biden-us-president",
    "name": "Joe Biden",
    "party": "Democratic",
    "office": "U.S. President",
    "districtOrOffice": "Former U.S. President",
    "officeScope": "EXECUTIVE",
    "status": "former",
    "incumbency": "Former officeholder",
    "stanceLabel": "Mixed-unclear",
    "stanceSummary": (
      "Joe Biden served as the 46th U.S. President (2021–2025). Track AIPAC congressional totals "
      "do not apply. Official records show continued U.S. military support for Israel alongside "
      "repeated diplomatic pushes for a Gaza ceasefire, hostage release, and expanded humanitarian aid."
    ),
    "timeline": [
      {
        "date": "2024-05-31",
        "event": (
          "Biden outlined a three-phase Gaza ceasefire and hostage-release framework, including "
          "Israeli withdrawal from populated areas and a surge of humanitarian assistance."
        ),
        "sourceIds": ["biden-gaza-ceasefire-framework-2024"],
      },
      {
        "date": "2025-01-15",
        "event": (
          "Biden announced Israel and Hamas had reached a ceasefire and hostage-release deal based "
          "on the framework he proposed in May 2024."
        ),
        "sourceIds": ["biden-gaza-ceasefire-deal-2025"],
      },
    ],
    "sourceIds": [
      "biden-gaza-ceasefire-framework-2024",
      "biden-gaza-ceasefire-deal-2025",
    ],
  },
  {
    "id": "kamala-harris-us-vice-president",
    "name": "Kamala Harris",
    "party": "Democratic",
    "office": "U.S. Vice President",
    "districtOrOffice": "Former U.S. Vice President",
    "officeScope": "EXECUTIVE",
    "status": "former",
    "incumbency": "Former officeholder",
    "stanceLabel": "Mixed-unclear",
    "stanceSummary": (
      "Kamala Harris served as U.S. Vice President (2021–2025). Track AIPAC congressional totals "
      "do not apply. Official remarks affirm Israel's right to defend itself while pressing for an "
      "immediate ceasefire, increased aid access in Gaza, and a two-state framework."
    ),
    "timeline": [
      {
        "date": "2024-03-03",
        "event": (
          "Harris called for an immediate Gaza ceasefire and urged Israel to significantly increase "
          "humanitarian aid deliveries while reiterating Israel's right to defend itself."
        ),
        "sourceIds": ["harris-gaza-ceasefire-selma-2024"],
      },
      {
        "date": "2024-07-25",
        "event": (
          "After meeting Prime Minister Netanyahu, Harris said she would always ensure Israel can "
          "defend itself while expressing serious concern about civilian suffering in Gaza and "
          "calling for a ceasefire deal and two-state path."
        ),
        "sourceIds": ["harris-netanyahu-meeting-2024"],
      },
      {
        "date": "2024-08-22",
        "event": (
          "In DNC remarks, Harris reiterated support for Israel's right to defend itself and "
          "described Gaza civilian suffering as devastating while urging completion of a ceasefire "
          "and hostage deal."
        ),
        "sourceIds": ["harris-dnc-israel-remarks-2024"],
      },
    ],
    "sourceIds": [
      "harris-gaza-ceasefire-selma-2024",
      "harris-netanyahu-meeting-2024",
      "harris-dnc-israel-remarks-2024",
    ],
  },
]

NEW_SOURCES = {
  "trump-jerusalem-recognition-2017": {
    "title": "Proclamation on Jerusalem as the Capital of the State of Israel",
    "publisher": "The American Presidency Project",
    "url": "https://www.presidency.ucsb.edu/documents/proclamation-jerusalem-the-capital-the-state-israel",
    "accessedAt": "2026-06-05",
  },
  "trump-gaza-peace-plan-2025": {
    "title": "President Donald J. Trump's Comprehensive Plan to End the Gaza Conflict",
    "publisher": "The American Presidency Project",
    "url": "https://www.presidency.ucsb.edu/documents/white-house-press-release-president-donald-j-trumps-comprehensive-plan-end-the-gaza",
    "accessedAt": "2026-06-05",
  },
  "vance-israel-gaza-visit-2025": {
    "title": "Vance holds news briefing in Israel during visit to bolster ceasefire",
    "publisher": "PBS NewsHour",
    "url": "https://www.pbs.org/newshour/politics/watch-live-vance-holds-news-briefing-in-israel-during-visit-to-bolster-ceasefire",
    "accessedAt": "2026-06-05",
  },
  "biden-gaza-ceasefire-framework-2024": {
    "title": "May 31, 2024: Remarks on the Middle East",
    "publisher": "Miller Center",
    "url": "https://millercenter.org/the-presidency/presidential-speeches/may-31-2024-remarks-middle-east",
    "accessedAt": "2026-06-05",
  },
  "biden-gaza-ceasefire-deal-2025": {
    "title": "Statement on Reaching a Cease-Fire and Hostage-Release Deal Between Israel and Hamas",
    "publisher": "The American Presidency Project",
    "url": "https://www.presidency.ucsb.edu/documents/statement-reaching-cease-fire-and-hostage-release-deal-between-israel-and-hamas",
    "accessedAt": "2026-06-05",
  },
  "harris-gaza-ceasefire-selma-2024": {
    "title": "Kamala Harris urges Hamas to agree to an immediate ceasefire, pushes Israel on aid to Gaza",
    "publisher": "CNBC",
    "url": "https://www.cnbc.com/2024/03/04/kamala-harris-urges-hamas-to-agree-to-an-immediate-ceasefire-pushes-israel-on-aid-to-gaza-.html",
    "accessedAt": "2026-06-05",
  },
  "harris-netanyahu-meeting-2024": {
    "title": "Remarks by the Vice President Following a Meeting with Prime Minister Benjamin Netanyahu of Israel",
    "publisher": "The American Presidency Project",
    "url": "https://www.presidency.ucsb.edu/documents/remarks-the-vice-president-following-meeting-with-prime-minister-benjamin-netanyahu-israel",
    "accessedAt": "2026-06-05",
  },
  "harris-dnc-israel-remarks-2024": {
    "title": "Harris: Israel 'has right to defend itself,' Palestinians need 'dignity, security'",
    "publisher": "NPR",
    "url": "https://www.npr.org/2024/08/23/g-s1-19232/kamala-harris-israel-gaza-dnc",
    "accessedAt": "2026-06-05",
  },
}


def load_json(path: Path):
  return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
  path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def upsert_by_id(rows: list[dict], item: dict) -> list[dict]:
  by_id = {row["id"]: row for row in rows if row.get("id")}
  by_id[item["id"]] = item
  return sorted(by_id.values(), key=lambda row: row.get("name", ""))


def build_profile(entry: dict) -> dict:
  return {
    "id": entry["id"],
    "name": entry["name"],
    "party": entry["party"],
    "state": "",
    "districtOrOffice": entry["districtOrOffice"],
    "office": entry["office"],
    "officeScope": entry["officeScope"],
    "imageUrl": "",
    "stanceLabel": entry["stanceLabel"],
    "stanceSummary": entry["stanceSummary"],
    "timeline": entry["timeline"],
    "sourceIds": entry["sourceIds"],
    "profileLastUpdatedAt": UPDATED_AT,
  }


def build_federal(entry: dict) -> dict:
  return {
    "id": entry["id"],
    "candidateKey": f"executive-{entry['id']}",
    "fecCandidateId": None,
    "name": entry["name"],
    "party": entry["party"],
    "partyCode": "REP" if entry["party"] == "Republican" else "DEM",
    "state": "",
    "district": None,
    "office": entry["office"],
    "districtOrOffice": entry["districtOrOffice"],
    "officeScope": entry["officeScope"],
    "electionType": "regular",
    "status": entry["status"],
    "incumbencyCode": "I" if entry["status"] == "incumbent" else "F",
    "incumbency": entry["incumbency"],
    "statusAuthority": "White House",
    "stanceLabel": entry["stanceLabel"],
    "stanceSummary": entry["stanceSummary"],
    "sourceSet": entry["sourceIds"],
    "sourceCount": len(entry["sourceIds"]),
    "lastConfirmedAt": "2026-06-05",
    "overallConfidence": 0.85,
    "requiresManualReview": False,
    "reviewReason": "",
    "profileLastUpdatedAt": UPDATED_AT,
  }


def main() -> None:
  politicians = load_json(POLITICIANS_PATH)
  federal = load_json(FEDERAL_PATH)
  sources = load_json(SOURCES_PATH)

  for entry in EXECUTIVES:
    politicians = upsert_by_id(politicians, build_profile(entry))
    federal = upsert_by_id(federal, build_federal(entry))

  sources.update(NEW_SOURCES)

  write_json(POLITICIANS_PATH, politicians)
  write_json(FEDERAL_PATH, federal)
  write_json(SOURCES_PATH, sources)

  print(f"Upserted {len(EXECUTIVES)} executive officials.")
  print(f"Politicians total: {len(politicians)}")
  print(f"Federal total: {len(federal)}")


if __name__ == "__main__":
  main()
