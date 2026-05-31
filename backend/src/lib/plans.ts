import { Purchase } from "../models/index.js";
import { getUsdtToInrRate } from "./appSettings.js";
import { calcCryptoWalletCredit } from "./cryptoPricing.js";

function startOfTodayIST() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${d}T00:00:00+05:30`);
}

export function normalizePlanCategory(raw?: string): "INR" | "CRYPTO" {
  if (raw === "CRYPTO") return "CRYPTO";
  return "INR";
}

export function normalizePlanType(raw?: string): "BASIC" | "VIP" {
  if (raw === "VIP") return "VIP";
  return "BASIC";
}

export function planTypeLabel(type: "BASIC" | "VIP") {
  return type === "VIP" ? "VIP" : "Basic";
}

export function planCategoryLabel(cat: "INR" | "CRYPTO") {
  return cat === "CRYPTO" ? "Crypto" : "INR";
}

export function planPriceCurrency(planCategory: "INR" | "CRYPTO"): "INR" | "USDT" {
  return planCategory === "CRYPTO" ? "USDT" : "INR";
}

export function formatPlanPrice(planCategory: "INR" | "CRYPTO", amount: number) {
  return planCategory === "CRYPTO" ? `${amount} USDT` : `₹${amount}`;
}

/** Auto title from currency + tier + price (no manual plan name needed). */
export function buildPlanName(planCategory: "INR" | "CRYPTO", type: "BASIC" | "VIP", price: number) {
  return `${planCategoryLabel(planCategory)} ${planTypeLabel(type)} · ${formatPlanPrice(planCategory, price)}`;
}

export function categoryFilter(category: "INR" | "CRYPTO") {
  return category === "INR" ? { planCategory: { $in: ["INR", "UPI"] } } : { planCategory: "CRYPTO" };
}

export async function getPlanUsageToday(userId: string, planId: string) {
  const start = startOfTodayIST();
  return Purchase.countDocuments({
    userId,
    planId,
    status: "APPROVED",
    approvedAt: { $gte: start },
  });
}

export async function enrichPlanForUser(
  plan: {
    _id: { toString(): string };
    name: string;
    type: string;
    price: number;
    bonusPercent: number;
    bonusFixed: number;
    dailyLimit: number;
    isActive: boolean;
    sortOrder: number;
    planCategory?: string;
  },
  userId: string
) {
  const usedToday = await getPlanUsageToday(userId, plan._id.toString());
  const remaining = Math.max(0, plan.dailyLimit - usedToday);
  const planType = normalizePlanType(plan.type);
  const planCategory = normalizePlanCategory(plan.planCategory);

  let isLocked = false;
  let lockReason: string | null = null;

  if (!plan.isActive) {
    isLocked = true;
    lockReason = "PLAN_INACTIVE";
  } else if (remaining <= 0) {
    isLocked = true;
    lockReason = "DAILY_LIMIT_REACHED";
  }

  const pendingCount = await Purchase.countDocuments({
    userId,
    planId: plan._id,
    status: "PENDING",
  });

  let bonusPreview: number;
  let creditPreview: number;
  let usdtToInrRate: number | undefined;

  if (planCategory === "CRYPTO") {
    usdtToInrRate = await getUsdtToInrRate();
    const calc = calcCryptoWalletCredit(plan.price, plan.bonusPercent, plan.bonusFixed, usdtToInrRate);
    bonusPreview = calc.bonusUsdt;
    creditPreview = calc.creditInr;
  } else {
    bonusPreview = Math.round(((plan.price * plan.bonusPercent) / 100 + plan.bonusFixed) * 100) / 100;
    creditPreview = plan.price + bonusPreview;
  }

  return {
    id: plan._id.toString(),
    name: plan.name,
    type: planType,
    typeLabel: planTypeLabel(planType),
    price: plan.price,
    bonusPercent: plan.bonusPercent,
    bonusFixed: plan.bonusFixed,
    dailyLimit: plan.dailyLimit,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    planCategory,
    categoryLabel: planCategoryLabel(planCategory),
    currency: planPriceCurrency(planCategory),
    usedToday,
    remainingToday: remaining,
    isLocked,
    lockReason,
    hasPending: pendingCount > 0,
    bonusPreview,
    creditPreview,
    usdtToInrRate: planCategory === "CRYPTO" ? usdtToInrRate : undefined,
  };
}
