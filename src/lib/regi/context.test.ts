import { describe, expect, it } from "vitest";
import { cannedRegiReply, isCompleteRegiMessage, isTruncatedRegiMessage } from "@/lib/ai/regiChat";
import { buildQuickActions } from "@/lib/regi/context";
import { REGI_APP_FEATURES_REPLY } from "@/lib/regi/constants";
import type { RegiGarageContext } from "@/lib/regi/types";

const emptyGarage: RegiGarageContext = {
  userFirstName: "Derek",
  vehicleCount: 0,
  documentCount: 0,
  soonestExpiration: null,
  vehicles: [],
};

const garageWithVehicles: RegiGarageContext = {
  ...emptyGarage,
  vehicleCount: 2,
  documentCount: 3,
  soonestExpiration: {
    id: "reg_1",
    label: "2021 Chevy Tahoe",
    type: "passenger",
    state: "UT",
    year: 2021,
    make: "Chevrolet",
    model: "Tahoe",
    plate: "ABC123",
    status: "Expiring soon",
    daysUntilExpiration: 12,
    expiresOn: "2026-08-04",
    documentCount: 2,
  },
  vehicles: [],
};

describe("buildQuickActions", () => {
  it("includes expiring chip when the garage has vehicles", () => {
    expect(buildQuickActions(garageWithVehicles)).toEqual([
      "What's expiring?",
      "App features",
    ]);
  });

  it("only shows app features for an empty garage", () => {
    expect(buildQuickActions(emptyGarage)).toEqual(["App features"]);
  });
});

describe("cannedRegiReply", () => {
  it("returns the app features guide", () => {
    expect(cannedRegiReply("App features")).toBe(REGI_APP_FEATURES_REPLY);
  });
});

describe("isTruncatedRegiMessage", () => {
  it("detects cut-off replies", () => {
    expect(isTruncatedRegiMessage("That doesn")).toBe(true);
    expect(
      isTruncatedRegiMessage("Hey Derek! Looks like your Truck registration"),
    ).toBe(true);
  });

  it("accepts short but complete sentences", () => {
    expect(isTruncatedRegiMessage("Derek, check the Garage tab.")).toBe(false);
  });

  it("accepts multi-line listings without terminal punctuation", () => {
    expect(
      isTruncatedRegiMessage(
        "Here's what's on the board:\n2021 Chevy Tahoe: expiring soon, 12 day(s) (2026-08-04)",
      ),
    ).toBe(false);
  });
});

describe("isCompleteRegiMessage", () => {
  it("rejects truncated greetings", () => {
    expect(isCompleteRegiMessage("Hey Derek! Looks like your Truck registration")).toBe(
      false,
    );
    expect(isCompleteRegiMessage("That doesn")).toBe(false);
  });

  it("accepts finished sentences", () => {
    expect(
      isCompleteRegiMessage(
        "Hey Derek — your Truck registration is up in 12 days. Want a rundown?",
      ),
    ).toBe(true);
  });
});
