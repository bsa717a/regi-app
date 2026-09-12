/** @vitest-environment jsdom */

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";

function Boom(): never {
  throw new Error("preview crashed");
}

function Ok() {
  return <p>preview ok</p>;
}

describe("FeatureErrorBoundary", () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  function render(node: ReactNode) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(node);
    });
  }

  it("renders children when nothing throws", () => {
    render(
      <FeatureErrorBoundary feature="document-preview">
        <Ok />
      </FeatureErrorBoundary>,
    );

    expect(container.textContent).toContain("preview ok");
  });

  it("shows a fallback and reports when a child throws", () => {
    const onError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <FeatureErrorBoundary feature="document-preview" onError={onError}>
        <Boom />
      </FeatureErrorBoundary>,
    );

    expect(container.textContent).toMatch(/something went wrong in document preview/i);
    expect(container.textContent).toMatch(/try again/i);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toBe("preview crashed");

    consoleError.mockRestore();
  });

  it("resets after Try again when the child recovers", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;

    function Flaky() {
      if (shouldThrow) throw new Error("upload crashed");
      return <p>upload recovered</p>;
    }

    render(
      <FeatureErrorBoundary feature="document-upload">
        <Flaky />
      </FeatureErrorBoundary>,
    );

    expect(container.textContent).toMatch(/document vault/i);

    shouldThrow = false;
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
    act(() => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("upload recovered");
    consoleError.mockRestore();
  });
});
