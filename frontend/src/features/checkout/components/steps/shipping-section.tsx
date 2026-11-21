import { FormApi } from '../../form/checkout-form';
import { Field } from '../../form/field';

export function ShippingSection({ form }: { form: FormApi }) {
  return (
    <fieldset className="checkout-section">
      <legend className="sr-only">Shipping info</legend>
      <div className="checkout-section__grid">
        <Field
          form={form}
          name="address"
          label="Address"
          inputProps={{ autoComplete: 'street-address', maxLength: 160 }}
        />
        <Field
          form={form}
          name="city"
          label="City"
          inputProps={{ autoComplete: 'address-level2', maxLength: 80 }}
        />
        <Field
          form={form}
          name="region"
          label="Region"
          inputProps={{ autoComplete: 'address-level1', maxLength: 80 }}
        />
        <Field
          form={form}
          name="postalCode"
          label="Postal code"
          inputProps={{ autoComplete: 'postal-code', maxLength: 10 }}
        />
      </div>
    </fieldset>
  );
}
