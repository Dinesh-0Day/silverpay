import crypto from "crypto";
import { Admin, User } from "../models/index.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function normalizeReferralCode(raw: string) {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export function isValidReferralCodeFormat(code: string) {
  return /^[A-Z0-9]{6,12}$/.test(code);
}

export function generateReferralCodeCandidate() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
  }
  return code;
}

export async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const code = generateReferralCodeCandidate();
    const taken =
      (await User.findOne({ referralCode: code })) || (await Admin.findOne({ referralCode: code }));
    if (!taken) return code;
  }
  throw new Error("Could not generate referral code");
}

export async function ensureAdminReferralCode(adminId: string) {
  const admin = await Admin.findById(adminId);
  if (!admin) return null;
  if (admin.referralCode?.trim()) return admin.referralCode.trim();
  const code = await generateUniqueReferralCode();
  admin.referralCode = code;
  await admin.save();
  return code;
}

export type ResolvedReferrer =
  | { type: "USER"; code: string; userId: string; label: string }
  | { type: "ADMIN"; code: string; adminId: string; label: string };

export async function resolveReferrer(referralCode: string): Promise<
  { ok: true; referrer: ResolvedReferrer } | { ok: false; error: string }
> {
  const code = normalizeReferralCode(referralCode);
  if (!code) return { ok: false, error: "Referral code is required" };
  if (!isValidReferralCodeFormat(code)) {
    return { ok: false, error: "Enter a valid referral code (6–12 letters/numbers)" };
  }

  const user = await User.findOne({ referralCode: code });
  if (user) {
    return {
      ok: true,
      referrer: {
        type: "USER",
        code,
        userId: user._id.toString(),
        label: user.name?.trim() || `+91 ${user.mobile}`,
      },
    };
  }

  const admin = await Admin.findOne({ referralCode: code });
  if (admin) {
    return {
      ok: true,
      referrer: {
        type: "ADMIN",
        code,
        adminId: admin._id.toString(),
        label: admin.name?.trim() || admin.email,
      },
    };
  }

  return { ok: false, error: "Invalid referral code" };
}

export type ReferredByInfo = {
  type: "USER" | "ADMIN";
  code: string;
  name?: string;
  email?: string;
  mobile?: string;
  uid?: string;
};

export async function lookupReferredBy(
  code?: string | null,
  type?: string | null
): Promise<ReferredByInfo | null> {
  if (!code) return null;
  const normalized = normalizeReferralCode(code);
  const refType = type === "ADMIN" ? "ADMIN" : "USER";

  if (refType === "ADMIN") {
    const admin = await Admin.findOne({ referralCode: normalized });
    return {
      type: "ADMIN",
      code: normalized,
      name: admin?.name || undefined,
      email: admin?.email,
    };
  }

  const user = await User.findOne({ referralCode: normalized });
  return {
    type: "USER",
    code: normalized,
    name: user?.name || undefined,
    mobile: user?.mobile ?? undefined,
    uid: user?.uid,
  };
}
