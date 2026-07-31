"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Users as UsersIcon } from "lucide-react";
import { PageHeader, StudentPickerModal, Modal } from "@/components/shared";
import { Card, Input, Select, Textarea, Button } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";
import {
  useDosenKelompokBimbingan,
  type KelompokBimbingan,
  type KelompokBimbinganMember,
} from "@/lib/useDosenKelompokBimbingan";
import type { StudentOption } from "@/lib/dosenGroupsStorage";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 80;
const NOTE_MAX_LENGTH = 500;
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 5;
const PAGE_SIZE = 3;

interface SelectOption {
  value: string;
  label: string;
}

export default function TambahKelompokPage() {
  const router = useRouter();
  const { groups, isHydrated, refetch } = useDosenKelompokBimbingan();

  // Data pendukung form (prodi + nama mahasiswa nyata, daftar kelas nyata,
  // daftar UMKM nyata) — diambil sekali dari Supabase, menggantikan
  // STUDENTS/STUDY_PROGRAMS/CLASSES_BY_STUDY_PROGRAM/UMKM_OPTIONS dummy.
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studyProgramOptions, setStudyProgramOptions] = useState<SelectOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<SelectOption[]>([]);
  // Kelas & UMKM Mitra bukan lagi dropdown manual — keduanya diturunkan
  // otomatis dari project yang dipilih (project.kelas_id / project.umkm_id),
  // supaya nilai yang tampil di form selalu konsisten dengan data yang benar-
  // benar tersimpan (kelompok sendiri tidak punya kolom kelas/umkm).
  const [projectDetails, setProjectDetails] = useState<Record<string, { className: string; umkmName: string }>>({});
  const [supportDataHydrated, setSupportDataHydrated] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGroupSnapshot, setEditingGroupSnapshot] = useState<KelompokBimbingan | null>(null);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [studyProgram, setStudyProgram] = useState("");
  const [members, setMembers] = useState<KelompokBimbinganMember[]>([]);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<KelompokBimbingan | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    async function loadSupportData() {
      // Identitas dosen yang login — dipakai untuk scope kelas & UMKM ke milik
      // dosen ini, bukan menarik seluruh kelas/UMKM di database.
      let dosenId: string | null = null;
      try {
        const profile = await getCurrentProfile();
        const { data: dosenRow, error: dosenError } = await supabase
          .from("dosen")
          .select("id")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (dosenError) throw dosenError;
        dosenId = (dosenRow?.id as string | undefined) ?? null;
      } catch (error) {
        console.error("Failed to resolve dosen identity for kelompok form", error);
      }

      // Setiap query dijalankan & ditangani independen (bukan satu Promise.all
      // bersama) supaya SATU tabel yang gagal (mis. diblokir RLS) tidak ikut
      // mengosongkan dropdown lain yang sebenarnya berhasil.

      try {
        type MahasiswaRow = {
          id: string;
          nim: string | null;
          prodi: string | null;
          profiles: { nama_lengkap: string | null } | null;
        };
        const { data, error } = await supabase
          .from("mahasiswa")
          .select("id, nim, prodi, profiles ( nama_lengkap )");
        if (error) throw error;

        const mahasiswaRows = (data ?? []) as unknown as MahasiswaRow[];
        const students: StudentOption[] = mahasiswaRows.map((row) => ({
          id: row.id,
          nim: row.nim ?? "-",
          name: row.profiles?.nama_lengkap ?? "-",
          studyProgram: row.prodi ?? "",
          // Tidak ada tabel kelas_mahasiswa di skema — mahasiswa tidak terhubung
          // ke satu kelas tertentu, jadi field ini dikosongkan (lihat catatan
          // filter kelas di bawah availableStudentsForPicker).
          className: "",
        }));

        const uniqueProdi = Array.from(new Set(students.map((s) => s.studyProgram).filter(Boolean)));
        if (isMounted) {
          setStudentOptions(students);
          setStudyProgramOptions([
            { value: "", label: "Pilih program studi" },
            ...uniqueProdi.map((p) => ({ value: p, label: p })),
          ]);
        }
      } catch (error) {
        console.error("Failed to load mahasiswa for kelompok form (cek RLS SELECT pada tabel mahasiswa):", error);
        if (isMounted) {
          setStudentOptions([]);
          setStudyProgramOptions([{ value: "", label: "Pilih program studi" }]);
        }
      }

      try {
        // Kelas & UMKM Mitra tidak lagi dipilih manual — keduanya diambil
        // langsung dari relasi project.kelas / project.umkm supaya nilai yang
        // ditampilkan selalu akurat sesuai project yang dipilih di form.
        type ProjectRow = {
          id: string;
          judul_project: string | null;
          kelas: { nama_kelas: string | null } | null;
          umkm: { nama_usaha: string | null } | null;
        };
        let query = supabase
          .from("project")
          .select("id, judul_project, kelas ( nama_kelas ), umkm ( nama_usaha )")
          .order("created_at", { ascending: false });
        if (dosenId) query = query.eq("created_by", dosenId);
        const { data, error } = await query;
        if (error) throw error;

        const projectRows = (data ?? []) as unknown as ProjectRow[];
        if (isMounted) {
          setProjectOptions(projectRows.map((p) => ({ value: p.id, label: p.judul_project ?? "(Tanpa judul)" })));
          setProjectDetails(
            Object.fromEntries(
              projectRows.map((p) => [
                p.id,
                { className: p.kelas?.nama_kelas ?? "-", umkmName: p.umkm?.nama_usaha ?? "-" },
              ])
            )
          );
          if (projectRows.length > 0) {
            setProjectId((current) => (current === "" ? projectRows[0].id : current));
          }
        }
      } catch (error) {
        console.error("Failed to load project for kelompok form (cek RLS SELECT pada tabel project):", error);
        if (isMounted) {
          setProjectOptions([]);
          setProjectDetails({});
        }
      }

      if (isMounted) setSupportDataHydrated(true);
    }

    loadSupportData();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeGroupsExcludingEditing = useMemo(
    () => groups.filter((group) => group.status === "aktif" && group.id !== editingId),
    [groups, editingId]
  );

  const takenStudentIds = useMemo(
    () => new Set(activeGroupsExcludingEditing.flatMap((group) => group.members.map((m) => m.id))),
    [activeGroupsExcludingEditing]
  );

  // Tidak ada tabel kelas_mahasiswa nyata untuk menghubungkan mahasiswa ke
  // satu kelas tertentu, jadi pemilihan "Kelas" tidak dipakai untuk memfilter
  // (mengikuti pola dropdown inert yang sama seperti "Tahap" di halaman lain)
  // — hanya program studi (kolom nyata mahasiswa.prodi) yang benar-benar memfilter.
  const availableStudentsForPicker = studentOptions.filter(
    (student) => student.studyProgram === studyProgram && !members.some((m) => m.id === student.id)
  );

  // Saat edit, tampilkan kelas/umkm persis seperti yang tercatat untuk
  // kelompok itu (dari hook); saat buat baru, turunkan dari project yang
  // dipilih di dropdown "Pilih Project".
  const derivedProjectInfo =
    editingId && editingGroupSnapshot
      ? { className: editingGroupSnapshot.className, umkmName: editingGroupSnapshot.umkmName }
      : (projectDetails[projectId] ?? { className: "", umkmName: "" });

  const canOpenPicker = studyProgram !== "" && derivedProjectInfo.className !== "" && members.length < MAX_MEMBERS;
  const pickerHelperText =
    studyProgram === "" || derivedProjectInfo.className === ""
      ? "Pilih program studi dan project terlebih dahulu."
      : members.length >= MAX_MEMBERS
        ? "Sudah mencapai maksimal 5 anggota."
        : null;

  const errors = {
    projectId: projectId === "" ? "Project wajib dipilih." : null,
    name:
      name.trim().length < NAME_MIN_LENGTH || name.trim().length > NAME_MAX_LENGTH
        ? "Nama kelompok wajib diisi."
        : null,
    studyProgram: studyProgram === "" ? "Program studi wajib dipilih." : null,
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
    setEditingGroupSnapshot(null);
    setProjectId("");
    setName("");
    setStudyProgram("");
    setMembers([]);
    setNote("");
    setTouched(false);
    setSubmitError(null);
  };

  const handleAddMembers = (selected: { id: string; nim: string; name: string }[]) => {
    setMembers((prev) => [...prev, ...selected.map((s) => ({ id: s.id, nim: s.nim, name: s.name }))]);
    setIsPickerOpen(false);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleEditClick = (group: KelompokBimbingan) => {
    setEditingId(group.id);
    setEditingGroupSnapshot(group);
    setProjectId(group.projectId);
    setName(group.name);
    setStudyProgram(group.studyProgram !== "-" ? group.studyProgram : "");
    setMembers(group.members);
    setNote(group.catatan);
    setTouched(false);
    setSubmitError(null);
  };

  const handleCancel = () => {
    if (editingId) {
      resetForm();
    } else {
      router.push("/dosen/project");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (!isValid) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const profile = await getCurrentProfile();
      const { data: dosenRow, error: dosenError } = await supabase
        .from("dosen")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (dosenError) throw dosenError;
      if (!dosenRow) throw new Error("Data dosen untuk akun ini tidak ditemukan.");

      if (editingId) {
        // UPDATE kelompok + reconcile kelompok_anggota (hapus semua, insert ulang sesuai form).
        const { error: updateError } = await supabase
          .from("kelompok")
          .update({ nama_kelompok: name.trim(), catatan: note.trim() || null })
          .eq("id", editingId);
        if (updateError) throw updateError;

        const { error: deleteAnggotaError } = await supabase
          .from("kelompok_anggota")
          .delete()
          .eq("kelompok_id", editingId);
        if (deleteAnggotaError) throw deleteAnggotaError;

        if (members.length > 0) {
          const { error: insertAnggotaError } = await supabase
            .from("kelompok_anggota")
            .insert(members.map((m) => ({ kelompok_id: editingId, mahasiswa_id: m.id })));
          if (insertAnggotaError) throw insertAnggotaError;
        }

        setToast("Kelompok berhasil diperbarui.");
      } else {
        const { data: insertedKelompok, error: insertError } = await supabase
          .from("kelompok")
          .insert({
            project_id: projectId,
            nama_kelompok: name.trim(),
            status: "aktif",
            catatan: note.trim() || null,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;

        if (members.length > 0) {
          const { error: insertAnggotaError } = await supabase
            .from("kelompok_anggota")
            .insert(members.map((m) => ({ kelompok_id: insertedKelompok.id as string, mahasiswa_id: m.id })));
          if (insertAnggotaError) throw insertAnggotaError;
        }

        setToast("Kelompok berhasil disimpan.");
      }

      await refetch();
      resetForm();
      setIsSubmitting(false);
    } catch (error) {
      console.error("Failed to save kelompok", error);
      setSubmitError("Gagal menyimpan kelompok. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedGroups = groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleConfirmDelete = async () => {
    if (!deletingGroup || isDeleting) return;

    setIsDeleting(true);
    try {
      const { error: deleteAnggotaError } = await supabase
        .from("kelompok_anggota")
        .delete()
        .eq("kelompok_id", deletingGroup.id);
      if (deleteAnggotaError) throw deleteAnggotaError;

      const { error: deleteError } = await supabase.from("kelompok").delete().eq("id", deletingGroup.id);
      if (deleteError) throw deleteError;

      if (editingId === deletingGroup.id) {
        resetForm();
      }
      setDeletingGroup(null);
      setToast("Kelompok berhasil dihapus.");
      await refetch();
    } catch (error) {
      console.error("Failed to delete kelompok", error);
      setToast("Gagal menghapus kelompok. Silakan coba lagi.");
    } finally {
      setIsDeleting(false);
    }
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
                <Select
                  label="Pilih Project"
                  id="projectId"
                  options={[{ value: "", label: "Pilih project" }, ...projectOptions]}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={editingId !== null}
                  required
                />
                {touched && errors.projectId && <p className="text-xs text-pink">{errors.projectId}</p>}
              </div>

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
                    onChange={(e) => setStudyProgram(e.target.value)}
                    required
                  />
                  {touched && errors.studyProgram && (
                    <p className="text-xs text-pink">{errors.studyProgram}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Select
                    label="Kelas"
                    id="className"
                    options={
                      derivedProjectInfo.className
                        ? [{ value: derivedProjectInfo.className, label: derivedProjectInfo.className }]
                        : [{ value: "", label: "-" }]
                    }
                    value={derivedProjectInfo.className}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Select
                  label="UMKM Mitra"
                  id="umkm"
                  options={
                    derivedProjectInfo.umkmName
                      ? [{ value: derivedProjectInfo.umkmName, label: derivedProjectInfo.umkmName }]
                      : [{ value: "", label: "-" }]
                  }
                  value={derivedProjectInfo.umkmName}
                  onChange={() => {}}
                  disabled
                />
              </div>

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

              {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  {editingId ? "Batal Edit" : "Batal"}
                </Button>
                <Button type="submit" variant="secondary" disabled={isSubmitting || !supportDataHydrated}>
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
                          <dt className="shrink-0">Project:</dt>
                          <dd className="min-w-0 truncate text-navy">{group.projectTitle}</dd>
                        </div>
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
          <Button type="button" variant="outline" onClick={() => setDeletingGroup(null)} disabled={isDeleting}>
            Batal
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
