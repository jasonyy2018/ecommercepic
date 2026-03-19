"use client";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

const colors = [
  { label: "Primary", value: "#0F172A", swatch: "#0F172A" },
  { label: "Accent", value: "#E42313", swatch: "#E42313" },
  { label: "Bg Soft", value: "#F7F8FC", swatch: "#F7F8FC" },
  { label: "Border", value: "#E6E8EE", swatch: "#E6E8EE" },
];

export default function DesignSystemPage() {
  return (
    <div className="w-full h-full p-10 flex flex-col gap-8 bg-[var(--carpet-bg-soft)]">
      <PageHeader title="Design Tokens｜组件规范" actionLabel="复制 Tailwind Token" />

      <div className="grid grid-cols-2 gap-4">
        <section className="carpet-card p-4">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">Color Tokens</h3>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {colors.map((c) => (
              <div key={c.label} className="carpet-card p-2">
                <div className="h-7 rounded-[4px] border border-[var(--carpet-border)]" style={{ background: c.swatch }} />
                <div className="text-[11px] text-[var(--carpet-text)] mt-1">{c.label}</div>
                <div className="text-[10px] text-[var(--carpet-text-muted)]">{c.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="carpet-card p-4">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">Typography Tokens</h3>
          <div className="mt-3 space-y-1.5">
            <div className="font-space-grotesk text-[34px] leading-none text-[var(--carpet-text)]">H1 34/500 Space Grotesk</div>
            <div className="font-space-grotesk text-[16px] font-semibold text-[var(--carpet-text)]">Title 16/600 Space Grotesk</div>
            <div className="font-inter text-[12px] text-[var(--carpet-text)]">Body 12/400 Inter</div>
            <div className="font-inter text-[10px] text-[var(--carpet-text-muted)]">Caption 10/400 Inter</div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
        <section className="carpet-card p-4">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">Components</h3>
          <div className="flex gap-2 mt-3">
            <Button variant="carpetPrimary" className="h-auto py-2">
              Primary
            </Button>
            <Button variant="carpetSecondary" className="h-auto py-2">
              Secondary
            </Button>
            <Button disabled variant="carpetSecondary" className="h-auto py-2">
              Disabled
            </Button>
          </div>
          <div className="mt-4 carpet-card p-3 w-[260px]">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">Node Card / Default</div>
            <div className="text-xs text-[var(--carpet-text-muted)] mt-1">输入层：上传 Logo / 样机</div>
          </div>
        </section>

        <aside className="carpet-card p-4">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">Spacing / Radius / Border</h3>
          <div className="text-xs text-[var(--carpet-text)] mt-3">Spacing: 4 / 8 / 12 / 16 / 24 / 32</div>
          <div className="text-xs text-[var(--carpet-text)] mt-1">Radius: 0 / 6 / 10 / 14</div>
          <div className="text-xs text-[var(--carpet-text)] mt-1">Border: #E6E8EE / 1px</div>
          <div className="text-xs text-[var(--carpet-text)] mt-1">Shadow: none（轻量后台风格）</div>

          <div className="carpet-card p-3 mt-4">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">Tailwind 建议变量</div>
            <pre className="text-[10px] text-[var(--carpet-text-muted)] mt-2 whitespace-pre-wrap">
{`--color-primary:#0F172A
--color-accent:#E42313
--color-border:#E6E8EE
--color-bg-soft:#F7F8FC`}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}

