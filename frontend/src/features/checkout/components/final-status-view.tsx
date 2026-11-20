import { PaymentOutcome } from '../state/payment.types';

interface FinalStatusViewProps {
  outcome: PaymentOutcome;
  reference: string | null;
  traceId: string | null;
  isChecking: boolean;
  onBackToProducts: () => void;
  onTryAnotherCard: () => void;
  onCheckStatus: () => void;
}

type Action = 'tryAnotherCard' | 'checkStatus';

interface Content {
  title: string;
  message: string;
  tone: 'success' | 'failure' | 'neutral';
  action: Action | null;
}

const CARD_CLEARED_NOTE = 'For your security, your card details were cleared.';

const UNCONFIRMED: Content = {
  title: "We couldn't confirm your payment",
  message:
    'Your card may have been charged. Check the status before trying again.',
  tone: 'neutral',
  action: 'checkStatus',
};

const CONTENT: Record<PaymentOutcome, Content> = {
  APPROVED: {
    title: 'Payment approved',
    message:
      'Thank you for your purchase. Your order is confirmed and will be delivered to your address.',
    tone: 'success',
    action: null,
  },
  DECLINED: {
    title: 'Payment declined',
    message:
      'Your bank declined the payment and you were not charged. Try another card.',
    tone: 'failure',
    action: 'tryAnotherCard',
  },
  ERROR: {
    title: 'Payment failed',
    message: 'The payment could not be completed. Try again with your card.',
    tone: 'failure',
    action: 'tryAnotherCard',
  },
  VOIDED: {
    title: 'Payment voided',
    message: 'The payment was voided. Try again with your card.',
    tone: 'failure',
    action: 'tryAnotherCard',
  },
  REJECTED: {
    title: 'Card not accepted',
    message:
      'We could not accept this card. Check the number, expiry and CVC, or use another card.',
    tone: 'failure',
    action: 'tryAnotherCard',
  },
  PENDING: {
    title: 'Payment pending',
    message: 'Your payment is still being processed. Check again in a moment.',
    tone: 'neutral',
    action: 'checkStatus',
  },
  UNCONFIRMED,
};

export function FinalStatusView({
  outcome,
  reference,
  traceId,
  isChecking,
  onBackToProducts,
  onTryAnotherCard,
  onCheckStatus,
}: FinalStatusViewProps) {
  const content = CONTENT[outcome] ?? UNCONFIRMED;
  const clearsCard = content.action === 'tryAnotherCard';

  return (
    <div className="checkout result">
      <h2 id="checkout-title" className="checkout__title">
        {content.title}
      </h2>
      <p
        role="status"
        className={`result__message result__message--${content.tone}`}
      >
        {content.message}
      </p>
      {clearsCard && <p className="checkout__hint">{CARD_CLEARED_NOTE}</p>}

      <dl className="result__ids">
        {reference && (
          <div>
            <dt>Reference</dt>
            <dd>{reference}</dd>
          </div>
        )}
        {traceId && (
          <div>
            <dt>Trace ID</dt>
            <dd>{traceId}</dd>
          </div>
        )}
      </dl>

      <div className="checkout__actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={onBackToProducts}
        >
          Back to products
        </button>
        {content.action === 'tryAnotherCard' && (
          <button
            type="button"
            className="button button--primary"
            onClick={onTryAnotherCard}
          >
            Try another card
          </button>
        )}
        {content.action === 'checkStatus' && (
          <button
            type="button"
            className="button button--primary"
            disabled={isChecking}
            onClick={onCheckStatus}
          >
            {isChecking && <span className="spinner" aria-hidden="true" />}
            {isChecking ? 'Checking...' : 'Check status'}
          </button>
        )}
      </div>
    </div>
  );
}
