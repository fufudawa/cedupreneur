"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Card, Input, Textarea, Button } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";

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
  });

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
          .select("id, nama_usaha, sektor_usaha, alamat, deskripsi_usaha, kontak")
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
          });
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
      const { error } = await supabase
        .from("umkm")
        .update({
          nama_usaha: form.namaUsaha.trim(),
          sektor_usaha: form.sektorUsaha.trim(),
          alamat: form.alamat.trim(),
          deskripsi_usaha: form.deskripsiUsaha.trim() || null,
          kontak: form.kontak.trim() || null,
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

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader title="Edit Profile" description="Perbarui informasi dan profil usaha Anda." />

      <form onSubmit={handleSubmit}>
        <Card className="rounded-2xl p-6">
          <div className="flex flex-col gap-5">
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
