"use client";

// Supabase-backed replacement for the dummy "Kelompok Bimbingan" data that
// Admin's Monitoring/Aktivitas pages previously read via
// lib/useDosenSupervisedGroups.ts (as if Admin were just another Dosen
// account). Admin sees ALL kelompok across every dosen (RLS: *_admin_all
// policies grant is_admin() full access), so this is NOT scoped to a single
// dosen the way lib/useDosenKelompokBimbingan.ts is.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { calculateTugasProgress } from "./useProjectTugas";

export interface AdminMonitoringMember {
  id: string;
  nim: string;
  name: string;
}

export interface AdminMonitoringFeedback {
  id: string;
  pemberiId: string;
  pemberiRole: "dosen" | "umkm" | null;
  jenisFeedback: string | null;
  isiFeedback: string;
  createdAt: string | null;
}

export interface AdminMonitoringLaporan {
  id: string;
  judulLaporan: string;
  isiLaporan: string;
  persentaseProgress: number;
  status: "draft" | "submitted" | "reviewed" | null;
  tanggalSubmit: string | null;
  createdAt: string | null;
  fileUrl: string | null;
  feedback: AdminMonitoringFeedback[];
}

export interface AdminMonitoringGroup {
  id: string;
  code: string;
  name: string;
  status: "aktif" | "selesai" | null;
  catatan: string;
  projectId: string;
  projectTitle: string;
  className: string;
  studyProgram: string;
  semester: string;
  tahunAjaran: string;
  mataKuliah: string;
  dosenName: string;
  dosenNip: string;
  umkmId: string;
  umkmName: string;
  members: AdminMonitoringMember[];
  laporan: AdminMonitoringLaporan[];
  progress: number;
  createdAt: string | null;
}

interface RawMahasiswaRow {
  id: string;
  nim: string | null;
  prodi: string | null;
  profiles: { nama_lengkap: string | null } | null;
}

interface RawFeedbackRow {
  id: string;
  pemberi_id: string;
  pemberi_role: "dosen" | "umkm" | null;
  jenis_feedback: string | null;
  isi_feedback: string | null;
  created_at: string | null;
}

interface RawLaporanRow {
  id: string;
  judul_laporan: string | null;
  isi_laporan: string | null;
  persentase_progress: number | null;
  status: "draft" | "submitted" | "reviewed" | null;
  tanggal_submit: string | null;
  created_at: string | null;
  file_url: string | null;
  feedback: RawFeedbackRow[] | null;
}

interface RawKelompokRow {
  id: string;
  nama_kelompok: string | null;
  status: "aktif" | "selesai" | null;
  catatan: string | null;
  created_at: string | null;
  project: {
    id: string;
    judul_project: string | null;
    created_by: string | null;
    kelas: {
      nama_kelas: string | null;
      semester: string | null;
      tahun_ajaran: string | null;
      mata_kuliah: { nama_mk: string | null } | null;
    } | null;
    umkm: { id: string; nama_usaha: string | null } | null;
    project_tugas: { is_selesai: boolean }[] | null;
  } | null;
  kelompok_anggota: { mahasiswa: RawMahasiswaRow | null }[] | null;
  laporan_progress: RawLaporanRow[] | null;
}

