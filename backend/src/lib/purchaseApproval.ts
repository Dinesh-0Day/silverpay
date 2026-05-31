import { Purchase } from "../models/index.js";
import { payReferralCommission } from "./referralCommission.js";
import { creditWallet } from "./wallet.js";
import { idStr } from "./serialize.js";

export async function approvePurchase(
  purchaseId: string,
  options?: { adminNote?: string; auto?: boolean; paymentRef?: string }
) {
  const purchase = await Purchase.findById(purchaseId).populate("planId");
  if (!purchase) throw new Error("Deposit not found");
  if (purchase.status !== "PENDING") throw new Error("Deposit is not pending");

  purchase.status = "APPROVED";
  purchase.approvedAt = new Date();
  if (options?.adminNote) purchase.adminNote = options.adminNote;
  if (options?.paymentRef) purchase.paymentRef = options.paymentRef;
  if (options?.auto) purchase.autoApproved = true;
  await purchase.save();

  const planName = (purchase.planId as { name?: string })?.name ?? "Plan";
  await creditWallet(
    purchase.userId.toString(),
    purchase.creditAmount,
    "PLAN_CREDIT",
    idStr(purchase),
    options?.auto ? `Crypto deposit approved: ${planName}` : `Deposit approved: ${planName}`
  );

  await payReferralCommission(purchase);

  return purchase;
}
