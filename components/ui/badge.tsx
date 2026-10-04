import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeTone = "navy" | "gold" | "neutral";

const toneStyles: Record<BadgeTone, string> = {
  navy: "bg-navy-100 text-navy-800",
  gold: "bg-gold-100 text-navy-900",
  neutral: "bg-surface text-muted border border-line",
};

type BadgeProps = ComponentProps<"span"> & { tone?: BadgeTone };

export function Badge({ tone = "navy", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
