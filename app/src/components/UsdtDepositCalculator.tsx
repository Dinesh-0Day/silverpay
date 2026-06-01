import { useEffect, useState } from "react";
import { userApi, getErrorMessage, type CryptoCalcResult } from "../api";

type Props = {
  buyLoading?: boolean;
  onCreateOrder: (amountUsdt: number) => void;
};

export default function UsdtDepositCalculator({ buyLoading, onCreateOrder }: Props) {
  const [rate, setRate] = useState(0);
  const [minUsdt, setMinUsdt] = useState(1);
  const [amountInput, setAmountInput] = useState("");
  const [preview, setPreview] = useState<CryptoCalcResult | null>(null);
  const [calcError, setCalcError] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    userApi
      .cryptoSettings()
      .then((s) => {
        setRate(s.usdtToInrRate ?? 0);
        setMinUsdt(s.minUsdtDeposit > 0 ? s.minUsdtDeposit : 1);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const raw = amountInput.trim();
    const amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount < minUsdt) {
      setPreview(null);
      setCalcError(raw && amount < minUsdt ? `Minimum ${minUsdt} USDT` : "");
      return;
    }

    setCalcLoading(true);
    setCalcError("");
    const timer = window.setTimeout(() => {
      userApi
        .cryptoCalculator(amount)
        .then((res) => {
          setPreview(res);
          setRate(res.usdtToInrRate);
          if (res.minUsdtDeposit && res.minUsdtDeposit > 0) setMinUsdt(res.minUsdtDeposit);
        })
        .catch((e) => {
          setPreview(null);
          setCalcError(getErrorMessage(e));
        })
        .finally(() => setCalcLoading(false));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [amountInput, minUsdt]);

  const amount = Number(amountInput);
  const canCreate = Number.isFinite(amount) && amount >= minUsdt && preview && !calcError;

  return (
    <section className="usdt-calc" aria-label="USDT deposit calculator">
      <div className="usdt-calc-rate">
        <span className="usdt-calc-rate-label">Today&apos;s rate</span>
        <strong className="usdt-calc-rate-value">
          1 USDT = ₹{rate > 0 ? rate.toFixed(2) : "—"}
        </strong>
      </div>

      <p className="usdt-calc-min-hint">Minimum deposit: {minUsdt} USDT</p>

      <label className="usdt-calc-field">
        <span className="usdt-calc-field-label">USDT amount to sell</span>
        <div className="usdt-calc-input-wrap">
          <input
            type="number"
            inputMode="decimal"
            min={minUsdt}
            step="0.01"
            placeholder={`Min ${minUsdt} USDT`}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="usdt-calc-input"
          />
          <span className="usdt-calc-input-suffix">USDT</span>
        </div>
      </label>

      <div className="usdt-calc-rows">
        <div className="usdt-calc-row">
          <span>Estimated bonus</span>
          <strong className={calcLoading ? "is-loading" : ""}>
            {preview ? `₹${(preview.bonusAmountInr ?? 0).toFixed(2)}` : "—"}
          </strong>
        </div>
        <div className="usdt-calc-row usdt-calc-row-total">
          <span>Total wallet credit</span>
          <strong className={calcLoading ? "is-loading" : ""}>
            {preview ? `₹${preview.creditAmount.toFixed(2)}` : "—"}
          </strong>
        </div>
      </div>

      {calcError && <p className="usdt-calc-error">{calcError}</p>}

      <button
        type="button"
        className="usdt-calc-submit"
        disabled={!canCreate || buyLoading}
        onClick={() => canCreate && onCreateOrder(amount)}
      >
        {buyLoading ? "Creating order…" : "Create order"}
      </button>
    </section>
  );
}
