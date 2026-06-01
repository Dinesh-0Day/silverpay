import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  PaymentDetails,
  Plan,
  Purchase,
  Payout,
  LedgerEntry,
  Notification,
  SupportConversation,
  User,
} from "../models/index.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { enrichPlanForUser, categoryFilter, normalizePlanCategory } from "../lib/plans.js";
import {
  getMinUsdtDeposit,
  getPlatformSettings,
  getTodayInrBonusPercent,
  getUsdtToInrRate,
  minUsdtDepositError,
} from "../lib/appSettings.js";
import { getHomeDepositDashboardStats } from "../lib/homeDepositStats.js";
import { getHomeWalletSummary } from "../lib/homeWallet.js";
import { paginated, parsePaginationQuery } from "../lib/pagination.js";
import { runWithTransaction } from "../lib/mongoTransaction.js";
import { getHomePromo } from "../lib/homePromo.js";
import {
  claimNewbieReward,
  getNewbieRewardsForUser,
  recordTelegramRewardOpen,
} from "../lib/newbieRewards.js";
import { getHomeBannerSlidesForUser } from "../lib/homeBanner.js";
import { calcCryptoWalletCredit } from "../lib/cryptoPricing.js";
import { holdFunds } from "../lib/wallet.js";
import { idStr, serialize, serializeList } from "../lib/serialize.js";
import { sanitizePaymentForClient, zodErrorMessage } from "../lib/paymentDetails.js";
import { approvePurchase } from "../lib/purchaseApproval.js";
import { verifyCryptoPayment } from "../lib/cryptoVerify.js";
import { checkPaytmOrderStatus } from "../lib/paytm.js";
import { resolvePaymentAccount } from "../lib/resolvePayment.js";
import {
  listManualPaymentAccounts,
  listPaytmAutoPaymentAccounts,
  pickRotatingPaymentAccount,
} from "../lib/paymentRotation.js";
import { createPurchaseRecord } from "../lib/createPurchase.js";
import { cancelPendingPurchase } from "../lib/cancelPurchase.js";
import { generateUniqueReferralCode } from "../lib/referral.js";
import { getTeamOverview } from "../lib/team.js";
import { buildUpiPaymentUri, paymentTimerMinutes, paymentTimeoutSeconds } from "../lib/upi.js";
import type { PlanCategory, SettlementMode } from "../models/index.js";

export const userRouter = Router();
userRouter.use(requireAuth("user"));

userRouter.get("/team", async (req: AuthRequest, res) => {
  try {
    res.json(await getTeamOverview(req.user!.sub));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load team";
    res.status(404).json({ error: msg });
  }
});

userRouter.get("/me", async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (!user.referralCode) {
    user.referralCode = await generateUniqueReferralCode();
    await user.save();
  }
  res.json({
    id: idStr(user),
    uid: user.uid,
    referralCode: user.referralCode,
    mobile: user.mobile,
    mobileDisplay: user.mobile ? `+91 ${user.mobile}` : undefined,
    email: user.email,
    name: user.name,
    isVip: user.isVip,
    balance: user.balance,
    held: user.held,
    available: user.balance - user.held,
    bankAccount: user.bankAccount ?? null,
  });
});

/** UPI: manual vs automatic availability (lists all; deposit uses round-robin pick). */
userRouter.get("/payment-options", async (_req, res) => {
  const [manualDocs, autoDocs] = await Promise.all([listManualPaymentAccounts(), listPaytmAutoPaymentAccounts()]);

  const manual = manualDocs
    .filter((d) => Boolean(d.upiId?.trim()))
    .map((d) => sanitizePaymentForClient(d.toObject() as Record<string, unknown>));
  const automatic = autoDocs
    .filter((d) => Boolean(d.upiId?.trim() && d.paytmMerchantId?.trim()))
    .map((d) => sanitizePaymentForClient(d.toObject() as Record<string, unknown>));

  res.json({
    manual,
    automatic,
    timerMinutes: paymentTimerMinutes(),
    paymentTimeoutSeconds: paymentTimeoutSeconds(),
  });
});

