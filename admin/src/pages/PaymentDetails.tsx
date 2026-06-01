import { useEffect, useState } from "react";
import { Building2, Bitcoin, Zap, Hand, Pencil, Trash2 } from "lucide-react";
import { adminApi, getErrorMessage, type PaymentDetails, type SettlementMode } from "../api";
import { PageHeader, Card, Badge, Button, Input, Label, Select, EmptyState, Alert } from "../components/ui";

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

type PaymentForm = {
  settlementMode: SettlementMode;
  paymentChannel: "UPI" | "CRYPTO";
  accountHolder: string;
  upiId: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  cryptoAddress: string;
  cryptoNetwork: string;
  cryptoExpectedUsdt: string;
  paytmMerchantId: string;
  paytmMerchantKey: string;
  paytmWebsite: string;
  isDefault: boolean;
};

const emptyForm: PaymentForm = {
  settlementMode: "MANUAL",
  paymentChannel: "UPI",
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

function paymentToForm(p: PaymentDetails): PaymentForm {
  const mode = (p.settlementMode || "MANUAL") as SettlementMode;
  return {
    settlementMode: mode,
    paymentChannel: p.paymentChannel === "CRYPTO" ? "CRYPTO" : "UPI",
    accountHolder: p.accountHolder ?? "",
    upiId: p.upiId ?? "",
    accountNumber: p.accountNumber ?? "",
    ifsc: p.ifsc ?? "",
    bankName: p.bankName ?? "",
    cryptoAddress: p.cryptoAddress ?? "",
    cryptoNetwork: p.cryptoNetwork ?? "",
    cryptoExpectedUsdt: p.cryptoExpectedUsdt != null ? String(p.cryptoExpectedUsdt) : "",
    paytmMerchantId: p.paytmMerchantId ?? "",
    paytmMerchantKey: "",
    paytmWebsite: p.paytmWebsite ?? "WEBSTAGING",
    isDefault: p.isDefault,
  };
}

function validateForm(form: PaymentForm): string {
  if (form.settlementMode === "PAYTM_AUTO") {
    if (!form.upiId.trim()) return "UPI ID is required — QR is generated from this merchant VPA";
    if (!form.paytmMerchantId.trim()) return "Paytm Merchant ID (MID) is required for payment status checks";
  }
  if (form.settlementMode === "CRYPTO_AUTO") {
    if (!form.cryptoNetwork.trim()) return "Network is required";
    if (!form.cryptoAddress.trim()) return "Wallet address is required";
  }
  return "";
}

function bodyFromForm(form: PaymentForm) {
  const body: Partial<PaymentDetails> = {
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
    paytmWebsite: form.paytmWebsite || undefined,
    isDefault: form.isDefault,
  };
  if (form.paytmMerchantKey.trim()) {
    body.paytmMerchantKey = form.paytmMerchantKey;
  }
  return body;
}

function modeBadge(mode: SettlementMode) {
  if (mode === "PAYTM_AUTO") return <Badge variant="info">Paytm auto</Badge>;
  if (mode === "CRYPTO_AUTO") return <Badge variant="warning">Crypto auto</Badge>;
  return <Badge variant="default">Manual</Badge>;
}

function SettlementModePicker({
  value,
  onChange,
  compact,
}: {
  value: SettlementMode;
  onChange: (mode: SettlementMode) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${compact ? "mb-4" : "mb-6"}`}>
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={`text-left p-3 rounded-xl border transition-all ${
            value === m.id
              ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/30"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-900">
            {m.icon}
            {m.label}
          </div>
          {!compact && <p className="text-xs text-slate-500 mt-1 ml-7">{m.desc}</p>}
        </button>
      ))}
    </div>
  );
}

