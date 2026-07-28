import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Ticket, PlusCircle, Activity } from "lucide-react";

export const metadata = { title: "Sales Dashboard — HNS IT Center" };

export default async function SalesDashboardPage() {
  const session = await requireRole("Sales", "Administrator");

  const [activeTickets, totalTickets] = await Promise.all([
    db.ticket.count({
      where: {
        sales_id: session.userId,
        status: { in: ["waiting", "on_progress", "ready_for_pickup", "waiting_pickup"] }
      }
    }),
    db.ticket.count({
      where: { sales_id: session.userId }
    })
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h1 className="page-title">Sales Dashboard</h1>
        <p className="page-description">Welcome back, {session.name}. Here is a summary of your tickets.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ background: "rgba(22, 70, 157, 0.1)", padding: "1rem", borderRadius: "12px", color: "var(--primary)" }}>
              <Activity size={24} />
            </div>
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 600 }}>Active Tickets</p>
              <h2 style={{ fontSize: "1.75rem", margin: 0 }}>{activeTickets}</h2>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ background: "rgba(100, 116, 139, 0.1)", padding: "1rem", borderRadius: "12px", color: "#64748b" }}>
              <Ticket size={24} />
            </div>
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 600 }}>Total Created</p>
              <h2 style={{ fontSize: "1.75rem", margin: 0 }}>{totalTickets}</h2>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <Link href="/sales/tickets/create" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <PlusCircle size={18} /> Create New Ticket
        </Link>
        <Link href="/sales/tickets" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Ticket size={18} /> View My Tickets
        </Link>
      </div>
    </div>
  );
}
