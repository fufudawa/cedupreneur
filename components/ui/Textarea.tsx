import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-navy">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={4}
        className={cn(
          "rounded-xl border border-soft-gray-dark bg-white px-3.5 py-2 text-sm text-navy outline-none transition-colors placeholder:text-gray-400 focus:border-purple",
          className
        )}
        {...props}
      />
    </div>
  );
}
