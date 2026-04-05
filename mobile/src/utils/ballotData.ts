import { SITE_BASE_URL } from "../theme";
import { makeCandidateIndex, type MergedCandidate } from "./candidateIndex";

export type { MergedCandidate } from "./candidateIndex";

let cached: MergedCandidate[] | null = null;
let loadPromise: Promise<MergedCandidate[]> | null = null;

export async function getMergedCandidates(): Promise<MergedCandidate[]> {
  if (cached) return cached;
  if (!loadPromise) {
    loadPromise = (async () => {
      const [profRes, fedRes] = await Promise.all([
        fetch(`${SITE_BASE_URL}/data/politicians.json`),
        fetch(`${SITE_BASE_URL}/data/2026-federal-candidates.json`),
      ]);
      if (!profRes.ok || !fedRes.ok) {
        throw new Error("Failed to load candidate data");
      }
      const profiled = await profRes.json();
      const federal = await fedRes.json();
      cached = makeCandidateIndex(profiled, federal);
      return cached;
    })();
  }
  return loadPromise;
}
