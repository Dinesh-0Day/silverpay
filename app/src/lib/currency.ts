export type PlanCurrency = "INR" | "USDT";

export function formatPlanAmount(amount: number, currency: PlanCurrency = "INR") {
  return currency === "USDT" ? `${amount} USDT` : `₹${amount}`;
}

export function formatWalletInr(amount: number) {
  return `₹${amount}`;
}

export function planCurrency(category: "INR" | "CRYPTO"): PlanCurrency {
  return category === "CRYPTO" ? "USDT" : "INR";
}
