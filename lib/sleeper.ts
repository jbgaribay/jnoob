// lib/sleeper.ts
// All Sleeper public API fetch functions. No auth required.

import { CONFIG } from "./config";
import type {
  SleeperUser,
  SleeperLeague,
  SleeperRoster,
  SleeperLeagueUser,
  PlayerDB,
  SleeperMatchup,
  SleeperTransaction,
  SleeperNFLState,
  SleeperTrendingPlayer,
} from "./types";

const BASE = CONFIG.sleeperBaseUrl;

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API error ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * Resolve a Sleeper username to a user object (includes user_id).
 */
export async function fetchUser(username: string): Promise<SleeperUser> {
  return sleeperFetch<SleeperUser>(`/user/${username}`);
}

// ─── Leagues ──────────────────────────────────────────────────────────────────

/**
 * Fetch all NFL leagues for a user in a given season.
 */
export async function fetchUserLeagues(
  userId: string,
  season: string = CONFIG.season
): Promise<SleeperLeague[]> {
  return sleeperFetch<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
}

/**
 * Fetch a single league's settings and metadata.
 */
export async function fetchLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`);
}

// ─── Rosters & Users ──────────────────────────────────────────────────────────

/**
 * Fetch all rosters in a league.
 */
export async function fetchRosters(leagueId: string): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`);
}

/**
 * Fetch all users in a league. Returns raw league users without roster_id.
 * Use buildUserMap() below to join with rosters.
 */
export async function fetchLeagueUsers(
  leagueId: string
): Promise<Omit<SleeperLeagueUser, "roster_id">[]> {
  return sleeperFetch<Omit<SleeperLeagueUser, "roster_id">[]>(
    `/league/${leagueId}/users`
  );
}

/**
 * Join league users with rosters so each user has a roster_id.
 * Sleeper returns these as separate endpoints — this glues them together.
 */
export function buildUserMap(
  users: Omit<SleeperLeagueUser, "roster_id">[],
  rosters: SleeperRoster[]
): SleeperLeagueUser[] {
  // Build owner_id → roster_id map from rosters
  const ownerToRoster = new Map<string, number>();
  for (const roster of rosters) {
    ownerToRoster.set(roster.owner_id, roster.roster_id);
  }

  return users.map((user) => ({
    ...user,
    roster_id: ownerToRoster.get(user.user_id) ?? -1,
  }));
}

// ─── Players ──────────────────────────────────────────────────────────────────

/**
 * Fetch the full NFL player database (~5MB).
 * IMPORTANT: Call this once per session and store in app state. Do not refetch.
 */
export async function fetchPlayerDB(): Promise<PlayerDB> {
  return sleeperFetch<PlayerDB>("/players/nfl");
}

/**
 * Resolve a player_id to a display name using the cached PlayerDB.
 * Falls back to the raw player_id string if not found.
 */
export function resolvePlayerName(
  playerId: string,
  playerDB: PlayerDB
): string {
  const p = playerDB[playerId];
  if (!p) return `Unknown (${playerId})`;
  return p.full_name ?? `${p.first_name} ${p.last_name}`;
}

/**
 * Resolve a list of player_ids to their names.
 */
export function resolvePlayerNames(
  playerIds: string[],
  playerDB: PlayerDB
): string[] {
  return playerIds.map((id) => resolvePlayerName(id, playerDB));
}

// ─── Matchups ─────────────────────────────────────────────────────────────────

/**
 * Fetch matchups for a single week.
 * Injects the week number into each matchup (Sleeper omits it from the body).
 */
export async function fetchMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  const matchups = await sleeperFetch<SleeperMatchup[]>(
    `/league/${leagueId}/matchups/${week}`
  );
  return matchups.map((m) => ({ ...m, week }));
}

/**
 * Fetch matchups for all weeks from 1 through currentWeek (inclusive).
 * Fires requests concurrently — stays well under Sleeper's 1000 req/min limit.
 */
export async function fetchAllMatchups(
  leagueId: string,
  currentWeek: number
): Promise<SleeperMatchup[]> {
  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);
  const results = await Promise.all(
    weeks.map((week) => fetchMatchups(leagueId, week))
  );
  return results.flat();
}

/**
 * Calculate total season points for a given roster_id from all matchups.
 */
export function calcSeasonPoints(
  rosterId: number,
  allMatchups: SleeperMatchup[]
): number {
  return allMatchups
    .filter((m) => m.roster_id === rosterId)
    .reduce((sum, m) => sum + (m.points ?? 0), 0);
}

/**
 * Calculate total points scored by each player across all matchups for a roster.
 * Returns a map of player_id → total points.
 */
