import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { AppSettings, NewbieRewardClaim, NewbieRewardTaskAck } from "../models/index.js";
import { getTodayInrBonusPercent, getUsdtToInrRate } from "./appSettings.js";
import { creditWallet } from "./wallet.js";
import {
  checkRewardEligibility,
  defaultCtaForTask,
  isRewardTaskType,
  type RewardTaskType,
} from "./newbieRewardTasks.js";

export type { RewardTaskType } from "./newbieRewardTasks.js";
export { REWARD_TASK_TYPES, TASK_TYPE_LABELS } from "./newbieRewardTasks.js";

const SETTINGS_KEY = "global";

export type NewbieRewardItem = {
  id: string;
  taskType: RewardTaskType;
  title: string;
  description: string;
  icon: string;
  amountInr: number;
  telegramUrl: string;
  ctaLabel: string;
  ctaPath: string;
  sortOrder: number;
};

export type NewbieRewardItemForUser = NewbieRewardItem & {
  status: "claimed" | "claimable" | "locked";
  eligible: boolean;
  reason?: string;
  claimedAt?: Date;
  /** TELEGRAM_JOIN: user opened the channel link */
  telegramAcked?: boolean;
};

export type NewbieRewardsPayload = {
  enabled: boolean;
  title: string;
  subtitle: string;
  items: NewbieRewardItem[];
};

const DEFAULT_ITEMS: NewbieRewardItem[] = [
  {
    id: "telegram",
    taskType: "TELEGRAM_JOIN",
    title: "Join Telegram channel",
    description: "Join our official channel and claim your bonus.",
    icon: "📢",
    amountInr: 10,
    telegramUrl: "",
    ctaLabel: "Join channel",
    ctaPath: "",
    sortOrder: 0,
  },
  {
    id: "bank",
    taskType: "BANK_ACCOUNT",
    title: "Add bank account",
    description: "Link bank details for withdrawals.",
    icon: "🏦",
    amountInr: 20,
    telegramUrl: "",
    ctaLabel: "Add bank",
    ctaPath: "/profile/bank",
    sortOrder: 1,
  },
  {
    id: "pin",
    taskType: "PIN_SET",
    title: "Set security PIN",
    description: "Create your 4-digit PIN in profile.",
    icon: "🔐",
    amountInr: 10,
    telegramUrl: "",
    ctaLabel: "Set PIN",
    ctaPath: "/profile",
    sortOrder: 2,
  },
  {
    id: "first-deposit",
    taskType: "FIRST_DEPOSIT",
    title: "First deposit",
    description: "Complete your first approved deposit.",
    icon: "💰",
    amountInr: 50,
    telegramUrl: "",
    ctaLabel: "Buy plan",
    ctaPath: "/deposits",
    sortOrder: 3,
  },
];

function itemHasContent(item: NewbieRewardItem) {
  return Boolean(item.title?.trim() || item.description?.trim());
}

export function newRewardItemId() {
  return randomBytes(6).toString("hex");
}

