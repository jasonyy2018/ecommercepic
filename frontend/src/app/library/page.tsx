"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"ALL" | "UPLOAD" | "GENERATED">("ALL");
  const [items, setItems] = useState<
    Array<{
      id: string;
      kind: "UPLOAD" | "GENERATED";
      type: string;
      url: string;
      material: string;
      taskName: string;
      productName: string;
      createdAt: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, type, limit: "80" });
      const res = await fetch(`/api/library/images?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "加载失败");
      setItems(json.items ?? []);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  const total = useMemo(() => items.length, [items]);

  return (
    <div className="w-full h-full p-10 flex flex-col gap-8 bg-[var(--carpet-bg-soft)]">
      <PageHeader title="图库与历史" actionLabel="刷新" onAction={load} />

      <div className="grid grid-cols-[1fr_280px] gap-4 flex-1 min-h-0">
        <section className="carpet-card p-4 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 carpet-input"
              placeholder="搜索任务名、logo、材质…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="carpet-input w-[160px]" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="ALL">全部类型</option>
              <option value="UPLOAD">上传图</option>
              <option value="GENERATED">生成图</option>
            </select>
            <button className="carpet-btn-secondary px-3 py-2 text-sm" onClick={load}>
              搜索
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 overflow-y-auto">
            {loading ? <div className="text-sm text-[var(--carpet-text-muted)]">加载中...</div> : null}
            {error ? <div className="text-sm text-[#B42318]">{error}</div> : null}
            {!loading &&
              !error &&
              items.map((img, i) => (
                <div key={img.id} className="carpet-card p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-32 w-full object-cover border border-[var(--carpet-border)] rounded-[4px] bg-[#f2f4fa]"
                  />
                  <div className="mt-2 text-xs text-[var(--carpet-text)]">
                    图 {String(i + 1).padStart(2, "0")}｜{img.kind}
                  </div>
                  <div className="text-[11px] text-[var(--carpet-text-muted)]">
                    {img.type}
                    {img.material ? `｜${img.material}` : ""}
                  </div>
                  <div className="text-[11px] text-[var(--carpet-text-muted)] mt-1 truncate">{img.taskName}</div>
                </div>
              ))}
          </div>
        </section>

        <aside className="carpet-card p-4 flex flex-col gap-3">
          <div className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">快速筛选</div>
          <div className="flex gap-1.5 flex-wrap">
            <span className="carpet-tag carpet-tag-info">材质: 圈绒</span>
            <span className="carpet-tag carpet-tag-success">状态: 已完成</span>
            <span className="carpet-tag carpet-tag-warning">待审核</span>
          </div>
          <div className="carpet-card p-3">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">下载与导出</div>
            <div className="text-xs text-[var(--carpet-text-muted)] mt-1">
              共 {total} 张图。支持批量下载、导出 Prompt 与元数据。
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

