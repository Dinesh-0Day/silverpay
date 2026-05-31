import { Link } from "react-router-dom";
import { userApi, type Deposit } from "../api";
import { formatPlanAmount, formatWalletInr } from "../lib/currency";
import PageStatus from "../components/PageStatus";
import { usePageLoad } from "../hooks/usePageLoad";

function depositStatusMeta(status: string) {
  switch (status) {
    case "APPROVED":
      return { text: "Success", className: "is-approved" };
    case "PENDING":
      return { text: "Pending", className: "is-pending" };
    case "REJECTED":
      return { text: "Rejected", className: "is-rejected" };
    case "CANCELLED":
      return { text: "Cancelled", className: "is-cancelled" };
    default:
      return { text: status, className: "" };
  }
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function depositAmountLabel(d: Deposit) {
  const crypto = d.planCategory === "CRYPTO";
  if (crypto) {
    const credit = d.walletCreditInr ?? d.creditAmount ?? 0;
    return { primary: formatWalletInr(credit), sub: `Paid ${formatPlanAmount(d.amount, "USDT")}` };
  }
  return { primary: formatWalletInr(d.amount), sub: d.plan?.name ?? "INR plan" };
}

export default function DepositHistory() {
  const { data: deposits, loading, error, reload } = usePageLoad(() => userApi.deposits(), []);

  return (
    <div className="deposit-history-page">
      <header className="deposit-history-head">
        <Link to="/deposits" className="deposit-history-back">
          ← Buy plans
        </Link>
        <h1>Deposit history</h1>
        <p>All your INR and crypto deposit orders</p>
      </header>

      <PageStatus loading={loading} error={error} onRetry={reload}>
        {!deposits?.length ? (
          <div className="deposit-history-empty">
            <span aria-hidden>📭</span>
            <p>No deposits yet</p>
            <Link to="/deposits" className="deposit-history-empty-btn">
              Browse plans
            </Link>
          </div>
        ) : (
          <div className="deposit-history-list">
            {deposits.map((d) => {
              const st = depositStatusMeta(d.status);
              const amt = depositAmountLabel(d);
              const isCrypto = d.planCategory === "CRYPTO";
              return (
                <article key={d.id} className="deposit-history-card">
                  <div className="deposit-history-card-top">
                    <div className="deposit-history-card-id">
                      <span className={`deposit-history-type ${isCrypto ? "is-crypto" : "is-inr"}`}>
                        {isCrypto ? "Crypto" : "INR"}
                      </span>
                      <span className="deposit-history-ref">{d.orderNo}</span>
                    </div>
                    <span className={`deposit-history-badge ${st.className}`}>{st.text}</span>
                  </div>

                  <div className="deposit-history-card-body">
                    <div>
                      <p className="deposit-history-amount">{amt.primary}</p>
                      <p className="deposit-history-sub">{amt.sub}</p>
                    </div>
                    <p className="deposit-history-time">{formatWhen(d.createdAt)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageStatus>
    </div>
  );
}
