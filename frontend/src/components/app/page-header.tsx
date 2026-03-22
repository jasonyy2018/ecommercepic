"use client";

import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function PageHeader({ title, subtitle, actionLabel, onAction }: PageHeaderProps) {
  return (
    <header className="flex justify-between items-start gap-6 w-full">
      <div className="flex flex-col gap-1 min-w-0">
        <h2 className="font-space-grotesk text-[34px] font-medium tracking-tight text-[var(--carpet-text)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm text-[var(--carpet-text-muted)] max-w-2xl">{subtitle}</p>
        ) : null}
      </div>
      {actionLabel ? (
        <Button
          variant="carpetAccent"
          onClick={onAction}
          className="px-5 py-2.5 font-space-grotesk font-medium h-auto"
        >
          {actionLabel}
        </Button>
      ) : null}
    </header>
  );
}

