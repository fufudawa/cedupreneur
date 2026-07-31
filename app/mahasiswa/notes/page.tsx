"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, NoteItem } from "@/components/shared";
import { Card, Input, Select, Button, Textarea, FilterToolbar } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";
import { getNotesStorageKey, sortNotesByLatest, type PersonalNote } from "@/lib/notesStorage";
import { useNotesStore } from "@/lib/useNotesStore";
import { useMahasiswaKelompok } from "@/lib/useMahasiswaKelompok";

const NOTES_MAX_LENGTH = 500;

const FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Belum selesai" },
  { value: "done", label: "Selesai" },
];

export default function AllNotesPage() {
  const { activeGroup, isHydrated: groupHydrated } = useMahasiswaKelompok();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getCurrentProfile()
      .then((profile) => {
        if (isMounted) setProfileId(profile.id);
      })
      .catch((error) => {
        console.error("Failed to load current profile", error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Kunci storage yang sama persis dengan yang dipakai widget Catatan Pribadi
  // di Dashboard (profile.id asli + kelas asli dari kelompok), supaya catatan
  // tidak "hilang" antara kedua halaman ini.
  const notesKey = getNotesStorageKey(profileId ?? "mahasiswa", activeGroup?.className ?? "-");
  const { notes, updateNote, removeNote, toggleComplete } = useNotesStore(notesKey);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");

  const filtered = sortNotesByLatest(notes).filter((note) => {
    const matchSearch = note.content.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "done" && note.isCompleted) ||
      (statusFilter === "pending" && !note.isCompleted);
    return matchSearch && matchStatus;
  });

  const handleEditClick = (note: PersonalNote) => {
    setEditingId(note.id);
    setEditingDraft(note.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingDraft("");
  };

  const handleSaveEdit = () => {
    const content = editingDraft.trim();
    if (content === "" || !editingId) return;
    updateNote(editingId, content);
    setEditingId(null);
    setEditingDraft("");
  };

  if (!groupHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Semua Catatan Pribadi"
        description="Lihat dan kelola seluruh catatan project Anda."
        actions={
          <Link href="/mahasiswa/dashboard">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Dashboard
            </Button>
          </Link>
        }
      />

      <FilterToolbar className="mb-6">
        <Input
          id="search-notes"
          placeholder="Cari catatan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-[300px]"
        />
        <Select
          id="filter-status-notes"
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-[190px]"
        />
      </FilterToolbar>

      <Card className="rounded-2xl p-5">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {notes.length === 0
              ? "Belum ada catatan. Catatan yang disimpan akan muncul di sini."
              : "Tidak ada catatan yang cocok dengan pencarian/filter."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((note) =>
              editingId === note.id ? (
                <div key={note.id} className="rounded-2xl border border-purple p-4">
                  <Textarea
                    value={editingDraft}
                    onChange={(e) => setEditingDraft(e.target.value.slice(0, NOTES_MAX_LENGTH))}
                    maxLength={NOTES_MAX_LENGTH}
                    rows={3}
                    className="resize-none text-sm"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {editingDraft.length} / {NOTES_MAX_LENGTH}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        Batal
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={editingDraft.trim() === ""}
                        onClick={handleSaveEdit}
                      >
                        Perbarui
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <NoteItem
                  key={note.id}
                  note={note}
                  onToggleComplete={toggleComplete}
                  onDelete={removeNote}
                  onEditClick={handleEditClick}
                />
              )
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
