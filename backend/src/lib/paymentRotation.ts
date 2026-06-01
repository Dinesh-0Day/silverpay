import { AppSettings, PaymentDetails, type SettlementMode } from "../models/index.js";

const SETTINGS_KEY = "global";

const ROTATION_FIELD: Record<SettlementMode, string> = {
  MANUAL: "paymentRotateManual",
  PAYTM_AUTO: "paymentRotatePaytmAuto",
  CRYPTO_AUTO: "paymentRotateCryptoAuto",
};

const upiChannel = {
  $or: [{ paymentChannel: "UPI" }, { paymentChannel: { $exists: false } }, { paymentChannel: null }],
};

/** Active manual UPI accounts (stable order for round-robin). */
export async function listManualPaymentAccounts() {
  return PaymentDetails.find({
    isActive: true,
    upiId: { $exists: true, $ne: "" },
    settlementMode: { $nin: ["PAYTM_AUTO", "CRYPTO_AUTO"] },
    ...upiChannel,
  }).sort({ isDefault: -1, createdAt: 1 });
}

/** Active Paytm automatic accounts. */
export async function listPaytmAutoPaymentAccounts() {
  return PaymentDetails.find({
    isActive: true,
    settlementMode: "PAYTM_AUTO",
    upiId: { $exists: true, $ne: "" },
    paytmMerchantId: { $exists: true, $ne: "" },
    ...upiChannel,
  }).sort({ isDefault: -1, createdAt: 1 });
}

/** Active crypto on-chain accounts. */
export async function listCryptoAutoPaymentAccounts() {
  return PaymentDetails.find({
    isActive: true,
    paymentChannel: "CRYPTO",
    settlementMode: "CRYPTO_AUTO",
    cryptoAddress: { $exists: true, $ne: "" },
    cryptoNetwork: { $exists: true, $ne: "" },
  }).sort({ isDefault: -1, createdAt: 1 });
}

function filterEligible(accounts: Awaited<ReturnType<typeof listManualPaymentAccounts>>, mode: SettlementMode) {
  if (mode === "MANUAL") {
    return accounts.filter((a) => Boolean(a.upiId?.trim()));
  }
  if (mode === "PAYTM_AUTO") {
    return accounts.filter((a) => Boolean(a.upiId?.trim() && a.paytmMerchantId?.trim()));
  }
  return accounts.filter((a) => Boolean(a.cryptoAddress?.trim() && a.cryptoNetwork?.trim()));
}

async function nextRotationIndex(field: string, poolSize: number): Promise<number> {
  if (poolSize <= 0) return 0;
  const doc = await AppSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $inc: { [field]: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const raw = doc?.get(field);
  const seq = typeof raw === "number" && Number.isFinite(raw) ? raw : 1;
  return (seq - 1) % poolSize;
}

/** Pick next account in round-robin for this settlement mode. */
export async function pickRotatingPaymentAccount(settlementMode: SettlementMode) {
  const accounts =
    settlementMode === "MANUAL"
      ? await listManualPaymentAccounts()
      : settlementMode === "PAYTM_AUTO"
        ? await listPaytmAutoPaymentAccounts()
        : await listCryptoAutoPaymentAccounts();

  const eligible = filterEligible(accounts, settlementMode);
  if (!eligible.length) return null;
  if (eligible.length === 1) return eligible[0];

  const idx = await nextRotationIndex(ROTATION_FIELD[settlementMode], eligible.length);
  return eligible[idx] ?? eligible[0];
}
