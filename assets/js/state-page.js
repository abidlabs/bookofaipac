import {
  DEFAULT_IMAGE,
  applyLocalImageMap,
  formatIsraelLobbyTotal,
  getCandidateFallbackImage,
  loadJson,
  makeCandidateIndex,
} from "./data.js?v=20260306";
import { getStateFlagUrl, getStateName } from "./states-data.js?v=20260306";

const stateTitle = document.getElementById("stateTitle");
const stateSubtitle = document.getElementById("stateSubtitle");
const stateCount = document.getElementById("stateCount");
const stateFlag = document.getElementById("stateFlag");
const senateTableBody = document.getElementById("senateTableBody");
const houseTableBody = document.getElementById("houseTableBody");
const senateSection = senateTableBody?.closest(".detail-card");
const houseSection = houseTableBody?.closest(".detail-card");

let currentGroupMode = "office";
let stateCandidatesCache = [];
let stanceSectionsRoot = null;
let officeToggleButton = null;
let stanceToggleButton = null;

function resolveOfficeScope(candidate) {
  if (candidate.officeScope === "SENATE" || candidate.officeScope === "HOUSE") {
    return candidate.officeScope;
  }
  const officeText = `${candidate.districtOrOffice || ""} ${candidate.office || ""}`.toLowerCase();
  if (officeText.includes("senate")) return "SENATE";
  if (officeText.includes("house")) return "HOUSE";
  return "";
}

function getStateCodeFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const statesIdx = parts.indexOf("states");
  if (statesIdx < 0 || statesIdx + 1 >= parts.length) return "";
  return parts[statesIdx + 1].toUpperCase();
}

function getStanceClass(stanceLabel) {
  if (stanceLabel === "Pro-Israel") return "state-row-red";
  if (stanceLabel === "Pro-Palestine") return "state-row-green";
  if (stanceLabel === "Mixed-unclear") return "state-row-gray";
  return "state-row-neutral";
}

function makeRow(candidate) {
  const tr = document.createElement("tr");
  tr.className = `state-candidate-row ${getStanceClass(candidate.stanceLabel)}`;
  tr.addEventListener("click", () => {
    window.location.href = `../../detail/index.html?id=${encodeURIComponent(candidate.id)}`;
  });

  const name = document.createElement("td");
  name.className = "state-cell-name";
  const avatar = document.createElement("img");
  avatar.className = "state-candidate-avatar";
  avatar.src = candidate.imageUrl;
  avatar.alt = candidate.name;
  avatar.loading = "lazy";
  avatar.addEventListener("error", () => {
    if (avatar.dataset.fallbackApplied !== "1") {
      avatar.dataset.fallbackApplied = "1";
      avatar.src = getCandidateFallbackImage(candidate);
      return;
    }
    avatar.src = DEFAULT_IMAGE;
  });
  const nameCopy = document.createElement("span");
  nameCopy.textContent = candidate.name;
  name.appendChild(avatar);
  name.appendChild(nameCopy);

  const party = document.createElement("td");
  party.textContent = candidate.party || "Unknown";

  const district = document.createElement("td");
  district.textContent = candidate.districtOrOffice || candidate.office || "Unknown";

  const stance = document.createElement("td");
  stance.textContent = candidate.stanceLabel || "Unknown";

  const amountCell = document.createElement("td");
  amountCell.className = "state-cell-amount";
  if (typeof candidate.israelLobbyTotal === "number" && !Number.isNaN(candidate.israelLobbyTotal)) {
    const badge = document.createElement("span");
    badge.className = `lobby-badge ${candidate.israelLobbyTotal > 0 ? "lobby-badge-positive" : "lobby-badge-zero"}`;
    badge.textContent = formatIsraelLobbyTotal(candidate.israelLobbyTotal);
    amountCell.appendChild(badge);
  } else {
    amountCell.textContent = "—";
  }

  tr.appendChild(name);
  tr.appendChild(party);
  tr.appendChild(district);
  tr.appendChild(stance);
  tr.appendChild(amountCell);
  return tr;
}

function renderTable(tableBody, candidates) {
  tableBody.innerHTML = "";
  if (!candidates.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "state-empty-cell";
    td.textContent = "No entries found.";
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }
  candidates.forEach((candidate) => {
    tableBody.appendChild(makeRow(candidate));
  });
}

