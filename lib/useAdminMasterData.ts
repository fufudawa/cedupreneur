"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadMataKuliah,
  saveMataKuliah,
  MATA_KULIAH_STORAGE_KEY,
  type MataKuliah,
  loadKelas,
  saveKelas,
  KELAS_STORAGE_KEY,
  type Kelas,
  loadUmkmMaster,
  saveUmkmMaster,
  UMKM_MASTER_STORAGE_KEY,
  type UmkmMaster,
} from "./adminMasterData";

/** Frontend-only CRUD for Data Master's Mata Kuliah, backed by localStorage. */
export function useMataKuliah() {
  const [state, setState] = useState<{ items: MataKuliah[]; isHydrated: boolean }>({
    items: [],
    isHydrated: false,
  });

  useEffect(() => {
    const stored = loadMataKuliah();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR).
    setState({ items: stored, isHydrated: true });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== MATA_KULIAH_STORAGE_KEY) return;
      setState((s) => ({ ...s, items: loadMataKuliah() }));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addMataKuliah = useCallback(
    (item: MataKuliah) => {
      const next = [...state.items, item];
      saveMataKuliah(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  const updateMataKuliah = useCallback(
    (item: MataKuliah) => {
      const next = state.items.map((m) => (m.id === item.id ? item : m));
      saveMataKuliah(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  const removeMataKuliah = useCallback(
    (id: string) => {
      const next = state.items.filter((m) => m.id !== id);
      saveMataKuliah(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  return { mataKuliah: state.items, isHydrated: state.isHydrated, addMataKuliah, updateMataKuliah, removeMataKuliah };
}

/** Frontend-only CRUD for Data Master's Kelas, backed by localStorage. */
export function useKelas() {
  const [state, setState] = useState<{ items: Kelas[]; isHydrated: boolean }>({
    items: [],
    isHydrated: false,
  });

  useEffect(() => {
    const stored = loadKelas();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR).
    setState({ items: stored, isHydrated: true });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== KELAS_STORAGE_KEY) return;
      setState((s) => ({ ...s, items: loadKelas() }));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addKelas = useCallback(
    (item: Kelas) => {
      const next = [...state.items, item];
      saveKelas(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  const updateKelas = useCallback(
    (item: Kelas) => {
      const next = state.items.map((k) => (k.id === item.id ? item : k));
      saveKelas(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  const removeKelas = useCallback(
    (id: string) => {
      const next = state.items.filter((k) => k.id !== id);
      saveKelas(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  return { kelasList: state.items, isHydrated: state.isHydrated, addKelas, updateKelas, removeKelas };
}

/** Frontend-only CRUD for Data Master's UMKM master profiles, backed by localStorage. */
export function useUmkmMaster() {
  const [state, setState] = useState<{ items: UmkmMaster[]; isHydrated: boolean }>({
    items: [],
    isHydrated: false,
  });

  useEffect(() => {
    const stored = loadUmkmMaster();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR).
    setState({ items: stored, isHydrated: true });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== UMKM_MASTER_STORAGE_KEY) return;
      setState((s) => ({ ...s, items: loadUmkmMaster() }));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addUmkmMaster = useCallback(
    (item: UmkmMaster) => {
      const next = [...state.items, item];
      saveUmkmMaster(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  const updateUmkmMaster = useCallback(
    (item: UmkmMaster) => {
      const next = state.items.map((u) => (u.id === item.id ? item : u));
      saveUmkmMaster(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  const removeUmkmMaster = useCallback(
    (id: string) => {
      const next = state.items.filter((u) => u.id !== id);
      saveUmkmMaster(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  return {
    umkmMasterList: state.items,
    isHydrated: state.isHydrated,
    addUmkmMaster,
    updateUmkmMaster,
    removeUmkmMaster,
  };
}
