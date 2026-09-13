/** @vitest-environment jsdom */

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirebaseError } from "firebase/app";
import { GarageDoorLogin } from "@/components/auth/GarageDoorLogin";
import { render } from "@/components/test/render";

vi.mock("next/link", () => ({
  default: function Link({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: unknown;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const signIn = vi.fn();

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ signIn }),
}));

vi.mock("next/image", () => ({
  default: function MockImage() {
    return null;
  },
}));

function setInputValue(input: HTMLInputElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  proto?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function fillAndSubmit(
  container: HTMLElement,
  email: string,
  password: string,
) {
  const emailInput = container.querySelector(
    '[data-testid="login-email"]',
  ) as HTMLInputElement;
  const passwordInput = container.querySelector(
    '[data-testid="login-password"]',
  ) as HTMLInputElement;
  await act(async () => {
    setInputValue(emailInput, email);
    setInputValue(passwordInput, password);
  });
  const form = container.querySelector(
    '[data-testid="login-form"]',
  ) as HTMLFormElement;
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}

describe("GarageDoorLogin", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    signIn.mockReset();
  });

  it("keeps Forgot password as its own control under the password field", async () => {
    const { container, unmount } = await render(<GarageDoorLogin />);

    const password = container.querySelector('[data-testid="login-password"]');
    const forgot = container.querySelector(
      '[data-testid="login-forgot-password"]',
    ) as HTMLAnchorElement;
    expect(forgot).not.toBeNull();
    expect(forgot.getAttribute("href")).toBe("/forgot-password");
    expect(forgot.textContent).toBe("Forgot password?");
    expect(forgot.className).toMatch(/text-base/);
    expect(forgot.className).toMatch(/font-semibold/);
    expect(forgot.className).toMatch(/underline/);
    expect(
      password?.compareDocumentPosition(forgot) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    const passwordLabel = container.querySelector('label[for="password"]');
    expect(passwordLabel?.nextElementSibling).toBe(password);

    await unmount();
  });

  it("shows a reset CTA after a wrong-password style failure", async () => {
    signIn.mockRejectedValue(
      new FirebaseError("auth/invalid-credential", "bad creds"),
    );
    const { container, unmount } = await render(<GarageDoorLogin />);

    await fillAndSubmit(container, "alex@example.com", "nope");

    const alert = container.querySelector('[data-testid="login-error"]');
    expect(alert?.textContent).toMatch(/email or password/i);
    const reset = container.querySelector(
      '[data-testid="login-error-forgot-password"]',
    ) as HTMLAnchorElement;
    expect(reset?.getAttribute("href")).toBe("/forgot-password");
    expect(reset?.textContent).toBe("Reset your password");

    await unmount();
  });

  it("points unknown emails at create account", async () => {
    signIn.mockRejectedValue(
      new FirebaseError("auth/user-not-found", "missing"),
    );
    const { container, unmount } = await render(<GarageDoorLogin />);

    await fillAndSubmit(container, "nobody@example.com", "secret1");

    const alert = container.querySelector('[data-testid="login-error"]');
    expect(alert?.textContent).toMatch(/No REGI account/i);
    expect(
      container.querySelector('[data-testid="login-error-forgot-password"]'),
    ).toBeNull();
    const signup = container.querySelector(
      '[data-testid="login-error-create-account"]',
    ) as HTMLAnchorElement;
    expect(signup?.getAttribute("href")).toBe("/signup");

    await unmount();
  });
});
