"use client";

// Real Supabase-backed CRUD for a project's task checklist (table
// project_tugas). Dosen defines the tasks and marks each one selesai/belum;
// a project's "progress" is now derived from this checklist (selesai /
// total * 100) instead of a number the mahasiswa used to type in by hand —
// see lib/useDosenKelompokBimbingan.ts, useMahasiswaKelompok.ts,
// useUmkmKelompok.ts, and useAdminMonitoring.ts, which all compute progress
// the same way via calculateTugasProgress below.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export interface ProjectTugas {
  id: string;
  projectId: string;
  judulTugas: string;
  urutan: number;
  isSelesai: boolean;
}

/** Takes the raw `project_tugas` embed shape (snake_case, straight off the query) — that's what every caller already has on hand. */
export function calculateTugasProgress(tugasList: { is_selesai: boolean }[]): number {
  if (tugasList.length === 0) return 0;
  const selesaiCount = tugasList.filter((t) => t.is_selesai).length;
  return Math.round((selesaiCount / tugasList.length) * 100);
}

function mapRow(row: { id: string; project_id: string; judul_tugas: string; urutan: number; is_selesai: boolean }): ProjectTugas {
  return {
    id: row.id,
    projectId: row.project_id,
    judulTugas: row.judul_tugas,
    urutan: row.urutan,
    isSelesai: row.is_selesai,
  };
}

async function fetchTugas(projectId: string): Promise<ProjectTugas[]> {
  const { data, error } = await supabase
    .from("project_tugas")
    .select("id, project_id, judul_tugas, urutan, is_selesai")
    .eq("project_id", projectId)
    .order("urutan", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export function useProjectTugas(projectId: string | null) {
  const [tugasList, setTugasList] = useState<ProjectTugas[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) {
      setTugasList([]);
      return;
    }
    try {
      setTugasList(await fetchTugas(projectId));
    } catch (error) {
      console.error("Failed to load project tugas", error);
      setTugasList([]);
    }
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!projectId) {
        if (isMounted) {
          setTugasList([]);
          setIsHydrated(true);
        }
        return;
      }
      try {
        const rows = await fetchTugas(projectId);
        if (isMounted) setTugasList(rows);
      } catch (error) {
        console.error("Failed to load project tugas", error);
        if (isMounted) setTugasList([]);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const addTugas = useCallback(
    async (judulTugas: string) => {
      if (!projectId) return;
      const { error } = await supabase.from("project_tugas").insert({
        project_id: projectId,
        judul_tugas: judulTugas,
        urutan: tugasList.length,
      });
      if (error) throw error;
      await refetch();
    },
    [projectId, tugasList.length, refetch]
  );

  const toggleSelesai = useCallback(
    async (tugasId: string, isSelesai: boolean) => {
      const { error } = await supabase.from("project_tugas").update({ is_selesai: isSelesai }).eq("id", tugasId);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const removeTugas = useCallback(
    async (tugasId: string) => {
      const { error } = await supabase.from("project_tugas").delete().eq("id", tugasId);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const progress = calculateTugasProgress(tugasList.map((t) => ({ is_selesai: t.isSelesai })));

  return { tugasList, isHydrated, progress, addTugas, toggleSelesai, removeTugas, refetch };
}
