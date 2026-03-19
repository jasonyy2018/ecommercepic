"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";

export default function SettingsPage() {
  const [form, setForm] = useState({
    textModelKey: "",
    imageModelKey: "",
    videoModelKey: "",
    uploadDir: "",
    maxConcurrency: "3",
    defaultRatios: "1:1,3:4,16:9",
    brandName: "",
    watermark: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const patch = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const load = async () => {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.settings) {
      setForm((p) => ({ ...p, ...json.settings }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "保存失败");
      setMessage("设置已保存");
    } catch (e: any) {
      setMessage(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const testDb = async () => {
    setMessage(null);
    const res = await fetch("/api/settings/test-db", { cache: "no-store" });
    const json = await res.json();
    setMessage(json?.message || (res.ok ? "连接正常" : "连接失败"));
  };

  return (
    <div className="w-full h-full p-10 flex flex-col gap-8 bg-[var(--carpet-bg-soft)]">
      <PageHeader title="系统设置" />

      <div className="grid grid-cols-2 gap-4">
        <section className="carpet-card p-4">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">模型供应商</h3>
          <div className="mt-3 space-y-2">
            <input className="w-full carpet-input" placeholder="Text Model API Key" value={form.textModelKey} onChange={(e) => patch("textModelKey", e.target.value)} />
            <input className="w-full carpet-input" placeholder="Image Model API Key" value={form.imageModelKey} onChange={(e) => patch("imageModelKey", e.target.value)} />
            <input className="w-full carpet-input" placeholder="Video Model API Key（可选）" value={form.videoModelKey} onChange={(e) => patch("videoModelKey", e.target.value)} />
          </div>
        </section>

        <section className="carpet-card p-4">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">存储与并发</h3>
          <div className="mt-3 space-y-2">
            <input className="w-full carpet-input" placeholder="UPLOAD_DIR / S3 Bucket" value={form.uploadDir} onChange={(e) => patch("uploadDir", e.target.value)} />
            <input className="w-full carpet-input" placeholder="最大并发任务数（默认 3）" value={form.maxConcurrency} onChange={(e) => patch("maxConcurrency", e.target.value)} />
            <input className="w-full carpet-input" placeholder="默认输出比例（1:1,3:4...）" value={form.defaultRatios} onChange={(e) => patch("defaultRatios", e.target.value)} />
          </div>
        </section>
      </div>

      <section className="carpet-card p-4">
        <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">品牌与水印</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input className="carpet-input" placeholder="默认品牌名" value={form.brandName} onChange={(e) => patch("brandName", e.target.value)} />
          <input className="carpet-input" placeholder="水印文案（可选）" value={form.watermark} onChange={(e) => patch("watermark", e.target.value)} />
        </div>
      </section>

      <div className="flex gap-2">
        <Button variant="carpetPrimary" className="h-auto py-3 px-6" onClick={save} disabled={saving}>
          保存设置
        </Button>
        <Button variant="carpetSecondary" className="h-auto py-3 px-6" onClick={testDb}>
          测试连接
        </Button>
        {message ? <div className="self-center text-sm text-[var(--carpet-text-muted)]">{message}</div> : null}
      </div>
    </div>
  );
}

