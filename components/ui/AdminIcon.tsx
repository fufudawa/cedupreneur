import { ShieldUser } from "lucide-react";

interface AdminIconProps {
  className?: string;
}

export function AdminIcon({ className = "h-6 w-6" }: AdminIconProps) {
  return <ShieldUser className={className} strokeWidth={2} />;
}
