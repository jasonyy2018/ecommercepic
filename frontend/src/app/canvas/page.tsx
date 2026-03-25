"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { formatClientError, parseJsonResponse } from "@/lib/safe-json-response";
import { LovartLikeCanvas, type LovartLikeCanvasHandle } from "@/components/canvas/lovart-like-canvas";

type AssetRow = {
  id: string;
  taskId: string;
  taskName: string;
  url: string;
  type: string;
  material: string;
};

export default function CanvasPage() {
  const router = useRouter();
  const editorRef = useRef<LovartLikeCanvasHandle | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);

  const loadAssets = useCallback(async (id?: string | null) => {
    setError(null);
    try {
      const q = id ? `?taskId=${encodeURIComponent(id)}` : "";
      const res = await fetch(`/api/canvas/assets${q}`, { cache: "no-store" });
      const json = await parseJsonResponse<{ error?: string; items?: AssetRow[] }>(res);
      if (!res.ok) throw new Error(json?.error || "加载素材失败");
      setAssets(json.items ?? []);
    } catch (e: unknown) {
      setError(formatClientError(e) || "加载素材失败");
    }
  }, []);

  const ensureDraftTask = async () => {
    if (taskId) return taskId;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "draft",
        product: { name: "画布编辑任务", aspectRatios: ["1:1"] },
      }),
    });
    const json = await parseJsonResponse<{ error?: string; task: { id: string } }>(res);
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
      const json = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error || "上传失败");
      await loadAssets(id);
    } catch (e: unknown) {
      setError(formatClientError(e) || "上传失败");
    }
  };

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const bindEditor = useCallback((h: LovartLikeCanvasHandle) => {
    editorRef.current = h;
  }, []);

  const onAddImage = async (url: string, mode: "background" | "layer") => {
    const ed = editorRef.current;
    if (!ed) return;
    setBusyAssetId(url);
    try {
      await ed.addImageFromUrl(url, { asBackground: mode === "background" });
    } finally {
      setBusyAssetId(null);
    }
  };

  return (
    <div className="w-full h-full p-10 flex flex-col gap-8 bg-[var(--carpet-bg-soft)] min-h-0">
      <PageHeader
        title="画布模式｜电商主图编辑台"
        subtitle="Fabric 引擎：图片图层 + 可编辑文字（双击改字）、缩放排序、导出 PNG。Alt+滚轮缩放。"
        actionLabel="打开工作流看板"
        onAction={() => router.push("/workflow")}
      />

      <div className="flex gap-4 w-full flex-1 min-h-0">
        <aside className="w-[300px] carpet-card p-4 flex flex-col gap-4 shrink-0 min-h-0">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">素材库</h3>
          <div className="carpet-card p-3 flex flex-col gap-2 shrink-0">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">上传（Logo / 产品图）</div>
            <label className="carpet-panel p-3 text-xs text-[var(--carpet-text-muted)] cursor-pointer hover:bg-[#f1f4fb] rounded-[6px]">
              点击或拖拽上传
              <input
                type="file"
                className="hidden"
                accept=".svg,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => void uploadFiles(e.target.files)}
              />
            </label>
            {taskId ? (
              <button
                type="button"
                className="text-[11px] text-[var(--carpet-primary)] underline text-left"
                onClick={() => void loadAssets(taskId)}
              >
                仅显示本任务素材
              </button>
            ) : null}
            {error ? <div className="text-[11px] text-[#B42318]">{error}</div> : null}
          </div>

          <div className="carpet-card p-3 flex flex-col gap-2 flex-1 min-h-0">
            <div className="text-xs font-semibold text-[var(--carpet-text)]">已上传</div>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
              {assets.length === 0 ? (
                <p className="text-[11px] text-[var(--carpet-text-muted)]">暂无素材，请先上传或从任务同步。</p>
              ) : (
                assets.map((a) => (
                  <div key={a.id} className="border border-[var(--carpet-border)] rounded-[6px] p-2 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt="" className="w-full h-20 object-cover rounded-[4px] bg-[#FAFAFA]" />
                    <div className="text-[10px] text-[var(--carpet-text-muted)] mt-1 truncate" title={a.taskName}>
                      {a.type}｜{a.taskName}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <button
                        type="button"
                        disabled={busyAssetId === a.url}
                        className="text-[10px] px-2 py-1 rounded border border-[var(--carpet-border)] bg-[var(--carpet-bg-soft)] hover:bg-white disabled:opacity-50"
                        onClick={() => void onAddImage(a.url, "background")}
                      >
                        铺满画布
                      </button>
                      <button
                        type="button"
                        disabled={busyAssetId === a.url}
                        className="text-[10px] px-2 py-1 rounded border border-[var(--carpet-border)] bg-[var(--carpet-bg-soft)] hover:bg-white disabled:opacity-50"
                        onClick={() => void onAddImage(a.url, "layer")}
                      >
                        新图层
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="carpet-card p-3 text-[11px] text-[var(--carpet-text-muted)] space-y-1">
            <p>
              <strong className="text-[var(--carpet-text)]">与 Lovart 的差异</strong>：当前为浏览器内 Fabric
              编辑器，支持实拍合成与文字排版；未接云端 AI 扩图/消除。后续可接「选中区域 → 调用生图 API」。
            </p>
          </div>
        </aside>

        <section className="flex-1 carpet-panel p-4 flex flex-col gap-3 min-w-0 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">编辑画布</h3>
            <div className="flex gap-2">
              <Button
                variant="carpetSecondary"
                className="h-auto py-2 text-xs"
                onClick={() => editorRef.current?.addText()}
              >
                添加文字
              </Button>
              <Button
                variant="carpetPrimary"
                className="h-auto py-2 text-xs"
                onClick={() => {
                  const data = editorRef.current?.exportPng();
                  if (!data) return;
                  const a = document.createElement("a");
                  a.href = data;
                  a.download = `ecommerce-canvas-${Date.now()}.png`;
                  a.click();
                }}
              >
                导出 PNG
              </Button>
            </div>
          </div>
          <LovartLikeCanvas exposeHandle={bindEditor} />
        </section>

        <aside className="w-[280px] carpet-card p-4 flex flex-col gap-3 shrink-0 text-xs text-[var(--carpet-text-muted)]">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">快捷说明</h3>
          <ul className="list-disc pl-4 space-y-2">
            <li>选中文字后，右侧属性区可改文案、字号、颜色、字体、字重。</li>
            <li>在画布上<strong>双击文字</strong>进入行内编辑（与 Lovart 类工具一致）。</li>
            <li>图片支持拖拽移动、角点缩放与旋转。</li>
            <li>
              <kbd className="px-1 bg-[var(--carpet-bg-soft)] rounded border">Delete</kbd> 删除选中对象。
            </li>
            <li>
              按住 <kbd className="px-1 bg-[var(--carpet-bg-soft)] rounded border">Alt</kbd> 滚轮缩放画布。
            </li>
          </ul>
          <Button variant="carpetSecondary" className="h-auto py-3 mt-auto text-xs" onClick={() => router.push("/generate")}>
            去 AI 场景生成
          </Button>
        </aside>
      </div>
    </div>
  );
}
