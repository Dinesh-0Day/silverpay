import { useEffect, useState } from "react";
import { Banknote, Landmark, ShoppingBag } from "lucide-react";
import { adminApi, getErrorMessage, type Payout, type PaginationMeta } from "../api";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  Label,
  Tabs,
  EmptyState,
  LoadingBlock,
  RecordCard,
  PageError,
  Alert,
} from "../components/ui";
import PaginationBar from "../components/PaginationBar";
import { formatInr, formatUsdt } from "../lib/currency";

const PAGE_SIZE = 20;

function payoutQueryForTab(tab: string) {
  if (tab === "PLAN_PURCHASE") return { entryType: "PLAN_PURCHASE" as const };
  if (tab) return { status: tab };
  return {};
}

function paidAmountLabel(p: Payout) {
  if (p.entryType === "PLAN_PURCHASE" && p.amountPaid != null) {
    return p.payCurrency === "USDT" ? formatUsdt(p.amountPaid) : formatInr(p.amountPaid);
  }
  return formatInr(p.amount);
}

function PlanPurchasePayOutBlock({
  p,
  creditInr,
  onSuccess,
  onError,
}: {
  p: Payout;
  creditInr: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const balance = p.user?.wallet?.balance ?? 0;
  const held = p.user?.wallet?.held ?? 0;
  const maxAvail = Math.max(0, balance - held);
  const suggested = Math.min(creditInr, maxAvail);

  const [amount, setAmount] = useState(() => (suggested > 0 ? String(suggested) : ""));
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);

  if (p.status === "PAID") {
    return (
      <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
        <p className="text-sm font-semibold text-emerald-800">
          Paid {formatInr(p.paidOutAmount ?? p.amount)} — deducted from user wallet
        </p>
        {p.transactionRef && <p className="text-xs text-emerald-700 mt-1 font-mono">Ref: {p.transactionRef}</p>}
        <p className="text-xs text-slate-500 mt-2">User sees this as Withdrawal in wallet history.</p>
      </div>
    );
  }

  if (p.status !== "CREDITED") return null;

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      onError("Enter a valid payout amount");
      return;
    }
    setSaving(true);
    onError("");
    try {
      await adminApi.planPurchasePayOut(p.id, amt, ref.trim() || undefined);
      onSuccess();
    } catch (e) {
      onError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pay user (debit wallet)</p>
      <p className="text-xs text-slate-500">
        Enter amount you sent to their bank. Wallet will be debited and user will see a withdrawal in history.
      </p>
      <div>
        <Label>Amount (₹)</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Available in wallet: ₹{maxAvail.toFixed(2)} · Credited from plan: {formatInr(creditInr)}
        </p>
      </div>
      <div>
        <Label>UTR / bank reference (optional)</Label>
        <Input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Transaction ID"
          className="font-mono text-sm"
        />
      </div>
      <Button type="button" className="w-full" disabled={saving} onClick={() => void submit()}>
        {saving ? "Processing…" : "Paid"}
      </Button>
    </div>
  );
}

