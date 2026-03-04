import { loadJson } from "./data.js";

const datasetMeta = document.getElementById("datasetMeta");
const datasetTotal = document.getElementById("datasetTotal");

async function initFooter() {
  if (!datasetTotal || !datasetMeta) return;
  try {
    const pathname = window.location.pathname;
    const segments = pathname.split("/").filter(Boolean);
    let dataPath = "./data/2026-federal-candidates.json";
    if (pathname.includes("/detail/") || pathname.includes("/api/")) {
      dataPath = "../data/2026-federal-candidates.json";
    } else {
      const statesIndex = segments.indexOf("states");
      if (statesIndex >= 0) {
        const nextSegment = segments[statesIndex + 1] || "";
        const hasStateCode = !!nextSegment && !nextSegment.endsWith(".html");
        dataPath = hasStateCode ? "../../data/2026-federal-candidates.json" : "../data/2026-federal-candidates.json";
      }
    }
    const federalCandidates = await loadJson(dataPath);
    const electedOfficials = federalCandidates.filter(
      (candidate) => candidate.incumbency === "Incumbent"
    ).length;
    const nonIncumbentCandidates = federalCandidates.length - electedOfficials;
    datasetTotal.textContent = `${federalCandidates.length.toLocaleString()} Politicians in dataset`;
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
