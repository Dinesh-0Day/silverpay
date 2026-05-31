import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ShoppingCart,
  Wallet,
  MessageCircle,
  ArrowUpRight,
  Clock,
  TrendingUp,
} from "lucide-react";
import { adminApi, getErrorMessage } from "../api";
import { StatCard, Card, SectionTitle, PageError } from "../components/ui";

export default function Dashboard() {
  const [stats, setStats] = useState<{
    users: number;
    pendingDeposits: number;
    pendingPayouts: number;
    openChats: number;
  } | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    return adminApi
      .stats()
      .then(setStats)
      .catch((e) => setError(getErrorMessage(e)));
  };

  useEffect(() => {
    void load();
  }, []);

  const pendingTotal = (stats?.pendingDeposits ?? 0) + (stats?.pendingPayouts ?? 0);

  const quickLinks = [
    {
      to: "/deposits",
      label: "Review deposits",
      desc: "Verify UTR and credit wallets",
      count: stats?.pendingDeposits,
      urgent: true,
      color: "bg-amber-50 text-amber-600 ring-amber-200/60",
    },
    {
      to: "/payouts",
      label: "Process payouts",
      desc: "Pay users and mark complete",
      count: stats?.pendingPayouts,
      urgent: true,
      color: "bg-emerald-50 text-emerald-600 ring-emerald-200/60",
    },
    {
      to: "/support",
      label: "Support inbox",
      desc: "Reply to open conversations",
      count: stats?.openChats,
      color: "bg-sky-50 text-sky-600 ring-sky-200/60",
    },
    {
      to: "/plans",
      label: "Manage plans",
      desc: "Pricing, bonus & daily limits",
      color: "bg-indigo-50 text-indigo-600 ring-indigo-200/60",
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageError message={error} onRetry={load} />
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">Dashboard</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Good to see you back</h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            {pendingTotal > 0
              ? `You have ${pendingTotal} item${pendingTotal > 1 ? "s" : ""} waiting for your action.`
              : "Everything is caught up. Monitor users and transactions below."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8 -mt-4 relative z-10">
        <StatCard
          label="Total users"
          value={stats?.users ?? "—"}
          icon={<Users size={22} />}
          accent="indigo"
          trend="Registered accounts"
        />
        <StatCard
          label="Pending deposits"
          value={stats?.pendingDeposits ?? "—"}
          icon={<ShoppingCart size={22} />}
          highlight={(stats?.pendingDeposits ?? 0) > 0}
          accent="amber"
        />
        <StatCard
          label="Pending payouts"
          value={stats?.pendingPayouts ?? "—"}
          icon={<Wallet size={22} />}
          highlight={(stats?.pendingPayouts ?? 0) > 0}
          accent="emerald"
        />
        <StatCard
          label="Open support"
          value={stats?.openChats ?? "—"}
          icon={<MessageCircle size={22} />}
          accent="sky"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <SectionTitle className="mb-5 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-600" />
            Quick actions
          </SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            {quickLinks.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="group flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${q.color}`}>
                    <ArrowUpRight size={16} />
                  </div>
                  {q.count != null && q.count > 0 && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        q.urgent ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {q.count}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-900 mt-3 text-sm group-hover:text-brand-700 transition-colors">
                  {q.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{q.desc}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle className="mb-5 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            Operations guide
          </SectionTitle>
          <ol className="space-y-4 text-sm">
            {[
              { step: "1", text: "User buys plan → pays to your UPI/bank" },
              { step: "2", text: "Approve deposit → wallet credited with bonus" },
              { step: "3", text: "User withdraws → you pay manually → mark paid" },
            ].map((item) => (
              <li key={item.step} className="flex gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                  {item.step}
                </span>
                <p className="text-slate-600 leading-relaxed pt-0.5">{item.text}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
