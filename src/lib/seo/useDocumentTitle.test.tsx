/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/components/test/render";
import { useDocumentTitle } from "@/lib/seo/useDocumentTitle";

function TitleProbe({ segment }: { segment: string }) {
  useDocumentTitle(segment);
  return null;
}

describe("useDocumentTitle", () => {
  afterEach(() => {
    document.title = "REGI";
    document.body.innerHTML = "";
  });

  it("replaces the metadata title and puts it back if metadata overwrites it", async () => {
    document.title = "Your Garage · REGI";
    const { unmount } = await render(<TitleProbe segment="Derek's Garage" />);
    expect(document.title).toBe("Derek's Garage · REGI");

    document.title = "Your Garage · REGI";
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.title).toBe("Derek's Garage · REGI");

    await unmount();
    document.title = "Settings · REGI";
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.title).toBe("Settings · REGI");
  });
});
