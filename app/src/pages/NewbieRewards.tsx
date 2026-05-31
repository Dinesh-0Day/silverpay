import { useState } from "react";
import { Link } from "react-router-dom";
import { userApi, getErrorMessage, type NewbieRewardItem } from "../api";
import PageStatus from "../components/PageStatus";
import { formatWalletInr } from "../lib/currency";
import { usePageLoad } from "../hooks/usePageLoad";

function bonusLabel(percent: number) {
  if (percent <= 0) return "No bonus today";
  return percent % 1 === 0 ? `${percent.toFixed(0)}% extra` : `${percent.toFixed(1)}% extra`;
}

function RewardCard({
  item,
  claiming,
  telegramOpening,
  onClaim,
  onTelegramJoin,
}: {
  item: NewbieRewardItem;
  claiming: boolean;
  telegramOpening: boolean;
  onClaim: (id: string) => void;
  onTelegramJoin: (item: NewbieRewardItem) => void;
}) {
  const path = item.ctaPath?.startsWith("/") ? item.ctaPath : "";
  const isTelegram = item.taskType === "TELEGRAM_JOIN" && Boolean(item.telegramUrl?.trim());
  const showTelegramJoin = isTelegram && item.status !== "claimed" && !item.telegramAcked;
  const showTelegramClaim = isTelegram && item.status === "claimable" && item.telegramAcked;

  return (
    <article className={`rewards-item-card rewards-item-${item.status}`}>
      <span className="rewards-item-icon" aria-hidden>
        {item.icon || "🎁"}
      </span>
      <div className="rewards-item-body">
        <div className="rewards-item-top">
          <h3>{item.title}</h3>
          <span className="rewards-amount-badge">+{formatWalletInr(item.amountInr)}</span>
        </div>
        <p>{item.description}</p>

        {item.status === "claimed" && (
          <p className="rewards-status rewards-status-claimed">✓ Claimed to wallet</p>
        )}

        {item.status === "locked" && item.reason && !showTelegramJoin && (
          <p className="rewards-status rewards-status-locked">{item.reason}</p>
        )}

        <div className="rewards-item-actions">
          {showTelegramJoin && (
            <button
              type="button"
              className="rewards-btn rewards-btn-primary"
              disabled={telegramOpening}
              onClick={() => onTelegramJoin(item)}
            >
              {telegramOpening ? "Opening…" : `Step 1: ${item.ctaLabel || "Join Telegram"}`}
            </button>
          )}

          {showTelegramClaim && (
            <>
              <p className="rewards-status rewards-status-claimed m-0">✓ Channel opened — now claim</p>
              <button
                type="button"
                className="rewards-btn rewards-btn-primary"
                disabled={claiming}
                onClick={() => onClaim(item.id)}
              >
                {claiming ? "Claiming…" : `Step 2: Claim ${formatWalletInr(item.amountInr)}`}
              </button>
            </>
          )}

          {!isTelegram && item.status === "claimable" && (
            <button
              type="button"
              className="rewards-btn rewards-btn-primary"
              disabled={claiming}
              onClick={() => onClaim(item.id)}
            >
              {claiming ? "Claiming…" : `Claim ${formatWalletInr(item.amountInr)}`}
            </button>
          )}

          {item.status === "locked" && path && !isTelegram && (
            <Link to={path} className="rewards-btn rewards-btn-outline">
              {item.ctaLabel || "Complete task"} →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function NewbieRewards() {
  const { data, loading, error, reload } = usePageLoad(() => userApi.newbieRewards(), []);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [telegramOpeningId, setTelegramOpeningId] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState("");
  const [claimErr, setClaimErr] = useState("");

  const items = data?.items ?? [];
  const bonusPercent = data?.todayInrBonusPercent ?? 0;
  const rate = data?.usdtToInrRate ?? 0;

  const handleTelegramJoin = async (item: NewbieRewardItem) => {
    setTelegramOpeningId(item.id);
    setClaimErr("");
    try {
      const result = await userApi.ackNewbieRewardTelegram(item.id);
      window.open(result.telegramUrl, "_blank", "noopener,noreferrer");
      await reload();
    } catch (e) {
      setClaimErr(getErrorMessage(e));
    } finally {
      setTelegramOpeningId(null);
    }
  };

  const handleClaim = async (rewardId: string) => {
    setClaimingId(rewardId);
    setClaimErr("");
    setClaimMsg("");
    try {
      const result = await userApi.claimNewbieReward(rewardId);
      setClaimMsg(`+${formatWalletInr(result.amountInr)} added to your wallet!`);
      await reload();
    } catch (e) {
      setClaimErr(getErrorMessage(e));
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="rewards-page">
      <header className="rewards-head">
        <h1>{data?.title ?? "Newbie Rewards"}</h1>
        <p>{data?.subtitle ?? "Complete tasks and claim cash to your wallet"}</p>
      </header>

      <PageStatus loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <section className="rewards-summary">
              <div className="rewards-summary-box">
                <span>Claimed</span>
                <strong>{formatWalletInr(data.totalClaimed ?? 0)}</strong>
              </div>
              <div className="rewards-summary-box rewards-summary-highlight">
                <span>Ready to claim</span>
                <strong>{formatWalletInr(data.totalAvailable ?? 0)}</strong>
              </div>
            </section>

            <section className="rewards-hero">
              <div className="rewards-hero-pill">
                <span>Today&apos;s INR bonus</span>
                <strong>{bonusLabel(bonusPercent)}</strong>
              </div>
              <div className="rewards-hero-pill">
                <span>USDT rate</span>
                <strong>{rate > 0 ? `₹${rate.toFixed(2)}` : "—"}</strong>
              </div>
            </section>

            {claimMsg && <p className="rewards-toast rewards-toast-ok">{claimMsg}</p>}
            {claimErr && <p className="rewards-toast rewards-toast-err">{claimErr}</p>}

            {!data.enabled || !items.length ? (
              <div className="rewards-empty">
                <p>Rewards are not available right now.</p>
                <Link to="/deposits" className="rewards-empty-link">
                  Browse plans →
                </Link>
              </div>
            ) : (
              <section className="rewards-list">
                <h2 className="rewards-section-title">Tasks &amp; rewards</h2>
                <ul className="rewards-item-list">
                  {items.map((item) => (
                    <li key={item.id}>
                      <RewardCard
                        item={item}
                        claiming={claimingId === item.id}
                        telegramOpening={telegramOpeningId === item.id}
                        onClaim={(id) => void handleClaim(id)}
                        onTelegramJoin={(row) => void handleTelegramJoin(row)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rewards-foot">
              <p>For Telegram rewards: open the channel link first, then the Claim button appears.</p>
              <Link to="/support" className="rewards-foot-link">
                Need help? Live support
              </Link>
            </section>
          </>
        )}
      </PageStatus>
    </div>
  );
}
