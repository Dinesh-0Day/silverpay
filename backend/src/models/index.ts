import mongoose, { Schema, type Types } from "mongoose";

export type PurchaseStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PayoutStatus = "REQUESTED" | "PAID" | "REJECTED" | "CREDITED";
export type PayoutEntryType = "WITHDRAWAL" | "PLAN_PURCHASE";
export type LedgerType =
  | "PLAN_CREDIT"
  | "PAYOUT_DEBIT"
  | "ADMIN_ADJUSTMENT"
  | "NEWBIE_REWARD"
  | "REFERRAL_COMMISSION";
export type PlanType = "BASIC" | "VIP";
/** @deprecated legacy value */
export type PlanTypeLegacy = "NORMAL" | PlanType;

const bankAccountSchema = new Schema(
  {
    accountHolder: String,
    accountNumber: String,
    ifsc: String,
    bankName: String,
    upiId: String,
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    uid: { type: String, unique: true, required: true },
    mobile: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, sparse: true },
    mobileVerified: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    pinHash: { type: String, default: "", select: false },
    name: String,
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredByCode: { type: String, index: true },
    referredByType: { type: String, enum: ["USER", "ADMIN"] },
    isVip: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    held: { type: Number, default: 0 },
    bankAccount: bankAccountSchema,
  },
  { timestamps: true }
);

const adminSchema = new Schema(
  {
    email: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    referralCode: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

export type SettlementMode = "MANUAL" | "PAYTM_AUTO" | "CRYPTO_AUTO";
export type PaymentChannel = "UPI" | "CRYPTO";
export type PlanCategory = "INR" | "CRYPTO";

const paymentDetailsSchema = new Schema(
  {
    label: { type: String, default: "" },
    paymentChannel: { type: String, enum: ["UPI", "CRYPTO"], default: "UPI" },
    settlementMode: {
      type: String,
      enum: ["MANUAL", "PAYTM_AUTO", "CRYPTO_AUTO"],
      default: "MANUAL",
    },
    accountHolder: { type: String, default: "" },
    accountNumber: String,
    ifsc: String,
    bankName: String,
    upiId: String,
    cryptoAddress: String,
    cryptoNetwork: String,
    /** USDT amount user must send (defaults to plan USDT price if empty at purchase time) */
    cryptoExpectedUsdt: Number,
    paytmMerchantId: String,
    paytmMerchantKey: String,
    paytmWebsite: String,
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const planSchema = new Schema(
  {
    name: { type: String, required: true },
    planCategory: { type: String, enum: ["INR", "CRYPTO", "UPI"], default: "INR" },
    type: { type: String, enum: ["BASIC", "VIP", "NORMAL"], default: "BASIC" },
    price: { type: Number, required: true },
    bonusPercent: { type: Number, default: 0 },
    bonusFixed: { type: Number, default: 0 },
    dailyLimit: { type: Number, default: 2 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    paymentDetailsId: { type: Schema.Types.ObjectId, ref: "PaymentDetails" },
  },
  { timestamps: true }
);

const purchaseSchema = new Schema(
  {
    orderNo: { type: String, unique: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    amount: Number,
    bonusAmount: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], default: "PENDING" },
    utr: String,
    userNote: String,
    adminNote: String,
    paymentDetailsId: { type: Schema.Types.ObjectId, ref: "PaymentDetails" },
    settlementMode: { type: String, enum: ["MANUAL", "PAYTM_AUTO", "CRYPTO_AUTO"] },
    paymentRef: String,
    cryptoTxHash: String,
    cryptoExpectedUsdt: Number,
    paytmOrderId: String,
    planCategory: { type: String, enum: ["INR", "CRYPTO", "UPI"] },
    /** USDT paid; wallet bonus/credit stored in INR */
    usdtToInrRate: Number,
    isCustomAmount: { type: Boolean, default: false },
    paymentExpiresAt: Date,
    autoApproved: { type: Boolean, default: false },
    paymentDetailsSnapshot: String,
    approvedAt: Date,
  },
  { timestamps: true }
);

const payoutSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    entryType: { type: String, enum: ["WITHDRAWAL", "PLAN_PURCHASE"], default: "WITHDRAWAL" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", index: true },
    amount: Number,
    status: { type: String, enum: ["REQUESTED", "PAID", "REJECTED", "CREDITED"], default: "REQUESTED" },
    planName: String,
    planCategory: String,
    amountPaid: Number,
    payCurrency: String,
    creditAmountInr: Number,
    paidOutAmount: Number,
    walletBalance: Number,
    walletHeld: Number,
    autoApproved: { type: Boolean, default: false },
    transactionRef: String,
    adminNote: String,
    bankSnapshot: String,
    paidAt: Date,
  },
  { timestamps: true }
);
payoutSchema.index({ entryType: 1, createdAt: -1 });

const ledgerEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["PLAN_CREDIT", "PAYOUT_DEBIT", "ADMIN_ADJUSTMENT", "NEWBIE_REWARD", "REFERRAL_COMMISSION"],
    },
    amount: Number,
    balanceAfter: Number,
    referenceId: String,
    note: String,
  },
  { timestamps: true }
);

