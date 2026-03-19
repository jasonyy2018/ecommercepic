"use client";

import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function PageHeader({ title, actionLabel, onAction }: PageHeaderProps) {
  return (
    <header className="flex justify-between items-center w-full">
      <h2 className="font-space-grotesk text-[34px] font-medium tracking-tight text-[var(--carpet-text)]">
        {title}
      </h2>
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

