import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Layers,
  CreditCard,
  Users,
  MessageCircle,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { to: "/deposits", label: "Deposits", icon: ShoppingCart },
      { to: "/payouts", label: "Payouts", icon: Wallet },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/plans", label: "Plans", icon: Layers },
      { to: "/payment-details", label: "Payment details", icon: CreditCard },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/users", label: "Users", icon: Users },
      { to: "/support", label: "Support", icon: MessageCircle },
    ],
  },
  {
    label: "System",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

const flatNav = navGroups.flatMap((g) => g.items);

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = flatNav.find((n) => n.to === location.pathname);

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/login");
  };

  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen flex app-shell-bg">
      <aside className="w-[260px] bg-sidebar text-slate-400 flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 border-r border-sidebar-border">
        <div className="h-[72px] flex items-center px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 via-brand-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">
              S
            </div>
            <div>
              <span className="text-white font-bold text-[15px] tracking-tight block leading-tight">SilverPay</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Admin Console</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-5 px-3 overflow-y-auto scrollbar-thin space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                        active
                          ? "bg-sidebar-active text-white shadow-inner"
                          : "hover:bg-sidebar-hover text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-indigo-400" />
                      )}
                      <Icon size={18} strokeWidth={active ? 2.25 : 1.75} className={active ? "text-indigo-300" : ""} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-elevated/80">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <Shield size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">Administrator</p>
              <p className="text-[10px] text-slate-500 truncate">Secure session</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 hover:bg-sidebar-hover hover:text-red-300 transition-colors"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        <header className="h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 font-medium">SilverPay</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-slate-900 font-semibold">{current?.label ?? "Panel"}</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-xs text-slate-400 hidden md:inline font-medium">{today}</span>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg ring-1 ring-emerald-600/15">
                Live
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
