// lib/config.ts

export const CONFIG = {
    // Personal Sleeper settings
    username: "jdomeington",
    leagueId: "1336791576680083456",
    scoringFormat: "ppr" as const,
  
    // 2025 season (most recently completed)
    // Update to "2026" when the new season kicks off in August
    season: "2025",
  
    // Roster slots — matches your league's SuperFlex format
    rosterSlots: {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,       // W/R/T — WR, RB, or TE
      SUPER_FLEX: 1, // W/R/T/Q — WR, RB, TE, or QB
      K: 1,
      DEF: 1,
    },
  
    // Positions eligible for each flex slot
    flexEligible: ["WR", "RB", "TE"] as const,
    superFlexEligible: ["WR", "RB", "TE", "QB"] as const,
  
    // Sleeper API
    sleeperBaseUrl: "https://api.sleeper.app/v1",
  
    // Claude API
    claudeModel: "claude-sonnet-4-20250514",
    claudeMaxTokens: 1000,
    claudeMaxTokensLong: 1500, // Season Story narrative
  } as const;
  
  export type ScoringFormat = "ppr" | "half_ppr" | "standard";
  export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "FLEX" | "SUPER_FLEX";