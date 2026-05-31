import type { Types } from "mongoose";
import { Purchase, type SettlementMode, type PlanCategory } from "../models/index.js";
import { PaymentDetails } from "../models/index.js";
import { calcBonus, generateOrderNo } from "./wallet.js";
import { getUsdtToInrRate } from "./appSettings.js";
import { calcCryptoWalletCredit } from "./cryptoPricing.js";
import { paymentSnapshotForPurchase } from "./paymentDetails.js";
import { paymentExpiresAt, generatePaytmStyleOrderId } from "./upi.js";

type PlanDoc = {
  _id: Types.ObjectId;
  price: number;
  bonusPercent: number;
  bonusFixed: number;
  planCategory?: string;
};

export async function createPurchaseRecord(opts: {
  userId: Types.ObjectId;
  plan: PlanDoc;
  amount: number;
  paymentAccount: InstanceType<typeof PaymentDetails>;
  settlementMode: SettlementMode;
  planCategory: PlanCategory;
  isCustomAmount?: boolean;
}) {
  const mode = opts.settlementMode;
  let bonusAmount: number;
  let creditAmount: number;
  let usdtToInrRate: number | undefined;

  if (opts.planCategory === "CRYPTO") {
    usdtToInrRate = await getUsdtToInrRate();
    const calc = calcCryptoWalletCredit(
      opts.amount,
      opts.plan.bonusPercent,
      opts.plan.bonusFixed,
      usdtToInrRate
    );
    bonusAmount = calc.bonusInr;
    creditAmount = calc.creditInr;
  } else {
    bonusAmount = calcBonus(opts.amount, opts.plan.bonusPercent, opts.plan.bonusFixed);
    creditAmount = opts.amount + bonusAmount;
  }
  const cryptoExpectedUsdt =
    mode === "CRYPTO_AUTO"
      ? (opts.paymentAccount.cryptoExpectedUsdt ?? opts.amount)
      : undefined;

  const orderNo =
    mode === "PAYTM_AUTO" ? generatePaytmStyleOrderId() : generateOrderNo();

  const purchase = await Purchase.create({
    orderNo,
    userId: opts.userId,
    planId: opts.plan._id,
    amount: opts.amount,
    bonusAmount,
    creditAmount,
    status: "PENDING",
    paymentDetailsId: opts.paymentAccount._id,
    settlementMode: mode,
    planCategory: opts.planCategory,
    usdtToInrRate,
    isCustomAmount: opts.isCustomAmount ?? false,
    cryptoExpectedUsdt,
    paymentExpiresAt: mode === "PAYTM_AUTO" ? paymentExpiresAt() : undefined,
    paytmOrderId: mode === "PAYTM_AUTO" ? undefined : undefined,
    paymentDetailsSnapshot: paymentSnapshotForPurchase(
      opts.paymentAccount.toObject() as Record<string, unknown>
    ),
  });

  if (mode === "PAYTM_AUTO") {
    purchase.paytmOrderId = orderNo;
    await purchase.save();
  }

  return { purchase, bonusAmount, creditAmount, cryptoExpectedUsdt };
}
