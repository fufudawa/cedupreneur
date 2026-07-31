"use client";

// Supabase-backed replacement for the dummy/localStorage data that
// lib/dosenGroupsStorage.ts (via NIM string-matching) used to provide to the
// Mahasiswa module, scoped to whichever mahasiswa is actually authenticated
// (via lib/auth.ts's getCurrentProfile — no demoSession/CURRENT_USER/dummy
// fallback).
//
// Mirrors lib/useDosenKelompokBimbingan.ts's shape/pattern so both role
// modules stay structurally consistent. One query covers everything the
// Mahasiswa pages need: kelompok_anggota (scoped to this mahasiswa) ->
// kelompok -> project -> kelas (+ mata_kuliah) / umkm, all kelompok_anggota
// of that kelompok (-> mahasiswa -> profiles, for member names), and every
// laporan_progress row (so callers can derive both the latest progress % and
// a total report count from the same array).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getCurrentProfile } from "./auth";

export interface MahasiswaKelompokMember {
  id: string;
  nim: string;
  name: string;
}

export interface MahasiswaKelompok {
  id: string;
  code: string;
  name: string;
  projectId: string;
  projectTitle: string;
  projectFileUrl: string | null;
  catatan: string;
  className: string;
  studyProgram: string;
  semester: string;
  mataKuliah: string;
  period: string;
  umkmId: string;
  umkmName: string;
  umkmAddress: string;
  umkmSector: string;
  umkmDescription: string;
  umkmOwnerName: string;
  members: MahasiswaKelompokMember[];
  progress: number;
  reportCount: number;
  status: "aktif" | "selesai" | null;
}

interface RawMahasiswaRow {
  id: string;
  nim: string | null;
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
    file_url: string | null;
    kelas: {
      nama_kelas: string | null;
      semester: string | null;
      tahun_ajaran: string | null;
      mata_kuliah: { nama_mk: string | null } | null;
    } | null;
    umkm: {
      id: string;
      nama_usaha: string | null;
      alamat: string | null;
      sektor_usaha: string | null;
      deskripsi_usaha: string | null;
      profiles: { nama_lengkap: string | null } | null;
    } | null;
  } | null;
  kelompok_anggota: { mahasiswa: RawMahasiswaRow | null }[] | null;
  laporan_progress: { persentase_progress: number | null; created_at: string | null }[] | null;
}

interface KelompokAnggotaJoinRow {
  kelompok: KelompokJoinRow | null;
}

function mapKelompokRow(row: KelompokJoinRow, studyProgram: string): MahasiswaKelompok {
  const rawMembers = (row.kelompok_anggota ?? [])
    .map((entry) => entry.mahasiswa)
    .filter((m): m is RawMahasiswaRow => !!m);

  const members: MahasiswaKelompokMember[] = rawMembers.map((m) => ({
    id: m.id,
    nim: m.nim ?? "-",
    name: m.profiles?.nama_lengkap ?? "-",
  }));

  const laporanSorted = [...(row.laporan_progress ?? [])].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
  const latest = laporanSorted[0];

  const kelas = row.project?.kelas ?? null;
  const umkm = row.project?.umkm ?? null;

  return {
    id: row.id,
    code: row.nama_kelompok ?? "-",
    name: row.nama_kelompok ?? "-",
    projectId: row.project?.id ?? "",
    projectTitle: row.project?.judul_project ?? "-",
    projectFileUrl: row.project?.file_url ?? null,
    catatan: row.catatan ?? "",
    className: kelas?.nama_kelas ?? "-",
    studyProgram,
    semester: kelas?.semester ?? "-",
    mataKuliah: kelas?.mata_kuliah?.nama_mk ?? "-",
    period: kelas?.tahun_ajaran ?? "-",
    umkmId: umkm?.id ?? "",
    umkmName: umkm?.nama_usaha ?? "-",
    umkmAddress: umkm?.alamat ?? "-",
    umkmSector: umkm?.sektor_usaha ?? "-",
    umkmDescription: umkm?.deskripsi_usaha ?? "",
    umkmOwnerName: umkm?.profiles?.nama_lengkap ?? "-",
    members,
    progress: latest?.persentase_progress ?? 0,
    reportCount: laporanSorted.length,
    status: row.status,
  };
}

async function fetchMahasiswaKelompok(): Promise<MahasiswaKelompok[]> {
  const profile = await getCurrentProfile();

  const { data: mahasiswaRow, error: mahasiswaError } = await supabase
    .from("mahasiswa")
    .select("id, prodi")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (mahasiswaError) throw mahasiswaError;
  if (!mahasiswaRow) throw new Error("Mahasiswa record not found for current profile");

  const mahasiswaId = mahasiswaRow.id as string;
  const studyProgram = (mahasiswaRow.prodi as string | null) ?? "-";

  const { data, error } = await supabase
    .from("kelompok_anggota")
    .select(
      `
        kelompok (
          id,
          nama_kelompok,
          status,
          catatan,
          project (
            id,
            judul_project,
            file_url,
            kelas (
              nama_kelas,
              semester,
              tahun_ajaran,
              mata_kuliah ( nama_mk )
            ),
            umkm ( id, nama_usaha, alamat, sektor_usaha, deskripsi_usaha, profiles ( nama_lengkap ) )
          ),
          kelompok_anggota (
            mahasiswa ( id, nim, profiles ( nama_lengkap ) )
          ),
          laporan_progress ( persentase_progress, created_at )
        )
      `
    )
    .eq("mahasiswa_id", mahasiswaId);

  if (error) throw error;

  const rows = ((data ?? []) as unknown as KelompokAnggotaJoinRow[])
    .map((r) => r.kelompok)
    .filter((k): k is KelompokJoinRow => !!k);

  return rows.map((row) => mapKelompokRow(row, studyProgram));
}

export function useMahasiswaKelompok() {
  const [groups, setGroups] = useState<MahasiswaKelompok[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchMahasiswaKelompok()
      .then((mapped) => {
        if (isMounted) setGroups(mapped);
      })
      .catch((error) => {
        console.error("Failed to load mahasiswa kelompok", error);
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
      const mapped = await fetchMahasiswaKelompok();
      setGroups(mapped);
    } catch (error) {
      console.error("Failed to refetch mahasiswa kelompok", error);
    }
  }, []);

  // Mahasiswa saat ini diasumsikan tergabung di paling banyak satu kelompok
  // aktif dalam satu waktu (mengikuti asumsi UI dummy sebelumnya) — kelompok
  // "aktif" diprioritaskan, kalau tidak ada baru ambil yang pertama.
  const activeGroup = groups.find((g) => g.status === "aktif") ?? groups[0] ?? null;

  return { groups, activeGroup, isHydrated, refetch };
}
