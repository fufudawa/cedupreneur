"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Select, Button, Badge, FilterToolbar } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { useMahasiswaKelompok } from "@/lib/useMahasiswaKelompok";

const REPORT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Feedback",
  reviewed: "Selesai Direview",
};

const REPORT_STATUS_BADGE_VARIANT: Record<string, "gray" | "orange" | "green"> = {
  draft: "gray",
  submitted: "orange",
  reviewed: "green",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Menunggu Feedback" },
  { value: "reviewed", label: "Selesai Direview" },
];

interface LaporanRow {
  id: string;
  judul_laporan: string | null;
  status: string | null;
  created_at: string | null;
}

function formatDateTime(iso: string | null) {
  if (!iso) return { date: "-", time: "-" };
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function ProjectHistoryPage() {
  const { activeGroup, isHydrated: groupHydrated } = useMahasiswaKelompok();

  const [laporanList, setLaporanList] = useState<LaporanRow[]>([]);
  const [listHydrated, setListHydrated] = useState(false);
  const isHydrated = groupHydrated && listHydrated;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    async function loadLaporan() {
      if (!activeGroup) {
        if (isMounted) {
          setLaporanList([]);
          setListHydrated(true);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("laporan_progress")
          .select("id, judul_laporan, status, created_at")
          .eq("kelompok_id", activeGroup.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (isMounted) setLaporanList((data ?? []) as LaporanRow[]);
      } catch (error) {
        console.error("Failed to load laporan progress (cek RLS SELECT pada tabel laporan_progress):", error);
        if (isMounted) setLaporanList([]);
      } finally {
        if (isMounted) setListHydrated(true);
      }
    }

    loadLaporan();

    return () => {
      isMounted = false;
    };
  }, [activeGroup]);

  if (!isHydrated) {
    return null;
  }

  const filtered = laporanList.filter((report) => {
    const matchSearch = (report.judul_laporan ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || report.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Riwayat Upload Progress"
        description="Lihat seluruh laporan progress yang pernah dikirim oleh kelompok."
        actions={
          <Link href="/mahasiswa/project">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke My Project
            </Button>
          </Link>
        }
      />

      {!activeGroup ? (
        <Card className="rounded-2xl p-10 text-center text-sm text-muted">
          Anda belum terhubung dengan kelompok manapun.
        </Card>
      ) : (
        <>
          <FilterToolbar className="mb-6">
            <Input
              id="search-history"
              placeholder="Cari judul laporan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-[300px]"
            />
            <Select
              id="filter-status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-[190px]"
            />
          </FilterToolbar>

          <Card className="rounded-2xl p-5">
            <div className="divide-y divide-soft-gray-dark">
              {filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-muted">
                  Tidak ada laporan yang cocok dengan pencarian/filter.
                </p>
              )}
              {filtered.map((report) => {
                const { date, time } = formatDateTime(report.created_at);
                const status = report.status ?? "draft";
                return (
                  <div
                    key={report.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple/10 text-purple">
                        <FileText size={18} strokeWidth={2} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy">
                          {report.judul_laporan ?? "Laporan Progress"}
                        </p>
                        <p className="text-xs text-muted">
                          {date}, {time}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 pl-[52px] sm:pl-0">
                      <Badge variant={REPORT_STATUS_BADGE_VARIANT[status] ?? "gray"}>
                        {REPORT_STATUS_LABEL[status] ?? status}
                      </Badge>
                      <Link href={`/mahasiswa/project/history/${report.id}`}>
                        <Button variant="outline" size="sm">
                          Lihat Detail
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
