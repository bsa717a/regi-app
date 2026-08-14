import type { RegistrationType } from "@prisma/client";

export type ManualLibraryInput = {
  type: RegistrationType;
  make: string | null;
  model: string | null;
  year: number | null;
};

export type ManualLibraryMatch = {
  label: string;
  url: string;
  pdfLikely: boolean;
};

type ManualLibraryEntry = {
  types: RegistrationType[];
  makeAliases: string[];
  label: string;
  libraryUrl: string;
  pdfLikely: boolean;
  deepLink?: (input: ManualLibraryInput) => string | null;
};

function normalizeMake(make: string): string {
  return make.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function fordModelSlug(model: string): string {
  return model.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const PASSENGER_LIBRARIES: ManualLibraryEntry[] = [
  {
    types: ["passenger"],
    makeAliases: ["toyota", "lexus"],
    label: "Toyota Owners manuals",
    libraryUrl: "https://www.toyota.com/owners/warranty-owners-manuals/",
    pdfLikely: false,
    deepLink: (input) => {
      if (!input.year || !input.model?.trim()) return null;
      if (normalizeMake(input.make ?? "") === "lexus") {
        return `https://www.lexus.com/My-Lexus/resources/owners-manuals?year=${input.year}`;
      }
      return `https://www.toyota.com/owners/warranty-owners-manuals/vehicle/${slugPart(input.model)}/${input.year}/`;
    },
  },
  {
    types: ["passenger"],
    makeAliases: ["ford", "lincoln"],
    label: "Ford Owner Manuals Library",
    libraryUrl: "https://www.ford.com/support/owner-manuals/",
    pdfLikely: true,
    deepLink: (input) => {
      if (!input.year || !input.model?.trim()) return null;
      const slug = fordModelSlug(input.model);
      return `https://www.ford.com/support/owner-manuals/${input.year}-${slug}-owners-manual`;
    },
  },
  {
    types: ["passenger"],
    makeAliases: ["honda", "acura"],
    label: "Honda Owners manuals",
    libraryUrl: "https://owners.honda.com/vehicles/information/manuals",
    pdfLikely: true,
  },
  {
    types: ["passenger"],
    makeAliases: ["chevrolet", "chevy", "gmc", "buick", "cadillac"],
    label: "GM Owner Manuals",
    libraryUrl: "https://my.gm.com/home/owners-manuals",
    pdfLikely: true,
  },
  {
    types: ["passenger"],
    makeAliases: ["nissan", "infiniti"],
    label: "Nissan Owner Manuals",
    libraryUrl: "https://owners.nissanusa.com/nowners/ownership/owners-manuals",
    pdfLikely: false,
  },
  {
    types: ["passenger"],
    makeAliases: ["hyundai", "genesis"],
    label: "Hyundai Owner Manuals",
    libraryUrl: "https://owners.hyundaiusa.com/us/en/resources/owners-manual.html",
    pdfLikely: false,
  },
  {
    types: ["passenger"],
    makeAliases: ["kia"],
    label: "Kia Owner Manuals",
    libraryUrl: "https://owners.kia.com/us/en/resources/owners-manual.html",
    pdfLikely: false,
  },
  {
    types: ["passenger"],
    makeAliases: ["subaru"],
    label: "Subaru Owner Manuals",
    libraryUrl: "https://www.subaru.com/owners/vehicle-resources/manuals.html",
    pdfLikely: true,
  },
  {
    types: ["passenger"],
    makeAliases: ["mazda"],
    label: "Mazda Owner Manuals",
    libraryUrl: "https://www.mazdausa.com/owners/vehicle-resources/manuals",
    pdfLikely: true,
  },
  {
    types: ["passenger"],
    makeAliases: ["volkswagen", "vw", "audi"],
    label: "VW Owner Manuals",
    libraryUrl: "https://www.vw.com/en/owners-and-services/owners/ownership/manuals.html",
    pdfLikely: true,
  },
  {
    types: ["passenger"],
    makeAliases: ["bmw"],
    label: "BMW Owner Manuals",
    libraryUrl: "https://www.bmwusa.com/owners/manuals.html",
    pdfLikely: true,
  },
  {
    types: ["passenger"],
    makeAliases: ["mercedes", "mercedesbenz", "mercedes-benz"],
    label: "Mercedes-Benz Owner Manuals",
    libraryUrl: "https://www.mbusa.com/en/owners/manuals",
    pdfLikely: true,
  },
  {
    types: ["passenger"],
    makeAliases: ["rivian"],
    label: "Rivian Support",
    libraryUrl: "https://rivian.com/support",
    pdfLikely: true,
  },
  {
    types: ["passenger"],
    makeAliases: ["tesla"],
    label: "Tesla Support",
    libraryUrl: "https://www.tesla.com/support",
    pdfLikely: false,
  },
];

const MOTORCYCLE_LIBRARIES: ManualLibraryEntry[] = [
  {
    types: ["motorcycle"],
    makeAliases: ["honda"],
    label: "Honda Powersports Owner Manuals",
    libraryUrl: "https://powersports.honda.com/downloads/owners-manuals",
    pdfLikely: true,
  },
  {
    types: ["motorcycle"],
    makeAliases: ["harley", "harleydavidson", "harley-davidson"],
    label: "Harley-Davidson Owner Manuals",
    libraryUrl: "https://www.harley-davidson.com/us/en/ownership/owners-manuals.html",
    pdfLikely: true,
  },
  {
    types: ["motorcycle"],
    makeAliases: ["yamaha"],
    label: "Yamaha Owner Manuals",
    libraryUrl: "https://www.yamaha-motor.com/owner-resources/manuals",
    pdfLikely: true,
  },
  {
    types: ["motorcycle"],
    makeAliases: ["kawasaki"],
    label: "Kawasaki Owner Manuals",
    libraryUrl: "https://www.kawasaki.com/en-us/owner-center/manuals",
    pdfLikely: true,
  },
  {
    types: ["motorcycle"],
    makeAliases: ["suzuki"],
    label: "Suzuki Owner Manuals",
    libraryUrl: "https://suzukicycles.com/owners-manuals",
    pdfLikely: true,
  },
  {
    types: ["motorcycle"],
    makeAliases: ["indian", "indianmotorcycle"],
    label: "Indian Motorcycle Owner Manuals",
    libraryUrl: "https://www.indianmotorcycle.com/en-us/owner-resources/",
    pdfLikely: true,
  },
  {
    types: ["motorcycle"],
    makeAliases: ["ducati"],
    label: "Ducati Owner Manuals",
    libraryUrl: "https://www.ducati.com/us/en/owners/owners-manuals",
    pdfLikely: true,
  },
  {
    types: ["motorcycle"],
    makeAliases: ["triumph"],
    label: "Triumph Owner Manuals",
    libraryUrl: "https://www.triumphmotorcycles.com/owners/manuals",
    pdfLikely: true,
  },
  {
    types: ["motorcycle"],
    makeAliases: ["ktm"],
    label: "KTM Owner Manuals",
    libraryUrl: "https://www.ktm.com/en-us/owner-resources.html",
    pdfLikely: true,
  },
];

const OHV_LIBRARIES: ManualLibraryEntry[] = [
  {
    types: ["ohv"],
    makeAliases: ["polaris"],
    label: "Polaris Owner Manuals",
    libraryUrl: "https://www.polaris.com/en-us/owner-resources/manuals/",
    pdfLikely: true,
  },
  {
    types: ["ohv"],
    makeAliases: ["canam", "can-am", "brp"],
    label: "Can-Am Owner Manuals",
    libraryUrl: "https://can-am.brp.com/off-road/us/en/owner-resources/manuals.html",
    pdfLikely: true,
  },
  {
    types: ["ohv"],
    makeAliases: ["honda"],
    label: "Honda Powersports Owner Manuals",
    libraryUrl: "https://powersports.honda.com/downloads/owners-manuals",
    pdfLikely: true,
  },
  {
    types: ["ohv"],
    makeAliases: ["kawasaki"],
    label: "Kawasaki Owner Manuals",
    libraryUrl: "https://www.kawasaki.com/en-us/owner-center/manuals",
    pdfLikely: true,
  },
  {
    types: ["ohv"],
    makeAliases: ["yamaha"],
    label: "Yamaha Owner Manuals",
    libraryUrl: "https://www.yamaha-motor.com/owner-resources/manuals",
    pdfLikely: true,
  },
  {
    types: ["ohv"],
    makeAliases: ["arcticcat", "arctic-cat"],
    label: "Arctic Cat Owner Manuals",
    libraryUrl: "https://www.arcticcat.com/owner-resources",
    pdfLikely: true,
  },
];

const SNOWMOBILE_LIBRARIES: ManualLibraryEntry[] = [
  {
    types: ["snowmobile"],
    makeAliases: ["polaris"],
    label: "Polaris Owner Manuals",
    libraryUrl: "https://www.polaris.com/en-us/owner-resources/manuals/",
    pdfLikely: true,
  },
  {
    types: ["snowmobile"],
    makeAliases: ["skidoo", "ski-doo", "brp"],
    label: "Ski-Doo Owner Manuals",
    libraryUrl: "https://www.ski-doo.com/us/en/owner-resources/manuals.html",
    pdfLikely: true,
  },
  {
    types: ["snowmobile"],
    makeAliases: ["arcticcat", "arctic-cat"],
    label: "Arctic Cat Owner Manuals",
    libraryUrl: "https://www.arcticcat.com/owner-resources",
    pdfLikely: true,
  },
];

const MOTORHOME_LIBRARIES: ManualLibraryEntry[] = [
  {
    types: ["motorhome"],
    makeAliases: ["winnebago"],
    label: "Winnebago Owner Resources",
    libraryUrl: "https://www.winnebago.com/Files/Files/Winnebago/Manuals",
    pdfLikely: true,
  },
  {
    types: ["motorhome"],
    makeAliases: ["forestriver", "forest-river"],
    label: "Forest River Owner Manuals",
    libraryUrl: "https://www.forestriverinc.com/Owners-Manuals",
    pdfLikely: true,
  },
  {
    types: ["motorhome"],
    makeAliases: ["jayco"],
    label: "Jayco Owner Manuals",
    libraryUrl: "https://www.jayco.com/owners/manuals/",
    pdfLikely: true,
  },
  {
    types: ["motorhome"],
    makeAliases: ["thor"],
    label: "Thor Motor Coach Owner Manuals",
    libraryUrl: "https://www.thormotorcoach.com/owners/manuals",
    pdfLikely: true,
  },
  {
    types: ["motorhome"],
    makeAliases: ["newmar"],
    label: "Newmar Owner Manuals",
    libraryUrl: "https://www.newmar.com/owners/manuals",
    pdfLikely: true,
  },
  {
    types: ["motorhome"],
    makeAliases: ["tiffin"],
    label: "Tiffin Owner Manuals",
    libraryUrl: "https://www.tiffinmotorhomes.com/owners/manuals",
    pdfLikely: true,
  },
  {
    types: ["motorhome"],
    makeAliases: ["fleetwood"],
    label: "Fleetwood Owner Manuals",
    libraryUrl: "https://www.fleetwoodrv.com/owners/manuals",
    pdfLikely: true,
  },
];

const BOAT_LIBRARIES: ManualLibraryEntry[] = [
  {
    types: ["boat"],
    makeAliases: ["mercury", "mercurymarine"],
    label: "Mercury Marine Owner Manuals",
    libraryUrl: "https://www.mercurymarine.com/en/us/owners/manuals",
    pdfLikely: true,
  },
  {
    types: ["boat"],
    makeAliases: ["honda"],
    label: "Honda Marine Owner Manuals",
    libraryUrl: "https://marine.honda.com/support/manuals",
    pdfLikely: true,
  },
  {
    types: ["boat"],
    makeAliases: ["bostonwhaler", "boston-whaler"],
    label: "Boston Whaler Owner Manuals",
    libraryUrl: "https://www.bostonwhaler.com/ownership/owners-manuals",
    pdfLikely: true,
  },
  {
    types: ["boat"],
    makeAliases: ["seadoo", "sea-doo", "brp"],
    label: "Sea-Doo Owner Manuals",
    libraryUrl: "https://www.sea-doo.com/us/en/owner-resources/manuals.html",
    pdfLikely: true,
  },
  {
    types: ["boat"],
    makeAliases: ["mastercraft"],
    label: "MasterCraft Owner Manuals",
    libraryUrl: "https://www.mastercraft.com/owners/manuals",
    pdfLikely: true,
  },
];

const TRAILER_LIBRARIES: ManualLibraryEntry[] = [
  {
    types: ["trailer"],
    makeAliases: ["airstream"],
    label: "Airstream Owner Manuals",
    libraryUrl: "https://www.airstream.com/owners/manuals/",
    pdfLikely: true,
  },
  {
    types: ["trailer"],
    makeAliases: ["jayco"],
    label: "Jayco Owner Manuals",
    libraryUrl: "https://www.jayco.com/owners/manuals/",
    pdfLikely: true,
  },
];

const TYPE_DEFAULT_LIBRARIES: Record<RegistrationType, ManualLibraryMatch> = {
  passenger: {
    label: "Printed owner manuals (Helm Inc.)",
    url: "https://www.helminc.com/",
    pdfLikely: false,
  },
  motorcycle: {
    label: "Honda Powersports Owner Manuals",
    url: "https://powersports.honda.com/downloads/owners-manuals",
    pdfLikely: true,
  },
  ohv: {
    label: "Polaris Owner Manuals",
    url: "https://www.polaris.com/en-us/owner-resources/manuals/",
    pdfLikely: true,
  },
  snowmobile: {
    label: "Polaris Owner Manuals",
    url: "https://www.polaris.com/en-us/owner-resources/manuals/",
    pdfLikely: true,
  },
  motorhome: {
    label: "Winnebago Owner Resources",
    url: "https://www.winnebago.com/Files/Files/Winnebago/Manuals",
    pdfLikely: true,
  },
  boat: {
    label: "Mercury Marine Owner Manuals",
    url: "https://www.mercurymarine.com/en/us/owners/manuals",
    pdfLikely: true,
  },
  trailer: {
    label: "Helm Inc. owner manuals",
    url: "https://www.helminc.com/",
    pdfLikely: false,
  },
};

const ALL_LIBRARIES: ManualLibraryEntry[] = [
  ...PASSENGER_LIBRARIES,
  ...MOTORCYCLE_LIBRARIES,
  ...OHV_LIBRARIES,
  ...SNOWMOBILE_LIBRARIES,
  ...MOTORHOME_LIBRARIES,
  ...BOAT_LIBRARIES,
  ...TRAILER_LIBRARIES,
];

function matchesMake(entry: ManualLibraryEntry, make: string | null): boolean {
  if (!make?.trim()) return false;
  const normalized = normalizeMake(make);
  return entry.makeAliases.some((alias) => normalizeMake(alias) === normalized);
}

function entryToMatch(
  entry: ManualLibraryEntry,
  input: ManualLibraryInput,
): ManualLibraryMatch {
  const deepLink = entry.deepLink?.(input);
  return {
    label: entry.label,
    url: deepLink ?? entry.libraryUrl,
    pdfLikely: entry.pdfLikely,
  };
}

/** Resolve the official OEM manuals location for a registration. */
export function resolveOfficialManualLibrary(
  input: ManualLibraryInput,
): ManualLibraryMatch {
  const makeMatch = ALL_LIBRARIES.find(
    (entry) => entry.types.includes(input.type) && matchesMake(entry, input.make),
  );
  if (makeMatch) return entryToMatch(makeMatch, input);

  return TYPE_DEFAULT_LIBRARIES[input.type];
}
