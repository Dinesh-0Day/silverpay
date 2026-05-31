import { NewbieRewardTaskAck, Purchase, User } from "../models/index.js";
import type { NewbieRewardItem } from "./newbieRewards.js";

export async function hasTelegramRewardAck(userId: string, rewardId: string) {
  const ack = await NewbieRewardTaskAck.findOne({ userId, rewardId, taskType: "TELEGRAM_JOIN" });
  return Boolean(ack);
}

export const REWARD_TASK_TYPES = [
  "TELEGRAM_JOIN",
  "BANK_ACCOUNT",
  "PIN_SET",
  "FIRST_DEPOSIT",
  "CUSTOM",
] as const;

export type RewardTaskType = (typeof REWARD_TASK_TYPES)[number];

export const TASK_TYPE_LABELS: Record<RewardTaskType, string> = {
  TELEGRAM_JOIN: "Join Telegram channel",
  BANK_ACCOUNT: "Add bank account",
  PIN_SET: "Set 4-digit PIN",
  FIRST_DEPOSIT: "First approved deposit",
  CUSTOM: "Custom task",
};

const DEFAULT_CTA: Partial<Record<RewardTaskType, { ctaPath: string; ctaLabel: string }>> = {
  BANK_ACCOUNT: { ctaPath: "/profile/bank", ctaLabel: "Add bank" },
  PIN_SET: { ctaPath: "/profile", ctaLabel: "Set PIN" },
  FIRST_DEPOSIT: { ctaPath: "/deposits", ctaLabel: "Buy plan" },
  TELEGRAM_JOIN: { ctaPath: "", ctaLabel: "Join channel" },
  CUSTOM: { ctaPath: "/deposits", ctaLabel: "Go" },
};

export function isRewardTaskType(value: string): value is RewardTaskType {
  return (REWARD_TASK_TYPES as readonly string[]).includes(value);
}

export function defaultCtaForTask(taskType: RewardTaskType) {
  return DEFAULT_CTA[taskType] ?? DEFAULT_CTA.CUSTOM!;
}

export async function checkRewardEligibility(userId: string, item: NewbieRewardItem) {
  switch (item.taskType) {
    case "TELEGRAM_JOIN": {
      if (!item.telegramUrl?.trim()) {
        return { eligible: false, reason: "Telegram channel not configured" };
      }
      const acked = await hasTelegramRewardAck(userId, item.id);
      return acked
        ? { eligible: true }
        : {
            eligible: false,
            reason: "Tap Join Telegram first — then the Claim button will appear",
          };
    }
    case "BANK_ACCOUNT": {
      const user = await User.findById(userId);
      const ok = Boolean(user?.bankAccount?.accountNumber?.trim());
      return ok
        ? { eligible: true }
        : { eligible: false, reason: "Add your bank account in Profile → Bank & UPI" };
    }
    case "PIN_SET": {
      const user = await User.findById(userId).select("+pinHash");
      return user?.pinHash
        ? { eligible: true }
        : { eligible: false, reason: "Set your 4-digit PIN in Profile" };
    }
    case "FIRST_DEPOSIT": {
      const count = await Purchase.countDocuments({ userId, status: "APPROVED" });
      return count > 0
        ? { eligible: true }
        : { eligible: false, reason: "Complete your first approved deposit" };
    }
    case "CUSTOM":
      return { eligible: true };
    default:
      return { eligible: false, reason: "Unknown reward task" };
  }
}
