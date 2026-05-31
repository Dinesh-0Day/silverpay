import mongoose from "mongoose";
import { LedgerEntry, Payout, Purchase, User } from "../models/index.js";

export type HomeCommissionBreakdown = {
  planBonus: number;
  referral: number;
  newbieRewards: number;
  total: number;
};

export type HomeWalletSummary = {
  balance: number;
  available: number;
  held: number;
  depositTotal: number;
  withdrawalTotal: number;
  commission: HomeCommissionBreakdown;
};

function roundInr(n: number) {
  return Math.round(n * 100) / 100;
}

export async function getHomeWalletSummary(userId: string): Promise<HomeWalletSummary> {
  const oid = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userId).select("balance held");
  if (!user) {
    throw new Error("User not found");
  }

  const [planBonusRows, depositRows, withdrawalRows, ledgerRows] = await Promise.all([
    Purchase.aggregate([
      { $match: { userId: oid, status: "APPROVED" } },
      { $group: { _id: null, total: { $sum: "$bonusAmount" } } },
    ]),
    Purchase.aggregate([
      { $match: { userId: oid, status: "APPROVED" } },
      { $group: { _id: null, total: { $sum: "$creditAmount" } } },
    ]),
    Payout.aggregate([
      { $match: { userId: oid, status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate([
      {
        $match: {
          userId: oid,
          type: { $in: ["REFERRAL_COMMISSION", "NEWBIE_REWARD"] },
        },
      },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
  ]);

  const planBonus = roundInr(Number(planBonusRows[0]?.total) || 0);
  let referral = 0;
  let newbieRewards = 0;
  for (const row of ledgerRows) {
    if (row._id === "REFERRAL_COMMISSION") referral = roundInr(Number(row.total) || 0);
    if (row._id === "NEWBIE_REWARD") newbieRewards = roundInr(Number(row.total) || 0);
  }

  const total = roundInr(planBonus + referral + newbieRewards);

  return {
    balance: roundInr(user.balance),
    available: roundInr(user.balance - user.held),
    held: roundInr(user.held),
    depositTotal: roundInr(Number(depositRows[0]?.total) || 0),
    withdrawalTotal: roundInr(Number(withdrawalRows[0]?.total) || 0),
    commission: {
      planBonus,
      referral,
      newbieRewards,
      total,
    },
  };
}
