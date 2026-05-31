import { useEffect, useState } from "react";
import { Check, X, Receipt } from "lucide-react";
import { adminApi, type Deposit } from "../api";
import { PageHeader, Card, Badge, Button, Tabs, EmptyState, LoadingBlock, RecordCard, PageError, Alert } from "../components/ui";
import { getErrorMessage } from "../api";
import { formatUsdt, formatInr, formatWalletInr, isCryptoDeposit } from "../lib/currency";

export default function Deposits() {
  const [list, setList] = useState<Deposit[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    return adminApi
      .deposits(filter || undefined)
      .then(setList)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, [filter]);

  const approve = async (id: string) => {
    if (!confirm("Approve deposit and credit user wallet (INR)?")) return;
    setActionError("");
    try {
      await adminApi.approveDeposit(id);
      load();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  };

  const reject = async (id: string) => {
    setActionError("");
    try {
      await adminApi.rejectDeposit(id, prompt("Rejection note (optional)") ?? undefined);
      load();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  };

  const statusVariant = (s: string) =>
    s === "APPROVED" ? "success" : s === "REJECTED" ? "danger" : "warning";

  const pendingCount = filter === "PENDING" ? list.length : undefined;

  return (
    <div className="animate-fade-in">
      <PageError message={error} onRetry={load} />
      {actionError && <Alert variant="error">{actionError}</Alert>}
      <PageHeader
        title="Deposits"
        description="INR/UPI deposits show ₹ — Crypto deposits show USDT only. User wallet always credits in ₹ (with bonus)."
      />

      <div className="flex gap-2 mb-4 text-xs text-slate-500">
        <span className="px-2 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-100">INR · UPI</span>
        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">Crypto · USDT</span>
      </div>

      <Tabs
        active={filter}
        onChange={setFilter}
        tabs={[
          { id: "PENDING", label: "Pending", count: pendingCount },
          { id: "APPROVED", label: "Approved" },
          { id: "REJECTED", label: "Rejected" },
          { id: "", label: "All" },
        ]}
      />
      {loading ? (
        <Card>
          <LoadingBlock />
        </Card>
      ) : !list.length ? (
        <Card>
          <EmptyState
            title="No deposits"
            description="Nothing in this category yet."
            icon={<Receipt size={24} strokeWidth={1.5} />}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((p) => {
            const crypto = isCryptoDeposit(p);
            return (
              <RecordCard
                key={p.id}
                actions={
                  p.status === "PENDING" ? (
                    <>
                      <Button variant="success" size="sm" className="w-full" onClick={() => approve(p.id)}>
                        <Check size={16} /> Approve
                      </Button>
                      <Button variant="secondary" size="sm" className="w-full" onClick={() => reject(p.id)}>
                        <X size={16} /> Reject
                      </Button>
                    </>
                  ) : undefined
                }
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-lg">{p.plan?.name}</h3>
                  {crypto ? (
                    <Badge variant="default">Crypto · USDT</Badge>
                  ) : (
                    <Badge variant="info">INR · UPI</Badge>
                  )}
                  <Badge variant={statusVariant(p.status)} dot>
                    {p.status}
                  </Badge>
                  {p.autoApproved && <Badge variant="info">Auto</Badge>}
                  {p.settlementMode && p.settlementMode !== "MANUAL" && (
                    <Badge variant="default">{p.settlementMode}</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono tracking-wide">REF · {p.orderNo}</p>

                <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <p>
                    <span className="text-slate-400">User</span>
                    <br />
                    <span className="font-medium text-slate-800">
                      {p.user?.mobile ? `+91 ${p.user.mobile}` : p.user?.email}
                    </span>
                    <span className="text-slate-400 text-xs ml-1">UID {p.user?.uid}</span>
                  </p>

                  {crypto ? (
                    <>
                      <p>
                        <span className="text-slate-400">Paid (on-chain)</span>
                        <br />
                        <span className="font-bold text-slate-900 text-lg">{formatUsdt(p.amountPaid ?? p.amount)}</span>
                      </p>
                      {p.usdtToInrRate != null && (
                        <p className="sm:col-span-2 text-xs text-slate-500">
                          Conversion: 1 USDT = {formatInr(p.usdtToInrRate)} → user wallet in INR
                        </p>
                      )}
                    </>
                  ) : (
                    <p>
                      <span className="text-slate-400">Paid (UPI/Bank)</span>
                      <br />
                      <span className="font-bold text-slate-900 text-lg">{formatInr(p.amountPaid ?? p.amount)}</span>
                    </p>
                  )}

                  {p.utr && (
                    <p className="sm:col-span-2">
                      <span className="text-slate-400">UTR</span>
                      <br />
                      <span className="font-mono text-sm bg-slate-100 px-2.5 py-1 rounded-lg inline-block mt-0.5">
                        {p.utr}
                      </span>
                    </p>
                  )}
                  {p.cryptoTxHash && (
                    <p className="sm:col-span-2">
                      <span className="text-slate-400">Tx hash</span>
                      <br />
                      <span className="font-mono text-xs break-all bg-slate-100 px-2.5 py-1 rounded-lg inline-block mt-0.5">
                        {p.cryptoTxHash}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 bg-emerald-50/50 -mx-4 px-4 py-3 rounded-b-xl">
                  <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wide mb-1">User wallet (INR)</p>
                  <p className="text-sm text-emerald-900">
                    Credit: <strong>{formatWalletInr(p.walletCreditInr ?? p.creditAmount)}</strong>
                    <span className="text-emerald-700">
                      {" "}
                      (includes {formatWalletInr(p.walletBonusInr ?? p.bonusAmount)} bonus)
                    </span>
                  </p>
                </div>
              </RecordCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
