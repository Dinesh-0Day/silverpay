import { PaymentDetails, type SettlementMode } from "../models/index.js";
import { pickRotatingPaymentAccount } from "./paymentRotation.js";

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

  return pickRotatingPaymentAccount(opts.settlementMode);
}