export function calcPlayerSeasonPoints(
  rosterId: number,
  allMatchups: SleeperMatchup[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const matchup of allMatchups) {
    if (matchup.roster_id !== rosterId) continue;
    for (const [playerId, pts] of Object.entries(
      matchup.players_points ?? {}
    )) {
      totals[playerId] = (totals[playerId] ?? 0) + pts;
    }
  }
  return totals;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * Fetch transactions for a single week.
 */
export async function fetchTransactions(
  leagueId: string,
  week: number
): Promise<SleeperTransaction[]> {
  return sleeperFetch<SleeperTransaction[]>(
    `/league/${leagueId}/transactions/${week}`
  );
}

/**
 * Fetch all transactions across all weeks (1 through currentWeek).
 * Filters to only "complete" transactions.
 */
export async function fetchAllTransactions(
  leagueId: string,
  currentWeek: number
): Promise<SleeperTransaction[]> {
  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);
  const results = await Promise.all(
    weeks.map((week) => fetchTransactions(leagueId, week))
  );
  return results
    .flat()
    .filter((t) => t.status === "complete");
}

// ─── NFL State ────────────────────────────────────────────────────────────────

/**
 * Fetch the current NFL state — gives us the current week and season.
 */
export async function fetchNFLState(): Promise<SleeperNFLState> {
  return sleeperFetch<SleeperNFLState>("/state/nfl");
}

// ─── Trending Players ─────────────────────────────────────────────────────────

/**
 * Fetch trending waiver adds in the last 24 hours.
 */
export async function fetchTrendingAdds(): Promise<SleeperTrendingPlayer[]> {
  return sleeperFetch<SleeperTrendingPlayer[]>(
    "/players/nfl/trending/add?lookback_hours=24&limit=25"
  );
}

/**
 * Fetch trending drops in the last 24 hours.
 */
export async function fetchTrendingDrops(): Promise<SleeperTrendingPlayer[]> {
  return sleeperFetch<SleeperTrendingPlayer[]>(
    "/players/nfl/trending/drop?lookback_hours=24&limit=25"
  );
}

// ─── Data Loading Orchestrator ────────────────────────────────────────────────

/**
 * Progress callback type — called at each loading stage.
 * Used to drive the progress bar in the UI.
 */
export type LoadingStage =
  | "nfl_state"
  | "player_db"
  | "league"
  | "users"
  | "rosters"
  | "matchups"
  | "transactions"
  | "trending"
  | "done";

export interface LoadProgress {
  stage: LoadingStage;
  pct: number; // 0–100
}

export interface LeagueData {
  nflState: SleeperNFLState;
  playerDB: PlayerDB;
  league: SleeperLeague;
  users: SleeperLeagueUser[];
  rosters: SleeperRoster[];
  allMatchups: SleeperMatchup[];
  allTransactions: SleeperTransaction[];
  trendingAdds: SleeperTrendingPlayer[];
  myRoster: SleeperRoster;
  myUser: SleeperLeagueUser;
  currentWeek: number;
}

/**
 * Master data loader — fetches everything needed to power all 6 features.
 * Calls onProgress at each stage so the UI can show a progress bar.
 * Accepts an optional cached playerDB to avoid re-fetching the 5MB payload.
 */
export async function loadLeagueData(
  leagueId: string,
  myUserId: string,
  onProgress: (p: LoadProgress) => void,
  cachedPlayerDB?: PlayerDB
): Promise<LeagueData> {
  // 1. NFL State
  onProgress({ stage: "nfl_state", pct: 5 });
  const nflState = await fetchNFLState();

  // During offseason (pre/post), default to week 1 for data fetching purposes.
  // The most recent completed week is what we care about for historical data.
  const currentWeek =
    nflState.season_type === "regular" && nflState.week > 0
      ? nflState.week
      : 18; // fetch full season if offseason

  // 2. Player DB (use cache if available)
  onProgress({ stage: "player_db", pct: 15 });
  const playerDB = cachedPlayerDB ?? (await fetchPlayerDB());

  // 3. League settings
  onProgress({ stage: "league", pct: 30 });
  const league = await fetchLeague(leagueId);

  // 4. Users
  onProgress({ stage: "users", pct: 40 });
  const rawUsers = await fetchLeagueUsers(leagueId);

  // 5. Rosters
  onProgress({ stage: "rosters", pct: 50 });
  const rosters = await fetchRosters(leagueId);

  // Join users + rosters
  const users = buildUserMap(rawUsers, rosters);

  // Find my roster and user record
  const myUser = users.find((u) => u.user_id === myUserId);
  if (!myUser) throw new Error("Could not find your user in this league.");

  const myRoster = rosters.find((r) => r.roster_id === myUser.roster_id);
  if (!myRoster) throw new Error("Could not find your roster in this league.");

  // 6. All matchups (weeks 1 → currentWeek)
  onProgress({ stage: "matchups", pct: 60 });
  const allMatchups = await fetchAllMatchups(leagueId, currentWeek);

  // 7. All transactions
  onProgress({ stage: "transactions", pct: 80 });
  const allTransactions = await fetchAllTransactions(leagueId, currentWeek);

  // 8. Trending adds
  onProgress({ stage: "trending", pct: 92 });
  const trendingAdds = await fetchTrendingAdds();

  onProgress({ stage: "done", pct: 100 });

  return {
    nflState,
    playerDB,
    league,
    users,
    rosters,
    allMatchups,
    allTransactions,
    trendingAdds,
    myRoster,
    myUser,
    currentWeek,
  };
}