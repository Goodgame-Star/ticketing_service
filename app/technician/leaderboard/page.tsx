// Technician leaderboard — live design with Technician and Store (Team vs Team) standings
import { requireRole } from "@/lib/session";
import { Trophy, Medal, Store, Users, User } from "lucide-react";
import Link from "next/link";
import { getLeaderboardData, MONTH_COLORS, getMonthFromKey, getShortLabel } from "@/lib/leaderboard";
import LeaderboardFilter from "./LeaderboardFilter";
import { PodiumBars, Top5Bars } from "./LeaderboardBars";
import { StoreLeaderboard } from "./StoreLeaderboard";

export const metadata = { title: "Leaderboard — HNS IT Center" };

export default async function TechnicianLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; tab?: string }>;
}) {
  await requireRole("Technician", "Administrator");
  const params = await searchParams;

  const now = new Date();
  const monthParam = params.month;
  const year  = parseInt(params.year  || String(now.getFullYear()));
  const month = monthParam === "all" ? null : parseInt(monthParam || String(now.getMonth() + 1));
  const tab   = params.tab || "technician";

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Cached fetch — only refetches when a ticket completes (revalidateTag)
  const { rankedTechs, rankedStores } = await getLeaderboardData(month, year);

  const isStoreTab = tab === "store";
  const ranked     = isStoreTab ? rankedStores : rankedTechs;
  const noData     = ranked.every((r) => r.points === 0);

  const top5   = ranked.slice(0, 5);
  const first  = ranked[0], second = ranked[1], third = ranked[2];
  const maxPts = first?.points || 1;


  const buildTabHref = (nextTab: string) => {
    const qs = new URLSearchParams();
    if (monthParam) qs.set("month", monthParam);
    if (params.year) qs.set("year", params.year);
    qs.set("tab", nextTab);
    return `/technician/leaderboard?${qs.toString()}`;
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Trophy size={26} className="text-amber-500" />
            Leaderboard Standings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Live standings for {month ? MONTHS[month - 1] : "All months"} {year} · Auto-updates on ticket completion
          </p>
        </div>
        
        <LeaderboardFilter 
          defaultMonth={monthParam || String(now.getMonth() + 1)} 
          defaultYear={String(year)} 
          currentTab={tab} 
        />
      </div>

      {/* Tab Toggles */}
      <div className="flex gap-2">
        <Link href={buildTabHref("technician")} className={`btn btn-sm flex items-center gap-1.5 ${!isStoreTab ? "btn-primary" : "btn-outline"}`}>
          <User size={15} /> Technicians
        </Link>
        <Link href={buildTabHref("store")} className={`btn btn-sm flex items-center gap-1.5 ${isStoreTab ? "btn-primary" : "btn-outline"}`}>
          <Store size={15} /> Store Standings
        </Link>
      </div>

      {noData ? (
        <div key={`${month}-${year}-${tab}`} className="card animate-fade-in">
          <div className="empty-state">
            <Trophy size={48} className="opacity-20" />
            <p>No completed tickets for {month ? MONTHS[month - 1] : "this year"} {year}.</p>
          </div>
        </div>
      ) : (
        <div key={`${month}-${year}-${tab}`} className="animate-fade-in flex flex-col gap-6">
          {isStoreTab ? (
            <StoreLeaderboard rankedStores={rankedStores} maxPts={rankedStores[0]?.points || 1} />
          ) : (
            <div className="leaderboard-layout">
              {/* Main Visual Panels */}
              <div className="leaderboard-chart flex flex-col gap-4">
                
                {/* Podium */}
            <div className="card overflow-hidden border-none p-0" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #16469d 60%, #2557bb 100%)" }}>
              <div className="pt-4 px-6 flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <span className="font-bold text-[0.9375rem]" style={{ color: "rgba(255, 255, 255, 0.9)" }}>Top Performers</span>
              </div>
              
              <PodiumBars first={first} second={second} third={third} />
              <div style={{ height:"8px", background:"rgba(255, 255, 255, 0.12)", borderTop:"1px solid rgba(255, 255, 255, 0.18)" }} />
            </div>

            {/* Progress Bars */}
            {top5.length > 0 && (
              <div className="card p-5">
                <h3 style={{ fontSize:"0.875rem", fontWeight:700, color:"var(--text-secondary)", marginBottom:"1rem", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  Top 5 — Points Breakdown
                </h3>
                <Top5Bars top5={top5} maxPts={maxPts} />
              </div>
            )}
          </div>

          {/* Side List — All Rankings */}
          <div className="leaderboard-list">
            <div style={{ padding:"0.75rem 0", borderBottom:"1px solid var(--border-light)", marginBottom:"0.5rem" }}>
              <h3 style={{ fontSize:"0.875rem", fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                All Rankings
              </h3>
            </div>
            
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {rankedTechs.map((t, i) => {
                const rank       = i + 1;
                const isTop3     = rank <= 3;
                const medalColor = rank===1?"#f59e0b":rank===2?"#9ca3af":rank===3?"#b45309":"var(--text-muted)";
                const bgStyle    = isTop3 ? "rgba(22, 70, 157, 0.08)" : "var(--white)";
                const borderStyle= isTop3 ? "rgba(22, 70, 157, 0.2)" : "var(--border-light)";

                // Title badge
                const titleBadge = t.activeTitleLabel && t.activeTitleEmoji && t.activeTitle ? (() => {
                  const mo = getMonthFromKey(t.activeTitle);
                  const mc = MONTH_COLORS[mo] ?? MONTH_COLORS[1];
                  return { label: getShortLabel(t.activeTitleLabel, t.activeTitleEmoji), bg: mc.bg, text: mc.text };
                })() : null;

                return (
                  <div key={t.id} style={{ display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.75rem 0.875rem",background:bgStyle,border:`1.5px solid ${borderStyle}`,borderRadius:"var(--radius-md)",animation:`fadeIn 0.4s ${i*0.05}s ease both` }}>
                    <div style={{ width:"2rem",height:"2rem",borderRadius:"50%",flexShrink:0,background:isTop3?`${medalColor}20`:"var(--cream)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {rank<=3 ? <Medal size={14} style={{ color:medalColor }} /> : <span style={{ fontSize:"0.75rem", fontWeight:700, color:"var(--text-muted)" }}>{rank}</span>}
                    </div>
                    
                    <div style={{ width:"2.25rem",height:"2.25rem",borderRadius:"50%",flexShrink:0,background:"var(--primary)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",fontWeight:700,border:isTop3?"1.5px solid rgba(255,255,255,0.3)":"none",fontFamily:"monospace" }}>
                      {getInitials(t.name)}
                    </div>
                    
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:"0.875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</div>
                      <div className="flex items-center gap-2 flex-wrap" style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>
                        <span>Lvl {t.level} • {t.tickets} ticket{t.tickets!==1?"s":""}</span>
                        {/* Title badge */}
                        {titleBadge && (
                          <span style={{
                            display: "inline-block",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "999px",
                            background: titleBadge.bg,
                            color: titleBadge.text,
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                            whiteSpace: "nowrap",
                          }}>
                            {titleBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <span style={{ fontWeight:800, fontSize:"0.9375rem", color:isTop3?medalColor:"var(--primary)", flexShrink:0 }}>
                      {t.points}<span style={{ fontSize:"0.7rem", fontWeight:500, color:"var(--text-muted)", marginLeft:"2px" }}>pts</span>
                    </span>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