userRouter.get("/payment-details", async (_req, res) => {
  const details = await pickRotatingPaymentAccount("MANUAL");
  if (!details) {
    res.status(503).json({ error: "Payment details not configured" });
    return;
  }
  res.json(sanitizePaymentForClient(details.toObject() as Record<string, unknown>));
});

userRouter.get("/plans", async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const category = req.query.category as string | undefined;
  const filter: Record<string, unknown> = { isActive: true };
  if (category === "INR" || category === "UPI") Object.assign(filter, categoryFilter("INR"));
  else if (category === "CRYPTO") Object.assign(filter, categoryFilter("CRYPTO"));

  const plans = await Plan.find(filter).sort({ sortOrder: 1, price: 1 });
  const enriched = await Promise.all(plans.map((p) => enrichPlanForUser(p, idStr(user))));

  if (!category) {
    res.json({
      inr: enriched.filter((p) => p.planCategory === "INR"),
      crypto: enriched.filter((p) => p.planCategory === "CRYPTO"),
    });
    return;
  }
  res.json(enriched);
});

/** Crypto calculator preview (uses first active crypto plan bonus rules) */
userRouter.get("/crypto-calculator", async (req: AuthRequest, res) => {
  const amount = Number(req.query.amount);
  const minUsdt = await getMinUsdtDeposit();
  if (!amount || amount < minUsdt) {
    res.status(400).json({ error: amount ? minUsdtDepositError(amount, minUsdt) : "Enter a valid amount" });
    return;
  }
  const template = await Plan.findOne({ isActive: true, planCategory: "CRYPTO" }).sort({ sortOrder: 1 });
  if (!template) {
    res.status(503).json({ error: "No crypto plan configured for bonus rules" });
    return;
  }
  const usdtToInrRate = await getUsdtToInrRate();
  const calc = calcCryptoWalletCredit(amount, template.bonusPercent, template.bonusFixed, usdtToInrRate);
  res.json({
    amount,
    currency: "USDT",
    minUsdtDeposit: minUsdt,
    usdtToInrRate,
    bonusPercent: template.bonusPercent,
    bonusFixed: template.bonusFixed,
    bonusAmount: calc.bonusUsdt,
    bonusAmountInr: calc.bonusInr,
    creditAmount: calc.creditInr,
    creditCurrency: "INR",
    templatePlanId: idStr(template),
    templatePlanName: template.name,
  });
});

userRouter.get("/crypto-settings", async (_req, res) => {
  res.json(await getPlatformSettings());
});

userRouter.get("/newbie-rewards", async (req: AuthRequest, res) => {
  res.json(await getNewbieRewardsForUser(req.user!.sub));
});

userRouter.post("/newbie-rewards/:rewardId/telegram-open", async (req: AuthRequest, res) => {
  const rewardId = String(req.params.rewardId ?? "").trim();
  if (!rewardId) {
    res.status(400).json({ error: "Reward id required" });
    return;
  }
  try {
    const result = await recordTelegramRewardOpen(req.user!.sub, rewardId);
    const overview = await getNewbieRewardsForUser(req.user!.sub);
    res.json({ ...result, rewards: overview });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not record Telegram open";
    res.status(400).json({ error: msg });
  }
});

userRouter.post("/newbie-rewards/:rewardId/claim", async (req: AuthRequest, res) => {
  const rewardId = String(req.params.rewardId ?? "").trim();
  if (!rewardId) {
    res.status(400).json({ error: "Reward id required" });
    return;
  }
  try {
    const result = await claimNewbieReward(req.user!.sub, rewardId);
    const overview = await getNewbieRewardsForUser(req.user!.sub);
    res.json({ ...result, rewards: overview });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not claim reward";
    const status = msg.includes("already claimed") ? 409 : 400;
    res.status(status).json({ error: msg });
  }
});

