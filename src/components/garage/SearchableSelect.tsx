"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  fieldClassName,
  labelClassName,
} from "@/components/auth/AuthFormStyles";

type SearchableSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  getOptionLabel?: (value: string) => string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
};

export function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  getOptionLabel = (option) => option,
  placeholder = "Search…",
  disabled = false,
  required = false,
  emptyMessage = "No matches",
  loading = false,
  loadingMessage = "Loading…",
}: SearchableSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.toLowerCase().includes(needle) ||
        getOptionLabel(option).toLowerCase().includes(needle),
    );
  }, [getOptionLabel, options, query]);

  const inputValue = open
    ? query
    : value
      ? getOptionLabel(value)
      : "";

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function selectOption(option: string) {
    onChange(option);
    setQuery(getOptionLabel(option));
    setOpen(false);
    setHighlight(0);
  }

  function onInputFocus() {
    if (disabled || loading) return;
    setOpen(true);
    setQuery(value ? getOptionLabel(value) : "");
    setHighlight(0);
  }

  function onInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    setHighlight(0);
    if (value && next !== getOptionLabel(value)) {
      onChange("");
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled || loading) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) =>
        Math.min(current + 1, Math.max(filtered.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && open && filtered[highlight]) {
      event.preventDefault();
      selectOption(filtered[highlight]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setQuery(value ? getOptionLabel(value) : "");
      setHighlight(0);
    }
  }

  const showList = open && !disabled && !loading;

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        className={fieldClassName}
        value={inputValue}
        onChange={(event) => onInputChange(event.target.value)}
        onFocus={onInputFocus}
        onKeyDown={onKeyDown}
        placeholder={loading ? loadingMessage : placeholder}
        disabled={disabled || loading}
      />
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={value}
          onChange={() => {}}
          required
        />
      ) : null}
      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-slate-500">{emptyMessage}</li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option}
                role="option"
                aria-selected={option === value}
                className={`cursor-pointer px-3.5 py-2 text-base ${
                  index === highlight
                    ? "bg-teal-50 text-teal-900"
                    : option === value
                      ? "bg-slate-50 font-medium text-slate-900"
                      : "text-slate-900 hover:bg-slate-50"
                }`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlight(index)}
              >
                {getOptionLabel(option)}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
