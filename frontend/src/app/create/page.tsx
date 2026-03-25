"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AspectRatio, ProductImage, ProductImageType, PromptItem } from "@/lib/types";
import { formatClientError, parseJsonResponse } from "@/lib/safe-json-response";
import {
  ECOMMERCE_PRESET_PACKAGES,
  ECOMMERCE_PROMPT_GROUPS,
  appendEntryToField,
  applyPresetPackage,
} from "@/lib/ecommerce-prompt-library";

const RATIOS: { id: AspectRatio; label: string }[] = [
  { id: "1:1", label: "1:1 方形" },
  { id: "3:4", label: "3:4 竖版" },
  { id: "4:3", label: "4:3 横版" },
  { id: "16:9", label: "16:9 宽屏" },
  { id: "9:16", label: "9:16 竖屏" },
  { id: "2:3", label: "2:3 竖版" },
  { id: "3:2", label: "3:2 横版" },
];

function splitLines(s: string) {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function CreatePage() {
  const router = useRouter();
  const [draftTaskId, setDraftTaskId] = useState<string | null>(null);
  const [productName, setProductName] = useState("LOGO 定制门口地毯");
  const [category, setCategory] = useState("商用地毯/门垫");
  const [sellingPointsText, setSellingPointsText] = useState("支持企业 LOGO 定制\n防滑橡胶底\n强力吸水，易打理");
  const [targetAudience, setTargetAudience] = useState("28-45 岁，老板/店长/采购，注重门面形象与干净整洁");
  const [scenesBusinessText, setScenesBusinessText] = useState("户外商铺门口\n公司门口\n企业前台\n电梯间\n室内门口\n玄关口");
  const [scenesHomeText, setScenesHomeText] = useState("玄关\n入户门口");
  const [modelProfile, setModelProfile] = useState("女｜25-35｜干练亲和｜商务休闲");
  const [ratios, setRatios] = useState<AspectRatio[]>(["1:1", "3:4", "16:9"]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploadType, setUploadType] = useState<ProductImageType>("DISPLAY");
  const [uploadMaterial, setUploadMaterial] = useState("");

  const sellingPoints = useMemo(() => splitLines(sellingPointsText), [sellingPointsText]);
  const scenesBusiness = useMemo(() => splitLines(scenesBusinessText), [scenesBusinessText]);
  const scenesHome = useMemo(() => splitLines(scenesHomeText), [scenesHomeText]);

  const [prompts, setPrompts] = useState<PromptItem[] | null>(null);
  /** 创建任务时仅提交勾选的提示词 */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "upload" | "gen_prompts" | "create_task">("idle");
  const [error, setError] = useState<string | null>(null);
  const [promptGenHint, setPromptGenHint] = useState<string | null>(null);

  const selectedCount = useMemo(() => {
    if (!prompts) return 0;
    return prompts.filter((p) => selectedIds.has(p.id)).length;
  }, [prompts, selectedIds]);

  const toggleRatio = (r: AspectRatio) => {
    setRatios((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const generatePrompts = async () => {
    setError(null);
    setPromptGenHint(null);
    setBusy("gen_prompts");
    try {
      const firstUrl = images[0]?.url;
      const referenceImageUrl =
        firstUrl && (firstUrl.startsWith("https://") || firstUrl.startsWith("http://"))
          ? firstUrl
          : undefined;

      const res = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productName,
          category,
          sellingPoints,
          targetAudience,
          scenesBusiness,
          scenesHome,
          modelProfile,
          ...(referenceImageUrl ? { referenceImageUrl } : {}),
        }),
      });
      const json = await parseJsonResponse<{
        error?: string;
        prompts?: PromptItem[];
        promptSource?: string;
        textModel?: string;
      }>(res);
      if (!res.ok) throw new Error(json?.error || "生成失败");
      const list = json.prompts ?? [];
      setPrompts(list);
      setSelectedIds(new Set(list.map((p) => p.id)));
      if (json.promptSource === "ark") {
        setPromptGenHint(`已由火山方舟生成（模型：${json.textModel ?? "—"}）`);
      } else {
        setPromptGenHint("已使用本地规则模板生成");
      }
    } catch (e: unknown) {
      setError(formatClientError(e) || "生成失败");
    } finally {
      setBusy("idle");
    }
  };

  const togglePromptSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllPrompts = useCallback(() => {
    if (!prompts?.length) return;
    setSelectedIds(new Set(prompts.map((p) => p.id)));
  }, [prompts]);

  const selectNoPrompts = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const regeneratePromptRow = useCallback(
    async (p: PromptItem) => {
      setError(null);
      setRegeneratingId(p.id);
      try {
        const firstUrl = images[0]?.url;
        const referenceImageUrl =
          firstUrl && (firstUrl.startsWith("https://") || firstUrl.startsWith("http://"))
            ? firstUrl
            : undefined;

        const res = await fetch("/api/prompts/regenerate-one", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            productName,
            category,
            sellingPoints,
            targetAudience,
            scenesBusiness,
            scenesHome,
            modelProfile,
            prompt: {
              index: p.index,
              type: p.type,
              title: p.title,
              text: p.text,
            },
            ...(referenceImageUrl ? { referenceImageUrl } : {}),
          }),
        });
        const json = await parseJsonResponse<{
          error?: string;
          title?: string;
          text?: string;
        }>(res);
        if (!res.ok) throw new Error(json?.error || "重新生成失败");
        const title = String(json.title ?? "").trim();
        const text = String(json.text ?? "").trim();
        if (!title || !text) throw new Error("接口未返回有效的 title/text");

        const newId = `prompt_${p.index}_${Date.now().toString(16)}`;
        setPrompts((prev) =>
          prev!.map((x) => (x.id === p.id ? { ...x, id: newId, title, text } : x)),
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(p.id)) {
            next.delete(p.id);
            next.add(newId);
          }
          return next;
        });
      } catch (e: unknown) {
        setError(formatClientError(e) || "重新生成失败");
      } finally {
        setRegeneratingId(null);
      }
    },
    [
      productName,
      category,
      sellingPoints,
      targetAudience,
      scenesBusiness,
      scenesHome,
      modelProfile,
      images,
    ],
  );

  const ensureDraftTask = async () => {
    if (draftTaskId) return draftTaskId;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "draft",
        product: {
          name: productName,
          category,
          sellingPoints,
          targetAudience,
          scenesBusiness,
          scenesHome,
          modelProfile,
          aspectRatios: ratios,
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
    const remaining = 10 - images.length;
    if (remaining <= 0) {
      setError("最多上传 10 张图片");
      return;
    }
    const files = Array.from(fileList).slice(0, remaining);
    setError(null);
    setBusy("upload");
    try {
      const taskId = await ensureDraftTask();
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("type", uploadType);
      fd.set("material", uploadMaterial);
      for (const f of files) fd.append("files", f);

      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await parseJsonResponse<{ error?: string; items?: ProductImage[] }>(res);
      if (!res.ok) throw new Error(json?.error || "上传失败");
      setImages((prev) => [...prev, ...(json.items ?? [])]);
    } catch (e: unknown) {
      setError(formatClientError(e) || "上传失败");
    } finally {
      setBusy("idle");
    }
  };

  const createTask = async () => {
    if (!prompts?.length) {
      setError("请先生成 Prompt 列表");
      return;
    }
    const chosen = prompts
      .filter((p) => selectedIds.has(p.id))
      .sort((a, b) => a.index - b.index);
    if (chosen.length === 0) {
      setError("请至少勾选 1 条提示词，再创建任务");
      return;
    }
    setError(null);
    setBusy("create_task");
    try {
      const taskId = await ensureDraftTask();
      const name = `${productName}｜${new Date().toLocaleString("zh-CN")}`;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "finalize",
          taskId,
          name,
          product: {
            name: productName,
            category,
            sellingPoints,
            targetAudience,
            scenesBusiness,
            scenesHome,
            modelProfile,
            aspectRatios: ratios.length ? ratios : ["1:1"],
            // images are already stored in DB via /api/uploads, no need to send here
            images: [],
          },
          prompts: chosen.map((p) => ({ type: p.type, title: p.title, text: p.text })),
        }),
      });
      const json = await parseJsonResponse<{ error?: string; task: { id: string } }>(res);
      if (!res.ok) throw new Error(json?.error || "创建任务失败");
      router.push(`/tasks/${json.task.id}`);
    } catch (e: unknown) {
      setError(formatClientError(e) || "创建任务失败");
    } finally {
      setBusy("idle");
    }
  };

  return (
    <div className="w-full h-full p-10 flex flex-col gap-12 bg-[var(--carpet-bg-soft)]">
      <header className="flex justify-between items-center w-full">
        <h2 className="font-space-grotesk text-[40px] font-medium tracking-tight text-[#0D0D0D]">
          地毯行业 AI 出图智能体
        </h2>
        <Button
          onClick={generatePrompts}
          disabled={busy !== "idle"}
          variant="carpetAccent"
          className="px-5 py-2.5 font-space-grotesk font-medium h-auto"
        >
          生成 26 条 Prompt
        </Button>
      </header>

      <div className="flex gap-12 w-full flex-1 min-h-0">
        <div className="w-[420px] flex flex-col gap-4 shrink-0 overflow-y-auto pr-4 pb-10">
          <Section title="1. 产品图片（拖拽/粘贴/上传，最多10张 JPG/PNG）">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <select
                  className="carpet-input p-2 font-inter text-sm bg-white"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as ProductImageType)}
                >
                  <option value="FLAT">平铺图</option>
                  <option value="DISPLAY">展示图</option>
                  <option value="DETAIL">细节图</option>
                </select>
                <input
                  className="flex-1 carpet-input p-2 font-inter text-sm"
                  placeholder="材质（可选）：尼龙圈绒/法兰绒/橡胶底…"
                  value={uploadMaterial}
                  onChange={(e) => setUploadMaterial(e.target.value)}
                />
              </div>

              <label className="w-full carpet-panel p-4 text-sm text-[var(--carpet-text-muted)] font-inter cursor-pointer hover:bg-[#f3f5fb]">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)}
                  disabled={busy !== "idle"}
                />
                点击选择图片或拖拽到这里（已上传 {images.length}/10）
              </label>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="carpet-card p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-full h-24 object-cover bg-[#FAFAFA]" />
                      <div className="mt-1 text-[11px] font-inter text-[#7A7A7A]">
                        {img.type}{img.material ? `｜${img.material}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Section>

          <Section title="2a. 电商提示词库（一键套餐 / 按条追加）">
            <p className="font-inter text-xs text-[#7A7A7A] leading-relaxed">
              以下为商用广告地毯向的专业词条与套餐。<strong className="text-[#0D0D0D]">一键套餐</strong>会覆盖下方「卖点 / 商用&家用场景 /
              人群」四处文案；<strong className="text-[#0D0D0D]">按条追加</strong>会在对应文本框末尾去重追加一行。
            </p>
            <div className="flex flex-col gap-2">
              <div className="font-inter text-xs font-semibold text-[#0D0D0D]">一键套餐</div>
              <div className="flex flex-col gap-2">
                {ECOMMERCE_PRESET_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    disabled={busy !== "idle"}
                    onClick={() => {
                      const next = applyPresetPackage(pkg);
                      setSellingPointsText(next.sellingPointsText);
                      setScenesBusinessText(next.scenesBusinessText);
                      setScenesHomeText(next.scenesHomeText);
                      setTargetAudience(next.targetAudience);
                    }}
                    className="text-left border border-[var(--carpet-border)] rounded-[6px] p-3 bg-white hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
                  >
                    <div className="font-inter text-sm font-semibold text-[#0D0D0D]">{pkg.title}</div>
                    <div className="font-inter text-xs text-[#7A7A7A] mt-1">{pkg.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto border border-[var(--carpet-border)] rounded-[6px] p-2 bg-[#FAFAFA]">
              {ECOMMERCE_PROMPT_GROUPS.map((g) => (
                <details key={g.id} className="border border-[var(--carpet-border)] rounded-[4px] bg-white p-2">
                  <summary className="font-inter text-xs font-semibold text-[#0D0D0D] cursor-pointer">
                    {g.title}
                  </summary>
                  <p className="font-inter text-[11px] text-[#7A7A7A] mt-1 mb-2">{g.description}</p>
                  <ul className="space-y-2">
                    {g.entries.map((e) => (
                      <li key={e.id} className="flex flex-col gap-1 border-t border-[#EEE] pt-2 first:border-t-0 first:pt-0">
                        <div className="font-inter text-xs text-[#0D0D0D]">
                          <span className="text-[#7A7A7A]">[{e.channel}]</span> {e.title}
                        </div>
                        <p className="font-inter text-[11px] text-[#4A4A4A] leading-snug line-clamp-3" title={e.text}>
                          {e.text}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={busy !== "idle"}
                            className="text-[11px] px-2 py-1 rounded border border-[var(--carpet-border)] bg-white hover:bg-[#F5F5F5]"
                            onClick={() => {
                              if (g.applyTo === "sellingPoints") {
                                setSellingPointsText((t) => appendEntryToField("sellingPoints", t, e.text));
                              } else if (g.applyTo === "scenesBusiness") {
                                setScenesBusinessText((t) => appendEntryToField("scenesBusiness", t, e.text));
                              } else if (g.applyTo === "scenesHome") {
                                setScenesHomeText((t) => appendEntryToField("scenesHome", t, e.text));
                              } else {
                                setTargetAudience((t) => appendEntryToField("targetAudience", t, e.text));
                              }
                            }}
                          >
                            追加到
                            {g.applyTo === "sellingPoints"
                              ? "卖点"
                              : g.applyTo === "scenesBusiness"
                                ? "商用场景"
                                : g.applyTo === "scenesHome"
                                  ? "家用场景"
                                  : "人群"}
                          </button>
                          <button
                            type="button"
                            disabled={busy !== "idle"}
                            className="text-[11px] px-2 py-1 rounded border border-[var(--carpet-border)] bg-white hover:bg-[#F5F5F5]"
                            onClick={() => void navigator.clipboard?.writeText(e.text)}
                          >
                            复制全文
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </Section>

          <Section title="2. 产品类目 / 卖点（一行一个）/ 目标人群画像">
            <Field label="产品名称">
              <input className="w-full carpet-input p-3 font-inter text-sm" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </Field>
            <Field label="类目">
              <input className="w-full carpet-input p-3 font-inter text-sm" value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
            <Field label="卖点（每行一个）">
              <textarea className="w-full h-24 carpet-input p-3 font-inter text-sm resize-none" value={sellingPointsText} onChange={(e) => setSellingPointsText(e.target.value)} />
            </Field>
            <Field label="目标人群画像">
              <textarea className="w-full h-20 carpet-input p-3 font-inter text-sm resize-none" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
            </Field>
          </Section>

          <Section title="3. 使用场景：商用 & 家用">
            <Field label="商用场景（每行一个）">
              <textarea className="w-full h-24 carpet-input p-3 font-inter text-sm resize-none" value={scenesBusinessText} onChange={(e) => setScenesBusinessText(e.target.value)} />
            </Field>
            <Field label="家用场景（每行一个）">
              <textarea className="w-full h-20 carpet-input p-3 font-inter text-sm resize-none" value={scenesHomeText} onChange={(e) => setScenesHomeText(e.target.value)} />
            </Field>
          </Section>

          <Section title="4. 模特选择 & 输出尺寸比例">
            <Field label="模特（库选/私有定制描述）">
              <input className="w-full carpet-input p-3 font-inter text-sm" value={modelProfile} onChange={(e) => setModelProfile(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              {RATIOS.map((r) => {
                const active = ratios.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRatio(r.id)}
                    className={`border p-3 text-left font-inter text-sm transition-colors ${
                      active ? "border-[var(--carpet-accent)] bg-[#FAFAFA]" : "border-[var(--carpet-border)] bg-white hover:border-[#CFCFCF]"
                    }`}
                  >
                    <div className={`font-semibold ${active ? "text-[#E42313]" : "text-[#0D0D0D]"}`}>{r.id}</div>
                    <div className={`${active ? "text-[#E42313]" : "text-[#7A7A7A]"} text-xs mt-1`}>{r.label}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="5. Prompt（26 条，右侧可选中、可改、可单条重生成）→ 创建任务">
            <div className="flex gap-3">
              <Button
                onClick={generatePrompts}
                disabled={busy !== "idle" || regeneratingId !== null}
                variant="carpetSecondary"
                className="flex-1 h-auto py-3"
              >
                生成 26 条 Prompt
              </Button>
              <Button
                onClick={createTask}
                disabled={busy !== "idle" || regeneratingId !== null || selectedCount === 0}
                variant="carpetAccent"
                className="flex-1 h-auto py-3"
              >
                创建任务（已选 {selectedCount} 条）
              </Button>
            </div>
            {error ? <div className="text-sm font-inter text-[#E42313]">{error}</div> : null}
            {promptGenHint ? (
              <div className="text-sm font-inter text-[var(--carpet-text-muted)]">{promptGenHint}</div>
            ) : null}
          </Section>
        </div>

        <div className="flex-1 flex flex-col gap-6 pl-12 border-l border-[#E8E8E8] min-w-0">
          <div className="w-full flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-space-grotesk font-semibold text-lg text-[#0D0D0D]">生成预览 / Prompt 列表</h3>
            {prompts?.length ? (
              <div className="flex flex-wrap items-center gap-2 text-sm font-inter">
                <button
                  type="button"
                  className="px-2 py-1 rounded border border-[var(--carpet-border)] bg-white hover:bg-[#FAFAFA] text-[#0D0D0D]"
                  onClick={selectAllPrompts}
                  disabled={busy !== "idle" || regeneratingId !== null}
                >
                  全选
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded border border-[var(--carpet-border)] bg-white hover:bg-[#FAFAFA] text-[#0D0D0D]"
                  onClick={selectNoPrompts}
                  disabled={busy !== "idle" || regeneratingId !== null}
                >
                  全不选
                </button>
                <span className="text-[#7A7A7A]">
                  已选 <strong className="text-[#0D0D0D]">{selectedCount}</strong> / {prompts.length} 条（仅勾选项会进入任务）
                </span>
              </div>
            ) : null}
          </div>

          {!prompts ? (
            <div className="w-full flex-1 bg-[#FAFAFA] border border-dashed border-[var(--carpet-border)] rounded-[6px] flex items-center justify-center">
              <span className="font-inter text-[#7A7A7A] text-sm">点击「生成 26 条 Prompt」，在此勾选、编辑正文与标题，并可单条重新生成</span>
            </div>
          ) : (
            <div className="w-full flex-1 min-h-0 overflow-y-auto carpet-card">
              {prompts.map((p) => {
                const checked = selectedIds.has(p.id);
                const regenBusy = regeneratingId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-4 border-b border-[#E8E8E8] ${checked ? "bg-[#FAFAFC]" : "bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <label className="flex items-center gap-2 shrink-0 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--carpet-accent)]"
                          checked={checked}
                          onChange={() => togglePromptSelected(p.id)}
                          disabled={busy !== "idle" || regeneratingId !== null}
                        />
                        <span className="font-inter text-xs font-semibold text-[#7A7A7A] whitespace-nowrap">
                          #{String(p.index).padStart(2, "0")} {p.type}
                        </span>
                      </label>
                      <div className="flex-1 min-w-[200px] space-y-2">
                        <input
                          className="w-full carpet-input p-2 font-inter text-sm font-semibold text-[#0D0D0D]"
                          value={p.title}
                          placeholder="标题（可改）"
                          readOnly={regenBusy}
                          onChange={(e) =>
                            setPrompts((prev) =>
                              prev!.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)),
                            )
                          }
                        />
                        <textarea
                          className="w-full h-24 carpet-input p-3 font-inter text-sm resize-y min-h-[5rem]"
                          value={p.text}
                          placeholder="英文提示词正文（可改）"
                          readOnly={regenBusy}
                          onChange={(e) =>
                            setPrompts((prev) =>
                              prev!.map((x) => (x.id === p.id ? { ...x, text: e.target.value } : x)),
                            )
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="carpetSecondary"
                        className="shrink-0 h-auto py-2 px-3 text-xs"
                        disabled={busy !== "idle" || regeneratingId !== null}
                        onClick={() => void regeneratePromptRow(p)}
                      >
                        {regenBusy ? "生成中…" : "重新生成"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="carpet-card p-4 flex flex-col gap-3">
      <div className="font-space-grotesk text-sm font-semibold text-[#0D0D0D]">{title}</div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-inter text-xs font-semibold text-[#0D0D0D]">{label}</div>
      {children}
    </div>
  );
}

