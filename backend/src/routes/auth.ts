import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Admin, SupportConversation, User } from "../models/index.js";
import { signToken } from "../lib/auth.js";
import { generateUid } from "../lib/wallet.js";
import { idStr } from "../lib/serialize.js";
import { authRateLimit } from "../lib/security.js";
import {
  createAndSendOtp,
  OtpRateLimitError,
  parseMobileInput,
  SmsNotConfiguredError,
  SmsSendError,
  verifyOtp,
} from "../lib/otp.js";
import { formatMobileDisplay } from "../lib/phone.js";
import { generateUniqueReferralCode, resolveReferrer } from "../lib/referral.js";

export const authRouter = Router();

const loginLimit = authRateLimit(8, 15 * 60 * 1000);
const registerLimit = authRateLimit(5, 60 * 60 * 1000);
const otpSendLimit = authRateLimit(3, 15 * 60 * 1000);

function clientIp(req: { headers: Record<string, unknown>; ip?: string }) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || "unknown";
  return req.ip ?? "unknown";
}

function userPayload(user: {
  _id: { toString(): string };
  uid: string;
  mobile?: string | null;
  email?: string | null;
  name?: string | null;
  isVip: boolean;
  balance: number;
  held?: number;
}) {
  return {
    id: idStr(user),
    uid: user.uid,
    mobile: user.mobile,
    mobileDisplay: user.mobile ? formatMobileDisplay(user.mobile) : undefined,
    email: user.email,
    name: user.name,
    referralCode: (user as { referralCode?: string }).referralCode,
    isVip: user.isVip,
    balance: user.balance,
    held: user.held,
  };
}

const sendOtpSchema = z.object({
  mobile: z.string().min(10).max(15),
  referralCode: z.string().min(1).max(20),
});

authRouter.post("/otp/send", otpSendLimit, async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid details" });
    return;
  }
  const mobileResult = parseMobileInput(parsed.data.mobile);
  if ("error" in mobileResult) {
    res.status(400).json({ error: mobileResult.error });
    return;
  }
  const { mobile } = mobileResult;

  const referrerResult = await resolveReferrer(parsed.data.referralCode);
  if (!referrerResult.ok) {
    res.status(400).json({ error: referrerResult.error });
    return;
  }

  if (await User.findOne({ mobile })) {
    res.status(400).json({ error: "This mobile number is already registered. Please login." });
    return;
  }

  try {
    const result = await createAndSendOtp(mobile, "REGISTER", { clientIp: clientIp(req) });
    res.json({
      message: "OTP sent to your mobile",
      mobileDisplay: formatMobileDisplay(mobile),
      expiresInSeconds: result.expiresInSeconds,
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      res.status(429).json({
        error: err.message,
        retryAfterSec: err.retryAfterSec,
      });
      return;
    }
    if (err instanceof SmsNotConfiguredError) {
      res.status(503).json({ error: "OTP service is not available right now. Please try later." });
      return;
    }
    if (err instanceof SmsSendError) {
      res.status(503).json({ error: "Could not send OTP. Try again in a few minutes." });
      return;
    }
    res.status(503).json({ error: "Could not send OTP. Try again later." });
  }
});

const registerSchema = z.object({
  mobile: z.string().min(10).max(15),
  otp: z.string().length(6).regex(/^\d+$/),
  password: z.string().min(6),
  referralCode: z.string().min(1).max(20),
});

authRouter.post("/register", registerLimit, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration details" });
    return;
  }
  const mobileResult = parseMobileInput(parsed.data.mobile);
  if ("error" in mobileResult) {
    res.status(400).json({ error: mobileResult.error });
    return;
  }
  const { mobile } = mobileResult;

  if (await User.findOne({ mobile })) {
    res.status(400).json({ error: "Mobile already registered. Please login." });
    return;
  }

  const otpCheck = await verifyOtp(mobile, "REGISTER", parsed.data.otp);
  if (!otpCheck.ok) {
    res.status(400).json({ error: otpCheck.error });
    return;
  }

  const referrerResult = await resolveReferrer(parsed.data.referralCode);
  if (!referrerResult.ok) {
    res.status(400).json({ error: referrerResult.error });
    return;
  }

  let uid = generateUid();
  while (await User.findOne({ uid })) uid = generateUid();

  const userReferralCode = await generateUniqueReferralCode();

  const user = await User.create({
    mobile,
    mobileVerified: true,
    passwordHash: await bcrypt.hash(parsed.data.password, 10),
    referredByCode: referrerResult.referrer.code,
    referredByType: referrerResult.referrer.type,
    referralCode: userReferralCode,
    uid,
  });
  await SupportConversation.create({ userId: user._id });

  const token = signToken({ sub: idStr(user), role: "user", uid: user.uid });
  res.status(201).json({
    token,
    user: userPayload(user),
  });
});

const loginSchema = z.object({
  mobile: z.string().min(10).max(15),
  password: z.string(),
});

authRouter.post("/login", loginLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid credentials" });
    return;
  }
  const mobileResult = parseMobileInput(parsed.data.mobile);
  if ("error" in mobileResult) {
    res.status(400).json({ error: "Invalid mobile or password" });
    return;
  }
  const user = await User.findOne({ mobile: mobileResult.mobile });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid mobile or password" });
    return;
  }
  const token = signToken({ sub: idStr(user), role: "user", uid: user.uid });
  res.json({
    token,
    user: userPayload(user),
  });
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/admin/login", loginLimit, async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid credentials" });
    return;
  }
  const admin = await Admin.findOne({ email: parsed.data.email });
  if (!admin || !(await bcrypt.compare(parsed.data.password, admin.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({ sub: idStr(admin), role: "admin" });
  res.json({
    token,
    admin: { id: idStr(admin), email: admin.email, name: admin.name },
  });
});
