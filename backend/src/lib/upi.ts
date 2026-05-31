/** Standard UPI deep link for QR (Paytm auto uses tr = order id for status API) */
export function buildUpiPaymentUri(opts: {
  vpa: string;
  payeeName?: string;
  amount: number;
  note?: string;
  transactionRef?: string;
}) {
  const params = new URLSearchParams();
  params.set("pa", opts.vpa.trim());
  if (opts.payeeName) params.set("pn", opts.payeeName.trim());
  params.set("am", opts.amount.toFixed(2));
  params.set("cu", "INR");
  const tn = opts.note ?? `TXN${Math.floor(Math.random() * 1e12)}`;
  params.set("tn", tn.slice(0, 80));
  if (opts.transactionRef) params.set("tr", opts.transactionRef);
  return `upi://pay?${params.toString()}`;
}

/** Paytm-style order id: 10 random chars + timestamp */
export function generatePaytmStyleOrderId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomPart = "";
  for (let i = 0; i < 10; i++) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }
  return randomPart + String(Date.now());
}

export function paymentTimeoutSeconds() {
  return Number(process.env.PAYMENT_TIMEOUT_SECONDS || 300);
}

export function paymentExpiresAt() {
  return new Date(Date.now() + paymentTimeoutSeconds() * 1000);
}

export function paymentTimerMinutes() {
  return Math.ceil(paymentTimeoutSeconds() / 60);
}
