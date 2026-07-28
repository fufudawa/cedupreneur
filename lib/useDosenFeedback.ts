"use client";

import { useCallback, useEffect, useState } from "react";
import { readFeedbackEntries, writeFeedbackEntries, type FeedbackEntry } from "./dosenFeedbackStorage";

/** Frontend-only append-only store for feedback (dosen + umkm), backed by localStorage. */
export function useDosenFeedback() {
  const [state, setState] = useState<{ feedbacks: FeedbackEntry[]; isHydrated: boolean }>({
    feedbacks: [],
    isHydrated: false,
  });

  useEffect(() => {
    const stored = readFeedbackEntries();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR); server & first client render both start empty, so this can't cause a hydration mismatch.
    setState({ feedbacks: stored, isHydrated: true });
  }, []);

  const addFeedback = useCallback(
    (feedback: FeedbackEntry) => {
      const next = [...state.feedbacks, feedback];
      writeFeedbackEntries(next);
      setState((s) => ({ ...s, feedbacks: next }));
    },
    [state.feedbacks]
  );

  return { feedbacks: state.feedbacks, isHydrated: state.isHydrated, addFeedback };
}
