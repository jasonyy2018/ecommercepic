"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type TaskRow = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  finishedCount: number;
  totalCount: number;
  productName: string;
};

export default function TasksPage() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "RUNNING" | "DONE">("ALL");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const json = await res.json();
      if (cancelled) return;
      setItems(json.items ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((t) => (status === "ALL" ? true : t.status === status))
      .filter((t) => {
        const q = query.trim();
        if (!q) return true;
        return (t.name + " " + t.productName).toLowerCase().includes(q.toLowerCase());
      });
  }, [items, query, status]);

  return (
    <div className="w-full h-full p-10 flex flex-col gap-12 bg-[var(--carpet-bg-soft)]">
      <header className="flex justify-between items-center w-full">
        <h2 className="font-space-grotesk text-[40px] font-medium tracking-tight text-[#0D0D0D]">
          任务列表
        </h2>
        <Link href="/create">
          <Button variant="carpetAccent" className="px-5 py-2.5 font-space-grotesk font-medium h-auto">
            新建任务
          </Button>
        </Link>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <input
            className="flex-1 carpet-input p-3 font-inter text-sm"
            placeholder="搜索任务名称/商品…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2 border border-[var(--carpet-border)] rounded-[6px] p-1 bg-white">
            {[
              { id: "ALL", label: "全部" },
              { id: "RUNNING", label: "进行中" },
              { id: "DONE", label: "已完成" },
            ].map((x) => (
              <button
                key={x.id}
                onClick={() => setStatus(x.id as any)}
                className={`px-3 py-1.5 font-inter text-xs border ${
                  status === (x.id as any)
                    ? "bg-[#FAFAFA] border-[var(--carpet-border)] text-[#0D0D0D]"
                    : "bg-white border-transparent text-[#7A7A7A]"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>

        <div className="carpet-card">
          <div className="grid grid-cols-[1fr_120px_120px_200px_100px] gap-3 bg-[#FAFAFA] p-3 text-xs font-inter font-semibold text-[#0D0D0D]">
            <div>任务名称</div>
            <div>状态</div>
            <div>进度</div>
            <div>创建时间</div>
            <div>操作</div>
          </div>
          {filtered.length === 0 ? (
            <div className="p-6 text-sm font-inter text-[#7A7A7A]">暂无任务</div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[1fr_120px_120px_200px_100px] gap-3 p-3 border-t border-[#E8E8E8] text-sm font-inter"
              >
                <div className="text-[#0D0D0D]">{t.name}</div>
                <div className={t.status === "RUNNING" ? "text-[#E42313]" : "text-[#0D0D0D]"}>
                  {t.status === "RUNNING" ? "进行中" : t.status === "DONE" ? "已完成" : t.status}
                </div>
                <div className="text-[#0D0D0D]">
                  {t.finishedCount}/{t.totalCount}
                </div>
                <div className="text-[#7A7A7A]">{new Date(t.createdAt).toLocaleString("zh-CN")}</div>
                <Link className="text-[#0D0D0D] hover:underline" href={`/tasks/${t.id}`}>
                  查看详情
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

