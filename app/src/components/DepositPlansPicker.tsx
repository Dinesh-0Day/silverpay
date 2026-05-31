import { useMemo, useState } from "react";
import type { Plan } from "../api";
import { planCurrency } from "../lib/currency";
import UsdtDepositCalculator from "./UsdtDepositCalculator";

type CurrencyTab = "INR" | "CRYPTO";
type PlanTab = "BASIC" | "VIP";
type SortOrder = "low" | "high";

type Props = {
  inrPlans: Plan[];
  cryptoPlans: Plan[];
  loading?: boolean;
  buyLoading?: boolean;
  onRefresh: () => void;
  onBuyInr: (plan: Plan) => void;
  onBuyCrypto: (planId: string) => void;
  onBuyCryptoCustom?: (amountUsdt: number) => void;
};

function formatPlanPrice(price: number, currency: "INR" | "USDT") {
  const amount = price.toFixed(2);
  return currency === "USDT" ? `${amount} USDT` : `${amount} INR`;
}

function isDailyLimitExhausted(plan: Plan) {
  return (
    plan.lockReason === "DAILY_LIMIT_REACHED" ||
    plan.remainingToday <= 0 ||
    plan.usedToday >= plan.dailyLimit
  );
}

function DepositPlanCard({
  plan,
  currencyTab,
  buyLoading,
  onBuyInr,
  onBuyCrypto,
}: {
  plan: Plan;
  currencyTab: CurrencyTab;
  buyLoading?: boolean;
  onBuyInr: (plan: Plan) => void;
  onBuyCrypto: (planId: string) => void;
}) {
  const currency = plan.currency ?? planCurrency(plan.planCategory);
  const isCrypto = currencyTab === "CRYPTO";
  const income = plan.bonusPreview;
  const quota = plan.creditPreview;

  return (
    <article className="deposit-plan-card">
      <div className="deposit-plan-card-accent" aria-hidden />
      <div className="deposit-plan-card-body">
        <div className="deposit-plan-card-main">
          <p className="deposit-plan-card-price">{formatPlanPrice(plan.price, currency)}</p>
          <div className="deposit-plan-card-row">
            <span className="deposit-plan-card-k">Income</span>
            <span className="deposit-plan-card-v">{income.toFixed(2)}</span>
            <span className="deposit-plan-card-badge">{plan.bonusPercent.toFixed(2)}%</span>
          </div>
          <div className="deposit-plan-card-row">
            <span className="deposit-plan-card-k">Quota</span>
            <span className="deposit-plan-card-v deposit-plan-card-quota">
              +{quota.toFixed(2)}
              {isCrypto ? " ₹" : ""}
            </span>
          </div>
        </div>

        {isCrypto ? (
          <button
            type="button"
            className="deposit-plan-buy"
            disabled={buyLoading}
            onClick={() => onBuyCrypto(plan.id)}
          >
            Buy <span aria-hidden>&gt;</span>
          </button>
        ) : (
          <button type="button" className="deposit-plan-buy" onClick={() => onBuyInr(plan)}>
            Buy <span aria-hidden>&gt;</span>
          </button>
        )}
      </div>
    </article>
  );
}

export default function DepositPlansPicker({
  inrPlans,
  cryptoPlans,
  loading,
  buyLoading,
  onRefresh,
  onBuyInr,
  onBuyCrypto,
  onBuyCryptoCustom,
}: Props) {
  const [currency, setCurrency] = useState<CurrencyTab>("INR");
  const [planTab, setPlanTab] = useState<PlanTab>("BASIC");
  const [sort, setSort] = useState<SortOrder>("low");

  const visiblePlans = useMemo(() => {
    const source = currency === "INR" ? inrPlans : cryptoPlans;
    const filtered = source.filter((p) => p.type === planTab && !isDailyLimitExhausted(p));
    return [...filtered].sort((a, b) => (sort === "low" ? a.price - b.price : b.price - a.price));
  }, [currency, planTab, sort, inrPlans, cryptoPlans]);

  return (
    <section className="deposit-picker">
      <div className="deposit-picker-currency" role="tablist" aria-label="Currency">
        <button
          type="button"
          role="tab"
          aria-selected={currency === "INR"}
          className={`deposit-picker-currency-btn${currency === "INR" ? " is-active" : ""}`}
          onClick={() => setCurrency("INR")}
        >
          INR
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currency === "CRYPTO"}
          className={`deposit-picker-currency-btn${currency === "CRYPTO" ? " is-active" : ""}`}
          onClick={() => setCurrency("CRYPTO")}
        >
          USDT
        </button>
      </div>

      {currency === "CRYPTO" && onBuyCryptoCustom && (
        <>
          <UsdtDepositCalculator buyLoading={buyLoading} onCreateOrder={onBuyCryptoCustom} />
          <div className="deposit-picker-divider">
            <span>Or choose a plan</span>
          </div>
        </>
      )}

      <div className="deposit-picker-toolbar">
        <label className="deposit-picker-sort">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            aria-label="Sort plans"
          >
            <option value="low">Low to high</option>
            <option value="high">High to low</option>
          </select>
          <span className="deposit-picker-sort-chevron" aria-hidden>
            ▾
          </span>
        </label>
        <button
          type="button"
          className="deposit-picker-refresh"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh plans"
          title="Refresh"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h5M20 20v-5h-5M20 4a8 8 0 00-14.5 2M4 20a8 8 0 0014.5-2"
            />
          </svg>
        </button>
      </div>

      <div className="deposit-picker-tabs" role="tablist" aria-label="Plan type">
        <button
          type="button"
          role="tab"
          aria-selected={planTab === "BASIC"}
          className={`deposit-picker-tab${planTab === "BASIC" ? " is-active" : ""}`}
          onClick={() => setPlanTab("BASIC")}
        >
          Basic Plans
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={planTab === "VIP"}
          className={`deposit-picker-tab${planTab === "VIP" ? " is-active" : ""}`}
          onClick={() => setPlanTab("VIP")}
        >
          VIP Plans
        </button>
      </div>

      <div className="deposit-plan-list">
        {loading ? (
          <p className="deposit-plan-empty">Loading plans…</p>
        ) : visiblePlans.length === 0 ? (
          <p className="deposit-plan-empty">
            No {planTab === "VIP" ? "VIP" : "basic"} plans for {currency === "INR" ? "INR" : "USDT"}.
          </p>
        ) : (
          visiblePlans.map((plan) => (
            <DepositPlanCard
              key={plan.id}
              plan={plan}
              currencyTab={currency}
              buyLoading={buyLoading}
              onBuyInr={onBuyInr}
              onBuyCrypto={onBuyCrypto}
            />
          ))
        )}
      </div>
    </section>
  );
}
