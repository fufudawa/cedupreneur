"use client";

import { use, useEffect, useState, Fragment, type ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Badge, Button, ProgressBar } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { useDosenKelompokBimbingan } from "@/lib/useDosenKelompokBimbingan";
import { ADMIN_GROUP_STATUS_LABEL, ADMIN_GROUP_STATUS_VARIANT } from "@/lib/adminDashboardData";

const LAPORAN_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Feedback",
  reviewed: "Selesai Direview",
};

const LAPORAN_STATUS_VARIANT: Record<string, "gray" | "orange" | "green"> = {
  draft: "gray",
  submitted: "orange",
  reviewed: "green",
};

const LAPORAN_PROGRESS_BUCKET = "laporan-progress";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

interface LaporanRow {
  id: string;
  judulLaporan: string;
  status: string | null;
  fileUrl: string | null;
  tanggalSubmit: string | null;
  createdAt: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function DetailKelompokPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groups, isHydrated } = useDosenKelompokBimbingan();

  const [laporanList, setLaporanList] = useState<LaporanRow[]>([]);
  const [laporanError, setLaporanError] = useState<string | null>(null);
  const [openingLaporanId, setOpeningLaporanId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLaporan() {
      try {
        const { data, error } = await supabase
          .from("laporan_progress")
          .select("id, judul_laporan, status, file_url, tanggal_submit, created_at")
          .eq("kelompok_id", id)
          .neq("status", "draft")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const rows: LaporanRow[] = (data ?? []).map((l) => ({
          id: l.id as string,
          judulLaporan: (l.judul_laporan as string | null) ?? "Laporan Progress",
          status: l.status as string | null,
          fileUrl: l.file_url as string | null,
          tanggalSubmit: l.tanggal_submit as string | null,
          createdAt: l.created_at as string | null,
        }));
        if (isMounted) setLaporanList(rows);
      } catch (error) {
        console.error("Failed to load laporan mahasiswa (cek RLS SELECT laporan_progress):", error);
        if (isMounted) setLaporanList([]);
      }
    }

    loadLaporan();

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function handleOpenLaporanFile(laporanId: string, path: string) {
    setLaporanError(null);
    setOpeningLaporanId(laporanId);
    try {
      const { data, error } = await supabase.storage
        .from(LAPORAN_PROGRESS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
      if (error || !data) throw error ?? new Error("Signed URL kosong.");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open laporan file (cek RLS storage.objects untuk bucket laporan-progress):", error);
      setLaporanError("Gagal membuka file laporan. Silakan coba lagi.");
    } finally {
      setOpeningLaporanId(null);
    }
  }

  if (!isHydrated) {
    return null;
  }

  const group = groups.find((g) => g.id === id);
  if (!group) {
    notFound();
  }

  const latestLaporan = laporanList[0] ?? null;

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
          Laporan terakhir:{" "}
          <span className="font-medium text-navy">
            {latestLaporan ? latestLaporan.judulLaporan : "Belum ada laporan"}
          </span>
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

      <Card className="mt-6 min-w-0 rounded-2xl p-6">
        <p className="text-base font-semibold text-navy">Laporan Mahasiswa</p>
        <p className="mt-0.5 text-xs text-muted">Laporan progress yang sudah dikirim kelompok ini.</p>

        {laporanError && <p className="mt-2 text-xs font-medium text-red-600">{laporanError}</p>}

        {laporanList.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Belum ada laporan yang dikirim untuk kelompok ini.</p>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-soft-gray-dark">
            {laporanList.map((laporan) => (
              <div
                key={laporan.id}
                className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy">{laporan.judulLaporan}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {laporan.tanggalSubmit ?? laporan.createdAt
                      ? formatDate((laporan.tanggalSubmit ?? laporan.createdAt) as string)
                      : "-"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant={LAPORAN_STATUS_VARIANT[laporan.status ?? "draft"] ?? "gray"}>
                    {LAPORAN_STATUS_LABEL[laporan.status ?? "draft"] ?? laporan.status}
                  </Badge>
                  {laporan.fileUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={openingLaporanId === laporan.id}
                      onClick={() => handleOpenLaporanFile(laporan.id, laporan.fileUrl as string)}
                    >
                      {openingLaporanId === laporan.id ? "Membuka..." : "Buka File"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
