"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultProjectMilestones,
  readProjectMilestones,
  writeProjectMilestones,
  type ProjectMilestone,
} from "./dosenProjectMilestoneStorage";

/** Frontend-only CRUD for Dosen's Project Active milestones, backed by localStorage. */
export function useDosenProjectMilestones() {
  const [state, setState] = useState<{ milestones: ProjectMilestone[]; isHydrated: boolean }>({
    milestones: defaultProjectMilestones,
    isHydrated: false,
  });

  useEffect(() => {
    const stored = readProjectMilestones();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR); server & first client render both start from the same dummy default, so this can't cause a hydration mismatch.
    setState({ milestones: stored.length > 0 ? stored : defaultProjectMilestones, isHydrated: true });
  }, []);

  const addMilestone = useCallback(
    (milestone: ProjectMilestone) => {
      const next = [...state.milestones, milestone];
      writeProjectMilestones(next);
      setState((s) => ({ ...s, milestones: next }));
    },
    [state.milestones]
  );

  return { milestones: state.milestones, isHydrated: state.isHydrated, addMilestone };
}
