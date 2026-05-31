import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { userApi, getErrorMessage, type Plan } from "../api";

type Props = {
  plan: Plan;
  onClose: () => void;
};

function AutoBoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

export default function InrPaymentSheet({ plan, onClose }: Props) {
  const nav = useNavigate();
  const [hasManual, setHasManual] = useState(false);
  const [hasAuto, setHasAuto] = useState(false);
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setLoadingOpts(true);
    setError("");
    userApi
      .paymentOptions()
      .then((opts) => {
        setHasManual(opts.manual.length > 0);
        setHasAuto(opts.automatic.length > 0);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoadingOpts(false));
  }, []);

  const start = async (settlementMode: "MANUAL" | "PAYTM_AUTO") => {
    setLoading(true);
    setError("");
    try {
      const res = await userApi.createDeposit({ planId: plan.id, settlementMode });
      onClose();
      nav(`/pay/${res.deposit.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="inr-pay-sheet-backdrop" onClick={onClose}>
      <div className="inr-pay-sheet-wrap">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inr-pay-sheet-title"
          className="inr-pay-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="inr-pay-sheet-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="inr-pay-sheet-handle" aria-hidden />

          <div className="inr-pay-sheet-inner">
            <div className="inr-pay-sheet-head">
              <h2 id="inr-pay-sheet-title" className="inr-pay-sheet-title">
                Choose payment
              </h2>
              <p className="inr-pay-sheet-plan">
                ₹{plan.price.toFixed(2)} · Wallet ₹{plan.creditPreview.toFixed(2)}
              </p>
            </div>

            {loadingOpts ? (
              <p className="inr-pay-sheet-muted">Loading payment options…</p>
            ) : (
              <div className="inr-pay-sheet-options">
                {hasAuto && (
                  <button
                    type="button"
                    className="inr-pay-sheet-option inr-pay-sheet-option--auto inr-pay-sheet-option--row"
                    disabled={loading}
                    onClick={() => void start("PAYTM_AUTO")}
                  >
                    <span className="inr-pay-sheet-bolt" aria-hidden>
                      <AutoBoltIcon />
                    </span>
                    <span className="inr-pay-sheet-option-text">
                      <span className="inr-pay-sheet-option-title">Automatic payment</span>
                      <span className="inr-pay-sheet-option-sub">Scan QR · instant auto verification</span>
                    </span>
                  </button>
                )}

                {hasManual && (
                  <button
                    type="button"
                    className="inr-pay-sheet-option inr-pay-sheet-option--row"
                    disabled={loading}
                    onClick={() => void start("MANUAL")}
                  >
                    <span className="inr-pay-sheet-manual-icon" aria-hidden>
                      ✋
                    </span>
                    <span className="inr-pay-sheet-option-text">
                      <span className="inr-pay-sheet-option-title">Manual payment</span>
                      <span className="inr-pay-sheet-option-sub">Scan QR → pay → submit UTR</span>
                    </span>
                  </button>
                )}

                {!hasManual && !hasAuto && (
                  <p className="inr-pay-sheet-error">No UPI payment methods configured. Contact support.</p>
                )}
              </div>
            )}

            {error ? (
              <p className="inr-pay-sheet-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
