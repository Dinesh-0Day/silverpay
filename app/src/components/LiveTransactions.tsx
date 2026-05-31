import { useEffect, useState } from "react";
import { createLiveTransactionBatch, type LiveTransaction } from "../lib/liveTransactions";

const ROW_COUNT = 10;
const REFRESH_MS = 4500;

function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function LiveTransactions() {
  const [rows, setRows] = useState<LiveTransaction[]>(() => createLiveTransactionBatch(ROW_COUNT));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRows(createLiveTransactionBatch(ROW_COUNT));
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="home-live-txn" aria-label="Live withdrawals and deposits">
      <div className="home-live-txn-head">
        <span className="home-live-txn-pulse" aria-hidden />
        <h3>Live withdrawals & deposits</h3>
      </div>
      <ul className="home-live-txn-list">
        {rows.map((row) => (
          <li key={row.id} className={`home-live-txn-row home-live-txn-row--${row.kind}`}>
            <span className="home-live-txn-icon" aria-hidden>
              {row.kind === "deposit" ? "↓" : "↑"}
            </span>
            <div className="home-live-txn-body">
              <p className="home-live-txn-name">{row.name}</p>
              <p className="home-live-txn-meta">
                {row.kind === "deposit" ? "Deposited" : "Withdrew"} {formatInr(row.amount)}
              </p>
            </div>
            <span className="home-live-txn-ago">{row.ago}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
