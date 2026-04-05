import { Candidate, CandidateMatcher } from "./fuzzyMatch";
import bundledData from "../data/candidates.json";
import { getMergedCandidates, clearMergedCandidatesCache, type MergedCandidate } from "./mergedCandidates";

interface RemoteCandidate {
  id: string;
  name: string;
  party?: string;
  state?: string;
  office?: string;
  districtOrOffice?: string;
  stanceLabel?: string;
  total?: number | null;
  totalDisplay?: string;
  israelLobbyTotal?: number;
  israelLobbyTotalDisplay?: string;
}

let candidates: Candidate[] = bundledData as Candidate[];
let matcher = new CandidateMatcher(candidates);
let refreshed = false;

function mergedToCandidate(m: MergedCandidate): Candidate {
  return {
    id: m.id,
    name: m.name,
    party: m.party || "Unknown",
    state: m.state || "",
    office: m.districtOrOffice || "",
    stanceLabel: m.stanceLabel || "Unknown",
    total:
      typeof m.israelLobbyTotal === "number" && !Number.isNaN(m.israelLobbyTotal)
        ? m.israelLobbyTotal
        : null,
    totalDisplay: m.israelLobbyTotalDisplay || "",
  };
}

export function getMatcher(): CandidateMatcher {
  return matcher;
}

export function getCandidates(): Candidate[] {
  return candidates;
}

export async function refreshInBackground(): Promise<void> {
  if (refreshed) return;
  try {
    const merged = await getMergedCandidates();
    candidates = merged.map(mergedToCandidate);
    matcher = new CandidateMatcher(candidates);
    refreshed = true;
  } catch {
    /* bundled data remains */
  }
}

export async function invalidateCandidateData(): Promise<void> {
  await clearMergedCandidatesCache();
  refreshed = false;
  candidates = bundledData as Candidate[];
  matcher = new CandidateMatcher(candidates);
}
