"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { MataKuliah, Kelas, UmkmMaster } from "./adminMasterData";

/** Supabase-backed CRUD for Data Master's Mata Kuliah (id, kode_mk, nama_mk, sks only — see adminMasterData.ts header). */
export function useMataKuliah() {
  const [items, setItems] = useState<MataKuliah[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("mata_kuliah").select("id, kode_mk, nama_mk, sks").order("kode_mk");
    if (error) throw error;
    return (data ?? []).map((m) => ({ id: m.id, kode: m.kode_mk, nama: m.nama_mk, sks: m.sks ?? 0 }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    load()
      .then((mapped) => {
        if (isMounted) setItems(mapped);
      })
      .catch((error) => console.error("Failed to load mata kuliah", error))
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });
    return () => {
      isMounted = false;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setItems(await load());
  }, [load]);

  const addMataKuliah = useCallback(
    async (item: { kode: string; nama: string; sks: number }) => {
      const { error } = await supabase.from("mata_kuliah").insert({ kode_mk: item.kode, nama_mk: item.nama, sks: item.sks });
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const updateMataKuliah = useCallback(
    async (item: MataKuliah) => {
      const { error } = await supabase
        .from("mata_kuliah")
        .update({ kode_mk: item.kode, nama_mk: item.nama, sks: item.sks })
        .eq("id", item.id);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const removeMataKuliah = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("mata_kuliah").delete().eq("id", id);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  return { mataKuliah: items, isHydrated, addMataKuliah, updateMataKuliah, removeMataKuliah, refetch };
}

/** Supabase-backed CRUD for Data Master's Kelas (no status/catatan/roster columns exist — see adminMasterData.ts header). */
export function useKelas() {
  const [items, setItems] = useState<Kelas[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("kelas")
      .select(
        "id, nama_kelas, semester, tahun_ajaran, mata_kuliah_id, dosen_id, mata_kuliah ( nama_mk ), dosen ( profiles ( nama_lengkap ) )"
      )
      .order("nama_kelas");
    if (error) throw error;

    type Row = {
      id: string;
      nama_kelas: string | null;
      semester: string | null;
      tahun_ajaran: string | null;
      mata_kuliah_id: string;
      dosen_id: string;
      mata_kuliah: { nama_mk: string | null } | null;
      dosen: { profiles: { nama_lengkap: string | null } | null } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((k) => ({
      id: k.id,
      nama: k.nama_kelas ?? "-",
      mataKuliahId: k.mata_kuliah_id,
      mataKuliahNama: k.mata_kuliah?.nama_mk ?? "-",
      dosenId: k.dosen_id,
      dosenNama: k.dosen?.profiles?.nama_lengkap ?? "-",
      semester: k.semester ?? "-",
      tahunAjaran: k.tahun_ajaran ?? "-",
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    load()
      .then((mapped) => {
        if (isMounted) setItems(mapped);
      })
      .catch((error) => console.error("Failed to load kelas", error))
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });
    return () => {
      isMounted = false;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setItems(await load());
  }, [load]);

  const addKelas = useCallback(
    async (item: { nama: string; mataKuliahId: string; dosenId: string; semester: string; tahunAjaran: string }) => {
      const { error } = await supabase.from("kelas").insert({
        nama_kelas: item.nama,
        mata_kuliah_id: item.mataKuliahId,
        dosen_id: item.dosenId,
        semester: item.semester,
        tahun_ajaran: item.tahunAjaran,
      });
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const updateKelas = useCallback(
    async (item: Kelas) => {
      const { error } = await supabase
        .from("kelas")
        .update({
          nama_kelas: item.nama,
          mata_kuliah_id: item.mataKuliahId,
          dosen_id: item.dosenId,
          semester: item.semester,
          tahun_ajaran: item.tahunAjaran,
        })
        .eq("id", item.id);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const removeKelas = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("kelas").delete().eq("id", id);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  return { kelasList: items, isHydrated, addKelas, updateKelas, removeKelas, refetch };
}

/**
 * Supabase-backed read/edit for Data Master's UMKM master profiles. No
 * add/remove here — umkm.profile_id is NOT NULL, so creating or deleting a
 * UMKM always means creating/deleting its login account too, which is Admin
 * Pengguna's job (Tambah Pengguna / Hapus Pengguna), not Data Master's.
 */
export function useUmkmMaster() {
  const [items, setItems] = useState<UmkmMaster[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("umkm")
      .select("id, nama_usaha, sektor_usaha, alamat, deskripsi_usaha, kontak, kelas_umkm ( kelas ( nama_kelas ) )")
      .order("nama_usaha");
    if (error) throw error;

    type Row = {
      id: string;
      nama_usaha: string | null;
      sektor_usaha: string | null;
      alamat: string | null;
      deskripsi_usaha: string | null;
      kontak: string | null;
      kelas_umkm: { kelas: { nama_kelas: string | null } | null }[] | null;
    };
    return ((data ?? []) as unknown as Row[]).map((u) => ({
      id: u.id,
      namaUsaha: u.nama_usaha ?? "-",
      sektorUsaha: u.sektor_usaha ?? "-",
      alamat: u.alamat ?? "-",
      deskripsiUsaha: u.deskripsi_usaha ?? "",
      kontak: u.kontak ?? "-",
      connectedKelasNames: (u.kelas_umkm ?? []).map((ku) => ku.kelas?.nama_kelas ?? "-"),
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    load()
      .then((mapped) => {
        if (isMounted) setItems(mapped);
      })
      .catch((error) => console.error("Failed to load umkm master", error))
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });
    return () => {
      isMounted = false;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setItems(await load());
  }, [load]);

  const updateUmkmMaster = useCallback(
    async (item: UmkmMaster) => {
      const { error } = await supabase
        .from("umkm")
        .update({
          nama_usaha: item.namaUsaha,
          sektor_usaha: item.sektorUsaha,
          alamat: item.alamat,
          deskripsi_usaha: item.deskripsiUsaha || null,
          kontak: item.kontak || null,
        })
        .eq("id", item.id);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  return { umkmMasterList: items, isHydrated, updateUmkmMaster, refetch };
}

export interface MahasiswaMaster {
  id: string;
  nim: string;
  nama: string;
  prodi: string;
  angkatan: number | null;
  connectedKelas: { linkId: string; kelasId: string; kelasNama: string }[];
}

/**
 * Supabase-backed read for Data Master's Mahasiswa list, including which
 * kelas each mahasiswa is linked to via kelas_mahasiswa. No add/remove here —
 * mahasiswa.profile_id is NOT NULL, so creating/deleting a mahasiswa account
 * is Admin Pengguna's job; this is only for managing kelas assignment.
 */
export function useMahasiswaMaster() {
  const [items, setItems] = useState<MahasiswaMaster[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("mahasiswa")
      .select(
        "id, nim, prodi, angkatan, profiles ( nama_lengkap ), kelas_mahasiswa ( id, kelas_id, kelas ( nama_kelas ) )"
      )
      .order("nim");
    if (error) throw error;

    type Row = {
      id: string;
      nim: string | null;
      prodi: string | null;
      angkatan: number | null;
      profiles: { nama_lengkap: string | null } | null;
      kelas_mahasiswa: { id: string; kelas_id: string; kelas: { nama_kelas: string | null } | null }[] | null;
    };
    return ((data ?? []) as unknown as Row[]).map((m) => ({
      id: m.id,
      nim: m.nim ?? "-",
      nama: m.profiles?.nama_lengkap ?? "-",
      prodi: m.prodi ?? "-",
      angkatan: m.angkatan,
      connectedKelas: (m.kelas_mahasiswa ?? []).map((km) => ({
        linkId: km.id,
        kelasId: km.kelas_id,
        kelasNama: km.kelas?.nama_kelas ?? "-",
      })),
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    load()
      .then((mapped) => {
        if (isMounted) setItems(mapped);
      })
      .catch((error) => console.error("Failed to load mahasiswa master", error))
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });
    return () => {
      isMounted = false;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    setItems(await load());
  }, [load]);

  return { mahasiswaMasterList: items, isHydrated, refetch };
}

export interface DosenOption {
  /** dosen.id (the role table's own primary key) — what kelas.dosen_id actually references, NOT profile.id. */
  id: string;
  name: string;
}

/**
 * Real dosen.id + display name for populating "Dosen Pengampu" dropdowns.
 * lib/useAdminUsers.ts's AdminUser.id is profile.id, which is a different
 * UUID space from dosen.id — using it directly as kelas.dosen_id causes a
 * foreign-key violation on insert/update.
 */
export function useDosenOptions() {
  const [options, setOptions] = useState<DosenOption[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const { data, error } = await supabase.from("dosen").select("id, profiles ( nama_lengkap )").order("id");
        if (error) throw error;

        type Row = { id: string; profiles: { nama_lengkap: string | null } | null };
        const mapped = ((data ?? []) as unknown as Row[]).map((d) => ({
          id: d.id,
          name: d.profiles?.nama_lengkap ?? "-",
        }));
        if (isMounted) setOptions(mapped);
      } catch (error) {
        console.error("Failed to load dosen options", error);
        if (isMounted) setOptions([]);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return { dosenOptions: options, isHydrated };
}
