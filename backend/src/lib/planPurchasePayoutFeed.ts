import { Payout, Purchase, User } from "../models/index.js";
import { idStr } from "./serialize.js";

/** Snapshot shown in admin Payouts when a plan deposit is successfully credited. */
export async function recordPlanPurchasePayoutEntry(purchaseId: string) {
  const existing = await Payout.findOne({ purchaseId, entryType: "PLAN_PURCHASE" });
  if (existing) return existing;

  const purchase = await Purchase.findById(purchaseId).populate("planId", "name planCategory");
  if (!purchase || purchase.status !== "APPROVED") return null;

  const user = await User.findById(purchase.userId);
  if (!user) return null;

  const plan = purchase.planId as { name?: string } | null;
  const isCrypto = purchase.planCategory === "CRYPTO";

  return Payout.create({
    userId: purchase.userId,
    entryType: "PLAN_PURCHASE",
    purchaseId: purchase._id,
    status: "CREDITED",
    amount: purchase.creditAmount ?? 0,
    planName: plan?.name ?? "Plan",
    planCategory: purchase.planCategory ?? (isCrypto ? "CRYPTO" : "INR"),
    amountPaid: purchase.amount ?? 0,
    payCurrency: isCrypto ? "USDT" : "INR",
    creditAmountInr: purchase.creditAmount ?? 0,
    walletBalance: user.balance,
    walletHeld: user.held,
    bankSnapshot: user.bankAccount ? JSON.stringify(user.bankAccount) : undefined,
    autoApproved: Boolean(purchase.autoApproved),
    adminNote: purchase.autoApproved ? "Automatic payment verified" : "Manual deposit approved",
    paidAt: purchase.approvedAt ?? new Date(),
  });
}

export function withdrawalPayoutFilter(status?: string) {
  const withdrawalOnly = {
    $or: [{ entryType: "WITHDRAWAL" }, { entryType: { $exists: false } }, { entryType: null }],
  };
  if (status) return { ...withdrawalOnly, status };
  return withdrawalOnly;
}

export function buildAdminPayoutFilter(query: Record<string, unknown>) {
  const status = typeof query.status === "string" && query.status ? query.status : undefined;
  const entryType = typeof query.entryType === "string" ? query.entryType : undefined;

  if (entryType === "PLAN_PURCHASE") {
    return { entryType: "PLAN_PURCHASE" };
  }
  if (status) return withdrawalPayoutFilter(status);
  return {};
}

export function isWithdrawalPayout(p: { entryType?: string }) {
  return !p.entryType || p.entryType === "WITHDRAWAL";
}
