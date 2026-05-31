import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi, getErrorMessage, type PaymentSession } from "../api";
import { formatPlanAmount, formatWalletInr } from "../lib/currency";
import QrDisplay from "./QrDisplay";
import { usePaymentExitGuard } from "../hooks/usePaymentExitGuard";

type Props = {
  depositId: string;
  session: PaymentSession;
};

export default function CryptoPay({ depositId, session }: Props) {
  const nav = useNavigate();
  const [showPayment, setShowPayment] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [creditAmount, setCreditAmount] = useState(session.creditAmount);

  const crypto = session.crypto;
  const usdtAmount = crypto?.expectedUsdt ?? session.amount;
  const network = crypto?.network ?? "TRC20";

  const { leaveNow } = usePaymentExitGuard({
    depositId,
    enabled: showPayment && !done,
    mode: "silent",
  });

  useEffect(() => {
    const t = setTimeout(() => setShowPayment(true), 800);
    return () => clearTimeout(t);
  }, []);

  const copyAddress = () => {
    if (crypto?.address) navigator.clipboard.writeText(crypto.address);
  };

  const handleCancel = async () => {
    await leaveNow();
    nav("/deposits", { replace: true });
  };

  const submitCrypto = async () => {
    if (!txHash.trim()) {
      setError("Enter transaction hash");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await userApi.verifyCrypto(depositId, txHash.trim());
      setCreditAmount(res.deposit?.creditAmount ?? session.creditAmount);
      setDone(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="crypto-pay-success">
        <div className="crypto-pay-success-icon" aria-hidden>
          ✓
        </div>
        <h2>Payment verified</h2>
        <p>
          {formatWalletInr(creditAmount)} credited to your wallet.
          <br />
          Ref {session.deposit.orderNo}
        </p>
        <Link to="/" className="crypto-pay-success-btn">
          Go to Home
        </Link>
        <Link to="/deposits/history" className="crypto-pay-success-link">
          View deposit history
        </Link>
      </div>
    );
  }

  if (!showPayment) {
    return (
      <div className="crypto-pay-loading">
        <div className="crypto-pay-loading-icon" aria-hidden>
          ₮
        </div>
        <h2>Preparing USDT payment…</h2>
        <div className="crypto-pay-spinner" aria-hidden />
      </div>
    );
  }

  return (
    <div className="crypto-pay-page">
      <header className="crypto-pay-head">
        <div>
          <p className="crypto-pay-eyebrow">USDT Payment</p>
          <h1>{formatPlanAmount(usdtAmount, "USDT")}</h1>
        </div>
        <Link to="/deposits" className="crypto-pay-cancel" onClick={(e) => { e.preventDefault(); void handleCancel(); }}>
          Cancel
        </Link>
      </header>

      <div className="crypto-pay-amount-card">
        <div className="crypto-pay-amount-main">
          <span>Send exactly</span>
          <strong>{formatPlanAmount(usdtAmount, "USDT")}</strong>
        </div>
        <div className="crypto-pay-network">{network} network</div>
      </div>

      <section className="crypto-pay-qr-card">
        {crypto?.qrText ? (
          <>
            <QrDisplay value={crypto.qrText} label="Scan wallet address" />
            <button type="button" onClick={copyAddress} className="crypto-pay-copy">
              <span aria-hidden>📋</span>
              <span className="crypto-pay-copy-text">{crypto.address}</span>
            </button>
            <p className="crypto-pay-qr-hint">Send only USDT on {network}. Other tokens may be lost.</p>
          </>
        ) : (
          <p className="crypto-pay-error-inline">Crypto wallet not configured. Contact support.</p>
        )}
      </section>

      <section className="crypto-pay-summary">
        <div className="crypto-pay-summary-row">
          <span>Order ID</span>
          <strong className="crypto-pay-mono">{session.deposit.orderNo}</strong>
        </div>
        <div className="crypto-pay-summary-row">
          <span>USDT amount</span>
          <strong>{formatPlanAmount(usdtAmount, "USDT")}</strong>
        </div>
        {session.usdtToInrRate ? (
          <div className="crypto-pay-summary-row">
            <span>Rate</span>
            <strong>1 USDT = ₹{session.usdtToInrRate.toFixed(2)}</strong>
          </div>
        ) : null}
        <div className="crypto-pay-summary-row">
          <span>Bonus</span>
          <strong className="crypto-pay-bonus">+{formatWalletInr(session.bonusAmount)}</strong>
        </div>
        <div className="crypto-pay-summary-row crypto-pay-summary-total">
          <span>Wallet credit</span>
          <strong>{formatWalletInr(session.creditAmount)}</strong>
        </div>
      </section>

      <section className="crypto-pay-verify">
        <label className="crypto-pay-label" htmlFor="crypto-tx-hash">
          Transaction hash
        </label>
        <input
          id="crypto-tx-hash"
          className="crypto-pay-input"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Paste TX hash after sending USDT"
          autoComplete="off"
        />

        {error ? (
          <p className="crypto-pay-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void submitCrypto()}
          disabled={loading || !crypto?.address}
          className="crypto-pay-submit"
        >
          {loading ? "Verifying on-chain…" : "Verify payment"}
        </button>
      </section>
    </div>
  );
}
