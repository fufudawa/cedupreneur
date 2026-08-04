"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, FileUploadBox } from "@/components/shared";
import { Card, Input, Textarea, Select, Button } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 1000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
const ACCEPT_ATTR = ".pdf,.doc,.docx,.ppt,.pptx";
const FILE_MATERI_BUCKET = "project-materi";

function todayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

interface SelectOption {
  value: string;
  label: string;
}

interface KelasRow {
  id: string;
  nama_kelas: string | null;
  semester: string | null;
  tahun_ajaran: string | null;
  mata_kuliah: { nama_mk: string | null } | null;
}

export default function TambahProjectPage() {
  const router = useRouter();

  const [dosenId, setDosenId] = useState<string | null>(null);
  const [kelasOptions, setKelasOptions] = useState<SelectOption[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState("");
  const [umkmOptions, setUmkmOptions] = useState<SelectOption[]>([]);
  const [selectedUmkmId, setSelectedUmkmId] = useState("");
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const today = todayIsoDate();

  // Dosen bisa mengampu lebih dari satu kelas (mis. beberapa kelas paralel
  // seperti RJ24D/RJ24E), jadi kelas & UMKM mitra dipilih manual lewat
  // dropdown, bukan ditebak otomatis — sebelumnya form ini menolak submit
  // sama sekali kalau dosen punya >1 kelas.
  useEffect(() => {
    let isMounted = true;

    async function loadKelasOptions() {
      try {
        const profile = await getCurrentProfile();
        const { data: dosenRow, error: dosenError } = await supabase
          .from("dosen")
          .select("id")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (dosenError) throw dosenError;
        if (!dosenRow) throw new Error("Data dosen untuk akun ini tidak ditemukan.");

        const resolvedDosenId = dosenRow.id as string;

        const { data: kelasRows, error: kelasError } = await supabase
          .from("kelas")
          .select("id, nama_kelas, semester, tahun_ajaran, mata_kuliah ( nama_mk )")
          .eq("dosen_id", resolvedDosenId)
          .order("created_at", { ascending: false });
        if (kelasError) throw kelasError;

        const rows = (kelasRows ?? []) as unknown as KelasRow[];
        if (isMounted) {
          setDosenId(resolvedDosenId);
          if (rows.length === 0) {
            setOptionsError("Anda belum memiliki kelas yang terdaftar. Hubungi admin untuk menambahkan kelas.");
          } else {
            setKelasOptions(
              rows.map((k) => ({
                value: k.id,
                label: `${k.nama_kelas ?? "-"} — ${k.mata_kuliah?.nama_mk ?? "-"} — ${k.semester ?? "-"} ${k.tahun_ajaran ?? ""}`.trim(),
              }))
            );
            setSelectedKelasId(rows[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load kelas for project form (cek RLS SELECT pada tabel kelas):", error);
        if (isMounted) setOptionsError("Gagal memuat daftar kelas. Silakan muat ulang halaman.");
      } finally {
        if (isMounted) setIsLoadingOptions(false);
      }
    }

    loadKelasOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUmkmOptions() {
      if (selectedKelasId === "") {
        setUmkmOptions([]);
        setSelectedUmkmId("");
        return;
      }

      try {
        const { data: kelasUmkmRows, error: kelasUmkmError } = await supabase
          .from("kelas_umkm")
          .select("umkm_id, umkm ( nama_usaha )")
          .eq("kelas_id", selectedKelasId);
        if (kelasUmkmError) throw kelasUmkmError;

        const rows = (kelasUmkmRows ?? []) as unknown as {
          umkm_id: string;
          umkm: { nama_usaha: string | null } | null;
        }[];

        if (isMounted) {
          const options = rows.map((r) => ({ value: r.umkm_id, label: r.umkm?.nama_usaha ?? "(Tanpa nama)" }));
          setUmkmOptions(options);
          setSelectedUmkmId(options.length === 1 ? options[0].value : "");
        }
      } catch (error) {
        console.error("Failed to load umkm mitra for selected kelas (cek RLS SELECT pada tabel kelas_umkm):", error);
        if (isMounted) {
          setUmkmOptions([]);
          setSelectedUmkmId("");
        }
      }
    }

    loadUmkmOptions();

    return () => {
      isMounted = false;
    };
  }, [selectedKelasId]);

  const errors = {
    kelas: selectedKelasId === "" ? "Kelas wajib dipilih." : null,
    umkm: selectedUmkmId === "" ? "UMKM mitra wajib dipilih." : null,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (!isValid || !dosenId) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const insertPayload = {
        judul_project: title.trim(),
        deskripsi: description.trim(),
        deadline,
        status: "draft",
        kelas_id: selectedKelasId,
        umkm_id: selectedUmkmId,
        created_by: dosenId,
      };

      const { data: insertedProject, error: insertError } = await supabase
        .from("project")
        .insert(insertPayload)
        .select("id")
        .single();
      if (insertError) throw insertError;

      if (file) {
        try {
          const path = `${insertedProject.id}/${file.name}`;
          const { error: uploadError } = await supabase.storage.from(FILE_MATERI_BUCKET).upload(path, file);
          if (uploadError) throw uploadError;

          const { error: fileUrlError } = await supabase
            .from("project")
            .update({ file_url: path })
            .eq("id", insertedProject.id as string);
          if (fileUrlError) throw fileUrlError;
        } catch (fileError) {
          console.error("Project created but file materi upload failed:", fileError);
        }
      }

      setIsSubmitting(false);
      setJustSaved(true);
    } catch (error) {
      console.error("Failed to create project", error);
      setSubmitError("Gagal menyimpan project. Silakan coba lagi.");
      setIsSubmitting(false);
    }
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
            {optionsError && !isLoadingOptions && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600">{optionsError}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Select
                label="Pilih Kelas"
                id="kelas"
                options={[{ value: "", label: "Pilih kelas..." }, ...kelasOptions]}
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                disabled={isLoadingOptions || kelasOptions.length === 0}
                required
              />
              {touched && errors.kelas && <p className="text-xs text-pink">{errors.kelas}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Select
                label="UMKM Mitra"
                id="umkm"
                options={[{ value: "", label: "Pilih UMKM mitra..." }, ...umkmOptions]}
                value={selectedUmkmId}
                onChange={(e) => setSelectedUmkmId(e.target.value)}
                disabled={selectedKelasId === "" || umkmOptions.length === 0}
                required
              />
              {selectedKelasId !== "" && umkmOptions.length === 0 && (
                <p className="text-xs text-muted">Kelas ini belum terhubung dengan UMKM mitra. Hubungi admin.</p>
              )}
              {touched && errors.umkm && <p className="text-xs text-pink">{errors.umkm}</p>}
            </div>

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

            {submitError && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600">{submitError}</p>
            )}

            <div className="flex justify-end gap-3">
              <Link href="/dosen/project">
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Batal
                </Button>
              </Link>
              <Button type="submit" variant="secondary" disabled={isSubmitting}>
                Simpan Project
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
