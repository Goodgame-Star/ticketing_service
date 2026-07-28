"use client";

import { useRouter } from "next/navigation";

export default function LeaderboardFilter({ 
  defaultMonth, 
  defaultYear, 
  currentTab 
}: { 
  defaultMonth: string, 
  defaultYear: string, 
  currentTab: string 
}) {
  const router = useRouter();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const form = e.target.form;
    if (!form) return;
    const formData = new FormData(form);
    const m = formData.get("month") as string;
    const y = formData.get("year") as string;
    
    const qs = new URLSearchParams();
    if (m) qs.set("month", m);
    if (y) qs.set("year", y);
    if (currentTab) qs.set("tab", currentTab);
    
    router.push(`?${qs.toString()}`);
  };

  return (
    <form className="flex gap-2 items-center flex-wrap">
      <input type="hidden" name="tab" value={currentTab} />
      <select 
        name="month" 
        defaultValue={defaultMonth} 
        className="form-input" 
        style={{ width: "auto" }} 
        onChange={handleChange}
      >
        <option value="all">All months</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select 
        name="year" 
        defaultValue={defaultYear} 
        className="form-input" 
        style={{ width: "auto" }} 
        onChange={handleChange}
      >
        {[2024, 2025, 2026, 2027].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </form>
  );
}
