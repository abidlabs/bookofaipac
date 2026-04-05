export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
  PR: "Puerto Rico",
  GU: "Guam",
  VI: "U.S. Virgin Islands",
  MP: "Northern Mariana Islands",
  AS: "American Samoa",
};

const TERRITORY_CODES = new Set(["PR", "GU", "VI", "MP", "AS"]);

export function getStateName(code: string): string {
  return STATE_NAMES[code] || code;
}

function normalizeRegionName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\./g, "");
}

const NAME_TO_CODE: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [code, name] of Object.entries(STATE_NAMES)) {
    m.set(normalizeRegionName(name), code);
  }
  m.set(normalizeRegionName("Washington DC"), "DC");
  m.set(normalizeRegionName("Washington D.C."), "DC");
  return m;
})();

export function regionStringToStateCode(region: string | null | undefined): string | null {
  if (!region) return null;
  const t = region.trim();
  if (/^[A-Za-z]{2}$/.test(t)) {
    const code = t.toUpperCase();
    if (STATE_NAMES[code]) return code;
  }
  return NAME_TO_CODE.get(normalizeRegionName(t)) ?? null;
}

export const US_STATE_AND_DC_CODES: string[] = Object.keys(STATE_NAMES)
  .filter((c) => !TERRITORY_CODES.has(c))
  .sort((a, b) => getStateName(a).localeCompare(getStateName(b)));
