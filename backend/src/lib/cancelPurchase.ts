import { Purchase } from "../models/index.js";

export type CancelPurchaseReason = "user_abandoned" | "expired";

export function isAdminActionablePending(p: {
  status?: string;
  settlementMode?: string | null;
  utr?: string | null;
}) {
  return (
    p.status === "PENDING" &&
    p.settlementMode === "MANUAL" &&
    Boolean(p.utr?.trim())
  );
}

/** Deposits the admin panel should list (never includes user-cancelled orders). */
export function adminDepositsQuery(status?: string) {
  if (status === "PENDING") {
    return {
      status: "PENDING",
      settlementMode: "MANUAL",
      utr: { $exists: true, $nin: [null, ""] },
    };
  }
  if (status === "CANCELLED") {
    return { status: "CANCELLED" };
  }
  if (!status) {
    return { status: { $ne: "CANCELLED" } };
  }
  return { status };
}

export async function cancelPendingPurchase(
  purchaseId: string,
  userId: string,
  reason: CancelPurchaseReason = "user_abandoned"
) {
  const purchase = await Purchase.findOne({
    _id: purchaseId,
    userId,
    status: "PENDING",
  });
  if (!purchase) {
    return { ok: false as const, message: "Order not found or already processed" };
  }

  if (purchase.settlementMode === "MANUAL" && purchase.utr?.trim()) {
    return { ok: false as const, message: "UTR already submitted — order awaits admin approval" };
  }
  if (purchase.cryptoTxHash?.trim()) {
    return { ok: false as const, message: "Transaction already submitted" };
  }

  purchase.status = "CANCELLED";
  purchase.adminNote =
    reason === "expired"
      ? "Cancelled — payment not received in time"
      : "Cancelled — user left before completing payment";
  await purchase.save();

  return { ok: true as const, message: "Order cancelled" };
}
