import type { ReactNode } from "react";
import type { User } from "@/types";
import { Sidebar, type SidebarMenuItem } from "./Sidebar";
import { Header } from "./Header";

interface DashboardLayoutProps {
  title: string;
  menu: SidebarMenuItem[];
  user: User;
  children: ReactNode;
}

export function DashboardLayout({ title, menu, user, children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-soft-gray">
      <Sidebar title={title} menu={menu} />
      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <Header user={user} />
        <main className="min-w-0 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
