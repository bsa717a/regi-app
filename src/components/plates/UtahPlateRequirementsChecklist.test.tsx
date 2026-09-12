import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UtahPlateRequirementsChecklist } from "./UtahPlateRequirementsChecklist";

describe("UtahPlateRequirementsChecklist", () => {
  it("lists the hard Utah personalized-plate constraints", () => {
    const html = renderToStaticMarkup(<UtahPlateRequirementsChecklist />);

    expect(html).toContain("Before you start");
    expect(html).toContain("Currently Utah-registered vehicle");
    expect(html).toContain("already be registered in Utah");
    expect(html).toContain("Letters and numbers only");
    expect(html).toContain("Punctuation");
    expect(html).toContain("Payment is not approval");
    expect(html).toContain("Paying the application fee does not mean");
    expect(html).toContain("Mailed in about 8 weeks");
    expect(html).toContain("mailed only");
  });

  it("accepts a summary heading for the handoff step", () => {
    const html = renderToStaticMarkup(
      <UtahPlateRequirementsChecklist heading="Remember" />,
    );
    expect(html).toContain("Remember");
    expect(html).not.toContain("Before you start");
  });
});
