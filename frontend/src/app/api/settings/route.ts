import path from "node:path";
import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";

type AppSettings = {
  textModelKey: string;
  imageModelKey: string;
  videoModelKey: string;
  uploadDir: string;
  maxConcurrency: string;
  defaultRatios: string;
  brandName: string;
  watermark: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  textModelKey: "",
  imageModelKey: "",
  videoModelKey: "",
  uploadDir: "",
  maxConcurrency: "3",
  defaultRatios: "1:1,3:4,16:9",
  brandName: "",
  watermark: "",
};

const SETTINGS_FILE = path.join(process.cwd(), ".data", "settings.json");

export async function GET() {
  const settings = await readJsonFile<AppSettings>(SETTINGS_FILE, DEFAULT_SETTINGS);
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<AppSettings>;
  const merged = { ...(await readJsonFile<AppSettings>(SETTINGS_FILE, DEFAULT_SETTINGS)), ...body };
  await writeJsonFile(SETTINGS_FILE, merged);
  return NextResponse.json({ settings: merged });
}

