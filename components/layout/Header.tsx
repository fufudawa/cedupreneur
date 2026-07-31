"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  // Starts empty (never the stale RoleLayout placeholder name) so the pill
  // never flashes the wrong account before the real name loads — server &
  // first client render both start null, so this can't cause a hydration
  // mismatch either.
  const [accountName, setAccountName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Admin keeps its fixed "Admin" label (see accountLabel below) — no
    // account name to fetch. Dosen/Mahasiswa/UMKM reflect the real
    // authenticated Supabase user.
    if (user.role === "dosen" || user.role === "mahasiswa") {
      async function loadRealAccountName() {
        try {
          const profile = await getCurrentProfile();
          const { data, error } = await supabase
            .from("profiles")
            .select("nama_lengkap")
            .eq("id", profile.id)
            .maybeSingle();
          if (error) throw error;
          if (isMounted && data?.nama_lengkap) {
            setAccountName(data.nama_lengkap);
          }
        } catch (error) {
          console.error("Failed to load authenticated account name", error);
        }
      }
      loadRealAccountName();
      return () => {
        isMounted = false;
      };
    }

    if (user.role === "umkm") {
      async function loadRealUmkmName() {
        try {
          const profile = await getCurrentProfile();
          const { data, error } = await supabase
            .from("umkm")
            .select("nama_usaha")
            .eq("profile_id", profile.id)
            .maybeSingle();
          if (error) throw error;
          if (isMounted && data?.nama_usaha) {
            setAccountName(data.nama_usaha);
          }
        } catch (error) {
          console.error("Failed to load authenticated umkm name", error);
        }
      }
      loadRealUmkmName();
      return () => {
        isMounted = false;
      };
    }

    return () => {
      isMounted = false;
    };
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
        {accountLabel ?? <span className="h-4 w-20 animate-pulse rounded bg-soft-gray-dark/60" aria-hidden="true" />}
      </div>
    </header>
  );
}
