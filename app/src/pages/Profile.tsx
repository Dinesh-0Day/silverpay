import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi, getErrorMessage, type BankAccount, type LedgerEntry, type User } from "../api";
import ProfilePersonaAvatar from "../components/ProfilePersonaAvatar";
import PageStatus from "../components/PageStatus";

type UserProfile = User & { available?: number; bankAccount?: BankAccount | null };

type MenuItem = {
  to: string;
  icon: string;
  label: string;
  sub?: string;
  badge?: string;
};

export default function Profile() {
  const nav = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState("");
  const [pinErr, setPinErr] = useState("");

  const load = () => {
    setLoading(true);
    setLoadError("");
    return Promise.all([userApi.me(), userApi.ledger(), userApi.pinStatus()])
      .then(([u, l, p]) => {
        setUser(u);
        setLedger(l);
        setPinConfigured(Boolean(p.configured));
      })
      .catch((e) => setLoadError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const logout = () => {
    localStorage.removeItem("userToken");
    nav("/login");
  };

  const copyReferral = async () => {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const bankSet = Boolean(user?.bankAccount?.accountNumber);
  const displayId = user?.mobileDisplay || (user?.mobile ? `+91 ${user.mobile}` : user?.email) || "—";
  const avatarSeed = user?.mobile || user?.uid || user?.id || "user";

  const isSameDay = (iso: string, now = new Date()) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const credits = ledger.filter((e) => e.type === "PLAN_CREDIT" && e.amount > 0);
  const todayEarn = credits.filter((e) => isSameDay(e.createdAt)).reduce((a, e) => a + e.amount, 0);
  const totalEarn = credits.reduce((a, e) => a + e.amount, 0);

  const savePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinErr("");
    setPinMsg("");
    if (!/^\d{4}$/.test(pin)) {
      setPinErr("PIN must be exactly 4 digits");
      return;
    }
    if (pin !== pin2) {
      setPinErr("PINs do not match");
      return;
    }
    setPinSaving(true);
    try {
      const r = await userApi.setPin(pin);
      setPinConfigured(Boolean(r.configured));
      setPin("");
      setPin2("");
      setPinMsg("PIN saved");
      setTimeout(() => setPinMsg(""), 2000);
    } catch (err) {
      setPinErr(getErrorMessage(err, "Could not save PIN"));
    } finally {
      setPinSaving(false);
    }
  };

  const accountMenu: MenuItem[] = [
    { to: "/team", icon: "👥", label: "My team", sub: "Referrals & downline" },
    {
      to: "/profile/bank",
      icon: "🏦",
      label: "Bank & UPI details",
      sub: bankSet ? "Account linked for withdrawals" : "Required for withdraw",
      badge: bankSet ? "Linked" : "Add",
    },
    { to: "/wallet", icon: "💰", label: "My wallet", sub: "Balance & ledger" },
    { to: "/withdraw", icon: "💸", label: "Withdraw", sub: "Request payout" },
    { to: "/deposits/history", icon: "📋", label: "Deposits", sub: "Order history" },
  ];

  const moreMenu: MenuItem[] = [
    { to: "/rewards", icon: "🎁", label: "Newbie rewards", sub: "Bonuses & offers" },
    { to: "/deposits", icon: "🛒", label: "Buy plans", sub: "INR & crypto" },
    { to: "/support", icon: "💬", label: "Help & support", sub: "Live chat" },
  ];

  return (
    <div className="profile-page">
      <PageStatus loading={loading} error={loadError} onRetry={load}>
        <section className="profile-hero">
          <div className="profile-hero-top">
            <ProfilePersonaAvatar seed={avatarSeed} size={56} className="profile-avatar-slot" />
            <div className="profile-hero-info">
              <p className="profile-hero-name">{user?.name?.trim() || "SilverPay User"}</p>
              <p className="profile-hero-contact">{displayId}</p>
              <span className="profile-uid-badge">UID {user?.uid}</span>
            </div>
          </div>

          <div className="profile-balance-row">
            <div className="profile-balance-pill">
              <span>Today's earn</span>
              <strong>₹{todayEarn.toFixed(2)}</strong>
            </div>
            <div className="profile-balance-pill">
              <span>Total earn</span>
              <strong>₹{totalEarn.toFixed(2)}</strong>
            </div>
          </div>

          {user?.referralCode && (
            <button type="button" className="profile-referral-strip" onClick={() => void copyReferral()}>
              <span className="profile-referral-label">Referral code</span>
              <span className="profile-referral-code">{user.referralCode}</span>
              <span className="profile-referral-copy">{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
        </section>

        <MenuSection title="Account" items={accountMenu} />
        <MenuSection title="More" items={moreMenu} />

        <section className="profile-menu-section">
          <h2 className="profile-menu-title">Security</h2>
          <form onSubmit={savePin} className="profile-form-card">
            <h3 className="profile-form-title">{pinConfigured ? "Update PIN" : "Set PIN"}</h3>
            {pinMsg && <p className="text-xs text-emerald-700 mb-2">{pinMsg}</p>}
            {pinErr && <p className="text-xs text-red-600 mb-2">{pinErr}</p>}
            <div className="profile-field-row">
              <div className="profile-field">
                <label htmlFor="pin">4-digit PIN</label>
                <input
                  id="pin"
                  className="profile-input font-mono"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  required
                />
              </div>
              <div className="profile-field">
                <label htmlFor="pin2">Confirm PIN</label>
                <input
                  id="pin2"
                  className="profile-input font-mono"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={pinSaving} className="profile-btn-primary">
              {pinSaving ? "Saving…" : pinConfigured ? "Update PIN" : "Set PIN"}
            </button>
          </form>
        </section>

        <button type="button" onClick={logout} className="profile-logout">
          Log out
        </button>

        <p className="profile-version">SilverPay v1.0.0</p>
      </PageStatus>
    </div>
  );
}

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <section className="profile-menu-section">
      <h2 className="profile-menu-title">{title}</h2>
      <div className="profile-menu-card">
        {items.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            className={`profile-menu-item${i < items.length - 1 ? " profile-menu-item--border" : ""}`}
          >
            <span className="profile-menu-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="profile-menu-text">
              <span className="profile-menu-label">{item.label}</span>
              {item.sub && <span className="profile-menu-sub">{item.sub}</span>}
            </span>
            {item.badge && (
              <span className={`profile-menu-badge${item.badge === "Add" ? " is-warn" : ""}`}>{item.badge}</span>
            )}
            <span className="profile-menu-chevron" aria-hidden>
              ›
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
