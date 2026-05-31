import { Admin, User } from "../models/index.js";
import { idStr, serializeUser } from "./serialize.js";
import { ensureAdminReferralCode, lookupReferredBy } from "./referral.js";

export async function getAdminUsersPage(adminId: string) {
  const admin = await Admin.findById(adminId).select("-passwordHash");
  if (!admin) throw new Error("Admin not found");

  const referralCode = (await ensureAdminReferralCode(adminId)) ?? admin.referralCode;

  const users = await User.find().sort({ createdAt: -1 });
  const rows = await Promise.all(
    users.map(async (u) => {
      const base = serializeUser(u);
      let referredBy = await lookupReferredBy(u.referredByCode, u.referredByType);
      const legacyUid = (u as { referredByUid?: string }).referredByUid;
      if (!referredBy && legacyUid) {
        const legacyUser = await User.findOne({ uid: legacyUid });
        referredBy = legacyUser?.referralCode
          ? {
              type: "USER" as const,
              code: legacyUser.referralCode,
              name: legacyUser.name || undefined,
              mobile: legacyUser.mobile ?? undefined,
              uid: legacyUser.uid,
            }
          : { type: "USER" as const, code: legacyUid, uid: legacyUid };
      }
      return {
        ...base,
        referralCode: u.referralCode ?? null,
        referredBy,
      };
    })
  );

  return {
    admin: {
      id: idStr(admin),
      email: admin.email,
      name: admin.name,
      referralCode,
      createdAt: admin.createdAt,
    },
    users: rows,
  };
}
