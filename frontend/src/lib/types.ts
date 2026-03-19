export type AspectRatio = "1:1" | "3:4" | "4:3" | "16:9" | "9:16" | "2:3" | "3:2";

export type PromptType = "SCENE" | "DETAIL" | "FUNCTIONAL";

export type TaskStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export type ProductImageType = "FLAT" | "DISPLAY" | "DETAIL";

export interface ProductImage {
  id: string;
  url: string;
  type: ProductImageType;
  material?: string;
}

export interface ProductDraft {
  id: string;
  name: string;
  category?: string;
  sellingPoints: string[];
  targetAudience?: string;
  scenesBusiness: string[];
  scenesHome: string[];
  modelProfile?: string;
  aspectRatios: AspectRatio[];
  images: ProductImage[];
}

export interface PromptItem {
  id: string;
  index: number; // 1..25
  type: PromptType;
  title: string;
  text: string;
  status: "READY" | "GENERATING" | "DONE" | "FAILED";
}

export interface GeneratedImage {
  id: string;
  promptId: string;
  url: string;
  aspectRatio: AspectRatio;
  createdAt: string;
}

export interface GenerateTask {
  id: string;
  name: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  product: ProductDraft;
  prompts: PromptItem[];
  images: GeneratedImage[];
  finishedCount: number;
  totalCount: number;
}

export interface ApiError {
  error: string;
}

