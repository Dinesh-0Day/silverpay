import { normalizeIndianMobile } from "./lib/phone";
import { requestApi, type ApiRequestOptions } from "./lib/http";
import { listQuery, type Paginated } from "./lib/pagination";
import { API } from "./lib/apiBase";

function mobileForApi(raw: string) {
  const mobile = normalizeIndianMobile(raw);
  if (!mobile) throw new Error("Enter a valid 10-digit mobile number");
  return mobile;
}

function headers() {
  const token = localStorage.getItem("userToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function api<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const authOptional =
    path.startsWith("/auth/login") || path.startsWith("/auth/register") || path.startsWith("/auth/otp/");
  return requestApi<T>(API, path, headers, { ...options, authOptional });
}

export { ApiError, getErrorMessage } from "./lib/errors";

export const userApi = {
  sendOtp: (mobile: string, referralCode: string) =>
    api<{ message: string; mobileDisplay: string; expiresInSeconds: number; devOtp?: string }>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ mobile: mobileForApi(mobile), referralCode: referralCode.trim() }),
    }),
  register: (mobile: string, otp: string, password: string, referralCode: string) =>
    api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        mobile: mobileForApi(mobile),
        otp,
        password,
        referralCode: referralCode.trim(),
      }),
    }),
  login: (mobile: string, password: string) =>
    api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ mobile: mobileForApi(mobile), password }),
    }),
  me: () => api<User & { available: number; bankAccount?: BankAccount }>("/user/me"),
  team: () => api<TeamOverview>("/user/team"),
  plansGrouped: () => api<{ inr: Plan[]; crypto: Plan[] }>("/user/plans"),
  plans: (category: "INR" | "CRYPTO") => api<Plan[]>(`/user/plans?category=${category}`),
  paymentOptions: () =>
    api<{ manual: PaymentDetails[]; automatic: PaymentDetails[]; timerMinutes: number }>("/user/payment-options"),
  cryptoCalculator: (amount: number) =>
    api<CryptoCalcResult>(`/user/crypto-calculator?amount=${amount}`),
  cryptoSettings: () =>
    api<{ usdtToInrRate: number; minUsdtDeposit: number; todayInrBonusPercent?: number }>("/user/crypto-settings"),
  homeInfo: () =>
    api<{
      usdtToInrRate: number;
      todayInrBonusPercent: number;
      balance: number;
      commissionTotal: number;
      commission: {
        planBonus: number;
        referral: number;
        newbieRewards: number;
        total: number;
      };
      depositTotal: number;
      withdrawalTotal: number;
      promo: { enabled: boolean; imageUrl: string; linkUrl: string };
      depositDashboard: {
        pendingDeposits: number;
        todayInrOrders: number;
        todayInrAmount: number;
        todayCryptoOrders: number;
        todayCryptoWalletCredit: number;
      };
    }>("/user/home-info"),
  newbieRewards: () => api<NewbieRewardsPayload>("/user/newbie-rewards"),
  ackNewbieRewardTelegram: (rewardId: string) =>
    api<{ rewardId: string; telegramUrl: string; rewards: NewbieRewardsPayload }>(
      `/user/newbie-rewards/${encodeURIComponent(rewardId)}/telegram-open`,
      { method: "POST" }
    ),
  claimNewbieReward: (rewardId: string) =>
    api<{ amountInr: number; balanceAfter: number; rewardId: string; rewards: NewbieRewardsPayload }>(
      `/user/newbie-rewards/${encodeURIComponent(rewardId)}/claim`,
      { method: "POST" }
    ),
  homeBanner: () => api<HomeBanners>("/user/home-banner"),
  createDeposit: (body: {
    planId?: string;
    customAmount?: number;
    settlementMode?: "MANUAL" | "PAYTM_AUTO";
  }) =>
    api<{ deposit: Deposit; settlementMode: string; redirectTo: string }>("/user/deposits", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  paymentSession: (depositId: string) => api<PaymentSession>(`/user/deposits/${depositId}/payment-session`),
  depositStatus: (depositId: string) =>
    api<{ status: string; autoApproved?: boolean; expired?: boolean; creditAmount?: number }>(
      `/user/deposits/${depositId}/status`
    ),
  submitUtr: (depositId: string, utr: string) =>
    api<{ deposit: Deposit; message: string }>(`/user/deposits/${depositId}/submit-utr`, {
      method: "POST",
      body: JSON.stringify({ utr }),
    }),
  verifyCrypto: (depositId: string, txHash: string) =>
    api<{ deposit: Deposit; message: string; credited?: boolean }>(`/user/deposits/${depositId}/verify-crypto`, {
      method: "POST",
      body: JSON.stringify({ txHash }),
    }),
  paytmCheckStatus: (depositId: string) =>
    api<{ success: boolean; status: string; message?: string; amount?: number }>(
      `/user/deposits/${depositId}/paytm-check-status`,
      { method: "POST" }
    ),
  cancelExpired: (depositId: string) =>
    api<{ success: boolean; message: string }>(`/user/deposits/${depositId}/cancel-expired`, { method: "POST" }),
  cancelAbandoned: (depositId: string, reason?: "expired" | "user_abandoned") =>
    api<{ success: boolean; message: string }>(`/user/deposits/${depositId}/cancel-abandoned`, {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? "user_abandoned" }),
    }),
  deposits: (opts?: { page?: number; limit?: number }) =>
    api<Paginated<Deposit>>(`/user/deposits${listQuery(opts)}`),
  ledger: () => api<LedgerEntry[]>("/user/wallet/ledger"),
  pinStatus: () => api<{ configured: boolean }>("/user/pin"),
  setPin: (pin: string) => api<{ configured: boolean }>("/user/pin", { method: "PUT", body: JSON.stringify({ pin }) }),
  notificationsUnread: () => api<{ unread: number }>("/user/notifications/unread-count"),
  notifications: () => api<{ unread: number; items: UserNotification[] }>("/user/notifications"),
  notificationsReadAll: () => api<{ success: boolean }>("/user/notifications/read-all", { method: "POST" }),
  saveBank: (bank: BankAccount) => api<BankAccount>("/user/bank-account", { method: "PUT", body: JSON.stringify(bank) }),
  createPayout: (amount: number) => api<Payout>("/user/payouts", { method: "POST", body: JSON.stringify({ amount }) }),
  payouts: (opts?: { page?: number; limit?: number; status?: string }) =>
    api<Paginated<Payout>>(`/user/payouts${listQuery(opts)}`),
  supportMessages: () =>
    api<{ messages: SupportMessage[]; telegramUrl?: string; telegramLabel?: string }>("/user/support/messages"),
  sendSupportMessage: (body: string) =>
    api<SupportMessage & { telegramUrl?: string }>("/user/support/messages", {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};

export type HomeBannerSlide = {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
};

export type HomeBanners = {
  enabled: boolean;
  revision: number;
  slides: HomeBannerSlide[];
};

export type User = {
  id: string;
  uid: string;
  referralCode?: string;
  mobile?: string;
  mobileDisplay?: string;
  email?: string;
  name?: string;
  balance: number;
  held?: number;
  isVip: boolean;
};

export type Plan = {
  id: string;
  name: string;
  planCategory: "INR" | "CRYPTO";
  type: "BASIC" | "VIP";
  typeLabel?: string;
  categoryLabel?: string;
  currency?: "INR" | "USDT";
  price: number;
  bonusPercent: number;
  bonusFixed: number;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  isLocked: boolean;
  lockReason: string | null;
  bonusPreview: number;
  creditPreview: number;
  usdtToInrRate?: number;
};

export type PaymentDetails = {
  id: string;
  label?: string;
  settlementMode?: string;
  upiId?: string;
  accountHolder?: string;
};

export type Deposit = {
  id: string;
  orderNo: string;
  amount: number;
  bonusAmount: number;
  creditAmount: number;
  walletCreditInr?: number;
  walletBonusInr?: number;
  status: string;
  utr?: string;
  settlementMode?: string;
  planCategory?: string;
  payCurrency?: "USDT" | "INR";
  usdtToInrRate?: number;
  autoApproved?: boolean;
  approvedAt?: string;
  createdAt: string;
  plan?: { name: string };
};

export type PaymentSession = {
  deposit: Deposit;
  settlementMode: string;
  planCategory: string;
  amount: number;
  payCurrency?: "INR" | "USDT";
  usdtToInrRate?: number;
  bonusAmount: number;
  creditAmount: number;
  creditCurrency?: "INR";
  expired: boolean;
  timerMinutes: number;
  expiresAt?: string;
  secondsRemaining: number | null;
  paymentTimeoutSeconds?: number;
  checkIntervalMs?: number;
  upi: { vpa: string; payeeName: string; amount: number; deepLink: string } | null;
  crypto: { address: string; network: string; expectedUsdt: number; qrText: string } | null;
};

export type CryptoCalcResult = {
  amount: number;
  currency: "USDT";
  minUsdtDeposit?: number;
  usdtToInrRate: number;
  bonusPercent: number;
  bonusFixed: number;
  bonusAmount: number;
  bonusAmountInr?: number;
  creditAmount: number;
  creditCurrency: "INR";
  templatePlanName: string;
};

export type BankAccount = {
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  upiId?: string;
};

export type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
};

