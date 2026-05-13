"use client";

// app/page.tsx

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  ArrowLeftRight,
  TrendingUp,
  Eye,
  CalendarDays,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Settings as SettingsIcon,
} from "lucide-react";

import { CONFIG, DEFAULT_SETTINGS, type UserSettings } from "@/lib/config";
import { fetchUser, loadLeagueData, type LeagueData, type LoadProgress } from "@/lib/sleeper";
import { calcSeasonPoints } from "@/lib/sleeper";

import TeamHealth    from "@/components/features/TeamHealth";
import TradeAnalyzer from "@/components/features/TradeAnalyzer";
import WaiverWire    from "@/components/features/WaiverWire";
import LeagueSpy     from "@/components/features/LeagueSpy";
import StartSit      from "@/components/features/StartSit";
import SeasonStory   from "@/components/features/SeasonStory";
import Settings, { loadSettings } from "@/components/features/Settings";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = "health" | "trade" | "waiver" | "spy" | "startsit" | "story" | "settings";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "health",   label: "Team Health",    icon: <Activity size={18} /> },
  { id: "trade",    label: "Trade Analyzer", icon: <ArrowLeftRight size={18} /> },
  { id: "waiver",   label: "Waiver Wire",    icon: <TrendingUp size={18} /> },
  { id: "spy",      label: "League Spy",     icon: <Eye size={18} /> },
  { id: "startsit", label: "Start / Sit",    icon: <CalendarDays size={18} /> },
  { id: "story",    label: "Season Story",   icon: <BookOpen size={18} /> },
  { id: "settings", label: "Settings",       icon: <SettingsIcon size={18} /> },
];

// ─── Loading stage labels ─────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  nfl_state:    "Fetching NFL state...",
  player_db:    "Loading player database (5MB)...",
  league:       "Fetching league settings...",
  users:        "Loading league members...",
  rosters:      "Loading all rosters...",
  matchups:     "Fetching season matchups...",
  transactions: "Loading transaction history...",
  trending:     "Fetching waiver trends & dynasty values...",
  done:         "Ready.",
};

// ─── Root component ───────────────────────────────────────────────────────────

export default function Home() {
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [activeTab, setActiveTab]   = useState<TabId>("health");
  const [progress, setProgress]     = useState<LoadProgress | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [settings, setSettings]     = useState<UserSettings>(DEFAULT_SETTINGS);

  // Load saved settings from localStorage on boot
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLeagueData(null);

    try {
      const user = await fetchUser(CONFIG.username);
      const data = await loadLeagueData(
        CONFIG.leagueId,
        user.user_id,
        (p) => setProgress(p),
      );
      setLeagueData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading your league data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading || (!leagueData && !error)) {
    return <LoadingScreen progress={progress} />;
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={load} />;
  }

  if (!leagueData) return null;

  return (
    <Dashboard
      data={leagueData}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={load}
      settings={settings}
      onSettingsSave={setSettings}
    />
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen({ progress }: { progress: LoadProgress | null }) {
  const pct   = progress?.pct ?? 0;
  const label = progress ? (STAGE_LABELS[progress.stage] ?? "Loading...") : "Connecting to Sleeper...";

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8" style={{ background: "var(--bg-base)" }}>
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-black tracking-tight" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
          JNOOB
        </span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          Fantasy Intelligence Dashboard
        </span>
      </div>
      <div className="w-72 flex flex-col gap-3">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span className="text-xs mono" style={{ color: "var(--accent)" }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Error Screen ─────────────────────────────────────────────────────────────

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6" style={{ background: "var(--bg-base)" }}>
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <AlertCircle size={40} style={{ color: "var(--red)" }} />
        <h2 className="text-lg font-bold">Failed to load league data</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{message}</p>
      </div>
      <button className="btn-primary flex items-center gap-2" onClick={onRetry}>
        <RefreshCw size={15} /> Try Again
      </button>
    </div>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────

function Dashboard({
  data,
  activeTab,
  onTabChange,
  onRefresh,
  settings,
  onSettingsSave,
}: {
  data: LeagueData;
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
  onRefresh: () => void;
  settings: UserSettings;
  onSettingsSave: (s: UserSettings) => void;
}) {
  const { myRoster, myUser, allMatchups } = data;
  const { wins, losses, ties } = myRoster.settings;
  const totalPts = calcSeasonPoints(myRoster.roster_id, allMatchups);
  const teamName = myUser.metadata?.team_name ?? myUser.display_name;

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col flex-shrink-0 w-56 h-full border-r overflow-y-auto"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        {/* Team header */}
        <div className="px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Your Team
          </div>
          <div className="font-bold text-sm leading-tight truncate">{teamName}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-black mono" style={{ color: "var(--accent)" }}>
              {wins}–{losses}{ties > 0 ? `–${ties}` : ""}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {totalPts.toFixed(1)} pts
            </span>
          </div>
          {/* Posture badge */}
          <div className="mt-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{
                background: settings.posture === "contending" ? "rgba(0,255,135,0.12)" :
                             settings.posture === "rebuilding" ? "rgba(68,153,255,0.12)" :
                             "rgba(255,214,0,0.12)",
                color: settings.posture === "contending" ? "var(--green)" :
                        settings.posture === "rebuilding" ? "var(--blue)" :
                        "var(--yellow)",
              }}
            >
              {settings.posture}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item w-full text-left ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Season {data.nflState.season} · Week {data.currentWeek}
          </div>
          <button
            className="btn-secondary w-full flex items-center justify-center gap-2 text-xs"
            onClick={onRefresh}
          >
            <RefreshCw size={12} /> Refresh Data
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg-base)" }}>
        <div
          className="sticky top-0 z-10 px-8 py-4 border-b flex items-center justify-between"
          style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
        >
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              PPR · SuperFlex · {settings.posture}
            </p>
          </div>
        </div>

        <div key={activeTab} className="fade-in p-8">
          {activeTab === "health"   && <TeamHealth    data={data} settings={settings} />}
          {activeTab === "trade"    && <TradeAnalyzer data={data} settings={settings} />}
          {activeTab === "waiver"   && <WaiverWire    data={data} settings={settings} />}
          {activeTab === "spy"      && <LeagueSpy     data={data} settings={settings} />}
          {activeTab === "startsit" && <StartSit      data={data} settings={settings} />}
          {activeTab === "story"    && <SeasonStory   data={data} settings={settings} />}
          {activeTab === "settings" && (
            <Settings data={data} settings={settings} onSave={onSettingsSave} />
          )}
        </div>
      </main>
    </div>
  );
}