"use client";

import { use, Fragment, type ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Badge, Button, ProgressBar } from "@/components/ui";
import { useDosenKelompokBimbingan } from "@/lib/useDosenKelompokBimbingan";
import { ADMIN_GROUP_STATUS_LABEL, ADMIN_GROUP_STATUS_VARIANT } from "@/lib/adminDashboardData";

export default function DetailKelompokPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groups, isHydrated } = useDosenKelompokBimbingan();

  if (!isHydrated) {
    return null;
  }

  const group = groups.find((g) => g.id === id);
  if (!group) {
    notFound();
  }

  const detailRows: { label: string; value: ReactNode }[] = [
    { label: "Nama Kelompok", value: group.name },
    { label: "Kelas", value: group.className },
    { label: "Program Studi", value: group.studyProgram },
    { label: "Semester", value: group.semester },
    { label: "Mata Kuliah", value: group.mataKuliah },
    {
      label: "Anggota Kelompok",
      value:
        group.members.length === 0 ? (
          <span className="text-muted">Belum ada mahasiswa bimbingan.</span>
        ) : (
          <ol className="flex flex-col gap-1">
            {group.members.map((member, index) => (
              <li key={`${member.name}-${member.nim}`}>
                {index + 1}. {member.name} ({member.nim})
              </li>
            ))}
          </ol>
        ),
    },
    { label: "Mitra UMKM", value: group.umkmName },
    { label: "Alamat Mitra UMKM", value: group.umkmAddress },
  ];

  return (
    <div>
      <PageHeader
        title="Kelompok Bimbingan"
        description={group.code}
        actions={
          <Link href="/dosen/project/kelompok">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Seluruh Kelompok
            </Button>
          </Link>
        }
      />

      <Card className="min-w-0 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-navy">{group.code}</h2>
            <p className="mt-1 text-sm text-muted">{group.umkmName}</p>
            <p className="mt-0.5 text-sm text-muted">{group.period}</p>
          </div>
          <Badge variant={ADMIN_GROUP_STATUS_VARIANT[group.mentoringStatus]}>
            {ADMIN_GROUP_STATUS_LABEL[group.mentoringStatus]}
          </Badge>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <ProgressBar value={group.progress} showLabel={false} className="flex-1" />
          <span className="shrink-0 text-lg font-bold text-navy">{group.progress}%</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Tahap saat ini: <span className="font-medium text-navy">-</span>
        </p>

        <div className="my-6 h-px bg-soft-gray-dark" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_20px_minmax(0,1fr)] sm:items-start sm:gap-y-4">
          {detailRows.map((row) => (
            <Fragment key={row.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted first:mt-0 sm:mt-0 sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal">
                {row.label}
              </p>
              <span className="hidden text-sm text-muted sm:block">:</span>
              <div className="text-sm text-navy">{row.value}</div>
            </Fragment>
          ))}
        </div>

        <div className="mt-6">
          <Link href={`/dosen/mentoring-feedback/${group.id}`}>
            <Button variant="outline" size="sm">
              <MessageSquareText size={16} strokeWidth={2} />
              Lihat Mentoring
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
