"use client";

import Link from "next/link";
import { Layers, Users } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Badge, Button, ProgressBar } from "@/components/ui";
import { useUmkmKelompok } from "@/lib/useUmkmKelompok";
import { ADMIN_GROUP_STATUS_LABEL, ADMIN_GROUP_STATUS_VARIANT } from "@/lib/adminDashboardData";

export default function UmkmMentoringPage() {
  const { groups, isHydrated } = useUmkmKelompok();

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Mentoring"
        description="Lihat progress dan berikan validasi untuk laporan kelompok mahasiswa."
      />

      {groups.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple/10 text-purple">
            <Users size={24} strokeWidth={2} />
          </span>
          <p className="text-sm font-semibold text-navy">
            Belum ada kelompok yang terhubung dengan UMKM ini.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-navy">{group.code}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {group.studyProgram} &middot; {group.className}
                  </p>
                </div>
                <Badge variant={ADMIN_GROUP_STATUS_VARIANT[group.mentoringStatus]}>
                  {ADMIN_GROUP_STATUS_LABEL[group.mentoringStatus]}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="gray">
                  <Layers size={12} strokeWidth={2} className="mr-1" />
                  {group.projectTitle}
                </Badge>
                <Badge variant="gray">{group.reportCount} Laporan</Badge>
              </div>

              <div className="mt-4">
                <p className="text-xs text-muted">Progress</p>
                <ProgressBar value={group.progress} className="mt-1.5" />
              </div>

              <Link href={`/umkm/mentoring/${group.id}`} className="mt-5 block">
                <Button variant="secondary" className="w-full">
                  Lihat Detail
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
