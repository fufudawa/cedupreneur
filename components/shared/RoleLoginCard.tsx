import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleLoginCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent: "purple" | "orange" | "pink";
}

const accentClasses: Record<RoleLoginCardProps["accent"], { bar: string; iconBg: string; iconText: string; arrowBg: string; arrowText: string }> = {
  purple: {
    bar: "bg-purple",
    iconBg: "bg-purple/10",
    iconText: "text-purple",
    arrowBg: "bg-purple/10",
    arrowText: "text-purple",
  },
  orange: {
    bar: "bg-orange",
    iconBg: "bg-orange/10",
    iconText: "text-orange",
    arrowBg: "bg-orange/10",
    arrowText: "text-orange",
  },
  pink: {
    bar: "bg-pink",
    iconBg: "bg-pink/10",
    iconText: "text-pink",
    arrowBg: "bg-pink/10",
    arrowText: "text-pink",
  },
};

export function RoleLoginCard({ href, title, description, icon, accent }: RoleLoginCardProps) {
  const classes = accentClasses[accent];

  return (
    <Link
      href={href}
      className="group relative flex items-center gap-5 overflow-hidden rounded-3xl border border-soft-gray-dark bg-white p-6 shadow-[0px_12px_30px_0px_rgba(23,18,46,0.06)] transition-shadow hover:shadow-[0px_16px_36px_0px_rgba(23,18,46,0.12)]"
    >
      <span className={cn("absolute left-0 top-0 h-full w-1 rounded-r-xl", classes.bar)} />
      <span
        className={cn(
          "flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full",
          classes.iconBg,
          classes.iconText
        )}
      >
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-xl font-bold text-navy sm:text-2xl">{title}</p>
        <p className="mt-1 text-sm text-muted sm:text-base">{description}</p>
      </div>
      <span
        className={cn(
          "flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-1",
          classes.arrowBg,
          classes.arrowText
        )}
      >
        <ArrowRight size={24} strokeWidth={2} />
      </span>
    </Link>
  );
}
