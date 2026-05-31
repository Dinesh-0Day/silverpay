import { useEffect, useState } from "react";
import { Banknote, Landmark } from "lucide-react";
import { adminApi, getErrorMessage, type Payout } from "../api";
import { PageHeader, Card, Badge, Button, Tabs, EmptyState, LoadingBlock, RecordCard, PageError, Alert } from "../components/ui";

export default function Payouts() {
  const [list, setList] = useState<Payout[]>([]);
  const [filter, setFilter] = useState("REQUESTED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    return adminApi
      .payouts(filter || undefined)
      .then(setList)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, [filter]);

  const markPaid = async (id: string, amount: number) => {
    const ref = prompt(`Transaction UTR / reference for ₹${amount}?`);
    if (!ref) return;
    setActionError("");
    try {
      await adminApi.markPayoutPaid(id, ref);
      load();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  };

  return (
    <div className="animate-fade-in">
      <PageError message={error} onRetry={load} />
      {actionError && <Alert variant="error">{actionError}</Alert>}
      <PageHeader
        title="Payouts"
        description="Pay users manually, then mark as paid to debit their wallet"
      />
      <Tabs
        active={filter}
        onChange={setFilter}
        tabs={[
          { id: "REQUESTED", label: "Requested" },
          { id: "PAID", label: "Paid" },
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
          <EmptyState title="No payouts" icon={<Landmark size={24} strokeWidth={1.5} />} />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((p) => {
            const bank = p.bankSnapshot ? JSON.parse(p.bankSnapshot) : p.user?.bankAccount;
            return (
              <RecordCard
                key={p.id}
                actions={
                  p.status === "REQUESTED" ? (
                    <>
                      <Button className="w-full" onClick={() => markPaid(p.id, p.amount)}>
                        Mark as paid
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => adminApi.rejectPayout(p.id).then(load)}>
                        Reject
                      </Button>
                    </>
                  ) : undefined
                }
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-3xl font-bold text-slate-900 tracking-tight">₹{p.amount}</p>
                  <Badge
                    variant={p.status === "PAID" ? "success" : p.status === "REJECTED" ? "danger" : "warning"}
                    dot
                  >
                    {p.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {p.user?.mobile ? `+91 ${p.user.mobile}` : p.user?.email} ·{" "}
                  <span className="font-mono text-xs">UID {p.user?.uid}</span>
                </p>
                <p className="text-sm mt-3">
                  Wallet: <strong className="text-slate-900">₹{p.user?.wallet?.balance?.toFixed(2)}</strong>
                  {(p.user?.wallet?.held ?? 0) > 0 && (
                    <span className="text-amber-600 font-medium"> · ₹{p.user?.wallet?.held} held</span>
                  )}
                </p>
                {bank && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
                      <Banknote size={16} className="text-brand-600" /> Payout account
                    </div>
                    <p className="font-semibold text-slate-900">{bank.accountHolder}</p>
                    <p className="text-slate-600 mt-0.5">A/C {bank.accountNumber} · {bank.ifsc}</p>
                    <p className="text-slate-500">{bank.bankName}</p>
                    {bank.upiId && <p className="font-mono text-brand-600 mt-2 text-sm">{bank.upiId}</p>}
                  </div>
                )}
                {p.transactionRef && (
                  <p className="text-sm text-emerald-600 font-medium mt-3">Ref: {p.transactionRef}</p>
                )}
              </RecordCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
