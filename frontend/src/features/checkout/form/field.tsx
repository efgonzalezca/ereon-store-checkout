import { InputHTMLAttributes, ReactNode, useId } from 'react';
import { FieldName } from './validate-checkout';
import { FormApi } from './checkout-form';

interface FieldProps {
  form: FormApi;
  name: FieldName;
  label: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  format?: (value: string) => string;
  adornment?: ReactNode;
}

export function Field({
  form,
  name,
  label,
  options,
  inputProps,
  format,
  adornment,
}: FieldProps) {
  const id = useId();
  const error = form.errorFor(name);
  const errorId = `${id}-error`;
  const common = {
    id,
    name,
    value: form.values[name],
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    onBlur: () => form.touch(name),
  };

  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <div className="field__control">
        {options ? (
          <select
            {...common}
            className="field__input"
            onChange={(event) => form.setField(name, event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...inputProps}
            {...common}
            className="field__input"
            onChange={(event) =>
              form.setField(
                name,
                format ? format(event.target.value) : event.target.value,
              )
            }
          />
        )}
        {adornment}
      </div>
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
