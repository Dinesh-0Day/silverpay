import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  User,
  Admin,
  Plan,
  PaymentDetails,
  Purchase,
  Payout,
  Notification,
  SupportConversation,
} from "../models/index.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { creditWallet, debitWallet, releaseHold } from "../lib/wallet.js";
import { LedgerEntry } from "../models/index.js";
import { idStr, serialize, serializeList, serializeUser } from "../lib/serialize.js";
import { approvePurchase } from "../lib/purchaseApproval.js";
import { buildPlanName, normalizePlanCategory, normalizePlanType } from "../lib/plans.js";
import {
  getPlatformSettings,
  setMinUsdtDeposit,
  setReferralCommissionPercent,
  setUsdtToInrRate,
} from "../lib/appSettings.js";
import { getSmsSettingsPublic, updateSmsSettings } from "../lib/smsSettings.js";
import { getAdminUsersPage } from "../lib/adminUsers.js";
import { ensureAdminReferralCode } from "../lib/referral.js";
import { getHomeBanner, newSlideId, updateHomeBanner } from "../lib/homeBanner.js";
import { getNewbieRewards, newRewardItemId, updateNewbieRewards } from "../lib/newbieRewards.js";
import { getHomePromo, updateHomePromo } from "../lib/homePromo.js";
import { adminDepositsQuery } from "../lib/cancelPurchase.js";
import {
  buildAdminPayoutFilter,
  isWithdrawalPayout,
  withdrawalPayoutFilter,
} from "../lib/planPurchasePayoutFeed.js";
import { paginated, parsePaginationQuery } from "../lib/pagination.js";
import { runWithTransaction } from "../lib/mongoTransaction.js";
import { homeBannerUpload, homePromoUpload } from "../lib/upload.js";

export const adminRouter = Router();
adminRouter.use(requireAuth("admin"));

adminRouter.get("/me", async (req: AuthRequest, res) => {
  const admin = await Admin.findById(req.user!.sub).select("-passwordHash");
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  const referralCode = await ensureAdminReferralCode(req.user!.sub);
  res.json({
    id: idStr(admin),
    email: admin.email,
    name: admin.name,
    referralCode: referralCode ?? admin.referralCode,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  });
});

adminRouter.get("/platform-settings", async (_req, res) => {
  res.json(await getPlatformSettings());
});

adminRouter.get("/sms-settings", async (_req, res) => {
  res.json(await getSmsSettingsPublic());
});