const supportMessageSchema = new Schema(
  {
    sender: { type: String, enum: ["USER", "ADMIN"], required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin" },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

const phoneOtpSchema = new Schema(
  {
    mobile: { type: String, required: true, index: true },
    purpose: { type: String, enum: ["REGISTER"], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);
phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const otpSendLogSchema = new Schema(
  {
    mobile: { type: String, required: true, index: true },
    purpose: { type: String, enum: ["REGISTER"], required: true },
    ip: String,
  },
  { timestamps: true }
);
otpSendLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const homeBannerSlideSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { _id: false }
);

const appSettingsSchema = new Schema(
  {
    key: { type: String, unique: true, default: "global" },
    smsEnabled: { type: Boolean, default: false },
    smsApiKey: { type: String, default: "", select: false },
    usdtToInrRate: { type: Number, default: 83, min: 0.01 },
    /** Minimum USDT amount for crypto deposits (custom amount & plan price check). */
    minUsdtDeposit: { type: Number, default: 1, min: 0.01 },
    /** Shown on user home — today's INR bonus % (admin-set) */
    todayInrBonusPercent: { type: Number, default: 0, min: 0, max: 100 },
    /** % of referred user's wallet credit paid to referrer on approved deposit */
    referralCommissionPercent: { type: Number, default: 5, min: 0, max: 100 },
    homeBannerEnabled: { type: Boolean, default: false },
    homeBannerTitle: { type: String, default: "" },
    homeBannerMessage: { type: String, default: "" },
    homeBannerImageUrl: { type: String, default: "" },
    homeBannerRevision: { type: Number, default: 0 },
    homeBannerSlides: { type: [homeBannerSlideSchema], default: [] },
    homePromoEnabled: { type: Boolean, default: false },
    homePromoImageUrl: { type: String, default: "" },
    homePromoLinkUrl: { type: String, default: "" },
    newbieRewardsEnabled: { type: Boolean, default: true },
    newbieRewardsTitle: { type: String, default: "Newbie Rewards" },
    newbieRewardsSubtitle: { type: String, default: "" },
    /** Round-robin counters for payment account rotation (per settlement mode). */
    paymentRotateManual: { type: Number, default: 0, min: 0 },
    paymentRotatePaytmAuto: { type: Number, default: 0, min: 0 },
    paymentRotateCryptoAuto: { type: Number, default: 0, min: 0 },
    newbieRewardsItems: {
      type: [
        new Schema(
          {
            id: { type: String, required: true },
            title: { type: String, default: "" },
            description: { type: String, default: "" },
            icon: { type: String, default: "🎁" },
            ctaLabel: { type: String, default: "" },
            ctaPath: { type: String, default: "/deposits" },
            taskType: {
              type: String,
              enum: ["TELEGRAM_JOIN", "BANK_ACCOUNT", "PIN_SET", "FIRST_DEPOSIT", "CUSTOM"],
              default: "CUSTOM",
            },
            amountInr: { type: Number, default: 0, min: 0 },
            telegramUrl: { type: String, default: "" },
            sortOrder: { type: Number, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const newbieRewardClaimSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rewardId: { type: String, required: true },
    taskType: { type: String, required: true },
    amountInr: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);
newbieRewardClaimSchema.index({ userId: 1, rewardId: 1 }, { unique: true });

const newbieRewardTaskAckSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rewardId: { type: String, required: true },
    taskType: { type: String, required: true },
  },
  { timestamps: true }
);
newbieRewardTaskAckSchema.index({ userId: 1, rewardId: 1 }, { unique: true });

const supportConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    status: { type: String, default: "OPEN" },
    messages: [supportMessageSchema],
  },
  { timestamps: true }
);

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    readAt: Date,
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
export const Admin = mongoose.model("Admin", adminSchema);
export const PaymentDetails = mongoose.model("PaymentDetails", paymentDetailsSchema);
export const Plan = mongoose.model("Plan", planSchema);
export const Purchase = mongoose.model("Purchase", purchaseSchema);
export const Payout = mongoose.model("Payout", payoutSchema);
export const LedgerEntry = mongoose.model("LedgerEntry", ledgerEntrySchema);
export const PhoneOtp = mongoose.model("PhoneOtp", phoneOtpSchema);
export const OtpSendLog = mongoose.model("OtpSendLog", otpSendLogSchema);
export const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
export const NewbieRewardClaim = mongoose.model("NewbieRewardClaim", newbieRewardClaimSchema);
export const NewbieRewardTaskAck = mongoose.model("NewbieRewardTaskAck", newbieRewardTaskAckSchema);
export const SupportConversation = mongoose.model("SupportConversation", supportConversationSchema);
export const Notification = mongoose.model("Notification", notificationSchema);

export type IUser = mongoose.InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
