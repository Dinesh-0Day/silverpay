import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type Tab = {
  to: string;
  label: string;
  match: (path: string) => boolean;
  icon: (active: boolean) => ReactNode;
};

function IconHome({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5 12 4l8 6.5V19a1 1 0 01-1 1h-4v-5H9v5H5a1 1 0 01-1-1v-8.5z" />
    </svg>
  );
}

function IconDeposits({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconWallet({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10V8a2 2 0 012-2h14a2 2 0 012 2v2M16 14h2" />
    </svg>
  );
}

function IconTeam({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 19c0-2.761 2.686-5 6-5s6 2.239 6 5M14 19c0-1.933 1.567-3.5 3.5-3.5.96 0 1.84.39 2.5 1.02" />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6" />
    </svg>
  );
}

const TABS: Tab[] = [
  { to: "/", label: "Home", match: (p) => p === "/", icon: (a) => <IconHome active={a} /> },
  {
    to: "/deposits",
    label: "Deposits",
    match: (p) => p === "/deposits" || p.startsWith("/deposits/") || p.startsWith("/orders"),
    icon: (a) => <IconDeposits active={a} />,
  },
  {
    to: "/team",
    label: "Team",
    match: (p) => p === "/team",
    icon: (a) => <IconTeam active={a} />,
  },
  {
    to: "/wallet",
    label: "Wallet",
    match: (p) => p === "/wallet" || p === "/withdraw",
    icon: (a) => <IconWallet active={a} />,
  },
  { to: "/profile", label: "My", match: (p) => p === "/profile" || p.startsWith("/profile/"), icon: (a) => <IconProfile active={a} /> },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <div className="app-bottom-nav-wrap">
      <nav className="app-bottom-nav" aria-label="Main navigation">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link key={tab.to} to={tab.to} className={`app-nav-item${active ? " is-active" : ""}`}>
              <span className="app-nav-icon">{tab.icon(active)}</span>
              <span className="app-nav-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
