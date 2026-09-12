/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { render } from "@/components/test/render";

const useAuth = vi.fn();

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => useAuth(),
}));

describe("EmailVerificationBanner", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    useAuth.mockReset();
  });

  it("hides when there is no user or the email is verified", async () => {
    useAuth.mockReturnValue({ user: null, resendVerificationEmail: vi.fn() });
    const missing = await render(<EmailVerificationBanner />);
    expect(
      missing.container.querySelector('[data-testid="email-verification-banner"]'),
    ).toBeNull();
    await missing.unmount();

    useAuth.mockReturnValue({
      user: { email: "alex@example.com", emailVerified: true },
      resendVerificationEmail: vi.fn(),
    });
    const verified = await render(<EmailVerificationBanner />);
    expect(
      verified.container.querySelector(
        '[data-testid="email-verification-banner"]',
      ),
    ).toBeNull();
    await verified.unmount();
  });

  it("shows the shared resend control when email is unverified", async () => {
    useAuth.mockReturnValue({
      user: { email: "alex@example.com", emailVerified: false },
      resendVerificationEmail: vi.fn(),
    });
    const { container, unmount } = await render(<EmailVerificationBanner />);

    expect(
      container.querySelector('[data-testid="email-verification-banner"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("Confirm alex@example.com");
    expect(
      container.querySelector('[data-testid="resend-verification-email"]')
        ?.textContent,
    ).toBe("Resend verification email");

    await unmount();
  });
});
