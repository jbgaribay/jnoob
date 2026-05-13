"use client";

// components/features/Settings.tsx
import { useState, useEffect } from "react";
import { Shield, X, Plus, Save } from "lucide-react";
import {
  type UserSettings,
  type TeamPosture,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
} from "@/lib/config";
import type { LeagueData } from "@/lib/sleeper";

interface SettingsProps {
  data: LeagueData;
  settings: UserSettings;
  onSave: (s: UserSettings) => void;
}

const POSTURE_OPTIONS: { value: TeamPosture; label: string; description: string; color: string }[] = [
  { value: "contending", label: "Contending", description: "Win now. Prioritize players that help this season.", color: "var(--green)" },
  { value: "rebuilding", label: "Rebuilding", description: "Future focus. Accumulate picks and young talent.", color: "var(--blue)" },
  { value: "selling",    label: "Selling",    description: "Sell high on aging vets, stock up on assets.",    color: "var(--yellow)" },
];

export default function Settings({ data, settings, onSave }: SettingsProps) {
  const [posture, setPosture]         = useState<TeamPosture>(settings.posture);
  const [untradeable, setUntradeable] = useState<string[]>(settings.untradeable);
  const [saved, setSaved]             = useState(false);

  const myPlayers = data.myRoster.players ?? [];

  function resolvePlayerName(id: string) {
    const p = data.playerDB[id];
    if (!p) return id;
    return p.full_name ?? `${p.first_name} ${p.last_name}`;
  }

  function resolvePosition(id: string) {
    return data.playerDB[id]?.position ?? "?";
  }

  function toggleUntradeable(id: string) {
    setUntradeable((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSave() {
    const s: UserSettings = { posture, untradeable };
    try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s)); } catch {}
    onSave(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => { setSaved(false); }, [posture, untradeable]);

  return (
    <div className="max-w-2xl flex flex-col gap-8 fade-in">

      {/* Posture */}
      <section className="card p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold">Team Posture</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Tells Claude how to calibrate every recommendation.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {POSTURE_OPTIONS.map((opt) => {
            const active = posture === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setPosture(opt.value)}
                className="flex items-start gap-4 p-4 rounded-lg text-left transition-all"
                style={{
                  background: active ? "var(--bg-raised)" : "transparent",
                  border: `1px solid ${active ? opt.color : "var(--border)"}`,
                }}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ background: active ? opt.color : "var(--text-muted)" }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: active ? opt.color : "var(--text-primary)" }}>
                    {opt.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {opt.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Untradeable */}
      <section className="card p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold">Untradeable Players</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Claude will never suggest trading these players away.
          </p>
        </div>

        {untradeable.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {untradeable.map((id) => (
              <div key={id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "var(--accent-muted)", border: "1px solid var(--border-accent)", color: "var(--accent)" }}>
                <Shield size={11} />
                {resolvePlayerName(id)}
                <button onClick={() => toggleUntradeable(id)} className="ml-1 opacity-60 hover:opacity-100">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {untradeable.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            No untradeable players set. Click players below to protect them.
          </p>
        )}

        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
            Your Roster
          </p>
          {myPlayers.map((id) => {
            const protected_ = untradeable.includes(id);
            const pos = resolvePosition(id);
            return (
              <button key={id} onClick={() => toggleUntradeable(id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{
                  background: protected_ ? "var(--accent-muted)" : "var(--bg-raised)",
                  border: `1px solid ${protected_ ? "var(--border-accent)" : "var(--border)"}`,
                }}>
                <span className={`pos-badge pos-${pos}`}>{pos}</span>
                <span className="text-sm flex-1" style={{ color: protected_ ? "var(--accent)" : "var(--text-primary)" }}>
                  {resolvePlayerName(id)}
                </span>
                {protected_ ? <Shield size={14} style={{ color: "var(--accent)" }} /> : <Plus size={14} style={{ color: "var(--text-muted)" }} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
          <Save size={15} /> Save Settings
        </button>
        {saved && <span className="text-sm fade-in" style={{ color: "var(--green)" }}>✓ Saved</span>}
      </div>
    </div>
  );
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      posture: parsed.posture ?? DEFAULT_SETTINGS.posture,
      untradeable: parsed.untradeable ?? DEFAULT_SETTINGS.untradeable,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}