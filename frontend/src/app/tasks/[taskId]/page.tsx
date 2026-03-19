"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { GenerateTask, PromptItem } from "@/lib/types";

export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>();
  const taskId = params.taskId;

  const [task, setTask] = useState<GenerateTask | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState("");
  const selectedPrompt = useMemo(
    () => (task?.prompts ?? []).find((p) => p.id === selectedPromptId) ?? null,
    [task, selectedPromptId]
  );

  const refresh = async () => {
    const res = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setTask(json.task);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (selectedPrompt) setDraftPrompt(selectedPrompt.text);
  }, [selectedPrompt]);

  useEffect(() => {
    if (!task) return;
    if (!selectedPromptId && task.prompts.length) setSelectedPromptId(task.prompts[0].id);
  }, [task, selectedPromptId]);

  const generateImages = async () => {
    await fetch(`/api/tasks/${taskId}/images/generate`, { method: "POST" });
    await refresh();
  };

  const savePrompt = async () => {
    if (!selectedPrompt) return;
    await fetch(`/api/tasks/${taskId}/prompts/${selectedPrompt.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: draftPrompt }),
    });
    await refresh();
  };

  const singleRegen = async () => {
    // For now, regen simply triggers the same mock generation endpoint.
    await generateImages();
  };

  if (!task) {
    return (
      <div className="w-full h-full p-10 font-inter text-sm text-[#7A7A7A]">
        加载中…
      </div>
    );
  }

  const promptTitle = (p: PromptItem) => `${String(p.index).padStart(2, "0")}｜${p.type}｜${p.title}`;

  return (
    <div className="w-full h-full p-10 flex flex-col gap-12 bg-[var(--carpet-bg-soft)]">
      <header className="flex justify-between items-center w-full">
        <h2 className="font-space-grotesk text-[40px] font-medium tracking-tight text-[#0D0D0D]">
          任务详情
        </h2>
        <Link href="/tasks">
          <Button variant="carpetAccent" className="px-5 py-2.5 font-space-grotesk font-medium h-auto">
            返回列表
          </Button>
        </Link>
      </header>

      <div className="flex gap-12 w-full flex-1 min-h-0">
        {/* Left: Prompt editor */}
        <div className="w-[360px] flex flex-col gap-4 shrink-0">
          <div className="font-space-grotesk text-lg font-semibold text-[#0D0D0D]">Prompt 编辑 / 下载</div>

          <div className="carpet-card p-3 flex flex-col gap-2">
            <div className="font-inter text-sm font-semibold text-[#0D0D0D]">
              任务：{task.product.name}
            </div>
            <div className="font-inter text-xs text-[#7A7A7A]">
              进度：{task.finishedCount}/{task.totalCount}｜状态：
              {task.status === "RUNNING" ? "进行中" : task.status === "DONE" ? "已完成" : task.status}
              ｜比例：{task.product.aspectRatios.join(" / ")}
            </div>
          </div>

          <div className="carpet-card">
            <div className="p-3 border-b border-[#E8E8E8] font-inter text-xs font-semibold text-[#0D0D0D]">
              Prompt 列表（点击切换）
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {task.prompts.map((p) => {
                const active = p.id === selectedPromptId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPromptId(p.id)}
                    className={`w-full text-left px-3 py-2 border-b border-[#E8E8E8] font-inter text-xs ${
                      active ? "bg-[#FAFAFA] text-[#0D0D0D]" : "bg-white text-[#7A7A7A]"
                    }`}
                  >
                    {promptTitle(p)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="carpet-card p-3 flex flex-col gap-2">
            <div className="font-inter text-xs font-semibold text-[#0D0D0D]">Prompt（可单独修改）</div>
            <textarea
              className="w-full h-40 carpet-input p-3 font-inter text-sm resize-none"
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={savePrompt}
              variant="carpetSecondary"
              className="h-auto py-3"
            >
              保存 Prompt
            </Button>
            <Button
              onClick={singleRegen}
              variant="carpetSecondary"
              className="h-auto py-3"
            >
              单张重生图（模拟）
            </Button>
            <Button
              onClick={generateImages}
              variant="carpetAccent"
              className="h-auto py-3"
            >
              开始生成图片（模拟）
            </Button>
          </div>
        </div>

        {/* Right: Gallery */}
        <div className="flex-1 flex flex-col gap-6 pl-12 border-l border-[#E8E8E8] min-w-0">
          <div className="w-full flex justify-between items-center">
            <h3 className="font-space-grotesk font-semibold text-lg text-[#0D0D0D]">生成结果（可勾选下载）</h3>
            <div className="flex gap-2">
              <button className="carpet-btn-secondary px-3 py-1.5 font-inter text-xs">
                导出 Prompt（待接）
              </button>
            </div>
          </div>

          <div className="w-full flex-1 min-h-0 overflow-y-auto">
            {task.images.length === 0 ? (
              <div className="w-full h-[420px] bg-[#FAFAFA] border border-dashed border-[var(--carpet-border)] rounded-[6px] flex items-center justify-center">
                <span className="font-inter text-[#7A7A7A] text-sm">点击“开始生成图片（模拟）”生成占位图</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {task.images.map((img) => (
                  <div key={img.id} className="carpet-card p-3 flex flex-col gap-2">
                    <div className="w-full h-44 bg-[#FAFAFA] border border-[#E8E8E8] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="font-inter text-xs text-[#7A7A7A]">
                      {img.aspectRatio}｜{new Date(img.createdAt).toLocaleString("zh-CN")}
                    </div>
                    <button
                      onClick={() => setSelectedPromptId(img.promptId)}
                      className="font-inter text-xs text-[#0D0D0D] text-left hover:underline"
                    >
                      查看/编辑 Prompt
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

