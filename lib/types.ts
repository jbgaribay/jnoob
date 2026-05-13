// lib/types.ts

// ─── Sleeper User ────────────────────────────────────────────────────────────

export interface SleeperUser {
    user_id: string;
    username: string;
    display_name: string;
    avatar: string | null;
  }
  
  // ─── League ──────────────────────────────────────────────────────────────────
  
  export interface SleeperLeague {
    league_id: string;
    name: string;
    season: string;
    status: string; // "pre_draft" | "drafting" | "in_season" | "complete"
    sport: string;
    total_rosters: number;
    scoring_settings: Record<string, number>;
    roster_positions: string[]; // e.g. ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "SUPER_FLEX", "K", "DEF", "BN", "BN", ...]
    settings: {
      playoff_week_start: number;
      num_teams: number;
      max_keepers: number;
      draft_rounds: number;
    };
  }
  
  // ─── Roster ───────────────────────────────────────────────────────────────────
  
  export interface SleeperRoster {
    roster_id: number;
    owner_id: string; // user_id of the owner
    league_id: string;
    players: string[]; // array of player_ids
    starters: string[]; // player_ids in starting slots
    reserve: string[] | null; // IR slots
    taxi: string[] | null;
    settings: {
      wins: number;
      losses: number;
      ties: number;
      fpts: number;        // integer part of points for
      fpts_decimal: number;
      fpts_against: number;
      fpts_against_decimal: number;
      total_moves: number;
      waiver_position: number;
      waiver_budget_used: number;
    };
  }
  
  // ─── League User ─────────────────────────────────────────────────────────────
  
  export interface SleeperLeagueUser {
    user_id: string;
    username: string;
    display_name: string;
    avatar: string | null;
    roster_id: number;  // joined from rosters
    metadata: {
      team_name?: string;
    };
  }
  
  // ─── Player ───────────────────────────────────────────────────────────────────
  
  export interface SleeperPlayer {
    player_id: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    position: string;       // "QB" | "RB" | "WR" | "TE" | "K" | "DEF"
    team: string | null;    // NFL team abbreviation, null if FA
    status: string;         // "Active" | "Injured Reserve" | "Practice Squad" | etc.
    injury_status: string | null; // "Questionable" | "Doubtful" | "Out" | "IR" | null
    age: number | null;
    years_exp: number | null;
    bye_week?: number | null;
    number: number | null;
    depth_chart_position: number | null;
    search_rank: number | null;
  }
  
  // Player DB is a map of player_id → SleeperPlayer
  export type PlayerDB = Record<string, SleeperPlayer>;
  
  // ─── Matchup ─────────────────────────────────────────────────────────────────
  
  export interface SleeperMatchup {
    matchup_id: number;   // teams with same matchup_id are playing each other
    roster_id: number;
    week: number;         // added client-side when fetching
    points: number;
    starters: string[];   // player_ids
    starters_points: number[];
    players: string[];
    players_points: Record<string, number>;
  }
  
  // ─── Transaction ─────────────────────────────────────────────────────────────
  
  export type TransactionType = "trade" | "waiver" | "free_agent";
  
  export interface SleeperTransaction {
    transaction_id: string;
    type: TransactionType;
    status: string; // "complete" | "failed"
    created: number; // unix timestamp ms
    week: number;
    roster_ids: number[];
    adds: Record<string, number> | null;   // player_id → roster_id
    drops: Record<string, number> | null;  // player_id → roster_id
    draft_picks: SleeperDraftPick[];
    waiver_budget: { sender: number; receiver: number; amount: number }[];
  }
  
  export interface SleeperDraftPick {
    season: string;
    round: number;
    roster_id: number;
    previous_owner_id: number;
    owner_id: number;
  }
  
  // ─── NFL State ────────────────────────────────────────────────────────────────
  
  export interface SleeperNFLState {
    week: number;
    season: string;
    season_type: string; // "pre" | "regular" | "post"
    season_start_date: string;
    previous_season: string;
    display_week: number;
    leg: number;
  }
  
  // ─── Trending Player ─────────────────────────────────────────────────────────
  
  export interface SleeperTrendingPlayer {
    player_id: string;
    count: number; // number of adds/drops in last 24h
  }
  
  // ─── App-Level Derived Types ──────────────────────────────────────────────────
  
  // A roster entry enriched with player info — used throughout the UI
  export interface EnrichedPlayer {
    player_id: string;
    name: string;
    position: string;
    team: string;
    injuryStatus: string | null;
    seasonPoints: number;
    isStarter: boolean;
  }
  
  // One team's full picture, used in League Spy
  export interface TeamSummary {
    rosterId: number;
    userId: string;
    teamName: string;
    displayName: string;
    record: { wins: number; losses: number; ties: number };
    pointsFor: number;
    pointsAgainst: number;
    players: EnrichedPlayer[];
    rank?: number;
    grade?: string;
    gradeNote?: string;
  }
  
  // ─── Claude Response Shapes ───────────────────────────────────────────────────
  
  export interface TradeAnalysis {
    verdict: "WIN" | "LOSS" | "FAIR";
    summary: string;
    pros: string[];
    cons: string[];
    tip: string;
  }
  
  export interface TeamHealthAnalysis {
    weak_spots: string[];
    strength: string;
    urgent_action: string;
  }
  
  export interface WaiverAnalysis {
    recommend: boolean;
    reason: string;
    drop_suggestion: string | null;
    drop_reason: string;
  }
  
  export interface RosterGrade {
    roster_id: number;
    grade: string;
    note: string;
  }
  
  export interface LeagueGrades {
    grades: RosterGrade[];
  }
  
  export interface TradeTarget {
    team_name: string;
    their_weak_spot: string;
    your_offer: string;
    ask_for: string;
    pitch: string;
  }
  
  export interface TradeTargets {
    targets: TradeTarget[];
  }
  
  export interface StartSitRecommendation {
    lineup: { slot: string; player: string; reason: string }[];
    bench: string[];
    warning: string;
  }
  
  export interface SeasonStory {
    narrative: string;
    best_move: { description: string; impact: string };
    worst_move: { description: string; impact: string };
    turning_point: string;
    outlook: string;
  }