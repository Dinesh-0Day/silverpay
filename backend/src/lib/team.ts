import { Types } from "mongoose";
import { Purchase, User } from "../models/index.js";
import { generateUniqueReferralCode, lookupReferredBy } from "./referral.js";

type UserLean = {
  _id: Types.ObjectId;
  uid: string;
  name?: string | null;
  mobile?: string | null;
  referralCode?: string | null;
  referredByCode?: string | null;
  referredByType?: string | null;
  createdAt: Date;
};

type SubordinateRow = UserLean & {
  level: number;
  viaCode: string;
  viaLabel: string;
};

function formatMember(u: UserLean) {
  return {
    id: u._id.toString(),
    uid: u.uid,
    name: u.name?.trim() ?? "",
    mobile: u.mobile ? `+91 ${u.mobile}` : "",
    referralCode: u.referralCode ?? "",
    joinedAt: u.createdAt,
  };
}

function buildChildrenByCode(users: UserLean[]) {
  const map = new Map<string, UserLean[]>();
  for (const u of users) {
    const code = u.referredByCode?.trim();
    if (!code) continue;
    const list = map.get(code) ?? [];
    list.push(u);
    map.set(code, list);
  }
  return map;
}

function countSubtreeSize(rootCode: string, childrenByCode: Map<string, UserLean[]>) {
  let count = 0;
  const queue = [...(childrenByCode.get(rootCode) ?? [])];
  const seen = new Set<string>();
  while (queue.length) {
    const node = queue.shift()!;
    const id = node._id.toString();
    if (seen.has(id)) continue;
    seen.add(id);
    count += 1;
    const childCode = node.referralCode?.trim();
    if (!childCode) continue;
    for (const c of childrenByCode.get(childCode) ?? []) {
      queue.push(c);
    }
  }
  return count;
}

async function depositStatsForUsers(userIds: string[]) {
  const volumeByUser = new Map<string, number>();
  const countByUser = new Map<string, number>();
  if (!userIds.length) {
    return { volumeByUser, countByUser, teamDepositVolume: 0, teamDepositCount: 0, activeMembers: 0 };
  }

  const oids = userIds.map((id) => new Types.ObjectId(id));
  const rows = await Purchase.aggregate([
    { $match: { userId: { $in: oids }, status: "APPROVED" } },
    {
      $group: {
        _id: "$userId",
        total: { $sum: "$creditAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  let teamDepositVolume = 0;
  let teamDepositCount = 0;
  let activeMembers = 0;

  for (const row of rows) {
    const id = String(row._id);
    const total = Number(row.total ?? 0);
    const count = Number(row.count ?? 0);
    volumeByUser.set(id, total);
    countByUser.set(id, count);
    teamDepositVolume += total;
    teamDepositCount += count;
    if (total > 0) activeMembers += 1;
  }

  return { volumeByUser, countByUser, teamDepositVolume, teamDepositCount, activeMembers };
}

export async function getTeamOverview(userId: string) {
  const me = await User.findById(userId).select(
    "referralCode referredByCode referredByType uid name mobile createdAt"
  );
  if (!me) {
    throw new Error("User not found");
  }

  let myCode = me.referralCode?.trim() ?? "";
  if (!myCode) {
    myCode = await generateUniqueReferralCode();
    me.referralCode = myCode;
    await me.save();
  }

  const allUsers = (await User.find({})
    .select("uid name mobile referralCode referredByCode referredByType createdAt")
    .lean()) as UserLean[];

  const childrenByCode = buildChildrenByCode(allUsers);
  const directIds = new Set<string>();

  const direct: UserLean[] = [];
  for (const u of allUsers) {
    if (u.referredByCode?.trim() === myCode && u.referredByType === "USER") {
      direct.push(u);
      directIds.add(u._id.toString());
    }
  }

  const subordinate: SubordinateRow[] = [];
  const queue: { user: UserLean; viaCode: string; viaLabel: string; depth: number }[] = direct.map(
    (d) => ({
      user: d,
      viaCode: myCode,
      viaLabel: d.referralCode || d.uid,
      depth: 1,
    })
  );

  const subordinateIds = new Set<string>();

  while (queue.length) {
    const item = queue.shift()!;
    const parentCode = item.user.referralCode?.trim();
    if (!parentCode) continue;

    for (const child of childrenByCode.get(parentCode) ?? []) {
      const childId = child._id.toString();
      if (directIds.has(childId)) continue;
      if (subordinateIds.has(childId)) continue;

      subordinateIds.add(childId);
      subordinate.push({
        ...child,
        level: item.depth + 1,
        viaCode: parentCode,
        viaLabel: item.user.referralCode || item.user.uid,
      });

      queue.push({
        user: child,
        viaCode: parentCode,
        viaLabel: child.referralCode || child.uid,
        depth: item.depth + 1,
      });
    }
  }

  const teamUserIds = [...directIds, ...subordinateIds];
  const { volumeByUser, countByUser, teamDepositVolume, teamDepositCount, activeMembers } =
    await depositStatsForUsers(teamUserIds);

  const directMembers = direct.map((d) => {
    const code = d.referralCode?.trim() ?? "";
    const personalDownline = childrenByCode.get(code)?.length ?? 0;
    const totalDownline = countSubtreeSize(code, childrenByCode);
    const approvedDeposits = volumeByUser.get(d._id.toString()) ?? 0;
    const depositCount = countByUser.get(d._id.toString()) ?? 0;
    return {
      ...formatMember(d),
      level: 1,
      personalDownline,
      totalDownline,
      approvedDeposits,
      depositCount,
    };
  });

  const subordinateMembers = subordinate
    .map((s) => ({
      ...formatMember(s),
      level: s.level,
      viaCode: s.viaCode,
      viaLabel: s.viaLabel,
      approvedDeposits: volumeByUser.get(s._id.toString()) ?? 0,
      depositCount: countByUser.get(s._id.toString()) ?? 0,
    }))
    .sort((a, b) => a.level - b.level || b.joinedAt.getTime() - a.joinedAt.getTime());

  const referredBy = await lookupReferredBy(me.referredByCode, me.referredByType);

  return {
    myReferralCode: myCode,
    referredBy,
    stats: {
      totalTeam: direct.length + subordinate.length,
      directCount: direct.length,
      subordinateCount: subordinate.length,
      activeMembers,
      teamDepositVolume: Math.round(teamDepositVolume * 100) / 100,
      teamDepositCount,
    },
    directMembers,
    subordinateMembers,
  };
}
