import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UtahBackToGarageLink } from "./UtahBackToGarageLink";

describe("UtahBackToGarageLink", () => {
  it("points at the garage home route", () => {
    const html = renderToStaticMarkup(<UtahBackToGarageLink />);

    expect(html).toContain('href="/garage"');
    expect(html).toContain("Back to garage");
    expect(html).toContain('data-testid="plates-back-to-garage"');
  });

  it("renders a button-styled exit for the Order Plates end screen", () => {
    const html = renderToStaticMarkup(
      <UtahBackToGarageLink variant="button" testId="plates-back-to-garage-end" />,
    );

    expect(html).toContain('href="/garage"');
    expect(html).toContain("Back to garage");
    expect(html).not.toContain("←");
    expect(html).toContain('data-testid="plates-back-to-garage-end"');
  });
});
