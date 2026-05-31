import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminApi, getErrorMessage } from "../api";
import { Shield, Lock, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("session") === "expired") {
      setError("Your session expired. Please sign in again.");
    }
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token } = await adminApi.login(email, password);
      localStorage.setItem("adminToken", token);
      nav("/");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[#0b0f1a] text-white">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-indigo-600/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[360px] h-[360px] bg-sky-500/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/40">
              S
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">SilverPay</span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Admin</p>
            </div>
          </div>

          <div>
            <p className="text-indigo-300 text-sm font-semibold mb-3">Control center</p>
            <h2 className="text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight max-w-lg">
              Manage plans, payments & payouts in one place
            </h2>
            <p className="text-slate-400 mt-6 max-w-md text-base leading-relaxed">
              Verify deposits, process withdrawals, configure plans, and support users — backed by MongoDB with secure authentication.
            </p>
            <ul className="mt-10 space-y-3 text-sm text-slate-400">
              {["Deposit approval workflow", "Manual payout processing", "Live user support"].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} SilverPay · Authorized access only</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 app-shell-bg">
        <form onSubmit={submit} className="w-full max-w-[420px] animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/25">
              S
            </div>
            <span className="font-bold text-lg text-slate-900">SilverPay Admin</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_40px_rgba(15,23,42,0.08)] p-8 sm:p-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-100 text-brand-600 flex items-center justify-center mb-6">
              <Shield size={22} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1.5 mb-8">Sign in with your admin credentials</p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-500/25 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in to dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
