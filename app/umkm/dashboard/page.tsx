"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound, MessageSquare, CheckCircle2, FileText, Users } from "lucide-react";
import { StatCard } from "@/components/shared";
import { Card, CardTitle, Timeline, Select } from "@/components/ui";
import type { TimelineItem } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { useUmkmKelompok } from "@/lib/useUmkmKelompok";

const REPORT_STATUS_TIMELINE: Record<string, TimelineItem["status"]> = {
  draft: "belum",
  submitted: "proses",
  reviewed: "selesai",
};

interface LaporanRow {
  id: string;
  kelompok_id: string;
  judul_laporan: string | null;
  status: string | null;
  created_at: string | null;
}

export default function UmkmDashboardPage() {
  const { groups, isHydrated: groupsHydrated } = useUmkmKelompok();

  const [laporanList, setLaporanList] = useState<(LaporanRow & { hasUmkmFeedback: boolean })[]>([]);
  const [dataHydrated, setDataHydrated] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const isHydrated = groupsHydrated && dataHydrated;

  useEffect(() => {
    let isMounted = true;

    async function loadLaporan() {
      if (groups.length === 0) {
        if (isMounted) {
          setLaporanList([]);
          setDataHydrated(true);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("laporan_progress")
          .select("id, kelompok_id, judul_laporan, status, created_at, feedback ( id, pemberi_role )")
          .in("kelompok_id", groups.map((g) => g.id))
          .neq("status", "draft")
          .order("created_at", { ascending: false });
        if (error) throw error;

        type Row = LaporanRow & { feedback: { id: string; pemberi_role: string | null }[] | null };
        const rows = (data ?? []) as unknown as Row[];

        if (isMounted) {
          setLaporanList(
            rows.map((row) => ({
              id: row.id,
              kelompok_id: row.kelompok_id,
              judul_laporan: row.judul_laporan,
              status: row.status,
              created_at: row.created_at,
              hasUmkmFeedback: (row.feedback ?? []).some((f) => f.pemberi_role === "umkm"),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load laporan progress (cek RLS SELECT laporan_progress/feedback):", error);
        if (isMounted) setLaporanList([]);
      } finally {
        if (isMounted) setDataHydrated(true);
      }
    }

    loadLaporan();

    return () => {
      isMounted = false;
    };
  }, [groups]);

  if (!isHydrated) {
    return null;
  }

  if (groups.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple/10 text-purple">
          <Users size={24} strokeWidth={2} />
        </span>
        <p className="text-sm font-semibold text-navy">Belum ada kelompok yang terhubung dengan UMKM Anda.</p>
      </Card>
    );
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

  const totalLaporan = laporanList.length;
  const sudahDivalidasi = laporanList.filter((r) => r.hasUmkmFeedback).length;
  const menungguValidasi = totalLaporan - sudahDivalidasi;

  const pendampingLabel =
    groups.length === 1 ? `${groups[0].studyProgram} | ${groups[0].name}` : `${groups.length} Kelompok Dampingan`;

  const trackOfProject: TimelineItem[] = laporanList
    .filter((r) => r.kelompok_id === selectedGroup.id)
    .slice(0, 5)
    .map((report) => ({
      id: report.id,
      title: report.judul_laporan ?? "Laporan Progress",
      description:
        report.status === "reviewed"
          ? "Sudah Divalidasi"
          : report.hasUmkmFeedback
            ? "Sudah Diberi Feedback"
            : "Menunggu Validasi",
      status: REPORT_STATUS_TIMELINE[report.status ?? "draft"] ?? "belum",
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pendamping"
          value={pendampingLabel}
          icon={<UserRound size={26} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          iconSizeClassName="h-14 w-14"
          labelClassName="text-base font-semibold text-navy"
          valueClassName="mt-2 text-2xl font-bold text-purple"
          className="min-h-[140px] rounded-2xl p-6"
        />

        <Link href="/umkm/mentoring" className="block rounded-2xl transition-shadow hover:shadow-md">
          <StatCard
            label="Menunggu Validasi"
            value={menungguValidasi}
            icon={<MessageSquare size={26} strokeWidth={2} />}
            iconClassName="bg-orange/10 text-orange"
            iconSizeClassName="h-14 w-14"
            labelClassName="text-base font-semibold text-navy"
            valueClassName="mt-2 text-4xl font-bold text-orange"
            className="min-h-[140px] rounded-2xl p-6"
          />
        </Link>

        <StatCard
          label="Sudah Divalidasi"
          value={sudahDivalidasi}
          icon={<CheckCircle2 size={26} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
          iconSizeClassName="h-14 w-14"
          labelClassName="text-base font-semibold text-navy"
          valueClassName="mt-2 text-4xl font-bold text-green-700"
          className="min-h-[140px] rounded-2xl p-6"
        />

        <StatCard
          label="Total Laporan"
          value={totalLaporan}
          icon={<FileText size={26} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          iconSizeClassName="h-14 w-14"
          labelClassName="text-base font-semibold text-navy"
          valueClassName="mt-2 text-4xl font-bold text-purple"
          className="min-h-[140px] rounded-2xl p-6"
        />
      </div>

      <Card className="min-w-0 rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Track of project</CardTitle>
            <p className="mt-1 text-xs text-muted">
              {selectedGroup.code} &middot; {selectedGroup.progress}%
            </p>
          </div>

          {groups.length > 1 && (
            <Select
              id="select-kelompok"
              label="Pilih Kelompok"
              value={selectedGroup.id}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={groups.map((group) => ({ value: group.id, label: group.code }))}
              className="w-full sm:w-[260px]"
            />
          )}
        </div>
        <div className="mt-4">
          {trackOfProject.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Belum ada laporan progress yang dapat dipantau.</p>
          ) : (
            <Timeline items={trackOfProject} />
          )}
        </div>
      </Card>
    </div>
  );
}
