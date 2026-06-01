import { Admin, User } from "../models/index.js";
import { idStr, serializeUser } from "./serialize.js";
import { ensureAdminReferralCode, lookupReferredBy } from "./referral.js";
import { paginated, parsePaginationQuery, type PaginatedResult } from "./pagination.js";

export type AdminUserRow = Awaited<ReturnType<typeof mapUserRow>>;

async function mapUserRow(u: InstanceType<typeof User>) {
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
}

export async function getAdminUsersPage(
  adminId: string,
  query: Record<string, unknown> = {}
): Promise<
  PaginatedResult<AdminUserRow> & {
    admin: {
      id: string;
      email: string;
      name: string;
      referralCode: string;
      createdAt?: Date;
    };
  }
> {
  const admin = await Admin.findById(adminId).select("-passwordHash");
  if (!admin) throw new Error("Admin not found");

  const referralCode = (await ensureAdminReferralCode(adminId)) ?? admin.referralCode;
  const { page, limit, skip } = parsePaginationQuery(query, { defaultLimit: 25, maxLimit: 100 });

  const [total, users] = await Promise.all([
    User.countDocuments(),
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  const rows = await Promise.all(users.map((u) => mapUserRow(u)));

  return {
    admin: {
      id: idStr(admin),
      email: admin.email,
      name: admin.name,
      referralCode: referralCode ?? "",
      createdAt: admin.createdAt,
    },
    ...paginated(rows, page, limit, total),
  };
}
