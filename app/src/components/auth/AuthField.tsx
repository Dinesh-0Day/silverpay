import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
  error?: boolean;
  suffix?: ReactNode;
};

export default function AuthField({ label, icon, error, suffix, className = "", id, ...props }: Props) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="mb-4">
      <label htmlFor={fieldId} className="auth-label">
        {label}
      </label>
      <div className={`auth-input-wrap ${error ? "auth-input-wrap-error" : ""}`}>
        <span className="auth-input-icon" aria-hidden>
          {icon}
        </span>
        <input id={fieldId} className={`auth-input ${suffix ? "auth-input-with-suffix" : ""} ${className}`} {...props} />
        {suffix && <div className="auth-input-suffix">{suffix}</div>}
      </div>
    </div>
  );
}
