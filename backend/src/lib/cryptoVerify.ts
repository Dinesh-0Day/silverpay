/**
 * On-chain verification using public blockchain APIs (no payment gateway).
 * TRC20 USDT is fully supported; other networks can be added similarly.
 */

const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

function normalizeTronAddress(addr: string) {
  return addr.trim();
}

function amountFromSun(value: string | number, decimals = 6) {
  const n = typeof value === "string" ? Number(value) : value;
  return n / 10 ** decimals;
}

/** Verify TRC20 USDT transfer to merchant address. */
export async function verifyTrc20UsdtPayment(
  txHash: string,
  toAddress: string,
  minAmountUsdt: number
): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  const hash = txHash.trim();
  const expectedTo = normalizeTronAddress(toAddress);

  try {
    const eventsRes = await fetch(
      `https://api.trongrid.io/v1/transactions/${hash}/events`,
      { headers: { Accept: "application/json" } }
    );
    if (!eventsRes.ok) {
      return { ok: false, error: "Could not fetch transaction from Tron network" };
    }
    const eventsBody = (await eventsRes.json()) as {
      data?: Array<{
        event_name?: string;
        contract_address?: string;
        result?: Record<string, string>;
      }>;
    };

    const transfers = (eventsBody.data ?? []).filter(
      (e) =>
        e.event_name === "Transfer" &&
        e.contract_address === USDT_TRC20_CONTRACT &&
        e.result?.to &&
        normalizeTronAddress(e.result.to) === expectedTo
    );

    if (transfers.length > 0) {
      const amount = amountFromSun(transfers[0].result?.value ?? "0", 6);
      if (amount + 0.000001 < minAmountUsdt) {
        return { ok: false, error: `Amount too low. Received ${amount} USDT, need ${minAmountUsdt} USDT` };
      }
      return { ok: true, amount };
    }

    // Fallback: Tronscan public API
    const scanRes = await fetch(
      `https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(hash)}`
    );
    if (!scanRes.ok) {
      return { ok: false, error: "Transaction not found or not confirmed yet" };
    }
    const scan = (await scanRes.json()) as {
      contractRet?: string;
      trc20TransferInfo?: Array<{
        to_address?: string;
        contract_address?: string;
        amount_str?: string;
        decimals?: number;
      }>;
    };

    if (scan.contractRet && scan.contractRet !== "SUCCESS") {
      return { ok: false, error: "Transaction failed on chain" };
    }

    const trc20 = (scan.trc20TransferInfo ?? []).find(
      (t) =>
        t.contract_address === USDT_TRC20_CONTRACT &&
        t.to_address &&
        normalizeTronAddress(t.to_address) === expectedTo
    );

    if (!trc20) {
      return { ok: false, error: "No USDT transfer to this wallet found in transaction" };
    }

    const decimals = trc20.decimals ?? 6;
    const amount = amountFromSun(trc20.amount_str ?? "0", decimals);
    if (amount + 0.000001 < minAmountUsdt) {
      return { ok: false, error: `Amount too low. Received ${amount} USDT, need ${minAmountUsdt} USDT` };
    }

    return { ok: true, amount };
  } catch {
    return { ok: false, error: "Blockchain verification failed. Try again in a minute." };
  }
}

export async function verifyCryptoPayment(
  network: string,
  txHash: string,
  toAddress: string,
  minAmountUsdt: number
): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  const n = network.toUpperCase();
  if (n.includes("TRC20") || n.includes("TRON") || n === "TRC20") {
    return verifyTrc20UsdtPayment(txHash, toAddress, minAmountUsdt);
  }
  return {
    ok: false,
    error: `Auto-verify for "${network}" is not enabled yet. Use TRC20 USDT or a manual account.`,
  };
}