/** Home wallet card: USDT rate & today's INR bonus (admin-set) */
userRouter.get("/home-info", async (req: AuthRequest, res) => {
  const userId = req.user!.sub;
  const [wallet, promo, depositDashboard] = await Promise.all([
    getHomeWalletSummary(userId),
    getHomePromo(),
    getHomeDepositDashboardStats(userId),
  ]);
  res.json({
    usdtToInrRate: await getUsdtToInrRate(),
    todayInrBonusPercent: await getTodayInrBonusPercent(),
    balance: wallet.balance,
    depositTotal: wallet.depositTotal,
    withdrawalTotal: wallet.withdrawalTotal,
    commission: wallet.commission,
    commissionTotal: wallet.commission.total,
    depositDashboard,
    promo: promo.enabled && promo.imageUrl ? promo : { enabled: false, imageUrl: "", linkUrl: "" },
  });
});

userRouter.get("/home-promo", async (_req, res) => {
  const promo = await getHomePromo();
  res.json(promo.enabled && promo.imageUrl ? promo : { enabled: false, imageUrl: "", linkUrl: "" });
});

/** Home banner slider slides (admin-configured) */
userRouter.get("/home-banner", async (_req, res) => {
  const { enabled, revision, slides } = await getHomeBannerSlidesForUser();
  res.json({ enabled, revision, slides });
});

async function getCryptoTemplatePlan() {
  return Plan.findOne({ isActive: true, planCategory: "CRYPTO" }).sort({ sortOrder: 1 });
}

function depositExpired(p: { paymentExpiresAt?: Date | null; settlementMode?: string | null }) {
  if (p.settlementMode !== "PAYTM_AUTO" || !p.paymentExpiresAt) return false;
  return new Date() > new Date(p.paymentExpiresAt);
}

userRouter.post("/deposits", async (req: AuthRequest, res) => {
  const schema = z.object({
    planId: z.string().optional(),
    customAmount: z.number().positive().optional(),
    settlementMode: z.enum(["MANUAL", "PAYTM_AUTO", "CRYPTO_AUTO"]).optional(),
    userNote: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodErrorMessage(parsed.error) });
    return;
  }

  const user = await User.findById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let plan;
  let amount: number;
  let planCategory: PlanCategory;
  let isCustomAmount = false;

  if (parsed.data.customAmount) {
    plan = await getCryptoTemplatePlan();
    if (!plan) {
      res.status(503).json({ error: "Crypto plans not configured" });
      return;
    }
    amount = parsed.data.customAmount;
    planCategory = "CRYPTO";
    isCustomAmount = true;
  } else if (parsed.data.planId) {
    plan = await Plan.findById(parsed.data.planId);
    if (!plan || !plan.isActive) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    amount = plan.price;
    planCategory = normalizePlanCategory(plan.planCategory);
  } else {
    res.status(400).json({ error: "planId or customAmount required" });
    return;
  }

  const enriched = await enrichPlanForUser(plan, idStr(user));
  if (!isCustomAmount && enriched.isLocked) {
    res.status(403).json({ error: "Plan is locked", lockReason: enriched.lockReason });
    return;
  }

  if (planCategory === "CRYPTO") {
    const minUsdt = await getMinUsdtDeposit();
    if (amount < minUsdt) {
      res.status(400).json({ error: minUsdtDepositError(amount, minUsdt) });
      return;
    }
  }

  let settlementMode: SettlementMode;
  if (planCategory === "CRYPTO") {
    settlementMode = "CRYPTO_AUTO";
  } else {
    if (!parsed.data.settlementMode || !["MANUAL", "PAYTM_AUTO"].includes(parsed.data.settlementMode)) {
      res.status(400).json({ error: "Choose payment method: MANUAL or PAYTM_AUTO" });
      return;
    }
    settlementMode = parsed.data.settlementMode;
  }

  const channel = planCategory === "CRYPTO" ? "CRYPTO" : "UPI";
  const paymentAccount = await resolvePaymentAccount({ channel, settlementMode });
  if (!paymentAccount) {
    res.status(503).json({
      error:
        settlementMode === "MANUAL"
          ? "No manual UPI account configured"
          : settlementMode === "PAYTM_AUTO"
            ? "No Paytm automatic account configured"
            : "No crypto account configured",
    });
    return;
  }

  if (settlementMode === "MANUAL" && !paymentAccount.upiId?.trim()) {
    res.status(503).json({ error: "Manual UPI ID not set in admin panel" });
    return;
  }

  if (settlementMode === "PAYTM_AUTO") {
    if (!paymentAccount.upiId?.trim()) {
      res.status(503).json({ error: "Paytm merchant UPI ID not configured — QR cannot be generated" });
      return;
    }
    if (!paymentAccount.paytmMerchantId?.trim()) {
      res.status(503).json({ error: "Paytm Merchant ID (MID) not configured" });
      return;
    }
  }

  const { purchase, cryptoExpectedUsdt } = await createPurchaseRecord({
    userId: user._id,
    plan,
    amount,
    paymentAccount,
    settlementMode,
    planCategory,
    isCustomAmount,
  });

  const populated = await Purchase.findById(purchase._id).populate("planId");
  res.status(201).json({
    deposit: formatDeposit(populated),
    settlementMode,
    planCategory,
    cryptoExpectedUsdt,
    redirectTo: `/pay/${purchase._id}`,
  });
});

