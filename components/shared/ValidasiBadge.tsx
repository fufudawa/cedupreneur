import { Badge } from "@/components/ui";
import type { LaporanValidasiStatus } from "@/lib/umkmFeedbackStorage";

// UMKM's validation status (belum_tuntas/tuntas) is a separate concept from a
// laporan's submission status (Draft/Submitted/Reviewed/Revision/Approved, see
// StatusBadge) and from Timeline's selesai/proses/belum vocabulary — do not mix them.
// UMKM validation wording is intentionally distinct from Dosen's academic
// Tuntas/Belum Tuntas — "tuntas"/"belum_tuntas" stay as the internal enum
// values (no backend migration needed yet), only the displayed label differs.
const LABEL: Record<LaporanValidasiStatus, string> = {
  tuntas: "Sesuai",
  belum_tuntas: "Perlu Penyesuaian",
};

const VARIANT: Record<LaporanValidasiStatus, "green" | "orange"> = {
  tuntas: "green",
  belum_tuntas: "orange",
};

interface ValidasiBadgeProps {
  status: LaporanValidasiStatus;
}

export function ValidasiBadge({ status }: ValidasiBadgeProps) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
