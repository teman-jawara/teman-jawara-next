import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon = "search", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-gold-100 text-navy-800">
        <Icon name={icon} className="size-6" />
      </span>
      <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
