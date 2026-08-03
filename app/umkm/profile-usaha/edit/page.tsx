"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Textarea, Button } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";

const FOTO_BUCKET = "umkm-foto";
const MAX_FOTO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FOTO_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export default function EditProfileUsahaPage() {
  const router = useRouter();

  const [umkmId, setUmkmId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const [form, setForm] = useState({
    namaUsaha: "",
    sektorUsaha: "",
    alamat: "",
    deskripsiUsaha: "",
    kontak: "",
    swotStrength: "",
    swotWeakness: "",
    swotOpportunity: "",
    swotThreat: "",
  });

  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoError, setFotoError] = useState("");

  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const currentProfile = await getCurrentProfile();
        const { data, error } = await supabase
          .from("umkm")
          .select(
            "id, nama_usaha, sektor_usaha, alamat, deskripsi_usaha, kontak, foto_url, swot_strength, swot_weakness, swot_opportunity, swot_threat"
          )
          .eq("profile_id", currentProfile.id)
          .maybeSingle();
        if (error) throw error;

        if (isMounted && data) {
          setUmkmId(data.id as string);
          setForm({
            namaUsaha: (data.nama_usaha as string | null) ?? "",
            sektorUsaha: (data.sektor_usaha as string | null) ?? "",
            alamat: (data.alamat as string | null) ?? "",
            deskripsiUsaha: (data.deskripsi_usaha as string | null) ?? "",
            kontak: (data.kontak as string | null) ?? "",
            swotStrength: (data.swot_strength as string | null) ?? "",
            swotWeakness: (data.swot_weakness as string | null) ?? "",
            swotOpportunity: (data.swot_opportunity as string | null) ?? "",
            swotThreat: (data.swot_threat as string | null) ?? "",
          });
          const existingFotoPath = data.foto_url as string | null;
          setFotoPath(existingFotoPath);
          if (existingFotoPath) {
            setFotoPreviewUrl(supabase.storage.from(FOTO_BUCKET).getPublicUrl(existingFotoPath).data.publicUrl);
          }
        }
      } catch (error) {
        console.error("Failed to load umkm profile for edit:", error);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => router.push("/umkm/profile-usaha"), 900);
    return () => clearTimeout(timer);
  }, [justSaved, router]);

  const errors = {
    namaUsaha: form.namaUsaha.trim() === "" ? "Nama usaha wajib diisi." : null,
    sektorUsaha: form.sektorUsaha.trim() === "" ? "Sektor wajib diisi." : null,
    alamat: form.alamat.trim() === "" ? "Alamat wajib diisi." : null,
  };
  const isValid = Object.values(errors).every((message) => message === null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setSaveError("");
    if (!isValid || !umkmId || isSaving) return;

    setIsSaving(true);
    try {
      let newFotoPath = fotoPath;
      if (fotoFile) {
        const extension = fotoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${umkmId}/cover.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(FOTO_BUCKET)
          .upload(path, fotoFile, { upsert: true });
        if (uploadError) throw uploadError;
        newFotoPath = path;
      }

      const { error } = await supabase
        .from("umkm")
        .update({
          nama_usaha: form.namaUsaha.trim(),
          sektor_usaha: form.sektorUsaha.trim(),
          alamat: form.alamat.trim(),
          deskripsi_usaha: form.deskripsiUsaha.trim() || null,
          kontak: form.kontak.trim() || null,
          foto_url: newFotoPath,
          swot_strength: form.swotStrength.trim() || null,
          swot_weakness: form.swotWeakness.trim() || null,
          swot_opportunity: form.swotOpportunity.trim() || null,
          swot_threat: form.swotThreat.trim() || null,
        })
        .eq("id", umkmId);
      if (error) throw error;
      setJustSaved(true);
    } catch (error) {
      console.error("Failed to save umkm profile:", error);
      setSaveError("Gagal menyimpan profil usaha. Silakan coba lagi.");
      setIsSaving(false);
    }
  }

  function handleSelectFoto(file: File) {
    setFotoError("");
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED_FOTO_EXTENSIONS.includes(extension)) {
      setFotoError("Format foto tidak didukung. Gunakan PNG, JPG, atau WEBP.");
      return;
    }
    if (file.size > MAX_FOTO_SIZE) {
      setFotoError("Ukuran foto maksimal 5MB.");
      return;
    }
    setFotoFile(file);
    setFotoPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveFoto() {
    setFotoFile(null);
    setFotoPreviewUrl(null);
    setFotoPath(null);
    setFotoError("");
  }

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader title="Edit Profile" description="Perbarui informasi dan profil usaha Anda." />

      <form onSubmit={handleSubmit}>
        <Card className="rounded-2xl p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Foto UMKM (Cover)</span>
              {fotoPreviewUrl ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative h-32 w-full overflow-hidden rounded-xl border border-soft-gray-dark sm:w-56">
                    <Image src={fotoPreviewUrl} alt="Foto UMKM" fill className="object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-soft-gray-dark bg-white px-3 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-soft-gray">
                      <Upload size={14} strokeWidth={2} />
                      Ganti Foto
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSelectFoto(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveFoto}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-soft-gray-dark bg-white px-3 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-soft-gray"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-purple/40 bg-purple/5 px-4 py-8 text-center transition-colors hover:border-purple">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-purple shadow-sm">
                    <Upload size={20} strokeWidth={2} />
                  </span>
                  <p className="text-base font-semibold text-navy">+ Upload Foto</p>
                  <p className="text-xs text-muted">PNG, JPG, atau WEBP (Maks. 5MB)</p>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSelectFoto(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {fotoError && <p className="text-xs text-pink">{fotoError}</p>}
            </div>

            <Input
              label="Nama Usaha"
              id="namaUsaha"
              value={form.namaUsaha}
              onChange={(e) => setForm((f) => ({ ...f, namaUsaha: e.target.value }))}
              required
            />
            {touched && errors.namaUsaha && <p className="-mt-3 text-xs text-pink">{errors.namaUsaha}</p>}

            <Input
              label="Sektor Usaha"
              id="sektorUsaha"
              value={form.sektorUsaha}
              onChange={(e) => setForm((f) => ({ ...f, sektorUsaha: e.target.value }))}
              required
            />
            {touched && errors.sektorUsaha && <p className="-mt-3 text-xs text-pink">{errors.sektorUsaha}</p>}

            <Input
              label="Kontak"
              id="kontak"
              value={form.kontak}
              onChange={(e) => setForm((f) => ({ ...f, kontak: e.target.value }))}
            />

            <div className="flex flex-col gap-1.5">
              <Textarea
                label="Alamat UMKM"
                id="alamat"
                rows={3}
                value={form.alamat}
                onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
                required
              />
              {touched && errors.alamat && <p className="text-xs text-pink">{errors.alamat}</p>}
            </div>

            <Textarea
              label="Deskripsi Usaha"
              id="deskripsiUsaha"
              rows={4}
              value={form.deskripsiUsaha}
              onChange={(e) => setForm((f) => ({ ...f, deskripsiUsaha: e.target.value }))}
              className="resize-none"
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">SWOT Analisis</span>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Textarea
                  label="Strength (Kekuatan)"
                  id="swotStrength"
                  rows={3}
                  value={form.swotStrength}
                  onChange={(e) => setForm((f) => ({ ...f, swotStrength: e.target.value }))}
                  className="resize-none"
                />
                <Textarea
                  label="Weakness (Kelemahan)"
                  id="swotWeakness"
                  rows={3}
                  value={form.swotWeakness}
                  onChange={(e) => setForm((f) => ({ ...f, swotWeakness: e.target.value }))}
                  className="resize-none"
                />
                <Textarea
                  label="Opportunity (Peluang)"
                  id="swotOpportunity"
                  rows={3}
                  value={form.swotOpportunity}
                  onChange={(e) => setForm((f) => ({ ...f, swotOpportunity: e.target.value }))}
                  className="resize-none"
                />
                <Textarea
                  label="Threat (Ancaman)"
                  id="swotThreat"
                  rows={3}
                  value={form.swotThreat}
                  onChange={(e) => setForm((f) => ({ ...f, swotThreat: e.target.value }))}
                  className="resize-none"
                />
              </div>
            </div>

            {saveError && <p className="text-sm font-medium text-pink">{saveError}</p>}
            {justSaved && (
              <p className="rounded-xl bg-green-100 px-3.5 py-2 text-sm font-medium text-green-700">
                Profile usaha berhasil diperbarui
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Link href="/umkm/profile-usaha">
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </Link>
              <Button type="submit" variant="secondary" disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
