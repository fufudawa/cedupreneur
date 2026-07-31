// UMKM's validation verdict on a laporan ("Sesuai"/"Perlu Penyesuaian"), kept
// as its own type since it's shared across the UMKM mentoring pages and
// ValidasiBadge. Stored for real in feedback.jenis_feedback ("sesuai" /
// "perlu_penyesuaian") — see lib/useAdminMonitoring.ts and
// app/umkm/mentoring/[id]/[laporanId]/page.tsx for the actual read/write.
export type LaporanValidasiStatus = "tuntas" | "belum_tuntas";
