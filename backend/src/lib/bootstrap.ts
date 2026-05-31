import bcrypt from "bcryptjs";
import { Admin } from "../models/index.js";
import { generateUniqueReferralCode } from "./referral.js";

/**
 * Admin is NEVER created via a public HTTP endpoint.
 * Only this server-side bootstrap (disabled by default) or `npm run db:seed`.
 */
export async function bootstrapAdminIfEmpty() {
  if (process.env.ALLOW_ENV_ADMIN_BOOTSTRAP !== "true") {
    return;
  }

  const count = await Admin.countDocuments();
  if (count > 0) return;

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      "ALLOW_ENV_ADMIN_BOOTSTRAP=true but ADMIN_EMAIL/ADMIN_PASSWORD missing. Run: npm run db:seed"
    );
    return;
  }

  await Admin.create({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    name: process.env.ADMIN_NAME?.trim() || "",
    referralCode: await generateUniqueReferralCode(),
  });
  console.log("Admin account created in MongoDB (env bootstrap, server-side only).");
}
