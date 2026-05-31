import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { userApi, getErrorMessage, type PaymentSession } from "../api";
import PageStatus from "../components/PageStatus";
import PaytmAutoPay from "../components/PaytmAutoPay";
import ManualUpiPay from "../components/ManualUpiPay";
import CryptoPay from "../components/CryptoPay";

export default function PayOrder() {
  const { depositId } = useParams();
  const depositIdResolved = depositId!;
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);

  const loadSession = useCallback(() => {
    if (!depositIdResolved) return;
    setSessionLoading(true);
    setError("");
    userApi
      .paymentSession(depositIdResolved)
      .then(setSession)
      .catch((e) => {
        setSession(null);
        setError(getErrorMessage(e));
      })
      .finally(() => setSessionLoading(false));
  }, [depositIdResolved]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (sessionLoading || (!session && error)) {
    return (
      <div>
        <Link to="/" className="text-sky-600 text-sm">
          ← Back
        </Link>
        <PageStatus loading={sessionLoading} error={error} onRetry={loadSession} loadingLabel="Loading payment…">
          <span />
        </PageStatus>
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        <Link to="/" className="text-sky-600 text-sm">
          ← Back
        </Link>
        <p className="text-slate-500 mt-4">Payment session not found.</p>
      </div>
    );
  }

  if (session.settlementMode === "PAYTM_AUTO") {
    return <PaytmAutoPay depositId={depositIdResolved} session={session} />;
  }

  if (session.settlementMode === "MANUAL" && session.upi?.deepLink) {
    return <ManualUpiPay depositId={depositIdResolved} session={session} />;
  }

  if (session.settlementMode === "CRYPTO_AUTO") {
    return <CryptoPay depositId={depositIdResolved} session={session} />;
  }

  return (
    <div>
      <Link to="/" className="text-sky-600 text-sm">
        ← Back
      </Link>
      <p className="text-slate-500 mt-4">Unsupported payment method.</p>
    </div>
  );
}
