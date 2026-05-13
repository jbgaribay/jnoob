// lib/config.ts

export const CONFIG = {
  username: "jdomeington",
  leagueId: "1336791576680083456",
  scoringFormat: "ppr" as const,
  season: "2025",

  rosterSlots: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    SUPER_FLEX: 1,
    K: 1,
    DEF: 1,
  },

  flexEligible: ["WR", "RB", "TE"] as const,
  superFlexEligible: ["WR", "RB", "TE", "QB"] as const,

  sleeperBaseUrl: "https://api.sleeper.app/v1",

  // FantasyCalc — dynasty values (SuperFlex 2QB, PPR, 12-team)
  fantasyCalcUrl:
    "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&ppr=1&numTeams=12",

  claudeModel: "claude-sonnet-4-20250514",
  claudeMaxTokens: 1000,
  claudeMaxTokensLong: 1500,
} as const;

export type ScoringFormat = "ppr" | "half_ppr" | "standard";
export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "FLEX" | "SUPER_FLEX";

// ─── User Settings (persisted to localStorage) ────────────────────────────────

export type TeamPosture = "contending" | "rebuilding" | "selling";

export interface UserSettings {
  posture: TeamPosture;
  untradeable: string[]; // player_ids
}

export const DEFAULT_SETTINGS: UserSettings = {
  posture: "contending",
  untradeable: [],
};

export const SETTINGS_STORAGE_KEY = "jnoob_settings";