// lib/claude.ts
// All Claude API call functions, one per feature.
// Never sends the raw 5MB playerDB — always resolves to names/positions first.

import { CONFIG } from "./config";
import type {
  EnrichedPlayer,
  TeamSummary,
  TradeAnalysis,
  TeamHealthAnalysis,
  WaiverAnalysis,
  LeagueGrades,
  TradeTargets,
  StartSitRecommendation,
  SeasonStory,
  SleeperTransaction,
  SleeperMatchup,
} from "./types";

// ─── Generic Claude fetch helper ──────────────────────────────────────────────

async function claudeFetch<T>(
  prompt: string,
  maxTokens: number = CONFIG.claudeMaxTokens
): Promise<T> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CONFIG.claudeModel,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  // Strip any accidental markdown fences before parsing
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as T;
  } catch {
    throw new Error(`Claude returned invalid JSON: ${clean.slice(0, 200)}`);
  }
}

// ─── Feature 1: Trade Analyzer ────────────────────────────────────────────────

export interface TradeAnalyzerInput {
  myRoster: EnrichedPlayer[];
  theirRoster: EnrichedPlayer[];
  giving: EnrichedPlayer[];
  receiving: EnrichedPlayer[];
  scoringFormat: string;
  currentWeek: number;
}

export async function analyzeTrade(
  input: TradeAnalyzerInput
): Promise<TradeAnalysis> {
  const prompt = `You are an expert fantasy football analyst. Analyze this trade and respond ONLY with valid JSON — no preamble, no markdown.

League format: ${input.scoringFormat.toUpperCase()}, SuperFlex (QB eligible in flex)
Current NFL week: ${input.currentWeek}

MY FULL ROSTER:
${formatRosterForClaude(input.myRoster)}

THEIR FULL ROSTER:
${formatRosterForClaude(input.theirRoster)}

TRADE DETAILS:
I am GIVING: ${input.giving.map((p) => `${p.name} (${p.position}, ${p.seasonPoints.toFixed(1)} pts)`).join(", ")}
I am RECEIVING: ${input.receiving.map((p) => `${p.name} (${p.position}, ${p.seasonPoints.toFixed(1)} pts)`).join(", ")}

Consider: positional value, roster construction, SuperFlex QB premium, bye weeks, injury status, and what each team needs.

Respond with this exact JSON shape:
{
  "verdict": "WIN" | "LOSS" | "FAIR",
  "summary": "2-3 sentence plain English verdict",
  "pros": ["...", "..."],
  "cons": ["...", "..."],
  "tip": "One actionable follow-up suggestion"
}`;

  return claudeFetch<TradeAnalysis>(prompt);
}

// ─── Feature 2: Team Health ───────────────────────────────────────────────────

export async function analyzeTeamHealth(
  myRoster: EnrichedPlayer[],
  scoringFormat: string,
  currentWeek: number
): Promise<TeamHealthAnalysis> {
  const prompt = `You are an expert fantasy football analyst. Evaluate this team's health and respond ONLY with valid JSON — no preamble, no markdown.

League format: ${scoringFormat.toUpperCase()}, SuperFlex
Current NFL week: ${currentWeek}

MY ROSTER:
${formatRosterForClaude(myRoster)}

Identify positional weaknesses, the team's biggest strength, and the single most urgent action to take this week.

Respond with this exact JSON shape:
{
  "weak_spots": ["Position X is weak because...", "..."],
  "strength": "Your biggest asset is...",
  "urgent_action": "One specific thing to do this week"
}`;

  return claudeFetch<TeamHealthAnalysis>(prompt);
}

// ─── Feature 3: Waiver Wire Advisor ───────────────────────────────────────────

export interface WaiverAdvisorInput {
  playerName: string;
  playerPosition: string;
  playerTeam: string;
  trendCount: number;
  injuryStatus: string | null;
  myRoster: EnrichedPlayer[];
  scoringFormat: string;
}

