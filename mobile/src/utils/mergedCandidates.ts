import * as FileSystem from "expo-file-system/legacy";
import { SITE_BASE_URL } from "../theme";
import { makeCandidateIndex, type MergedCandidate } from "./candidateIndex";

export type { MergedCandidate } from "./candidateIndex";

const VERSION_URL = `${SITE_BASE_URL}/api/data-version.json`;

let memoryMerged: MergedCandidate[] | null = null;
let inflight: Promise<MergedCandidate[]> | null = null;

function cacheVersionPath(): string | null {
  const base = FileSystem.cacheDirectory;
  return base ? `${base}bookofaipac-data-version.txt` : null;
}

function cacheMergedPath(): string | null {
  const base = FileSystem.cacheDirectory;
  return base ? `${base}bookofaipac-merged.json` : null;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const data = (await fetchJson(VERSION_URL)) as { version?: string };
    const v = data.version;
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function readCachedVersion(): Promise<string | null> {
  const path = cacheVersionPath();
  if (!path) return null;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(path);
  } catch {
    return null;
  }
}

async function readMergedFromDisk(): Promise<MergedCandidate[] | null> {
  const path = cacheMergedPath();
  if (!path) return null;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as MergedCandidate[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(version: string, merged: MergedCandidate[]): Promise<void> {
  const vPath = cacheVersionPath();
  const mPath = cacheMergedPath();
  if (!vPath || !mPath) return;
  await FileSystem.writeAsStringAsync(vPath, version);
  await FileSystem.writeAsStringAsync(mPath, JSON.stringify(merged));
}

async function loadMerged(): Promise<MergedCandidate[]> {
  const remoteVersion = await fetchRemoteVersion();
  const cachedVersion = await readCachedVersion();

  if (remoteVersion && cachedVersion === remoteVersion) {
    const fromDisk = await readMergedFromDisk();
    if (fromDisk && fromDisk.length > 0) {
      return fromDisk;
    }
  }

  const [profiled, federal] = await Promise.all([
    fetchJson(`${SITE_BASE_URL}/data/politicians.json`),
    fetchJson(`${SITE_BASE_URL}/data/2026-federal-candidates.json`),
  ]);

  if (!Array.isArray(profiled) || !Array.isArray(federal)) {
    throw new Error("Invalid candidate data");
  }

  const merged = makeCandidateIndex(profiled, federal);
  if (remoteVersion) {
    await writeCache(remoteVersion, merged);
  }
  return merged;
}

export async function getMergedCandidates(): Promise<MergedCandidate[]> {
  if (memoryMerged) {
    return memoryMerged;
  }
  if (!inflight) {
    inflight = loadMerged().then((m) => {
      memoryMerged = m;
      return m;
    });
  }
  try {
    return await inflight;
  } catch (e) {
    inflight = null;
    throw e;
  }
}

export async function clearMergedCandidatesCache(): Promise<void> {
  memoryMerged = null;
  inflight = null;
  const vPath = cacheVersionPath();
  const mPath = cacheMergedPath();
  if (vPath) {
    try {
      await FileSystem.deleteAsync(vPath, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
  if (mPath) {
    try {
      await FileSystem.deleteAsync(mPath, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
}
