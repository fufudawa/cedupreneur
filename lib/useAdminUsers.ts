"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUser, UserRole } from "./adminUsersData";
import { supabase } from "./supabaseClient";

type ProfileRow = {
  id: string;
  nama_lengkap: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean | null;
  created_at: string | null;
  created_by: string | null;
  dosen: DosenRow | DosenRow[] | null;
  mahasiswa: MahasiswaRow | MahasiswaRow[] | null;
  umkm: UmkmRow | UmkmRow[] | null;
};

type DosenRow = {
  nip: string | null;
  fakultas: string | null;
  jabatan: string | null;
  mata_kuliah_diampu: string[] | null;
};

type MahasiswaRow = {
  nim: string | null;
  prodi: string | null;
  angkatan: number | null;
};

type UmkmRow = {
  nama_usaha: string | null;
  sektor_usaha: string | null;
  alamat: string | null;
  deskripsi_usaha: string | null;
  kontak: string | null;
};

function firstRelation<T>(relation: T | T[] | null): T | undefined {
  return Array.isArray(relation) ? relation[0] : relation ?? undefined;
}

function mapProfileToAdminUser(profile: ProfileRow): AdminUser {
  const dosen = firstRelation(profile.dosen);
  const mahasiswa = firstRelation(profile.mahasiswa);
  const umkm = firstRelation(profile.umkm);

  return {
    id: profile.id,
    name: profile.nama_lengkap ?? "",
    email: profile.email ?? "",
    role: profile.role,
    isActive: profile.is_active ?? false,
    createdAt: profile.created_at ?? "",
    createdBy: profile.created_by ?? undefined,
    ...(profile.role === "dosen" && {
      nip: dosen?.nip ?? undefined,
      prodi: dosen?.fakultas ?? undefined,
      jabatan: dosen?.jabatan ?? undefined,
      mataKuliah: dosen?.mata_kuliah_diampu ?? undefined,
    }),
    ...(profile.role === "mahasiswa" && {
      nim: mahasiswa?.nim ?? undefined,
      prodi: mahasiswa?.prodi ?? undefined,
      angkatan: mahasiswa?.angkatan ?? undefined,
    }),
    ...(profile.role === "umkm" && {
      businessName: umkm?.nama_usaha ?? undefined,
      businessSector: umkm?.sektor_usaha ?? undefined,
      businessAddress: umkm?.alamat ?? undefined,
      businessDescription: umkm?.deskripsi_usaha ?? undefined,
      phone: umkm?.kontak ?? undefined,
    }),
  };
}

async function fetchUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      nama_lengkap,
      email,
      role,
      is_active,
      created_at,
      created_by,
      dosen (
        nip,
        fakultas,
        jabatan,
        mata_kuliah_diampu
      ),
      mahasiswa (
        nim,
        prodi,
        angkatan
      ),
      umkm (
        nama_usaha,
        sektor_usaha,
        alamat,
        deskripsi_usaha,
        kontak
      )
    `);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProfileRow[]).map(mapProfileToAdminUser);
}

export function useAdminUsers() {
  const [state, setState] = useState<{ users: AdminUser[]; isHydrated: boolean }>({
    users: [],
    isHydrated: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        const users = await fetchUsers();
        if (isMounted) setState({ users, isHydrated: true });
      } catch (error) {
        console.error("Failed to fetch admin users", error);
        if (isMounted) setState({ users: [], isHydrated: true });
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    try {
      const users = await fetchUsers();
      setState({ users, isHydrated: true });
    } catch (error) {
      console.error("Failed to refetch admin users", error);
    }
  }, []);

  const addUser = useCallback(
    (user: AdminUser): AdminUser => {
      void user;
      throw new Error("Not implemented yet");
    },
    []
  );

  const updateUser = useCallback(
    (user: AdminUser) => {
      void user;
      throw new Error("Not implemented yet");
    },
    []
  );

  return { users: state.users, isHydrated: state.isHydrated, addUser, updateUser, refetch };
}
