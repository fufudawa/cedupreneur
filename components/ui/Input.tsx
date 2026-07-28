import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-navy">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "h-11 rounded-xl border border-soft-gray-dark bg-white px-4 text-sm text-navy outline-none transition-colors placeholder:text-gray-400 focus:border-purple focus:ring-2 focus:ring-purple/10",
          className
        )}
        {...props}
      />
    </div>
  );
}
