import {
  INSTALLMENTS_MAX,
  INSTALLMENTS_MIN,
} from '../../state/checkout.constants';
import { CardBrandLogo } from '../card-brand-logo';
import { FormApi } from '../../form/checkout-form';
import { Field } from '../../form/field';
import { detectCardBrand } from '../../form/validators/card.validators';

const installmentOptions = Array.from(
  { length: INSTALLMENTS_MAX - INSTALLMENTS_MIN + 1 },
  (_, index) => {
    const value = String(INSTALLMENTS_MIN + index);
    return { value, label: value };
  },
);

const formatCardNumber = (value: string): string =>
  (
    value
      .replace(/\D/g, '')
      .slice(0, 19)
      .match(/.{1,4}/g) ?? []
  ).join(' ');

const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
};

const formatCvc = (value: string): string =>
  value.replace(/\D/g, '').slice(0, 3);

export function CardSection({ form }: { form: FormApi }) {
  const brand = detectCardBrand(form.values.cardNumber);

  return (
    <fieldset className="checkout-section">
      <legend className="sr-only">Card info</legend>
      <div className="checkout-section__grid">
        <Field
          form={form}
          name="cardNumber"
          label="Card number"
          format={formatCardNumber}
          adornment={<CardBrandLogo brand={brand} />}
          inputProps={{
            inputMode: 'numeric',
            autoComplete: 'cc-number',
            placeholder: '0000 0000 0000 0000',
          }}
        />
        <Field
          form={form}
          name="cardHolder"
          label="Name on card"
          inputProps={{ autoComplete: 'cc-name', maxLength: 80 }}
        />
        <Field
          form={form}
          name="expiry"
          label="Expiry (MM/YY)"
          format={formatExpiry}
          inputProps={{
            inputMode: 'numeric',
            autoComplete: 'cc-exp',
            placeholder: 'MM/YY',
          }}
        />
        <Field
          form={form}
          name="cvc"
          label="CVC"
          format={formatCvc}
          inputProps={{
            inputMode: 'numeric',
            autoComplete: 'cc-csc',
            placeholder: '123',
          }}
        />
        <Field
          form={form}
          name="installments"
          label="Installments"
          options={installmentOptions}
        />
      </div>
    </fieldset>
  );
}
