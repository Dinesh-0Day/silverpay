import { useEffect, useState, useMemo } from "react";
import { Pencil, Plus, Trash2, Layers } from "lucide-react";
import { adminApi, getErrorMessage, type Plan } from "../api";
import { PageHeader, Card, Badge, Button, Input, Label, Select, EmptyState, Alert } from "../components/ui";
import { formatPlanAmount, formatBonusFixed } from "../lib/currency";

type PlanForm = {
  planCategory: "INR" | "CRYPTO";
  type: "BASIC" | "VIP";
  price: string;
  bonusPercent: string;
  bonusFixed: string;
  dailyLimit: string;
  isActive: boolean;
};

const emptyForm: PlanForm = {
  planCategory: "INR",
  type: "BASIC",
  price: "",
  bonusPercent: "",
  bonusFixed: "",
  dailyLimit: "",
  isActive: true,
};

function planToForm(p: Plan): PlanForm {
  const cat = p.planCategory === "CRYPTO" ? "CRYPTO" : "INR";
  const tier = p.type === "VIP" ? "VIP" : "BASIC";
  return {
    planCategory: cat,
    type: tier,
    price: String(p.price),
    bonusPercent: String(p.bonusPercent),
    bonusFixed: String(p.bonusFixed),
    dailyLimit: String(p.dailyLimit),
    isActive: p.isActive,
  };
}

function displayCategory(c?: string) {
  return c === "CRYPTO" ? "Crypto" : "INR";
}

function displayType(t?: string) {
  return t === "VIP" ? "VIP" : "Basic";
}

function PlanFormFields({
  form,
  setForm,
  submitLabel,
  onCancel,
  onSubmit,
  saving,
}: {
  form: PlanForm;
  setForm: (f: PlanForm) => void;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
  saving?: boolean;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
      <div>
        <Label>Currency</Label>
        <Select
          value={form.planCategory}
          onChange={(e) => setForm({ ...form, planCategory: e.target.value as "INR" | "CRYPTO" })}
        >
          <option value="INR">INR</option>
          <option value="CRYPTO">Crypto</option>
        </Select>
      </div>
      <div>
        <Label>Plan tier</Label>
        <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "BASIC" | "VIP" })}>
          <option value="BASIC">Basic</option>
          <option value="VIP">VIP</option>
        </Select>
      </div>
      <div>
        <Label>{form.planCategory === "CRYPTO" ? "Price (USDT)" : "Price (₹)"}</Label>
        <Input
          type="number"
          step={form.planCategory === "CRYPTO" ? "0.01" : "1"}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Bonus %</Label>
        <Input type="number" step="0.1" value={form.bonusPercent} onChange={(e) => setForm({ ...form, bonusPercent: e.target.value })} />
      </div>
      <div>
        <Label>{form.planCategory === "CRYPTO" ? "Fixed bonus (USDT)" : "Fixed bonus (₹)"}</Label>
        <Input type="number" step="0.01" value={form.bonusFixed} onChange={(e) => setForm({ ...form, bonusFixed: e.target.value })} />
      </div>
      <div>
        <Label>Daily deposit limit</Label>
        <Input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} required />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-slate-300 text-brand-600"
          />
          Active (visible to users)
        </label>
      </div>
      <div className="sm:col-span-2 flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={saving} onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  editing,
  editForm,
  setEditForm,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  saving,
}: {
  plan: Plan;
  editing: boolean;
  editForm: PlanForm;
  setEditForm: (f: PlanForm) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  return (
    <Card hover>
      <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Badge variant={plan.type === "VIP" ? "info" : "default"}>{displayType(plan.type)}</Badge>
          <Badge variant={plan.isActive ? "success" : "default"} dot>
            {plan.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {!editing && (
          <div className="flex gap-1.5">
            <Button type="button" variant="secondary" size="sm" onClick={onEdit} aria-label="Edit plan">
              <Pencil size={14} />
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={onDelete} aria-label="Delete plan">
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>
      {!editing ? (
        <>
          <p className="text-sm font-semibold text-slate-600">
            {displayCategory(plan.planCategory)} · {displayType(plan.type)}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{formatPlanAmount(plan.price, plan.planCategory)}</p>
          <p className="text-sm text-slate-500 mt-3">
            Bonus {plan.bonusPercent}% + {formatBonusFixed(plan.bonusFixed, plan.planCategory)} · {plan.dailyLimit}/day
          </p>
        </>
      ) : (
        <div>
          <p className="text-sm font-bold text-slate-800 mb-1">Edit plan</p>
          <PlanFormFields
            form={editForm}
            setForm={setEditForm}
            submitLabel={saving ? "Saving…" : "Save changes"}
            onCancel={onCancelEdit}
            onSubmit={onSaveEdit}
            saving={saving}
          />
        </div>
      )}
    </Card>
  );
}

function PlanGroup({
  plans,
  editingId,
  editForm,
  setEditForm,
  setEditingId,
  onSaveEdit,
  onDelete,
  saving,
}: {
  plans: Plan[];
  editingId: string | null;
  editForm: PlanForm;
  setEditForm: (f: PlanForm) => void;
  setEditingId: (id: string | null) => void;
  onSaveEdit: (id: string) => void;
  onDelete: (p: Plan) => void;
  saving: boolean;
}) {
  if (!plans.length) {
    return <p className="text-sm text-slate-400 py-4 text-center">No plans yet</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <PlanCard
          key={p.id}
          plan={p}
          editing={editingId === p.id}
          editForm={editForm}
          setEditForm={setEditForm}
          onEdit={() => {
            setEditingId(p.id);
            setEditForm(planToForm(p));
          }}
          onCancelEdit={() => setEditingId(null)}
          onSaveEdit={() => onSaveEdit(p.id)}
          onDelete={() => onDelete(p)}
          saving={saving}
        />
      ))}
    </div>
  );
}

