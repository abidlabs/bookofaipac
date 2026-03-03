import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "api"
INDEX_PATH = API_DIR / "index.json"
STANCES_PATH = API_DIR / "stances.json"
CANDIDATES_DIR = API_DIR / "candidates"

REQUIRED_INDEX_KEYS = {"service", "version", "routes", "profiledCandidatesCount", "federalCandidatesCount"}
REQUIRED_STANCE_ITEM_KEYS = {"id", "name", "districtOrOffice", "stanceLabel", "stanceColor", "endpoint"}
REQUIRED_CANDIDATE_KEYS = {
  "id",
  "name",
  "party",
  "state",
  "office",
  "districtOrOffice",
  "imageUrl",
  "stanceLabel",
  "stanceColor",
  "stanceSummary",
  "timeline",
  "sourceIds",
  "profileLastUpdatedAt",
  "sourcesEndpoint",
}
VALID_STANCE_COLORS = {"green", "red", "gray", "neutral"}


def load_json(path: Path):
  return json.loads(path.read_text(encoding="utf-8"))


def test_api_index_has_required_fields():
  payload = load_json(INDEX_PATH)
  assert REQUIRED_INDEX_KEYS.issubset(payload.keys())
  assert payload["version"] == "v1"
  assert isinstance(payload["profiledCandidatesCount"], int)
  assert isinstance(payload["federalCandidatesCount"], int)


def test_api_index_routes_are_valid_paths():
  payload = load_json(INDEX_PATH)
  routes = payload["routes"]
  assert isinstance(routes, dict)
  for value in routes.values():
    assert isinstance(value, str)
    assert value.startswith("/")
    assert value.endswith(".json") or "{id}.json" in value


def test_stances_count_matches_items_and_ids_unique():
  payload = load_json(STANCES_PATH)
  assert isinstance(payload["items"], list)
  assert payload["count"] == len(payload["items"])
  ids = [item["id"] for item in payload["items"]]
  assert len(ids) == len(set(ids))


def test_stances_items_have_required_fields():
  payload = load_json(STANCES_PATH)
  for item in payload["items"]:
    assert REQUIRED_STANCE_ITEM_KEYS.issubset(item.keys())
    assert item["stanceColor"] in VALID_STANCE_COLORS
    endpoint_path = ROOT / item["endpoint"].lstrip("/")
    assert endpoint_path.exists(), f"Missing candidate endpoint for {item['id']}"


def test_candidate_endpoint_files_have_required_fields():
  files = sorted(CANDIDATES_DIR.glob("*.json"))
  assert files, "No candidate endpoint files found"
  for file_path in files:
    payload = load_json(file_path)
    assert REQUIRED_CANDIDATE_KEYS.issubset(payload.keys())
    assert payload["id"] == file_path.stem
    assert payload["stanceColor"] in VALID_STANCE_COLORS
    assert isinstance(payload["timeline"], list)
    assert isinstance(payload["sourceIds"], list)
    assert payload["sourcesEndpoint"] == "/data/sources.json"


def test_stances_and_candidate_endpoints_are_consistent():
  stances = load_json(STANCES_PATH)["items"]
  stance_map = {item["id"]: item for item in stances}
  files = sorted(CANDIDATES_DIR.glob("*.json"))
  assert set(stance_map.keys()) == {f.stem for f in files}
  for file_path in files:
    payload = load_json(file_path)
    stance_item = stance_map[payload["id"]]
    assert payload["name"] == stance_item["name"]
    assert payload["districtOrOffice"] == stance_item["districtOrOffice"]
    assert payload["stanceLabel"] == stance_item["stanceLabel"]
    assert payload["stanceColor"] == stance_item["stanceColor"]
