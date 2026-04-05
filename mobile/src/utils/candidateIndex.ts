export interface MergedCandidate {
  id: string;
  name: string;
  imageUrl: string;
  party: string;
  state: string;
  districtOrOffice: string;
  officeScope: string;
  stanceLabel: string;
  israelLobbyTotal: number | null;
  israelLobbyTotalDisplay: string;
  sourceType: "profiled" | "federal";
}

interface RawCandidate {
  id: string;
  name?: string;
  imageUrl?: string;
  party?: string;
  state?: string;
  districtOrOffice?: string;
  office?: string;
  officeScope?: string;
  stanceLabel?: string;
  israelLobbyTotal?: number | null;
  israelLobbyTotalDisplay?: string;
}

function normalizeForSearch(value: string | undefined): string {
  return (value || "").toLowerCase().trim();
}

function canonicalKey(candidate: {
  name: string;
  state: string;
  districtOrOffice: string;
}): string {
  return `${normalizeForSearch(candidate.name)}|${candidate.state || ""}|${normalizeForSearch(candidate.districtOrOffice)}`;
}

export function makeCandidateIndex(profiled: RawCandidate[], federal: RawCandidate[]): MergedCandidate[] {
  const profiledMap = new Map(profiled.map((item) => [item.id, item]));
  const seenCanonical = new Set<string>();
  const combined: MergedCandidate[] = [];

  for (const candidate of profiled) {
    const districtOrOffice = candidate.districtOrOffice || candidate.office || "";
    const inferredScope =
      candidate.officeScope ||
      (districtOrOffice.includes("Senate") ? "SENATE" : districtOrOffice.includes("House") ? "HOUSE" : "");
    const enriched: MergedCandidate = {
      id: candidate.id,
      name: candidate.name || "",
      imageUrl: candidate.imageUrl || "",
      party: candidate.party || "",
      state: candidate.state || "",
      districtOrOffice,
      officeScope: inferredScope,
      stanceLabel: candidate.stanceLabel || "Unknown",
      israelLobbyTotal:
        typeof candidate.israelLobbyTotal === "number" && !Number.isNaN(candidate.israelLobbyTotal)
          ? candidate.israelLobbyTotal
          : null,
      israelLobbyTotalDisplay: candidate.israelLobbyTotalDisplay || "",
      sourceType: "profiled",
    };
    seenCanonical.add(canonicalKey(enriched));
    combined.push(enriched);
  }

  for (const candidate of federal) {
    if (profiledMap.has(candidate.id)) continue;
    const districtOrOffice = candidate.districtOrOffice || candidate.office || "";
    const enriched: MergedCandidate = {
      id: candidate.id,
      name: candidate.name || "",
      imageUrl: candidate.imageUrl || "",
      party: candidate.party || "",
      state: candidate.state || "",
      districtOrOffice,
      officeScope: candidate.officeScope || "",
      stanceLabel: candidate.stanceLabel || "Unknown",
      israelLobbyTotal:
        typeof candidate.israelLobbyTotal === "number" && !Number.isNaN(candidate.israelLobbyTotal)
          ? candidate.israelLobbyTotal
          : null,
      israelLobbyTotalDisplay: candidate.israelLobbyTotalDisplay || "",
      sourceType: "federal",
    };
    if (seenCanonical.has(canonicalKey(enriched))) continue;
    combined.push(enriched);
  }

  combined.sort((a, b) => a.name.localeCompare(b.name));
  return combined;
}
