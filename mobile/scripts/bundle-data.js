const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

const politicians = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/politicians.json"), "utf8")
);
const federal = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/2026-federal-candidates.json"), "utf8")
);

const pick = (c) => ({
  id: c.id,
  name: c.name || "",
  party: c.party || "Unknown",
  state: c.state || "",
  office: c.districtOrOffice || c.office || "",
  stanceLabel: c.stanceLabel || "Unknown",
  total: typeof c.israelLobbyTotal === "number" ? c.israelLobbyTotal : null,
  totalDisplay: c.israelLobbyTotalDisplay || "",
});

const seen = new Set();
const merged = [];

// Politicians (curated) take priority
for (const c of politicians) {
  if (!c.name || !c.name.trim() || seen.has(c.id)) continue;
  seen.add(c.id);
  merged.push(pick(c));
}

// Then add federal candidates not already present
for (const c of federal) {
  if (!c.name || !c.name.trim() || seen.has(c.id)) continue;
  seen.add(c.id);
  merged.push(pick(c));
}

const outDir = path.join(__dirname, "..", "src", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "candidates.json"), JSON.stringify(merged));

console.log(`Bundled ${merged.length} candidates → mobile/src/data/candidates.json`);
