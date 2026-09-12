import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UtahDmvHandoff } from "./UtahDmvHandoff";

describe("UtahDmvHandoff", () => {
  it("opens Order Plates — not the MVP homepage — and does not promise prefill", () => {
    const html = renderToStaticMarkup(<UtahDmvHandoff />);

    expect(html).toContain("https://mvp.tax.utah.gov/?Link=OrderPlates");
    expect(html).toContain("https://mvp.tax.utah.gov/?link=WhereIsYourPlate");
    expect(html).toContain("https://dmv.utah.gov/plates/personalized/");
    expect(html).toContain("Open Order Plates");
    expect(html).toContain("Where is your plate?");
    expect(html).toContain("Open personalized plates info");
    expect(html).toContain("Get to payment");
    expect(html).toContain("does not send this to the DMV");
    expect(html).toContain("prefill MVP");
    expect(html).toContain("skip payment");
    expect(html).toContain("TC-817 is not required");
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener noreferrer");
    expect(html).not.toContain('href="https://mvp.tax.utah.gov/"');
  });

  it("lists the numbered Get to payment checklist", () => {
    const html = renderToStaticMarkup(<UtahDmvHandoff />);

    expect(html).toContain("Open Order Plates");
    expect(html).toContain("last 4 VIN");
    expect(html).toContain("reCAPTCHA");
    expect(html).toContain("Enter personalized choices from the packet");
    expect(html).toContain("Complete payment on MVP");
    expect(html).toContain("other tab");
  });
});
