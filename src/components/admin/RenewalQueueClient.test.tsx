/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/components/test/render";
import { RenewalQueueClient } from "./RenewalQueueClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    getIdToken: () => new Promise<string>(() => {}),
  }),
}));

describe("RenewalQueueClient", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a table skeleton while the queue loads", async () => {
    const { container, unmount } = await render(<RenewalQueueClient />);

    const skeleton = container.querySelector(
      '[data-testid="admin-queue-skeleton"]',
    );
    expect(skeleton).toBeTruthy();
    expect(skeleton?.getAttribute("aria-busy")).toBe("true");
    expect(skeleton?.getAttribute("aria-label")).toBe("Loading queue");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(container.textContent).toContain("Active");
    expect(container.textContent).toContain("Vehicle");

    await unmount();
  });
});
