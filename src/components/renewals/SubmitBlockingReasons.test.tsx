/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { SubmitBlockingReasons } from "@/components/renewals/SubmitBlockingReasons";
import { render } from "@/components/test/render";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ resendVerificationEmail: vi.fn() }),
}));

describe("SubmitBlockingReasons", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing when submit is allowed", async () => {
    const { container, unmount } = await render(
      <SubmitBlockingReasons
        emailVerified
        documentsComplete
        needsCounty={false}
        countySelected={false}
        missingDocumentLabels={[]}
      />,
    );

    expect(
      container.querySelector('[data-testid="submit-blocking-reasons"]'),
    ).toBeNull();
    await unmount();
  });

  it("explains email, emissions, and county blockers and offers resend", async () => {
    const { container, unmount } = await render(
      <SubmitBlockingReasons
        emailVerified={false}
        documentsComplete={false}
        needsCounty
        countySelected={false}
        missingDocumentLabels={["Emissions certificate"]}
      />,
    );

    const box = container.querySelector(
      '[data-testid="submit-blocking-reasons"]',
    );
    expect(box?.textContent).toContain("Complete these items to submit");
    expect(box?.textContent).toContain("Verify your email first");
    expect(box?.textContent).toContain("Missing Emissions certificate");
    expect(box?.textContent).toContain("Select a registration county");
    expect(
      container.querySelector('[data-testid="resend-verification-email"]'),
    ).not.toBeNull();

    await unmount();
  });

  it("omits resend when email is already verified", async () => {
    const { container, unmount } = await render(
      <SubmitBlockingReasons
        emailVerified
        documentsComplete={false}
        needsCounty={false}
        countySelected={false}
        missingDocumentLabels={["Registration card"]}
      />,
    );

    expect(container.textContent).toContain("Missing Registration card");
    expect(
      container.querySelector('[data-testid="resend-verification-email"]'),
    ).toBeNull();

    await unmount();
  });
});