export async function analyzeWaiverAdd(
  input: WaiverAdvisorInput
): Promise<WaiverAnalysis> {
  const prompt = `You are an expert fantasy football analyst. Advise on this waiver wire pickup and respond ONLY with valid JSON — no preamble, no markdown.

League format: ${input.scoringFormat.toUpperCase()}, SuperFlex
Trending player being considered: ${input.playerName} (${input.playerPosition} - ${input.playerTeam})
Trending add count (last 24h): ${input.trendCount}
Injury status: ${input.injuryStatus ?? "Healthy"}

MY CURRENT ROSTER:
${formatRosterForClaude(input.myRoster)}

Should I add this player? If yes, who should I drop to make room? Consider whether the trend is real or noise, and whether this player fills a genuine need.

Respond with this exact JSON shape:
{
  "recommend": true | false,
  "reason": "Plain English explanation (2-3 sentences)",
  "drop_suggestion": "Player name to drop, or null if no drop needed",
  "drop_reason": "Why drop them, or empty string if no drop"
}`;

  return claudeFetch<WaiverAnalysis>(prompt);
}

// ─── Feature 4: League Spy — Roster Grades ────────────────────────────────────

export async function gradeAllRosters(
  teams: TeamSummary[],
  scoringFormat: string,
  currentWeek: number
): Promise<LeagueGrades> {
  const teamsText = teams
    .map(
      (t) =>
        `Team: ${t.teamName} (roster_id: ${t.rosterId})\nRecord: ${t.record.wins}-${t.record.losses}\nPoints For: ${t.pointsFor.toFixed(1)}\nRoster:\n${formatRosterForClaude(t.players)}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are an expert fantasy football analyst. Grade every team's roster and respond ONLY with valid JSON — no preamble, no markdown.

League format: ${scoringFormat.toUpperCase()}, SuperFlex
Current NFL week: ${currentWeek}

ALL TEAMS:
${teamsText}

Grade each roster A through F based on overall talent, depth, and positional balance. Be decisive — not everyone gets a B.

Respond with this exact JSON shape:
{
  "grades": [
    { "roster_id": 1, "grade": "A-", "note": "Elite RB corps, but TE is a black hole" },
    ...
  ]
}`;

  return claudeFetch<LeagueGrades>(prompt, 1500);
}

// ─── Feature 4: League Spy — Trade Target Finder ─────────────────────────────

export async function findTradeTargets(
  myStrengthPosition: string,
  myRoster: EnrichedPlayer[],
  allTeams: TeamSummary[],
  scoringFormat: string
): Promise<TradeTargets> {
  const opponents = allTeams
    .map(
      (t) =>
        `Team: ${t.teamName}\nRoster:\n${formatRosterForClaude(t.players)}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are an expert fantasy football trade negotiator. Find the best trade targets and respond ONLY with valid JSON — no preamble, no markdown.

League format: ${scoringFormat.toUpperCase()}, SuperFlex
I am strong at: ${myStrengthPosition}

MY ROSTER:
${formatRosterForClaude(myRoster)}

ALL OPPONENT ROSTERS:
${opponents}

Find teams that are weak at a position I need, where I can offer my ${myStrengthPosition} depth. Return the 3 best targets.

Respond with this exact JSON shape:
{
  "targets": [
    {
      "team_name": "...",
      "their_weak_spot": "TE",
      "your_offer": "Player X from my roster",
      "ask_for": "Player Y from their roster",
      "pitch": "One sentence on how to frame this offer"
    }
  ]
}`;

  return claudeFetch<TradeTargets>(prompt);
}

// ─── Feature 5: Start/Sit Helper ─────────────────────────────────────────────

export async function optimizeLineup(
  myRoster: EnrichedPlayer[],
  scoringFormat: string,
  currentWeek: number,
  rosterSlots: Record<string, number>
): Promise<StartSitRecommendation> {
  const slotsText = Object.entries(rosterSlots)
    .map(([slot, count]) => `${slot}: ${count}`)
    .join(", ");

  const prompt = `You are an expert fantasy football lineup optimizer. Set the optimal lineup and respond ONLY with valid JSON — no preamble, no markdown.

League format: ${scoringFormat.toUpperCase()}, SuperFlex (QB eligible in SUPER_FLEX slot)
Current NFL week: ${currentWeek}
Roster slots: ${slotsText}

MY FULL ROSTER (name, position, team, injury status, season points):
${formatRosterForClaude(myRoster)}

Set the best possible starting lineup for this week. Account for bye weeks, injury status, and matchups. The SUPER_FLEX slot should be filled by a QB if one is available on the bench.

Respond with this exact JSON shape:
{
  "lineup": [
    { "slot": "QB", "player": "Player Name", "reason": "Short reason" },
    { "slot": "RB1", "player": "...", "reason": "..." },
    { "slot": "RB2", "player": "...", "reason": "..." },
    { "slot": "WR1", "player": "...", "reason": "..." },
    { "slot": "WR2", "player": "...", "reason": "..." },
    { "slot": "TE", "player": "...", "reason": "..." },
    { "slot": "FLEX", "player": "...", "reason": "..." },
    { "slot": "SUPER_FLEX", "player": "...", "reason": "..." },
    { "slot": "K", "player": "...", "reason": "..." },
    { "slot": "DEF", "player": "...", "reason": "..." }
  ],
  "bench": ["Player A", "Player B"],
  "warning": "Any injury or bye week flag to watch, or empty string"
}`;

  return claudeFetch<StartSitRecommendation>(prompt);
}

// ─── Feature 6: Season Story ──────────────────────────────────────────────────

export interface SeasonStoryInput {
  teamName: string;
  record: { wins: number; losses: number; ties: number };
  rank: number;
  totalTeams: number;
  weeklyResults: { week: number; myPoints: number; oppPoints: number; win: boolean }[];
  transactions: SleeperTransaction[];
  allMatchups: SleeperMatchup[];
  resolvePlayerName: (id: string) => string;
}

export async function generateSeasonStory(
  input: SeasonStoryInput
): Promise<SeasonStory> {
  const resultsText = input.weeklyResults
    .map(
      (r) =>
        `Week ${r.week}: ${r.win ? "WIN" : "LOSS"} ${r.myPoints.toFixed(1)}-${r.oppPoints.toFixed(1)}`
    )
    .join("\n");

  // Summarize transactions — resolve player IDs to names
  const txText = input.transactions
    .slice(0, 30) // cap at 30 to avoid token overflow
    .map((tx) => {
      if (tx.type === "trade") {
        const added = Object.keys(tx.adds ?? {}).map(input.resolvePlayerName).join(", ");
        const dropped = Object.keys(tx.drops ?? {}).map(input.resolvePlayerName).join(", ");
        return `Week ${tx.week} TRADE: received ${added || "picks"}, gave ${dropped || "picks"}`;
      }
      if (tx.type === "waiver" || tx.type === "free_agent") {
        const added = Object.keys(tx.adds ?? {}).map(input.resolvePlayerName).join(", ");
        const dropped = Object.keys(tx.drops ?? {}).map(input.resolvePlayerName).join(", ");
        return `Week ${tx.week} WAIVER: added ${added}, dropped ${dropped || "nobody"}`;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a witty, insightful fantasy football analyst writing a season recap. Respond ONLY with valid JSON — no preamble, no markdown.

Team: ${input.teamName}
Final record: ${input.record.wins}-${input.record.losses}-${input.record.ties}
League rank: ${input.rank} of ${input.totalTeams}

WEEKLY RESULTS:
${resultsText}

TRANSACTION HISTORY (trades, waivers):
${txText || "No transactions recorded."}

Write an engaging 2-3 paragraph narrative of this team's season. Identify the best and worst moves, the turning point week, and give a one-sentence playoff outlook. Be specific — reference actual weeks, scores, and players by name.

Respond with this exact JSON shape:
{
  "narrative": "2-3 paragraph story of the season",
  "best_move": { "description": "What happened", "impact": "Why it mattered" },
  "worst_move": { "description": "What happened", "impact": "Why it hurt" },
  "turning_point": "The week everything changed was...",
  "outlook": "One sentence on playoff chances or legacy"
}`;

  return claudeFetch<SeasonStory>(prompt, CONFIG.claudeMaxTokensLong);
}

// ─── Shared Formatting Utility ────────────────────────────────────────────────

/**
 * Format an enriched player array into a compact text table for Claude prompts.
 * Keeps token usage low — never sends raw JSON objects.
 */
function formatRosterForClaude(players: EnrichedPlayer[]): string {
  return players
    .map((p) => {
      const injury = p.injuryStatus ? ` [${p.injuryStatus}]` : "";
      const pts = p.seasonPoints.toFixed(1);
      return `  ${p.position.padEnd(5)} ${p.name.padEnd(25)} ${p.team.padEnd(4)} ${pts} pts${injury}`;
    })
    .join("\n");
}