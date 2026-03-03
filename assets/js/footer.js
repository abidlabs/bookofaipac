import { loadJson } from "./data.js";

const datasetMeta = document.getElementById("datasetMeta");
const datasetTotal = document.getElementById("datasetTotal");

async function initFooter() {
  if (!datasetTotal || !datasetMeta) return;
  try {
    const dataPath =
      window.location.pathname.includes("/detail/") || window.location.pathname.includes("/api/")
        ? "../data/2026-federal-candidates.json"
        : "./data/2026-federal-candidates.json";
    const federalCandidates = await loadJson(dataPath);
    const electedOfficials = federalCandidates.filter(
      (candidate) => candidate.incumbency === "Incumbent"
    ).length;
    const nonIncumbentCandidates = federalCandidates.length - electedOfficials;
    datasetTotal.textContent = `${federalCandidates.length.toLocaleString()} Candidates in dataset`;
    datasetMeta.textContent =
      `${electedOfficials.toLocaleString()} elected officials • ` +
      `${nonIncumbentCandidates.toLocaleString()} candidates`;
  } catch (error) {
    datasetTotal.textContent = "Failed to load dataset.";
    datasetMeta.textContent = "";
    console.error(error);
  }
}

initFooter();
