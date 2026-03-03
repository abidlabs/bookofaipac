const DEFAULT_IMAGE = "https://placehold.co/120x120?text=Candidate";

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

export function normalizeForSearch(value) {
  return (value || "").toLowerCase().trim();
}

export function makeCandidateIndex(profiled, federal) {
  const profiledMap = new Map(profiled.map((item) => [item.id, item]));
  const combined = [];

  profiled.forEach((candidate) => {
    combined.push({
      id: candidate.id,
      name: candidate.name,
      imageUrl: candidate.imageUrl || DEFAULT_IMAGE,
      party: candidate.party || "",
      state: candidate.state || "",
      districtOrOffice: candidate.districtOrOffice || candidate.office || "",
      stanceLabel: candidate.stanceLabel || "Unknown",
      sourceType: "profiled",
    });
  });

  federal.forEach((candidate) => {
    if (profiledMap.has(candidate.id)) return;
    combined.push({
      id: candidate.id,
      name: candidate.name,
      imageUrl: candidate.imageUrl || DEFAULT_IMAGE,
      party: candidate.party || "",
      state: candidate.state || "",
      districtOrOffice: candidate.districtOrOffice || candidate.office || "",
      stanceLabel: candidate.stanceLabel || "Unknown",
      sourceType: "federal",
    });
  });

  combined.sort((a, b) => a.name.localeCompare(b.name));
  return combined;
}