function makeStanceSection(title) {
  const section = document.createElement("section");
  section.className = "detail-card";

  const heading = document.createElement("h2");
  heading.textContent = title;
  section.appendChild(heading);

  const wrap = document.createElement("div");
  wrap.className = "state-table-wrap";
  section.appendChild(wrap);

  const table = document.createElement("table");
  table.className = "state-table";
  wrap.appendChild(table);

  const thead = document.createElement("thead");
  table.appendChild(thead);

  const headerRow = document.createElement("tr");
  thead.appendChild(headerRow);

  ["Name", "Party", "Office", "Stance", "Lobby"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  return { section, tbody };
}

function ensureStanceSectionsRoot() {
  if (stanceSectionsRoot) return stanceSectionsRoot;
  const reference = houseSection || senateSection;
  if (!reference || !reference.parentElement) return null;
  stanceSectionsRoot = document.createElement("div");
  stanceSectionsRoot.className = "state-stance-groups";
  stanceSectionsRoot.hidden = true;
  reference.parentElement.insertBefore(stanceSectionsRoot, reference);
  return stanceSectionsRoot;
}

function renderGroupedByStance(candidates) {
  const root = ensureStanceSectionsRoot();
  if (!root) return;
  root.hidden = false;
  root.innerHTML = "";

  const configs = [
    { key: "Pro-Palestine", title: "Pro-Palestine" },
    { key: "Mixed-unclear", title: "Mixed-unclear" },
    { key: "Pro-Israel", title: "Pro-Israel" },
    { key: "Unknown", title: "Unknown" },
  ];

  configs.forEach(({ key, title }) => {
    const { section, tbody } = makeStanceSection(title);
    const grouped = candidates
      .filter((candidate) => (candidate.stanceLabel || "Unknown") === key)
      .sort((a, b) => a.name.localeCompare(b.name));
    renderTable(tbody, grouped);
    root.appendChild(section);
  });
}

function updateToggleUi() {
  if (!officeToggleButton || !stanceToggleButton) return;
  const isOffice = currentGroupMode === "office";
  officeToggleButton.classList.toggle("is-active", isOffice);
  stanceToggleButton.classList.toggle("is-active", !isOffice);
  officeToggleButton.setAttribute("aria-pressed", isOffice ? "true" : "false");
  stanceToggleButton.setAttribute("aria-pressed", isOffice ? "false" : "true");
}

function renderStateCandidates() {
  if (!senateSection || !houseSection) return;
  if (currentGroupMode === "office") {
    senateSection.hidden = false;
    houseSection.hidden = false;
    if (stanceSectionsRoot) {
      stanceSectionsRoot.hidden = true;
    }
    const senate = stateCandidatesCache
      .filter((candidate) => resolveOfficeScope(candidate) === "SENATE")
      .sort((a, b) => a.name.localeCompare(b.name));
    const house = stateCandidatesCache
      .filter((candidate) => resolveOfficeScope(candidate) === "HOUSE")
      .sort((a, b) => a.name.localeCompare(b.name));
    renderTable(senateTableBody, senate);
    renderTable(houseTableBody, house);
  } else {
    senateSection.hidden = true;
    houseSection.hidden = true;
    renderGroupedByStance(stateCandidatesCache);
  }
  updateToggleUi();
}

function createGroupToggle() {
  const header = document.querySelector(".state-header");
  if (!header || !header.parentElement) return;
  const wrap = document.createElement("section");
  wrap.className = "detail-card state-view-toggle-card";

  const controls = document.createElement("div");
  controls.className = "state-view-toggle";

  officeToggleButton = document.createElement("button");
  officeToggleButton.type = "button";
  officeToggleButton.className = "state-view-toggle-button";
  officeToggleButton.textContent = "Group by office";
  officeToggleButton.addEventListener("click", () => {
    currentGroupMode = "office";
    renderStateCandidates();
  });

  stanceToggleButton = document.createElement("button");
  stanceToggleButton.type = "button";
  stanceToggleButton.className = "state-view-toggle-button";
  stanceToggleButton.textContent = "Group by stance";
  stanceToggleButton.addEventListener("click", () => {
    currentGroupMode = "stance";
    renderStateCandidates();
  });

  controls.appendChild(officeToggleButton);
  controls.appendChild(stanceToggleButton);
  wrap.appendChild(controls);
  header.parentElement.insertBefore(wrap, senateSection || houseSection || header.nextSibling);
}

async function init() {
  const stateCode = getStateCodeFromPath();
  if (!stateCode) {
    throw new Error("State code not found in path");
  }

  const [profiledCandidates, federalCandidates, imageManifest] = await Promise.all([
    loadJson("../../data/politicians.json"),
    loadJson("../../data/2026-federal-candidates.json"),
    loadJson("../../data/candidate-images.json"),
  ]);

  const merged = makeCandidateIndex(profiledCandidates, federalCandidates);
  const hydrated = applyLocalImageMap(merged, imageManifest, "../../");
  const stateCandidates = hydrated.filter((candidate) => candidate.state === stateCode);
  stateCandidatesCache = stateCandidates;

  if (stateTitle) {
    stateTitle.textContent = getStateName(stateCode);
  }
  if (stateSubtitle) {
    stateSubtitle.textContent = `${stateCode} • Federal candidates and officials`;
  }
  if (stateCount) {
    stateCount.textContent = `${stateCandidates.length.toLocaleString()} politicians`;
  }
  if (stateFlag) {
    stateFlag.src = getStateFlagUrl(stateCode);
    stateFlag.alt = `${getStateName(stateCode)} flag`;
    stateFlag.addEventListener("error", () => {
      stateFlag.src = getStateFlagUrl("US");
    });
  }
  const groupParam = new URLSearchParams(window.location.search).get("group");
  if (groupParam === "stance") {
    currentGroupMode = "stance";
  }
  createGroupToggle();
  renderStateCandidates();
}

init().catch((error) => {
  if (stateTitle) {
    stateTitle.textContent = "State unavailable";
  }
  if (stateSubtitle) {
    stateSubtitle.textContent = "Unable to load this state page.";
  }
  console.error(error);
});
