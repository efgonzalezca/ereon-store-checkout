import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { productSelected } from '@/features/products/state/products-slice';
import { Product } from '@/features/products/state/product.types';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { fetchProducts } from '@/features/products/state/products-slice';
import { Modal } from '@/shared/ui/modal';
import { CardSection } from './steps/card-section';
import { PaymentAlert } from './payment-alert';
import { PaymentBackdrop } from './payment-backdrop';
import {
  fetchQuote,
  selectQuote,
  selectSubmission,
  submitPayment,
} from '../state/payment-slice';
import { submissionMessage } from '../state/payment-errors';
import { useCardSession } from '../state/card-session';
import { FormApi } from '../form/checkout-form';
import {
  checkoutCancelled,
  customerChanged,
  detailsSubmitted,
  installmentsChanged,
  sectionChanged,
  selectCheckout,
  shippingChanged,
} from '../state/checkout-slice';
import {
  CheckoutSection,
  CustomerForm,
  DataSection,
  ShippingForm,
} from '../state/checkout.types';
import { CheckoutStepper } from './checkout-stepper';
import { CustomerSection } from './steps/customer-section';
import { OrderSummary } from './order-summary';
import { ShippingSection } from './steps/shipping-section';
import {
  errorMessage,
  FieldName,
  FieldValues,
  SECTION_FIELDS,
  sectionOf,
  validateCheckout,
} from '../form/validate-checkout';
import { detectCardBrand } from '../form/validators/card.validators';
import './checkout.css';

const CARD_CLEARED_NOTE = 'For your security, your card details were cleared.';

const CUSTOMER_FIELDS: readonly FieldName[] = [
  'documentType',
  'documentNumber',
  'fullName',
  'email',
  'phone',
];
const SHIPPING_FIELDS: readonly FieldName[] = [
  'address',
  'city',
  'region',
  'postalCode',
];

