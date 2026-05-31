import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { userApi, getErrorMessage, type Plan } from "../api";
import DepositPlansPicker from "../components/DepositPlansPicker";
import InrPaymentSheet from "../components/InrPaymentSheet";
import ErrorAlert from "../components/ErrorAlert";
import PageStatus from "../components/PageStatus";
import { usePageLoad } from "../hooks/usePageLoad";

type PageData = { inr: Plan[]; crypto: Plan[] };

export default function Deposits() {
  const nav = useNavigate();
  const [inrPlan, setInrPlan] = useState<Plan | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");

  const { data, loading, error, reload } = usePageLoad<PageData>(() => userApi.plansGrouped(), []);

  const buyCrypto = async (planId: string) => {
    setBuyLoading(true);
    setBuyError("");
    try {
      const res = await userApi.createDeposit({ planId });
      nav(`/pay/${res.deposit.id}`);
    } catch (e) {
      setBuyError(getErrorMessage(e));
    } finally {
      setBuyLoading(false);
    }
  };

  const buyCryptoCustom = async (amountUsdt: number) => {
    setBuyLoading(true);
    setBuyError("");
    try {
      const res = await userApi.createDeposit({ customAmount: amountUsdt });
      nav(`/pay/${res.deposit.id}`);
    } catch (e) {
      setBuyError(getErrorMessage(e));
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="deposits-page">
      <PageStatus loading={loading} error={error} onRetry={reload}>
        <DepositPlansPicker
          inrPlans={data?.inr ?? []}
          cryptoPlans={data?.crypto ?? []}
          loading={loading}
          buyLoading={buyLoading}
          onRefresh={() => void reload()}
          onBuyInr={setInrPlan}
          onBuyCrypto={buyCrypto}
          onBuyCryptoCustom={buyCryptoCustom}
        />
      </PageStatus>

      {inrPlan && <InrPaymentSheet plan={inrPlan} onClose={() => setInrPlan(null)} />}

      <ErrorAlert message={buyError} />
    </div>
  );
}
