// components/features/SeasonStory.tsx
"use client";
import type { LeagueData } from "@/lib/types";
export default function SeasonStory({ data }: { data: LeagueData }) {
  void data;
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-2xl font-black mb-2" style={{ color: "var(--accent)" }}>Season Story</div>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Coming soon</div>
      </div>
    </div>
  );
}