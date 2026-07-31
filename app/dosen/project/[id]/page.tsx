"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Modal } from "@/components/shared";
import { Card, Badge, Button, Input, Textarea } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";

type ProjectStatus = "draft" | "berjalan" | "selesai";

const STATUS_BADGE: Record<ProjectStatus, { label: string; variant: "green" | "orange" | "blue" }> = {
  selesai: { label: "Selesai", variant: "green" },
  berjalan: { label: "Berjalan", variant: "orange" },
  draft: { label: "Belum Dimulai", variant: "blue" },
};

const DESCRIPTION_MIN_LENGTH = 10;

interface ProjectDetail {
  id: string;
  judulProject: string;
  deskripsi: string;
  status: ProjectStatus | null;
  createdAt: string | null;
  deadline: string | null;
  createdBy: string;
  fileUrl: string | null;
}

const FILE_MATERI_BUCKET = "project-materi";
const FILE_MATERI_SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

function fileNameFromPath(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DetailProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftDeadline, setDraftDeadline] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [fileSignedUrl, setFileSignedUrl] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      try {
        // Identitas dosen yang login — pola yang sama dengan CREATE (getCurrentProfile -> dosen).
        const profile = await getCurrentProfile();

        const { data: dosenRow, error: dosenError } = await supabase
          .from("dosen")
          .select("id")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (dosenError) throw dosenError;

        const { data, error } = await supabase
          .from("project")
          .select("id, judul_project, deskripsi, status, created_at, deadline, created_by, file_url")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;

        if (!data) {
          if (isMounted) setNotFoundFlag(true);
          return;
        }

        const detail: ProjectDetail = {
          id: data.id,
          judulProject: data.judul_project ?? "-",
          deskripsi: data.deskripsi ?? "",
          status: data.status,
          createdAt: data.created_at,
          deadline: data.deadline,
          createdBy: data.created_by,
          fileUrl: data.file_url,
        };

        if (isMounted) {
          setProject(detail);
          setIsOwner(!!dosenRow && dosenRow.id === data.created_by);
          setDraftTitle(detail.judulProject);
          setDraftDescription(detail.deskripsi);
          setDraftDeadline(detail.deadline ?? "");
        }

        if (detail.fileUrl) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from(FILE_MATERI_BUCKET)
            .createSignedUrl(detail.fileUrl, FILE_MATERI_SIGNED_URL_EXPIRY_SECONDS);
          if (signedError) {
            console.error("Failed to create signed URL for file materi:", signedError);
          } else if (isMounted) {
            setFileSignedUrl(signedData.signedUrl);
          }
        }
      } catch (error) {
        console.error("Failed to load project detail", error);
        if (isMounted) setNotFoundFlag(true);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!isHydrated) {
    return null;
  }
  if (notFoundFlag || !project) {
    notFound();
  }

  const badge = project.status ? STATUS_BADGE[project.status] : null;

  const errors = {
    title: draftTitle.trim() === "" ? "Judul project wajib diisi." : null,
    description:
      draftDescription.trim() === ""
        ? "Deskripsi project wajib diisi."
        : draftDescription.trim().length < DESCRIPTION_MIN_LENGTH
          ? `Deskripsi minimal ${DESCRIPTION_MIN_LENGTH} karakter.`
          : null,
    deadline: draftDeadline === "" ? "Deadline wajib dipilih." : null,
  };
  const isValid = Object.values(errors).every((message) => message === null);

  function handleStartEdit() {
    if (!project) return;
    setDraftTitle(project.judulProject);
    setDraftDescription(project.deskripsi);
    setDraftDeadline(project.deadline ?? "");
    setTouched(false);
    setSaveError(null);
    setSaveMessage(null);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setTouched(false);
    setSaveError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setSaveError(null);
    if (!isValid) return;
    if (isSaving || !project) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("project")
        .update({
          judul_project: draftTitle.trim(),
          deskripsi: draftDescription.trim(),
          deadline: draftDeadline,
        })
        .eq("id", project.id);
      if (error) throw error;

      setProject((prev) =>
        prev
          ? {
              ...prev,
              judulProject: draftTitle.trim(),
              deskripsi: draftDescription.trim(),
              deadline: draftDeadline,
            }
          : prev
      );
      setIsSaving(false);
      setIsEditing(false);
      setSaveMessage("Project berhasil diperbarui.");
    } catch (error) {
      console.error("Failed to update project", error);
      setSaveError("Gagal menyimpan perubahan. Silakan coba lagi.");
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!project || isDeleting) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      // Identitas dosen yang login — pola yang sama dengan READ/CREATE/UPDATE.
      const profile = await getCurrentProfile();

      const { data: dosenRow, error: dosenError } = await supabase
        .from("dosen")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (dosenError) throw dosenError;
      if (!dosenRow || dosenRow.id !== project.createdBy) {
        throw new Error("Anda tidak memiliki izin untuk menghapus project ini.");
      }

      const { error } = await supabase.from("project").delete().eq("id", project.id);
      if (error) throw error;

      router.push("/dosen/project");
    } catch (error) {
      console.error("Failed to delete project", error);
      setDeleteError("Gagal menghapus project. Silakan coba lagi.");
      setIsDeleting(false);
    }
  }

  async function handleAdvanceStatus(nextStatus: ProjectStatus) {
    if (!project || isUpdatingStatus) return;

    setStatusError(null);
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase.from("project").update({ status: nextStatus }).eq("id", project.id);
      if (error) throw error;

      setProject((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (error) {
      console.error("Failed to update project status", error);
      setStatusError("Gagal mengubah status project. Silakan coba lagi.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !project) return;

    setFileError(null);
    setIsUploadingFile(true);
    try {
      const path = `${project.id}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(FILE_MATERI_BUCKET)
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.from("project").update({ file_url: path }).eq("id", project.id);
      if (updateError) throw updateError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from(FILE_MATERI_BUCKET)
        .createSignedUrl(path, FILE_MATERI_SIGNED_URL_EXPIRY_SECONDS);
      if (signedError) throw signedError;

      setProject((prev) => (prev ? { ...prev, fileUrl: path } : prev));
      setFileSignedUrl(signedData.signedUrl);
    } catch (error) {
      console.error("Failed to upload file materi (cek RLS storage.objects untuk bucket project-materi):", error);
      setFileError("Gagal mengunggah file. Silakan coba lagi.");
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function handleRemoveFile() {
    if (!project || !project.fileUrl) return;

    setFileError(null);
    setIsUploadingFile(true);
    try {
      const { error: removeError } = await supabase.storage.from(FILE_MATERI_BUCKET).remove([project.fileUrl]);
      if (removeError) throw removeError;

      const { error: updateError } = await supabase
        .from("project")
        .update({ file_url: null })
        .eq("id", project.id);
      if (updateError) throw updateError;

      setProject((prev) => (prev ? { ...prev, fileUrl: null } : prev));
      setFileSignedUrl(null);
    } catch (error) {
      console.error("Failed to remove file materi:", error);
      setFileError("Gagal menghapus file. Silakan coba lagi.");
    } finally {
      setIsUploadingFile(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Detail Project"
        actions={
          <div className="flex flex-wrap gap-3">
            {isOwner && !isEditing && (
              <Button variant="secondary" onClick={handleStartEdit}>
                Edit
              </Button>
            )}
            {isOwner && !isEditing && (
              <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
                Hapus
              </Button>
            )}
            <Link href="/dosen/project">
              <Button variant="outline">
                <ArrowLeft size={16} strokeWidth={2} />
                Kembali ke Project
              </Button>
            </Link>
          </div>
        }
      />

      {saveMessage && (
        <p className="mb-4 rounded-xl bg-green-100 px-3.5 py-2 text-sm font-medium text-green-700">{saveMessage}</p>
      )}

      <Card className="min-w-0 rounded-2xl p-6">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Input
                label="Judul Project"
                id="edit-title"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
              {touched && errors.title && <p className="text-xs text-pink">{errors.title}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Textarea
                label="Deskripsi"
                id="edit-description"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                rows={4}
              />
              {touched && errors.description && <p className="text-xs text-pink">{errors.description}</p>}
            </div>

            <div className="flex flex-col gap-1.5 sm:w-64">
              <Input
                label="Deadline"
                id="edit-deadline"
                type="date"
                value={draftDeadline}
                onChange={(e) => setDraftDeadline(e.target.value)}
              />
              {touched && errors.deadline && <p className="text-xs text-pink">{errors.deadline}</p>}
            </div>

            {saveError && <p className="text-sm font-medium text-red-600">{saveError}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                Batal Edit
              </Button>
              <Button type="submit" variant="secondary" disabled={isSaving}>
                Simpan
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-navy">{project.judulProject}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                {isOwner && project.status === "draft" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isUpdatingStatus}
                    onClick={() => handleAdvanceStatus("berjalan")}
                  >
                    {isUpdatingStatus ? "Menyimpan..." : "Mulai Project"}
                  </Button>
                )}
                {isOwner && project.status === "berjalan" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isUpdatingStatus}
                    onClick={() => handleAdvanceStatus("selesai")}
                  >
                    {isUpdatingStatus ? "Menyimpan..." : "Tandai Selesai"}
                  </Button>
                )}
              </div>
            </div>
            {statusError && <p className="mt-1 text-xs font-medium text-red-600">{statusError}</p>}

            <p className="mt-3 text-sm leading-relaxed text-navy">{project.deskripsi || "-"}</p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Tanggal Dibuat</p>
                <p className="mt-1 text-sm font-medium text-navy">
                  {project.createdAt ? formatDate(project.createdAt) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Deadline</p>
                <p className="mt-1 text-sm font-medium text-navy">
                  {project.deadline ? formatDate(project.deadline) : "-"}
                </p>
              </div>
            </div>

            <div className="my-6 h-px bg-soft-gray-dark" />

            <p className="text-sm font-semibold text-navy">File Materi</p>
            {project.fileUrl ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {fileSignedUrl ? (
                  <a href={fileSignedUrl} target="_blank" rel="noopener noreferrer">
                    <Button type="button" variant="outline" size="sm">
                      Buka File
                    </Button>
                  </a>
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled>
                    Buka File
                  </Button>
                )}
                <span className="text-sm text-muted">{fileNameFromPath(project.fileUrl)}</span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isUploadingFile}
                    className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Hapus File
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Tidak ada file materi.</p>
            )}

            {isOwner && (
              <div className="mt-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-soft-gray-dark bg-white px-3.5 py-2 text-sm font-medium text-navy transition-colors hover:bg-soft-gray">
                  {isUploadingFile ? "Mengunggah..." : project.fileUrl ? "Ganti File" : "Unggah File Materi"}
                  <input type="file" className="hidden" onChange={handleUploadFile} disabled={isUploadingFile} />
                </label>
                {fileError && <p className="mt-1.5 text-xs font-medium text-red-600">{fileError}</p>}
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Hapus Project?"
        maxWidthClassName="max-w-md"
      >
        <p className="text-sm text-muted">
          Project ini akan dihapus secara permanen dan tidak dapat dikembalikan.
        </p>
        {deleteError && <p className="mt-3 text-sm font-medium text-red-600">{deleteError}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
