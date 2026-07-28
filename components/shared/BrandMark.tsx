import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div className={cn("relative", className)}>
      <Image
        src="/images/brand/logo-cedupreneur-v2.png"
        alt="CEdupreneur"
        width={6000}
        height={4219}
        priority
        unoptimized
        className="h-auto w-full object-contain"
      />
    </div>
  );
}
