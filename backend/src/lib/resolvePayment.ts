import { PaymentDetails, type SettlementMode } from "../models/index.js";

export type PaymentChannel = "UPI" | "CRYPTO";

export function channelForMode(mode: SettlementMode): PaymentChannel {
  return mode === "CRYPTO_AUTO" ? "CRYPTO" : "UPI";
}

export async function resolvePaymentAccount(opts: {
  channel: PaymentChannel;
  settlementMode: SettlementMode;
  paymentDetailsId?: string;
}) {
  if (opts.paymentDetailsId) {
    const picked = await PaymentDetails.findOne({
      _id: opts.paymentDetailsId,
      isActive: true,
      paymentChannel: opts.channel,
      settlementMode: opts.settlementMode,
    });
    if (picked) return picked;
  }

  if (opts.settlementMode === "MANUAL") {
    return PaymentDetails.findOne({
      isActive: true,
      upiId: { $exists: true, $ne: "" },
      settlementMode: { $nin: ["PAYTM_AUTO", "CRYPTO_AUTO"] },
      $or: [{ paymentChannel: "UPI" }, { paymentChannel: { $exists: false } }, { paymentChannel: null }],
    }).sort({ isDefault: -1, createdAt: -1 });
  }

  if (opts.settlementMode === "PAYTM_AUTO") {
    return PaymentDetails.findOne({
      isActive: true,
      settlementMode: "PAYTM_AUTO",
      upiId: { $exists: true, $ne: "" },
      paytmMerchantId: { $exists: true, $ne: "" },
      $or: [{ paymentChannel: "UPI" }, { paymentChannel: { $exists: false } }, { paymentChannel: null }],
    }).sort({ isDefault: -1, createdAt: -1 });
  }

  return PaymentDetails.findOne({
    isActive: true,
    paymentChannel: opts.channel,
    settlementMode: opts.settlementMode,
  }).sort({ isDefault: -1, createdAt: -1 });
}
