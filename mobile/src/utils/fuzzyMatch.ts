export interface Candidate {
  id: string;
  name: string;
  party: string;
  state: string;
  office: string;
  stanceLabel: string;
  total: number | null;
  totalDisplay: string;
}

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

interface IndexedCandidate {
  candidate: Candidate;
  normalizedFull: string;
  firstName: string;
  lastName: string;
}

export class CandidateMatcher {
  private indexed: IndexedCandidate[] = [];
  private lastNameIndex = new Map<string, IndexedCandidate[]>();

  constructor(candidates: Candidate[]) {
    for (const c of candidates) {
      if (!c.name) continue;
      const normalizedFull = normalize(c.name);
      const parts = normalizedFull.split(" ");
      if (parts.length < 2) continue;

      const firstName = parts[0];
      const lastName = parts[parts.length - 1];

      const entry: IndexedCandidate = {
        candidate: c,
        normalizedFull,
        firstName,
        lastName,
      };

      this.indexed.push(entry);

      const bucket = this.lastNameIndex.get(lastName) || [];
      bucket.push(entry);
      this.lastNameIndex.set(lastName, bucket);
    }
  }

  match(ocrText: string): Candidate | null {
    if (!ocrText || ocrText.trim().length < 3) return null;

    const text = normalize(ocrText);

    // Phase 1: Exact full-name substring match
    const exactFullMatches: Candidate[] = [];
    for (const entry of this.indexed) {
      if (entry.normalizedFull.length >= 4 && text.includes(entry.normalizedFull)) {
        exactFullMatches.push(entry.candidate);
      }
    }
    if (exactFullMatches.length === 1) return exactFullMatches[0];

    // Phase 2: Word-based matching with last-name index
    const words = text.split(/\s+/).filter((w) => w.length >= 2);
    const scored: { candidate: Candidate; score: number }[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nearby = words.slice(Math.max(0, i - 3), i + 4);

      // 2a: Exact last-name hit
      const exactBucket = this.lastNameIndex.get(word);
      if (exactBucket) {
        for (const entry of exactBucket) {
          const firstDist = bestDistance(nearby, entry.firstName);
          if (firstDist <= 1) {
            scored.push({
              candidate: entry.candidate,
              score: 90 - firstDist * 5,
            });
          }
        }
      }

      // 2b: Fuzzy last-name (only if word is 4+ chars to avoid noise)
      if (word.length >= 4) {
        for (const [lastName, bucket] of this.lastNameIndex) {
          if (Math.abs(word.length - lastName.length) > 2) continue;
          if (word[0] !== lastName[0]) continue; // first char must match (OCR usually gets it right)
          const dist = levenshtein(word, lastName);
          const maxDist = lastName.length < 6 ? 1 : 2;
          if (dist > 0 && dist <= maxDist) {
            for (const entry of bucket) {
              const firstDist = bestDistance(nearby, entry.firstName);
              if (firstDist <= 1) {
                scored.push({
                  candidate: entry.candidate,
                  score: 70 - dist * 5 - firstDist * 5,
                });
              }
            }
          }
        }
      }
    }

    if (scored.length === 0) return null;

    // Deduplicate by candidate id, keep highest score
    const best = new Map<string, number>();
    for (const { candidate, score } of scored) {
      const prev = best.get(candidate.id) ?? 0;
      if (score > prev) best.set(candidate.id, score);
    }

    const sorted = [...best.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 1) return this.findById(sorted[0][0]);
    if (sorted[0][1] - sorted[1][1] >= 10) return this.findById(sorted[0][0]);

    return null; // ambiguous
  }

  matchAll(ocrText: string): Candidate[] {
    if (!ocrText || ocrText.trim().length < 3) return [];

    const text = normalize(ocrText);
    const best = new Map<string, number>();

    for (const entry of this.indexed) {
      if (entry.normalizedFull.length >= 4 && text.includes(entry.normalizedFull)) {
        const prev = best.get(entry.candidate.id) ?? 0;
        if (100 > prev) best.set(entry.candidate.id, 100);
      }
    }

    const words = text.split(/\s+/).filter((w) => w.length >= 2);
    const scored: { candidate: Candidate; score: number }[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nearby = words.slice(Math.max(0, i - 3), i + 4);

      const exactBucket = this.lastNameIndex.get(word);
      if (exactBucket) {
        for (const entry of exactBucket) {
          const firstDist = bestDistance(nearby, entry.firstName);
          if (firstDist <= 1) {
            scored.push({
              candidate: entry.candidate,
              score: 90 - firstDist * 5,
            });
          }
        }
      }

      if (word.length >= 4) {
        for (const [lastName, bucket] of this.lastNameIndex) {
          if (Math.abs(word.length - lastName.length) > 2) continue;
          if (word[0] !== lastName[0]) continue;
          const dist = levenshtein(word, lastName);
          const maxDist = lastName.length < 6 ? 1 : 2;
          if (dist > 0 && dist <= maxDist) {
            for (const entry of bucket) {
              const firstDist = bestDistance(nearby, entry.firstName);
              if (firstDist <= 1) {
                scored.push({
                  candidate: entry.candidate,
                  score: 70 - dist * 5 - firstDist * 5,
                });
              }
            }
          }
        }
      }
    }

    for (const { candidate, score } of scored) {
      const prev = best.get(candidate.id) ?? 0;
      if (score > prev) best.set(candidate.id, score);
    }

    const MIN_SCORE = 55;
    return [...best.entries()]
      .filter(([, s]) => s >= MIN_SCORE)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => this.findById(id))
      .filter((c): c is Candidate => c != null);
  }

  private findById(id: string): Candidate | null {
    return this.indexed.find((e) => e.candidate.id === id)?.candidate ?? null;
  }
}

function bestDistance(words: string[], target: string): number {
  let min = Infinity;
  for (const w of words) {
    const d = levenshtein(w, target);
    if (d < min) min = d;
  }
  return min;
}
