import { useEffect, useState } from "react";
import { Building2, Bitcoin, Zap, Hand } from "lucide-react";
import { adminApi, type PaymentDetails, type SettlementMode } from "../api";
import { PageHeader, Card, Badge, Button, Input, Label, Select, EmptyState } from "../components/ui";

const CRYPTO_NETWORKS = [
  "",
  "TRC20 (USDT)",
  "ERC20 (USDT/ETH)",
  "BEP20 (BSC)",
  "Bitcoin",
  "Solana",
  "Polygon",
  "Other",
];

const MODES: { id: SettlementMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "MANUAL",
    label: "Manual",
    desc: "Bank / UPI — admin approves after UTR",
    icon: <Hand size={18} />,
  },
  {
    id: "PAYTM_AUTO",
    label: "Paytm merchant",
    desc: "UPI QR on merchant VPA + Paytm Order Status API auto-verify",
    icon: <Zap size={18} />,
  },
  {
    id: "CRYPTO_AUTO",
    label: "Crypto auto",
    desc: "On-chain verify — no payment gateway",
    icon: <Bitcoin size={18} />,
  },
];

const emptyForm = {
  settlementMode: "MANUAL" as SettlementMode,
  paymentChannel: "UPI" as "UPI" | "CRYPTO",
  accountHolder: "",
  upiId: "",
  accountNumber: "",
  ifsc: "",
  bankName: "",
  cryptoAddress: "",
  cryptoNetwork: "",
  cryptoExpectedUsdt: "",
  paytmMerchantId: "",
  paytmMerchantKey: "",
  paytmWebsite: "WEBSTAGING",
  isDefault: false,
};

function modeBadge(mode: SettlementMode) {
  if (mode === "PAYTM_AUTO") return <Badge variant="info">Paytm auto</Badge>;
  if (mode === "CRYPTO_AUTO") return <Badge variant="warning">Crypto auto</Badge>;
  return <Badge variant="default">Manual</Badge>;
}

