import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UtahDmvHandoff } from "./UtahDmvHandoff";

describe("UtahDmvHandoff", () => {
  it("opens the official personalized-plates page and MVP without promising prefill", () => {
    const html = renderToStaticMarkup(<UtahDmvHandoff />);

    expect(html).toContain("https://dmv.utah.gov/plates/personalized/");
    expect(html).toContain("https://mvp.tax.utah.gov/");
    expect(html).toContain("Open personalized plates info");
    expect(html).toContain("Open Utah MVP");
    expect(html).toContain("does not send this to the DMV");
    expect(html).toContain("TC-817 is not required");
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener noreferrer");
  });
});
