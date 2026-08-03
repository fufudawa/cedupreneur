"use client";

import Image from "next/image";
import { Store, MapPin, ImageIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import { useMahasiswaKelompok } from "@/lib/useMahasiswaKelompok";

const SWOT_SECTIONS = [
  { key: "umkmSwotStrength" as const, label: "Strength (Kekuatan)" },
  { key: "umkmSwotWeakness" as const, label: "Weakness (Kelemahan)" },
  { key: "umkmSwotOpportunity" as const, label: "Opportunity (Peluang)" },
  { key: "umkmSwotThreat" as const, label: "Threat (Ancaman)" },
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <span className="text-navy">: {value}</span>
    </div>
  );
}

export default function ProfileMitraPage() {
  const { activeGroup, isHydrated } = useMahasiswaKelompok();

  if (!isHydrated) {
    return null;
  }

  if (!activeGroup || !activeGroup.umkmId) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple/10 text-purple">
          <Store size={24} strokeWidth={2} />
        </span>
        <p className="text-sm font-semibold text-navy">
          Belum ada UMKM mitra yang terhubung dengan kelompok Anda.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero photo */}
      {activeGroup.umkmFotoUrl ? (
        <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-soft-gray-dark lg:h-64">
          <Image src={activeGroup.umkmFotoUrl} alt={activeGroup.umkmName} fill className="object-cover" />
        </div>
      ) : (
        <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-soft-gray-dark bg-soft-gray lg:h-64">
          <ImageIcon size={28} strokeWidth={2} className="text-muted" />
          <span className="text-sm font-medium text-muted">Foto UMKM</span>
        </div>
      )}

      {/* Profile Mitra & Lokasi */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Mitra</CardTitle>
            <span className="flex size-[52px] items-center justify-center rounded-full bg-purple/10 text-purple">
              <Store size={20} strokeWidth={2} />
            </span>
          </CardHeader>
          <div className="flex flex-col gap-2">
            <DetailRow label="Nama" value={activeGroup.umkmName} />
            <DetailRow label="Pemilik" value={activeGroup.umkmOwnerName} />
            <DetailRow label="Sektor" value={activeGroup.umkmSector} />
            <DetailRow label="Kelompok" value={activeGroup.code} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lokasi UMKM</CardTitle>
            <span className="flex size-[52px] items-center justify-center rounded-full bg-purple/10 text-purple">
              <MapPin size={20} strokeWidth={2} />
            </span>
          </CardHeader>
          <p className="text-sm leading-relaxed text-navy">{activeGroup.umkmAddress}</p>
        </Card>
      </div>

      {/* Deskripsi Usaha */}
      <Card>
        <CardTitle className="mb-3 text-lg">Deskripsi Usaha</CardTitle>
        {activeGroup.umkmDescription ? (
          <p className="text-sm leading-relaxed text-navy">{activeGroup.umkmDescription}</p>
        ) : (
          <p className="text-sm text-muted">Belum ada deskripsi usaha yang diinput.</p>
        )}
      </Card>

      {/* SWOT Analysis */}
      <Card>
        <CardTitle className="mb-4 text-lg">SWOT Analisis</CardTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SWOT_SECTIONS.map((section) => (
            <div key={section.key} className="rounded-xl border border-soft-gray-dark p-4">
              <p className="text-sm font-semibold text-navy">{section.label}</p>
              {activeGroup[section.key] ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy">
                  {activeGroup[section.key]}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">Belum ada analisis yang diinput.</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