function PaymentCard({ p }: { p: PaymentDetails }) {
  const mode = p.settlementMode || "MANUAL";

  return (
    <Card hover>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h3 className="font-bold text-slate-900">Payment account</h3>
        {modeBadge(mode)}
        {p.isDefault && <Badge variant="info">Default</Badge>}
      </div>

      {mode === "MANUAL" && (
        <div className="space-y-3 text-sm">
          {p.upiId && <p><span className="text-slate-400">UPI:</span> <span className="font-mono">{p.upiId}</span></p>}
          {p.accountNumber && (
            <p><span className="text-slate-400">Bank:</span> {p.accountNumber} · {p.ifsc} · {p.bankName}</p>
          )}
        </div>
      )}

      {mode === "PAYTM_AUTO" && (
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-slate-400">UPI (QR):</span>{" "}
            <span className="font-mono">{p.upiId || "— not set —"}</span>
          </p>
          <p>
            <span className="text-slate-400">Paytm MID:</span>{" "}
            <span className="font-mono">{p.paytmMerchantId || "—"}</span>
          </p>
        </div>
      )}

      {mode === "CRYPTO_AUTO" && (
        <div className="text-sm space-y-1">
          <p><span className="text-slate-400">Network:</span> {p.cryptoNetwork}</p>
          <p className="font-mono text-xs break-all">{p.cryptoAddress}</p>
          {p.cryptoExpectedUsdt != null && (
            <p><span className="text-slate-400">Expected:</span> {p.cryptoExpectedUsdt} USDT</p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function PaymentDetailsPage() {
  const [list, setList] = useState<PaymentDetails[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"all" | "manual" | "automatic">("all");

  const load = () => adminApi.paymentDetails().then(setList);
  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.settlementMode === "PAYTM_AUTO") {
      if (!form.upiId.trim()) {
        setError("UPI ID is required — QR is generated from this merchant VPA");
        return;
      }
      if (!form.paytmMerchantId.trim()) {
        setError("Paytm Merchant ID (MID) is required for payment status checks");
        return;
      }
    }
    try {
      await adminApi.createPaymentDetails({
        settlementMode: form.settlementMode,
        paymentChannel: form.settlementMode === "CRYPTO_AUTO" ? "CRYPTO" : "UPI",
        accountHolder: form.accountHolder || undefined,
        upiId: form.upiId || undefined,
        accountNumber: form.accountNumber || undefined,
        ifsc: form.ifsc || undefined,
        bankName: form.bankName || undefined,
        cryptoAddress: form.cryptoAddress || undefined,
        cryptoNetwork: form.cryptoNetwork || undefined,
        cryptoExpectedUsdt: form.cryptoExpectedUsdt ? Number(form.cryptoExpectedUsdt) : undefined,
        paytmMerchantId: form.paytmMerchantId || undefined,
        paytmMerchantKey: form.paytmMerchantKey || undefined,
        paytmWebsite: form.paytmWebsite || undefined,
        isDefault: form.isDefault,
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const manual = list.filter((p) => (p.settlementMode || "MANUAL") === "MANUAL");
  const automatic = list.filter((p) => p.settlementMode === "PAYTM_AUTO" || p.settlementMode === "CRYPTO_AUTO");
  const shown =
    tab === "manual" ? manual : tab === "automatic" ? automatic : list;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payment details"
        description="Manual accounts (admin approves) · Automatic (Paytm merchant or crypto on-chain)"
      />

      <div className="grid xl:grid-cols-5 gap-8">
        <Card className="xl:col-span-2 h-fit xl:sticky xl:top-24">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Add account</h2>

          <Label>Settlement type</Label>
          <div className="grid gap-2 mb-6">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    settlementMode: m.id,
                    paymentChannel: m.id === "CRYPTO_AUTO" ? "CRYPTO" : "UPI",
                  })
                }
                className={`text-left p-3 rounded-xl border transition-all ${
                  form.settlementMode === m.id
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/30"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-900">
                  {m.icon}
                  {m.label}
                </div>
                <p className="text-xs text-slate-500 mt-1 ml-7">{m.desc}</p>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {form.settlementMode === "MANUAL" && (
              <>
                <div>
                  <Label>Account holder</Label>
                  <Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} />
                </div>
                <div>
                  <Label>UPI ID</Label>
                  <Input value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} className="font-mono" />
                </div>
                <div>
                  <Label>Account number</Label>
                  <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="font-mono" />
                </div>
                <div>
                  <Label>IFSC</Label>
                  <Input value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} />
                </div>
                <div>
                  <Label>Bank name</Label>
                  <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                </div>
              </>
            )}

            {form.settlementMode === "PAYTM_AUTO" && (
              <>
                <div>
                  <Label>UPI ID (merchant VPA) *</Label>
                  <Input
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    className="font-mono"
                    placeholder="merchant@paytm"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    QR code &amp; UPI collect link use this VPA. Must match your Paytm business UPI.
                  </p>
                </div>
                <div>
                  <Label>Account holder name</Label>
                  <Input
                    value={form.accountHolder}
                    onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
                    placeholder="Shown on UPI QR"
                  />
                </div>
                <div>
                  <Label>Paytm Merchant ID (MID) *</Label>
                  <Input value={form.paytmMerchantId} onChange={(e) => setForm({ ...form, paytmMerchantId: e.target.value })} required />
                </div>
                <div>
                  <Label>Merchant key (optional — for webhook/PG only)</Label>
                  <Input
                    type="password"
                    value={form.paytmMerchantKey}
                    onChange={(e) => setForm({ ...form, paytmMerchantKey: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Website name</Label>
                  <Input value={form.paytmWebsite} onChange={(e) => setForm({ ...form, paytmWebsite: e.target.value })} placeholder="WEBSTAGING or DEFAULT" />
                </div>
                <p className="text-xs text-slate-500">
                  User scans QR (your UPI ID) and pays. App polls Paytm <strong>Order Status API</strong> with MID + order ID every 10s to auto-approve.
                </p>
              </>
            )}

            {form.settlementMode === "CRYPTO_AUTO" && (
              <>
                <div>
                  <Label>Network</Label>
                  <Select value={form.cryptoNetwork} onChange={(e) => setForm({ ...form, cryptoNetwork: e.target.value })} required>
                    {CRYPTO_NETWORKS.map((n) => (
                      <option key={n || "e"} value={n}>{n || "Select network"}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Wallet address</Label>
                  <Input
                    value={form.cryptoAddress}
                    onChange={(e) => setForm({ ...form, cryptoAddress: e.target.value })}
                    className="font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <Label>Expected USDT amount (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.cryptoExpectedUsdt}
                    onChange={(e) => setForm({ ...form, cryptoExpectedUsdt: e.target.value })}
                    placeholder="Defaults to plan USDT price"
                  />
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                  TRC20 USDT auto-verify uses public Tron APIs — no payment gateway. User submits tx hash; wallet credits automatically.
                </p>
              </>
            )}

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-slate-300 text-brand-600"
              />
              Default account
            </label>

            <Button type="submit" className="w-full">Save account</Button>
          </form>
        </Card>

        <div className="xl:col-span-3">
          <div className="flex gap-2 mb-4">
            {(["all", "manual", "automatic"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  tab === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                {t === "all" ? `All (${list.length})` : t === "manual" ? `Manual (${manual.length})` : `Automatic (${automatic.length})`}
              </button>
            ))}
          </div>

          {!shown.length ? (
            <Card>
              <EmptyState title="No accounts" description="Add manual or automatic payment methods." icon={<Building2 size={24} />} />
            </Card>
          ) : (
            <div className="space-y-4">
              {shown.map((p) => (
                <PaymentCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
