import ErrorAlert from "./ErrorAlert";

type Props = {
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  loadingLabel?: string;
  children?: React.ReactNode;
};

export default function PageStatus({ loading, error, onRetry, loadingLabel = "Loading…", children }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-sm gap-3">
        <span className="w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={onRetry} />;
  }

  return <>{children}</>;
}
