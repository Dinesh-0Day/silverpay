import { OtpSendLog } from "../models/index.js";

const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 5;

export class OtpRateLimitError extends Error {
  retryAfterSec?: number;
  constructor(message: string, retryAfterSec?: number) {
    super(message);
    this.name = "OtpRateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

export async function assertCanSendRegisterOtp(mobile: string) {
  const latest = await OtpSendLog.findOne({ mobile, purpose: "REGISTER" }).sort({ createdAt: -1 });
  if (latest?.createdAt) {
    const elapsed = Date.now() - latest.createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new OtpRateLimitError(`Please wait ${retryAfterSec} seconds before requesting another OTP.`, retryAfterSec);
    }
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourCount = await OtpSendLog.countDocuments({
    mobile,
    purpose: "REGISTER",
    createdAt: { $gte: hourAgo },
  });
  if (hourCount >= MAX_PER_HOUR) {
    throw new OtpRateLimitError("Too many OTP requests for this number. Try again later.");
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dayCount = await OtpSendLog.countDocuments({
    mobile,
    purpose: "REGISTER",
    createdAt: { $gte: dayAgo },
  });
  if (dayCount >= MAX_PER_DAY) {
    throw new OtpRateLimitError("Daily OTP limit reached for this number. Try again tomorrow.");
  }
}

export async function recordOtpSend(mobile: string, purpose: "REGISTER", ip?: string) {
  await OtpSendLog.create({ mobile, purpose, ip });
}
