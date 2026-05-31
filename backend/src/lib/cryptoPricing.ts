import { calcBonus } from "./wallet.js";

export function usdtToInr(usdt: number, rate: number) {
  return Math.round(usdt * rate * 100) / 100;
}

/** Crypto plan: price & fixed bonus in USDT; wallet credit in INR using rate. */
export function calcCryptoWalletCredit(
  amountUsdt: number,
  bonusPercent: number,
  bonusFixedUsdt: number,
  usdtToInrRate: number
) {
  const baseInr = usdtToInr(amountUsdt, usdtToInrRate);
  const fixedInr = usdtToInr(bonusFixedUsdt, usdtToInrRate);
  const bonusInr = calcBonus(baseInr, bonusPercent, fixedInr);
  const creditInr = Math.round((baseInr + bonusInr) * 100) / 100;
  const bonusUsdt = usdtToInrRate > 0 ? Math.round((bonusInr / usdtToInrRate) * 100) / 100 : 0;
  return { baseInr, bonusInr, creditInr, bonusUsdt };
}
