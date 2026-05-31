import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { userApi, getErrorMessage } from "../api";
import ErrorAlert from "../components/ErrorAlert";
import AuthLayout from "../components/auth/AuthLayout";
import AuthField from "../components/auth/AuthField";
import MobileAuthField from "../components/auth/MobileAuthField";
import PasswordToggle from "../components/auth/PasswordToggle";
import { isValidIndianMobile } from "../lib/phone";

function PhoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function ReferralIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function OtpIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

type Step = "details" | "verify";

export default function Register() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("details");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("referral");
    if (ref) setReferralCode(ref.trim().replace(/\s+/g, "").toUpperCase().slice(0, 12));
  }, [searchParams]);

  const validateDetails = () => {
    if (!isValidIndianMobile(mobile)) {
      setError("Enter a valid 10-digit mobile number");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    const code = referralCode.trim().replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(code)) {
      setError("Enter a valid referral code (6–12 letters/numbers)");
      return false;
    }
    setReferralCode(code);
    return true;
  };

  const sendOtp = async () => {
    setError("");
    setInfo("");
    setDevOtpHint("");
    if (!validateDetails()) return;

    setLoading(true);
    try {
      const res = await userApi.sendOtp(mobile, referralCode);
      setOtpSentTo(res.mobileDisplay);
      setInfo(`OTP sent to ${res.mobileDisplay}`);
      if (res.devOtp) setDevOtpHint(`Dev OTP: ${res.devOtp}`);
      setStep("verify");
    } catch (err) {
      setError(getErrorMessage(err, "Could not send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLogin = async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const { token } = await userApi.register(mobile, otp, password, referralCode);
      localStorage.setItem("userToken", token);
      nav("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "details") {
      await sendOtp();
      return;
    }
    await verifyAndLogin();
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle={
        step === "details"
          ? "Enter your details. We will verify your mobile with OTP."
          : `Enter OTP sent to ${otpSentTo || "+91 " + mobile}`
      }
      footer={
        <p className="text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-sky-300 font-semibold hover:text-sky-200 transition-colors">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit}>
        <ErrorAlert message={error} variant="auth" />
        {info && !error && step === "verify" && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200">
            {info}
            {devOtpHint && <p className="mt-1 font-mono text-xs text-emerald-300/90">{devOtpHint}</p>}
          </div>
        )}

        {step === "details" ? (
          <>
            <MobileAuthField
              label="Mobile number"
              value={mobile}
              onChange={setMobile}
              icon={<PhoneIcon />}
              error={Boolean(error)}
              required
            />

            <AuthField
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<LockIcon />}
              suffix={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
              error={Boolean(error)}
              required
              minLength={6}
              autoComplete="new-password"
            />

            <AuthField
              label="Referral code"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="e.g. AB12CD34"
              value={referralCode}
              onChange={(e) =>
                setReferralCode(
                  e.target.value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase()
                    .slice(0, 12)
                )
              }
              icon={<ReferralIcon />}
              error={Boolean(error)}
              required
              maxLength={12}
              minLength={6}
              pattern="[A-Za-z0-9]{6,12}"
              title="Referrer's referral code"
            />
            <p className="auth-hint -mt-2 mb-4 text-xs text-slate-500">
              Ask your referrer for their referral code (not UID).
            </p>

            <button type="submit" disabled={loading} className="auth-btn-primary">
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="auth-spinner" />
                  Sending OTP…
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="mb-4 text-sm text-sky-300 hover:text-sky-200"
              onClick={() => {
                setStep("details");
                setOtp("");
                setError("");
                setInfo("");
                setDevOtpHint("");
              }}
            >
              ← Edit details
            </button>

            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-400 space-y-1">
              <p>
                Mobile: <span className="text-slate-200">+91 {mobile}</span>
              </p>
              <p>
                Referral: <span className="text-slate-200 font-mono">{referralCode}</span>
              </p>
            </div>

            <AuthField
              label="OTP"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              icon={<OtpIcon />}
              required
              maxLength={6}
              minLength={6}
              pattern="\d{6}"
            />

            <div className="flex flex-col gap-3 mt-2">
              <button type="submit" disabled={loading} className="auth-btn-primary">
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="auth-spinner" />
                    Verifying…
                  </span>
                ) : (
                  "Verify OTP & sign in"
                )}
              </button>
              <button
                type="button"
                disabled={loading}
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={() => void sendOtp()}
              >
                Resend OTP
              </button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
