"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import type { ProductImage, ProductImageType } from "@/lib/types";
import { formatClientError, parseJsonResponse } from "@/lib/safe-json-response";

const SCENES = [
  { value: "door_mat", label: "门口地垫 / 商铺门面" },
  { value: "carpet_living", label: "客厅地毯场景" },
  { value: "nonwoven_bag", label: "无纺布袋 / 手提袋" },
  { value: "tumbler", label: "保温杯 / 随行杯" },
  { value: "packaging", label: "包装纸盒 / 礼盒" },
  { value: "apparel", label: "服装平铺 / 上身" },
] as const;

type GenRow = {
  id: string;
  imageUrl: string;
  scene: string;
  prompt: string;
  status: string;
  resultUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
};

function defaultPrompt(scene: string) {
  const s = SCENES.find((x) => x.value === scene)?.label ?? scene;
  return `电商主图，${s}，自然光，干净背景，产品清晰、无变形，适合详情页与广告投放。`;
}

function sceneLabel(sceneKey: string) {
  return SCENES.find((x) => x.value === sceneKey)?.label ?? sceneKey;
}

export default function GeneratePage() {
  const [draftTaskId, setDraftTaskId] = useState<string | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploadType, setUploadType] = useState<ProductImageType>("DISPLAY");
  const [scene, setScene] = useState<string>(SCENES[0].value);
  const [prompt, setPrompt] = useState(() => defaultPrompt(SCENES[0].value));
  const [busy, setBusy] = useState<"idle" | "upload" | "gen">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GenRow | null>(null);
  const [history, setHistory] = useState<GenRow[]>([]);
  /** null = 尚未从接口拉取 */
  const [imageBackend, setImageBackend] = useState<"ark" | "cloudflare" | "placeholder" | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/generations?limit=30", { cache: "no-store" });
      const json = await parseJsonResponse<{
        error?: string;
        items?: GenRow[];
        workerConfigured?: boolean;
        imageBackend?: string;
      }>(res);
      if (!res.ok) throw new Error(json?.error || "加载历史失败");
      setHistory(json.items ?? []);
      if (json.imageBackend === "ark" || json.imageBackend === "cloudflare" || json.imageBackend === "placeholder") {
        setImageBackend(json.imageBackend);
      } else if (typeof json.workerConfigured === "boolean") {
        setImageBackend(json.workerConfigured ? "cloudflare" : "placeholder");
      }
    } catch {
      /* 历史非阻塞 */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setPrompt((prev) => {
      const def = defaultPrompt(scene);
      // 若用户未改过长句，跟随场景更新默认文案
      const wasDefault = SCENES.some((s) => prev === defaultPrompt(s.value));
      return wasDefault ? def : prev;
    });
  }, [scene]);

  const ensureDraftTask = async () => {
    if (draftTaskId) return draftTaskId;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "draft",
        product: {
          name: "AI 场景图 MVP",
          category: "mockup",
          sellingPoints: ["upload"],
          targetAudience: "mvp",
          scenesBusiness: ["门店"],
          scenesHome: ["玄关"],
          modelProfile: "—",
          aspectRatios: ["1:1"],
        },
      }),
    });
    const json = await parseJsonResponse<{ error?: string; task?: { id: string } }>(res);
    if (!res.ok) throw new Error(json?.error || "创建草稿失败");
    const id = json.task?.id as string | undefined;
    if (!id) throw new Error("创建草稿失败");
    setDraftTaskId(id);
    return id;
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setBusy("upload");
    try {
      const taskId = await ensureDraftTask();
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("type", uploadType);
      fd.append("files", fileList[0]);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await parseJsonResponse<{ error?: string; items?: ProductImage[] }>(res);
      if (!res.ok) throw new Error(json?.error || "上传失败");
      const items = (json.items ?? []) as ProductImage[];
      setImages((prev) => [...prev, ...items].slice(0, 10));
    } catch (e: unknown) {
      setError(formatClientError(e) || "上传失败");
    } finally {
      setBusy("idle");
    }
  };

  const sourceUrl = images[0]?.url ?? null;

  const runPipeline = async () => {
    if (!sourceUrl) {
      setError("请先上传一张产品图");
      return;
    }
    setError(null);
    setBusy("gen");
    setLastResult(null);
    try {
      const createRes = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageUrl: sourceUrl,
          scene,
          prompt: prompt.trim() || defaultPrompt(scene),
        }),
      });
      const createJson = await parseJsonResponse<{
        error?: string;
        generation?: { id: string };
        workerConfigured?: boolean;
        imageBackend?: string;
      }>(createRes);
      if (!createRes.ok) throw new Error(createJson?.error || "创建任务失败");
      if (
        createJson.imageBackend === "ark" ||
        createJson.imageBackend === "cloudflare" ||
        createJson.imageBackend === "placeholder"
      ) {
        setImageBackend(createJson.imageBackend);
      } else if (typeof createJson.workerConfigured === "boolean") {
        setImageBackend(createJson.workerConfigured ? "cloudflare" : "placeholder");
      }
      const id = createJson.generation?.id as string | undefined;
      if (!id) throw new Error("创建任务失败");

      const runRes = await fetch(`/api/generations/${id}/run`, { method: "POST" });
      const runJson = await parseJsonResponse<{
        error?: string;
        generation?: GenRow;
      }>(runRes);
      if (!runRes.ok) throw new Error(runJson?.error || "生成失败");

      const g = runJson.generation as GenRow;
      setLastResult(g);
      await loadHistory();
    } catch (e: unknown) {
      setError(formatClientError(e) || "生成失败");
    } finally {
      setBusy("idle");
    }
  };

  return (
    <div className="w-full h-full p-10 flex flex-col gap-8 bg-[var(--carpet-bg-soft)] overflow-y-auto">
      <PageHeader
        title="AI 场景图生成"
        subtitle="上传产品图 → 选择场景 → 本地存储结果（Cloudflare Worker 或火山方舟 Seedream）"
        actionLabel="刷新历史"
        onAction={loadHistory}
      />

      {imageBackend === "placeholder" ? (
        <div className="rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
          <p>
            当前为<strong>占位模式</strong>：结果将写入<strong>源图副本</strong>，用于验证上传与下载链路。要真实生图请任选其一：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>火山方舟 Seedream</strong>：配置 <code className="text-xs">ARK_API_KEY</code>，可选{" "}
              <code className="text-xs">IMAGE_GENERATION_PROVIDER=ark</code>（同时配了 Worker 时强制用 Ark）。
            </li>
            <li>
              <strong>Cloudflare Worker</strong>：配置 <code className="text-xs">CLOUDFLARE_WORKER_URL</code> 或{" "}
              <code className="text-xs">WORKER_URL</code>；可选 <code className="text-xs">WORKER_SECRET</code>。
            </li>
          </ul>
        </div>
      ) : null}
      {imageBackend === "ark" ? (
        <div className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          当前生图后端：<strong>火山方舟 Seedream</strong>（产品图以参考图形式传入模型）。地域/模型可通过{" "}
          <code className="text-xs">ARK_BASE_URL</code>、<code className="text-xs">ARK_IMAGE_MODEL</code> 调整。
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="carpet-card p-6 flex flex-col gap-4">
          <h2 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">1. 上传产品图</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="carpet-btn-secondary px-3 py-2 text-sm cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                disabled={busy !== "idle"}
                onChange={(e) => uploadFiles(e.target.files)}
              />
              选择图片
            </label>
            <select
              className="carpet-input text-sm max-w-[200px]"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as ProductImageType)}
            >
              <option value="DISPLAY">展示图</option>
              <option value="FLAT">平铺图</option>
              <option value="DETAIL">细节图</option>
            </select>
            {busy === "upload" ? <span className="text-sm text-[var(--carpet-text-muted)]">上传中…</span> : null}
          </div>
          {sourceUrl ? (
            <div className="flex gap-4 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourceUrl}
                alt="产品预览"
                className="w-40 h-40 object-contain border border-[var(--carpet-border)] rounded-[4px] bg-white"
              />
              <p className="text-sm text-[var(--carpet-text-muted)] flex-1">
                已绑定首张图为生成素材。多图上传时仅使用第一张；可重新选择文件覆盖。
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--carpet-text-muted)]">支持 PNG / JPEG，单张建议小于 12MB。</p>
          )}
        </section>

        <section className="carpet-card p-6 flex flex-col gap-4">
          <h2 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">2. 场景与 Prompt</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--carpet-text-muted)]">场景模板</span>
            <select className="carpet-input" value={scene} onChange={(e) => setScene(e.target.value)}>
              {SCENES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm flex-1 min-h-[120px]">
            <span className="text-[var(--carpet-text-muted)]">Prompt（可改）</span>
            <textarea
              className="carpet-input min-h-[100px] resize-y"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <Button
            variant="carpetPrimary"
            className="w-fit"
            disabled={busy !== "idle" || !sourceUrl}
            onClick={runPipeline}
          >
            {busy === "gen" ? "生成中…" : "3. 生成场景图"}
          </Button>
          {error ? <p className="text-sm text-[#B42318]">{error}</p> : null}
        </section>
      </div>

      {lastResult?.status === "done" && lastResult.resultUrl ? (
        <section className="carpet-card p-6 flex flex-col gap-4">
          <h2 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">结果与下载</h2>
          <div className="flex flex-wrap gap-6 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lastResult.resultUrl}
              alt="生成结果"
              className="max-w-full w-72 object-contain border border-[var(--carpet-border)] rounded-[4px] bg-white"
            />
            <div className="flex flex-col gap-2">
              <a
                href={lastResult.resultUrl}
                download
                className="carpet-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm rounded-[6px] w-fit"
              >
                下载图片
              </a>
              <p className="text-xs text-[var(--carpet-text-muted)] max-w-md">
                文件保存在服务器本地目录（UPLOAD_DIR / <code>generations/&lt;id&gt;/result.png</code>），经{" "}
                <code>/api/files/...</code> 提供访问；前面可再接 Cloudflare CDN 加速。
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {lastResult?.status === "failed" ? (
        <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          生成失败：{lastResult.errorMessage ?? "未知错误"}
        </div>
      ) : null}

      <section className="carpet-card p-6 flex flex-col gap-3 min-h-[200px]">
        <h2 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">历史记录</h2>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--carpet-text-muted)]">暂无生成记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-[var(--carpet-text-muted)] border-b border-[var(--carpet-border)]">
                  <th className="py-2 pr-3">时间</th>
                  <th className="py-2 pr-3">场景</th>
                  <th className="py-2 pr-3">状态</th>
                  <th className="py-2 pr-3">结果</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-[var(--carpet-border)]">
                    <td className="py-2 pr-3 whitespace-nowrap text-[var(--carpet-text-muted)]">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 max-w-[180px] truncate" title={h.scene}>
                      {sceneLabel(h.scene)}
                    </td>
                    <td className="py-2 pr-3">{h.status}</td>
                    <td className="py-2 pr-3">
                      {h.resultUrl ? (
                        <a href={h.resultUrl} className="text-[var(--carpet-primary)] underline" download>
                          下载
                        </a>
                      ) : h.errorMessage ? (
                        <span className="text-[#B42318] text-xs">{h.errorMessage.slice(0, 40)}…</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
