"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas, FabricImage, FabricObject, IText, TEvent } from "fabric";

const CANVAS_W = 1200;
const CANVAS_H = 1200;

type LayerRow = { id: string; label: string; type: string };

function isIText(o: FabricObject | undefined): o is IText {
  return Boolean(o && o.type === "i-text");
}

function isFabricImage(o: FabricObject | undefined): o is FabricImage {
  return Boolean(o && (o.type === "image" || o.type === "Image"));
}

async function rasterFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("图片加载失败"));
    el.src = url;
  });
}

export type LovartLikeCanvasHandle = {
  addImageFromUrl: (url: string, opts?: { asBackground?: boolean }) => Promise<void>;
  addText: () => void;
  exportPng: () => string | null;
};

type Props = {
  /** 由父组件 ref 调用 imperative handle（可选） */
  exposeHandle?: (h: LovartLikeCanvasHandle) => void;
};

export function LovartLikeCanvas({ exposeHandle }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [layers, setLayers] = useState<LayerRow[]>([]);
  const [zoomPct, setZoomPct] = useState(100);
  const [selected, setSelected] = useState<FabricObject | undefined>(undefined);
  const [textContent, setTextContent] = useState("");
  const [fontSize, setFontSize] = useState(36);
  const [fill, setFill] = useState("#0f172a");
  const [fontFamily, setFontFamily] = useState(
    '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif',
  );
  const [fontWeight, setFontWeight] = useState<"400" | "600" | "700">("600");

  const syncLayers = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    const objs = c.getObjects();
    setLayers(
      objs.map((o, i) => ({
        id: String((o as FabricObject & { __lid?: string }).__lid ?? `layer_${i}`),
        label: `${o.type ?? "object"} · ${i + 1}`,
        type: String(o.type ?? ""),
      })),
    );
  }, []);

  const applyZoom = useCallback((pct: number) => {
    const c = fabricRef.current;
    if (!c) return;
    const z = Math.min(400, Math.max(25, pct)) / 100;
    c.setZoom(z);
    c.requestRenderAll();
    setZoomPct(Math.round(z * 100));
  }, []);

  const selectByIndex = useCallback((index: number) => {
    const c = fabricRef.current;
    if (!c) return;
    const o = c.getObjects()[index];
    if (!o) return;
    c.setActiveObject(o);
    c.requestRenderAll();
    setSelected(o);
    if (isIText(o)) {
      setTextContent(o.text ?? "");
      setFontSize(o.fontSize ?? 36);
      setFill(typeof o.fill === "string" ? o.fill : "#0f172a");
      setFontFamily(o.fontFamily ?? fontFamily);
      const w = o.fontWeight;
      setFontWeight(w === "700" || w === "bold" ? "700" : w === "600" ? "600" : "400");
    }
  }, [fontFamily]);

  const deleteSelected = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    const active = c.getActiveObject();
    if (!active) return;
    c.remove(active);
    c.discardActiveObject();
    c.requestRenderAll();
    setSelected(undefined);
    syncLayers();
  }, [syncLayers]);

  const addText = useCallback(async () => {
    const { IText } = await import("fabric");
    const c = fabricRef.current;
    if (!c) return;
    const t = new IText("双击编辑文字", {
      left: CANVAS_W / 2 - 120,
      top: CANVAS_H / 2 - 24,
      fontSize,
      fill,
      fontFamily,
      fontWeight,
      editable: true,
    });
    (t as FabricObject & { __lid?: string }).__lid = `txt_${Date.now().toString(16)}`;
    c.add(t);
    c.setActiveObject(t);
    c.requestRenderAll();
    setSelected(t);
    setTextContent(t.text ?? "");
    syncLayers();
  }, [fill, fontFamily, fontSize, fontWeight, syncLayers]);

  const addImageFromUrl = useCallback(
    async (url: string, opts?: { asBackground?: boolean }) => {
      const { Canvas: _C, FabricImage } = await import("fabric");
      const c = fabricRef.current;
      if (!c) return;
      try {
        const htmlImg = await rasterFromUrl(url);
        const img = new FabricImage(htmlImg, {
          originX: "left",
          originY: "top",
        });
        (img as FabricObject & { __lid?: string }).__lid = `img_${Date.now().toString(16)}`;
        const maxSide = opts?.asBackground ? Math.min(CANVAS_W, CANVAS_H) * 0.92 : Math.min(CANVAS_W, CANVAS_H) * 0.55;
        const scale = Math.min(maxSide / (img.width || 1), maxSide / (img.height || 1), 1);
        img.scale(scale);
        if (opts?.asBackground) {
          img.set({
            left: (CANVAS_W - (img.width || 0) * scale) / 2,
            top: (CANVAS_H - (img.height || 0) * scale) / 2,
            selectable: true,
            evented: true,
          });
          c.sendObjectToBack(img);
        } else {
          img.set({ left: 80 + Math.random() * 40, top: 80 + Math.random() * 40 });
        }
        c.add(img);
        c.setActiveObject(img);
        c.requestRenderAll();
        setSelected(img);
        syncLayers();
      } catch {
        /* 忽略单次加载失败 */
      }
    },
    [syncLayers],
  );

  const exportPng = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return null;
    try {
      return c.toDataURL({ format: "png", multiplier: 1, enableRetinaScaling: true });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    exposeHandle?.({ addImageFromUrl, addText, exportPng });
  }, [addImageFromUrl, addText, exportPng, exposeHandle]);

  useEffect(() => {
    let disposed = false;
    let canvas: Canvas | null = null;

    void (async () => {
      const { Canvas: FabricCanvas } = await import("fabric");
      if (disposed || !canvasElRef.current) return;

      canvas = new FabricCanvas(canvasElRef.current, {
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: "#e8edf7",
        preserveObjectStacking: true,
        selection: true,
      });

      fabricRef.current = canvas;

      const onSel = (e: Partial<TEvent> & { selected?: FabricObject[]; deselected?: FabricObject[] }) => {
        const target = e.selected?.[0] ?? canvas!.getActiveObject() ?? undefined;
        setSelected(target);
        if (isIText(target)) {
          setTextContent(target.text ?? "");
          setFontSize(target.fontSize ?? 36);
          setFill(typeof target.fill === "string" ? target.fill : "#0f172a");
          setFontFamily(target.fontFamily ?? fontFamily);
        }
      };

      canvas.on("selection:created", onSel);
      canvas.on("selection:updated", onSel);
      canvas.on("selection:cleared", () => setSelected(undefined));
      canvas.on("object:added", syncLayers);
      canvas.on("object:removed", syncLayers);
      canvas.on("object:modified", syncLayers);
      canvas.on("text:changed", (e) => {
        const t = e.target;
        if (isIText(t)) setTextContent(t.text ?? "");
      });

      canvas.on("mouse:wheel", (opt) => {
        const e = opt.e as WheelEvent;
        if (!e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY;
        const cur = canvas!.getZoom();
        let z = cur * 0.999 ** delta;
        z = Math.min(4, Math.max(0.25, z));
        canvas!.zoomToPoint(canvas!.getScenePoint(e), z);
        canvas!.requestRenderAll();
        setZoomPct(Math.round(z * 100));
      });

      syncLayers();
    })();

    return () => {
      disposed = true;
      canvas?.dispose();
      fabricRef.current = null;
    };
  }, [fontFamily, syncLayers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected]);

  /** 仅把右侧面板的修改同步到「当前选中」的 IText，避免切换图层时用旧 state 覆盖 */
  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    const o = c.getActiveObject();
    if (!isIText(o)) return;
    o.set({ text: textContent, fontSize, fill, fontFamily, fontWeight });
    o.setCoords();
    c.requestRenderAll();
  }, [textContent, fontSize, fill, fontFamily, fontWeight]);

  const bringForward = () => {
    const c = fabricRef.current;
    const o = c?.getActiveObject();
    if (!c || !o) return;
    c.bringObjectForward(o);
    c.requestRenderAll();
    syncLayers();
  };

  const sendBackwards = () => {
    const c = fabricRef.current;
    const o = c?.getActiveObject();
    if (!c || !o) return;
    c.sendObjectBackwards(o);
    c.requestRenderAll();
    syncLayers();
  };

  const downloadExport = () => {
    const data = exportPng();
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = `canvas-export-${Date.now()}.png`;
    a.click();
  };

  return (
    <div ref={wrapRef} className="flex flex-col gap-2 min-h-0 flex-1" tabIndex={-1}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--carpet-text-muted)]">
        <span>
          画布 {CANVAS_W}×{CANVAS_H}
        </span>
        <span className="carpet-tag carpet-tag-info">Alt + 滚轮缩放</span>
        <span className="carpet-tag carpet-tag-info">双击文字进入编辑</span>
        <label className="flex items-center gap-1 ml-2">
          缩放
          <input
            type="range"
            min={25}
            max={200}
            value={zoomPct}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="w-28"
          />
          <span>{zoomPct}%</span>
        </label>
      </div>
      <div className="flex-1 min-h-0 overflow-auto rounded-[6px] border border-[var(--carpet-border)] bg-[#d4dbe8] p-4">
        <div className="inline-block shadow-lg rounded-[4px] overflow-hidden bg-white">
          <canvas ref={canvasElRef} />
        </div>
      </div>
      {selected && isIText(selected) ? (
        <div className="carpet-card p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-semibold text-[var(--carpet-text)]">文字内容</span>
            <textarea
              className="carpet-input min-h-[72px] text-sm"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            字号
            <input
              type="number"
              className="carpet-input text-sm"
              min={8}
              max={400}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value) || 24)}
            />
          </label>
          <label className="flex flex-col gap-1">
            颜色
            <input type="color" className="h-9 w-full carpet-input p-1" value={fill} onChange={(e) => setFill(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            字体
            <select className="carpet-input text-sm" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              <option value='"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif'>黑体/苹方（中文）</option>
              <option value="system-ui, sans-serif">系统无衬线</option>
              <option value="Georgia, serif">衬线（英文标题）</option>
              <option value='"Arial Black", Arial, sans-serif'>Arial Black</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            字重
            <select
              className="carpet-input text-sm"
              value={fontWeight}
              onChange={(e) => setFontWeight(e.target.value as "400" | "600" | "700")}
            >
              <option value="400">常规</option>
              <option value="600">半粗</option>
              <option value="700">粗体</option>
            </select>
          </label>
        </div>
      ) : null}
      {selected && isFabricImage(selected) ? (
        <p className="text-xs text-[var(--carpet-text-muted)]">
          已选中图片：拖拽四角缩放旋转。可从左侧素材「铺满画布」或「新增图层」。
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="carpet-btn-secondary px-3 py-2 text-xs"
          onClick={() => void addText()}
        >
          添加文字
        </button>
        <button type="button" className="carpet-btn-secondary px-3 py-2 text-xs" onClick={bringForward} disabled={!selected}>
          上移一层
        </button>
        <button type="button" className="carpet-btn-secondary px-3 py-2 text-xs" onClick={sendBackwards} disabled={!selected}>
          下移一层
        </button>
        <button type="button" className="carpet-btn-secondary px-3 py-2 text-xs" onClick={deleteSelected} disabled={!selected}>
          删除选中
        </button>
        <button type="button" className="carpet-btn-primary px-3 py-2 text-xs" onClick={downloadExport}>
          导出 PNG
        </button>
      </div>
      <div className="carpet-card p-2 max-h-28 overflow-y-auto">
        <div className="text-[11px] font-semibold text-[var(--carpet-text)] mb-1">图层</div>
        <ul className="space-y-1">
          {layers.map((L, i) => (
            <li key={`${L.id}-${i}`}>
              <button
                type="button"
                className="text-left w-full text-[11px] px-2 py-1 rounded border border-transparent hover:border-[var(--carpet-border)] hover:bg-white"
                onClick={() => selectByIndex(i)}
              >
                {L.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
