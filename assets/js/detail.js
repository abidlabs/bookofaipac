import {
  DEFAULT_IMAGE,
  formatIsraelLobbyTotal,
  getCandidateFallbackImage,
  getLocalImageForCandidate,
  loadJson,
} from "./data.js";

const headerRoot = document.getElementById("candidateHeader");
const pageLastUpdatedRoot = document.getElementById("pageLastUpdated");
const stanceSummaryRoot = document.getElementById("stanceSummary");
const timelineRoot = document.getElementById("timelineList");
const timelineAdditionalSourcesRoot = document.getElementById("timelineAdditionalSources");
const REPO_URL = "https://github.com/abidlabs/bookofaipac";

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

function getLobbyAmount(candidate) {
  return typeof candidate.israelLobbyTotal === "number" && !Number.isNaN(candidate.israelLobbyTotal)
    ? candidate.israelLobbyTotal
    : null;
}

function renderHeader(candidate) {
  let headerClass = "detail-header";
  if (candidate.stanceLabel === "Pro-Israel") {
    headerClass += " detail-header-red";
  } else if (candidate.stanceLabel === "Pro-Palestine") {
    headerClass += " detail-header-green";
  }
  const amount = getLobbyAmount(candidate);
  const hasConfirmedAmount = typeof amount === "number";
  const lobbyBadgeClass = amount > 0 ? "lobby-badge-positive" : "lobby-badge-zero";
  const lobbyMarkup = hasConfirmedAmount
    ? `<p class="detail-lobby-row"><span class="lobby-badge ${lobbyBadgeClass}">${formatIsraelLobbyTotal(amount)}</span></p>`
    : "";
  headerRoot.className = headerClass;
  headerRoot.innerHTML = `
    <img class="detail-avatar" src="${candidate.imageUrl}" alt="${candidate.name}" />
    <div>
      <h1 class="detail-name">${candidate.name}</h1>
      <p class="detail-meta">${[candidate.party, candidate.state, candidate.districtOrOffice || candidate.office].filter(Boolean).join(" • ")}</p>
      ${lobbyMarkup}
    </div>
  `;
  const avatar = headerRoot.querySelector(".detail-avatar");
  if (avatar) {
    avatar.addEventListener("error", () => {
      if (avatar.dataset.fallbackApplied !== "1") {
        avatar.dataset.fallbackApplied = "1";
        avatar.src = getCandidateFallbackImage(candidate);
        return;
      }
      avatar.src = DEFAULT_IMAGE;
    });
  }
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

function renderLastUpdated(candidate) {
  const label = formatLastUpdated(candidate);
  const url =
    candidate.profileLastUpdatedPrUrl ||
    candidate.lastUpdatedPrUrl ||
    candidate.updatePrUrl ||
    REPO_URL;
  pageLastUpdatedRoot.innerHTML = `Last updated: <a class="page-last-updated-link" href="${url}" target="_blank" rel="noreferrer noopener">${label}</a>`;
}

function ordinalSuffix(day) {
  if (day >= 11 && day <= 13) return "th";
  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}

function formatTimelineDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return value || "Unknown date";
  const month = parsed.toLocaleString(undefined, { month: "long" });
  const day = parsed.getDate();
  const year = parsed.getFullYear();
  return `${month} ${day}${ordinalSuffix(day)}, ${year}`;
}

function buildSourceLinks(sourceIds, sourceMap) {
  if (!sourceIds || !sourceIds.length) return [];
  return sourceIds
    .map((sourceId) => {
      const source = sourceMap[sourceId];
      if (!source) return null;
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.textContent = source.publisher || source.title;
      return link;
    })
    .filter(Boolean);
}

function uniqueSourceIds(ids) {
  return Array.from(new Set((ids || []).filter(Boolean)));
}

function sourceIdsForEntry(candidate, entry, index) {
  if (Array.isArray(entry?.sourceIds) && entry.sourceIds.length) {
    return uniqueSourceIds(entry.sourceIds);
  }
  const candidateSourceIds = uniqueSourceIds(candidate.sourceIds || []);
  const nonTrack = candidateSourceIds.filter((id) => id !== "trackaipac-congress");
  if (!nonTrack.length) {
    return [];
  }
  return [nonTrack[Math.min(index, nonTrack.length - 1)]];
}

