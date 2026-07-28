import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconClassName?: string;
  iconSizeClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  className?: string;
  /** Optional colored bar along the card's bottom edge, e.g. "bg-purple". Omit for the default (no accent). */
  accentClassName?: string;
}

export function StatCard({
  label,
  value,
  icon,
  iconClassName,
  iconSizeClassName,
  labelClassName,
  valueClassName,
  className,
  accentClassName,
}: StatCardProps) {
  return (
    <Card className={cn("relative flex items-center justify-between overflow-hidden", className)}>
      <div>
        <p className={labelClassName ?? "text-sm text-gray-500"}>{label}</p>
        <p className={valueClassName ?? "mt-1 text-2xl font-bold text-navy"}>{value}</p>
      </div>
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            iconSizeClassName ?? "h-11 w-11",
            iconClassName ?? "bg-purple/10 text-purple"
          )}
        >
          {icon}
        </div>
      )}
      {accentClassName && <span className={cn("absolute inset-x-0 bottom-0 h-1", accentClassName)} />}
    </Card>
  );
}