function PaymentAccountFields({
  form,
  setForm,
}: {
  form: PaymentForm;
  setForm: (f: PaymentForm) => void;
}) {
  return (
    <>
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
            <Label>Merchant key (leave blank to keep existing)</Label>
            <Input
              type="password"
              value={form.paytmMerchantKey}
              onChange={(e) => setForm({ ...form, paytmMerchantKey: e.target.value })}
              placeholder="Only if changing"
            />
          </div>
          <div>
            <Label>Website name</Label>
            <Input value={form.paytmWebsite} onChange={(e) => setForm({ ...form, paytmWebsite: e.target.value })} placeholder="WEBSTAGING or DEFAULT" />
          </div>
        </>
      )}

      {form.settlementMode === "CRYPTO_AUTO" && (
        <>
          <div>
            <Label>Network</Label>
            <Select value={form.cryptoNetwork} onChange={(e) => setForm({ ...form, cryptoNetwork: e.target.value })} required>
              {CRYPTO_NETWORKS.map((n) => (
                <option key={n || "e"} value={n}>
                  {n || "Select network"}
                </option>
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
    </>
  );
}

function PaymentCard({
  p,
  editing,
  editForm,
  setEditForm,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  saving,
}: {
  p: PaymentDetails;
  editing: boolean;
  editForm: PaymentForm;
  setEditForm: (f: PaymentForm) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const mode = (p.settlementMode || "MANUAL") as SettlementMode;

  return (
    <Card hover>
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-slate-900">Payment account</h3>
          {modeBadge(mode)}
          {p.isDefault && <Badge variant="info">Default</Badge>}
        </div>
        {!editing && (
          <div className="flex gap-1.5">
            <Button type="button" variant="secondary" size="sm" onClick={onEdit} aria-label="Edit account">
              <Pencil size={14} />
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={onDelete} aria-label="Delete account">
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <p className="text-sm font-bold text-slate-800">Edit account</p>
          <Label>Settlement type</Label>
          <SettlementModePicker
            compact
            value={editForm.settlementMode}
            onChange={(settlementMode) =>
              setEditForm({
                ...editForm,
                settlementMode,
                paymentChannel: settlementMode === "CRYPTO_AUTO" ? "CRYPTO" : "UPI",
              })
            }
          />
          <PaymentAccountFields form={editForm} setForm={setEditForm} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={onSaveEdit}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {mode === "MANUAL" && (
            <div className="space-y-3 text-sm">
              {p.upiId && (
                <p>
                  <span className="text-slate-400">UPI:</span> <span className="font-mono">{p.upiId}</span>
                </p>
              )}
              {p.accountNumber && (
                <p>
                  <span className="text-slate-400">Bank:</span> {p.accountNumber} · {p.ifsc} · {p.bankName}
                </p>
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
              <p>
                <span className="text-slate-400">Network:</span> {p.cryptoNetwork}
              </p>
              <p className="font-mono text-xs break-all">{p.cryptoAddress}</p>
              {p.cryptoExpectedUsdt != null && (
                <p>
                  <span className="text-slate-400">Expected:</span> {p.cryptoExpectedUsdt} USDT
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function PaymentDetailsPage() {
  const [list, setList] = useState<PaymentDetails[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"all" | "manual" | "automatic">("all");

  const load = () => adminApi.paymentDetails().then(setList);
  useEffect(() => {
    void load();
  }, []);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validation = validateForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    try {
      await adminApi.createPaymentDetails(bodyFromForm(form));
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editingId) return;
    setError("");
    const validation = validateForm(editForm);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    try {
      await adminApi.updatePaymentDetails(editingId, bodyFromForm(editForm));
      setEditingId(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (p: PaymentDetails) => {
    const label = p.upiId || p.cryptoAddress?.slice(0, 12) || p.paytmMerchantId || "this account";
    if (!confirm(`Delete payment account (${label})? This cannot be undone.`)) return;
    setError("");
    try {
      await adminApi.deletePaymentDetails(p.id);
      if (editingId === p.id) setEditingId(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const manual = list.filter((x) => (x.settlementMode || "MANUAL") === "MANUAL");
  const automatic = list.filter((x) => x.settlementMode === "PAYTM_AUTO" || x.settlementMode === "CRYPTO_AUTO");
  const shown = tab === "manual" ? manual : tab === "automatic" ? automatic : list;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payment details"
        description="Manual accounts (admin approves) · Automatic (Paytm merchant or crypto on-chain)"
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid xl:grid-cols-5 gap-8">
        <Card className="xl:col-span-2 h-fit xl:sticky xl:top-24">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Add account</h2>

          <Label>Settlement type</Label>
          <SettlementModePicker
            value={form.settlementMode}
            onChange={(settlementMode) =>
              setForm({
                ...form,
                settlementMode,
                paymentChannel: settlementMode === "CRYPTO_AUTO" ? "CRYPTO" : "UPI",
              })
            }
          />

          <form onSubmit={submitCreate} className="space-y-4">
            <PaymentAccountFields form={form} setForm={setForm} />

            {form.settlementMode === "PAYTM_AUTO" && (
              <p className="text-xs text-slate-500">
                User scans QR (your UPI ID) and pays. App polls Paytm Order Status API with MID + order ID every 10s to auto-approve.
              </p>
            )}
            {form.settlementMode === "CRYPTO_AUTO" && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                TRC20 USDT auto-verify uses public Tron APIs — no payment gateway.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving…" : "Save account"}
            </Button>
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
                <PaymentCard
                  key={p.id}
                  p={p}
                  editing={editingId === p.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onEdit={() => {
                    setEditingId(p.id);
                    setEditForm(paymentToForm(p));
                    setError("");
                  }}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={submitEdit}
                  onDelete={() => void deleteAccount(p)}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
