import { AppSettings } from "../models/index.js";

const SETTINGS_KEY = "global";

export type SmsSettingsPublic = {
  enabled: boolean;
  configured: boolean;
  apiKeyMasked: string;
  provider: "apihome";
};

function maskApiKey(key: string) {
  const t = key.trim();
  if (t.length <= 4) return "••••";
  return "••••" + t.slice(-4);
}

export async function getSmsSettingsPublic(): Promise<SmsSettingsPublic> {
  const doc = await AppSettings.findOne({ key: SETTINGS_KEY }).select("+smsApiKey");
  const key = doc?.smsApiKey?.trim() ?? "";
  return {
    enabled: Boolean(doc?.smsEnabled),
    configured: key.length > 0,
    apiKeyMasked: key ? maskApiKey(key) : "",
    provider: "apihome",
  };
}

/** Server-only — never send to client. */
export async function getSmsApiKey(): Promise<string | null> {
  const doc = await AppSettings.findOne({ key: SETTINGS_KEY }).select("+smsApiKey smsEnabled");
  if (!doc?.smsEnabled) return null;
  const key = doc.smsApiKey?.trim();
  return key || null;
}

export async function isSmsReady(): Promise<boolean> {
  const doc = await AppSettings.findOne({ key: SETTINGS_KEY }).select("+smsApiKey smsEnabled");
  return Boolean(doc?.smsEnabled && doc.smsApiKey?.trim());
}

export async function updateSmsSettings(input: {
  enabled?: boolean;
  apiKey?: string;
  clearApiKey?: boolean;
}) {
  const update: Record<string, unknown> = {};
  if (input.enabled !== undefined) update.smsEnabled = input.enabled;
  if (input.clearApiKey) update.smsApiKey = "";
  else if (input.apiKey !== undefined && input.apiKey.trim()) {
    update.smsApiKey = input.apiKey.trim();
  }
  await AppSettings.findOneAndUpdate({ key: SETTINGS_KEY }, update, { upsert: true, new: true });
  return getSmsSettingsPublic();
}