export default function Plans() {
  const [list, setList] = useState<Plan[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => adminApi.plans().then(setList);
  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const norm = (c?: string) => (c === "CRYPTO" ? "CRYPTO" : "INR");
    const normType = (t?: string) => (t === "VIP" ? "VIP" : "BASIC");
    return {
      inrBasic: list.filter((p) => norm(p.planCategory) === "INR" && normType(p.type) === "BASIC"),
      inrVip: list.filter((p) => norm(p.planCategory) === "INR" && normType(p.type) === "VIP"),
      cryptoBasic: list.filter((p) => norm(p.planCategory) === "CRYPTO" && normType(p.type) === "BASIC"),
      cryptoVip: list.filter((p) => norm(p.planCategory) === "CRYPTO" && normType(p.type) === "VIP"),
    };
  }, [list]);

  const bodyFromForm = (f: PlanForm) => ({
    planCategory: f.planCategory,
    type: f.type,
    price: Number(f.price),
    bonusPercent: f.bonusPercent ? Number(f.bonusPercent) : 0,
    bonusFixed: f.bonusFixed ? Number(f.bonusFixed) : 0,
    dailyLimit: Number(f.dailyLimit),
    isActive: f.isActive,
  });

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSaving(true);
    try {
      await adminApi.createPlan(bodyFromForm(form));
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (id: string) => {
    setActionError("");
    setSaving(true);
    try {
      await adminApi.updatePlan(id, bodyFromForm(editForm));
      setEditingId(null);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (p: Plan) => {
    if (!confirm(`Delete plan ${formatPlanAmount(p.price, p.planCategory)}? This cannot be undone.`)) return;
    setActionError("");
    try {
      await adminApi.deletePlan(p.id);
      if (editingId === p.id) setEditingId(null);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const groupProps = {
    editingId,
    editForm,
    setEditForm,
    setEditingId,
    onSaveEdit: submitEdit,
    onDelete: deletePlan,
    saving,
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Plans"
        description="INR and Crypto — each with Basic and VIP tiers (VIP = higher amount, no membership)"
        action={
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "secondary" : "primary"}>
            <Plus size={16} /> {showForm ? "Cancel" : "Add plan"}
          </Button>
        }
      />

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {showForm && (
        <Card className="mb-6 border-brand-200/50 ring-1 ring-brand-500/10">
          <h2 className="text-sm font-bold text-slate-900 mb-5">New plan</h2>
          <form onSubmit={submitCreate} className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Currency</Label>
              <Select
                value={form.planCategory}
                onChange={(e) => setForm({ ...form, planCategory: e.target.value as "INR" | "CRYPTO" })}
              >
                <option value="INR">INR</option>
                <option value="CRYPTO">Crypto</option>
              </Select>
            </div>
            <div>
              <Label>Plan tier</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "BASIC" | "VIP" })}>
                <option value="BASIC">Basic</option>
                <option value="VIP">VIP</option>
              </Select>
            </div>
            <div>
              <Label>{form.planCategory === "CRYPTO" ? "Price (USDT)" : "Price (₹)"}</Label>
              <Input
                type="number"
                step={form.planCategory === "CRYPTO" ? "0.01" : "1"}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Bonus %</Label>
              <Input type="number" step="0.1" value={form.bonusPercent} onChange={(e) => setForm({ ...form, bonusPercent: e.target.value })} />
            </div>
            <div>
              <Label>{form.planCategory === "CRYPTO" ? "Fixed bonus (USDT)" : "Fixed bonus (₹)"}</Label>
              <Input type="number" step="0.01" value={form.bonusFixed} onChange={(e) => setForm({ ...form, bonusFixed: e.target.value })} />
            </div>
            <div>
              <Label>Daily deposit limit</Label>
              <Input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create plan"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!list.length ? (
        <Card>
          <EmptyState title="No plans" description="Create INR or Crypto plans (Basic or VIP)." icon={<Layers size={24} />} />
        </Card>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-1">INR plans</h2>
            <p className="text-sm text-slate-500 mb-4">UPI payment — manual or automatic</p>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Basic</h3>
            <PlanGroup plans={grouped.inrBasic} {...groupProps} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 mt-6">VIP</h3>
            <PlanGroup plans={grouped.inrVip} {...groupProps} />
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Crypto plans</h2>
            <p className="text-sm text-slate-500 mb-4">Prices in USDT — on-chain verify, wallet credit in ₹</p>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Basic</h3>
            <PlanGroup plans={grouped.cryptoBasic} {...groupProps} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 mt-6">VIP</h3>
            <PlanGroup plans={grouped.cryptoVip} {...groupProps} />
          </section>
        </div>
      )}
    </div>
  );
}
