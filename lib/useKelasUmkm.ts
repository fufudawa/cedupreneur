"use client";

// Supabase-backed CRUD for the kelas<->umkm relation (table kelas_umkm — a
// real ERD many-to-many join, id/kelas_id/umkm_id only, no status/catatan
// column). Replaces the old lib/useRelasiKelasData.ts + lib/relasiKelasData.ts
// dummy "ClassRelation" concept, which also carried a per-relation status,
// catatan, and student roster that don't exist in the real schema — dropped
// per the same decision applied to Data Master (see lib/adminMasterData.ts).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export interface KelasUmkmLink {
  id: string;
  kelasId: string;
  umkmId: string;
}

async function fetchLinks(): Promise<KelasUmkmLink[]> {
  const { data, error } = await supabase.from("kelas_umkm").select("id, kelas_id, umkm_id");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, kelasId: row.kelas_id, umkmId: row.umkm_id }));
}

export function useKelasUmkm() {
  const [links, setLinks] = useState<KelasUmkmLink[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchLinks()
      .then((mapped) => {
        if (isMounted) setLinks(mapped);
      })
      .catch((error) => console.error("Failed to load kelas_umkm links", error))
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
    async (kelasId: string, umkmId: string) => {
      const { error } = await supabase.from("kelas_umkm").insert({ kelas_id: kelasId, umkm_id: umkmId });
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const removeLink = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("kelas_umkm").delete().eq("id", id);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  return { links, isHydrated, addLink, removeLink, refetch };
}
