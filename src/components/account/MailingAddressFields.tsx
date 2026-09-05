import {
  fieldClassName,
  labelClassName,
  selectClassName,
} from "@/components/auth/AuthFormStyles";
import { US_STATES } from "@/lib/registrations/states";

export type MailingAddressFormValue = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  addressState: string;
  postalCode: string;
};

export function mailingAddressFormValue(input: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  addressState?: string | null;
  postalCode?: string | null;
}): MailingAddressFormValue {
  return {
    addressLine1: input.addressLine1 ?? "",
    addressLine2: input.addressLine2 ?? "",
    city: input.city ?? "",
    addressState: input.addressState ?? "",
    postalCode: input.postalCode ?? "",
  };
}

export function MailingAddressFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: MailingAddressFormValue;
  onChange: (next: MailingAddressFormValue) => void;
}) {
  function patch(partial: Partial<MailingAddressFormValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-line1`} className={labelClassName}>
          Street address
        </label>
        <input
          id={`${idPrefix}-line1`}
          value={value.addressLine1}
          onChange={(e) => patch({ addressLine1: e.target.value })}
          className={fieldClassName}
          autoComplete="address-line1"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-line2`} className={labelClassName}>
          Apt, suite, unit
        </label>
        <input
          id={`${idPrefix}-line2`}
          value={value.addressLine2}
          onChange={(e) => patch({ addressLine2: e.target.value })}
          className={fieldClassName}
          autoComplete="address-line2"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label htmlFor={`${idPrefix}-city`} className={labelClassName}>
            City
          </label>
          <input
            id={`${idPrefix}-city`}
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
            className={fieldClassName}
            autoComplete="address-level2"
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor={`${idPrefix}-state`} className={labelClassName}>
            State
          </label>
          <select
            id={`${idPrefix}-state`}
            value={value.addressState}
            onChange={(e) => patch({ addressState: e.target.value })}
            className={selectClassName}
            autoComplete="address-level1"
          >
            <option value="">—</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.code}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${idPrefix}-zip`} className={labelClassName}>
            ZIP
          </label>
          <input
            id={`${idPrefix}-zip`}
            value={value.postalCode}
            onChange={(e) => patch({ postalCode: e.target.value })}
            className={fieldClassName}
            autoComplete="postal-code"
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
}
