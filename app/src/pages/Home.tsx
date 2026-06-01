import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userApi, getErrorMessage, type User, type HomeBannerSlide } from "../api";
import HomeBannerSlider from "../components/HomeBannerSlider";
import HomeBannerDrawer from "../components/HomeBannerDrawer";
import LiveTransactions from "../components/LiveTransactions";
import { HomeGiftIcon, HomeWalletIcon } from "../components/HomeStatIcons";
import HomeFlowIcon from "../components/HomeFlowIcon";
import HomePromoBanner, { formatFlowAmount } from "../components/HomePromoBanner";
import PageStatus from "../components/PageStatus";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState({ inr: 0, crypto: 0, pendingDeposits: 0 });
  const [today, setToday] = useState({
    inrOrders: 0,
    inrAmount: 0,
    cryptoOrders: 0,
    cryptoWalletCredit: 0,
  });
  const [bannerSlides, setBannerSlides] = useState<HomeBannerSlide[]>([]);
  const [homeInfo, setHomeInfo] = useState({
    usdtToInrRate: 0,
    todayInrBonusPercent: 0,
    balance: 0,
    depositTotal: 0,
    withdrawalTotal: 0,
    commissionTotal: 0,
    commission: { planBonus: 0, referral: 0, newbieRewards: 0, total: 0 },
    promo: { enabled: false, imageUrl: "", linkUrl: "" },
  });
  const [drawerSlide, setDrawerSlide] = useState<HomeBannerSlide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    return Promise.all([userApi.me(), userApi.plansGrouped(), userApi.homeBanner(), userApi.homeInfo()])
      .then(([u, g, b, info]) => {
        setUser(u);
        const dash = info.depositDashboard;
        setCounts({
          inr: g.inr.length,
          crypto: g.crypto.length,
          pendingDeposits: dash?.pendingDeposits ?? 0,
        });
        setToday({
          inrOrders: dash?.todayInrOrders ?? 0,
          inrAmount: dash?.todayInrAmount ?? 0,
          cryptoOrders: dash?.todayCryptoOrders ?? 0,
          cryptoWalletCredit: dash?.todayCryptoWalletCredit ?? 0,
        });

        setBannerSlides(b.enabled && b.slides.length ? b.slides : []);
        setHomeInfo({
          usdtToInrRate: info.usdtToInrRate,
          todayInrBonusPercent: info.todayInrBonusPercent ?? 0,
          balance: info.balance ?? u.balance ?? 0,
          depositTotal: info.depositTotal ?? 0,
          withdrawalTotal: info.withdrawalTotal ?? 0,
          commissionTotal: info.commission?.total ?? info.commissionTotal ?? 0,
          commission: info.commission ?? {
            planBonus: 0,
            referral: 0,
            newbieRewards: 0,
            total: info.commissionTotal ?? 0,
          },
          promo: info.promo ?? { enabled: false, imageUrl: "", linkUrl: "" },
        });
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      {drawerSlide && <HomeBannerDrawer slide={drawerSlide} onClose={() => setDrawerSlide(null)} />}

      <PageStatus loading={loading} error={error} onRetry={load}>
        {bannerSlides.length > 0 && (
          <HomeBannerSlider slides={bannerSlides} onSlideClick={(slide) => setDrawerSlide(slide)} />
        )}

        <section className="home-stat-row">
          <Link to="/wallet" className="home-stat-card">
            <div className="home-stat-copy">
              <span className="home-stat-label">Balance</span>
              <strong className="home-stat-value">₹ {homeInfo.balance.toFixed(2)}</strong>
              <span className="home-stat-hint">Full wallet · deposits + bonuses</span>
            </div>
            <HomeWalletIcon className="home-stat-icon" />
          </Link>
          <Link to="/team" className="home-stat-card">
            <div className="home-stat-copy">
              <span className="home-stat-label">Commission</span>
              <strong className="home-stat-value">₹ {homeInfo.commissionTotal.toFixed(2)}</strong>
              <span className="home-stat-hint">
                Plan + team + rewards
              </span>
            </div>
            <HomeGiftIcon className="home-stat-icon" />
          </Link>
        </section>

        <section className="home-flow-card" aria-label="Deposit and withdrawal totals">
          <div className="home-flow-half">
            <HomeFlowIcon direction="down" />
            <div className="home-flow-copy">
              <span className="home-flow-label">Deposit</span>
              <strong className="home-flow-amount">₹ {formatFlowAmount(homeInfo.depositTotal)}</strong>
            </div>
          </div>
          <div className="home-flow-divider" aria-hidden />
          <div className="home-flow-half">
            <HomeFlowIcon direction="up" />
            <div className="home-flow-copy">
              <span className="home-flow-label">Withdrawal</span>
              <strong className="home-flow-amount">₹ {formatFlowAmount(homeInfo.withdrawalTotal)}</strong>
            </div>
          </div>
        </section>

        {homeInfo.promo.enabled && homeInfo.promo.imageUrl && (
          <HomePromoBanner imageUrl={homeInfo.promo.imageUrl} linkUrl={homeInfo.promo.linkUrl} />
        )}

        <div className="home-market-row home-market-row-standalone">
          <div className="home-market-box home-market-rate">
            <span className="home-market-label">USDT → INR (today)</span>
            <strong>₹{homeInfo.usdtToInrRate > 0 ? homeInfo.usdtToInrRate.toFixed(2) : "—"}</strong>
            <span className="home-market-sub">per 1 USDT</span>
          </div>
          <div className="home-market-box home-market-bonus">
            <span className="home-market-label">Today&apos;s INR bonus</span>
            <strong>
              {homeInfo.todayInrBonusPercent % 1 === 0
                ? homeInfo.todayInrBonusPercent.toFixed(0)
                : homeInfo.todayInrBonusPercent.toFixed(1)}
              %
            </strong>
            <span className="home-market-sub">extra on INR deposits</span>
          </div>
        </div>

        <Link to="/deposits/history" className="home-stats-card home-stats-card-link">
          <div className="home-section-head">
            <h3>Today&apos;s Deposits</h3>
            <span className="home-section-action">View &gt;</span>
          </div>

          <div className="home-deposit-row">
            <div className="home-stat-label">
              <span className="home-stat-dot bg-pink-500">🧾</span>
              <span>INR</span>
            </div>
            <div className="home-stat-metric">
              <strong>{today.inrOrders}</strong>
              <span>Orders</span>
            </div>
            <div className="home-stat-metric">
              <strong>₹{today.inrAmount.toFixed(0)}</strong>
              <span>Amount</span>
            </div>
          </div>

          <div className="home-deposit-row">
            <div className="home-stat-label">
              <span className="home-stat-dot bg-amber-500">🧾</span>
              <span>Crypto</span>
            </div>
            <div className="home-stat-metric">
              <strong>{today.cryptoOrders}</strong>
              <span>Orders</span>
            </div>
            <div className="home-stat-metric">
              <strong>₹{today.cryptoWalletCredit.toFixed(0)}</strong>
              <span>Amount</span>
            </div>
          </div>
        </Link>

        <Link to="/rewards" className="home-reward-card">
          <div>
            <p className="home-reward-card-title">Newbie Rewards</p>
            <p className="home-reward-card-sub">Click for more &gt;</p>
          </div>
          <span className="home-reward-card-icon" aria-hidden>
            💰
          </span>
        </Link>

        <LiveTransactions />
      </PageStatus>
    </div>
  );
}
