interface PaymentAlertProps {
  message: string;
  note?: string;
  action?: { label: string; onClick: () => void };
}

export function PaymentAlert({ message, note, action }: PaymentAlertProps) {
  return (
    <div role="alert" className="payment-alert">
      <p>{message}</p>
      {note && <p className="payment-alert__note">{note}</p>}
      {action && (
        <button type="button" className="link-button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
