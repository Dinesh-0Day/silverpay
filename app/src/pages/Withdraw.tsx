import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi, getErrorMessage, type BankAccount, type User } from "../api";
import ErrorAlert from "../components/ErrorAlert";
import PageStatus from "../components/PageStatus";

export default function Withdraw() {
  const nav = useNavigate();
  const [user, setUser] = useState<(User & { available: number; bankAccount?: BankAccount }) | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError("");
    return userApi
      .me()
      .then(setUser)
      .catch((e) => setLoadError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.bankAccount) {
      setError("Add bank details before withdrawing");
      return;
    }
    const num = parseFloat(amount);
    if (num <= 0 || num > (user.available ?? 0)) {
      setError("Enter a valid amount within your available balance");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await userApi.createPayout(num);
      nav("/wallet");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link to="/wallet" className="app-back-link mb-2">
        ← Wallet
      </Link>
      <h2 className="app-page-title">Withdraw</h2>
      <PageStatus loading={loading} error={loadError} onRetry={load}>
        <p className="text-sm text-slate-600 mb-4">Available: ₹{user?.available?.toFixed(2) ?? "0"}</p>
        {!user?.bankAccount && (
          <p className="bg-amber-50 text-amber-800 text-sm p-3 rounded-xl mb-4">
            <Link to="/profile/bank" className="underline font-medium">
              Add bank account
            </Link>{" "}
            before withdrawing.
          </p>
        )}
        <ErrorAlert message={error} />
        <form onSubmit={submit}>
          <label className="block text-sm text-slate-600 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded-xl px-4 py-3 mb-4"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={!user?.bankAccount || submitting}
            className="w-full bg-sky-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Request payout"}
          </button>
        </form>
      </PageStatus>
    </div>
  );
}
