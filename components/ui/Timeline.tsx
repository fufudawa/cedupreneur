import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  status?: "belum" | "proses" | "selesai";
}

interface TimelineProps {
  items: TimelineItem[];
  dense?: boolean;
}

function TimelineDot({ status }: { status: TimelineItem["status"] }) {
  if (status === "selesai") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple ring-4 ring-white">
        <Check size={18} strokeWidth={3} className="text-white" />
      </span>
    );
  }
  if (status === "proses") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-orange bg-white ring-4 ring-white">
        <span className="h-3.5 w-3.5 rounded-full bg-purple" />
      </span>
    );
  }
  return <span className="h-9 w-9 shrink-0 rounded-full border-2 border-gray-300 bg-white ring-4 ring-white" />;
}

export function Timeline({ items, dense = false }: TimelineProps) {
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <TimelineDot status={item.status} />
              {!isLast && <span className="mt-1 w-0.5 flex-1 bg-purple/30" />}
            </div>
            <div className={isLast ? "" : dense ? "pb-4" : "pb-[46px]"}>
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "text-[18px] font-semibold",
                    item.status === "proses" ? "text-purple" : "text-navy"
                  )}
                >
                  {item.title}
                </p>
                {item.date && <span className="text-xs text-gray-400">{item.date}</span>}
              </div>
              {item.description && (
                <p
                  className={cn(
                    "mt-1 text-[15px]",
                    item.status === "proses" ? "text-purple" : "text-gray-500"
                  )}
                >
                  {item.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
