import crypto from "crypto";

const PAYTM_STATUS_URL =
  process.env.PAYTM_ENV === "production"
    ? "https://securegw.paytm.in/order/status"
    : "https://securegw-stage.paytm.in/order/status";

export type PaytmStatusResult = {
  success: boolean;
  status: "TXN_SUCCESS" | "TXN_FAILURE" | "PENDING" | "NOT_FOUND" | "ERROR";
  txnId?: string;
  txnAmount?: string;
  message?: string;
};

/**
 * Paytm Order Status API — same as Laravel AutoPaymentController::checkPaytmStatus
 * POST { "MID": "...", "ORDERID": "..." }
 */
export async function checkPaytmOrderStatus(mid: string, orderId: string): Promise<PaytmStatusResult> {
  if (!mid?.trim() || !orderId?.trim()) {
    return { success: false, status: "ERROR", message: "MID and ORDERID required" };
  }

  const body = JSON.stringify({ MID: mid.trim(), ORDERID: orderId.trim() });

  try {
    const res = await fetch(PAYTM_STATUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(body.length),
      },
      body,
    });

    const text = await res.text();
    const result = JSON.parse(text) as {
      STATUS?: string;
      TXNID?: string;
      TXNAMOUNT?: string;
      RESPMSG?: string;
    };

    if (!result?.STATUS) {
      return { success: false, status: "NOT_FOUND", message: "No STATUS in Paytm response" };
    }

    if (result.STATUS === "TXN_SUCCESS") {
      return {
        success: true,
        status: "TXN_SUCCESS",
        txnId: result.TXNID,
        txnAmount: result.TXNAMOUNT,
        message: result.RESPMSG,
      };
    }

    if (result.STATUS === "TXN_FAILURE") {
      return { success: false, status: "TXN_FAILURE", message: result.RESPMSG ?? "Transaction failed" };
    }

    if (result.STATUS === "PENDING") {
      return { success: false, status: "PENDING", message: "Payment pending" };
    }

    return { success: false, status: "ERROR", message: result.RESPMSG ?? result.STATUS };
  } catch (e) {
    return {
      success: false,
      status: "ERROR",
      message: e instanceof Error ? e.message : "Paytm API error",
    };
  }
}

/** Legacy webhook checksum verify (optional callback) */
export function verifyPaytmChecksum(body: Record<string, string>, merchantKey: string) {
  const received = body.CHECKSUMHASH;
  if (!received) return false;
  const params = { ...body };
  delete params.CHECKSUMHASH;
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const expected = crypto.createHmac("sha256", merchantKey).update(sorted).digest("hex");
  return expected === received;
}

export function isPaytmPaymentSuccess(params: Record<string, string>) {
  return (params.STATUS || params.status) === "TXN_SUCCESS";
}
