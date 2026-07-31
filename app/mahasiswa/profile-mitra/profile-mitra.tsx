"use client";

import { Store, MapPin, ImageIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import { useMahasiswaKelompok } from "@/lib/useMahasiswaKelompok";

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
      <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-soft-gray-dark bg-soft-gray lg:h-64">
        <ImageIcon size={28} strokeWidth={2} className="text-muted" />
        <span className="text-sm font-medium text-muted">Foto UMKM</span>
      </div>

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

      {/* SWOT Analysis — no shared SWOT data source exists yet; honest empty state instead of placeholder content. */}
      <Card>
        <CardTitle className="mb-4 text-lg">SWOT Analisis</CardTitle>
        <p className="text-sm text-muted">Belum ada analisis SWOT yang diinput.</p>
      </Card>
    </div>
  );
}
