"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types";
import { getCurrentDemoUser } from "@/lib/demoSession";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  // Starts from the same static per-role name RoleLayout already passes down
  // (matches the default demo account exactly), then syncs to whichever demo
  // account is actually active — server & first client render both use this
  // same fallback, so it can't cause a hydration mismatch.
  const [accountName, setAccountName] = useState(user.name);

  useEffect(() => {
    const activeUser = getCurrentDemoUser(user.role);
    if (!activeUser) return;
    const displayName = user.role === "umkm" ? (activeUser.businessName ?? activeUser.name) : activeUser.name;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from the demo session (unavailable during SSR).
    setAccountName(displayName);
  }, [user.role]);

  // Admin's header pill shows the fixed role label "Admin" instead of the
  // account name — every other role shows the active demo account's name.
  const accountLabel = user.role === "admin" ? "Admin" : accountName;

  return (
    <header className="header-gradient flex h-[88px] shrink-0 items-center justify-between gap-4 px-7 py-4 text-white">
      <div className="translate-y-1">
        <p className="text-[21px] font-bold leading-tight">Semester Ganjil 2026/2027</p>
        <p className="text-[15px] leading-tight text-white/90">Mata Kuliah Praktik Kewirausahaan</p>
      </div>
      <div className="translate-y-1 flex h-12 min-w-[120px] items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-navy shadow-sm">
        {accountLabel}
      </div>
    </header>
  );
}
