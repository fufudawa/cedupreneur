"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, RefreshCw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Textarea, Button } from "@/components/ui";
import { umkmProfile as defaultProfile } from "@/data/umkmProfile";
import { useUmkmProfile } from "@/lib/useUmkmProfile";
import type { UmkmProfile } from "@/lib/umkmProfileStorage";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const SWOT_FIELDS = [
  { key: "strengths", label: "Strengths" },
  { key: "weaknesses", label: "Weaknesses" },
  { key: "opportunities", label: "Opportunities" },
  { key: "threats", label: "Threats" },
] as const;

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export default function EditProfileUsahaPage() {
  const router = useRouter();
  const { profile, save } = useUmkmProfile(defaultProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSyncedRef = useRef(false);

  const [form, setForm] = useState({
    businessName: profile.businessName,
    ownerName: profile.ownerName,
    establishedYear: String(profile.establishedYear),
    category: profile.category,
    address: profile.address,
  });
  const [swotText, setSwotText] = useState({
    strengths: profile.swot.strengths.join("\n"),
    weaknesses: profile.swot.weaknesses.join("\n"),
    opportunities: profile.swot.opportunities.join("\n"),
    threats: profile.swot.threats.join("\n"),
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile.photoUrl);
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!hasSyncedRef.current && profile.updatedAt !== defaultProfile.updatedAt) {
      hasSyncedRef.current = true;
      setForm({
        businessName: profile.businessName,
        ownerName: profile.ownerName,
        establishedYear: String(profile.establishedYear),
        category: profile.category,
        address: profile.address,
      });
      setSwotText({
        strengths: profile.swot.strengths.join("\n"),
        weaknesses: profile.swot.weaknesses.join("\n"),
        opportunities: profile.swot.opportunities.join("\n"),
        threats: profile.swot.threats.join("\n"),
      });
      setPhotoUrl(profile.photoUrl);
    }
  }, [profile]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => router.push("/umkm/profile-usaha"), 900);
    return () => clearTimeout(timer);
  }, [justSaved, router]);

  const currentYear = new Date().getFullYear();
  const yearNumber = Number(form.establishedYear);
  const isYearValid =
    form.establishedYear.trim() !== "" &&
    Number.isInteger(yearNumber) &&
    yearNumber >= 1900 &&
    yearNumber <= currentYear + 1;

  const swotLines = {
    strengths: parseLines(swotText.strengths),
    weaknesses: parseLines(swotText.weaknesses),
    opportunities: parseLines(swotText.opportunities),
    threats: parseLines(swotText.threats),
  };

  const errors = {
    businessName: form.businessName.trim() === "" ? "Nama usaha wajib diisi." : null,
    ownerName: form.ownerName.trim() === "" ? "Nama pemilik wajib diisi." : null,
    establishedYear: !isYearValid ? "Masukkan tahun yang valid." : null,
    category: form.category.trim() === "" ? "Kategori wajib diisi." : null,
    address: form.address.trim() === "" ? "Alamat wajib diisi." : null,
    strengths: swotLines.strengths.length === 0 ? "Isi minimal satu poin Strengths." : null,
    weaknesses: swotLines.weaknesses.length === 0 ? "Isi minimal satu poin Weaknesses." : null,
    opportunities: swotLines.opportunities.length === 0 ? "Isi minimal satu poin Opportunities." : null,
    threats: swotLines.threats.length === 0 ? "Isi minimal satu poin Threats." : null,
  };
  const isValid = Object.values(errors).every((message) => message === null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Format file harus PNG, JPG, atau WEBP.");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("Ukuran file maksimal 5MB.");
      return;
    }

    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoUrl(reader.result);
        setPhotoFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    setPhotoFileName(null);
    setPhotoError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const next: UmkmProfile = {
      id: profile.id,
      businessName: form.businessName.trim(),
      ownerName: form.ownerName.trim(),
      establishedYear: yearNumber,
      category: form.category.trim(),
      address: form.address.trim(),
      photoUrl,
      swot: swotLines,
      updatedAt: new Date().toISOString(),
    };
    save(next);
    setJustSaved(true);
  };

  return (
    <div>
      <PageHeader title="Edit Profile" description="Perbarui informasi dan profil usaha Anda." />

      <form onSubmit={handleSubmit}>
        <Card className="rounded-2xl p-6">
          <div className="flex flex-col gap-5">
            <Input
              label="Nama Usaha"
              id="businessName"
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              required
            />
            {touched && errors.businessName && (
              <p className="-mt-3 text-xs text-pink">{errors.businessName}</p>
            )}

            <Input
              label="Pemilik"
              id="ownerName"
              value={form.ownerName}
              onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
              required
            />
            {touched && errors.ownerName && <p className="-mt-3 text-xs text-pink">{errors.ownerName}</p>}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Berdiri Sejak"
                  id="establishedYear"
                  type="number"
                  min={1900}
                  max={currentYear + 1}
                  value={form.establishedYear}
                  onChange={(e) => setForm((f) => ({ ...f, establishedYear: e.target.value }))}
                  required
                />
                {touched && errors.establishedYear && (
                  <p className="text-xs text-pink">{errors.establishedYear}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Kategori"
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                />
                {touched && errors.category && <p className="text-xs text-pink">{errors.category}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Textarea
                label="Alamat UMKM"
                id="address"
                rows={3}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                required
              />
              {touched && errors.address && <p className="text-xs text-pink">{errors.address}</p>}
            </div>

            <div className="rounded-xl border border-soft-gray-dark bg-soft-gray p-4">
              <h3 className="text-sm font-semibold text-navy">Analisis SWOT</h3>
              <p className="mt-1 text-xs text-muted">
                Satu poin per baris. Minimal satu poin untuk setiap bagian.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {SWOT_FIELDS.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <Textarea
                      label={field.label}
                      id={`swot-${field.key}`}
                      rows={4}
                      value={swotText[field.key]}
                      onChange={(e) =>
                        setSwotText((s) => ({ ...s, [field.key]: e.target.value }))
                      }
                      className="resize-none bg-white"
                    />
                    {touched && errors[field.key] && (
                      <p className="text-xs text-pink">{errors[field.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-navy">Foto UMKM</h3>
              <div className="mt-2">
                {photoUrl ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-32 w-full overflow-hidden rounded-xl border border-soft-gray-dark sm:w-48">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local upload preview (data URL), not a static/remote asset. */}
                      <img src={photoUrl} alt="Preview foto UMKM" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted">{photoFileName ?? "Foto tersimpan"}</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <RefreshCw size={14} strokeWidth={2} />
                          Ganti Foto
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleRemovePhoto}>
                          <Trash2 size={14} strokeWidth={2} />
                          Hapus Foto
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple/40 bg-purple/5 px-4 py-8 text-center transition-colors hover:border-purple"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-purple shadow-sm">
                      <Upload size={20} strokeWidth={2} />
                    </span>
                    <p className="text-sm font-semibold text-navy">Upload Foto UMKM</p>
                    <p className="text-xs text-muted">PNG, JPG, atau WEBP. Maksimal 5MB.</p>
                  </button>
                )}
                {photoError && <p className="mt-2 text-xs text-pink">{photoError}</p>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

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
              <Button type="submit" variant="secondary">
                Simpan
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