/** Payment page data: QR, timer, amounts */
userRouter.get("/deposits/:id/payment-session", async (req: AuthRequest, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, userId: req.user!.sub }).populate("planId");
  if (!purchase) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const snapshot = purchase.paymentDetailsSnapshot
    ? (JSON.parse(purchase.paymentDetailsSnapshot) as Record<string, string>)
    : {};
  const payment = purchase.paymentDetailsId ? await PaymentDetails.findById(purchase.paymentDetailsId) : null;

  const upiId = payment?.upiId || snapshot.upiId;
  const payeeName = payment?.accountHolder || snapshot.accountHolder || "SilverPay";
  const amount = purchase.amount ?? 0;
  const expired = depositExpired(purchase);
  const expiresAt = purchase.paymentExpiresAt;
  const secondsRemaining = expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : null;

  let upiDeepLink: string | null = null;
  if (upiId && (purchase.planCategory === "INR" || purchase.planCategory === "UPI")) {
    upiDeepLink = buildUpiPaymentUri({
      vpa: upiId,
      payeeName,
      amount,
      transactionRef: purchase.orderNo,
      note: `TXN${Date.now()}`,
    });
  }

  const cryptoAddress = payment?.cryptoAddress || snapshot.cryptoAddress;
  const cryptoNetwork = payment?.cryptoNetwork || snapshot.cryptoNetwork;

  const isCrypto = purchase.planCategory === "CRYPTO";
  res.json({
    deposit: formatDeposit(purchase),
    settlementMode: purchase.settlementMode,
    planCategory: purchase.planCategory,
    amount,
    payCurrency: isCrypto ? "USDT" : "INR",
    usdtToInrRate: purchase.usdtToInrRate ?? (isCrypto ? await getUsdtToInrRate() : undefined),
    bonusAmount: purchase.bonusAmount,
    creditAmount: purchase.creditAmount,
    creditCurrency: "INR",
    expired,
    timerMinutes: paymentTimerMinutes(),
    paymentTimeoutSeconds: paymentTimeoutSeconds(),
    checkIntervalMs: Number(process.env.PAYMENT_CHECK_INTERVAL_MS || 10000),
    expiresAt,
    secondsRemaining,
    upi: upiDeepLink
      ? { vpa: upiId, payeeName, amount, deepLink: upiDeepLink }
      : null,
    crypto:
      purchase.settlementMode === "CRYPTO_AUTO"
        ? {
            address: cryptoAddress,
            network: cryptoNetwork,
            expectedUsdt: purchase.cryptoExpectedUsdt ?? amount,
            qrText: cryptoAddress,
          }
        : null,
  });
});

userRouter.get("/deposits/:id/status", async (req: AuthRequest, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, userId: req.user!.sub });
  if (!purchase) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    status: purchase.status,
    autoApproved: purchase.autoApproved,
    expired: depositExpired(purchase),
    creditAmount: purchase.creditAmount,
  });
});

