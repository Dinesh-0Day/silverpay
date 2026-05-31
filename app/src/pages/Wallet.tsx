import { Link } from "react-router-dom";
import { userApi, type LedgerEntry, type Payout, type User } from "../api";
import PageStatus from "../components/PageStatus";
import { usePageLoad } from "../hooks/usePageLoad";

type WalletData = {
  user: User & { available: number; bankAccount?: { accountNumber?: string } | null };
  ledger: LedgerEntry[];
  payouts: Payout[];
};

function formatLedgerType(type: string) {
  switch (type) {
    case "PLAN_CREDIT":
      return { label: "Wallet credit", icon: "↓", tone: "credit" as const };
    case "PAYOUT_DEBIT":
      return { label: "Withdrawal", icon: "↑", tone: "debit" as const };
    case "ADMIN_ADJUSTMENT":
      return { label: "Balance update", icon: "✦", tone: "neutral" as const };
    case "NEWBIE_REWARD":
      return { label: "Newbie reward", icon: "🎁", tone: "credit" as const };
    case "REFERRAL_COMMISSION":
      return { label: "Team commission", icon: "👥", tone: "credit" as const };
    default:
      return { label: type.replace(/_/g, " "), icon: "•", tone: "neutral" as const };
  }
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}

function payoutStatusLabel(status: string) {
  switch (status) {
    case "REQUESTED":
      return { text: "Pending", className: "is-pending" };
    case "PAID":
      return { text: "Paid", className: "is-paid" };
    case "REJECTED":
      return { text: "Rejected", className: "is-rejected" };
    default:
      return { text: status, className: "" };
  }
}

export default function Wallet() {
  const { data, loading, error, reload } = usePageLoad(
    () =>
      Promise.all([userApi.me(), userApi.ledger(), userApi.payouts()]).then(([user, ledger, payouts]) => ({
        user,
        ledger,
        payouts,
      })),
    []
  );

  const user = data?.user;
  const ledger = data?.ledger ?? [];
  const payouts = data?.payouts ?? [];
  const held = Number(user?.held ?? 0);
  const balance = Number(user?.balance ?? 0);
  const available = Number(user?.available ?? balance);
  const pendingPayouts = payouts.filter((p) => p.status === "REQUESTED");
  const bankLinked = Boolean(user?.bankAccount?.accountNumber);

  return (
    <div className="wallet-page">
      <header className="wallet-head">
        <h1>My Wallet</h1>
        <p>Balance, withdrawals & transaction history</p>
      </header>

      <PageStatus loading={loading} error={error} onRetry={reload}>
        <section className="wallet-hero">
          <p className="wallet-hero-label">Available to withdraw</p>
          <p className="wallet-hero-amount">₹{available.toFixed(2)}</p>
          <div className="wallet-hero-stats">
            <div>
              <span>Total balance</span>
              <strong>₹{balance.toFixed(2)}</strong>
            </div>
            {held > 0 && (
              <div>
                <span>On hold</span>
                <strong>₹{held.toFixed(2)}</strong>
              </div>
            )}
          </div>
        </section>

        <div className="wallet-actions">
          <Link to="/withdraw" className="wallet-action wallet-action--primary">
            <span className="wallet-action-icon">💸</span>
            <span>Withdraw</span>
          </Link>
          <Link to="/deposits" className="wallet-action">
            <span className="wallet-action-icon">📋</span>
            <span>Deposits</span>
          </Link>
          <Link to="/profile/bank" className="wallet-action">
            <span className="wallet-action-icon">🏦</span>
            <span>{bankLinked ? "Bank" : "Add bank"}</span>
          </Link>
        </div>

        {!bankLinked && (
          <Link to="/profile/bank" className="wallet-alert">
            <span>Link bank account to withdraw funds</span>
            <span className="wallet-alert-link">Add now ›</span>
          </Link>
        )}

        {pendingPayouts.length > 0 && (
          <section className="wallet-section">
            <h2 className="wallet-section-title">Pending withdrawals</h2>
            <div className="wallet-card-list">
              {pendingPayouts.map((p) => {
                const st = payoutStatusLabel(p.status);
                return (
                  <div key={p.id} className="wallet-payout-row">
                    <div>
                      <p className="wallet-payout-amount">₹{p.amount.toFixed(2)}</p>
                      <p className="wallet-payout-time">{formatWhen(p.createdAt)}</p>
                    </div>
                    <span className={`wallet-payout-badge ${st.className}`}>{st.text}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="wallet-section">
          <div className="wallet-section-head">
            <h2 className="wallet-section-title">Transaction history</h2>
            <span className="wallet-section-count">{ledger.length}</span>
          </div>

          {ledger.length === 0 ? (
            <div className="wallet-empty">
              <span className="wallet-empty-icon" aria-hidden>
                📭
              </span>
              <p>No transactions yet</p>
              <Link to="/deposits" className="wallet-empty-btn">
                Buy a plan
              </Link>
            </div>
          ) : (
            <div className="wallet-card-list">
              {ledger.map((e) => {
                const meta = formatLedgerType(e.type);
                const positive = e.amount >= 0;
                return (
                  <article key={e.id} className="wallet-txn-row">
                    <span className={`wallet-txn-icon wallet-txn-icon--${meta.tone}`} aria-hidden>
                      {meta.icon}
                    </span>
                    <div className="wallet-txn-body">
                      <p className="wallet-txn-title">{meta.label}</p>
                      <p className="wallet-txn-time">{formatWhen(e.createdAt)}</p>
                      {e.note && <p className="wallet-txn-note">{e.note}</p>}
                    </div>
                    <div className="wallet-txn-right">
                      <p className={`wallet-txn-amount${positive ? " is-credit" : " is-debit"}`}>
                        {positive ? "+" : "−"}₹{Math.abs(e.amount).toFixed(2)}
                      </p>
                      <p className="wallet-txn-balance">Bal ₹{e.balanceAfter.toFixed(2)}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </PageStatus>
    </div>
  );
}
