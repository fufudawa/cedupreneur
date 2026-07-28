"use client";

import { useCallback, useEffect, useState } from "react";
import { loadGroups, saveGroups, STORAGE_KEY, type SupervisedGroup } from "./dosenGroupsStorage";

/** Frontend-only CRUD for Dosen's kelompok bimbingan, backed by localStorage (shared across all /dosen/project* pages). */
export function useDosenSupervisedGroups() {
  const [state, setState] = useState<{ groups: SupervisedGroup[]; isHydrated: boolean }>({
    groups: [],
    isHydrated: false,
  });

  useEffect(() => {
    const stored = loadGroups();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR); server & first client render both start empty, so this can't cause a hydration mismatch.
    setState({ groups: stored, isHydrated: true });

    // Keep in sync if another tab/page writes to this key (e.g. a mahasiswa sending a revision).
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      setState((s) => ({ ...s, groups: loadGroups() }));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addGroup = useCallback(
    (group: SupervisedGroup) => {
      const next = [...state.groups, group];
      saveGroups(next);
      setState((s) => ({ ...s, groups: next }));
    },
    [state.groups]
  );

  const updateGroup = useCallback(
    (group: SupervisedGroup) => {
      const next = state.groups.map((g) => (g.id === group.id ? group : g));
      saveGroups(next);
      setState((s) => ({ ...s, groups: next }));
    },
    [state.groups]
  );

  const removeGroup = useCallback(
    (id: string) => {
      const next = state.groups.filter((g) => g.id !== id);
      saveGroups(next);
      setState((s) => ({ ...s, groups: next }));
    },
    [state.groups]
  );

  return { groups: state.groups, isHydrated: state.isHydrated, addGroup, updateGroup, removeGroup };
}
