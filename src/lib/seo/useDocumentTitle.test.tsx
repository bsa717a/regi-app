/** @vitest-environment jsdom */

import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/components/test/render";
import { useDocumentTitle } from "@/lib/seo/useDocumentTitle";

function TitleProbe({ segment }: { segment: string }) {
  useDocumentTitle(segment);
  return null;
}

/** Parent effects run after the hook, same as Next's post-effect metadata write. */
function MetadataOverwrite({ segment }: { segment: string }) {
  useEffect(() => {
    document.title = "Your Garage · REGI";
  }, []);
  return <TitleProbe segment={segment} />;
}

describe("useDocumentTitle", () => {
  afterEach(() => {
    document.title = "REGI";
    document.body.innerHTML = "";
  });

  it("replaces the metadata title and puts it back if metadata overwrites it", async () => {
    document.title = "Your Garage · REGI";
    const { unmount } = await render(
      <MetadataOverwrite segment="Derek's Garage" />,
    );
    expect(document.title).toBe("Derek's Garage · REGI");

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.title).toBe("Derek's Garage · REGI");

    // Soft navigation writes the next title before this effect cleans up.
    document.title = "Settings · REGI";
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.title).toBe("Settings · REGI");

    await unmount();
  });
});
