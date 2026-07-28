"use client";

import { useCallback, useEffect, useState } from "react";
import { addUmkmFeedback, getUmkmFeedbackByReport, type LaporanValidasiStatus, type UmkmFeedback } from "./umkmFeedbackStorage";

interface UseUmkmFeedbackParams {
  reportId: string;
  groupId: string;
  milestoneId: string;
  pemberiId: string;
  pemberiNama: string;
}

/** Frontend-only reads/writes for one report's UMKM feedback history (newest first), backed by localStorage. */
export function useUmkmFeedback(params: UseUmkmFeedbackParams) {
  const { reportId, groupId, milestoneId, pemberiId, pemberiNama } = params;
  const [history, setHistory] = useState<UmkmFeedback[]>([]);

  useEffect(() => {
    const stored = getUmkmFeedbackByReport(reportId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR); server & first client render both start empty, so this can't cause a hydration mismatch.
    setHistory(stored);
  }, [reportId]);

  const submit = useCallback(
    (isiFeedback: string, statusValidasi: LaporanValidasiStatus) => {
      const created = addUmkmFeedback({
        laporanId: reportId,
        groupId,
        milestoneId,
        pemberiId,
        pemberiNama,
        isiFeedback,
        statusValidasi,
      });
      setHistory((prev) => [created, ...prev]);
      return created;
    },
    [reportId, groupId, milestoneId, pemberiId, pemberiNama]
  );

  return { latest: history[0] ?? null, history, submit };
}