/** Manual bank/UPI — user submits UTR, admin approves */
userRouter.post("/deposits/:id/submit-utr", async (req: AuthRequest, res) => {
  const schema = z.object({ utr: z.string().min(4) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid UTR required" });
    return;
  }

  const purchase = await Purchase.findOne({
    _id: req.params.id,
    userId: req.user!.sub,
    status: "PENDING",
    settlementMode: "MANUAL",
  });
  if (!purchase) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (depositExpired(purchase)) {
    res.status(400).json({ error: "Payment time expired. Create a new order." });
    return;
  }

  purchase.utr = parsed.data.utr.trim();
  purchase.paymentRef = parsed.data.utr.trim();
  await purchase.save();

  res.json({
    deposit: formatDeposit(await purchase.populate("planId")),
    message: "UTR submitted. Admin will verify and approve your payment.",
  });
});

/** Crypto — verify on-chain and auto-approve (no payment gateway) */
userRouter.post("/deposits/:id/verify-crypto", async (req: AuthRequest, res) => {
  const schema = z.object({ txHash: z.string().min(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid transaction hash required" });
    return;
  }

  const purchase = await Purchase.findOne({
    _id: req.params.id,
    userId: req.user!.sub,
    status: "PENDING",
    settlementMode: "CRYPTO_AUTO",
  });
  if (!purchase) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const payment = purchase.paymentDetailsId
    ? await PaymentDetails.findById(purchase.paymentDetailsId)
    : null;
  const snapshot = purchase.paymentDetailsSnapshot
    ? (JSON.parse(purchase.paymentDetailsSnapshot) as {
        cryptoAddress?: string;
        cryptoNetwork?: string;
      })
    : {};

  const address = payment?.cryptoAddress || snapshot.cryptoAddress;
  const network = payment?.cryptoNetwork || snapshot.cryptoNetwork || "TRC20";
  const minUsdt = purchase.cryptoExpectedUsdt ?? purchase.amount ?? 0;
  if (!minUsdt || minUsdt <= 0) {
    res.status(400).json({ error: "Invalid crypto amount" });
    return;
  }

  if (!address) {
    res.status(400).json({ error: "Crypto wallet not configured" });
    return;
  }

  const verified = await verifyCryptoPayment(network, parsed.data.txHash, address, minUsdt);
  if (!verified.ok) {
    res.status(400).json({ error: verified.error });
    return;
  }

  const existing = await Purchase.findOne({
    cryptoTxHash: parsed.data.txHash.trim(),
    status: "APPROVED",
    _id: { $ne: purchase._id },
  });
  if (existing) {
    res.status(400).json({ error: "This transaction was already used" });
    return;
  }

  purchase.cryptoTxHash = parsed.data.txHash.trim();
  purchase.paymentRef = parsed.data.txHash.trim();
  await purchase.save();

  try {
    await approvePurchase(purchase._id.toString(), {
      auto: true,
      paymentRef: parsed.data.txHash.trim(),
      adminNote: `Crypto auto-approved (${verified.amount} USDT)`,
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Approval failed" });
    return;
  }

  const updated = await Purchase.findById(purchase._id).populate("planId");
  res.json({
    deposit: formatDeposit(updated),
    message: "Payment verified on blockchain. Wallet credited.",
    credited: true,
  });
});

/** Paytm auto — poll order/status API and approve on TXN_SUCCESS */
userRouter.post("/deposits/:id/paytm-check-status", async (req: AuthRequest, res) => {
  const purchase = await Purchase.findOne({
    _id: req.params.id,
    userId: req.user!.sub,
    settlementMode: "PAYTM_AUTO",
  });

  if (!purchase) {
    res.status(404).json({ success: false, status: "not_found", message: "Order not found" });
    return;
  }

  if (purchase.status === "APPROVED") {
    res.json({
      success: true,
      status: "success",
      message: "Payment already verified",
      amount: purchase.creditAmount,
    });
    return;
  }

  if (purchase.status === "REJECTED") {
    res.json({ success: false, status: "failed", message: "Payment was cancelled" });
    return;
  }

  if (depositExpired(purchase)) {
    res.json({ success: false, status: "expired", message: "Payment session expired" });
    return;
  }

  const payment = purchase.paymentDetailsId
    ? await PaymentDetails.findById(purchase.paymentDetailsId)
    : null;
  const mid = payment?.paytmMerchantId;
  if (!mid) {
    res.status(503).json({ success: false, status: "error", message: "Paytm MID not configured" });
    return;
  }

  const paytm = await checkPaytmOrderStatus(mid, purchase.orderNo);

  if (paytm.success && paytm.status === "TXN_SUCCESS") {
    try {
      await approvePurchase(purchase._id.toString(), {
        auto: true,
        paymentRef: paytm.txnId ?? purchase.orderNo,
        adminNote: "Paytm auto-verified (order/status API)",
      });
      const updated = await Purchase.findById(purchase._id);
      res.json({
        success: true,
        status: "success",
        message: "Payment verified successfully!",
        amount: updated?.creditAmount ?? purchase.creditAmount,
      });
      return;
    } catch (e) {
      res.status(400).json({
        success: false,
        status: "error",
        message: e instanceof Error ? e.message : "Approval failed",
      });
      return;
    }
  }

  if (paytm.status === "TXN_FAILURE") {
    res.json({ success: false, status: "failed", message: paytm.message ?? "Payment failed" });
    return;
  }

  res.json({
    success: true,
    status: "pending",
    message: "Waiting for payment confirmation…",
  });
});

/** Cancel abandoned / expired pending order (hidden from admin). */
userRouter.post("/deposits/:id/cancel-abandoned", async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const reason = (req.body as { reason?: string })?.reason === "expired" ? "expired" : "user_abandoned";
  const result = await cancelPendingPurchase(id, req.user!.sub, reason);
  if (!result.ok) {
    res.json({ success: false, message: result.message });
    return;
  }
  res.json({ success: true, message: result.message });
});

/** @deprecated use cancel-abandoned */
userRouter.post("/deposits/:id/cancel-expired", async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const result = await cancelPendingPurchase(id, req.user!.sub, "expired");
  if (!result.ok) {
    res.json({ success: false, message: result.message });
    return;
  }
  res.json({ success: true, message: "Payment expired and cancelled" });
});

userRouter.get("/deposits", async (req: AuthRequest, res) => {
  const userId = req.user!.sub;
  const { page, limit, skip } = parsePaginationQuery(req.query as Record<string, unknown>, {
    defaultLimit: 20,
    maxLimit: 50,
  });
  const filter = { userId };
  const [total, purchases] = await Promise.all([
    Purchase.countDocuments(filter),
    Purchase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("planId"),
  ]);
  res.json(paginated(purchases.map(formatDeposit), page, limit, total));
});

userRouter.get("/deposits/:id/payment-details", async (req: AuthRequest, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, userId: req.user!.sub });
  if (!purchase) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const raw = purchase.paymentDetailsSnapshot ? JSON.parse(purchase.paymentDetailsSnapshot) : null;
  res.json({
    deposit: formatDeposit(purchase),
    paymentDetails: raw ? sanitizePaymentForClient(raw) : null,
    settlementMode: purchase.settlementMode,
    cryptoExpectedUsdt: purchase.cryptoExpectedUsdt,
  });
});

const bankSchema = z.object({
  accountHolder: z.string().min(2),
  accountNumber: z.string().min(5),
  ifsc: z.string().min(5),
  bankName: z.string().min(2),
  upiId: z.string().optional(),
});

userRouter.put("/bank-account", async (req: AuthRequest, res) => {
  const parsed = bankSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await User.findByIdAndUpdate(
    req.user!.sub,
    { bankAccount: parsed.data },
    { new: true }
  );
  res.json(user?.bankAccount);
});

userRouter.get("/pin", async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.sub).select("+pinHash");
  res.json({ configured: Boolean(user?.pinHash) });
});

