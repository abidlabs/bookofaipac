import type { MergedCandidate } from "./candidateIndex";

export function resolveOfficeScope(candidate: MergedCandidate): "SENATE" | "HOUSE" | "" {
  const scope = candidate.officeScope;
  if (scope === "SENATE" || scope === "HOUSE") return scope;
  const officeText = `${candidate.districtOrOffice || ""}`.toLowerCase();
  if (officeText.includes("senate")) return "SENATE";
  if (officeText.includes("house")) return "HOUSE";
  return "";
}
