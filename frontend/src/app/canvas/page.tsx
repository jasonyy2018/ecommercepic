"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export default function CanvasPage() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [assets, setAssets] = useState<
    Array<{ id: string; taskId: string; taskName: string; url: string; type: string; material: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = async (id?: string | null) => {
    setError(null);
    try {
      const q = id ? `?taskId=${encodeURIComponent(id)}` : "";
      const res = await fetch(`/api/canvas/assets${q}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "加载素材失败");
      setAssets(json.items ?? []);
    } catch (e: any) {
      setError(e?.message || "加载素材失败");
    }
  };

  const ensureDraftTask = async () => {
    if (taskId) return taskId;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "draft",
        product: { name: "Canvas 草稿任务", aspectRatios: ["1:1"] },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "创建草稿失败");
    setTaskId(json.task.id);
    return json.task.id as string;
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const id = await ensureDraftTask();
      const fd = new FormData();
      fd.set("taskId", id);
      fd.set("type", "DISPLAY");
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "上传失败");
      await loadAssets(id);
    } catch (e: any) {
      setError(e?.message || "上传失败");
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const layerRows = useMemo(
    () =>
      assets.slice(0, 8).map((a, idx) => ({
        id: a.id,
        name: `${a.type} 图层 ${idx + 1}`,
        status: idx === 0 ? "可见" : "可见",
      })),
    [assets]
  );

  return (
    <div className="w-full h-full p-10 flex flex-col gap-8 bg-[var(--carpet-bg-soft)]">
      <PageHeader title="画布模式｜Logo 地毯创作台" actionLabel="发布到工作流" />

      <div className="flex gap-4 w-full flex-1 min-h-0">
        <aside className="w-[280px] carpet-card p-4 flex flex-col gap-4 min-h-0">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">素材与图层</h3>
          <div className="carpet-card p-3 flex flex-col gap-2">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">上传区（Logo / SVG / PNG）</div>
            <label className="carpet-panel p-4 text-xs text-[var(--carpet-text-muted)] cursor-pointer hover:bg-[#f1f4fb]">
              拖拽到这里 / 点击上传
              <input
                type="file"
                className="hidden"
                accept=".svg,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => uploadFiles(e.target.files)}
              />
            </label>
            {error ? <div className="text-[11px] text-[#B42318]">{error}</div> : null}
          </div>

          <div className="carpet-card p-3 flex flex-col gap-2 min-h-0">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">图层</div>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
              {(layerRows.length ? layerRows : [{ id: "empty", name: "暂无图层，请先上传素材", status: "—" }]).map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  disabled={layer.id === "empty"}
                  className={`text-left px-3 py-2 text-xs rounded-[6px] border ${
                    activeLayer === layer.id
                      ? "border-[var(--carpet-accent)] bg-[#fff5f3]"
                      : "border-[var(--carpet-border)] bg-white"
                  }`}
                >
                  <div className="font-semibold text-[var(--carpet-text)]">{layer.name}</div>
                  <div className="text-[var(--carpet-text-muted)] mt-0.5">{layer.status}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="carpet-card p-3 flex flex-col gap-2">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">标签风格</div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="carpet-tag carpet-tag-info">材质: 圈绒</span>
              <span className="carpet-tag carpet-tag-success">已对齐</span>
              <span className="carpet-tag carpet-tag-warning">待审核</span>
            </div>
          </div>
        </aside>

        <section className="flex-1 carpet-panel p-3 flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between text-xs text-[var(--carpet-text-muted)]">
            <span>画布 1200x1200｜缩放 100%</span>
            <div className="flex gap-2">
              <span className="carpet-tag carpet-tag-info">智能对齐</span>
              <span className="carpet-tag carpet-tag-info">安全边距</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-[#ebeff9] border border-[var(--carpet-border)] rounded-[6px] flex items-center justify-center">
            <div className="w-[620px] h-[620px] bg-white border border-[#c9cfdf] rounded-[6px] flex flex-col items-center justify-center gap-2">
              {assets[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assets[0].url} alt="" className="w-[520px] h-[360px] object-cover border border-[var(--carpet-border)] rounded-[4px]" />
              ) : null}
              <div className="text-sm text-[var(--carpet-text-muted)]">地毯平铺样机 + Logo 可编辑区域</div>
              <div className="text-xs text-[var(--carpet-text-muted)]">支持拖拽缩放、排版、配色、材质替换</div>
            </div>
          </div>
        </section>

        <aside className="w-[320px] carpet-card p-4 flex flex-col gap-3 min-h-0">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">属性面板</h3>

          <div className="carpet-card p-3">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">Logo 调整</div>
            <div className="text-xs text-[var(--carpet-text-muted)] mt-1">大小 78%｜旋转 0°｜透明度 100%</div>
          </div>
          <div className="carpet-card p-3">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">材质 / 颜色</div>
            <div className="text-xs text-[var(--carpet-text-muted)] mt-1">圈绒｜深灰 #4A4A4A</div>
          </div>
          <div className="carpet-card p-3">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">排版</div>
            <div className="text-xs text-[var(--carpet-text-muted)] mt-1">居中排版｜边距 32px｜重复: 关闭</div>
          </div>

          <div className="carpet-card p-3">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">交互状态规范</div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <span className="carpet-tag bg-[#0f172a] text-white">默认</span>
              <span className="carpet-tag bg-[#1e293b] text-white">悬停</span>
              <span className="carpet-tag border border-[#0f172a] text-[#0f172a] bg-white">选中</span>
              <span className="carpet-tag bg-[#f3f4f7] text-[#9aa2b1] border border-[#e5e7ee]">禁用</span>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button variant="carpetPrimary" className="h-auto py-3">
              生成效果图
            </Button>
            <Button variant="carpetSecondary" className="h-auto py-3">
              导出 SVG / CDR
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

