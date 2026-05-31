export function isCryptoDeposit(d: { planCategory?: string; settlementMode?: string; payCurrency?: string }) {
  return d.planCategory === "CRYPTO" || d.settlementMode === "CRYPTO_AUTO" || d.payCurrency === "USDT";
}

export function formatUsdt(amount: number) {
  return `${amount} USDT`;
}

export function formatInr(amount: number) {
  return `₹${amount}`;
}

/** @deprecated use formatUsdt / formatInr */
export function formatPlanAmount(amount: number, currency?: string) {
  return currency === "USDT" || currency === "CRYPTO" ? formatUsdt(amount) : formatInr(amount);
}

export function formatBonusFixed(amount: number, planCategory?: string) {
  return planCategory === "CRYPTO" ? formatUsdt(amount) : formatInr(amount);
}

export function formatWalletInr(amount: number) {
  return `₹${amount}`;
}
