import { AppSettings } from "../models/index.js";

const SETTINGS_KEY = "global";

function defaultRateFromEnv() {
  const n = Number(process.env.USDT_TO_INR_RATE);
  return Number.isFinite(n) && n > 0 ? n : 83;
}

export async function getUsdtToInrRate(): Promise<number> {
  const doc = await AppSettings.findOne({ key: SETTINGS_KEY });
  if (doc?.usdtToInrRate && doc.usdtToInrRate > 0) return doc.usdtToInrRate;
  return defaultRateFromEnv();
}

export async function setUsdtToInrRate(rate: number) {
  return AppSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { usdtToInrRate: rate },
    { upsert: true, new: true }
  );
}

export async function getTodayInrBonusPercent(): Promise<number> {
  const doc = await AppSettings.findOne({ key: SETTINGS_KEY });
  const legacy = doc && "todayInrBonus" in doc ? Number((doc as { todayInrBonus?: number }).todayInrBonus) : NaN;
  const n = Number(doc?.todayInrBonusPercent ?? (Number.isFinite(legacy) ? legacy : 0));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100, Math.round(n * 100) / 100);
}

export async function setTodayInrBonusPercent(percent: number) {
  const value = Math.min(100, Math.max(0, Math.round(percent * 100) / 100));
  return AppSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { todayInrBonusPercent: value },
    { upsert: true, new: true }
  );
}

export async function getReferralCommissionPercent(): Promise<number> {
  const doc = await AppSettings.findOne({ key: SETTINGS_KEY });
  const n = Number(doc?.referralCommissionPercent);
  if (!Number.isFinite(n) || n < 0) return 5;
  return Math.min(100, Math.round(n * 100) / 100);
}

export async function setReferralCommissionPercent(percent: number) {
  const value = Math.min(100, Math.max(0, Math.round(percent * 100) / 100));
  return AppSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { referralCommissionPercent: value },
    { upsert: true, new: true }
  );
}

export async function getPlatformSettings() {
  const rate = await getUsdtToInrRate();
  const todayInrBonusPercent = await getTodayInrBonusPercent();
  const referralCommissionPercent = await getReferralCommissionPercent();
  const { getHomeBanner } = await import("./homeBanner.js");
  const homeBanner = await getHomeBanner();
  return { usdtToInrRate: rate, todayInrBonusPercent, referralCommissionPercent, homeBanner };
}
