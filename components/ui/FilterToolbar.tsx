import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Compact, consistent container for a page's search + filter row (search
 * input, one or more Select filters, optional action button). Fields size to
 * their own content/className instead of stretching to fill the container.
 */
export function FilterToolbar({ className, children, ...props }: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-soft-gray-dark bg-white p-4 md:flex-row md:flex-wrap md:items-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
