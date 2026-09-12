/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResendVerificationEmailButton } from "@/components/auth/ResendVerificationEmailButton";
import { click, render } from "@/components/test/render";

const resendVerificationEmail = vi.fn();

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ resendVerificationEmail }),
}));

describe("ResendVerificationEmailButton", () => {
  beforeEach(() => {
    resendVerificationEmail.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("sends a verification email and shows success plus cooldown", async () => {
    resendVerificationEmail.mockResolvedValue(undefined);
    const { container, unmount } = await render(
      <ResendVerificationEmailButton />,
    );

    const button = container.querySelector(
      '[data-testid="resend-verification-email"]',
    );
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.textContent).toBe("Resend verification email");

    await click(button as HTMLButtonElement);
    expect(resendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Verification email sent");
    expect(button?.textContent).toBe("Resend in 60s");
    expect((button as HTMLButtonElement).disabled).toBe(true);

    await unmount();
  });

  it("shows an error when resend fails", async () => {
    resendVerificationEmail.mockRejectedValue(
      new Error("Too many requests. Please try again shortly."),
    );
    const { container, unmount } = await render(
      <ResendVerificationEmailButton variant="link" />,
    );

    await click(
      container.querySelector(
        '[data-testid="resend-verification-email"]',
      ) as HTMLButtonElement,
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe(
      "Too many requests. Please try again shortly.",
    );

    await unmount();
  });
});
