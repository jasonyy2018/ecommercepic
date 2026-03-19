import type { GenerateTask, ProductDraft, PromptItem, PromptType, TaskStatus } from "@/lib/types";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function makeDefaultProductDraft(partial?: Partial<ProductDraft>): ProductDraft {
  return {
    id: partial?.id ?? id("prod"),
    name: partial?.name ?? "未命名地毯",
    category: partial?.category ?? "商用地毯/门垫",
    sellingPoints: partial?.sellingPoints ?? [],
    targetAudience: partial?.targetAudience ?? "",
    scenesBusiness: partial?.scenesBusiness ?? [],
    scenesHome: partial?.scenesHome ?? [],
    modelProfile: partial?.modelProfile ?? "",
    aspectRatios: partial?.aspectRatios ?? ["1:1"],
    images: partial?.images ?? [],
  };
}

function makePrompt(i: number, type: PromptType, title: string, text: string): PromptItem {
  return {
    id: id("prompt"),
    index: i,
    type,
    title,
    text,
    status: "READY",
  };
}

function makeSeedTask(): GenerateTask {
  const product = makeDefaultProductDraft({
    name: "LOGO 定制门口地毯",
    sellingPoints: ["支持企业 LOGO 定制", "防滑橡胶底", "强力吸水，易打理"],
    aspectRatios: ["1:1", "3:4", "16:9"],
    scenesBusiness: ["企业前台", "公司门口", "电梯间"],
    scenesHome: ["玄关", "入户门口"],
  });

  const prompts: PromptItem[] = [
    makePrompt(1, "SCENE", "企业前台欢迎地毯", "modern corporate lobby, front desk, clean lighting, logo mat centered, consistent carpet material and tone"),
    makePrompt(2, "DETAIL", "材质细节特写", "macro shot of carpet fibers, nylon loop pile texture, crisp logo edge, soft side light, shallow depth of field"),
    makePrompt(3, "FUNCTIONAL", "吸水功能展示", "water droplets on mat, absorption demonstration, product-focused, clean background, realistic"),
  ];

  return {
    id: id("task"),
    name: `LOGO 定制门口地毯｜${new Date().toLocaleString("zh-CN")}`,
    status: "RUNNING",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    product,
    prompts,
    images: [],
    finishedCount: 1,
    totalCount: 25,
  };
}

type DbShape = {
  tasks: GenerateTask[];
};

const GLOBAL_KEY = "__CARPET_AI_STUDIO_DB__";

export function getDb(): DbShape {
  const g = globalThis as unknown as Record<string, unknown>;
  const existing = g[GLOBAL_KEY] as DbShape | undefined;
  if (existing) return existing;
  const seeded: DbShape = { tasks: [makeSeedTask()] };
  g[GLOBAL_KEY] = seeded;
  return seeded;
}

export function createTask(input: {
  name: string;
  product: Partial<ProductDraft>;
  prompts: { type: PromptType; title: string; text: string }[];
}): GenerateTask {
  const db = getDb();
  const createdAt = nowIso();
  const product = makeDefaultProductDraft(input.product);
  const prompts: PromptItem[] = input.prompts.map((p, idx) => makePrompt(idx + 1, p.type, p.title, p.text));
  const task: GenerateTask = {
    id: id("task"),
    name: input.name,
    status: "PENDING",
    createdAt,
    updatedAt: createdAt,
    product,
    prompts,
    images: [],
    finishedCount: 0,
    totalCount: prompts.length || 25,
  };
  db.tasks.unshift(task);
  return task;
}

export function setTaskStatus(taskId: string, status: TaskStatus) {
  const db = getDb();
  const t = db.tasks.find((x) => x.id === taskId);
  if (!t) return;
  t.status = status;
  t.updatedAt = nowIso();
}

