"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createNoteId,
  readNotes,
  writeNotes,
  type PersonalNote,
} from "./notesStorage";

/**
 * Frontend-only CRUD for a mahasiswa's personal notes, backed by localStorage
 * and scoped by `key` (see getNotesStorageKey). Used by both the Dashboard
 * preview and the /mahasiswa/notes full list so they stay in sync.
 */
export function useNotesStore(key: string) {
  const [notes, setNotes] = useState<PersonalNote[]>([]);

  useEffect(() => {
    const stored = readNotes(key);
    if (stored.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe sync from localStorage (unavailable during SSR); server & first client render both start empty, so this can't cause a hydration mismatch.
      setNotes(stored);
    }
  }, [key]);

  const addNote = useCallback(
    (content: string) => {
      const now = new Date().toISOString();
      const note: PersonalNote = {
        id: createNoteId(),
        content,
        createdAt: now,
        updatedAt: now,
        isCompleted: false,
      };
      const next = [note, ...notes];
      writeNotes(key, next);
      setNotes(next);
    },
    [key, notes]
  );

  const updateNote = useCallback(
    (id: string, content: string) => {
      const next = notes.map((note) =>
        note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note
      );
      writeNotes(key, next);
      setNotes(next);
    },
    [key, notes]
  );

  const removeNote = useCallback(
    (id: string) => {
      const next = notes.filter((note) => note.id !== id);
      writeNotes(key, next);
      setNotes(next);
    },
    [key, notes]
  );

  const toggleComplete = useCallback(
    (id: string) => {
      const next = notes.map((note) =>
        note.id === id
          ? { ...note, isCompleted: !note.isCompleted, updatedAt: new Date().toISOString() }
          : note
      );
      writeNotes(key, next);
      setNotes(next);
    },
    [key, notes]
  );

  return { notes, addNote, updateNote, removeNote, toggleComplete };
}
