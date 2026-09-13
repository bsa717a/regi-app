/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/components/test/render";
import { AdminUsersClient } from "./AdminUsersClient";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    getIdToken: () => new Promise<string>(() => {}),
  }),
}));

describe("AdminUsersClient", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a table skeleton while users load", async () => {
    const { container, unmount } = await render(<AdminUsersClient />);

    const skeleton = container.querySelector(
      '[data-testid="admin-users-skeleton"]',
    );
    expect(skeleton).toBeTruthy();
    expect(skeleton?.getAttribute("aria-busy")).toBe("true");
    expect(skeleton?.getAttribute("aria-label")).toBe("Loading users");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      1,
    );
    expect(
      container.querySelector('input[aria-label="Filter users by email or name"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("Name");
    expect(container.textContent).not.toContain("Loading users…");

    await unmount();
  });
});
