import type { SkinDepth, SkinUndertone } from "../types";

export interface SeasonalPalette {
  season: string;
  colorFamilies: string[];
}

const SEASON_TABLE: Record<SkinUndertone, Record<SkinDepth, SeasonalPalette>> = {
  warm: {
    light: {
      season: "warm spring",
      colorFamilies: ["peach", "coral", "golden yellow", "warm ivory", "light warm green"],
    },
    medium: {
      season: "warm autumn",
      colorFamilies: ["rust", "olive", "mustard", "terracotta", "camel"],
    },
    deep: {
      season: "deep autumn",
      colorFamilies: ["chocolate brown", "burnt orange", "deep olive", "espresso", "burnished gold"],
    },
  },
  cool: {
    light: {
      season: "light summer",
      colorFamilies: ["powder blue", "lavender", "rose pink", "soft grey", "dusty teal"],
    },
    medium: {
      season: "cool summer",
      colorFamilies: ["slate blue", "mauve", "raspberry", "cool grey", "seafoam"],
    },
    deep: {
      season: "deep winter",
      colorFamilies: ["true red", "emerald", "sapphire", "black", "icy white"],
    },
  },
  neutral: {
    light: {
      season: "soft summer",
      colorFamilies: ["dusty rose", "soft taupe", "sage", "muted denim", "oatmeal"],
    },
    medium: {
      season: "soft autumn",
      colorFamilies: ["warm taupe", "sage green", "dusty coral", "camel", "muted teal"],
    },
    deep: {
      season: "soft winter",
      colorFamilies: ["charcoal", "plum", "deep teal", "burgundy", "true white"],
    },
  },
};

export function getSeasonalPalette(
  skinUndertone: SkinUndertone,
  skinDepth: SkinDepth
): SeasonalPalette {
  return SEASON_TABLE[skinUndertone][skinDepth];
}
