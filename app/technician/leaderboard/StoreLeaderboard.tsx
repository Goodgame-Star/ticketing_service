"use client";

import { useEffect, useState } from "react";
import { Crown, Swords, Users, Trophy, TrendingUp } from "lucide-react";

type StoreEntry = {
  id: string;
  name: string;
  code: string;
  points: number;
  tickets: number;
  techCount: number;
};

const RANK_META = [
  { label: "1st", medal: "🥇", barColor: "#f59e0b", textColor: "#f59e0b", borderColor: "rgba(245,158,11,0.6)", glowColor: "rgba(245,158,11,0.25)", ringColor: "#f59e0b" },
  { label: "2nd", medal: "🥈", barColor: "#9ca3af", textColor: "#9ca3af", borderColor: "rgba(156,163,175,0.5)", glowColor: "rgba(156,163,175,0.15)", ringColor: "#9ca3af" },
  { label: "3rd", medal: "🥉", barColor: "#b45309", textColor: "#b45309", borderColor: "rgba(180,83,9,0.4)",   glowColor: "rgba(180,83,9,0.12)",   ringColor: "#b45309" },
];

export function StoreLeaderboard({ rankedStores, maxPts }: { rankedStores: StoreEntry[]; maxPts: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const top3 = rankedStores.slice(0, 3).filter(s => s.points > 0);

  return (
    <div className="flex flex-col gap-6">

      {/* ─── Hero: Podium ─── */}
      <div className="card overflow-hidden p-0 border-none" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #16469d 60%, #2557bb 100%)" }}>
        <div className="flex items-center justify-center gap-3 pt-6 pb-3">
          <Swords size={20} className="text-amber-400" />
          <span className="text-white font-black text-lg uppercase tracking-widest">Team vs Team Showdown</span>
          <Swords size={20} className="text-amber-400" />
        </div>
        <p className="text-center text-white/50 text-sm pb-5">Which store dominates this month?</p>

        {/* Top 3 — arranged: 2nd | 1st | 3rd */}
        <div className="flex justify-center items-end gap-4 px-6 pb-0">
          {([1, 0, 2] as const).map((rankIdx) => {
            const store = top3[rankIdx];
            if (!store) return null;
            const meta  = RANK_META[rankIdx];
            const heights = [220, 160, 130];
            const barH  = heights[rankIdx];
            const isFirst = rankIdx === 0;

            return (
              <div key={store.id} className="flex flex-col items-center" style={{ flex: isFirst ? "0 0 160px" : "0 0 130px" }}>
                <div className="mb-2">
                  {isFirst
                    ? <Crown size={28} style={{ color: meta.barColor, filter: `drop-shadow(0 0 8px ${meta.glowColor})` }} />
                    : <span className="text-2xl">{meta.medal}</span>
                  }
                </div>
                <div
                  className="rounded-full flex items-center justify-center font-black text-white mb-2"
                  style={{
                    width: isFirst ? "5rem" : "4rem",
                    height: isFirst ? "5rem" : "4rem",
                    fontSize: isFirst ? "1.4rem" : "1.1rem",
                    background: "rgba(255,255,255,0.15)",
                    border: `3px solid ${meta.ringColor}`,
                    boxShadow: isFirst ? `0 0 20px ${meta.glowColor}` : "none",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {store.code}
                </div>
                <span className="text-white font-bold text-center text-sm max-w-[140px] truncate mb-0.5">{store.name}</span>
                <span className="font-black mb-3" style={{ color: meta.barColor, fontSize: isFirst ? "1rem" : "0.85rem" }}>
                  {store.points} pts
                </span>
                <div
                  className="w-full rounded-t-lg flex flex-col items-center justify-center gap-1"
                  style={{
                    height: `${barH}px`,
                    background: `linear-gradient(to top, ${meta.borderColor}, rgba(255,255,255,0.06))`,
                    border: `1.5px solid ${meta.borderColor}`,
                    borderBottom: "none",
                    transform: mounted ? "scaleY(1)" : "scaleY(0)",
                    transformOrigin: "bottom",
                    transition: `transform 0.7s ${rankIdx === 0 ? "0s" : rankIdx === 1 ? "0.15s" : "0.3s"} cubic-bezier(0.34,1.4,0.64,1)`,
                    opacity: mounted ? 1 : 0,
                    boxShadow: isFirst ? `0 -8px 30px ${meta.glowColor}` : "none",
                  }}
                >
                  <span style={{ fontSize: isFirst ? "3rem" : "2rem", fontWeight: 900, color: meta.barColor, lineHeight: 1 }}>{rankIdx + 1}</span>
                  <span className="text-white/50 text-xs">{store.tickets} tickets</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderTop: "1px solid rgba(255,255,255,0.15)" }} />
      </div>

      {/* ─── Points Breakdown ─── */}
      {top3.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-gray-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Points Breakdown</h3>
          </div>
          <div className="flex flex-col gap-3">
            {rankedStores.filter(s => s.points > 0).map((store, i) => {
              const meta = RANK_META[i] ?? { barColor: "var(--primary)", medal: `#${i + 1}` };
              const pct  = Math.round((store.points / maxPts) * 100);
              return (
                <div key={store.id} className="flex items-center gap-3">
                  <span style={{ width: "1.5rem", textAlign: "right", fontWeight: 700, fontSize: "0.8rem", color: meta.barColor, flexShrink: 0 }}>
                    {i < 3 ? meta.medal : `#${i + 1}`}
                  </span>
                  <span style={{ width: "8rem", fontSize: "0.85rem", fontWeight: 600, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {store.name}
                  </span>
                  <div style={{ flex: 1, background: "var(--cream-dark)", borderRadius: 999, height: 10, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      borderRadius: 999,
                      background: meta.barColor ?? "var(--primary)",
                      width: mounted ? `${pct}%` : "0%",
                      transition: `width 0.7s ${i * 0.1}s cubic-bezier(0.34,1.4,0.64,1)`,
                    }} />
                  </div>
                  <span style={{ width: "3.5rem", textAlign: "right", fontSize: "0.85rem", fontWeight: 700, color: meta.barColor ?? "var(--primary)", flexShrink: 0 }}>
                    {store.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── All Store Cards ─── */}
      <div className="flex flex-col gap-3">
        <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-light)" }}>
          All Rankings
        </h3>
        {rankedStores.map((store, i) => {
          const meta = RANK_META[i];
          const hasPoints = store.points > 0;
          return (
            <div
              key={store.id}
              className="card flex items-center gap-4"
              style={{
                border: `1.5px solid ${meta && hasPoints ? meta.borderColor : "var(--border-light)"}`,
                background: i === 0 && hasPoints ? `linear-gradient(135deg, rgba(245,158,11,0.06) 0%, white 100%)` : "var(--white)",
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                opacity: mounted ? 1 : 0,
                transition: `transform 0.5s ${i * 0.08}s ease, opacity 0.5s ${i * 0.08}s ease`,
                padding: "0.75rem 1rem",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white flex-shrink-0 text-sm"
                style={{ background: "var(--primary)", border: meta && hasPoints ? `2.5px solid ${meta.ringColor}` : "2px solid var(--border-light)" }}
              >
                {store.code}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {meta && hasPoints && <span className="text-sm">{meta.medal}</span>}
                  {!meta && hasPoints && <span className="text-xs font-bold text-gray-400">#{i + 1}</span>}
                  <span className="font-bold text-sm truncate">{store.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[0.7rem] text-gray-400">
                  <Users size={11} />
                  <span>{store.techCount} Technicians</span>
                  <span className="mx-1">·</span>
                  <Trophy size={11} />
                  <span>{store.tickets} tickets</span>
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="font-extrabold text-lg" style={{ color: meta && hasPoints ? meta.textColor : "var(--primary)" }}>
                  {store.points} <span className="text-[0.65rem] text-gray-400 font-medium">pts</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
