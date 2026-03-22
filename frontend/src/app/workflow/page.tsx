"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { formatClientError, parseJsonResponse } from "@/lib/safe-json-response";

function Metric({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      className={`carpet-card p-3 flex-1 ${emphasize ? "bg-[var(--carpet-primary)] border-[var(--carpet-primary)]" : ""}`}
    >
      <div className={`text-xs ${emphasize ? "text-[#CBD5E1]" : "text-[var(--carpet-text-muted)]"}`}>{label}</div>
      <div className={`font-space-grotesk text-2xl font-semibold mt-1 ${emphasize ? "text-white" : "text-[var(--carpet-text)]"}`}>
        {value}
      </div>
    </div>
  );
}

export default function WorkflowPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    metrics: { todayTasks: number; running: number; failed: number; successRate: string; avgProgress: number };
    queue: Array<{ id: string; name: string; status: string; finishedCount: number; totalCount: number; updatedAt: string }>;
    timeline: Array<{ at: string; text: string }>;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow/overview", { cache: "no-store" });
      const json = await parseJsonResponse<{
        error?: string;
        metrics?: NonNullable<typeof data>["metrics"];
        queue?: NonNullable<typeof data>["queue"];
        timeline?: NonNullable<typeof data>["timeline"];
      }>(res);
      if (!res.ok) throw new Error(json.error || "加载失败");
      if (!json.metrics) throw new Error("加载失败");
      setData({
        metrics: json.metrics,
        queue: json.queue ?? [],
        timeline: json.timeline ?? [],
      });
    } catch (e: unknown) {
      setError(formatClientError(e) || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const m = data?.metrics ?? { todayTasks: 0, running: 0, failed: 0, successRate: "0.0", avgProgress: 0 };

  return (
    <div className="w-full h-full p-10 flex flex-col gap-8 bg-[var(--carpet-bg-soft)]">
      <PageHeader title="工作流模式｜AI 出图流水线" actionLabel="刷新数据" onAction={load} />

      <div className="flex gap-3">
        <Metric label="今日任务" value={String(m.todayTasks)} emphasize />
        <Metric label="成功率" value={`${m.successRate}%`} />
        <Metric label="平均进度" value={`${m.avgProgress}%`} />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <section className="flex-1 carpet-panel p-4 flex flex-col gap-3 min-h-0">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">流程编排画布</h3>
          <div className="flex items-stretch gap-2">
            <NodeCard title="1. 输入层" desc="上传 Logo / 样机 / 竞品链接" />
            <Arrow />
            <NodeCard title="2. AI 处理层" desc="Prompt 生成 / Logo 融合 / 材质一致" />
            <Arrow />
            <NodeCard title="3. 输出层" desc="主图 / 车图 / SKU / 详情 / 视频" />
          </div>
          <div className="carpet-card p-3 flex-1 min-h-0">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">运行时间线</div>
            {loading ? <div className="mt-2 text-xs text-[var(--carpet-text-muted)]">加载中...</div> : null}
            {error ? <div className="mt-2 text-xs text-[#B42318]">{error}</div> : null}
            <div className="mt-2 text-xs text-[var(--carpet-text-muted)] space-y-1">
              {(data?.timeline ?? []).map((t) => (
                <div key={`${t.at}-${t.text}`}>
                  {new Date(t.at).toLocaleTimeString("zh-CN")}｜{t.text}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="w-[320px] carpet-card p-4 flex flex-col gap-3 min-h-0">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">任务队列 / 运行参数</h3>
          <div className="flex gap-1.5 flex-wrap">
            <span className="carpet-tag carpet-tag-info">节点: 默认</span>
            <span className="carpet-tag carpet-tag-success">运行中</span>
            <span className="carpet-tag bg-[#FEF3F2] text-[#B42318]">失败重试</span>
          </div>
          {(data?.queue ?? []).map((q) => (
            <QueueCard
              key={q.id}
              title={`${q.name}（${q.status}）`}
              desc={`${q.finishedCount}/${q.totalCount}｜${new Date(q.updatedAt).toLocaleString("zh-CN")}`}
            />
          ))}

          <div className="mt-auto flex flex-col gap-2">
            <Button variant="carpetPrimary" className="h-auto py-3">
              运行选中节点（排队）
            </Button>
            <Button variant="carpetSecondary" className="h-auto py-3">
              保存为模板
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function NodeCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="carpet-card p-3 flex-1">
      <div className="text-[11px] font-semibold text-[var(--carpet-text)]">{title}</div>
      <div className="text-xs text-[var(--carpet-text-muted)] mt-1">{desc}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="w-8 flex items-center justify-center text-[var(--carpet-text-muted)] text-lg">→</div>
  );
}

function QueueCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="carpet-card p-3">
      <div className="text-xs font-semibold text-[var(--carpet-text)]">{title}</div>
      <div className="text-xs text-[var(--carpet-text-muted)] mt-1">{desc}</div>
    </div>
  );
}