userRouter.put("/pin", async (req: AuthRequest, res) => {
  const schema = z.object({
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const hash = await bcrypt.hash(parsed.data.pin, 10);
  await User.findByIdAndUpdate(req.user!.sub, { pinHash: hash });
  res.json({ configured: true });
});

userRouter.get("/notifications/unread-count", async (req: AuthRequest, res) => {
  const userId = req.user!.sub;
  const unread = await Notification.countDocuments({
    $or: [{ userId }, { userId: { $exists: false } }, { userId: null }],
    readAt: { $exists: false },
  });
  res.json({ unread });
});

userRouter.get("/notifications", async (req: AuthRequest, res) => {
  const userId = req.user!.sub;
  const list = await Notification.find({
    $or: [{ userId }, { userId: { $exists: false } }, { userId: null }],
  })
    .sort({ createdAt: -1 })
    .limit(100);
  const unread = list.filter((n) => !n.readAt).length;
  res.json({
    unread,
    items: list.map((n) => ({
      ...serialize(n),
      read: Boolean(n.readAt),
    })),
  });
});

userRouter.post("/notifications/read-all", async (req: AuthRequest, res) => {
  const userId = req.user!.sub;
  await Notification.updateMany(
    {
      $or: [{ userId }, { userId: { $exists: false } }, { userId: null }],
      readAt: { $exists: false },
    },
    { $set: { readAt: new Date() } }
  );
  res.json({ success: true });
});

userRouter.get("/wallet/ledger", async (req: AuthRequest, res) => {
  const entries = await LedgerEntry.find({ userId: req.user!.sub })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(serializeList(entries));
});

userRouter.post("/payouts", async (req: AuthRequest, res) => {
  const schema = z.object({ amount: z.number().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  const user = await User.findById(req.user!.sub);
  if (!user?.bankAccount?.accountNumber) {
    res.status(400).json({ error: "Add bank account first" });
    return;
  }

  const available = user.balance - user.held;
  if (parsed.data.amount > available) {
    res.status(400).json({ error: "Insufficient available balance" });
    return;
  }

  const payout = await runWithTransaction(async (session) => {
    await holdFunds(idStr(user), parsed.data.amount, session);
    const [created] = await Payout.create(
      [
        {
          userId: user._id,
          amount: parsed.data.amount,
          status: "REQUESTED",
          bankSnapshot: JSON.stringify(user.bankAccount),
        },
      ],
      session ? { session } : undefined
    );
    return created;
  });
  res.status(201).json(serialize(payout));
});

userRouter.get("/payouts", async (req: AuthRequest, res) => {
  const userId = req.user!.sub;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const filter: Record<string, unknown> = { userId };
  if (status) filter.status = status;
  const { page, limit, skip } = parsePaginationQuery(req.query as Record<string, unknown>, {
    defaultLimit: 20,
    maxLimit: 50,
  });
  const [total, payouts] = await Promise.all([
    Payout.countDocuments(filter),
    Payout.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  res.json(paginated(serializeList(payouts), page, limit, total));
});

userRouter.get("/support/messages", async (req: AuthRequest, res) => {
  const conv = await SupportConversation.findOne({ userId: req.user!.sub });
  if (!conv) {
    res.json({ messages: [] });
    return;
  }
  const messages = conv.messages.map((m) => ({
    id: m._id?.toString(),
    sender: m.sender,
    body: m.body,
    createdAt: m.createdAt,
  }));
  res.json({ messages });
});

userRouter.post("/support/messages", async (req: AuthRequest, res) => {
  const schema = z.object({ body: z.string().min(1).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }

  let conv = await SupportConversation.findOne({ userId: req.user!.sub });
  if (!conv) {
    conv = await SupportConversation.create({ userId: req.user!.sub, messages: [] });
  }
  conv.messages.push({ sender: "USER", body: parsed.data.body });
  conv.status = "OPEN";
  await conv.save();
  const msg = conv.messages[conv.messages.length - 1];
  res.status(201).json({
    id: msg._id?.toString(),
    sender: msg.sender,
    body: msg.body,
    createdAt: msg.createdAt,
  });
});

function formatDeposit(p: any) {
  const base = serialize(p);
  const plan = p.planId as { name?: string; _id?: { toString(): string } } | null;
  const crypto = p.planCategory === "CRYPTO" || p.settlementMode === "CRYPTO_AUTO";
  return {
    ...base,
    planCategory: crypto ? "CRYPTO" : "INR",
    payCurrency: crypto ? "USDT" : "INR",
    walletCreditInr: p.creditAmount ?? 0,
    walletBonusInr: p.bonusAmount ?? 0,
    plan: plan ? { id: plan._id?.toString(), name: plan.name } : null,
  };
}
