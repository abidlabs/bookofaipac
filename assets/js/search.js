import {
  displayStanceLabel,
  getBadgeClass,
  loadJson,
  makeCandidateIndex,
  normalizeForSearch,
} from "./data.js";

const searchInput = document.getElementById("candidateSearch");
const resultsRoot = document.getElementById("searchResults");
const datasetMeta = document.getElementById("datasetMeta");

let candidateIndex = [];
let visibleResults = [];
let activeIndex = -1;

function formatMeta(candidate) {
  const parts = [candidate.party, candidate.state, candidate.districtOrOffice].filter(Boolean);
  return parts.join(" • ");
}

function rowTemplate(candidate, isActive) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `result-row${isActive ? " active" : ""}`;
  button.setAttribute("role", "option");
  button.dataset.id = candidate.id;

  const copyWrap = document.createElement("div");
  copyWrap.className = "result-copy";
  const name = document.createElement("p");
  name.className = "result-name";
  name.textContent = candidate.name;
  const meta = document.createElement("p");
  meta.className = "result-meta";
  meta.textContent = formatMeta(candidate);
  copyWrap.appendChild(name);
  copyWrap.appendChild(meta);

  const image = document.createElement("img");
  image.className = "avatar";
  image.src = candidate.imageUrl;
  image.alt = candidate.name;
  image.loading = "lazy";

  const badge = document.createElement("span");
  badge.className = `badge ${getBadgeClass(candidate.stanceLabel)}`;
  badge.textContent = displayStanceLabel(candidate.stanceLabel);

  button.appendChild(image);
  button.appendChild(copyWrap);
  button.appendChild(badge);

  button.addEventListener("click", () => goToCandidate(candidate.id));
  return button;
}

function openResults() {
  resultsRoot.classList.add("open");
  searchInput.setAttribute("aria-expanded", "true");
}

function closeResults() {
  resultsRoot.classList.remove("open");
  searchInput.setAttribute("aria-expanded", "false");
  activeIndex = -1;
}

function renderResults() {
  resultsRoot.innerHTML = "";
  if (!visibleResults.length) {
    closeResults();
    return;
  }
  visibleResults.forEach((candidate, index) => {
    resultsRoot.appendChild(rowTemplate(candidate, index === activeIndex));
  });
  openResults();
}

function runSearch(query) {
  const normalized = normalizeForSearch(query);
  if (!normalized) {
    visibleResults = candidateIndex.slice(0, 12);
    activeIndex = -1;
    renderResults();
    return;
  }
  visibleResults = candidateIndex
    .filter((candidate) => normalizeForSearch(candidate.name).includes(normalized))
    .slice(0, 20);
  activeIndex = -1;
  renderResults();
}

function goToCandidate(id) {
  window.location.href = `./detail/index.html?id=${encodeURIComponent(id)}`;
}

function handleArrowNavigation(direction) {
  if (!visibleResults.length) return;
  if (direction === "down") {
    activeIndex = Math.min(activeIndex + 1, visibleResults.length - 1);
  }
  if (direction === "up") {
    activeIndex = Math.max(activeIndex - 1, 0);
  }
  renderResults();
}

async function init() {
  const [profiledCandidates, federalCandidates] = await Promise.all([
    loadJson("./data/politicians.json"),
    loadJson("./data/2026-federal-candidates.json"),
  ]);

  candidateIndex = makeCandidateIndex(profiledCandidates, federalCandidates);
  datasetMeta.textContent = `Loaded ${federalCandidates.length.toLocaleString()} federal candidates for 2026 (best-effort, source-backed).`;
  visibleResults = candidateIndex.slice(0, 12);
  renderResults();
  searchInput.focus();
}

searchInput.addEventListener("input", (event) => {
  runSearch(event.target.value);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    handleArrowNavigation("down");
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    handleArrowNavigation("up");
  } else if (event.key === "Enter" && activeIndex >= 0) {
    event.preventDefault();
    goToCandidate(visibleResults[activeIndex].id);
  } else if (event.key === "Escape") {
    closeResults();
  }
});

document.addEventListener("click", (event) => {
  if (!resultsRoot.contains(event.target) && event.target !== searchInput) {
    closeResults();
  }
});

init().catch((error) => {
  datasetMeta.textContent = "Failed to load dataset files.";
  console.error(error);
});
