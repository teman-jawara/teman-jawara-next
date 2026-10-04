import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

const fieldStyles =
  "w-full rounded-lg border border-navy-200 bg-white px-3.5 text-sm text-navy-900 placeholder:text-muted/70 transition-colors hover:border-navy-500 focus-visible:border-navy-600 disabled:cursor-not-allowed disabled:bg-surface";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldStyles, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(fieldStyles, "min-h-28 py-2.5", className)} {...props} />
  );
}
