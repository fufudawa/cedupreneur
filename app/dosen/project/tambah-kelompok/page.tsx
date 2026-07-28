"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Users as UsersIcon } from "lucide-react";
import { PageHeader, StudentPickerModal, Modal } from "@/components/shared";
import { Card, Input, Select, Textarea, Button } from "@/components/ui";
import { PROJECT_STAGE_TITLES } from "@/data/dosenProject";
import { lecturerDashboard } from "@/data/dosenDashboard";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import {
  STUDY_PROGRAMS,
  CLASSES_BY_STUDY_PROGRAM,
  UMKM_OPTIONS,
  STUDENTS,
  createGroupId,
  buildGroupCode,
  type SupervisedGroup,
  type SupervisedGroupMember,
} from "@/lib/dosenGroupsStorage";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 80;
const NOTE_MAX_LENGTH = 500;
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 5;
const PAGE_SIZE = 3;

const studyProgramOptions = [
  { value: "", label: "Pilih program studi" },
  ...STUDY_PROGRAMS.map((program) => ({ value: program, label: program })),
];

export default function TambahKelompokPage() {
  const router = useRouter();
  const { groups, isHydrated, addGroup, updateGroup, removeGroup } = useDosenSupervisedGroups();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [studyProgram, setStudyProgram] = useState("");
  const [className, setClassName] = useState("");
  const [umkmId, setUmkmId] = useState("");
  const [members, setMembers] = useState<SupervisedGroupMember[]>([]);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<SupervisedGroup | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const classOptions = useMemo(() => {
    const classes = studyProgram ? (CLASSES_BY_STUDY_PROGRAM[studyProgram] ?? []) : [];
    return [{ value: "", label: "Pilih kelas" }, ...classes.map((c) => ({ value: c, label: c }))];
  }, [studyProgram]);

  const activeGroupsExcludingEditing = useMemo(
    () => groups.filter((group) => group.status === "progress" && group.id !== editingId),
    [groups, editingId]
  );

  const takenUmkmIds = useMemo(
    () => new Set(activeGroupsExcludingEditing.map((group) => group.umkmId)),
    [activeGroupsExcludingEditing]
  );

  const takenStudentIds = useMemo(
    () => new Set(activeGroupsExcludingEditing.flatMap((group) => group.members.map((m) => m.id))),
    [activeGroupsExcludingEditing]
  );

  const umkmOptionsWithAvailability = [
    { value: "", label: "Pilih UMKM mitra" },
    ...UMKM_OPTIONS.map((umkm) => ({
      value: umkm.id,
      label: takenUmkmIds.has(umkm.id) ? `${umkm.name} (Sudah digunakan)` : umkm.name,
      disabled: takenUmkmIds.has(umkm.id),
    })),
  ];

  const availableStudentsForPicker = STUDENTS.filter(
    (student) =>
      student.studyProgram === studyProgram &&
      student.className === className &&
      !members.some((m) => m.id === student.id)
  );

  const canOpenPicker = studyProgram !== "" && className !== "" && members.length < MAX_MEMBERS;
  const pickerHelperText =
    studyProgram === "" || className === ""
      ? "Pilih program studi dan kelas terlebih dahulu."
      : members.length >= MAX_MEMBERS
        ? "Sudah mencapai maksimal 5 anggota."
        : null;

  const errors = {
    name:
      name.trim().length < NAME_MIN_LENGTH || name.trim().length > NAME_MAX_LENGTH
        ? "Nama kelompok wajib diisi."
        : null,
    studyProgram: studyProgram === "" ? "Program studi wajib dipilih." : null,
    className: className === "" ? "Kelas wajib dipilih." : null,
    umkmId: umkmId === "" ? "UMKM mitra wajib dipilih." : null,
    members:
      members.length < MIN_MEMBERS
        ? "Minimal 2 mahasiswa dalam satu kelompok."
        : members.length > MAX_MEMBERS
          ? "Maksimal 5 mahasiswa dalam satu kelompok."
          : null,
  };
  const isValid = Object.values(errors).every((message) => message === null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setStudyProgram("");
    setClassName("");
    setUmkmId("");
    setMembers([]);
    setNote("");
    setTouched(false);
  };

  const handleStudyProgramChange = (value: string) => {
    setStudyProgram(value);
    setClassName("");
  };

  const handleAddMembers = (selected: { id: string; nim: string; name: string }[]) => {
    setMembers((prev) => [...prev, ...selected.map((s) => ({ id: s.id, nim: s.nim, name: s.name }))]);
    setIsPickerOpen(false);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleEditClick = (group: SupervisedGroup) => {
    setEditingId(group.id);
    setName(group.name);
    setStudyProgram(group.studyProgram);
    setClassName(group.className);
    setUmkmId(group.umkmId);
    setMembers(group.members);
    setNote(group.note);
    setTouched(false);
  };

  const handleCancel = () => {
    if (editingId) {
      resetForm();
    } else {
      router.push("/dosen/project");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const umkm = UMKM_OPTIONS.find((u) => u.id === umkmId);
    if (!umkm) {
      setToast("UMKM yang dipilih tidak ditemukan. Pilih UMKM lain.");
      return;
    }

    if (editingId) {
      const existing = groups.find((g) => g.id === editingId);
      if (!existing) return;
      const updated: SupervisedGroup = {
        ...existing,
        name: name.trim(),
        code: buildGroupCode(studyProgram, className, name.trim()),
        studyProgram,
        className,
        umkmId,
        umkmName: umkm.name,
        members,
        note: note.trim(),
      };
      updateGroup(updated);
      setToast("Kelompok berhasil diperbarui.");
    } else {
      const group: SupervisedGroup = {
        id: createGroupId(name.trim(), groups),
        code: buildGroupCode(studyProgram, className, name.trim()),
        name: name.trim(),
        studyProgram,
        className,
        umkmId,
        umkmName: umkm.name,
        lecturerName: lecturerDashboard.lecturerName,
        members,
        note: note.trim(),
        createdAt: new Date().toISOString(),
        period: "4 Januari - 4 Juli 2026",
        progressPercentage: 0,
        currentStage: PROJECT_STAGE_TITLES[0],
        status: "progress",
      };
      addGroup(group);
      setToast("Kelompok berhasil disimpan.");
    }
    resetForm();
  };

  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedGroups = groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleConfirmDelete = () => {
    if (!deletingGroup) return;
    removeGroup(deletingGroup.id);
    if (editingId === deletingGroup.id) {
      resetForm();
    }
    setDeletingGroup(null);
    setToast("Kelompok berhasil dihapus.");
  };

  return (
    <div>
      <PageHeader
        title={editingId ? "Edit Group" : "Add Group"}
        description="Buat dan kelola kelompok bimbingan yang terhubung ke UMKM mitra."
      />

      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <form onSubmit={handleSubmit} className="min-w-0">
          <Card className="min-w-0 rounded-2xl p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Nama Kelompok"
                  id="name"
                  placeholder="Masukkan nama kelompok"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, NAME_MAX_LENGTH))}
                  required
                />
                {touched && errors.name && <p className="text-xs text-pink">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Select
                    label="Pilih Program Studi"
                    id="studyProgram"
                    options={studyProgramOptions}
                    value={studyProgram}
                    onChange={(e) => handleStudyProgramChange(e.target.value)}
                    required
                  />
                  {touched && errors.studyProgram && (
                    <p className="text-xs text-pink">{errors.studyProgram}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Select
                    label="Pilih Kelas"
                    id="className"
                    options={classOptions}
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    disabled={studyProgram === ""}
                    required
                  />
                  {touched && errors.className && <p className="text-xs text-pink">{errors.className}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Select
                  label="Pilih UMKM Mitra"
                  id="umkm"
                  options={umkmOptionsWithAvailability}
                  value={umkmId}
                  onChange={(e) => setUmkmId(e.target.value)}
                  required
                />
                {touched && errors.umkmId && <p className="text-xs text-pink">{errors.umkmId}</p>}
              </div>

              <Input label="Dosen Pembimbing" id="lecturer" value={lecturerDashboard.lecturerName} disabled />

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-navy">Anggota Mahasiswa</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canOpenPicker}
                    onClick={() => setIsPickerOpen(true)}
                  >
                    Tambah Anggota +
                  </Button>
                </div>
                {pickerHelperText && <p className="mt-1 text-xs text-muted">{pickerHelperText}</p>}
                {touched && errors.members && <p className="mt-1 text-xs text-pink">{errors.members}</p>}

                <div className="mt-3 overflow-hidden rounded-xl border border-soft-gray-dark">
                  {members.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted">Belum ada anggota mahasiswa.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-purple/5">
                        <tr>
                          <th className="px-4 py-2 font-medium text-navy">NIM</th>
                          <th className="px-4 py-2 font-medium text-navy">Nama Mahasiswa</th>
                          <th className="px-4 py-2 text-right font-medium text-navy">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-soft-gray-dark">
                        {members.map((member) => (
                          <tr key={member.id}>
                            <td className="px-4 py-2 text-muted">{member.nim}</td>
                            <td className="px-4 py-2 text-navy">{member.name}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.id)}
                                className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                                aria-label={`Hapus ${member.name}`}
                              >
                                <Trash2 size={16} strokeWidth={2} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Textarea
                  label="Catatan / Keterangan"
                  id="note"
                  placeholder="Masukkan catatan atau keterangan (opsional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
                  rows={3}
                />
                <span className="self-end text-xs text-muted">
                  {note.length}/{NOTE_MAX_LENGTH}
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {editingId ? "Batal Edit" : "Batal"}
                </Button>
                <Button type="submit" variant="secondary">
                  {editingId ? "Simpan Perubahan" : "Simpan"}
                </Button>
              </div>
            </div>
          </Card>
        </form>

        <div className="min-w-0">
          <Card className="min-w-0 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-navy">Kelompok Tersimpan</h2>

            {!isHydrated ? null : groups.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-navy">Belum ada kelompok</p>
                <p className="mt-1 text-sm text-muted">Kelompok yang disimpan akan muncul di sini.</p>
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-col gap-3">
                  {paginatedGroups.map((group) => (
                    <div key={group.id} className="min-w-0 rounded-xl border border-soft-gray-dark p-4">
                      <div className="flex items-start gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                          <UsersIcon size={16} strokeWidth={2} />
                        </span>
                        <p className="min-w-0 truncate text-sm font-semibold text-navy">{group.name}</p>
                      </div>
                      <dl className="mt-3 flex flex-col gap-1 text-xs text-muted">
                        <div className="flex gap-1">
                          <dt className="shrink-0">Prodi:</dt>
                          <dd className="min-w-0 truncate text-navy">{group.studyProgram}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="shrink-0">Kelas:</dt>
                          <dd className="text-navy">{group.className}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="shrink-0">UMKM:</dt>
                          <dd className="min-w-0 truncate text-navy">{group.umkmName}</dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="shrink-0">Anggota:</dt>
                          <dd className="text-navy">{group.members.length} Mahasiswa</dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(group)}>
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeletingGroup(group)}
                          className="inline-flex items-center rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-soft-gray-dark pt-4 text-sm">
                  <span className="text-muted">Page {String(currentPage).padStart(2, "0")}</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <StudentPickerModal
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        students={availableStudentsForPicker}
        takenStudentIds={takenStudentIds}
        remainingSlots={MAX_MEMBERS - members.length}
        onConfirm={handleAddMembers}
      />

      <Modal
        open={deletingGroup !== null}
        onClose={() => setDeletingGroup(null)}
        title="Hapus Kelompok?"
        maxWidthClassName="max-w-md"
      >
        <p className="text-sm text-muted">
          Kelompok dan relasinya akan dihapus dari daftar bimbingan. Data mahasiswa tidak ikut terhapus.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setDeletingGroup(null)}>
            Batal
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirmDelete}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
