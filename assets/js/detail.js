import {
  DEFAULT_IMAGE,
  formatIsraelLobbyTotal,
  getLocalImageForCandidate,
  loadJson,
} from "./data.js";

const headerRoot = document.getElementById("candidateHeader");
const israelLobbyTotalRoot = document.getElementById("israelLobbyTotal");
const lastUpdatedRoot = document.getElementById("lastUpdated");
const stanceSummaryRoot = document.getElementById("stanceSummary");
const timelineRoot = document.getElementById("timelineList");
const sourceListRoot = document.getElementById("sourceList");

function getCandidateId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function makeFallbackRecord(candidate) {
  return {
    ...candidate,
    stanceLabel: candidate.stanceLabel || "Unknown",
    stanceSummary:
      "This profile is in progress. We currently have candidate identity data and will add stance evidence and timeline entries as verification is completed.",
    timeline: [],
    sourceIds: [],
    profileLastUpdatedAt: candidate.profileLastUpdatedAt || candidate.trackAipacLastSyncedAt || candidate.lastConfirmedAt || "",
  };
}

function renderHeader(candidate) {
  headerRoot.innerHTML = `
    <img class="detail-avatar" src="${candidate.imageUrl}" alt="${candidate.name}" />
    <div>
      <h1 class="detail-name">${candidate.name}</h1>
      <p class="detail-meta">${[candidate.party, candidate.state, candidate.districtOrOffice || candidate.office].filter(Boolean).join(" • ")}</p>
    </div>
  `;
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatLastUpdated(candidate) {
  const dateValue =
    parseDateValue(candidate.profileLastUpdatedAt) ||
    parseDateValue(candidate.trackAipacLastSyncedAt) ||
    parseDateValue(candidate.lastConfirmedAt);
  if (!dateValue) return "Unknown";
  return dateValue.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTimeline(candidate) {
  timelineRoot.innerHTML = "";
  if (!candidate.timeline || !candidate.timeline.length) {
    timelineRoot.innerHTML = "<li>No timeline entries yet for this candidate.</li>";
    return;
  }
  candidate.timeline.forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="timeline-date">${entry.date}</span>${entry.event}`;
    timelineRoot.appendChild(li);
  });
}

function renderSources(candidate, sourceMap) {
  sourceListRoot.innerHTML = "";
  if (!candidate.sourceIds || !candidate.sourceIds.length) {
    sourceListRoot.innerHTML = "<li>No references linked yet.</li>";
    return;
  }
  candidate.sourceIds.forEach((sourceId) => {
    const source = sourceMap[sourceId];
    const li = document.createElement("li");
    if (!source) {
      li.textContent = sourceId;
      sourceListRoot.appendChild(li);
      return;
    }
    li.innerHTML = `<a href="${source.url}" target="_blank" rel="noreferrer noopener">${source.title}</a> (${source.publisher})`;
    sourceListRoot.appendChild(li);
  });
}

async function init() {
  const candidateId = getCandidateId();
  if (!candidateId) {
    throw new Error("Missing candidate ID");
  }

  const [profiledCandidates, federalCandidates, sourceMap, imageManifest] = await Promise.all([
    loadJson("../data/politicians.json"),
    loadJson("../data/2026-federal-candidates.json"),
    loadJson("../data/sources.json"),
    loadJson("../data/candidate-images.json"),
  ]);

  const fromProfiles = profiledCandidates.find((candidate) => candidate.id === candidateId);
  const fromFederal = federalCandidates.find((candidate) => candidate.id === candidateId);
  const candidate = fromProfiles || (fromFederal ? makeFallbackRecord(fromFederal) : null);

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  candidate.imageUrl =
    getLocalImageForCandidate(candidate.id, imageManifest, "../") ||
    candidate.imageUrl ||
    DEFAULT_IMAGE;

  renderHeader(candidate);
  const amount =
    typeof candidate.israelLobbyTotal === "number" && !Number.isNaN(candidate.israelLobbyTotal)
      ? candidate.israelLobbyTotal
      : 0;
  israelLobbyTotalRoot.className = `lobby-badge ${amount > 0 ? "lobby-badge-positive" : "lobby-badge-zero"}`;
  israelLobbyTotalRoot.textContent = formatIsraelLobbyTotal(amount);
  lastUpdatedRoot.textContent = formatLastUpdated(candidate);
  stanceSummaryRoot.textContent = candidate.stanceSummary;
  renderTimeline(candidate);
  renderSources(candidate, sourceMap);
}

init().catch((error) => {
  headerRoot.innerHTML = "<h1 class=\"detail-name\">Candidate not found</h1>";
  israelLobbyTotalRoot.className = "lobby-badge lobby-badge-zero";
  israelLobbyTotalRoot.textContent = "$0";
  lastUpdatedRoot.textContent = "Unknown";
  stanceSummaryRoot.textContent =
    "The profile could not be loaded. Return to search and select another entry.";
  timelineRoot.innerHTML = "<li>Unavailable.</li>";
  sourceListRoot.innerHTML = "<li>Unavailable.</li>";
  console.error(error);
});
