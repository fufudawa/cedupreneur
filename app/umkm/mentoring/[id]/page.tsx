"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, MessageSquare, CheckCircle2, Users, Layers } from "lucide-react";
import { PageHeader, StatCard, ValidasiBadge } from "@/components/shared";
import { Card, Badge, Button, Input, Select, FilterToolbar } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { useUmkmKelompok } from "@/lib/useUmkmKelompok";
import type { LaporanValidasiStatus } from "@/lib/umkmFeedbackStorage";

type LaporanStatusFeedback = "sudah_diberi_feedback" | "menunggu_feedback";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "belum_tuntas", label: "Perlu Penyesuaian" },
  { value: "tuntas", label: "Sesuai" },
];

const FEEDBACK_FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "menunggu_feedback", label: "Menunggu feedback" },
  { value: "sudah_diberi_feedback", label: "Sudah diberi feedback" },
];

const FEEDBACK_BADGE_LABEL: Record<LaporanStatusFeedback, string> = {
  sudah_diberi_feedback: "Sudah diberi feedback",
  menunggu_feedback: "Menunggu feedback",
};

const FEEDBACK_BADGE_VARIANT: Record<LaporanStatusFeedback, "purple" | "orange"> = {
  sudah_diberi_feedback: "purple",
  menunggu_feedback: "orange",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

interface LaporanRow {
  id: string;
  judul_laporan: string | null;
  status: string | null;
  created_at: string | null;
  feedback: { id: string; pemberi_role: string | null; jenis_feedback: string | null; created_at: string | null }[] | null;
}

export default function UmkmMentoringGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groups, isHydrated: groupsHydrated } = useUmkmKelompok();

  const [laporanList, setLaporanList] = useState<LaporanRow[]>([]);
  const [dataHydrated, setDataHydrated] = useState(false);
  const isHydrated = groupsHydrated && dataHydrated;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    async function loadLaporan() {
      try {
        const { data, error } = await supabase
          .from("laporan_progress")
          .select("id, judul_laporan, status, created_at, feedback ( id, pemberi_role, jenis_feedback, created_at )")
          .eq("kelompok_id", id)
          .neq("status", "draft")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (isMounted) setLaporanList((data ?? []) as unknown as LaporanRow[]);
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
  }, [id]);

  if (!isHydrated) {
    return null;
  }

  // RLS (kelompok_select_umkm) already guarantees this UMKM owns the kelompok —
  // if it doesn't, the row simply won't come back from the query.
  const group = groups.find((g) => g.id === id);
  if (!group) {
    notFound();
  }

  const rows = laporanList.map((laporan) => {
    const umkmFeedbacks = (laporan.feedback ?? [])
      .filter((f) => f.pemberi_role === "umkm")
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    const latest = umkmFeedbacks[0];
    const statusValidasi: LaporanValidasiStatus = latest?.jenis_feedback === "sesuai" ? "tuntas" : "belum_tuntas";
    const statusFeedback: LaporanStatusFeedback = latest ? "sudah_diberi_feedback" : "menunggu_feedback";
    return { laporan, hasUmkmFeedback: umkmFeedbacks.length > 0, statusValidasi, statusFeedback };
  });

  const totalLaporan = rows.length;
  const menungguFeedback = rows.filter((r) => r.statusFeedback === "menunggu_feedback").length;
  const sudahDivalidasi = rows.filter((r) => r.statusFeedback === "sudah_diberi_feedback").length;

  const filtered = rows.filter(({ laporan, statusValidasi, statusFeedback }) => {
    const keyword = search.toLowerCase();
    const matchSearch = keyword === "" || (laporan.judul_laporan ?? "").toLowerCase().includes(keyword);
    const matchStatus = statusFilter === "all" || statusValidasi === statusFilter;
    const matchFeedback = feedbackFilter === "all" || statusFeedback === feedbackFilter;
    return matchSearch && matchStatus && matchFeedback;
  });

  return (
    <div>
      <PageHeader
        title="Mentoring"
        description="Lihat progress dan berikan validasi untuk laporan kelompok mahasiswa."
        actions={
          <Link href="/umkm/mentoring">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Daftar Kelompok
            </Button>
          </Link>
        }
      />

      <Card className="mb-6 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-navy">{group.code}</h2>
        <p className="mt-1 text-sm text-muted">
          Laporan progress kelompok yang terhubung dengan {group.umkmName}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="gray">
            <Users size={12} strokeWidth={2} className="mr-1" />
            {group.members.length} Anggota
          </Badge>
          <Badge variant="gray">
            <Layers size={12} strokeWidth={2} className="mr-1" />
            {group.projectTitle}
          </Badge>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Laporan"
          value={totalLaporan}
          icon={<FileText size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
        />
        <StatCard
          label="Menunggu Feedback"
          value={menungguFeedback}
          icon={<MessageSquare size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
          valueClassName="mt-1 text-2xl font-bold text-orange"
        />
        <StatCard
          label="Sudah Divalidasi"
          value={sudahDivalidasi}
          icon={<CheckCircle2 size={22} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
          valueClassName="mt-1 text-2xl font-bold text-green-700"
        />
      </div>

      <FilterToolbar className="mb-6">
        <Input
          id="search-mentoring"
          placeholder="Cari judul laporan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-[300px]"
        />
        <Select
          id="filter-status"
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-[150px]"
        />
        <Select
          id="filter-feedback"
          options={FEEDBACK_FILTER_OPTIONS}
          value={feedbackFilter}
          onChange={(e) => setFeedbackFilter(e.target.value)}
          className="w-full sm:w-[200px]"
        />
      </FilterToolbar>

      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <Card className="rounded-2xl p-8 text-center text-sm text-muted">
            {rows.length === 0 ? "Belum ada laporan yang diunggah." : "Tidak ada laporan yang cocok dengan pencarian/filter."}
          </Card>
        ) : (
          filtered.map(({ laporan, hasUmkmFeedback, statusValidasi, statusFeedback }) => (
            <Card key={laporan.id} className="min-w-0 rounded-2xl p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-navy">
                      {laporan.judul_laporan ?? "Laporan Progress"}
                    </h3>
                    {hasUmkmFeedback && <ValidasiBadge status={statusValidasi} />}
                    <Badge variant={FEEDBACK_BADGE_VARIANT[statusFeedback]}>
                      {FEEDBACK_BADGE_LABEL[statusFeedback]}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    {formatDateTime(laporan.created_at)}
                  </p>
                </div>
                <div className="shrink-0">
                  <Link href={`/umkm/mentoring/${group.id}/${laporan.id}`}>
                    <Button variant="secondary" className="w-full lg:w-auto">
                      {statusFeedback === "sudah_diberi_feedback" ? "Lihat / Perbarui Feedback" : "Lihat & Beri Feedback"}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
