import type { ReactNode } from "react";
import type { Role } from "@/types";
import { ROLE_LABEL } from "@/types";
import { getCurrentUser } from "@/lib/auth";
import { DashboardLayout } from "./DashboardLayout";
import { ROLE_MENU } from "./menu";

interface RoleLayoutProps {
  role: Role;
  children: ReactNode;
}

export function RoleLayout({ role, children }: RoleLayoutProps) {
  const user = getCurrentUser(role);

  return (
    <DashboardLayout title={ROLE_LABEL[role]} menu={ROLE_MENU[role]} user={user}>
      {children}
    </DashboardLayout>
  );
}
