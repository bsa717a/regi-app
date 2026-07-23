import type { RegistrationType } from "@prisma/client";

export type MaintenancePreset = {
  key: string;
  name: string;
  intervalMonths?: number;
  intervalHours?: number;
  intervalMiles?: number;
  notes?: string;
};

const PASSENGER_PRESETS: MaintenancePreset[] = [
  {
    key: "passenger_oil_change",
    name: "Oil change",
    intervalMonths: 6,
    intervalMiles: 5000,
  },
  {
    key: "passenger_tire_rotation",
    name: "Tire rotation",
    intervalMonths: 6,
    intervalMiles: 7500,
  },
  {
    key: "passenger_air_filter",
    name: "Engine air filter",
    intervalMonths: 12,
    intervalMiles: 15000,
  },
  {
    key: "passenger_cabin_filter",
    name: "Cabin air filter",
    intervalMonths: 12,
    intervalMiles: 15000,
  },
  {
    key: "passenger_brake_inspection",
    name: "Brake inspection",
    intervalMonths: 12,
    intervalMiles: 12000,
  },
  {
    key: "passenger_tire_replacement",
    name: "Tire replacement",
    intervalMonths: 48,
    intervalMiles: 50000,
  },
];

const MOTORHOME_PRESETS: MaintenancePreset[] = [
  {
    key: "motorhome_oil_change",
    name: "Engine oil change",
    intervalMonths: 6,
    intervalMiles: 5000,
  },
  {
    key: "motorhome_generator_service",
    name: "Generator service",
    intervalMonths: 12,
    intervalHours: 100,
  },
  {
    key: "motorhome_tire_inspection",
    name: "Tire inspection",
    intervalMonths: 6,
  },
  {
    key: "motorhome_roof_sealant",
    name: "Roof / sealant check",
    intervalMonths: 12,
  },
  {
    key: "motorhome_slide_lube",
    name: "Slide-out lubrication",
    intervalMonths: 6,
  },
  {
    key: "motorhome_winterization",
    name: "Winterization / de-winterization",
    intervalMonths: 12,
  },
];

const MOTORCYCLE_PRESETS: MaintenancePreset[] = [
  {
    key: "motorcycle_oil_change",
    name: "Oil & filter change",
    intervalMonths: 6,
    intervalMiles: 3000,
  },
  {
    key: "motorcycle_chain",
    name: "Chain clean & lube",
    intervalMiles: 500,
  },
  {
    key: "motorcycle_air_filter",
    name: "Air filter",
    intervalMonths: 12,
    intervalMiles: 10000,
  },
  {
    key: "motorcycle_tire_check",
    name: "Tire pressure & tread check",
    intervalMonths: 1,
  },
  {
    key: "motorcycle_brake_pads",
    name: "Brake pad inspection",
    intervalMonths: 12,
    intervalMiles: 8000,
  },
  {
    key: "motorcycle_coolant",
    name: "Coolant flush",
    intervalMonths: 24,
  },
];

const TRAILER_PRESETS: MaintenancePreset[] = [
  {
    key: "trailer_wheel_bearings",
    name: "Wheel bearing repack",
    intervalMonths: 12,
    intervalMiles: 12000,
  },
  {
    key: "trailer_hinge_lube",
    name: "Hinge / latch lubrication",
    intervalMonths: 6,
  },
  {
    key: "trailer_tires",
    name: "Tire inspection / replacement",
    intervalMonths: 6,
  },
  {
    key: "trailer_lights",
    name: "Lights & wiring check",
    intervalMonths: 6,
  },
  {
    key: "trailer_brake_adjustment",
    name: "Brake adjustment",
    intervalMonths: 12,
  },
  {
    key: "trailer_coupler",
    name: "Coupler & safety chain check",
    intervalMonths: 6,
  },
];

const OHV_PRESETS: MaintenancePreset[] = [
  {
    key: "ohv_oil_change",
    name: "Oil change",
    intervalHours: 15,
    notes: "Typical dirtbike / OHV interval — change every ~15 hours of ride time.",
  },
  {
    key: "ohv_air_filter",
    name: "Air filter clean / replace",
    intervalHours: 10,
  },
  {
    key: "ohv_chain",
    name: "Chain / drive clean & lube",
    intervalHours: 5,
  },
  {
    key: "ohv_tires",
    name: "Tire pressure & tread check",
    intervalHours: 10,
  },
  {
    key: "ohv_brake_pads",
    name: "Brake pad inspection",
    intervalHours: 25,
  },
  {
    key: "ohv_coolant",
    name: "Coolant check / flush",
    intervalHours: 50,
    intervalMonths: 12,
  },
  {
    key: "ohv_grease",
    name: "Grease fittings / pivots",
    intervalHours: 15,
  },
];

const SNOWMOBILE_PRESETS: MaintenancePreset[] = [
  {
    key: "snowmobile_oil_change",
    name: "Oil change",
    intervalHours: 50,
    intervalMonths: 12,
  },
  {
    key: "snowmobile_belt",
    name: "Drive belt inspection",
    intervalHours: 25,
  },
  {
    key: "snowmobile_track",
    name: "Track & suspension check",
    intervalHours: 25,
  },
  {
    key: "snowmobile_carb_tune",
    name: "Carb / EFI seasonal tune",
    intervalMonths: 12,
  },
  {
    key: "snowmobile_storage",
    name: "End-of-season storage prep",
    intervalMonths: 12,
  },
];

const BOAT_PRESETS: MaintenancePreset[] = [
  {
    key: "boat_oil_change",
    name: "Engine oil change",
    intervalHours: 50,
    intervalMonths: 12,
  },
  {
    key: "boat_impeller",
    name: "Water pump impeller",
    intervalHours: 100,
    intervalMonths: 12,
  },
  {
    key: "boat_winterization",
    name: "Winterization",
    intervalMonths: 12,
  },
  {
    key: "boat_lower_unit",
    name: "Lower unit gear oil",
    intervalHours: 100,
    intervalMonths: 12,
  },
  {
    key: "boat_trailer_bearings",
    name: "Trailer wheel bearings",
    intervalMonths: 12,
  },
  {
    key: "boat_zincs",
    name: "Anodes / zincs",
    intervalMonths: 12,
  },
];

const PRESETS_BY_TYPE: Record<RegistrationType, MaintenancePreset[]> = {
  passenger: PASSENGER_PRESETS,
  motorhome: MOTORHOME_PRESETS,
  motorcycle: MOTORCYCLE_PRESETS,
  trailer: TRAILER_PRESETS,
  ohv: OHV_PRESETS,
  snowmobile: SNOWMOBILE_PRESETS,
  boat: BOAT_PRESETS,
};

export function presetsForRegistrationType(
  type: RegistrationType,
): MaintenancePreset[] {
  return PRESETS_BY_TYPE[type] ?? [];
}

export function findPreset(
  type: RegistrationType,
  presetKey: string,
): MaintenancePreset | null {
  return (
    presetsForRegistrationType(type).find((p) => p.key === presetKey) ?? null
  );
}
