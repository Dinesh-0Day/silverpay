type Props = {
  open: boolean;
  title?: string;
  message?: string;
  onStay: () => void;
  onLeave: () => void;
};

export default function PaymentLeaveDialog({
  open,
  title = "Leave payment?",
  message = "Payment is not complete. If you leave now, this order will be cancelled.",
  onStay,
  onLeave,
}: Props) {
  if (!open) return null;

  return (
    <div className="payment-leave-backdrop" role="dialog" aria-modal="true" aria-labelledby="payment-leave-title">
      <div className="payment-leave-dialog">
        <h2 id="payment-leave-title" className="payment-leave-title">
          {title}
        </h2>
        <p className="payment-leave-message">{message}</p>
        <div className="payment-leave-actions">
          <button type="button" className="payment-leave-stay" onClick={onStay}>
            Stay &amp; pay
          </button>
          <button type="button" className="payment-leave-go" onClick={onLeave}>
            Leave &amp; cancel
          </button>
        </div>
      </div>
    </div>
  );
}