export default function Payouts() {
  const [list, setList] = useState<Payout[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("REQUESTED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const load = (p = page) => {
    setLoading(true);
    setError("");
    return adminApi
      .payouts({ ...payoutQueryForTab(filter), page: p, limit: PAGE_SIZE })
      .then((res) => {
        setList(res.items);
        setPagination(res.pagination);
        setPage(res.pagination.page);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  const changeFilter = (next: string) => {
    setFilter(next);
    setPage(1);
  };

  useEffect(() => {
    void load(page);
  }, [filter, page]);

  const markPaid = async (id: string, amount: number) => {
    const ref = prompt(`Transaction UTR / reference for ₹${amount}?`);
    if (!ref) return;
    setActionError("");
    try {
      await adminApi.markPayoutPaid(id, ref);
      void load(page);
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  };

  return (
    <div className="animate-fade-in">
      <PageError message={error} onRetry={() => load(page)} />
      {actionError && <Alert variant="error">{actionError}</Alert>}
      <PageHeader
        title="Payouts"
        description="Withdrawal requests and successful plan purchases (tagged) with user bank & wallet snapshot"
      />
      <Tabs
        active={filter}
        onChange={changeFilter}
        tabs={[
          { id: "REQUESTED", label: "Withdrawals" },
          { id: "PLAN_PURCHASE", label: "Plan purchases" },
          { id: "PAID", label: "Paid out" },
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
          <EmptyState title="No records" icon={<Landmark size={24} strokeWidth={1.5} />} />
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {list.map((p) => {
              const isPlan = p.entryType === "PLAN_PURCHASE";
              const bank = p.bankSnapshot ? JSON.parse(p.bankSnapshot) : p.user?.bankAccount;
              const creditInr = p.creditAmountInr ?? p.amount;

              return (
                <RecordCard
                  key={p.id}
                  actions={
                    !isPlan && p.status === "REQUESTED" ? (
                      <>
                        <Button className="w-full" onClick={() => markPaid(p.id, p.amount)}>
                          Mark as paid
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => adminApi.rejectPayout(p.id).then(() => load(page))}
                        >
                          Reject
                        </Button>
                      </>
                    ) : undefined
                  }
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {isPlan ? (
                      <Badge variant="info">
                        <ShoppingBag size={12} className="inline mr-1" />
                        Plan purchase
                      </Badge>
                    ) : (
                      <Badge variant="default">Withdrawal</Badge>
                    )}
                    {isPlan && p.autoApproved && <Badge variant="success">Auto verified</Badge>}
                    <Badge
                      variant={
                        p.status === "PAID" || p.status === "CREDITED"
                          ? "success"
                          : p.status === "REJECTED"
                            ? "danger"
                            : "warning"
                      }
                      dot
                    >
                      {p.status === "CREDITED" ? "Credited" : p.status}
                    </Badge>
                  </div>

                  {isPlan ? (
                    <>
                      <p className="text-lg font-bold text-slate-900">{p.planName ?? "Plan"}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Paid: <strong>{paidAmountLabel(p)}</strong>
                        {p.planCategory === "CRYPTO" && (
                          <span className="text-slate-400"> · Crypto</span>
                        )}
                      </p>
                      <p className="text-2xl font-bold text-emerald-700 mt-2 tabular-nums">
                        Wallet +{formatInr(creditInr)}
                      </p>
                    </>
                  ) : (
                    <p className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
                      {formatInr(p.amount)}
                    </p>
                  )}

                  <p className="text-sm text-slate-500 mt-2">
                    {p.user?.mobile ? `+91 ${p.user.mobile}` : p.user?.email} ·{" "}
                    <span className="font-mono text-xs">UID {p.user?.uid}</span>
                    {p.user?.name && <span className="text-slate-400"> · {p.user.name}</span>}
                  </p>

                  <p className="text-sm mt-3">
                    Wallet{isPlan ? " (after credit)" : ""}:{" "}
                    <strong className="text-slate-900">₹{p.user?.wallet?.balance?.toFixed(2) ?? "0.00"}</strong>
                    {(p.user?.wallet?.held ?? 0) > 0 && (
                      <span className="text-amber-600 font-medium"> · ₹{p.user?.wallet?.held} held</span>
                    )}
                  </p>

                  {bank ? (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
                        <Banknote size={16} className="text-brand-600" /> Bank details
                      </div>
                      <p className="font-semibold text-slate-900">{bank.accountHolder}</p>
                      <p className="text-slate-600 mt-0.5">
                        A/C {bank.accountNumber} · {bank.ifsc}
                      </p>
                      <p className="text-slate-500">{bank.bankName}</p>
                      {bank.upiId && <p className="font-mono text-brand-600 mt-2 text-sm">{bank.upiId}</p>}
                    </div>
                  ) : isPlan ? (
                    <p className="text-xs text-slate-400 mt-3">No bank account on file yet</p>
                  ) : null}

                  {p.adminNote && isPlan && p.status === "CREDITED" && (
                    <p className="text-xs text-slate-500 mt-2">{p.adminNote}</p>
                  )}

                  {isPlan && (
                    <PlanPurchasePayOutBlock
                      p={p}
                      creditInr={creditInr}
                      onSuccess={() => void load(page)}
                      onError={setActionError}
                    />
                  )}

                  {p.transactionRef && !isPlan && (
                    <p className="text-sm text-emerald-600 font-medium mt-3">Ref: {p.transactionRef}</p>
                  )}
                </RecordCard>
              );
            })}
          </div>
          {pagination && (
            <Card className="mt-4">
              <PaginationBar pagination={pagination} onPageChange={setPage} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
