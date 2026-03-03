# Book of AIPAC

Static GitHub Pages website for searching U.S. federal candidates and viewing stance profiles, timeline entries, and source links.

## What is included

- Search-first homepage with autocomplete dropdown
- Dropdown rows with image, name, party/state/office context, and stance color label
- Detail page with:
  - Stance summary paragraph
  - Chronological timeline
  - References list
- Stance legend:
  - Green: Pro-Palestine
  - Red: Pro-Israel
  - Gray: Mixed-unclear
  - Neutral: Unknown

## Project structure

- `index.html`: Search page
- `detail/index.html`: Candidate detail page
- `assets/css/main.css`: Shared styles
- `assets/js/search.js`: Search and autocomplete behavior
- `assets/js/detail.js`: Detail rendering behavior
- `assets/js/data.js`: Shared data helpers
- `api/index.html`: API documentation page
- `api/index.json`: API route index
- `api/stances.json`: Stance list endpoint
- `api/candidates/*.json`: Candidate stance endpoints
- `data/politicians.json`: Curated stance profiles
- `data/sources.json`: Source catalog
- `data/2026-federal-candidates.json`: Best-effort federal candidate list for 2026
- `scripts/build_federal_candidates.py`: Dataset generation script
- `scripts/build_api_routes.py`: API endpoint generation script

## Dataset notes

`data/2026-federal-candidates.json` is generated from the FEC candidate master file for cycle 2026 (`cn26.zip`) and currently filtered to active (`C`) House and Senate records with election year 2026.

This is best-effort and should be treated as filing-oriented, not final ballot truth. State election authority data should be used for final qualification/withdrawal confirmation.

## Rebuild candidate dataset

Run:

```bash
python3 scripts/build_federal_candidates.py
```

Then regenerate API endpoints:

```bash
python3 scripts/build_api_routes.py
```

## Deploy on GitHub Pages

- Push this repository to GitHub
- Enable Pages in repo settings using the main branch root
- Site will serve as static HTML/CSS/JS with JSON data files
