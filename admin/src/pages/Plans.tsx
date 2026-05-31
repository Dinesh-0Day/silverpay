import { useEffect, useState, useMemo } from "react";
import { Plus, Layers } from "lucide-react";
import { adminApi, type Plan } from "../api";
import { PageHeader, Card, Badge, Button, Input, Label, Select, EmptyState } from "../components/ui";
import { formatPlanAmount, formatBonusFixed } from "../lib/currency";

const empty = {
  planCategory: "INR" as "INR" | "CRYPTO",
  type: "BASIC" as "BASIC" | "VIP",
  price: "",
  bonusPercent: "",
  bonusFixed: "",
  dailyLimit: "",
  isActive: true,
};

function displayCategory(c?: string) {
  return c === "CRYPTO" ? "Crypto" : "INR";
}

function displayType(t?: string) {
  return t === "VIP" ? "VIP" : "Basic";
}

function PlanGroup({ title, plans }: { title: string; plans: Plan[] }) {
  if (!plans.length) {
    return <p className="text-sm text-slate-400 py-4 text-center">No plans yet</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <Card key={p.id} hover>
          <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
            <Badge variant={p.type === "VIP" ? "info" : "default"}>{displayType(p.type)}</Badge>
            <Badge variant={p.isActive ? "success" : "default"} dot>
              {p.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-slate-600">
            {displayCategory(p.planCategory)} · {displayType(p.type)}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{formatPlanAmount(p.price, p.planCategory)}</p>
          <p className="text-sm text-slate-500 mt-3">
            Bonus {p.bonusPercent}% + {formatBonusFixed(p.bonusFixed, p.planCategory)} · {p.dailyLimit}/day
          </p>
        </Card>
      ))}
    </div>
  );
}

export default function Plans() {
  const [list, setList] = useState<Plan[]>([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  const load = () => adminApi.plans().then(setList);
  useEffect(() => {
    load();
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApi.createPlan({
      planCategory: form.planCategory,
      type: form.type,
      price: Number(form.price),
      bonusPercent: form.bonusPercent ? Number(form.bonusPercent) : 0,
      bonusFixed: form.bonusFixed ? Number(form.bonusFixed) : 0,
      dailyLimit: Number(form.dailyLimit),
      isActive: form.isActive,
    });
    setForm(empty);
    setShowForm(false);
    load();
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

      {showForm && (
        <Card className="mb-6 border-brand-200/50 ring-1 ring-brand-500/10">
          <h2 className="text-sm font-bold text-slate-900 mb-5">New plan</h2>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2 pt-2">
              <Button type="submit">Create plan</Button>
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
            <PlanGroup title="Basic" plans={grouped.inrBasic} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 mt-6">VIP</h3>
            <p className="text-xs text-slate-400 mb-3">Higher amount tier — open to all users</p>
            <PlanGroup title="VIP" plans={grouped.inrVip} />
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Crypto plans</h2>
            <p className="text-sm text-slate-500 mb-4">Prices in USDT — on-chain verify, wallet credit in ₹</p>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Basic</h3>
            <PlanGroup title="Basic" plans={grouped.cryptoBasic} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 mt-6">VIP</h3>
            <PlanGroup title="VIP" plans={grouped.cryptoVip} />
          </section>
        </div>
      )}
    </div>
  );
}
