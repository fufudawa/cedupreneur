import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "purple" | "orange" | "navy" | "gray" | "green" | "red" | "blue" | "pink" | "cyan";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  purple: "bg-purple/10 text-purple",
  orange: "bg-orange/10 text-orange",
  navy: "bg-navy/10 text-navy",
  gray: "bg-soft-gray-dark text-gray-600",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  pink: "bg-pink/10 text-pink",
  cyan: "bg-cyan-100 text-cyan-700",
};

export function Badge({ variant = "gray", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
