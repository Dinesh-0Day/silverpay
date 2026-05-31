import type { SettlementMode } from "../models/index.js";
import { serialize } from "./serialize.js";

export function sanitizePaymentForClient(doc: Record<string, unknown>) {
  const out = { ...serialize(doc) } as Record<string, unknown>;
  delete out.paytmMerchantKey;
  return out;
}

export function paymentSnapshotForPurchase(doc: Record<string, unknown>) {
  return JSON.stringify(serialize(doc));
}

import type { ZodError } from "zod";

export function zodErrorMessage(err: ZodError) {
  return err.issues.map((i) => i.message).join("; ") || "Invalid input";
}

export type SettlementModeType = SettlementMode;