export function CheckoutModal({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const checkout = useAppSelector(selectCheckout);
  const {
    card,
    setCardField,
    tokens,
    tokensStatus,
    loadTokens,
    clearSensitive,
  } = useCardSession();
  const quote = useAppSelector(selectQuote);
  const submission = useAppSelector(selectSubmission);
  const formRef = useRef<HTMLFormElement>(null);
  const [touched, setTouched] = useState<ReadonlySet<FieldName>>(new Set());
  const [attempted, setAttempted] = useState<ReadonlySet<DataSection>>(
    new Set(),
  );
  const pendingFocus = useRef<FieldName | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);

  useEffect(() => {
    if (tokensStatus === 'idle') loadTokens();
  }, [tokensStatus, loadTokens]);

  const section = checkout.formSection;
  const isFirst = section === 1;
  const isLast = section === 3;

  useEffect(() => {
    if (section === 4) {
      void dispatch(
        fetchQuote({ productId: product.id, quantity: checkout.quantity }),
      );
    }
  }, [dispatch, section, product.id, checkout.quantity]);

  useEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    const control = pending && formRef.current?.elements.namedItem(pending);
    if (control instanceof HTMLElement) {
      control.focus();
    } else {
      formRef.current?.closest('dialog')?.scrollTo?.(0, 0);
    }
  }, [section]);

  const values: FieldValues = useMemo(
    () => ({
      ...checkout.customer,
      ...checkout.shipping,
      ...card,
      installments: String(checkout.installments),
    }),
    [checkout.customer, checkout.shipping, checkout.installments, card],
  );
  const errors = validateCheckout(values);

  const form: FormApi = {
    values,
    errorFor: (field) => {
      const code = errors[field];
      return code && (attempted.has(sectionOf(field)) || touched.has(field))
        ? errorMessage(field, code)
        : null;
    },
    touch: (field) => setTouched((current) => new Set(current).add(field)),
    setField: (field, value) => {
      if (CUSTOMER_FIELDS.includes(field)) {
        dispatch(customerChanged({ [field]: value } as Partial<CustomerForm>));
      } else if (SHIPPING_FIELDS.includes(field)) {
        dispatch(shippingChanged({ [field]: value } as Partial<ShippingForm>));
      } else if (field === 'installments') {
        dispatch(installmentsChanged(Number(value)));
      } else {
        setCardField(field as keyof typeof card, value);
      }
    },
  };

  const completed: Record<DataSection, boolean> = {
    1: SECTION_FIELDS[1].every((field) => errors[field] === null),
    2: SECTION_FIELDS[2].every((field) => errors[field] === null),
    3: SECTION_FIELDS[3].every((field) => errors[field] === null) && accepted,
  };
  const canOpenSummary = completed[1] && completed[2] && completed[3];
  const hasData = Object.entries(values).some(
    ([field, value]) =>
      field !== 'documentType' && field !== 'installments' && value !== '',
  );

  const discard = () => {
    dispatch(checkoutCancelled());
    dispatch(productSelected(product.id));
  };

  const leaveForProduct = () => {
    discard();
    void dispatch(fetchProducts());
  };

  const handlePay = async () => {
    if (!tokens) return;
    const [expMonth, expYear] = card.expiry.split('/');
    await dispatch(
      submitPayment({
        card: {
          number: card.cardNumber.replace(/\D/g, ''),
          cvc: card.cvc,
          expMonth,
          expYear,
          holder: card.cardHolder.trim(),
        },
        acceptanceToken: tokens.acceptanceToken,
        personalAuthToken: tokens.personalAuthToken,
      }),
    );
    clearSensitive();
    setAccepted(false);
    setTouched(new Set());
    setAttempted(new Set());
  };

  const alertMessage = submissionMessage(submission);

  useEffect(() => {
    if (alertMessage && section === 3) {
      const control = formRef.current?.elements.namedItem('cardNumber');
      if (control instanceof HTMLElement) control.focus();
    }
  }, [alertMessage, section]);

  const requestClose = () => (hasData ? setIsConfirmingClose(true) : discard());

  const goTo = (target: CheckoutSection) => {
    if (target !== 4) {
      dispatch(sectionChanged(target));
      return;
    }
    const brand = detectCardBrand(card.cardNumber);
    if (!brand) return;
    dispatch(
      detailsSubmitted({
        last4: card.cardNumber.replace(/\D/g, '').slice(-4),
        brand,
      }),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (section === 4) return;

    const scope = isLast ? ([1, 2, 3] as const) : ([section] as const);
    const invalid = scope
      .flatMap((s) => SECTION_FIELDS[s])
      .find((field) => errors[field] !== null);

    if (invalid) {
      const target = sectionOf(invalid);
      setAttempted((current) => new Set(current).add(section).add(target));
      if (target === section) {
        const control = formRef.current?.elements.namedItem(invalid);
        if (control instanceof HTMLElement) control.focus();
      } else {
        pendingFocus.current = invalid;
        goTo(target);
      }
      return;
    }

    goTo(isLast ? 4 : ((section + 1) as CheckoutSection));
  };

  return (
    <Modal
      labelledBy="checkout-title"
      onClose={discard}
      onCloseRequest={requestClose}
    >
      <form
        ref={formRef}
        className="checkout"
        noValidate
        onSubmit={handleSubmit}
      >
        <h2 id="checkout-title" className="checkout__title">
          Checkout
        </h2>

        <div className="checkout__layout">
          <div className="checkout__main">
            <CheckoutStepper
              current={section}
              completed={completed}
              canOpenSummary={canOpenSummary}
              onGo={goTo}
            />

            {alertMessage && (section === 3 || section === 4) && (
              <PaymentAlert
                message={alertMessage}
                note={CARD_CLEARED_NOTE}
                action={
                  submission.error === 'out_of_stock'
                    ? { label: 'Back to product', onClick: leaveForProduct }
                    : undefined
                }
              />
            )}
            {section === 1 && <CustomerSection form={form} />}
            {section === 2 && <ShippingSection form={form} />}
            {section === 3 && <CardSection form={form} />}
            {section === 4 && (
              <PaymentBackdrop
                product={product}
                checkout={checkout}
                quote={quote}
                submission={submission}
                canPay={canOpenSummary && tokensStatus === 'ready'}
                onEdit={goTo}
                onEditOrder={requestClose}
                onBack={() => goTo(3)}
                onPay={() => void handlePay()}
                onRetryQuote={() =>
                  void dispatch(
                    fetchQuote({
                      productId: product.id,
                      quantity: checkout.quantity,
                    }),
                  )
                }
                onLeave={leaveForProduct}
              />
            )}

            {isLast && (
              <div className="checkout__terms">
                <label className="checkout__terms-label">
                  <input
                    type="checkbox"
                    checked={accepted}
                    disabled={tokensStatus !== 'ready'}
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                  <span>
                    I accept the{' '}
                    {tokens ? (
                      <a
                        href={tokens.acceptancePermalink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        terms and conditions
                      </a>
                    ) : (
                      'terms and conditions'
                    )}{' '}
                    and the{' '}
                    {tokens ? (
                      <a
                        href={tokens.personalAuthPermalink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        personal data policy
                      </a>
                    ) : (
                      'personal data policy'
                    )}
                    .
                  </span>
                </label>
                {tokensStatus === 'loading' && (
                  <p className="checkout__hint">Loading terms...</p>
                )}
                {tokensStatus === 'failed' && (
                  <p role="alert" className="field__error">
                    Could not load the terms.{' '}
                    <button
                      type="button"
                      className="link-button"
                      onClick={loadTokens}
                    >
                      Retry
                    </button>
                  </p>
                )}
              </div>
            )}

            {section !== 4 && (
              <div className="checkout__actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={
                    isFirst
                      ? requestClose
                      : () => goTo((section - 1) as CheckoutSection)
                  }
                >
                  {isFirst ? 'Cancel' : 'Back'}
                </button>
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={isLast && (!accepted || tokensStatus !== 'ready')}
                >
                  {isLast ? 'Continue' : 'Next'}
                </button>
              </div>
            )}
          </div>

          {section !== 4 && (
            <OrderSummary product={product} quantity={checkout.quantity} />
          )}
        </div>
      </form>

      {isConfirmingClose && (
        <ConfirmDialog
          title="Discard checkout?"
          message="The information you entered will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={discard}
          onCancel={() => setIsConfirmingClose(false)}
        />
      )}
    </Modal>
  );
}
