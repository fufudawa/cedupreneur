"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Store, MapPin, ImageOff } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, CardTitle, Button } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";

interface UmkmProfileRow {
  namaUsaha: string;
  ownerName: string;
  sektorUsaha: string;
  alamat: string;
  deskripsiUsaha: string;
  kontak: string;
  fotoUrl: string | null;
  swotStrength: string;
  swotWeakness: string;
  swotOpportunity: string;
  swotThreat: string;
}

const SWOT_SECTIONS: { key: keyof Pick<UmkmProfileRow, "swotStrength" | "swotWeakness" | "swotOpportunity" | "swotThreat">; label: string }[] = [
  { key: "swotStrength", label: "Strength (Kekuatan)" },
  { key: "swotWeakness", label: "Weakness (Kelemahan)" },
  { key: "swotOpportunity", label: "Opportunity (Peluang)" },
  { key: "swotThreat", label: "Threat (Ancaman)" },
];

export default function ProfileUsahaPage() {
  const [profile, setProfile] = useState<UmkmProfileRow | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const currentProfile = await getCurrentProfile();
        const { data, error } = await supabase
          .from("umkm")
          .select(
            "nama_usaha, sektor_usaha, alamat, deskripsi_usaha, kontak, foto_url, swot_strength, swot_weakness, swot_opportunity, swot_threat, profiles ( nama_lengkap )"
          )
          .eq("profile_id", currentProfile.id)
          .maybeSingle();
        if (error) throw error;

        if (isMounted && data) {
          const row = data as unknown as {
            nama_usaha: string | null;
            sektor_usaha: string | null;
            alamat: string | null;
            deskripsi_usaha: string | null;
            kontak: string | null;
            foto_url: string | null;
            swot_strength: string | null;
            swot_weakness: string | null;
            swot_opportunity: string | null;
            swot_threat: string | null;
            profiles: { nama_lengkap: string | null } | null;
          };
          const fotoUrl = row.foto_url
            ? supabase.storage.from("umkm-foto").getPublicUrl(row.foto_url).data.publicUrl
            : null;
          setProfile({
            namaUsaha: row.nama_usaha ?? "-",
            ownerName: row.profiles?.nama_lengkap ?? "-",
            sektorUsaha: row.sektor_usaha ?? "-",
            alamat: row.alamat ?? "-",
            deskripsiUsaha: row.deskripsi_usaha ?? "",
            kontak: row.kontak ?? "-",
            fotoUrl,
            swotStrength: row.swot_strength ?? "",
            swotWeakness: row.swot_weakness ?? "",
            swotOpportunity: row.swot_opportunity ?? "",
            swotThreat: row.swot_threat ?? "",
          });
        }
      } catch (error) {
        console.error("Failed to load umkm profile (cek RLS SELECT tabel umkm):", error);
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isHydrated) {
    return null;
  }

  if (!profile) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
        <p className="text-sm font-semibold text-navy">Data profil usaha tidak ditemukan.</p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader title="Profile Usaha" description="Kelola informasi dan profil usaha Anda." />

      {profile.fotoUrl ? (
        <div className="relative h-[200px] w-full overflow-hidden rounded-[20px] border border-soft-gray-dark sm:h-[220px]">
          <Image src={profile.fotoUrl} alt={profile.namaUsaha} fill className="object-cover" />
        </div>
      ) : (
        <div className="flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-soft-gray-dark bg-soft-gray text-center sm:h-[220px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-muted shadow-sm">
            <ImageOff size={22} strokeWidth={2} />
          </span>
          <p className="text-sm font-semibold text-navy">Foto UMKM belum tersedia</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg">Profile Mitra</CardTitle>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
              <Store size={20} strokeWidth={2} />
            </span>
          </div>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Nama</dt>
              <dd className="font-medium text-navy">{profile.namaUsaha}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Pemilik</dt>
              <dd className="font-medium text-navy">{profile.ownerName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Sektor</dt>
              <dd className="font-medium text-navy">{profile.sektorUsaha}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Kontak</dt>
              <dd className="font-medium text-navy">{profile.kontak}</dd>
            </div>
          </dl>
        </Card>

        <Card className="min-w-0 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg">Lokasi UMKM</CardTitle>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
              <MapPin size={20} strokeWidth={2} />
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-navy">{profile.alamat}</p>
        </Card>
      </div>

      <Card className="mt-6 min-w-0 rounded-2xl p-6">
        <CardTitle className="text-lg">Deskripsi Usaha</CardTitle>
        {profile.deskripsiUsaha ? (
          <p className="mt-3 text-sm leading-relaxed text-navy">{profile.deskripsiUsaha}</p>
        ) : (
          <p className="mt-3 text-sm text-muted">Belum ada deskripsi usaha yang diinput.</p>
        )}
      </Card>

      <Card className="mt-6 min-w-0 rounded-2xl p-6">
        <CardTitle className="text-lg">SWOT Analisis</CardTitle>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SWOT_SECTIONS.map((section) => (
            <div key={section.key} className="rounded-xl border border-soft-gray-dark p-4">
              <p className="text-sm font-semibold text-navy">{section.label}</p>
              {profile[section.key] ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy">{profile[section.key]}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">Belum ada analisis {section.label.split(" ")[0].toLowerCase()} yang diinput.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex justify-end">
        <Link href="/umkm/profile-usaha/edit">
          <Button variant="secondary">Edit Profile</Button>
        </Link>
      </div>
    </div>
  );
}
