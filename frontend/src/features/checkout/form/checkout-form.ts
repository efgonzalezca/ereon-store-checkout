import { FieldName, FieldValues } from './validate-checkout';

export interface FormApi {
  values: FieldValues;
  /** Error message to display for a field, or null when it should stay quiet. */
  errorFor: (field: FieldName) => string | null;
  setField: (field: FieldName, value: string) => void;
  touch: (field: FieldName) => void;
}