function renderAdditionalSources(candidate, usedSourceIds, sourceMap) {
  if (!timelineAdditionalSourcesRoot) return;
  const candidateSourceIds = uniqueSourceIds(candidate.sourceIds || []);
  const additionalIds = candidateSourceIds.filter(
    (id) => id === "trackaipac-congress" || !usedSourceIds.has(id)
  );
  const links = buildSourceLinks(additionalIds, sourceMap);
  if (!links.length) {
    timelineAdditionalSourcesRoot.hidden = true;
    timelineAdditionalSourcesRoot.innerHTML = "";
    return;
  }
  timelineAdditionalSourcesRoot.hidden = false;
  timelineAdditionalSourcesRoot.innerHTML = "<span>Additional sources:</span> ";
  links.forEach((link, index) => {
    if (index > 0) {
      const sep = document.createElement("span");
      sep.className = "timeline-inline-sep";
      sep.textContent = "·";
      timelineAdditionalSourcesRoot.appendChild(sep);
      timelineAdditionalSourcesRoot.appendChild(document.createTextNode(" "));
    }
    timelineAdditionalSourcesRoot.appendChild(link);
    if (index < links.length - 1) {
      timelineAdditionalSourcesRoot.appendChild(document.createTextNode(" "));
    }
  });
}

function renderTimeline(candidate, sourceMap) {
  timelineRoot.innerHTML = "";
  const usedSourceIds = new Set();
  if (!candidate.timeline || !candidate.timeline.length) {
    const empty = document.createElement("li");
    empty.className = "timeline-empty";
    empty.textContent = "No timeline entries yet for this candidate.";
    timelineRoot.appendChild(empty);
    renderAdditionalSources(candidate, usedSourceIds, sourceMap);
    return;
  }
  candidate.timeline.forEach((entry, index) => {
    const entrySourceIds = sourceIdsForEntry(candidate, entry, index);
    entrySourceIds.forEach((id) => usedSourceIds.add(id));
    const sourceLinks = buildSourceLinks(entrySourceIds, sourceMap);
    const li = document.createElement("li");
    const meta = document.createElement("div");
    meta.className = "timeline-meta";

    const date = document.createElement("span");
    date.className = "timeline-date";
    date.textContent = formatTimelineDate(entry.date);
    meta.appendChild(date);

    if (sourceLinks.length) {
      const sourceWrap = document.createElement("span");
      sourceWrap.className = "timeline-inline-sources";
      sourceLinks.forEach((sourceLink, index) => {
        if (index > 0) {
          const sep = document.createElement("span");
          sep.className = "timeline-inline-sep";
          sep.textContent = "·";
          sourceWrap.appendChild(sep);
        }
        sourceWrap.appendChild(sourceLink.cloneNode(true));
      });
      meta.appendChild(sourceWrap);
    }

    const event = document.createElement("p");
    event.className = "timeline-event";
    event.textContent = entry.event;

    li.appendChild(meta);
    li.appendChild(event);
    timelineRoot.appendChild(li);
  });
  renderAdditionalSources(candidate, usedSourceIds, sourceMap);
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

  const localImage = getLocalImageForCandidate(candidate.id, imageManifest, "../");
  const candidateImage = candidate.imageUrl && candidate.imageUrl !== DEFAULT_IMAGE ? candidate.imageUrl : "";
  candidate.imageUrl =
    localImage ||
    candidateImage ||
    `../assets/images/candidates/${candidate.id}.webp` ||
    getCandidateFallbackImage(candidate);

  renderHeader(candidate);
  renderLastUpdated(candidate);
  stanceSummaryRoot.textContent = candidate.stanceSummary;
  renderTimeline(candidate, sourceMap);
}

init().catch((error) => {
  headerRoot.innerHTML = "<h1 class=\"detail-name\">Candidate not found</h1>";
  pageLastUpdatedRoot.textContent = "Last updated: Unknown";
  stanceSummaryRoot.textContent =
    "The profile could not be loaded. Return to search and select another entry.";
  timelineRoot.innerHTML = "<li>Unavailable.</li>";
  if (timelineAdditionalSourcesRoot) {
    timelineAdditionalSourcesRoot.hidden = true;
    timelineAdditionalSourcesRoot.textContent = "";
  }
  console.error(error);
});