export type Payout = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
};

export type SupportMessage = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};

export type UserNotification = {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
};

export type TeamMember = {
  id: string;
  uid: string;
  name: string;
  mobile: string;
  referralCode: string;
  joinedAt: string;
  level: number;
  personalDownline?: number;
  totalDownline?: number;
  viaCode?: string;
  viaLabel?: string;
  approvedDeposits: number;
  depositCount: number;
};

export type NewbieRewardTaskType =
  | "TELEGRAM_JOIN"
  | "BANK_ACCOUNT"
  | "PIN_SET"
  | "FIRST_DEPOSIT"
  | "CUSTOM";

export type NewbieRewardItem = {
  id: string;
  taskType: NewbieRewardTaskType;
  title: string;
  description: string;
  icon: string;
  amountInr: number;
  telegramUrl: string;
  ctaLabel: string;
  ctaPath: string;
  sortOrder: number;
  status: "claimed" | "claimable" | "locked";
  eligible: boolean;
  reason?: string;
  claimedAt?: string;
  telegramAcked?: boolean;
};

export type NewbieRewardsPayload = {
  enabled: boolean;
  title: string;
  subtitle: string;
  items: NewbieRewardItem[];
  todayInrBonusPercent: number;
  usdtToInrRate: number;
  totalClaimed: number;
  totalAvailable: number;
};

export type TeamOverview = {
  myReferralCode: string;
  referredBy: {
    type: "USER" | "ADMIN";
    code: string;
    name?: string;
    email?: string;
    mobile?: string;
    uid?: string;
  } | null;
  stats: {
    totalTeam: number;
    directCount: number;
    subordinateCount: number;
    activeMembers: number;
    teamDepositVolume: number;
    teamDepositCount: number;
  };
  directMembers: TeamMember[];
  subordinateMembers: TeamMember[];
};