function normalizeItems(raw: NewbieRewardItem[] | undefined | null): NewbieRewardItem[] {
  if (!raw?.length) return [];
  return raw
    .map((item, index) => {
      const taskType = isRewardTaskType(item.taskType) ? item.taskType : "CUSTOM";
      const ctaDefaults = defaultCtaForTask(taskType);
      const ctaPath =
        item.ctaPath?.trim() ||
        (taskType === "TELEGRAM_JOIN" ? "" : ctaDefaults.ctaPath);
      return {
        id: item.id?.trim() || newRewardItemId(),
        taskType,
        title: item.title?.trim() ?? "",
        description: item.description?.trim() ?? "",
        icon: item.icon?.trim() || "🎁",
        amountInr: Math.max(0, Math.round((Number(item.amountInr) || 0) * 100) / 100),
        telegramUrl: item.telegramUrl?.trim() ?? "",
        ctaLabel: item.ctaLabel?.trim() || ctaDefaults.ctaLabel,
        ctaPath: ctaPath.startsWith("/") || ctaPath === "" ? ctaPath : `/${ctaPath}`,
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
      };
    })
    .filter(itemHasContent)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function readDoc() {
  return AppSettings.findOne({ key: SETTINGS_KEY });
}

export async function getNewbieRewards(): Promise<NewbieRewardsPayload> {
  const doc = await readDoc();
  const stored = normalizeItems(doc?.newbieRewardsItems as NewbieRewardItem[] | undefined);
  const items = stored.length ? stored : DEFAULT_ITEMS;
  return {
    enabled: doc?.newbieRewardsEnabled !== false,
    title: doc?.newbieRewardsTitle?.trim() || "Newbie Rewards",
    subtitle:
      doc?.newbieRewardsSubtitle?.trim() ||
      "Complete tasks below and claim cash rewards to your wallet.",
    items,
  };
}

export async function getNewbieRewardsForUser(userId: string) {
  const rewards = await getNewbieRewards();
  const todayInrBonusPercent = await getTodayInrBonusPercent();
  const usdtToInrRate = await getUsdtToInrRate();

  if (!rewards.enabled) {
    return {
      ...rewards,
      items: [] as NewbieRewardItemForUser[],
      todayInrBonusPercent,
      usdtToInrRate,
      totalClaimed: 0,
      totalAvailable: 0,
    };
  }

  const claims = await NewbieRewardClaim.find({ userId }).sort({ createdAt: -1 }).lean();
  const claimByReward = new Map(claims.map((c) => [c.rewardId, c]));
  const acks = await NewbieRewardTaskAck.find({ userId }).lean();
  const ackByReward = new Set(acks.map((a) => a.rewardId));

  const items: NewbieRewardItemForUser[] = [];
  for (const item of rewards.items) {
    const telegramAcked =
      item.taskType === "TELEGRAM_JOIN" ? ackByReward.has(item.id) : undefined;
    const claim = claimByReward.get(item.id);
    if (claim) {
      items.push({
        ...item,
        status: "claimed",
        eligible: true,
        claimedAt: claim.createdAt,
        telegramAcked,
      });
      continue;
    }
    const { eligible, reason } = await checkRewardEligibility(userId, item);
    items.push({
      ...item,
      status: eligible ? "claimable" : "locked",
      eligible,
      reason,
      telegramAcked,
    });
  }

  const totalClaimed = claims.reduce((sum, c) => sum + (c.amountInr ?? 0), 0);
  const totalAvailable = items
    .filter((i) => i.status === "claimable")
    .reduce((sum, i) => sum + i.amountInr, 0);

  return {
    ...rewards,
    items,
    todayInrBonusPercent,
    usdtToInrRate,
    totalClaimed: Math.round(totalClaimed * 100) / 100,
    totalAvailable: Math.round(totalAvailable * 100) / 100,
  };
}

export async function updateNewbieRewards(input: {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  items?: NewbieRewardItem[];
}) {
  const patch: Record<string, unknown> = {};
  if (input.enabled !== undefined) patch.newbieRewardsEnabled = input.enabled;
  if (input.title !== undefined) patch.newbieRewardsTitle = input.title.trim();
  if (input.subtitle !== undefined) patch.newbieRewardsSubtitle = input.subtitle.trim();
  if (input.items !== undefined) {
    patch.newbieRewardsItems = normalizeItems(input.items);
  }
  await AppSettings.findOneAndUpdate({ key: SETTINGS_KEY }, patch, { upsert: true, new: true });
  return getNewbieRewards();
}

export async function recordTelegramRewardOpen(userId: string, rewardId: string) {
  const config = await getNewbieRewards();
  if (!config.enabled) {
    throw new Error("Newbie rewards are not available");
  }
  const item = config.items.find((i) => i.id === rewardId);
  if (!item || item.taskType !== "TELEGRAM_JOIN") {
    throw new Error("Not a Telegram reward");
  }
  if (!item.telegramUrl?.trim()) {
    throw new Error("Telegram channel not configured");
  }
  const claimed = await NewbieRewardClaim.findOne({ userId, rewardId });
  if (claimed) {
    throw new Error("Reward already claimed");
  }
  await NewbieRewardTaskAck.findOneAndUpdate(
    { userId, rewardId },
    { userId, rewardId, taskType: "TELEGRAM_JOIN" },
    { upsert: true, new: true }
  );
  return { rewardId, telegramUrl: item.telegramUrl.trim() };
}

export async function claimNewbieReward(userId: string, rewardId: string) {
  const config = await getNewbieRewards();
  if (!config.enabled) {
    throw new Error("Newbie rewards are not available");
  }

  const item = config.items.find((i) => i.id === rewardId);
  if (!item) {
    throw new Error("Reward not found");
  }
  if (item.amountInr <= 0) {
    throw new Error("Reward amount is not configured");
  }

  const existing = await NewbieRewardClaim.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    rewardId,
  });
  if (existing) {
    throw new Error("Reward already claimed");
  }

  const { eligible, reason } = await checkRewardEligibility(userId, item);
  if (!eligible) {
    throw new Error(reason || "Complete the task before claiming");
  }

  // No MongoDB transaction — works on standalone (local dev) without replica set.
  try {
    await NewbieRewardClaim.create({
      userId,
      rewardId: item.id,
      taskType: item.taskType,
      amountInr: item.amountInr,
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      throw new Error("Reward already claimed");
    }
    throw err;
  }

  try {
    const balanceAfter = await creditWallet(
      userId,
      item.amountInr,
      "NEWBIE_REWARD",
      rewardId,
      `Newbie reward: ${item.title}`
    );
    return { amountInr: item.amountInr, balanceAfter, rewardId: item.id };
  } catch (err) {
    await NewbieRewardClaim.deleteOne({ userId, rewardId: item.id }).catch(() => undefined);
    throw err;
  }
}
