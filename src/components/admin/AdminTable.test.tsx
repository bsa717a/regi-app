/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/components/test/render";
import { AdminTable, AdminTableSkeleton } from "./AdminTable";

describe("AdminTableSkeleton", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders pulse table chrome without decorative SVG", async () => {
    const { container, unmount } = await render(
      <AdminTableSkeleton
        headers={["Vehicle", "Status", "Owner", ""]}
        rows={3}
        label="Loading queue"
        testId="admin-queue-skeleton"
      />,
    );

    const region = container.querySelector(
      '[data-testid="admin-queue-skeleton"]',
    );
    expect(region?.getAttribute("role")).toBe("status");
    expect(region?.getAttribute("aria-busy")).toBe("true");
    expect(region?.getAttribute("aria-label")).toBe("Loading queue");
    expect(region?.textContent).toContain("Loading queue");
    expect(container.querySelector("svg")).toBeNull();

    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(12);
    expect(container.textContent).toContain("Vehicle");
    expect(container.textContent).toContain("Status");

    await unmount();
  });
});

describe("AdminTable", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders headers and rows", async () => {
    const { container, unmount } = await render(
      <AdminTable headers={["Name", "Email"]}>
        <tr>
          <td>Ada</td>
          <td>ada@example.com</td>
        </tr>
      </AdminTable>,
    );

    expect(container.textContent).toContain("Name");
    expect(container.textContent).toContain("Ada");
    await unmount();
  });
});
