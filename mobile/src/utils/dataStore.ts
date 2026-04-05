import { Candidate, CandidateMatcher } from "./fuzzyMatch";
import bundledData from "../data/candidates.json";

// Remote data has different field names than our compact Candidate type
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

// Remote URL to fetch fresh data (update this to your hosted JSON endpoint)
const REMOTE_DATA_URL =
  "https://bookofaipac.com/data/politicians.json";

let candidates: Candidate[] = bundledData as Candidate[];
let matcher = new CandidateMatcher(candidates);
let refreshed = false;

export function getMatcher(): CandidateMatcher {
  return matcher;
}

export function getCandidates(): Candidate[] {
  return candidates;
}

function toCandidate(c: RemoteCandidate): Candidate {
  return {
    id: c.id,
    name: c.name,
    party: c.party || "Unknown",
    state: c.state || "",
    office: c.districtOrOffice || c.office || "",
    stanceLabel: c.stanceLabel || "Unknown",
    total:
      typeof c.israelLobbyTotal === "number"
        ? c.israelLobbyTotal
        : typeof c.total === "number"
          ? c.total
          : null,
    totalDisplay: c.israelLobbyTotalDisplay || c.totalDisplay || "",
  };
}

export async function refreshInBackground(): Promise<void> {
  if (refreshed) return;
  try {
    const res = await fetch(REMOTE_DATA_URL);
    if (!res.ok) return;
    const remote: RemoteCandidate[] = await res.json();
    if (Array.isArray(remote) && remote.length > 0) {
      const merged: Candidate[] = [];
      const seen = new Set<string>();

      for (const c of remote) {
        if (!c.name || seen.has(c.id)) continue;
        seen.add(c.id);
        merged.push(toCandidate(c));
      }

      // Keep bundled candidates not in remote
      for (const c of candidates) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      }

      candidates = merged;
      matcher = new CandidateMatcher(merged);
      refreshed = true;
    }
  } catch {
    // Silently fail — bundled data is always available
  }
}
