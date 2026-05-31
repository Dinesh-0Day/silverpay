import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi, type PaymentSession } from "../api";
import QrDisplay from "./QrDisplay";
import PaymentLeaveDialog from "./PaymentLeaveDialog";
import { usePaymentExitGuard } from "../hooks/usePaymentExitGuard";

const UPI_APPS = [
  { name: "Paytm", src: "https://cdn.razorpay.com/app/paytm.svg" },
  { name: "GPay", src: "https://cdn.razorpay.com/app/googlepay.svg" },
  { name: "PhonePe", src: "https://checkout-static-next.razorpay.com/build/assets/images/phonepe.e101f376.svg" },
];

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  depositId: string;
  session: PaymentSession;
};

export default function PaytmAutoPay({ depositId, session }: Props) {
  const nav = useNavigate();
  const [showPayment, setShowPayment] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(session.secondsRemaining ?? 300);
  const [statusText, setStatusText] = useState<"wait" | "checking">("wait");
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);
  const [creditAmount, setCreditAmount] = useState(session.creditAmount);
  const checkingRef = useRef(false);
  const completedRef = useRef(false);
  const checkIntervalMs = session.checkIntervalMs ?? 10000;
  const guardActive = showPayment && !done && !expired;
  const { leaveOpen, confirmLeave, stayOnPage } = usePaymentExitGuard({
    depositId,
    enabled: guardActive,
    mode: "warn",
  });

  const copyUpi = () => {
    if (session.upi?.vpa) navigator.clipboard.writeText(session.upi.vpa);
  };

  const checkPaytm = useCallback(async () => {
    if (completedRef.current || checkingRef.current) return;
    if (secondsLeft <= 0) return;

    checkingRef.current = true;
    setStatusText("checking");

    try {
      const res = await userApi.paytmCheckStatus(depositId);
      if (res.status === "success") {
        completedRef.current = true;
        setCreditAmount(res.amount ?? session.creditAmount);
        setDone(true);
        return;
      }
      if (res.status === "expired" || res.status === "failed") {
        if (res.status === "expired") setExpired(true);
        return;
      }
    } catch {
      /* keep polling */
    } finally {
      checkingRef.current = false;
      if (!completedRef.current) setStatusText("wait");
    }
  }, [depositId, secondsLeft, session.creditAmount]);

  useEffect(() => {
    const t = setTimeout(() => setShowPayment(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showPayment || completedRef.current) return;
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          if (!completedRef.current) {
            userApi.cancelExpired(depositId).finally(() => setExpired(true));
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [showPayment, depositId]);

  useEffect(() => {
    if (!showPayment || completedRef.current || expired) return;
    const first = setTimeout(() => checkPaytm(), checkIntervalMs);
    const poll = setInterval(() => checkPaytm(), checkIntervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
    };
  }, [showPayment, checkPaytm, checkIntervalMs, expired]);

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) checkPaytm();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [checkPaytm]);

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-5xl text-emerald-600 mb-4">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-emerald-700">Payment Successful!</h2>
        <p className="text-slate-600 mt-2">₹{creditAmount.toFixed(2)} added to your wallet</p>
        <Link to="/" className="mt-8 w-full max-w-xs bg-emerald-600 text-white py-3 rounded-full font-semibold text-center">
          Go to Home
        </Link>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl mb-4">⏱</p>
        <h2 className="text-xl font-bold text-red-600">Payment Expired</h2>
        <p className="text-slate-500 mt-2 text-sm">Order cancelled — please create a new deposit.</p>
        <button onClick={() => nav("/deposits")} className="mt-8 w-full max-w-xs bg-red-600 text-white py-3 rounded-full font-semibold">
          Try Again
        </button>
      </div>
    );
  }

  if (!showPayment) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-white to-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 mb-4">
          SP
        </div>
        <h2 className="text-lg font-semibold text-indigo-600">Securing Payment…</h2>
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mt-4" />
        <p className="text-xs text-slate-400 mt-4">Secured payment</p>
      </div>
    );
  }

  return (
    <>
      <PaymentLeaveDialog open={leaveOpen} onStay={stayOnPage} onLeave={() => void confirmLeave()} />
      <div className="min-h-[100dvh] bg-slate-50 pb-8 -mx-4 px-4">
        <div className="flex justify-between items-center py-3">
          <h2 className="font-semibold text-slate-800">UPI Payment</h2>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${secondsLeft < 30 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"}`}>
          <span>⏱</span>
          <span className="tabular-nums">{formatTimer(secondsLeft)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center mb-4">
        {session.upi?.deepLink && (
          <>
            <QrDisplay value={session.upi.deepLink} label="Scan with any UPI app" />
            <button
              type="button"
              onClick={copyUpi}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono text-slate-700"
            >
              📋 {session.upi.vpa}
            </button>
            <p className="text-xs text-slate-500 mt-3">Scan the QR using any UPI App</p>
            <div className="flex justify-center gap-3 mt-3 flex-wrap">
              {UPI_APPS.map((a) => (
                <img key={a.name} src={a.src} alt={a.name} className="w-6 h-6" />
              ))}
              <span className="text-xs text-slate-400">+ More</span>
            </div>
          </>
        )}
      </div>

      <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 text-center mb-4">
        <div className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-white shadow-sm mb-2">
          <span className="animate-pulse text-sky-600">●</span>
        </div>
        <p className="text-sm font-semibold text-sky-800">
          {statusText === "checking" ? "Checking payment status…" : "Please wait for auto approval"}
        </p>
        <p className="text-xs text-sky-700 mt-1">कृपया स्वत: अनुमोदन की प्रतीक्षा करें</p>
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
        <div className="flex justify-between">
          <span className="text-slate-500">Status</span>
          <span className="text-amber-700 font-medium">Pending</span>
        </div>
      </div>

      <div className="bg-sky-50 rounded-xl p-3 text-xs text-slate-600 border border-sky-100">
        <strong>Auto-verification enabled</strong> — Pay via UPI QR. Payment is verified automatically and wallet is credited.
      </div>
      </div>
    </>
  );
}
