import type { ReactNode } from "react";
import { parseIndianMobileInput } from "../../lib/phone";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  error?: boolean;
  id?: string;
  required?: boolean;
};

export default function MobileAuthField({ label, value, onChange, icon, error, id, required }: Props) {
  const fieldId = id ?? "mobile-number";

  return (
    <div className="mb-4">
      <label htmlFor={fieldId} className="auth-label">
        {label}
      </label>
      <div className={`auth-input-wrap ${error ? "auth-input-wrap-error" : ""}`}>
        <span className="auth-input-icon" aria-hidden>
          {icon}
        </span>
        <span className="auth-mobile-prefix" aria-hidden>
          +91
        </span>
        <input
          id={fieldId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className="auth-input auth-input-mobile"
          placeholder="9876543210"
          value={value}
          onChange={(e) => onChange(parseIndianMobileInput(e.target.value))}
          required={required}
          maxLength={14}
          pattern="[6-9][0-9]{9}"
          title="10-digit Indian mobile number"
        />
      </div>
    </div>
  );
}
