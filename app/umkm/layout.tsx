import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout";

export default function UmkmLayout({ children }: { children: ReactNode }) {
  return <RoleLayout role="umkm">{children}</RoleLayout>;
}
