import { requireRole } from "@/lib/session";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("Sales", "Administrator");

  return (
    <DashboardShell
      role="sales"
      userName={session.name}
      userId={session.userId}
      isCoordinator={false}
    >
      {children}
    </DashboardShell>
  );
}
