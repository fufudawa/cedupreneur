"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, FileUploadBox } from "@/components/shared";
import { Card, Input, Textarea, Button } from "@/components/ui";
import { useDosenProjectMilestones } from "@/lib/useDosenProjectMilestones";
import { createMilestoneId, type ProjectMilestone } from "@/lib/dosenProjectMilestoneStorage";

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 1000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
const ACCEPT_ATTR = ".pdf,.doc,.docx,.ppt,.pptx";

function todayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function TambahProjectPage() {
  const router = useRouter();
  const { milestones, addMilestone } = useDosenProjectMilestones();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const today = todayIsoDate();

  const errors = {
    title: title.trim() === "" ? "Judul project wajib diisi." : null,
    description:
      description.trim() === ""
        ? "Deskripsi project wajib diisi."
        : description.trim().length < DESCRIPTION_MIN_LENGTH
          ? `Deskripsi minimal ${DESCRIPTION_MIN_LENGTH} karakter.`
          : null,
    deadline:
      deadline === ""
        ? "Deadline wajib dipilih."
        : deadline < today
          ? "Deadline tidak boleh berada sebelum tanggal dibuat."
          : null,
  };
  const isValid = Object.values(errors).every((message) => message === null);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => router.push("/dosen/project"), 900);
    return () => clearTimeout(timer);
  }, [justSaved, router]);

  const saveMilestone = (materialFile: ProjectMilestone["materialFile"]) => {
    const milestone: ProjectMilestone = {
      id: createMilestoneId(title.trim(), milestones),
      title: title.trim(),
      description: description.trim(),
      createdAt: today,
      deadline,
      materialFile,
      status: "todo",
    };
    addMilestone(milestone);
    setJustSaved(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    if (!file) {
      saveMilestone(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      saveMilestone({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <PageHeader
        title="Add Project"
        description="Buat milestone/tahapan project baru untuk kelompok bimbingan Anda."
      />

      <form onSubmit={handleSubmit}>
        <Card className="rounded-2xl p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Input
                label="Judul Project"
                id="title"
                placeholder="Masukkan judul project Anda"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))}
                maxLength={TITLE_MAX_LENGTH}
                required
              />
              <div className="flex items-center justify-between gap-2">
                {touched && errors.title ? (
                  <p className="text-xs text-pink">{errors.title}</p>
                ) : (
                  <span />
                )}
                <span className="shrink-0 text-xs text-muted">
                  {title.length}/{TITLE_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Add File</span>
              <FileUploadBox
                value={file ? { name: file.name, size: file.size } : null}
                onSelect={setFile}
                onRemove={() => setFile(null)}
                accept={ACCEPT_ATTR}
                extensions={ACCEPTED_EXTENSIONS}
                maxSizeBytes={MAX_FILE_SIZE}
                title="+ Upload"
                helperText="Drag & drop file di sini atau klik untuk memilih file."
                helperSubtext="Maks. 20MB (PDF, DOCX, PPTX)"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Textarea
                label="Deskripsi"
                id="description"
                placeholder="Masukkan ketentuan atau deskripsi project"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                maxLength={DESCRIPTION_MAX_LENGTH}
                rows={4}
              />
              <div className="flex items-center justify-between gap-2">
                {touched && errors.description ? (
                  <p className="text-xs text-pink">{errors.description}</p>
                ) : (
                  <span />
                )}
                <span className="shrink-0 text-xs text-muted">
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:w-64">
              <Input
                label="Deadline"
                id="deadline"
                type="date"
                min={today}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
              {touched && errors.deadline && <p className="text-xs text-pink">{errors.deadline}</p>}
            </div>

            {justSaved && (
              <p className="rounded-xl bg-green-100 px-3.5 py-2 text-sm font-medium text-green-700">
                Project berhasil ditambahkan.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Link href="/dosen/project">
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </Link>
              <Button type="submit" variant="secondary">
                Simpan Project
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
