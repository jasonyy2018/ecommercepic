import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import {
  DEFAULT_APP_SETTINGS,
  SETTINGS_FILE,
  type AppSettings,
} from "@/lib/app-settings";
import { getSettingsDiagnosticSafe } from "@/lib/settings-diagnostic";

export async function GET() {
  const settings = await readJsonFile<AppSettings>(SETTINGS_FILE, DEFAULT_APP_SETTINGS);
  const diagnostic = await getSettingsDiagnosticSafe();
  return NextResponse.json({
    settings: { ...DEFAULT_APP_SETTINGS, ...settings },
    diagnostic,
  });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<AppSettings>;
  const prev = await readJsonFile<AppSettings>(SETTINGS_FILE, DEFAULT_APP_SETTINGS);
  const merged: AppSettings = { ...DEFAULT_APP_SETTINGS, ...prev, ...body };
  const igp = merged.imageGenerationProvider;
  if (igp !== "auto" && igp !== "ark" && igp !== "cloudflare") {
    merged.imageGenerationProvider = prev.imageGenerationProvider ?? "auto";
  }
  await writeJsonFile(SETTINGS_FILE, merged);
  const diagnostic = await getSettingsDiagnosticSafe();
  return NextResponse.json({ settings: merged, diagnostic });
}

