"use client";

import { useCallback, useEffect, useState } from "react";
import {
  initializeReports,
  writeProgressReports,
  STORAGE_KEY,
  type ProgressReport,
} from "./dosenProgressReportsStorage";

/** Frontend-only reads/updates for laporan_progress, backed by localStorage (shared across Dosen Mentoring pages). */
export function useDosenProgressReports() {
  const [state, setState] = useState<{ reports: ProgressReport[]; isHydrated: boolean }>({
    reports: [],
    isHydrated: false,
  });

  useEffect(() => {
    const stored = initializeReports();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR); server & first client render both start empty, so this can't cause a hydration mismatch.
    setState({ reports: stored, isHydrated: true });

    // Keep in sync if another tab/page writes to this key (e.g. a mahasiswa sending a revision).
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      setState((s) => ({ ...s, reports: initializeReports() }));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updateReport = useCallback(
    (reportId: string, patch: Partial<ProgressReport>) => {
      const next = state.reports.map((report) =>
        report.id === reportId ? { ...report, ...patch } : report
      );
      writeProgressReports(next);
      setState((s) => ({ ...s, reports: next }));
    },
    [state.reports]
  );

  const addReport = useCallback(
    (report: ProgressReport) => {
      const next = [...state.reports, report];
      writeProgressReports(next);
      setState((s) => ({ ...s, reports: next }));
    },
    [state.reports]
  );

  return { reports: state.reports, isHydrated: state.isHydrated, updateReport, addReport };
}
