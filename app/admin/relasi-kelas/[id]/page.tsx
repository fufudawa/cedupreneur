"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { useKelas, useUmkmMaster, useMahasiswaMaster } from "@/lib/useAdminMasterData";
import { useKelasUmkm } from "@/lib/useKelasUmkm";
import { useAdminMonitoring } from "@/lib/useAdminMonitoring";

export default function RelasiKelasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { kelasList, isHydrated: kelasHydrated } = useKelas();
  const { umkmMasterList, isHydrated: umkmHydrated } = useUmkmMaster();
  const { links, isHydrated: linksHydrated } = useKelasUmkm();
  const { mahasiswaMasterList, isHydrated: mahasiswaHydrated } = useMahasiswaMaster();
  const { groups, isHydrated: groupsHydrated } = useAdminMonitoring();
  const isHydrated = kelasHydrated && umkmHydrated && linksHydrated && mahasiswaHydrated && groupsHydrated;

  if (!isHydrated) {
    return null;
  }

  const kelas = kelasList.find((k) => k.id === id);
  if (!kelas) {
    notFound();
  }

  const linkedUmkm = links.filter((l) => l.kelasId === kelas.id).map((l) => umkmMasterList.find((u) => u.id === l.umkmId)).filter((u): u is NonNullable<typeof u> => !!u);
  const relatedGroups = groups.filter((g) => g.className === kelas.nama);
  const roster = mahasiswaMasterList.filter((m) => m.connectedKelas.some((link) => link.kelasId === kelas.id));

  return (
    <div>
      <PageHeader
        title={`Relasi Kelas ${kelas.nama}`}
        description="Detail relasi kelas dengan dosen pengampu, UMKM mitra, dan mahasiswa."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/relasi-kelas?kelasId=${kelas.id}`}>
              <Button variant="secondary">Edit Relasi</Button>
            </Link>
            <Link href="/admin/relasi-kelas/semua">
              <Button variant="outline">
                <ArrowLeft size={16} strokeWidth={2} />
                Kembali
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="mb-6 min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Informasi Kelas</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Nama Kelas</p>
            <p className="mt-1 text-sm font-semibold text-navy">{kelas.nama}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Semester</p>
            <p className="mt-1 text-sm font-semibold text-navy">
              {kelas.semester} {kelas.tahunAjaran}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Mata Kuliah</p>
            <p className="mt-1 text-sm font-semibold text-navy">{kelas.mataKuliahNama}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Jumlah Mahasiswa</p>
            <p className="mt-1 text-sm font-semibold text-navy">{roster.length} mahasiswa</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Dosen Pengampu</CardTitle>
          </CardHeader>
          <p className="text-sm font-semibold text-navy">{kelas.dosenNama}</p>
        </Card>

        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">UMKM Mitra</CardTitle>
          </CardHeader>
          {linkedUmkm.length === 0 ? (
            <p className="text-sm text-muted">Belum ada UMKM yang terhubung.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {linkedUmkm.map((umkm) => (
                <div key={umkm.id}>
                  <p className="text-sm font-semibold text-navy">{umkm.namaUsaha}</p>
                  <p className="text-xs text-muted">{umkm.sektorUsaha}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="my-6 min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Mahasiswa</CardTitle>
        </CardHeader>
        {roster.length === 0 ? (
          <p className="text-sm text-muted">Belum ada mahasiswa pada kelas ini.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roster.map((m) => (
              <Badge key={m.id} variant="gray">
                {m.nama} ({m.nim})
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className="min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Kelompok yang Terbentuk</CardTitle>
        </CardHeader>
        {relatedGroups.length === 0 ? (
          <p className="text-sm text-muted">Belum ada kelompok yang terbentuk pada kelas ini.</p>
        ) : (
          <div className="flex flex-col divide-y divide-soft-gray-dark">
            {relatedGroups.map((group) => (
              <div key={group.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy">{group.code}</p>
                  <p className="text-xs text-muted">{group.members.length} anggota &middot; {group.umkmName}</p>
                </div>
                <Link href={`/admin/monitoring/${group.id}`}>
                  <Button variant="outline" size="sm">
                    Lihat Progress
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
