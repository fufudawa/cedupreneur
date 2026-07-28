"use client";

import Link from "next/link";
import { Store, MapPin, ImageOff } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, CardTitle, Button } from "@/components/ui";
import { umkmProfile as defaultProfile } from "@/data/umkmProfile";
import { useUmkmProfile } from "@/lib/useUmkmProfile";

const SWOT_SECTIONS = [
  { key: "strengths", title: "Strengths", headingClassName: "text-purple" },
  { key: "weaknesses", title: "Weaknesses", headingClassName: "text-orange" },
  { key: "opportunities", title: "Opportunities", headingClassName: "text-purple/70" },
  { key: "threats", title: "Threats", headingClassName: "text-pink" },
] as const;

export default function ProfileUsahaPage() {
  const { profile } = useUmkmProfile(defaultProfile);

  return (
    <div>
      <PageHeader title="Profile Usaha" description="Kelola informasi dan profil usaha Anda." />

      {profile.photoUrl ? (
        <div className="relative h-[200px] w-full overflow-hidden rounded-[20px] shadow-sm sm:h-[220px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL preview, not a static/remote asset next/image can optimize. */}
          <img
            src={profile.photoUrl}
            alt={profile.businessName}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-soft-gray-dark bg-soft-gray text-center sm:h-[220px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-muted shadow-sm">
            <ImageOff size={22} strokeWidth={2} />
          </span>
          <p className="text-sm font-semibold text-navy">Foto UMKM belum tersedia</p>
          <p className="text-xs text-muted">Tambahkan foto usaha melalui Edit Profile.</p>
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
              <dd className="font-medium text-navy">{profile.businessName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Pemilik</dt>
              <dd className="font-medium text-navy">{profile.ownerName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Berdiri sejak</dt>
              <dd className="font-medium text-navy">{profile.establishedYear}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Kategori</dt>
              <dd className="font-medium text-navy">{profile.category}</dd>
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
          <p className="mt-4 text-sm leading-relaxed text-navy">{profile.address}</p>
        </Card>
      </div>

      <Card className="mt-6 min-w-0 rounded-2xl p-6">
        <CardTitle className="text-lg">SWOT Analisis</CardTitle>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {SWOT_SECTIONS.map((section) => (
            <div key={section.key} className="min-w-0 rounded-xl border border-soft-gray-dark p-4 shadow-sm">
              <h4 className={`text-sm font-bold ${section.headingClassName}`}>{section.title}</h4>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm text-navy">
                {profile.swot[section.key].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-soft-gray-dark" />
                    {item}
                  </li>
                ))}
              </ul>
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
