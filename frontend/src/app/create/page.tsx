"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AspectRatio, ProductImage, ProductImageType, PromptItem } from "@/lib/types";
import { formatClientError, parseJsonResponse } from "@/lib/safe-json-response";

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
  const [busy, setBusy] = useState<"idle" | "upload" | "gen_prompts" | "create_task">("idle");
  const [error, setError] = useState<string | null>(null);

  const toggleRatio = (r: AspectRatio) => {
    setRatios((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const generatePrompts = async () => {
    setError(null);
    setBusy("gen_prompts");
    try {
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
        }),
      });
      const json = await parseJsonResponse<{ error?: string; prompts?: PromptItem[] }>(res);
      if (!res.ok) throw new Error(json?.error || "生成失败");
      setPrompts(json.prompts ?? []);
    } catch (e: unknown) {
      setError(formatClientError(e) || "生成失败");
    } finally {
      setBusy("idle");
    }
  };

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
      setError("请先生成 25 条 Prompt");
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
          prompts: prompts.map((p) => ({ type: p.type, title: p.title, text: p.text })),
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
          生成 25 条 Prompt
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

          <Section title="5. Prompt（25条，可编辑）→ 开始生成图片">
            <div className="flex gap-3">
              <Button
                onClick={generatePrompts}
                disabled={busy !== "idle"}
                variant="carpetSecondary"
                className="flex-1 h-auto py-3"
              >
                生成 25 条 Prompt
              </Button>
              <Button
                onClick={createTask}
                disabled={busy !== "idle"}
                variant="carpetAccent"
                className="flex-1 h-auto py-3"
              >
                创建任务并开始
              </Button>
            </div>
            {error ? <div className="text-sm font-inter text-[#E42313]">{error}</div> : null}
          </Section>
        </div>

        <div className="flex-1 flex flex-col gap-6 pl-12 border-l border-[#E8E8E8] min-w-0">
          <div className="w-full flex justify-between items-center">
            <h3 className="font-space-grotesk font-semibold text-lg text-[#0D0D0D]">生成预览 / Prompt 列表</h3>
          </div>

          {!prompts ? (
            <div className="w-full flex-1 bg-[#FAFAFA] border border-dashed border-[var(--carpet-border)] rounded-[6px] flex items-center justify-center">
              <span className="font-inter text-[#7A7A7A] text-sm">点击“生成 25 条 Prompt”，这里会展示可编辑列表</span>
            </div>
          ) : (
            <div className="w-full flex-1 min-h-0 overflow-y-auto carpet-card">
              {prompts.map((p) => (
                <div key={p.id} className="p-4 border-b border-[#E8E8E8]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-inter text-sm font-semibold text-[#0D0D0D]">
                      {String(p.index).padStart(2, "0")}｜{p.type}｜{p.title}
                    </div>
                  </div>
                  <textarea
                    className="mt-2 w-full h-20 carpet-input p-3 font-inter text-sm resize-none"
                    value={p.text}
                    onChange={(e) =>
                      setPrompts((prev) => prev!.map((x) => (x.id === p.id ? { ...x, text: e.target.value } : x)))
                    }
                  />
                </div>
              ))}
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

