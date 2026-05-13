// components/features/TeamHealth.tsx
"use client";
import type { LeagueData } from "@/lib/types";
export default function TeamHealth({ data }: { data: LeagueData }) {
  return <ComingSoon label="Team Health Dashboard" data={data} />;
}

function ComingSoon({ label, data }: { label: string; data: LeagueData }) {
  void data;
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-2xl font-black mb-2" style={{ color: "var(--accent)" }}>{label}</div>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Coming soon</div>
      </div>
    </div>
  );
}