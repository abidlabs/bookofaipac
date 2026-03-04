#!/usr/bin/env python3

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FEDERAL_PATH = ROOT / "data" / "2026-federal-candidates.json"
STATES_DIR = ROOT / "states"

TEMPLATE = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Book of AIPAC | {state_code}</title>
    <link rel="stylesheet" href="../../assets/css/main.css" />
  </head>
  <body data-state="{state_code}">
    <main class="page">
      <nav class="top-nav">
        <a href="../../index.html" class="nav-link">Search UI</a>
        <a href="../index.html" class="nav-link">States</a>
        <a href="../../api/index.html" class="nav-link">API docs</a>
      </nav>

      <div class="detail-top-row">
        <a href="../index.html" class="back-link">← Back to states</a>
      </div>

      <section class="detail-card">
        <h1 id="stateName" class="states-title">State</h1>
        <p id="stateMeta" class="states-subtitle">Loading...</p>
      </section>

      <section class="detail-card">
        <h2>U.S. Senate</h2>
        <div class="state-table-wrap">
          <table class="state-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Party</th>
                <th>Stance</th>
                <th>Israel Lobby Total</th>
              </tr>
            </thead>
            <tbody id="senateTableBody"></tbody>
          </table>
        </div>
      </section>

      <section class="detail-card">
        <h2>U.S. House of Representatives</h2>
        <div class="state-table-wrap">
          <table class="state-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Party</th>
                <th>Stance</th>
                <th>Israel Lobby Total</th>
              </tr>
            </thead>
            <tbody id="houseTableBody"></tbody>
          </table>
        </div>
      </section>

      <footer class="site-footer page-footer">
        <div class="footer-stat">
          <span class="stat-value" id="datasetTotal">Loading…</span>
          <span class="stat-subvalue" id="datasetMeta">Loading breakdown…</span>
        </div>
        <p class="footer-disclaimer">
          AI was used to extract information and some entries may be outdated or incorrect.
          <a href="https://github.com/abidlabs/bookofaipac/compare" target="_blank" rel="noreferrer noopener">Open a PR to update information.</a>
        </p>
      </footer>
    </main>

    <script type="module" src="../../assets/js/footer.js"></script>
    <script type="module" src="../../assets/js/state-page.js"></script>
  </body>
</html>
"""


def main() -> None:
  federal = json.loads(FEDERAL_PATH.read_text(encoding="utf-8"))
  state_codes = sorted({(row.get("state") or "").upper() for row in federal if row.get("state")})
  for state_code in state_codes:
    state_dir = STATES_DIR / state_code.lower()
    state_dir.mkdir(parents=True, exist_ok=True)
    page_path = state_dir / "index.html"
    page_path.write_text(TEMPLATE.format(state_code=state_code), encoding="utf-8")
  print(f"Generated {len(state_codes)} state pages.")


if __name__ == "__main__":
  main()