function mapKelompokRow(row: RawKelompokRow, dosenById: Map<string, { name: string; nip: string }>): AdminMonitoringGroup {
  const rawMembers = (row.kelompok_anggota ?? [])
    .map((entry) => entry.mahasiswa)
    .filter((m): m is RawMahasiswaRow => !!m);

  const members: AdminMonitoringMember[] = rawMembers.map((m) => ({
    id: m.id,
    nim: m.nim ?? "-",
    name: m.profiles?.nama_lengkap ?? "-",
  }));

  const laporanSorted = [...(row.laporan_progress ?? [])].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );

  const laporan: AdminMonitoringLaporan[] = laporanSorted.map((l) => ({
    id: l.id,
    judulLaporan: l.judul_laporan ?? "Laporan Progress",
    isiLaporan: l.isi_laporan ?? "",
    persentaseProgress: l.persentase_progress ?? 0,
    status: l.status,
    tanggalSubmit: l.tanggal_submit,
    createdAt: l.created_at,
    fileUrl: l.file_url,
    feedback: (l.feedback ?? [])
      .map((f) => ({
        id: f.id,
        pemberiId: f.pemberi_id,
        pemberiRole: f.pemberi_role,
        jenisFeedback: f.jenis_feedback,
        isiFeedback: f.isi_feedback ?? "",
        createdAt: f.created_at,
      }))
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
  }));

  const kelas = row.project?.kelas ?? null;
  const umkm = row.project?.umkm ?? null;
  const dosen = row.project?.created_by ? dosenById.get(row.project.created_by) : undefined;
  const studyProgram = rawMembers.find((m) => !!m.prodi)?.prodi ?? "-";

  return {
    id: row.id,
    code: row.nama_kelompok ?? "-",
    name: row.nama_kelompok ?? "-",
    status: row.status,
    catatan: row.catatan ?? "",
    projectId: row.project?.id ?? "",
    projectTitle: row.project?.judul_project ?? "-",
    className: kelas?.nama_kelas ?? "-",
    studyProgram,
    semester: kelas?.semester ?? "-",
    tahunAjaran: kelas?.tahun_ajaran ?? "-",
    mataKuliah: kelas?.mata_kuliah?.nama_mk ?? "-",
    dosenName: dosen?.name ?? "-",
    dosenNip: dosen?.nip ?? "-",
    umkmId: umkm?.id ?? "",
    umkmName: umkm?.nama_usaha ?? "-",
    members,
    laporan,
    progress: calculateTugasProgress(row.project?.project_tugas ?? []),
    createdAt: row.created_at,
  };
}

async function fetchAdminMonitoring(): Promise<AdminMonitoringGroup[]> {
  const { data: dosenRows, error: dosenError } = await supabase
    .from("dosen")
    .select("id, nip, profiles ( nama_lengkap )");
  if (dosenError) throw dosenError;

  const dosenById = new Map(
    (dosenRows ?? []).map((d) => {
      const row = d as unknown as { id: string; nip: string | null; profiles: { nama_lengkap: string | null } | null };
      return [row.id, { name: row.profiles?.nama_lengkap ?? "-", nip: row.nip ?? "-" }];
    })
  );

  const { data, error } = await supabase
    .from("kelompok")
    .select(
      `
        id,
        nama_kelompok,
        status,
        catatan,
        created_at,
        project (
          id,
          judul_project,
          created_by,
          kelas (
            nama_kelas,
            semester,
            tahun_ajaran,
            mata_kuliah ( nama_mk )
          ),
          umkm ( id, nama_usaha ),
          project_tugas ( is_selesai )
        ),
        kelompok_anggota (
          mahasiswa ( id, nim, prodi, profiles ( nama_lengkap ) )
        ),
        laporan_progress (
          id, judul_laporan, isi_laporan, persentase_progress, status, tanggal_submit, created_at, file_url,
          feedback ( id, pemberi_id, pemberi_role, jenis_feedback, isi_feedback, created_at )
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as RawKelompokRow[]).map((row) => mapKelompokRow(row, dosenById));
}

export function useAdminMonitoring() {
  const [groups, setGroups] = useState<AdminMonitoringGroup[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchAdminMonitoring()
      .then((mapped) => {
        if (isMounted) setGroups(mapped);
      })
      .catch((error) => {
        console.error("Failed to load admin monitoring data", error);
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
      const mapped = await fetchAdminMonitoring();
      setGroups(mapped);
    } catch (error) {
      console.error("Failed to refetch admin monitoring data", error);
    }
  }, []);

  return { groups, isHydrated, refetch };
}
