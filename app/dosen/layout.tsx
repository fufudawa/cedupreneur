import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout";

export default function DosenLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="dosen">{children}</RoleLayout>;
}
