import mongoose from "mongoose";
import { Purchase } from "../models/index.js";

/** Start of calendar day in Asia/Kolkata (matches typical IN user "today"). */
function startOfTodayIndia(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return new Date(`${y}-${m}-${d}T00:00:00+05:30`);
}

export type HomeDepositDashboardStats = {
  pendingDeposits: number;
  todayInrOrders: number;
  todayInrAmount: number;
  todayCryptoOrders: number;
  todayCryptoWalletCredit: number;
};

export async function getHomeDepositDashboardStats(userId: string): Promise<HomeDepositDashboardStats> {
  const oid = new mongoose.Types.ObjectId(userId);
  const dayStart = startOfTodayIndia();

  const [pendingDeposits, todayRows] = await Promise.all([
    Purchase.countDocuments({ userId: oid, status: "PENDING" }),
    Purchase.aggregate<{
      planCategory: string;
      amount: number;
      creditAmount: number;
    }>([
      { $match: { userId: oid, status: "APPROVED" } },
      {
        $addFields: {
          effectiveAt: { $ifNull: ["$approvedAt", "$createdAt"] },
        },
      },
      { $match: { effectiveAt: { $gte: dayStart } } },
      {
        $project: {
          planCategory: 1,
          amount: 1,
          creditAmount: 1,
        },
      },
    ]),
  ]);

  let todayInrOrders = 0;
  let todayInrAmount = 0;
  let todayCryptoOrders = 0;
  let todayCryptoWalletCredit = 0;

  for (const row of todayRows) {
    const isCrypto = row.planCategory === "CRYPTO";
    if (isCrypto) {
      todayCryptoOrders += 1;
      todayCryptoWalletCredit += Number(row.creditAmount) || 0;
    } else {
      todayInrOrders += 1;
      todayInrAmount += Number(row.amount) || 0;
    }
  }

  return {
    pendingDeposits,
    todayInrOrders,
    todayInrAmount: Math.round(todayInrAmount * 100) / 100,
    todayCryptoOrders,
    todayCryptoWalletCredit: Math.round(todayCryptoWalletCredit * 100) / 100,
  };
}
