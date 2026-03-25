"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { formatClientError, parseJsonResponse } from "@/lib/safe-json-response";

type SettingsDiagnostic = {
  settingsFile: string;
  textLlmProviderEnv: string | null;
  effectiveTextLlmProvider: "ark" | "template";
  arkKeyConfigured: boolean;
  arkKeySource: "env" | "textModelKey" | "imageModelKey" | "none";
};

export default function SettingsPage() {
  const [form, setForm] = useState({
    textLlmProvider: "template" as "template" | "ark",
    arkTextModel: "doubao-seed-2-0-lite-260215",
    arkBaseUrl: "",
    textModelKey: "",
    imageModelKey: "",
    arkImageModel: "doubao-seedream-5-0-260128",
    arkImageSize: "2K",
    arkImageWatermark: "" as "" | "true",
    imageGenerationProvider: "auto" as "auto" | "ark" | "cloudflare",
    videoModelKey: "",
    uploadDir: "",
    maxConcurrency: "3",
    defaultRatios: "1:1,3:4,16:9",
    brandName: "",
    watermark: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<SettingsDiagnostic | null>(null);

  const patch = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const load = async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json = await parseJsonResponse<{
        settings?: Partial<typeof form>;
        diagnostic?: SettingsDiagnostic;
      }>(res);
      if (res.ok && json.settings) {
        setForm((p) => ({ ...p, ...json.settings }));
      }
      if (res.ok && json.diagnostic) {
        setDiagnostic(json.diagnostic);
      }
    } catch {
      /* 设置页加载失败时保持默认表单 */
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
      const json = await parseJsonResponse<{ error?: string; diagnostic?: SettingsDiagnostic }>(res);
      if (!res.ok) throw new Error(json?.error || "保存失败");
      setMessage("设置已保存");
      if (json.diagnostic) setDiagnostic(json.diagnostic);
    } catch (e: unknown) {
      setMessage(formatClientError(e) || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const testDb = async () => {
    setMessage(null);
    try {
      const res = await fetch("/api/settings/test-db", { cache: "no-store" });
      const json = await parseJsonResponse<{ message?: string }>(res);
      setMessage(json?.message || (res.ok ? "连接正常" : "连接失败"));
    } catch (e: unknown) {
      setMessage(formatClientError(e) || "连接失败");
    }
  };

  return (
    <div className="w-full h-full p-10 flex flex-col gap-8 bg-[var(--carpet-bg-soft)]">
      <PageHeader title="系统设置" />

      {diagnostic ? (
        <section className="carpet-card p-4 border border-[var(--carpet-border)] bg-[var(--carpet-bg-soft)]">
          <h3 className="font-space-grotesk text-sm font-semibold text-[var(--carpet-text)] mb-2">
            配置是否生效（诊断，不含密钥明文）
          </h3>
          <ul className="text-xs text-[var(--carpet-text-muted)] space-y-1.5 leading-relaxed">
            <li>
              <strong className="text-[var(--carpet-text)]">设置文件路径：</strong>
              <code className="text-[10px] break-all">{diagnostic.settingsFile}</code>
              <span className="block mt-0.5">
                Docker 下一般为挂载卷内路径；与本地开发时的 <code className="text-[10px]">.data/settings.json</code>{" "}
                不是同一个文件，换环境需重新保存或复制文件。
              </span>
            </li>
            <li>
              <strong className="text-[var(--carpet-text)]">文案 / 26 条 Prompt 实际模式：</strong>
              {diagnostic.effectiveTextLlmProvider === "ark" ? "火山方舟" : "本地规则模板"}
              {diagnostic.textLlmProviderEnv ? (
                <span>
                  （环境变量 <code className="text-[10px]">TEXT_LLM_PROVIDER={diagnostic.textLlmProviderEnv}</code>{" "}
                  已覆盖界面「文案来源」）
                </span>
              ) : (
                <span>（未设置 TEXT_LLM_PROVIDER，以本页「文案来源」为准）</span>
              )}
            </li>
            <li>
              <strong className="text-[var(--carpet-text)]">方舟 API Key 是否已配置：</strong>
              {diagnostic.arkKeyConfigured ? "是" : "否"}
              {diagnostic.arkKeyConfigured ? (
                <span>
                  ，当前解析来源：
                  {diagnostic.arkKeySource === "env"
                    ? "环境变量 ARK_API_KEY（优先于本页填写）"
                    : diagnostic.arkKeySource === "textModelKey"
                      ? "本页「文本 API Key」"
                      : "本页「生图专用 API Key」（与文案共用时的回退顺序）"}
                </span>
              ) : (
                <span>
                  。若你已在界面填写，请确认已点「保存设置」，且容器能写入上述路径；或改用环境变量{" "}
                  <code className="text-[10px]">ARK_API_KEY</code>。
                </span>
              )}
            </li>
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="carpet-card p-4 md:col-span-2">
          <h3 className="font-space-grotesk text-base font-semibold text-[var(--carpet-text)]">模型供应商（语言 + 生图）</h3>
          <p className="mt-2 text-xs text-[var(--carpet-text-muted)] leading-relaxed">
            <strong>火山方舟</strong>：环境变量 <code className="text-[10px]">ARK_API_KEY</code>、
            <code className="text-[10px]">ARK_BASE_URL</code>、<code className="text-[10px]">ARK_TEXT_MODEL</code>、
            <code className="text-[10px]">ARK_IMAGE_MODEL</code> 等<strong>优先于本页</strong>。仅填一处 Key 即可文图共用：填「文本
            API Key」后，生图会沿用；若文案与生图 Key 不同，再填「生图专用 API Key」。
            <br />
            <strong>Cloudflare 生图</strong>：在环境变量配置 <code className="text-[10px]">CLOUDFLARE_WORKER_URL</code>（或{" "}
            <code className="text-[10px]">WORKER_URL</code>）；与 Ark 同时存在且本页选「自动」时，会<strong>优先 Worker</strong>。
            要走方舟可在下方选「强制火山方舟」，或设环境变量{" "}
            <code className="text-[10px]">IMAGE_GENERATION_PROVIDER=ark</code>（环境变量优先于界面）。
          </p>

          <div className="mt-4 max-w-xl space-y-2">
            <label className="block text-xs text-[var(--carpet-text-muted)]">生图后端（/generate）</label>
            <select
              className="w-full carpet-input"
              value={form.imageGenerationProvider}
              onChange={(e) =>
                patch("imageGenerationProvider", e.target.value as "auto" | "ark" | "cloudflare")
              }
            >
              <option value="auto">自动：已配 Worker URL 时优先 Cloudflare，否则 Ark</option>
              <option value="ark">强制火山方舟 Seedream</option>
              <option value="cloudflare">强制 Cloudflare Worker</option>
            </select>
            <p className="text-[11px] text-[var(--carpet-text-muted)]">
              若需全局覆盖（含 Docker），仍可使用 <code className="text-[10px]">IMAGE_GENERATION_PROVIDER</code>。
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2 rounded-md border border-[var(--carpet-border)] p-3 bg-[var(--carpet-bg-soft)]">
              <h4 className="font-space-grotesk text-sm font-semibold text-[var(--carpet-text)]">
                语言模型 · 提示词（/create）
              </h4>
              <p className="text-[11px] text-[var(--carpet-text-muted)]">
                <code className="text-[10px]">TEXT_LLM_PROVIDER=ark</code> 可强制走方舟（覆盖本页「模板」选项）。
              </p>
              <label className="block text-xs text-[var(--carpet-text-muted)]">文案来源</label>
              <select
                className="w-full carpet-input"
                value={form.textLlmProvider}
                onChange={(e) => patch("textLlmProvider", e.target.value as "template" | "ark")}
              >
                <option value="template">本地规则模板（不消耗 API）</option>
                <option value="ark">火山方舟 Responses API</option>
              </select>
              <input
                className="w-full carpet-input text-sm"
                placeholder="文本模型端点 ID（如 doubao-seed-2-0-lite-260215）"
                value={form.arkTextModel}
                onChange={(e) => patch("arkTextModel", e.target.value)}
              />
              <input
                className="w-full carpet-input text-sm"
                placeholder="Ark Base URL（可选，默认同下与生图共用）"
                value={form.arkBaseUrl}
                onChange={(e) => patch("arkBaseUrl", e.target.value)}
              />
              <input
                className="w-full carpet-input text-sm"
                placeholder="文本 API Key（与 ARK_API_KEY 二选一）"
                value={form.textModelKey}
                onChange={(e) => patch("textModelKey", e.target.value)}
                type="password"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2 rounded-md border border-[var(--carpet-border)] p-3 bg-[var(--carpet-bg-soft)]">
              <h4 className="font-space-grotesk text-sm font-semibold text-[var(--carpet-text)]">
                生图 · Seedream（/generate）
              </h4>
              <p className="text-[11px] text-[var(--carpet-text-muted)]">
                走 Ark 生图时需 Key + 模型 ID；未填「生图专用 Key」时使用上方文本 Key 或{" "}
                <code className="text-[10px]">ARK_API_KEY</code>。
              </p>
              <input
                className="w-full carpet-input text-sm"
                placeholder="生图模型端点 ID（如 doubao-seedream-5-0-260128）"
                value={form.arkImageModel}
                onChange={(e) => patch("arkImageModel", e.target.value)}
              />
              <input
                className="w-full carpet-input text-sm"
                placeholder="输出尺寸（如 1K、2K、4K；环境变量 ARK_IMAGE_SIZE 优先）"
                value={form.arkImageSize}
                onChange={(e) => patch("arkImageSize", e.target.value)}
              />
              <label className="block text-xs text-[var(--carpet-text-muted)]">生图水印</label>
              <select
                className="w-full carpet-input"
                value={form.arkImageWatermark}
                onChange={(e) => patch("arkImageWatermark", e.target.value as "" | "true")}
              >
                <option value="">否（默认，ARK_WATERMARK 环境变量优先）</option>
                <option value="true">是</option>
              </select>
              <input
                className="w-full carpet-input text-sm"
                placeholder="生图专用 API Key（可选，与文本 Key 不同时填写）"
                value={form.imageModelKey}
                onChange={(e) => patch("imageModelKey", e.target.value)}
                type="password"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--carpet-border)]">
            <label className="block text-xs text-[var(--carpet-text-muted)] mb-1">Video API Key（预留，当前流程未使用）</label>
            <input
              className="w-full max-w-xl carpet-input text-sm"
              placeholder="Video Model API Key（可选）"
              value={form.videoModelKey}
              onChange={(e) => patch("videoModelKey", e.target.value)}
            />
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

