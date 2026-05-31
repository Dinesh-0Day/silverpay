import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./lib/db.js";
import { Admin, AppSettings } from "./models/index.js";
import { generateUniqueReferralCode } from "./lib/referral.js";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before seeding.");
    process.exit(1);
  }

  await connectDB();

  const existing = await Admin.findOne({ email: adminEmail });
  const referralCode = existing?.referralCode || (await generateUniqueReferralCode());

  await Admin.findOneAndUpdate(
    { email: adminEmail },
    {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: process.env.ADMIN_NAME?.trim() || "",
      referralCode,
    },
    { upsert: true, new: true }
  );

  const defaultRate = Number(process.env.USDT_TO_INR_RATE) || 83;
  await AppSettings.findOneAndUpdate(
    { key: "global" },
    { usdtToInrRate: defaultRate },
    { upsert: true }
  );

  console.log("Admin saved to MongoDB (password hashed). Use admin panel Login only — no public setup URL.");
  console.log(`Admin referral code: ${referralCode}`);
  console.log(`USDT→INR rate: ₹${defaultRate} (change in admin Settings)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
