import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi, getErrorMessage, type PaymentSession } from "../api";
import QrDisplay from "./QrDisplay";
import { usePaymentExitGuard } from "../hooks/usePaymentExitGuard";

const UPI_APPS = [
  { name: "Paytm", src: "https://cdn.razorpay.com/app/paytm.svg" },
  { name: "GPay", src: "https://cdn.razorpay.com/app/googlepay.svg" },
  { name: "PhonePe", src: "https://checkout-static-next.razorpay.com/build/assets/images/phonepe.e101f376.svg" },
];

type Props = {
  depositId: string;
  session: PaymentSession;
};

export default function ManualUpiPay({ depositId, session }: Props) {
  const nav = useNavigate();
  const [showPayment, setShowPayment] = useState(false);
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const { leaveNow } = usePaymentExitGuard({
    depositId,
    enabled: showPayment && !done,
    mode: "silent",
  });

  useEffect(() => {
    const t = setTimeout(() => setShowPayment(true), 800);
    return () => clearTimeout(t);
  }, []);

  const copyUpi = () => {
    if (session.upi?.vpa) navigator.clipboard.writeText(session.upi.vpa);
  };

  const handleCancel = async () => {
    await leaveNow();
    nav("/deposits", { replace: true });
  };

  const submitUtr = async () => {
    if (!utr.trim()) {
      setError("Enter UTR / transaction number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await userApi.submitUtr(depositId, utr.trim());
      setDone(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-5xl text-amber-600 mb-4">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-800">UTR Submitted</h2>
        <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-xs">
          Ref {session.deposit.orderNo} — admin will verify your payment and credit ₹
          {session.creditAmount.toFixed(2)} to your wallet.
        </p>
        <Link
          to="/deposits"
          className="mt-8 w-full max-w-xs bg-sky-600 text-white py-3 rounded-full font-semibold text-center"
        >
          Back to Deposits
        </Link>
      </div>
    );
  }

  if (!showPayment) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-white to-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 mb-4">
          SP
        </div>
        <h2 className="text-lg font-semibold text-indigo-600">Preparing payment…</h2>
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mt-4" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-8 -mx-4 px-4">
      <div className="flex justify-between items-center py-3">
        <h2 className="font-semibold text-slate-800">Manual UPI Payment</h2>
        <button type="button" onClick={() => void handleCancel()} className="text-sm text-sky-600 font-medium">
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center mb-4">
        {session.upi?.deepLink ? (
          <>
            <QrDisplay value={session.upi.deepLink} label="Scan with any UPI app" />
            <button
              type="button"
              onClick={copyUpi}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono text-slate-700"
            >
              📋 {session.upi.vpa}
            </button>
            <p className="text-xs text-slate-500 mt-3">Pay exact amount shown below, then enter UTR</p>
            <div className="flex justify-center gap-3 mt-3 flex-wrap">
              {UPI_APPS.map((a) => (
                <img key={a.name} src={a.src} alt={a.name} className="w-6 h-6" />
              ))}
              <span className="text-xs text-slate-400">+ More</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-red-600">UPI QR not available. Contact support.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border p-4 text-sm space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-slate-500">Order ID</span>
          <span className="font-mono text-xs">{session.deposit.orderNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Amount</span>
          <span className="font-semibold">₹{session.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Wallet credit</span>
          <span className="font-semibold text-emerald-600">₹{session.creditAmount.toFixed(2)}</span>
        </div>
      </div>

      <label className="block text-sm font-medium text-slate-700 mb-1.5">UTR / Transaction number</label>
      <input
        className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-3 font-mono text-sm bg-white"
        value={utr}
        onChange={(e) => setUtr(e.target.value)}
        placeholder="12-digit UTR from UPI app"
        autoComplete="off"
      />

      {error ? (
        <p className="text-sm text-red-600 mb-3" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void submitUtr()}
        disabled={loading || !session.upi?.deepLink}
        className="w-full bg-sky-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Submit UTR for approval"}
      </button>

      <p className="text-xs text-slate-500 text-center mt-4 leading-relaxed">
        No auto tracking — pay via QR, then submit UTR. Admin approves manually.
      </p>
    </div>
  );
}
