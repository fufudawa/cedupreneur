"use client";

import { Store, MapPin, ImageIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useUmkmMaster } from "@/lib/useAdminMasterData";
import { getCurrentDemoUser, getActiveMahasiswaGroup } from "@/lib/demoSession";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <span className="text-navy">: {value}</span>
    </div>
  );
}

export default function ProfileMitraPage() {
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { umkmMasterList, isHydrated: umkmHydrated } = useUmkmMaster();
  const isHydrated = groupsHydrated && umkmHydrated;

  if (!isHydrated) {
    return null;
  }

  const activeUser = getCurrentDemoUser("mahasiswa");
  const activeGroup = activeUser ? getActiveMahasiswaGroup(activeUser, groups) : undefined;
  const umkm = activeGroup ? umkmMasterList.find((u) => u.namaUsaha === activeGroup.umkmName) : undefined;

  if (!activeGroup || !umkm) {
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
            <DetailRow label="Nama" value={umkm.namaUsaha} />
            <DetailRow label="Pemilik" value={umkm.namaPemilik} />
            <DetailRow label="Sektor" value={umkm.sektorUsaha} />
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
          <p className="text-sm leading-relaxed text-navy">{umkm.alamat}</p>
        </Card>
      </div>

      {/* Deskripsi Usaha */}
      <Card>
        <CardTitle className="mb-3 text-lg">Deskripsi Usaha</CardTitle>
        {umkm.deskripsiUsaha ? (
          <p className="text-sm leading-relaxed text-navy">{umkm.deskripsiUsaha}</p>
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
