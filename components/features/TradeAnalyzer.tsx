"use client";
import type { LeagueData } from "@/lib/sleeper";
import type { UserSettings } from "@/lib/config";
export default function TradeAnalyzer({ data, settings }: { data: LeagueData; settings: UserSettings }) {
  void data; void settings;
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-2xl font-black mb-2" style={{ color: "var(--accent)" }}>Trade Analyzer</div>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Coming soon</div>
      </div>
    </div>
  );
}