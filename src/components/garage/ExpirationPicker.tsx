"use client";

import { selectClassName } from "@/components/auth/AuthFormStyles";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const expirationSelectClassName = `${selectClassName} mt-0 rounded-2xl font-semibold`;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function ExpirationPicker({
  value,
  onChange,
}: {
  /** YYYY-MM-DD */
  value: string;
  onChange: (next: string) => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 1 + i);

  const [yearStr, monthStr, dayStr] = value
    ? value.split("-")
    : ["", "", ""];
  const year = yearStr ? Number(yearStr) : currentYear + 1;
  const month = monthStr ? Number(monthStr) : now.getMonth() + 1;
  const maxDay = daysInMonth(year, month);
  const day = dayStr ? Math.min(Number(dayStr), maxDay) : maxDay;

  function emit(nextYear: number, nextMonth: number, nextDay: number) {
    const capped = Math.min(nextDay, daysInMonth(nextYear, nextMonth));
    onChange(`${nextYear}-${pad(nextMonth)}-${pad(capped)}`);
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">
        Registration expires
      </legend>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Month
          </span>
          <select
            className={expirationSelectClassName}
            value={month}
            onChange={(e) => emit(year, Number(e.target.value), day)}
            aria-label="Expiration month"
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Year
          </span>
          <select
            className={expirationSelectClassName}
            value={year}
            onChange={(e) => emit(Number(e.target.value), month, day)}
            aria-label="Expiration year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Day
          </span>
          <select
            className={expirationSelectClassName}
            value={Math.min(day, maxDay)}
            onChange={(e) => emit(year, month, Number(e.target.value))}
            aria-label="Expiration day"
          >
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-slate-500">
        Pick the date on your registration card. Month and year first — day is
        usually month-end.
      </p>
    </fieldset>
  );
}
