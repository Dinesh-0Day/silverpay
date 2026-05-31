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

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("session") === "expired") {
      setError("Your session expired. Please sign in again.");
    }
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidIndianMobile(mobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const { token } = await userApi.login(mobile, password);
      localStorage.setItem("userToken", token);
      nav("/");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with your mobile number."
      footer={
        <p className="text-sm text-slate-400">
          New here?{" "}
          <Link to="/register" className="text-sky-300 font-semibold hover:text-sky-200 transition-colors">
            Create account
          </Link>
        </p>
      }
    >
      <form onSubmit={submit}>
        <ErrorAlert message={error} variant="auth" />

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
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<LockIcon />}
          suffix={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
          error={Boolean(error)}
          required
        />

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="auth-spinner" />
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
