import { Router } from "express";
import { PaymentDetails, Purchase } from "../models/index.js";
import { approvePurchase } from "../lib/purchaseApproval.js";
import { isPaytmPaymentSuccess, verifyPaytmChecksum } from "../lib/paytm.js";

export const webhooksRouter = Router();

/** Paytm PG callback — auto-approves purchase on TXN_SUCCESS */
webhooksRouter.post("/paytm/callback", async (req, res) => {
  const params = req.body as Record<string, string>;
  const orderId = params.ORDERID || params.orderId;
  if (!orderId) {
    res.status(400).send("ORDERID missing");
    return;
  }

  const purchase = await Purchase.findOne({ orderNo: orderId });
  if (!purchase) {
    res.status(404).send("Order not found");
    return;
  }

  if (purchase.status === "APPROVED") {
    res.send("OK");
    return;
  }

  if (purchase.settlementMode !== "PAYTM_AUTO") {
    res.status(400).send("Invalid payment mode");
    return;
  }

  const payment = purchase.paymentDetailsId
    ? await PaymentDetails.findById(purchase.paymentDetailsId)
    : null;
  const merchantKey = payment?.paytmMerchantKey;
  if (!merchantKey) {
    res.status(400).send("Merchant key not found");
    return;
  }

  if (!verifyPaytmChecksum(params, merchantKey)) {
    res.status(400).send("Checksum failed");
    return;
  }

  if (!isPaytmPaymentSuccess(params)) {
    purchase.adminNote = `Paytm status: ${params.STATUS || "FAILED"}`;
    await purchase.save();
    res.send("OK");
    return;
  }

  try {
    await approvePurchase(purchase._id.toString(), {
      auto: true,
      paymentRef: params.TXNID || params.txnId,
      adminNote: "Paytm auto-approved",
    });
    res.send("OK");
  } catch (e) {
    console.error("Paytm callback approve failed:", e);
    res.status(500).send("Approval failed");
  }
});
