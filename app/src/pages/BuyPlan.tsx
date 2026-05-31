import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { userApi, getErrorMessage, type Plan } from "../api";
import ErrorAlert from "../components/ErrorAlert";
import PageStatus from "../components/PageStatus";

export default function BuyPlan() {
  const { planId } = useParams();
  const nav = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [hasManual, setHasManual] = useState(false);
  const [hasAuto, setHasAuto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(true);

  const load = () => {
    if (!planId) return;
    setLoadingPlan(true);
    setLoadError("");
    Promise.all([
      userApi.plans("INR").then((list) => list.find((p) => p.id === planId) ?? null),
      userApi.paymentOptions(),
    ])
      .then(([p, opts]) => {
        if (!p) throw new Error("Plan not found");
        setPlan(p);
        setHasManual(opts.manual.length > 0);
        setHasAuto(opts.automatic.length > 0);
      })
      .catch((e) => setLoadError(getErrorMessage(e)))
      .finally(() => setLoadingPlan(false));
  };

  useEffect(() => {
    load();
  }, [planId]);

  const start = async (settlementMode: "MANUAL" | "PAYTM_AUTO") => {
    if (!planId) return;
    setLoading(true);
    setError("");
    try {
      const res = await userApi.createDeposit({ planId, settlementMode });
      nav(`/pay/${res.deposit.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageStatus loading={loadingPlan} error={loadError} onRetry={load}>
        {!plan ? null : (
          <>
      <Link to="/deposits" className="text-sky-600 text-sm">← Deposits</Link>
      <h2 className="text-xl font-bold">
        {plan.categoryLabel ?? "INR"} · {plan.typeLabel ?? plan.type} · ₹{plan.price}
      </h2>
      <p className="text-2xl font-bold text-slate-800 mt-1">₹{plan.price}</p>
      <p className="text-sm text-emerald-600 mb-6">You get ₹{plan.creditPreview} in wallet</p>

      <p className="text-sm font-semibold text-slate-700 mb-3">Choose payment method</p>

      {hasManual && (
        <button
          onClick={() => start("MANUAL")}
          disabled={loading}
          className="w-full mb-3 p-4 rounded-2xl border-2 border-slate-200 text-left hover:border-sky-500 hover:bg-sky-50 transition-colors disabled:opacity-50"
        >
          <p className="font-bold text-slate-900">Manual UPI</p>
          <p className="text-xs text-slate-500 mt-1">Scan QR → pay → enter UTR → admin approves</p>
        </button>
      )}

      {hasAuto && (
        <button
          onClick={() => start("PAYTM_AUTO")}
          disabled={loading}
          className="w-full mb-3 p-4 rounded-2xl border-2 border-[#00baf2]/40 text-left hover:border-[#00baf2] hover:bg-sky-50 transition-colors disabled:opacity-50"
        >
          <p className="font-bold text-slate-900">Automatic (Paytm)</p>
          <p className="text-xs text-slate-500 mt-1">Scan UPI QR → Paytm status API auto-verifies → wallet credit</p>
        </button>
      )}

      {!hasManual && !hasAuto && (
        <p className="text-red-600 text-sm">No UPI payment methods configured. Contact support.</p>
      )}

      <ErrorAlert message={error} />
          </>
        )}
      </PageStatus>
    </div>
  );
}
