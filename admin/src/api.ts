import { requestApi, type ApiRequestOptions } from "./lib/http";
import { parseApiErrorBody } from "./lib/errors";
import { listQuery, type Paginated, type PaginationMeta } from "./lib/pagination";
import { API, apiFetchUrl } from "./lib/apiBase";

export type { Paginated, PaginationMeta };

function headers() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function api<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const authOptional = path.startsWith("/auth/admin/login");
  return requestApi<T>(API, path, headers, { ...options, authOptional });
}

export { getErrorMessage } from "./lib/errors";

export const adminApi = {
  login: (email: string, password: string) =>
    api<{ token: string; admin: { email: string; name: string } }>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<{ id: string; email: string; name: string }>("/admin/me"),
  updateMe: (body: { email: string; name: string; currentPassword: string }) =>
    api("/admin/me", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api("/admin/me/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  platformSettings: () =>
    api<{
      usdtToInrRate: number;
      minUsdtDeposit: number;
      todayInrBonusPercent: number;
      referralCommissionPercent: number;
    }>("/admin/platform-settings"),
  smsSettings: () =>
    api<{ enabled: boolean; configured: boolean; apiKeyMasked: string; provider: string }>("/admin/sms-settings"),
  updateSmsSettings: (body: {
    enabled?: boolean;
    apiKey?: string;
    clearApiKey?: boolean;
    currentPassword: string;
  }) =>
    api<{ enabled: boolean; configured: boolean; apiKeyMasked: string; provider: string }>("/admin/sms-settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updatePlatformSettings: (body: {
    usdtToInrRate?: number;
    minUsdtDeposit?: number;
    todayInrBonusPercent?: number;
    referralCommissionPercent?: number;
    currentPassword: string;
  }) =>
    api<{
      usdtToInrRate: number;
      minUsdtDeposit: number;
      todayInrBonusPercent: number;
      referralCommissionPercent: number;
    }>(
      "/admin/platform-settings",
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    ),
  newbieRewards: () => api<NewbieRewardsConfig>("/admin/newbie-rewards"),
  updateNewbieRewards: (body: {
    enabled: boolean;
    title: string;
    subtitle: string;
    items: NewbieRewardItem[];
    currentPassword: string;
  }) =>
    api<NewbieRewardsConfig>("/admin/newbie-rewards", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  homePromo: () => api<HomePromo>("/admin/home-promo"),
  updateHomePromo: (body: {
    enabled: boolean;
    imageUrl: string;
    linkUrl: string;
    currentPassword: string;
  }) =>
    api<HomePromo>("/admin/home-promo", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  uploadHomePromoImage: async (file: File) => {
    const token = localStorage.getItem("adminToken");
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(apiFetchUrl("/api/admin/home-promo/upload"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw parseApiErrorBody(data, res.status, res.statusText);
    return data as { imageUrl: string };
  },
  homeBanner: () => api<HomeBanner>("/admin/home-banner"),
  updateHomeBanner: (body: {
    enabled: boolean;
    slides: HomeBannerSlide[];
    currentPassword: string;
  }) =>
    api<HomeBanner>("/admin/home-banner", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  uploadHomeBannerImage: async (file: File) => {
    const token = localStorage.getItem("adminToken");
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(apiFetchUrl("/api/admin/home-banner/upload"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw parseApiErrorBody(data, res.status, res.statusText);
    return data as { imageUrl: string };
  },
  stats: () => api<{ users: number; pendingDeposits: number; pendingPayouts: number; openChats: number }>("/admin/stats"),
  plans: () => api<Plan[]>("/admin/plans"),
  createPlan: (body: Partial<Plan>) => api<Plan>("/admin/plans", { method: "POST", body: JSON.stringify(body) }),
  updatePlan: (id: string, body: Partial<Plan>) => api<Plan>(`/admin/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deletePlan: (id: string) => api<void>(`/admin/plans/${id}`, { method: "DELETE" }),
  paymentDetails: () => api<PaymentDetails[]>("/admin/payment-details"),
  createPaymentDetails: (body: Partial<PaymentDetails>) =>
    api<PaymentDetails>("/admin/payment-details", { method: "POST", body: JSON.stringify(body) }),
  updatePaymentDetails: (id: string, body: Partial<PaymentDetails>) =>
    api<PaymentDetails>(`/admin/payment-details/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deletePaymentDetails: (id: string) => api<void>(`/admin/payment-details/${id}`, { method: "DELETE" }),
  deposits: (opts?: { status?: string; page?: number; limit?: number }) =>
    api<Paginated<Deposit>>(`/admin/deposits${listQuery(opts)}`),
  approveDeposit: (id: string, adminNote?: string) =>
    api(`/admin/deposits/${id}/approve`, { method: "POST", body: JSON.stringify({ adminNote }) }),
  rejectDeposit: (id: string, adminNote?: string) =>
    api(`/admin/deposits/${id}/reject`, { method: "POST", body: JSON.stringify({ adminNote }) }),
  payouts: (opts?: { status?: string; entryType?: string; page?: number; limit?: number }) =>
    api<Paginated<Payout>>(`/admin/payouts${listQuery(opts)}`),
  markPayoutPaid: (id: string, transactionRef: string, adminNote?: string) =>
    api(`/admin/payouts/${id}/paid`, { method: "POST", body: JSON.stringify({ transactionRef, adminNote }) }),
  planPurchasePayOut: (id: string, amount: number, transactionRef?: string) =>
    api<Payout>(`/admin/payouts/${id}/plan-pay-out`, {
      method: "POST",
      body: JSON.stringify({ amount, transactionRef }),
    }),
  rejectPayout: (id: string, adminNote?: string) =>
    api(`/admin/payouts/${id}/reject`, { method: "POST", body: JSON.stringify({ adminNote }) }),
  users: (opts?: { page?: number; limit?: number }) => api<AdminUsersPage>(`/admin/users${listQuery(opts)}`),
  setVip: (id: string, isVip: boolean) => api(`/admin/users/${id}/vip`, { method: "PATCH", body: JSON.stringify({ isVip }) }),
  supportConversations: () => api<SupportConv[]>("/admin/support/conversations"),
  supportChat: (userId: string) => api<SupportConvDetail>(`/admin/support/conversations/${userId}`),
  sendSupportMessage: (userId: string, body: string) =>
    api(`/admin/support/conversations/${userId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  sendNotification: (body: { title: string; body?: string; userId?: string }) =>
    api<{ id: string; title: string; body: string; userId?: string; createdAt: string }>("/admin/notifications", {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
};

export const REWARD_TASK_OPTIONS: { value: NewbieRewardTaskType; label: string }[] = [
  { value: "TELEGRAM_JOIN", label: "Join Telegram channel" },
  { value: "BANK_ACCOUNT", label: "Add bank account" },
  { value: "PIN_SET", label: "Set 4-digit PIN" },
  { value: "FIRST_DEPOSIT", label: "First approved deposit" },
  { value: "CUSTOM", label: "Custom task" },
];

export type NewbieRewardsConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  items: NewbieRewardItem[];
};

export type HomePromo = {
  enabled: boolean;
  imageUrl: string;
  linkUrl: string;
};

export type HomeBannerSlide = {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
};

export type HomeBanner = {
  enabled: boolean;
  title: string;
  message: string;
  imageUrl: string;
  revision: number;
  slides: HomeBannerSlide[];
};

export type Plan = {
  id: string;
  name: string;
  planCategory?: "INR" | "CRYPTO";
  type: "BASIC" | "VIP" | "NORMAL";
  price: number;
  bonusPercent: number;
  bonusFixed: number;
  dailyLimit: number;
  isActive: boolean;
};

export type SettlementMode = "MANUAL" | "PAYTM_AUTO" | "CRYPTO_AUTO";

export type PaymentDetails = {
  id: string;
  paymentChannel?: "UPI" | "CRYPTO";
  settlementMode?: SettlementMode;
  accountHolder?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  upiId?: string;
  cryptoAddress?: string;
  cryptoNetwork?: string;
  cryptoExpectedUsdt?: number;
  paytmMerchantId?: string;
  paytmMerchantKey?: string;
  paytmWebsite?: string;
  isActive?: boolean;
  isDefault: boolean;
};

export type Deposit = {
  id: string;
  orderNo: string;
  amount: number;
  amountPaid?: number;
  bonusAmount: number;
  creditAmount: number;
  walletCreditInr?: number;
  walletBonusInr?: number;
  status: string;
  utr?: string;
  cryptoTxHash?: string;
  planCategory?: string;
  payCurrency?: "USDT" | "INR";
  settlementMode?: string;
  usdtToInrRate?: number;
  autoApproved?: boolean;
  userNote?: string;
  createdAt: string;
  user: { uid: string; email?: string; mobile?: string; name?: string };
  plan: { name: string };
};

export type Payout = {
  id: string;
  entryType?: "WITHDRAWAL" | "PLAN_PURCHASE";
  purchaseId?: string;
  amount: number;
  status: string;
  transactionRef?: string;
  createdAt: string;
  bankSnapshot?: string;
  planName?: string;
  planCategory?: string;
  amountPaid?: number;
  payCurrency?: string;
  creditAmountInr?: number;
  paidOutAmount?: number;
  autoApproved?: boolean;
  adminNote?: string;
  user: {
    uid: string;
    email?: string;
    mobile?: string;
    name?: string;
    wallet?: { balance: number; held: number };
    bankAccount?: { accountHolder: string; accountNumber: string; ifsc: string; bankName: string; upiId?: string };
  };
};

export type ReferredByInfo = {
  type: "USER" | "ADMIN";
  code: string;
  name?: string;
  email?: string;
  mobile?: string;
  uid?: string;
};

export type UserRow = {
  id: string;
  uid: string;
  mobile?: string;
  email?: string;
  referralCode?: string | null;
  referredBy?: ReferredByInfo | null;
  isVip: boolean;
  wallet?: { balance: number; held: number };
};

export type AdminUsersPage = {
  admin: {
    id: string;
    email: string;
    name: string;
    referralCode: string;
    createdAt?: string;
  };
  items: UserRow[];
  pagination: PaginationMeta;
};

export type SupportMessage = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};

export type SupportConv = {
  id: string;
  userId: string;
  status: string;
  user: { uid: string; email?: string; mobile?: string; wallet?: { balance: number } };
  messages: SupportMessage[];
};

export type SupportConvDetail = SupportConv & {
  user: SupportConv["user"] & { wallet?: { balance: number } };
};
