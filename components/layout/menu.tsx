import { LayoutGrid, ClipboardList, Store, Users, BookOpen, Network, Activity, MessageSquare, UserCircle } from "lucide-react";
import type { Role } from "@/types";
import type { SidebarMenuItem } from "./Sidebar";

const iconProps = { size: 18, strokeWidth: 2 };

export const ROLE_MENU: Record<Role, SidebarMenuItem[]> = {
  admin: [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <LayoutGrid {...iconProps} />,
      // /admin/aktivitas is opened from the Dashboard's "Aktivitas Terbaru"
      // section, not a Monitoring submenu, so it must keep Dashboard highlighted.
      activeMatchPrefixes: ["/admin/aktivitas"],
    },
    { label: "Pengguna", href: "/admin/pengguna", icon: <Users {...iconProps} /> },
    { label: "Data Master", href: "/admin/data-master", icon: <BookOpen {...iconProps} /> },
    { label: "Relasi Kelas", href: "/admin/relasi-kelas", icon: <Network {...iconProps} /> },
    { label: "Monitoring", href: "/admin/monitoring", icon: <Activity {...iconProps} /> },
  ],
  dosen: [
    { label: "Dashboard", href: "/dosen/dashboard", icon: <LayoutGrid {...iconProps} /> },
    { label: "Project", href: "/dosen/project", icon: <ClipboardList {...iconProps} /> },
    {
      label: "Mentoring",
      href: "/dosen/mentoring-feedback",
      icon: <MessageSquare {...iconProps} />,
    },
  ],
  mahasiswa: [
    { label: "Dashboard", href: "/mahasiswa/dashboard", icon: <LayoutGrid {...iconProps} /> },
    { label: "Project", href: "/mahasiswa/project", icon: <ClipboardList {...iconProps} /> },
    { label: "Profil Mitra", href: "/mahasiswa/profile-mitra", icon: <Store {...iconProps} /> },
  ],
  umkm: [
    { label: "Dashboard", href: "/umkm/dashboard", icon: <LayoutGrid {...iconProps} /> },
    {
      label: "Mentoring",
      href: "/umkm/mentoring",
      icon: <MessageSquare {...iconProps} />,
    },
    { label: "Profile Usaha", href: "/umkm/profile-usaha", icon: <UserCircle {...iconProps} /> },
  ],
};
