export const DEFAULT_IMAGE = "https://placehold.co/120x120?text=Candidate";
const FLAG_BASE = "/assets/images/state-flags";
const TERRITORY_CODES = new Set(["AS", "GU", "MP", "PR", "VI"]);

export async function loadJson(relativePath) {
  const response = await fetch(relativePath);
  if (!response.ok) {
    throw new Error(`Failed to load ${relativePath}: ${response.status}`);
  }
  return response.json();
}

export function getBadgeClass(stanceLabel) {
  if (stanceLabel === "Pro-Palestine") return "badge-green";
  if (stanceLabel === "Pro-Israel") return "badge-red";
  if (stanceLabel === "Mixed-unclear") return "badge-gray";
  return "badge-neutral";
}

export function displayStanceLabel(stanceLabel) {
  return stanceLabel || "Unknown";
}

export function formatIsraelLobbyTotal(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return `$${value.toLocaleString()}`;
}

export function getStateFlagImage(stateCode) {
  const code = (stateCode || "").toUpperCase();
  if (!code) return "";
  if (TERRITORY_CODES.has(code)) {
    return `${FLAG_BASE}/${code.toLowerCase()}.png`;
  }
  return `${FLAG_BASE}/us-${code.toLowerCase()}.png`;
}

export function getCandidateFallbackImage(candidate) {
  return getStateFlagImage(candidate?.state) || DEFAULT_IMAGE;
}

export function normalizeForSearch(value) {
  return (value || "").toLowerCase().trim();
}

export function makeCandidateIndex(profiled, federal) {
  const profiledMap = new Map(profiled.map((item) => [item.id, item]));
  const seenCanonical = new Set();
  const combined = [];
  const canonicalKey = (candidate) =>
    `${normalizeForSearch(candidate.name)}|${candidate.state || ""}|${normalizeForSearch(candidate.districtOrOffice || candidate.office || "")}`;

  profiled.forEach((candidate) => {
    const districtOrOffice = candidate.districtOrOffice || candidate.office || "";
    const inferredScope =
      candidate.officeScope ||
      (districtOrOffice.includes("Senate")
        ? "SENATE"
        : districtOrOffice.includes("House")
          ? "HOUSE"
          : "");
    const enriched = {
      id: candidate.id,
      name: candidate.name,
      imageUrl: candidate.imageUrl || "",
      party: candidate.party || "",
      state: candidate.state || "",
      districtOrOffice,
      officeScope: inferredScope,
      stanceLabel: candidate.stanceLabel || "Unknown",
      israelLobbyTotal:
        typeof candidate.israelLobbyTotal === "number" ? candidate.israelLobbyTotal : null,
      israelLobbyTotalDisplay: candidate.israelLobbyTotalDisplay || "",
      sourceType: "profiled",
    };
    seenCanonical.add(canonicalKey(enriched));
    combined.push(enriched);
  });

  federal.forEach((candidate) => {
    if (profiledMap.has(candidate.id)) return;
    const districtOrOffice = candidate.districtOrOffice || candidate.office || "";
    const enriched = {
      id: candidate.id,
      name: candidate.name,
      imageUrl: candidate.imageUrl || "",
      party: candidate.party || "",
      state: candidate.state || "",
      districtOrOffice,
      officeScope: candidate.officeScope || "",
      stanceLabel: candidate.stanceLabel || "Unknown",
      israelLobbyTotal:
        typeof candidate.israelLobbyTotal === "number" ? candidate.israelLobbyTotal : null,
      israelLobbyTotalDisplay: candidate.israelLobbyTotalDisplay || "",
      sourceType: "federal",
    };
    if (seenCanonical.has(canonicalKey(enriched))) return;
    combined.push(enriched);
  });

  combined.sort((a, b) => a.name.localeCompare(b.name));
  return combined;
}

export function getLocalImageForCandidate(candidateId, imageManifest, prefix = "") {
  const images = imageManifest?.images;
  const entry = images?.[candidateId];
  if (!entry?.imagePath) return null;
  return `${prefix}${entry.imagePath}`;
}

export function applyLocalImageMap(candidates, imageManifest, prefix = "") {
  return candidates.map((candidate) => {
    const local = getLocalImageForCandidate(candidate.id, imageManifest, prefix);
    const candidateImage =
      candidate.imageUrl && candidate.imageUrl !== DEFAULT_IMAGE ? candidate.imageUrl : "";
    return {
      ...candidate,
      imageUrl: local || candidateImage || getCandidateFallbackImage(candidate),
    };
  });
}
