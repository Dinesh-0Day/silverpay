type Props = {
  message: string;
  variant?: "page" | "auth";
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorAlert({ message, variant = "page", onRetry, retryLabel = "Try again" }: Props) {
  if (!message) return null;

  if (variant === "auth") {
    return (
      <div className="auth-error mb-4 flex gap-2 px-3 py-2.5 text-sm" role="alert">
        <span className="shrink-0" aria-hidden>
          ⚠️
        </span>
        <div className="min-w-0 flex-1">
          <p>{message}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="mt-2 text-sky-300 font-semibold hover:text-sky-200">
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex gap-2"
      role="alert"
    >
      <span className="shrink-0 font-bold" aria-hidden>
        !
      </span>
      <div className="min-w-0 flex-1">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-red-700 font-semibold underline underline-offset-2 hover:text-red-900"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
