import { Purchase, User } from "../models/index.js";
import { getReferralCommissionPercent } from "./appSettings.js";
import { creditWallet } from "./wallet.js";
/** Credit referrer when a referred user's deposit is approved (% of wallet credit). */
export async function payReferralCommission(purchase: {
  _id: unknown;
  userId: unknown;
  creditAmount: number;
}) {
  const pct = await getReferralCommissionPercent();
  if (pct <= 0) return;

  const buyer = await User.findById(purchase.userId);
  if (!buyer?.referredByCode || buyer.referredByType !== "USER") return;

  const referrer = await User.findOne({ referralCode: buyer.referredByCode.trim() });
  if (!referrer) return;

  const referrerId = referrer._id.toString();
  if (referrerId === buyer._id.toString()) return;

  const base = Number(purchase.creditAmount) || 0;
  if (base <= 0) return;

  const commission = Math.round(((base * pct) / 100) * 100) / 100;
  if (commission <= 0) return;

  const purchaseId =
    purchase._id && typeof purchase._id === "object" && "toString" in purchase._id
      ? String(purchase._id.toString())
      : String(purchase._id);
  await creditWallet(
    referrerId,
    commission,
    "REFERRAL_COMMISSION",
    purchaseId,
    `Team deposit bonus · UID ${buyer.uid}`
  );
}
