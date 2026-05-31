import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
};

export default function AuthLayout({ children, title, subtitle, footer }: Props) {
  return (
    <div className="auth-screen min-h-dvh flex flex-col relative overflow-hidden">
      <div className="auth-orb auth-orb-a" aria-hidden />
      <div className="auth-orb auth-orb-b" aria-hidden />
      <div className="auth-orb auth-orb-c" aria-hidden />
      <div className="auth-shine" aria-hidden />

      <div className="relative z-10 flex flex-col justify-center flex-1 w-full max-w-[400px] mx-auto px-6 py-10">
        <header className="mb-10 text-center">
          <Link to="/login" className="inline-block group">
            <div className="auth-logo-mark mx-auto mb-5">
              <svg viewBox="0 0 40 40" className="w-9 h-9 text-white" fill="none" aria-hidden>
                <path
                  d="M10 27V13l10-5 10 5v14l-10 5-10-5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M20 8v24M10 13l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-white leading-none">
              Silver<span className="auth-brand-accent">Pay</span>
            </h1>
          </Link>
        </header>

        <div className="auth-card">
          <div className="auth-card-head">
            <h2 className="auth-card-title">{title}</h2>
            {subtitle && <p className="auth-card-subtitle">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-8 text-center">{footer}</div>}
      </div>
    </div>
  );
}
