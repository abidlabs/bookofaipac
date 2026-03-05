import { loadJson } from "./data.js?v=20260305";
import { getStateFlagUrl, getStateName } from "./states-data.js?v=20260305";

const listRoot = document.getElementById("statesList");

function stateCardTemplate(stateRecord) {
  const link = document.createElement("a");
  link.className = "state-card";
  link.href = `./${stateRecord.code.toLowerCase()}/index.html`;

  const image = document.createElement("img");
  image.className = "state-card-image";
  image.src = getStateFlagUrl(stateRecord.code);
  image.alt = `${stateRecord.name} flag`;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.src = getStateFlagUrl("US");
  });

  const copyWrap = document.createElement("div");
  copyWrap.className = "state-card-copy";

  const title = document.createElement("h3");
  title.className = "state-card-title";
  title.textContent = stateRecord.name;

  const meta = document.createElement("p");
  meta.className = "state-card-meta";
  meta.textContent = stateRecord.code;

  copyWrap.appendChild(title);
  copyWrap.appendChild(meta);

  const badge = document.createElement("span");
  badge.className = "state-count-badge";
  badge.textContent = `${stateRecord.count.toLocaleString()} politicians`;

  link.appendChild(image);
  link.appendChild(copyWrap);
  link.appendChild(badge);
  return link;
}

function renderStates(federalCandidates) {
  const stateMap = federalCandidates.reduce((acc, candidate) => {
    if (!candidate.state) return acc;
    acc.set(candidate.state, (acc.get(candidate.state) || 0) + 1);
    return acc;
  }, new Map());

  const states = Array.from(stateMap.entries())
    .map(([code, count]) => ({
      code,
      count,
      name: getStateName(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  listRoot.innerHTML = "";
  states.forEach((stateRecord) => {
    listRoot.appendChild(stateCardTemplate(stateRecord));
  });
}

async function init() {
  if (!listRoot) return;
  const federalCandidates = await loadJson("../data/2026-federal-candidates.json");
  renderStates(federalCandidates);
}

init().catch((error) => {
  if (listRoot) {
    listRoot.innerHTML = `<p class="states-empty">Failed to load states.</p>`;
  }
  console.error(error);
});