adminRouter.patch("/sms-settings", async (req: AuthRequest, res) => {
  const schema = z.object({
    enabled: z.boolean().optional(),
    apiKey: z.string().max(500).optional(),
    clearApiKey: z.boolean().optional(),
    currentPassword: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const admin = await Admin.findById(req.user!.sub);
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const { currentPassword: _, ...data } = parsed.data;
  if (data.enabled && !data.apiKey && !data.clearApiKey) {
    const current = await getSmsSettingsPublic();
    if (!current.configured) {
      res.status(400).json({ error: "Enter SMS API key before enabling OTP SMS" });
      return;
    }
  }
  const settings = await updateSmsSettings({
    enabled: data.enabled,
    apiKey: data.apiKey,
    clearApiKey: data.clearApiKey,
  });
  res.json(settings);
});

adminRouter.get("/home-banner", async (_req, res) => {
  res.json(await getHomeBanner());
});

const homeBannerSlideSchema = z.object({
  id: z.string().max(64).optional(),
  title: z.string().max(200).optional().default(""),
  message: z.string().max(5000).optional().default(""),
  imageUrl: z.string().max(2000).optional().default(""),
});

adminRouter.patch("/home-banner", async (req: AuthRequest, res) => {
  const schema = z.object({
    enabled: z.boolean().optional(),
    title: z.string().max(200).optional(),
    message: z.string().max(5000).optional(),
    imageUrl: z.string().max(2000).optional(),
    slides: z.array(homeBannerSlideSchema).max(10).optional(),
    currentPassword: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const admin = await Admin.findById(req.user!.sub);
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const { currentPassword: _, slides, ...data } = parsed.data;
  const banner = await updateHomeBanner({
    enabled: data.enabled,
    title: data.title,
    message: data.message,
    imageUrl: data.imageUrl,
    slides: slides?.map((s) => ({
      id: s.id?.trim() || newSlideId(),
      title: s.title ?? "",
      message: s.message ?? "",
      imageUrl: s.imageUrl ?? "",
    })),
    bumpRevision: true,
  });
  res.json(banner);
});

adminRouter.get("/newbie-rewards", async (_req, res) => {
  res.json(await getNewbieRewards());
});

const newbieRewardItemSchema = z.object({
  id: z.string().max(64).optional(),
  taskType: z
    .enum(["TELEGRAM_JOIN", "BANK_ACCOUNT", "PIN_SET", "FIRST_DEPOSIT", "CUSTOM"])
    .optional()
    .default("CUSTOM"),
  title: z.string().max(200).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  icon: z.string().max(16).optional().default("🎁"),
  amountInr: z.number().min(0).max(100_000).optional().default(0),
  telegramUrl: z.string().max(500).optional().default(""),
  ctaLabel: z.string().max(80).optional().default(""),
  ctaPath: z.string().max(200).optional().default(""),
  sortOrder: z.number().min(0).max(100).optional().default(0),
});

adminRouter.patch("/newbie-rewards", async (req: AuthRequest, res) => {
  const schema = z.object({
    enabled: z.boolean().optional(),
    title: z.string().max(200).optional(),
    subtitle: z.string().max(2000).optional(),
    items: z.array(newbieRewardItemSchema).max(12).optional(),
    currentPassword: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const admin = await Admin.findById(req.user!.sub);
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const { currentPassword: _, items, ...data } = parsed.data;
  const rewards = await updateNewbieRewards({
    ...data,
    items: items?.map((item) => ({
      id: item.id?.trim() || newRewardItemId(),
      taskType: item.taskType ?? "CUSTOM",
      title: item.title ?? "",
      description: item.description ?? "",
      icon: item.icon ?? "🎁",
      amountInr: item.amountInr ?? 0,
      telegramUrl: item.telegramUrl ?? "",
      ctaLabel: item.ctaLabel ?? "",
      ctaPath: item.ctaPath ?? "",
      sortOrder: item.sortOrder ?? 0,
    })),
  });
  res.json(rewards);
});

adminRouter.post(
  "/home-banner/upload",
  (req, res, next) => {
    homeBannerUpload.single("image")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Image file required" });
      return;
    }
    const imageUrl = `/uploads/home-banner/${req.file.filename}`;
    res.json({ imageUrl });
  }
);

adminRouter.get("/home-promo", async (_req, res) => {
  res.json(await getHomePromo());
});

adminRouter.patch("/home-promo", async (req: AuthRequest, res) => {
  const schema = z.object({
    enabled: z.boolean().optional(),
    imageUrl: z.string().max(2000).optional(),
    linkUrl: z.string().max(500).optional(),
    currentPassword: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const admin = await Admin.findById(req.user!.sub);
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const { currentPassword: _, ...data } = parsed.data;
  res.json(await updateHomePromo(data));
});

adminRouter.post(
  "/home-promo/upload",
  (req, res, next) => {
    homePromoUpload.single("image")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Image file required" });
      return;
    }
    const imageUrl = `/uploads/home-promo/${req.file.filename}`;
    res.json({ imageUrl });
  }
);

adminRouter.patch("/platform-settings", async (req: AuthRequest, res) => {
  const schema = z
    .object({
      usdtToInrRate: z.number().positive().max(10000).optional(),
      minUsdtDeposit: z.number().positive().max(1_000_000).optional(),
      todayInrBonusPercent: z.number().min(0).max(100).optional(),
      referralCommissionPercent: z.number().min(0).max(100).optional(),
      currentPassword: z.string().min(1),
    })
    .refine(
      (d) =>
        d.usdtToInrRate !== undefined ||
        d.minUsdtDeposit !== undefined ||
        d.todayInrBonusPercent !== undefined ||
        d.referralCommissionPercent !== undefined,
      { message: "Provide at least one setting to update" }
    );
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const admin = await Admin.findById(req.user!.sub);
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  if (parsed.data.usdtToInrRate !== undefined) {
    await setUsdtToInrRate(parsed.data.usdtToInrRate);
  }
  if (parsed.data.minUsdtDeposit !== undefined) {
    await setMinUsdtDeposit(parsed.data.minUsdtDeposit);
  }
  if (parsed.data.todayInrBonusPercent !== undefined) {
    const { setTodayInrBonusPercent } = await import("../lib/appSettings.js");
    await setTodayInrBonusPercent(parsed.data.todayInrBonusPercent);
  }
  if (parsed.data.referralCommissionPercent !== undefined) {
    await setReferralCommissionPercent(parsed.data.referralCommissionPercent);
  }
  res.json(await getPlatformSettings());
});

adminRouter.post("/notifications", async (req: AuthRequest, res) => {
  const schema = z.object({
    title: z.string().min(1).max(120),
    body: z.string().max(2000).optional(),
    userId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const doc = await Notification.create({
    userId: parsed.data.userId || undefined,
    title: parsed.data.title,
    body: parsed.data.body ?? "",
  });
  res.status(201).json(serialize(doc));
});

adminRouter.patch("/me", async (req: AuthRequest, res) => {
  const schema = z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    currentPassword: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const admin = await Admin.findById(req.user!.sub);
  if (!admin || !(await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  if (parsed.data.email && parsed.data.email !== admin.email) {
    const taken = await Admin.findOne({ email: parsed.data.email });
    if (taken) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    admin.email = parsed.data.email;
  }
  if (parsed.data.name !== undefined) admin.name = parsed.data.name;
  await admin.save();
  res.json({ id: idStr(admin), email: admin.email, name: admin.name });
});

adminRouter.patch("/me/password", async (req: AuthRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const admin = await Admin.findById(req.user!.sub);
  if (!admin || !(await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  admin.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await admin.save();
  res.json({ ok: true, message: "Password updated in database" });
});

adminRouter.get("/stats", async (_req, res) => {
  const [users, pendingDeposits, pendingPayouts, openChats] = await Promise.all([
    User.countDocuments(),
    Purchase.countDocuments(adminDepositsQuery("PENDING")),
    Payout.countDocuments(withdrawalPayoutFilter("REQUESTED")),
    SupportConversation.countDocuments({ status: "OPEN" }),
  ]);
  res.json({ users, pendingDeposits, pendingPayouts, openChats });
});

adminRouter.get("/plans", async (_req, res) => {
  const plans = await Plan.find().sort({ sortOrder: 1, createdAt: -1 }).populate("paymentDetailsId");
  res.json(
    plans.map((p) => ({
      ...serialize(p),
      paymentDetails: p.paymentDetailsId ? serialize(p.paymentDetailsId) : null,
    }))
  );
});

const planSchema = z.object({
  name: z.string().min(1).optional(),
  planCategory: z.enum(["INR", "CRYPTO", "UPI"]).optional(),
  type: z.enum(["BASIC", "VIP", "NORMAL"]).optional(),
  price: z.number().positive(),
  bonusPercent: z.number().min(0).optional(),
  bonusFixed: z.number().min(0).optional(),
  dailyLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  paymentDetailsId: z.string().nullable().optional(),
});

adminRouter.post("/plans", async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const planCategory = normalizePlanCategory(d.planCategory === "UPI" ? "INR" : d.planCategory);
  const type = normalizePlanType(d.type === "NORMAL" ? "BASIC" : d.type);
  const plan = await Plan.create({
    name: d.name?.trim() || buildPlanName(planCategory, type, d.price),
    planCategory,
    type,
    price: d.price,
    bonusPercent: d.bonusPercent ?? 0,
    bonusFixed: d.bonusFixed ?? 0,
    dailyLimit: d.dailyLimit ?? 2,
    isActive: d.isActive ?? true,
    sortOrder: d.sortOrder ?? 0,
    paymentDetailsId: d.paymentDetailsId || undefined,
  });
  res.status(201).json(serialize(plan));
});

adminRouter.patch("/plans/:id", async (req, res) => {
  const parsed = planSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const existing = await Plan.findById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  const d = parsed.data;
  const planCategory =
    d.planCategory != null
      ? normalizePlanCategory(d.planCategory === "UPI" ? "INR" : d.planCategory)
      : normalizePlanCategory(existing.planCategory);
  const type =
    d.type != null ? normalizePlanType(d.type === "NORMAL" ? "BASIC" : d.type) : normalizePlanType(existing.type);
  const price = d.price ?? existing.price;
  const update: Record<string, unknown> = { ...d, planCategory, type, price };
  delete update.name;
  if (!d.name?.trim() && (d.price != null || d.planCategory != null || d.type != null)) {
    update.name = buildPlanName(planCategory, type, price);
  } else if (d.name?.trim()) {
    update.name = d.name.trim();
  }
  const plan = await Plan.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json(serialize(plan));
});

adminRouter.delete("/plans/:id", async (req, res) => {
  const id = String(req.params.id);
  const used = await Purchase.countDocuments({ planId: id });
  if (used > 0) {
    res.status(400).json({
      error: `Cannot delete: ${used} deposit order(s) use this plan. Set inactive instead.`,
    });
    return;
  }
  const deleted = await Plan.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.status(204).send();
});

adminRouter.get("/payment-details", async (_req, res) => {
  const list = await PaymentDetails.find().sort({ createdAt: -1 });
  res.json(serializeList(list));
});

const paymentDetailsBody = z.object({
  paymentChannel: z.enum(["UPI", "CRYPTO"]).optional(),
  settlementMode: z.enum(["MANUAL", "PAYTM_AUTO", "CRYPTO_AUTO"]).default("MANUAL"),
  accountHolder: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  bankName: z.string().optional(),
  upiId: z.string().optional(),
  cryptoAddress: z.string().optional(),
  cryptoNetwork: z.string().optional(),
  cryptoExpectedUsdt: z.number().positive().optional(),
  paytmMerchantId: z.string().optional(),
  paytmMerchantKey: z.string().optional(),
  paytmWebsite: z.string().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

function refinePaymentDetails(d: z.infer<typeof paymentDetailsBody>, ctx: z.RefinementCtx) {
  const mode = d.settlementMode ?? "MANUAL";
  const channel = d.paymentChannel ?? (mode === "CRYPTO_AUTO" ? "CRYPTO" : "UPI");
  if (channel === "UPI" && mode === "MANUAL" && !d.upiId?.trim()) {
    ctx.addIssue({ code: "custom", message: "Manual UPI needs UPI ID (for QR)" });
  }
  if (channel === "UPI" && mode === "PAYTM_AUTO" && !d.paytmMerchantId?.trim()) {
    ctx.addIssue({ code: "custom", message: "Paytm Merchant ID (MID) is required for status API" });
  }
  if (channel === "UPI" && mode === "PAYTM_AUTO" && !d.upiId?.trim()) {
    ctx.addIssue({ code: "custom", message: "UPI ID required for QR on automatic Paytm flow" });
  }
  if (mode === "CRYPTO_AUTO" && (!d.cryptoAddress?.trim() || !d.cryptoNetwork?.trim())) {
    ctx.addIssue({ code: "custom", message: "Crypto address and network are required" });
  }
}

const paymentDetailsSchema = paymentDetailsBody.superRefine(refinePaymentDetails);

adminRouter.post("/payment-details", async (req, res) => {
  const parsed = paymentDetailsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (parsed.data.isDefault) {
    await PaymentDetails.updateMany({}, { isDefault: false });
  }
  const data = { ...parsed.data };
  delete (data as { label?: string }).label;
  if (!data.paymentChannel) {
    data.paymentChannel = data.settlementMode === "CRYPTO_AUTO" ? "CRYPTO" : "UPI";
  }
  const item = await PaymentDetails.create(data);
  res.status(201).json(serialize(item));
});

adminRouter.patch("/payment-details/:id", async (req, res) => {
  const existing = await PaymentDetails.findById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const merged = {
    ...existing.toObject(),
    ...req.body,
    settlementMode: req.body.settlementMode ?? existing.settlementMode,
    paymentChannel: req.body.paymentChannel ?? existing.paymentChannel,
  };
  const parsed = paymentDetailsSchema.safeParse(merged);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (parsed.data.isDefault) {
    await PaymentDetails.updateMany({}, { isDefault: false });
  }
  const item = await PaymentDetails.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  res.json(serialize(item));
});

adminRouter.delete("/payment-details/:id", async (req, res) => {
  const id = String(req.params.id);
  const existing = await PaymentDetails.findById(id);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [orderUse, planUse] = await Promise.all([
    Purchase.countDocuments({ paymentDetailsId: id }),
    Plan.countDocuments({ paymentDetailsId: id }),
  ]);
  if (orderUse > 0 || planUse > 0) {
    res.status(400).json({
      error: `Cannot delete: used by ${orderUse} order(s) and ${planUse} plan(s).`,
    });
    return;
  }
  await PaymentDetails.findByIdAndDelete(id);
  res.status(204).send();
});

adminRouter.get("/deposits", async (req, res) => {
  const status = req.query.status as string | undefined;
  const filter = adminDepositsQuery(status);
  const { page, limit, skip } = parsePaginationQuery(req.query as Record<string, unknown>, {
    defaultLimit: 20,
    maxLimit: 100,
  });
  const [total, deposits] = await Promise.all([
    Purchase.countDocuments(filter),
    Purchase.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "uid email mobile name")
      .populate("planId", "name"),
  ]);
  res.json(paginated(deposits.map(formatDepositAdmin), page, limit, total));
});

adminRouter.post("/deposits/:id/approve", async (req, res) => {
  try {
    await approvePurchase(req.params.id, { adminNote: (req.body as { adminNote?: string })?.adminNote });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed" });
    return;
  }

  const updated = await Purchase.findById(req.params.id)
    .populate("userId", "uid email mobile name")
    .populate("planId", "name");
  res.json(formatDepositAdmin(updated!));
});

adminRouter.post("/deposits/:id/reject", async (req, res) => {
  const purchase = await Purchase.findByIdAndUpdate(
    req.params.id,
    {
      status: "REJECTED",
      adminNote: (req.body as { adminNote?: string })?.adminNote,
    },
    { new: true }
  )
    .populate("userId", "uid email mobile name")
    .populate("planId", "name");
  res.json(formatDepositAdmin(purchase!));
});

adminRouter.get("/payouts", async (req, res) => {
  const filter = buildAdminPayoutFilter(req.query as Record<string, unknown>);
  const { page, limit, skip } = parsePaginationQuery(req.query as Record<string, unknown>, {
    defaultLimit: 20,
    maxLimit: 100,
  });
  const [total, payouts] = await Promise.all([
    Payout.countDocuments(filter),
    Payout.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("userId"),
  ]);
  res.json(paginated(payouts.map(formatPayoutAdmin), page, limit, total));
});

adminRouter.post("/payouts/:id/paid", async (req, res) => {
  const schema = z.object({
    transactionRef: z.string().min(2),
    adminNote: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const payout = await Payout.findById(req.params.id);
  if (!payout || payout.status !== "REQUESTED" || !isWithdrawalPayout(payout)) {
    res.status(400).json({ error: "Invalid payout" });
    return;
  }
  const amt = payout.amount ?? 0;
  if (!amt || amt <= 0) {
    res.status(400).json({ error: "Invalid payout amount" });
    return;
  }

  await runWithTransaction(async (session) => {
    const user = await User.findById(payout.userId).session(session ?? null);
    if (!user) throw new Error("User not found");

    await releaseHold(idStr(user), amt, session);
    const balanceAfter = user.balance - amt;
    user.balance = balanceAfter;
    user.held = Math.max(0, user.held - amt);
    await user.save(session ? { session } : undefined);

    await LedgerEntry.create(
      [
        {
          userId: user._id,
          type: "PAYOUT_DEBIT",
          amount: -amt,
          balanceAfter,
          referenceId: idStr(payout),
          note: parsed.data.transactionRef,
        },
      ],
      session ? { session } : undefined
    );

    payout.status = "PAID";
    payout.transactionRef = parsed.data.transactionRef;
    payout.adminNote = parsed.data.adminNote;
    payout.paidAt = new Date();
    await payout.save(session ? { session } : undefined);
  });

  const updated = await Payout.findById(payout._id).populate("userId");
  res.json(formatPayoutAdmin(updated!));
});

/** Admin paid user (bank/UPI) after plan purchase — debit wallet & record withdrawal in ledger. */
adminRouter.post("/payouts/:id/plan-pay-out", async (req, res) => {
  const schema = z.object({
    amount: z.number().positive(),
    transactionRef: z.string().min(2).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const payout = await Payout.findById(req.params.id);
  if (!payout || payout.entryType !== "PLAN_PURCHASE" || payout.status !== "CREDITED") {
    res.status(400).json({ error: "Invalid plan purchase record or already paid out" });
    return;
  }

  const amt = Math.round(parsed.data.amount * 100) / 100;
  const ref = parsed.data.transactionRef?.trim() || `PLAN-PO-${idStr(payout)}`;
  const planLabel = payout.planName ?? "Plan";

  try {
    await runWithTransaction(async (session) => {
      const userId = payout.userId.toString();
      await debitWallet(
        userId,
        amt,
        "PAYOUT_DEBIT",
        idStr(payout),
        ref ? `Withdrawal · ${ref}` : `Withdrawal · ${planLabel}`,
        session
      );

      const user = await User.findById(payout.userId).session(session ?? null);
      payout.status = "PAID";
      payout.paidOutAmount = amt;
      payout.transactionRef = ref;
      payout.paidAt = new Date();
      if (user) {
        payout.walletBalance = user.balance;
        payout.walletHeld = user.held;
      }
      payout.adminNote = `Paid ₹${amt} to user bank · ${planLabel}`;
      await payout.save(session ? { session } : undefined);

      await Payout.create(
        [
          {
            userId: payout.userId,
            entryType: "WITHDRAWAL",
            status: "PAID",
            amount: amt,
            transactionRef: ref,
            bankSnapshot: payout.bankSnapshot,
            adminNote: `Admin payout (plan: ${planLabel})`,
            paidAt: new Date(),
          },
        ],
        session ? { session } : undefined
      );
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Payout failed" });
    return;
  }

  const updated = await Payout.findById(payout._id).populate("userId");
  res.json(formatPayoutAdmin(updated!));
});

adminRouter.post("/payouts/:id/reject", async (req, res) => {
  const payout = await Payout.findById(req.params.id);
  if (!payout || payout.status !== "REQUESTED" || !isWithdrawalPayout(payout)) {
    res.status(400).json({ error: "Invalid payout" });
    return;
  }
  const amt = payout.amount ?? 0;
  if (!amt || amt <= 0) {
    res.status(400).json({ error: "Invalid payout amount" });
    return;
  }
  await runWithTransaction(async (session) => {
    await releaseHold(payout.userId.toString(), amt, session);
    payout.status = "REJECTED";
    payout.adminNote = (req.body as { adminNote?: string })?.adminNote;
    await payout.save(session ? { session } : undefined);
  });
  res.json(serialize(await Payout.findById(payout._id)));
});

adminRouter.get("/users", async (req: AuthRequest, res) => {
  try {
    res.json(await getAdminUsersPage(req.user!.sub, req.query as Record<string, unknown>));
  } catch {
    res.status(404).json({ error: "Admin not found" });
  }
});

adminRouter.patch("/users/:id/vip", async (req, res) => {
  const schema = z.object({ isVip: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const user = await User.findByIdAndUpdate(req.params.id, { isVip: parsed.data.isVip }, { new: true });
  res.json(serializeUser(user));
});

adminRouter.get("/support/conversations", async (_req, res) => {
  const list = await SupportConversation.find()
    .sort({ updatedAt: -1 })
    .populate("userId", "uid email mobile name balance");
  res.json(
    list.map((c) => ({
      id: idStr(c),
      userId: c.userId && typeof c.userId === "object" ? idStr(c.userId as any) : String(c.userId),
      status: c.status,
      user:
        c.userId && typeof c.userId === "object"
          ? (() => {
              const u = c.userId as any;
              return {
                uid: u?.uid,
                email: u?.email,
                mobile: u?.mobile,
                name: u?.name,
                wallet: { balance: u?.balance ?? 0 },
              };
            })()
          : null,
      messages: c.messages.slice(-1).map((m) => ({
        id: m._id?.toString(),
        body: m.body,
        createdAt: m.createdAt,
        sender: m.sender,
      })),
    }))
  );
});

adminRouter.get("/support/conversations/:userId", async (req, res) => {
  const conv = await SupportConversation.findOne({ userId: req.params.userId }).populate(
    "userId"
  );
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const u = conv.userId as any;
  res.json({
    id: idStr(conv),
    userId: idStr(u),
    status: conv.status,
    user: {
      uid: u?.uid,
      email: u?.email,
      name: u?.name,
      wallet: { balance: u?.balance ?? 0, held: u?.held ?? 0 },
      bankAccount: u?.bankAccount,
    },
    messages: conv.messages.map((m) => ({
      id: m._id?.toString(),
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
    })),
  });
});

adminRouter.post("/support/conversations/:userId/messages", async (req: AuthRequest, res) => {
  const schema = z.object({ body: z.string().min(1).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }
  const conv = await SupportConversation.findOne({ userId: req.params.userId });
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  conv.messages.push({
    sender: "ADMIN",
    adminId: new mongoose.Types.ObjectId(req.user!.sub),
    body: parsed.data.body,
  });
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

adminRouter.post("/support/conversations/:userId/close", async (req, res) => {
  const conv = await SupportConversation.findOneAndUpdate(
    { userId: req.params.userId },
    { status: "CLOSED" },
    { new: true }
  );
  res.json(serialize(conv));
});

function isCryptoDeposit(p: { planCategory?: string; settlementMode?: string }) {
  return p.planCategory === "CRYPTO" || p.settlementMode === "CRYPTO_AUTO";
}

function formatDepositAdmin(p: any) {
  const base = serialize(p);
  const user = p.userId as { uid?: string; email?: string; mobile?: string; name?: string } | null;
  const plan = p.planId as { name?: string } | null;
  const crypto = isCryptoDeposit(p);
  return {
    ...base,
    planCategory: crypto ? "CRYPTO" : "INR",
    payCurrency: crypto ? "USDT" : "INR",
    /** Amount user paid (USDT for crypto, ₹ for INR) */
    amountPaid: p.amount,
    /** Always wallet credit in INR */
    walletCreditInr: p.creditAmount,
    walletBonusInr: p.bonusAmount,
    amountUsdt: crypto ? p.amount : undefined,
    user: user ? { uid: user.uid, email: user.email, mobile: user.mobile, name: user.name } : null,
    plan: plan ? { name: plan.name } : null,
  };
}

function formatPayoutAdmin(p: any) {
  const base = serialize(p);
  const u = p.userId as {
    uid?: string;
    email?: string;
    mobile?: string;
    name?: string;
    balance?: number;
    held?: number;
    bankAccount?: object;
  } | null;
  const entryType = p.entryType === "PLAN_PURCHASE" ? "PLAN_PURCHASE" : "WITHDRAWAL";
  const walletAtCredit =
    entryType === "PLAN_PURCHASE" && p.walletBalance != null
      ? { balance: p.walletBalance, held: p.walletHeld ?? 0 }
      : u
        ? { balance: u.balance ?? 0, held: u.held ?? 0 }
        : undefined;
  return {
    ...base,
    entryType,
    purchaseId: p.purchaseId ? idStr(p.purchaseId) : undefined,
    planName: p.planName,
    planCategory: p.planCategory,
    amountPaid: p.amountPaid,
    payCurrency: p.payCurrency,
    creditAmountInr: p.creditAmountInr,
    paidOutAmount: p.paidOutAmount,
    autoApproved: Boolean(p.autoApproved),
    user: u
      ? {
          uid: u.uid,
          email: u.email,
          mobile: u.mobile,
          name: u.name,
          wallet: walletAtCredit ?? { balance: u.balance ?? 0, held: u.held ?? 0 },
          bankAccount: u.bankAccount,
        }
      : null,
  };
}
