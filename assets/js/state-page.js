import {
  DEFAULT_IMAGE,
  applyLocalImageMap,
  formatIsraelLobbyTotal,
  loadJson,
  makeCandidateIndex,
} from "./data.js";
import { getStateFlagUrl, getStateName } from "./states-data.js";

const stateTitle = document.getElementById("stateTitle");
const stateSubtitle = document.getElementById("stateSubtitle");
const stateCount = document.getElementById("stateCount");
const stateFlag = document.getElementById("stateFlag");
const senateTableBody = document.getElementById("senateTableBody");
const houseTableBody = document.getElementById("houseTableBody");

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
  const senate = stateCandidates.filter((candidate) => candidate.officeScope === "SENATE");
  const house = stateCandidates.filter((candidate) => candidate.officeScope === "HOUSE");

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
      stateFlag.src = "https://flagcdn.com/w80/us.png";
    });
  }

  renderTable(senateTableBody, senate);
  renderTable(houseTableBody, house);
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
