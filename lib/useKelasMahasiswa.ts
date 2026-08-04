"use client";

// Supabase-backed CRUD for the kelas<->mahasiswa relation (table
// kelas_mahasiswa — a real many-to-many join, id/kelas_id/mahasiswa_id only).
// Lets Admin assign a mahasiswa to the specific kelas they're enrolled in,
// which Dosen then relies on to build an accurate roster when creating a
// kelompok. Mirrors lib/useKelasUmkm.ts's shape.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export interface KelasMahasiswaLink {
  id: string;
  kelasId: string;
  mahasiswaId: string;
}

async function fetchLinks(): Promise<KelasMahasiswaLink[]> {
  const { data, error } = await supabase.from("kelas_mahasiswa").select("id, kelas_id, mahasiswa_id");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, kelasId: row.kelas_id, mahasiswaId: row.mahasiswa_id }));
}

export function useKelasMahasiswa() {
  const [links, setLinks] = useState<KelasMahasiswaLink[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchLinks()
      .then((mapped) => {
        if (isMounted) setLinks(mapped);
      })
      .catch((error) => console.error("Failed to load kelas_mahasiswa links", error))
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLinks(await fetchLinks());
  }, []);

  const addLink = useCallback(
    async (kelasId: string, mahasiswaId: string) => {
      const { error } = await supabase.from("kelas_mahasiswa").insert({ kelas_id: kelasId, mahasiswa_id: mahasiswaId });
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const removeLink = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("kelas_mahasiswa").delete().eq("id", id);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  return { links, isHydrated, addLink, removeLink, refetch };
}
