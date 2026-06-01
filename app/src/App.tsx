import { useEffect, useState } from "react";
import { Navigate, Route, Routes, Link, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import BuyPlan from "./pages/BuyPlan";
import PayOrder from "./pages/PayOrder";
import Deposits from "./pages/Deposits";
import DepositHistory from "./pages/DepositHistory";
import Wallet from "./pages/Wallet";
import Withdraw from "./pages/Withdraw";
import Support from "./pages/Support";
import Profile from "./pages/Profile";
import BankDetails from "./pages/BankDetails";
import Notifications from "./pages/Notifications";
import Team from "./pages/Team";
import NewbieRewards from "./pages/NewbieRewards";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";
import TopbarApkDownload from "./components/TopbarApkDownload";
import { userApi } from "./api";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("userToken")) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const hideNav = loc.pathname.includes("/buy/") || loc.pathname.includes("/pay/");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (hideNav || !localStorage.getItem("userToken")) return;
    let mounted = true;
    const loadUnread = () =>
      userApi
        .notificationsUnread()
        .then((r) => {
          if (mounted) setUnread(r.unread ?? 0);
        })
        .catch(() => undefined);
    void loadUnread();
    const t = window.setInterval(() => void loadUnread(), 15000);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, [hideNav, loc.pathname]);

  useEffect(() => {
    if (loc.pathname === "/notifications") setUnread(0);
  }, [loc.pathname]);

  return (
    <div className="app-shell">
      {!hideNav && (
        <header className="app-topbar">
          <div className="app-topbar-inner">
            <h1 className="app-topbar-logo">
              <span>Silver</span>
              <span>Pay</span>
            </h1>
            <div className="app-topbar-actions">
              <TopbarApkDownload />
              <Link
                to="/notifications"
                className={`app-topbar-icon-btn${unread > 0 ? " has-unread" : ""}`}
                aria-label="Notifications"
                title="Notifications"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0"
                  />
                </svg>
                {unread > 0 ? <span className="app-topbar-badge">{unread > 9 ? "9+" : unread}</span> : null}
              </Link>
              <Link to="/profile" className="app-topbar-icon-btn" aria-label="Profile" title="Profile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6" />
                </svg>
              </Link>
            </div>
          </div>
        </header>
      )}
      <div className="app-page">{children}</div>
      {!hideNav && <BottomNav />}
      <Link to="/support" className="app-support-fab" title="Support" aria-label="Support chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.8-3.6A7.86 7.86 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </Link>
    </div>
  );
}

function NotFoundRoute() {
  const loggedIn = !!localStorage.getItem("userToken");
  if (loggedIn) {
    return (
      <RequireAuth>
        <Shell>
          <NotFound />
        </Shell>
      </RequireAuth>
    );
  }
  return <NotFound />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Shell>
              <Home />
            </Shell>
          </RequireAuth>
        }
      />
      <Route path="/plans/inr" element={<Navigate to="/deposits" replace />} />
      <Route path="/plans/upi" element={<Navigate to="/deposits" replace />} />
      <Route path="/plans/crypto" element={<Navigate to="/deposits" replace />} />
      <Route
        path="/buy/:planId"
        element={
          <RequireAuth>
            <Shell>
              <BuyPlan />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/pay/:depositId"
        element={
          <RequireAuth>
            <Shell>
              <PayOrder />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/deposits"
        element={
          <RequireAuth>
            <Shell>
              <Deposits />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/deposits/history"
        element={
          <RequireAuth>
            <Shell>
              <DepositHistory />
            </Shell>
          </RequireAuth>
        }
      />
      <Route path="/orders" element={<Navigate to="/deposits/history" replace />} />
      <Route
        path="/wallet"
        element={
          <RequireAuth>
            <Shell>
              <Wallet />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/withdraw"
        element={
          <RequireAuth>
            <Shell>
              <Withdraw />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/support"
        element={
          <RequireAuth>
            <Shell>
              <Support />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Shell>
              <Profile />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/profile/bank"
        element={
          <RequireAuth>
            <Shell>
              <BankDetails />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/notifications"
        element={
          <RequireAuth>
            <Shell>
              <Notifications />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/team"
        element={
          <RequireAuth>
            <Shell>
              <Team />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/rewards"
        element={
          <RequireAuth>
            <Shell>
              <NewbieRewards />
            </Shell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}
