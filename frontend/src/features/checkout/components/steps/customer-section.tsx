import { DOCUMENT_TYPES } from '../../state/checkout.constants';
import { FormApi } from '../../form/checkout-form';
import { Field } from '../../form/field';

const documentOptions = DOCUMENT_TYPES.map((type) => ({
  value: type,
  label: type,
}));

export function CustomerSection({ form }: { form: FormApi }) {
  return (
    <fieldset className="checkout-section">
      <legend className="sr-only">Personal info</legend>
      <div className="checkout-section__grid">
        <Field
          form={form}
          name="documentType"
          label="Document type"
          options={documentOptions}
        />
        <Field
          form={form}
          name="documentNumber"
          label="Document number"
          inputProps={{ autoComplete: 'off', maxLength: 30 }}
        />
        <Field
          form={form}
          name="fullName"
          label="Full name"
          inputProps={{ autoComplete: 'name', maxLength: 120 }}
        />
        <Field
          form={form}
          name="email"
          label="Email"
          inputProps={{ type: 'email', autoComplete: 'email', maxLength: 120 }}
        />
        <Field
          form={form}
          name="phone"
          label="Phone"
          inputProps={{ type: 'tel', autoComplete: 'tel', maxLength: 20 }}
        />
      </div>
    </fieldset>
  );
}
