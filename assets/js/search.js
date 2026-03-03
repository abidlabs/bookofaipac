import {
  applyLocalImageMap,
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

  const image = document.createElement("img");
  image.className = "avatar";
  image.src = candidate.imageUrl;
  image.alt = candidate.name;
  image.loading = "lazy";

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
    closeResults();
    return;
  }
  visibleResults = candidateIndex
    .filter((c) => normalizeForSearch(c.name).includes(normalized))
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

function renderTicker(candidates) {
  const tickerEl = document.getElementById("candidateTicker");
  const tickerSection = document.getElementById("tickerSection");
  if (!tickerEl || !tickerSection) return;
  tickerEl.innerHTML = "";

  const featured = candidates
    .filter((c) => c.stanceLabel && c.stanceLabel !== "Unknown" && c.sourceType === "profiled")
    .slice(0, 24);

  if (featured.length < 2) return;

  // Duplicate for a seamless infinite scroll
  const allItems = [...featured, ...featured];

  allItems.forEach((candidate) => {
    const card = document.createElement("div");
    card.className = "ticker-card";
    if (candidate.stanceLabel === "Pro-Palestine") {
      card.classList.add("ticker-card-green");
    } else if (candidate.stanceLabel === "Pro-Israel") {
      card.classList.add("ticker-card-red");
    }

    const img = document.createElement("img");
    img.className = "ticker-avatar";
    img.src = candidate.imageUrl;
    img.alt = candidate.name;
    img.loading = "lazy";

    const info = document.createElement("div");
    info.className = "ticker-info";

    const nameEl = document.createElement("span");
    nameEl.className = "ticker-name";
    nameEl.textContent = candidate.name;

    const metaEl = document.createElement("span");
    metaEl.className = "ticker-meta";
    metaEl.textContent = candidate.districtOrOffice || candidate.state || "";

    info.appendChild(nameEl);
    info.appendChild(metaEl);

    card.appendChild(img);
    card.appendChild(info);

    card.addEventListener("click", () => goToCandidate(candidate.id));
    tickerEl.appendChild(card);
  });

  // Scale animation speed by number of cards for consistent pace
  const duration = Math.min(60, Math.max(18, Math.round(featured.length * 2.8)));
  tickerEl.style.animationDuration = `${duration}s`;

  tickerSection.hidden = false;
}

function spawnStars() {
  const container = document.getElementById("stars");
  if (!container) return;
  const glyphs = ["+", "·", "+", "·", "·"];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement("span");
    s.className = "star";
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.left = `${(Math.random() * 98).toFixed(1)}%`;
    s.style.top = `${(Math.random() * 98).toFixed(1)}%`;
    s.style.opacity = `${(0.08 + Math.random() * 0.18).toFixed(2)}`;
    s.style.fontSize = `${8 + Math.floor(Math.random() * 8)}px`;
    container.appendChild(s);
  }
}

// Spawn stars immediately (DOM is ready because this is a deferred module)
spawnStars();

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

async function init() {
  const [profiledCandidates, federalCandidates, imageManifest] = await Promise.all([
    loadJson("./data/politicians.json"),
    loadJson("./data/2026-federal-candidates.json"),
    loadJson("./data/candidate-images.json"),
  ]);

  const mergedCandidates = makeCandidateIndex(profiledCandidates, federalCandidates);
  candidateIndex = applyLocalImageMap(mergedCandidates, imageManifest, "./");

  if (datasetMeta) {
    const electedOfficials = federalCandidates.filter(
      (candidate) => candidate.incumbency === "Incumbent"
    ).length;
    const nonIncumbentCandidates = federalCandidates.length - electedOfficials;
    datasetMeta.textContent =
      `${federalCandidates.length.toLocaleString()} total • ` +
      `${electedOfficials.toLocaleString()} elected officials • ` +
      `${nonIncumbentCandidates.toLocaleString()} candidates`;
  }

  renderTicker(candidateIndex);
}

init().catch((error) => {
  if (datasetMeta) datasetMeta.textContent = "Failed to load dataset.";
  console.error(error);
});
