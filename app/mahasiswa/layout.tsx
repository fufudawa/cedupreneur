import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout";

export default function MahasiswaLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="mahasiswa">{children}</RoleLayout>;
}
