import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PhoneOtp } from "../models/index.js";
import { normalizeIndianMobile } from "./phone.js";
import { sendOtpSms, SmsNotConfiguredError, SmsSendError } from "./sms.js";
import { assertCanSendRegisterOtp, recordOtpSend } from "./otpSendLimit.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

export async function createAndSendOtp(
  mobile: string,
  purpose: "REGISTER",
  options?: { clientIp?: string }
) {
  if (purpose === "REGISTER") {
    await assertCanSendRegisterOtp(mobile);
  }

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);

  const sms = await sendOtpSms(mobile, code);

  await PhoneOtp.deleteMany({ mobile, purpose });
  await PhoneOtp.create({
    mobile,
    purpose,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
  });
  await recordOtpSend(mobile, purpose, options?.clientIp);
  const exposeDev =
    process.env.OTP_DEV_EXPOSE === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.OTP_DEV_EXPOSE !== "false");

  return {
    expiresInSeconds: OTP_TTL_MS / 1000,
    devOtp: exposeDev && sms.devMode ? code : undefined,
  };
}

export { SmsNotConfiguredError, SmsSendError };
export { OtpRateLimitError } from "./otpSendLimit.js";

export async function verifyOtp(mobile: string, purpose: "REGISTER", code: string) {
  const record = await PhoneOtp.findOne({ mobile, purpose }).sort({ createdAt: -1 });
  if (!record) {
    return { ok: false as const, error: "OTP expired or not sent. Request a new code." };
  }
  if (record.expiresAt < new Date()) {
    await PhoneOtp.deleteMany({ mobile, purpose });
    return { ok: false as const, error: "OTP expired. Request a new code." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await PhoneOtp.deleteMany({ mobile, purpose });
    return { ok: false as const, error: "Too many attempts. Request a new OTP." };
  }

  const match = await bcrypt.compare(code, record.codeHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    return { ok: false as const, error: "Invalid OTP" };
  }

  await PhoneOtp.deleteMany({ mobile, purpose });
  return { ok: true as const };
}

export function parseMobileInput(raw: string) {
  const mobile = normalizeIndianMobile(raw);
  if (!mobile) return { error: "Enter a valid 10-digit Indian mobile number" as const };
  return { mobile };
}
