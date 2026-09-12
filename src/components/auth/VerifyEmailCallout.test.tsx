/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { VerifyEmailCallout } from "@/components/auth/VerifyEmailCallout";
import { render } from "@/components/test/render";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ resendVerificationEmail: vi.fn() }),
}));

describe("VerifyEmailCallout", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a clear dashboard resend control", async () => {
    const { container, unmount } = await render(
      <VerifyEmailCallout email="alex@example.com" testId="dashboard-verify-email" />,
    );

    const card = container.querySelector('[data-testid="dashboard-verify-email"]');
    expect(card?.textContent).toContain("Confirm your email");
    expect(card?.textContent).toContain("Verify alex@example.com");
    expect(
      container.querySelector('[data-testid="resend-verification-email"]')
        ?.textContent,
    ).toBe("Resend verification email");

    await unmount();
  });
});
