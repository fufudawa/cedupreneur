"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { useKelas, useMataKuliah, useUmkmMaster } from "@/lib/useAdminMasterData";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useClassRelations, useClassStudentRelations, useRelationActivityLog } from "@/lib/useRelasiKelasData";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function RelasiKelasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { kelasList, isHydrated: kelasHydrated } = useKelas();
  const { mataKuliah, isHydrated: mkHydrated } = useMataKuliah();
  const { umkmMasterList, isHydrated: umkmHydrated } = useUmkmMaster();
  const { users, isHydrated: usersHydrated } = useAdminUsers();
  const { classRelations, isHydrated: relationsHydrated } = useClassRelations();
  const { classStudentRelations, isHydrated: studentRelationsHydrated } = useClassStudentRelations();
  const { activityLog, isHydrated: activityHydrated } = useRelationActivityLog();
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const isHydrated =
    kelasHydrated &&
    mkHydrated &&
    umkmHydrated &&
    usersHydrated &&
    relationsHydrated &&
    studentRelationsHydrated &&
    activityHydrated &&
    groupsHydrated;

  if (!isHydrated) {
    return null;
  }

  const relation = classRelations.find((r) => r.id === id);
  if (!relation) {
    notFound();
  }

  const kelas = kelasList.find((k) => k.id === relation.classId);
  if (!kelas) {
    notFound();
  }

  const mk = mataKuliah.find((m) => m.id === kelas.mataKuliahId);
  const dosen = users.find((u) => u.id === kelas.dosenId);
  const umkm = umkmMasterList.find((u) => u.id === relation.umkmId);
  const students = classStudentRelations
    .filter((r) => r.classId === kelas.id && r.status === "active")
    .map((r) => users.find((u) => u.id === r.studentId))
    .filter((u): u is NonNullable<typeof u> => !!u);
  const relatedGroups = groups.filter((g) => g.className === kelas.nama);
  const relationActivity = activityLog.filter((a) => a.detail.includes(kelas.nama)).slice(0, 8);

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
            <p className="text-xs text-muted">Status Relasi</p>
            <p className="mt-1">
              <Badge variant={relation.status === "aktif" ? "green" : "gray"}>
                {relation.status === "aktif" ? "Aktif" : "Tidak Aktif"}
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Jumlah Mahasiswa</p>
            <p className="mt-1 text-sm font-semibold text-navy">{students.length} mahasiswa</p>
          </div>
        </div>
        {relation.catatan && (
          <>
            <div className="my-4 h-px bg-soft-gray-dark" />
            <p className="text-xs text-muted">Catatan Relasi</p>
            <p className="mt-1 text-sm text-navy">{relation.catatan}</p>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Mata Kuliah</CardTitle>
          </CardHeader>
          <p className="text-sm font-semibold text-navy">{mk?.nama ?? "-"}</p>
          <p className="mt-1 text-sm text-muted">{mk?.kode} &middot; {mk?.sks} SKS</p>
        </Card>

        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Dosen Pengampu</CardTitle>
          </CardHeader>
          <p className="text-sm font-semibold text-navy">{dosen?.name ?? "-"}</p>
          <p className="mt-1 text-sm text-muted">
            {dosen?.nip ? `NIP ${dosen.nip}` : "-"} {dosen?.jabatan ? `· ${dosen.jabatan}` : ""}
          </p>
        </Card>
      </div>

      <Card className="my-6 min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">UMKM Mitra</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">Nama Usaha</p>
            <p className="mt-1 text-sm font-semibold text-navy">{umkm?.namaUsaha ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Sektor Usaha</p>
            <p className="mt-1 text-sm font-semibold text-navy">{umkm?.sektorUsaha ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Kontak</p>
            <p className="mt-1 text-sm font-semibold text-navy">{umkm?.kontak ?? umkm?.email ?? "-"}</p>
          </div>
        </div>
      </Card>

      <Card className="mb-6 min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Mahasiswa</CardTitle>
        </CardHeader>
        {students.length === 0 ? (
          <p className="text-sm text-muted">Belum ada mahasiswa pada kelas ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-purple/5">
                <tr>
                  <th className="px-3 py-2 font-medium text-navy">NIM</th>
                  <th className="px-3 py-2 font-medium text-navy">Nama</th>
                  <th className="px-3 py-2 font-medium text-navy">Angkatan</th>
                  <th className="px-3 py-2 font-medium text-navy">Kelompok</th>
                  <th className="px-3 py-2 font-medium text-navy">Peran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray-dark">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-3 py-2 text-navy">{student.nim}</td>
                    <td className="px-3 py-2 text-navy">{student.name}</td>
                    <td className="px-3 py-2 text-muted">{student.angkatan ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{student.groupName ?? "Belum Masuk Kelompok"}</td>
                    <td className="px-3 py-2 text-muted">
                      {student.groupName
                        ? student.memberRole === "ketua"
                          ? "Ketua/Perwakilan"
                          : "Anggota"
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Project yang Terhubung</CardTitle>
          </CardHeader>
          {mk ? (
            <p className="text-sm text-navy">{mk.nama}</p>
          ) : (
            <p className="text-sm text-muted">Belum ada project yang terhubung.</p>
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

      <Card className="mt-6 min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Riwayat Perubahan Relasi</CardTitle>
        </CardHeader>
        {relationActivity.length === 0 ? (
          <p className="text-sm text-muted">Belum ada riwayat perubahan untuk relasi ini.</p>
        ) : (
          <div className="flex flex-col divide-y divide-soft-gray-dark">
            {relationActivity.map((activity) => (
              <div key={activity.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm text-navy">{activity.detail}</p>
                <p className="mt-0.5 text-xs text-muted">{formatDateTime(activity.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
