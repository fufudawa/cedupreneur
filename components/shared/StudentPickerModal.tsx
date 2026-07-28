"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { Input, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { StudentOption } from "@/lib/dosenGroupsStorage";

interface StudentPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Already filtered to the form's selected program studi + kelas, excluding members already added. */
  students: StudentOption[];
  /** Ids belonging to another active group. */
  takenStudentIds: Set<string>;
  remainingSlots: number;
  onConfirm: (students: StudentOption[]) => void;
  title?: string;
}

export function StudentPickerModal({
  open,
  onClose,
  students,
  takenStudentIds,
  remainingSlots,
  onConfirm,
  title = "Tambah Anggota Mahasiswa",
}: StudentPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (keyword === "") return students;
    return students.filter(
      (student) => student.nim.includes(keyword) || student.name.toLowerCase().includes(keyword)
    );
  }, [students, search]);

  const exceedsLimit = selectedIds.length > remainingSlots;

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => {
    setSearch("");
    setSelectedIds([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0 || exceedsLimit) return;
    onConfirm(students.filter((student) => selectedIds.includes(student.id)));
    reset();
  };

  return (
    <Modal open={open} onClose={handleClose} title={title} maxWidthClassName="max-w-xl">
      <div className="flex flex-col gap-4">
        <Input
          id="search-student"
          placeholder="Cari NIM atau nama mahasiswa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-72 overflow-y-auto rounded-xl border border-soft-gray-dark">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-navy">Mahasiswa tidak ditemukan</p>
              <p className="mt-1 text-xs text-muted">
                Coba ubah kata pencarian atau pastikan kelas sudah dipilih.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-soft-gray-dark">
              {filtered.map((student) => {
                const isTaken = takenStudentIds.has(student.id);
                const isChecked = selectedIds.includes(student.id);
                return (
                  <label
                    key={student.id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3 text-sm",
                      isTaken ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-soft-gray"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isTaken}
                        onChange={() => toggle(student.id)}
                        className="h-4 w-4 accent-purple"
                      />
                      <span>
                        <span className="block font-medium text-navy">{student.name}</span>
                        <span className="block text-xs text-muted">{student.nim}</span>
                      </span>
                    </span>
                    {isTaken && <Badge variant="gray">Sudah memiliki kelompok</Badge>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>{selectedIds.length} mahasiswa dipilih</span>
          {exceedsLimit && (
            <span className="font-medium text-pink">Maksimal 5 mahasiswa dalam satu kelompok.</span>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={selectedIds.length === 0 || exceedsLimit}
            onClick={handleConfirm}
          >
            Tambahkan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
