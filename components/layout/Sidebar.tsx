"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SidebarMenuItem {
  label: string;
  href: string;
  icon?: ReactNode;
  /**
   * Extra route prefixes that should also highlight this item, e.g. so a
   * drill-down route (/admin/aktivitas) still highlights its parent
   * Dashboard entry instead of failing the default href-prefix check.
   * A plain data array (not a function) so it stays serializable across the
   * Server Component (RoleLayout/menu.tsx) -> Client Component (Sidebar) boundary.
   */
  activeMatchPrefixes?: string[];
}

interface SidebarProps {
  title: string;
  menu: SidebarMenuItem[];
}

export function Sidebar({ menu }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 h-screen w-56 shrink-0 overflow-y-auto bg-soft-gray lg:w-64">
      <div className="flex min-h-full flex-col px-4 pb-8 lg:px-5">
        <div className="flex h-[165px] shrink-0 items-start justify-center overflow-hidden px-3 pt-3">
          <Image
            src="/images/brand/logo-cedupreneur-v2.png"
            alt="CEdPreneur"
            width={195}
            height={137}
            priority
            unoptimized
            className="h-auto w-[195px] max-w-none origin-top scale-100 -translate-y-8 object-contain"
          />
        </div>

        <nav className="flex flex-col gap-3 pt-2 lg:gap-5">
          {menu.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.activeMatchPrefixes?.some(
                (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
              ) ??
                false);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-14 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition-colors lg:h-[70px] lg:px-5 lg:text-base",
                  active
                    ? "bg-orange text-white shadow-sm"
                    : "bg-white text-gray-500 hover:text-navy"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 lg:mt-5">
          <Link
            href="/login"
            className="flex h-14 items-center gap-3 rounded-2xl border border-soft-gray-dark bg-white px-4 text-sm font-medium text-purple transition-colors hover:bg-soft-gray lg:h-[70px] lg:px-5 lg:text-base"
          >
            <LogOut size={20} strokeWidth={2} />
            <span>Logout</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
