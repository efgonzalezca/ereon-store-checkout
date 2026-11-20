import { CheckoutState } from './checkout.types';
import { DOCUMENT_TYPES, INSTALLMENTS_MAX } from './checkout.constants';
import { initialCheckoutState } from './checkout-slice';

export const CHECKOUT_STORAGE_KEY = 'ereon.checkout.v1';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const nullableText = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

export function parseCheckoutState(raw: unknown): CheckoutState {
  if (!isRecord(raw)) return initialCheckoutState;

  const customer = isRecord(raw.customer) ? raw.customer : {};
  const shipping = isRecord(raw.shipping) ? raw.shipping : {};
  const documentType = DOCUMENT_TYPES.find((d) => d === customer.documentType);
  const installments = Number(raw.installments);
  const quantity = Number(raw.quantity);
  const last4 = nullableText(raw.cardLast4);
  const productId = nullableText(raw.productId);
  const traceId = nullableText(raw.traceId);
  const reference = nullableText(raw.reference);
  const requestedSection =
    raw.formSection === 2 || raw.formSection === 3 || raw.formSection === 4
      ? raw.formSection
      : 1;

  if (raw.step !== 2 || !productId || !traceId || !reference) {
    return initialCheckoutState;
  }

  const formSection = requestedSection === 4 && !last4 ? 3 : requestedSection;

  return {
    step: 2,
    formSection,
    productId,
    quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
    traceId,
    reference,
    transactionId: nullableText(raw.transactionId),
    customer: {
      documentType: documentType ?? 'CC',
      documentNumber: text(customer.documentNumber),
      fullName: text(customer.fullName),
      email: text(customer.email),
      phone: text(customer.phone),
    },
    shipping: {
      address: text(shipping.address),
      city: text(shipping.city),
      region: text(shipping.region),
      postalCode: text(shipping.postalCode),
    },
    installments:
      Number.isInteger(installments) &&
      installments >= 1 &&
      installments <= INSTALLMENTS_MAX
        ? installments
        : 1,
    cardLast4: last4 && /^\d{4}$/.test(last4) ? last4 : null,
    cardBrand:
      raw.cardBrand === 'VISA' || raw.cardBrand === 'MASTERCARD'
        ? raw.cardBrand
        : null,
  };
}

export function loadCheckoutState(storage: StorageLike | null): CheckoutState {
  try {
    const stored = storage?.getItem(CHECKOUT_STORAGE_KEY);
    return stored
      ? parseCheckoutState(JSON.parse(stored))
      : initialCheckoutState;
  } catch {
    return initialCheckoutState;
  }
}

export function saveCheckoutState(
  storage: StorageLike | null,
  state: CheckoutState,
): void {
  try {
    if (state.step === 1) {
      storage?.removeItem(CHECKOUT_STORAGE_KEY);
    } else {
      storage?.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Storage can be unavailable or full; the checkout keeps working in memory.
  }
}
