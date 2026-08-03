"use client";

// Supabase-backed replacement for the "Kelompok Bimbingan" data that
// lib/dosenGroupsStorage.ts (dummy/localStorage) used to provide, scoped to
// whichever dosen is actually authenticated (via lib/auth.ts's
// getCurrentProfile — no demoSession/CURRENT_USER/dummy fallback).
//
// One query covers everything the Project/Kelompok/Mentoring-list pages
// need: kelompok -> project (!inner, filtered to this dosen) -> kelas
// (+ mata_kuliah) / umkm, all kelompok_anggota (-> mahasiswa -> profiles for
// name), and every laporan_progress row (so callers can derive both the
// latest progress % and a total report count from the same array).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getCurrentProfile } from "./auth";
import { calculateTugasProgress } from "./useProjectTugas";

export interface KelompokBimbinganMember {
  id: string;
  nim: string;
  name: string;
}

/** Mirrors lib/adminDashboardData.ts's AdminGroupStatus vocabulary (waiting/incomplete/completed/empty). */
export type KelompokMentoringStatus = "waiting" | "incomplete" | "completed" | "empty";

export interface KelompokBimbingan {
  id: string;
  code: string;
  name: string;
  projectId: string;
  projectTitle: string;
  catatan: string;
  className: string;
  studyProgram: string;
  semester: string;
  mataKuliah: string;
  period: string;
  umkmName: string;
  umkmAddress: string;
  members: KelompokBimbinganMember[];
  progress: number;
  reportCount: number;
  status: "aktif" | "selesai" | null;
  mentoringStatus: KelompokMentoringStatus;
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
  catatan: string | null;
  project: {
    id: string;
    judul_project: string | null;
    kelas: {
      nama_kelas: string | null;
      semester: string | null;
      tahun_ajaran: string | null;
      mata_kuliah: { nama_mk: string | null } | null;
    } | null;
    umkm: { nama_usaha: string | null; alamat: string | null } | null;
    project_tugas: { is_selesai: boolean }[] | null;
  } | null;
  kelompok_anggota: { mahasiswa: RawMahasiswaRow | null }[] | null;
  laporan_progress: { persentase_progress: number | null; status: string | null; created_at: string | null }[] | null;
}

function mapMentoringStatus(hasReports: boolean, latestStatus: string | null | undefined): KelompokMentoringStatus {
  if (!hasReports) return "empty";
  if (latestStatus === "submitted") return "waiting";
  if (latestStatus === "reviewed") return "completed";
  return "incomplete";
}

function mapKelompokRow(row: KelompokJoinRow): KelompokBimbingan {
  const rawMembers = (row.kelompok_anggota ?? [])
    .map((entry) => entry.mahasiswa)
    .filter((m): m is RawMahasiswaRow => !!m);

  const members: KelompokBimbinganMember[] = rawMembers.map((m) => ({
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
    catatan: row.catatan ?? "",
    className: kelas?.nama_kelas ?? "-",
    studyProgram,
    semester: kelas?.semester ?? "-",
    mataKuliah: kelas?.mata_kuliah?.nama_mk ?? "-",
    period: kelas?.tahun_ajaran ?? "-",
    umkmName: umkm?.nama_usaha ?? "-",
    umkmAddress: umkm?.alamat ?? "-",
    members,
    progress: calculateTugasProgress(row.project?.project_tugas ?? []),
    reportCount,
    status: row.status,
    mentoringStatus: mapMentoringStatus(reportCount > 0, latest?.status),
  };
}

async function fetchKelompokBimbingan(): Promise<KelompokBimbingan[]> {
  const profile = await getCurrentProfile();

  const { data: dosenRow, error: dosenError } = await supabase
    .from("dosen")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (dosenError) throw dosenError;
  if (!dosenRow) throw new Error("Dosen record not found for current profile");

  const dosenId = dosenRow.id as string;

  const { data, error } = await supabase
    .from("kelompok")
    .select(
      `
        id,
        nama_kelompok,
        status,
        catatan,
        project!inner (
          id,
          judul_project,
          kelas (
            nama_kelas,
            semester,
            tahun_ajaran,
            mata_kuliah ( nama_mk )
          ),
          umkm ( nama_usaha, alamat ),
          project_tugas ( is_selesai )
        ),
        kelompok_anggota (
          mahasiswa (
            id,
            nim,
            prodi,
            profiles ( nama_lengkap )
          )
        ),
        laporan_progress ( persentase_progress, status, created_at )
      `
    )
    .eq("project.created_by", dosenId)
    .order("created_at", { ascending: false, referencedTable: "laporan_progress" });

  if (error) throw error;

  return ((data ?? []) as unknown as KelompokJoinRow[]).map(mapKelompokRow);
}

export function useDosenKelompokBimbingan() {
  const [groups, setGroups] = useState<KelompokBimbingan[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchKelompokBimbingan()
      .then((mapped) => {
        if (isMounted) setGroups(mapped);
      })
      .catch((error) => {
        console.error("Failed to load kelompok bimbingan", error);
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
      const mapped = await fetchKelompokBimbingan();
      setGroups(mapped);
    } catch (error) {
      console.error("Failed to refetch kelompok bimbingan", error);
    }
  }, []);

  return { groups, isHydrated, refetch };
}
