"use client";

import { useEffect, useMemo, useState } from "react";
import {
  labelClassName,
  selectClassName,
} from "@/components/auth/AuthFormStyles";
import { SearchableSelect } from "@/components/garage/SearchableSelect";
import {
  ApiError,
  listVehicleMakes,
  listVehicleModels,
  type VehicleMakeDto,
} from "@/lib/api/client";
import { titleCaseMakeModel } from "@/lib/registrations/illustrations";
import { passengerModelYears } from "@/lib/vehicles/nhtsaCatalog";

type YearMakeModelPickersProps = {
  year: string;
  make: string;
  model: string;
  onYearChange: (value: string) => void;
  onMakeChange: (value: string) => void;
  onModelChange: (value: string) => void;
  getToken: () => Promise<string>;
};


function formatOptionLabel(value: string): string {
  return titleCaseMakeModel(value) || value;
}

export function YearMakeModelPickers({
  year,
  make,
  model,
  onYearChange,
  onMakeChange,
  onModelChange,
  getToken,
}: YearMakeModelPickersProps) {
  const years = useMemo(() => passengerModelYears(), []);
  const [makes, setMakes] = useState<VehicleMakeDto[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [makesError, setMakesError] = useState<string | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMakes() {
      setLoadingMakes(true);
      setMakesError(null);
      try {
        const token = await getToken();
        const loaded = await listVehicleMakes(token);
        if (cancelled) return;
        setMakes(loaded);
      } catch (err) {
        if (cancelled) return;
        setMakesError(
          err instanceof ApiError
            ? err.message
            : "Could not load vehicle makes.",
        );
      } finally {
        if (!cancelled) setLoadingMakes(false);
      }
    }

    void loadMakes();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const parsedYear = useMemo(() => {
    const value = Number.parseInt(year, 10);
    return Number.isInteger(value) ? value : null;
  }, [year]);

  const canLoadModels = Boolean(make.trim() && parsedYear != null);

  useEffect(() => {
    if (!canLoadModels || parsedYear == null) return;

    let cancelled = false;

    async function loadModels() {
      setLoadingModels(true);
      setModelsError(null);
      try {
        const token = await getToken();
        const loaded = await listVehicleModels(token, make, parsedYear);
        if (cancelled) return;
        setModels(loaded.map((entry) => entry.name));
      } catch (err) {
        if (cancelled) return;
        setModelsError(
          err instanceof ApiError
            ? err.message
            : "Could not load models for that make and year.",
        );
        setModels([]);
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, [canLoadModels, getToken, make, parsedYear]);

  const makeOptions = useMemo(() => {
    const names = makes.map((entry) => entry.name);
    if (make.trim() && !names.some((n) => n.toLowerCase() === make.toLowerCase())) {
      return [make, ...names];
    }
    return names;
  }, [make, makes]);

  const modelOptions = useMemo(() => {
    const available = canLoadModels ? models : [];
    if (model.trim() && !available.some((n) => n.toLowerCase() === model.toLowerCase())) {
      return [model, ...available];
    }
    return available;
  }, [canLoadModels, model, models]);

  function onYearSelect(value: string) {
    onYearChange(value);
    onModelChange("");
  }

  function onMakeSelect(value: string) {
    onMakeChange(value);
    onModelChange("");
  }

  const modelPlaceholder =
    !make || !year
      ? "Select year and make first"
      : loadingModels
        ? "Loading models…"
        : modelOptions.length === 0
          ? "No models found for this year"
          : "Search model";

  return (
    <div className="space-y-4">
      {makesError ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {makesError}
        </p>
      ) : null}
      {modelsError ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {modelsError}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label htmlFor="ymm-year" className={labelClassName}>
            Year
          </label>
          <select
            id="ymm-year"
            className={selectClassName}
            value={year}
            onChange={(e) => onYearSelect(e.target.value)}
            required
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <SearchableSelect
            id="ymm-make"
            label="Make"
            value={make}
            onChange={onMakeSelect}
            options={makeOptions}
            getOptionLabel={formatOptionLabel}
            placeholder="Search make"
            loading={loadingMakes}
            loadingMessage="Loading makes…"
            emptyMessage="No makes found"
            required
          />
        </div>
      </div>

      <SearchableSelect
        id="ymm-model"
        label="Model"
        value={model}
        onChange={onModelChange}
        options={modelOptions}
        getOptionLabel={formatOptionLabel}
        placeholder={modelPlaceholder}
        disabled={!make || !year}
        loading={loadingModels}
        loadingMessage="Loading models…"
        emptyMessage="No models found for this year"
        required
      />
    </div>
  );
}
