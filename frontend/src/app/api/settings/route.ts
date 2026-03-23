import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import {
  DEFAULT_APP_SETTINGS,
  SETTINGS_FILE,
  type AppSettings,
} from "@/lib/app-settings";

export async function GET() {
  const settings = await readJsonFile<AppSettings>(SETTINGS_FILE, DEFAULT_APP_SETTINGS);
  return NextResponse.json({ settings: { ...DEFAULT_APP_SETTINGS, ...settings } });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<AppSettings>;
  const prev = await readJsonFile<AppSettings>(SETTINGS_FILE, DEFAULT_APP_SETTINGS);
  const merged: AppSettings = { ...DEFAULT_APP_SETTINGS, ...prev, ...body };
  await writeJsonFile(SETTINGS_FILE, merged);
  return NextResponse.json({ settings: merged });
}

