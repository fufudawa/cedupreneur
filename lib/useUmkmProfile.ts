"use client";

import { useCallback, useEffect, useState } from "react";
import { readUmkmProfile, writeUmkmProfile, type UmkmProfile } from "./umkmProfileStorage";

/** Frontend-only profile store shared by /umkm/profile-usaha (read) and /umkm/profile-usaha/edit (write). */
export function useUmkmProfile(defaultProfile: UmkmProfile) {
  const [profile, setProfile] = useState<UmkmProfile>(defaultProfile);

  useEffect(() => {
    const stored = readUmkmProfile(defaultProfile.id);
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR); server & first client render both start from the same dummy default, so this can't cause a hydration mismatch.
      setProfile(stored);
    }
  }, [defaultProfile.id]);

  const save = useCallback((next: UmkmProfile) => {
    writeUmkmProfile(next);
    setProfile(next);
  }, []);

  return { profile, save };
}
