"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadClassRelations,
  saveClassRelations,
  CLASS_RELATION_STORAGE_KEY,
  type ClassRelation,
  loadClassStudentRelations,
  saveClassStudentRelations,
  CLASS_STUDENT_RELATION_STORAGE_KEY,
  type ClassStudentRelation,
  loadRelationActivityLog,
  RELATION_ACTIVITY_STORAGE_KEY,
} from "./relasiKelasData";

/** Frontend-only CRUD for kelas<->UMKM assignments, backed by localStorage. */
export function useClassRelations() {
  const [state, setState] = useState<{ items: ClassRelation[]; isHydrated: boolean }>({
    items: [],
    isHydrated: false,
  });

  useEffect(() => {
    const stored = loadClassRelations();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR).
    setState({ items: stored, isHydrated: true });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== CLASS_RELATION_STORAGE_KEY) return;
      setState((s) => ({ ...s, items: loadClassRelations() }));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addClassRelation = useCallback(
    (item: ClassRelation) => {
      const next = [...state.items, item];
      saveClassRelations(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  const updateClassRelation = useCallback(
    (item: ClassRelation) => {
      const next = state.items.map((r) => (r.id === item.id ? item : r));
      saveClassRelations(next);
      setState((s) => ({ ...s, items: next }));
    },
    [state.items]
  );

  return { classRelations: state.items, isHydrated: state.isHydrated, addClassRelation, updateClassRelation };
}

/** Frontend-only CRUD for kelas<->mahasiswa membership, backed by localStorage. */
export function useClassStudentRelations() {
  const [state, setState] = useState<{ items: ClassStudentRelation[]; isHydrated: boolean }>({
    items: [],
    isHydrated: false,
  });

  useEffect(() => {
    const stored = loadClassStudentRelations();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR).
    setState({ items: stored, isHydrated: true });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== CLASS_STUDENT_RELATION_STORAGE_KEY) return;
      setState((s) => ({ ...s, items: loadClassStudentRelations() }));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setClassStudents = useCallback((classId: string, relations: ClassStudentRelation[]) => {
    setState((s) => {
      const next = [...s.items.filter((r) => r.classId !== classId), ...relations];
      saveClassStudentRelations(next);
      return { ...s, items: next };
    });
  }, []);

  const removeClassStudent = useCallback((classId: string, studentId: string) => {
    setState((s) => {
      const next = s.items.filter((r) => !(r.classId === classId && r.studentId === studentId));
      saveClassStudentRelations(next);
      return { ...s, items: next };
    });
  }, []);

  return {
    classStudentRelations: state.items,
    isHydrated: state.isHydrated,
    setClassStudents,
    removeClassStudent,
  };
}

/** Read-only view of the Relasi Kelas activity log; call appendRelationActivity() then refresh() to pick up new entries. */
export function useRelationActivityLog() {
  const [state, setState] = useState<{ items: ReturnType<typeof loadRelationActivityLog>; isHydrated: boolean }>({
    items: [],
    isHydrated: false,
  });

  const refresh = useCallback(() => {
    setState({ items: loadRelationActivityLog(), isHydrated: true });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR).
    refresh();
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== RELATION_ACTIVITY_STORAGE_KEY) return;
      refresh();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refresh]);

  return { activityLog: state.items, isHydrated: state.isHydrated, refresh };
}
