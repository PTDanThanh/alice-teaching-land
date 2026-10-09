import type { ReactNode } from "react";

import AdminShell from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/admin";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();

  return <AdminShell user={user}>{children}</AdminShell>;
}
