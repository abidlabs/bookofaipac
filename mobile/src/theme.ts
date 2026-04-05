export const colors = {
  bg: "#0c0c0e",
  bgElevated: "#141418",
  card: "#18181e",
  cardHover: "#22222c",
  text: "#f0f0f0",
  textDim: "#8888a0",
  border: "#26263a",
  accent: "#7da0ff",

  stanceRed: "#ff9090",
  stanceRedBg: "rgba(220, 38, 38, 0.14)",
  stanceRedBorder: "rgba(220, 38, 38, 0.35)",

  stanceGreen: "#6de098",
  stanceGreenBg: "rgba(22, 163, 74, 0.13)",
  stanceGreenBorder: "rgba(22, 163, 74, 0.32)",

  stanceGray: "#c0c0d8",
  stanceGrayBg: "rgba(110, 110, 140, 0.12)",
  stanceGrayBorder: "rgba(110, 110, 140, 0.3)",

  stanceNeutral: "#a8a8f8",
  stanceNeutralBg: "rgba(99, 102, 241, 0.1)",
  stanceNeutralBorder: "rgba(99, 102, 241, 0.28)",
} as const;

export function stanceColors(label: string) {
  switch (label) {
    case "Pro-Israel":
      return {
        text: colors.stanceRed,
        bg: colors.stanceRedBg,
        border: colors.stanceRedBorder,
      };
    case "Pro-Palestine":
      return {
        text: colors.stanceGreen,
        bg: colors.stanceGreenBg,
        border: colors.stanceGreenBorder,
      };
    case "Mixed-unclear":
      return {
        text: colors.stanceGray,
        bg: colors.stanceGrayBg,
        border: colors.stanceGrayBorder,
      };
    default:
      return {
        text: colors.stanceNeutral,
        bg: colors.stanceNeutralBg,
        border: colors.stanceNeutralBorder,
      };
  }
}

// Base URL for the deployed site (GitHub Pages)
export const SITE_BASE_URL = "https://abidlabs.github.io/bookofaipac";
