"use client";

// Supabase-backed replacement for the "Kelompok Dampingan" data that
// lib/dosenGroupsStorage.ts (via demoSession/CURRENT_USER string-matching)
// used to provide to the UMKM module, scoped to whichever UMKM is actually
// authenticated (via lib/auth.ts's getCurrentProfile — no demoSession
// fallback). A UMKM can be paired with more than one kelompok, so this
// mirrors lib/useDosenKelompokBimbingan.ts's shape/pattern (list of groups,
// no single "activeGroup" assumption).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getCurrentProfile } from "./auth";

export interface UmkmKelompokMember {
  id: string;
  nim: string;
  name: string;
}

/** Mirrors lib/adminDashboardData.ts's AdminGroupStatus vocabulary (waiting/incomplete/completed/empty). */
export type UmkmMentoringStatus = "waiting" | "incomplete" | "completed" | "empty";

export interface UmkmKelompok {
  id: string;
  code: string;
  name: string;
  projectId: string;
  projectTitle: string;
  className: string;
  studyProgram: string;
  semester: string;
  mataKuliah: string;
  period: string;
  umkmName: string;
  members: UmkmKelompokMember[];
  progress: number;
  reportCount: number;
  status: "aktif" | "selesai" | null;
  mentoringStatus: UmkmMentoringStatus;
}

interface RawMahasiswaRow {
  id: string;
  nim: string | null;
  prodi: string | null;
  profiles: { nama_lengkap: string | null } | null;
}

interface KelompokJoinRow {
  id: string;
  nama_kelompok: string | null;
  status: "aktif" | "selesai" | null;
  project: {
    id: string;
    judul_project: string | null;
    kelas: {
      nama_kelas: string | null;
      semester: string | null;
      tahun_ajaran: string | null;
      mata_kuliah: { nama_mk: string | null } | null;
    } | null;
    umkm: { nama_usaha: string | null } | null;
  } | null;
  kelompok_anggota: { mahasiswa: RawMahasiswaRow | null }[] | null;
  laporan_progress: { persentase_progress: number | null; status: string | null; created_at: string | null }[] | null;
}

function mapMentoringStatus(hasReports: boolean, latestStatus: string | null | undefined): UmkmMentoringStatus {
  if (!hasReports) return "empty";
  if (latestStatus === "submitted") return "waiting";
  if (latestStatus === "reviewed") return "completed";
  return "incomplete";
}

function mapKelompokRow(row: KelompokJoinRow): UmkmKelompok {
  const rawMembers = (row.kelompok_anggota ?? [])
    .map((entry) => entry.mahasiswa)
    .filter((m): m is RawMahasiswaRow => !!m);

  const members: UmkmKelompokMember[] = rawMembers.map((m) => ({
    id: m.id,
    nim: m.nim ?? "-",
    name: m.profiles?.nama_lengkap ?? "-",
  }));

  const laporanSorted = [...(row.laporan_progress ?? [])].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
  const latest = laporanSorted[0];
  const reportCount = laporanSorted.length;

  const kelas = row.project?.kelas ?? null;
  const umkm = row.project?.umkm ?? null;
  const studyProgram = rawMembers.find((m) => !!m.prodi)?.prodi ?? "-";

  return {
    id: row.id,
    code: row.nama_kelompok ?? "-",
    name: row.nama_kelompok ?? "-",
    projectId: row.project?.id ?? "",
    projectTitle: row.project?.judul_project ?? "-",
    className: kelas?.nama_kelas ?? "-",
    studyProgram,
    semester: kelas?.semester ?? "-",
    mataKuliah: kelas?.mata_kuliah?.nama_mk ?? "-",
    period: kelas?.tahun_ajaran ?? "-",
    umkmName: umkm?.nama_usaha ?? "-",
    members,
    progress: latest?.persentase_progress ?? 0,
    reportCount,
    status: row.status,
    mentoringStatus: mapMentoringStatus(reportCount > 0, latest?.status),
  };
}

async function fetchUmkmKelompok(): Promise<UmkmKelompok[]> {
  const profile = await getCurrentProfile();

  const { data: umkmRow, error: umkmError } = await supabase
    .from("umkm")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (umkmError) throw umkmError;
  if (!umkmRow) throw new Error("Umkm record not found for current profile");

  const { data, error } = await supabase
    .from("kelompok")
    .select(
      `
        id,
        nama_kelompok,
        status,
        project (
          id,
          judul_project,
          kelas (
            nama_kelas,
            semester,
            tahun_ajaran,
            mata_kuliah ( nama_mk )
          ),
          umkm ( nama_usaha )
        ),
        kelompok_anggota (
          mahasiswa ( id, nim, prodi, profiles ( nama_lengkap ) )
        ),
        laporan_progress ( persentase_progress, status, created_at )
      `
    )
    .order("created_at", { ascending: false, referencedTable: "laporan_progress" });

  if (error) throw error;

  return ((data ?? []) as unknown as KelompokJoinRow[]).map(mapKelompokRow);
}

export function useUmkmKelompok() {
  const [groups, setGroups] = useState<UmkmKelompok[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchUmkmKelompok()
      .then((mapped) => {
        if (isMounted) setGroups(mapped);
      })
      .catch((error) => {
        console.error("Failed to load umkm kelompok", error);
        if (isMounted) setGroups([]);
      })
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    try {
      const mapped = await fetchUmkmKelompok();
      setGroups(mapped);
    } catch (error) {
      console.error("Failed to refetch umkm kelompok", error);
    }
  }, []);

  return { groups, isHydrated, refetch };
}
