import { Product } from '@/features/products/state/product.types';
import { formatCents } from '@/shared/format/currency';
import { CardBrandLogo } from './card-brand-logo';
import { PaymentAlert } from './payment-alert';
import { CheckoutState, DataSection } from '../state/checkout.types';
import { errorMessage } from '../state/payment-errors';
import { QuoteState, SubmissionState } from '../state/payment.types';

interface PaymentBackdropProps {
  product: Product;
  checkout: CheckoutState;
  quote: QuoteState;
  submission: SubmissionState;
  canPay: boolean;
  onEdit: (section: DataSection) => void;
  onEditOrder: () => void;
  onBack: () => void;
  onPay: () => void;
  onRetryQuote: () => void;
  onLeave: () => void;
}

export function PaymentBackdrop({
  product,
  checkout,
  quote,
  submission,
  canPay,
  onEdit,
  onEditOrder,
  onBack,
  onPay,
  onRetryQuote,
  onLeave,
}: PaymentBackdropProps) {
  const { shipping, installments, quantity } = checkout;
  const amounts = quote.amounts;
  const isSubmitting = submission.status === 'submitting';
  const isQuoteBlocking =
    quote.error === 'not_found' || quote.error === 'out_of_stock';

  return (
    <div className="backdrop">
      <section className="backdrop__back" aria-label="Order">
        <img
          className="backdrop__image"
          src={product.imageUrl}
          alt=""
          width={56}
          height={56}
          decoding="async"
        />
        <div className="backdrop__product">
          <p className="backdrop__name">{product.name}</p>
          <p className="backdrop__quantity">Quantity: {quantity}</p>
        </div>
        <button type="button" className="link-button" onClick={onEditOrder}>
          Edit order
        </button>
      </section>

      <section className="backdrop__front" aria-label="Payment summary">
        {quote.status === 'loading' && (
          <p className="checkout__hint">Calculating your total...</p>
        )}
        {quote.error && (
          <PaymentAlert
            message={errorMessage(quote.error)}
            action={
              isQuoteBlocking
                ? { label: 'Back to product', onClick: onLeave }
                : { label: 'Retry', onClick: onRetryQuote }
            }
          />
        )}

        {amounts && (
          <dl className="backdrop__breakdown">
            <div>
              <dt>Product</dt>
              <dd>{formatCents(amounts.productAmountCents)}</dd>
            </div>
            <div>
              <dt>Base fee</dt>
              <dd>{formatCents(amounts.baseFeeCents)}</dd>
            </div>
            <div>
              <dt>Delivery fee</dt>
              <dd>{formatCents(amounts.deliveryFeeCents)}</dd>
            </div>
            <div className="backdrop__total">
              <dt>Total</dt>
              <dd>{formatCents(amounts.totalAmountCents)}</dd>
            </div>
          </dl>
        )}

        <div className="backdrop__details">
          <div className="backdrop__detail">
            <div>
              <h3 className="backdrop__label">Deliver to</h3>
              <p>{shipping.address}</p>
              <p>
                {shipping.city}, {shipping.region} {shipping.postalCode}
              </p>
            </div>
            <button
              type="button"
              className="link-button"
              aria-label="Edit shipping info"
              onClick={() => onEdit(2)}
            >
              Edit
            </button>
          </div>
          <div className="backdrop__detail">
            <div>
              <h3 className="backdrop__label">Pay with</h3>
              <p className="backdrop__card">
                <CardBrandLogo brand={checkout.cardBrand} />
                <span>•••• {checkout.cardLast4}</span>
              </p>
              <p>
                {installments}{' '}
                {installments === 1 ? 'installment' : 'installments'}
              </p>
            </div>
            <button
              type="button"
              className="link-button"
              aria-label="Edit card info"
              onClick={() => onEdit(3)}
            >
              Edit
            </button>
          </div>
        </div>

        {!canPay && (
          <PaymentAlert
            message="Re-enter your card to pay."
            action={{ label: 'Enter card', onClick: () => onEdit(3) }}
          />
        )}

        <div className="checkout__actions">
          <button
            type="button"
            className="button button--secondary"
            disabled={isSubmitting}
            onClick={onBack}
          >
            Back
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!canPay || !amounts || isSubmitting}
            onClick={onPay}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting
              ? 'Processing...'
              : amounts
                ? `Pay ${formatCents(amounts.totalAmountCents)}`
                : 'Pay'}
          </button>
        </div>
      </section>
    </div>
  );
}
