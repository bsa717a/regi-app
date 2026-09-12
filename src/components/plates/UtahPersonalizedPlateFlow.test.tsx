/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { UtahPersonalizedPlateFlow } from "./UtahPersonalizedPlateFlow";

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderFlow() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<UtahPersonalizedPlateFlow />);
  });
  return container;
}

function click(el: Element) {
  return act(async () => {
    (el as HTMLElement).click();
  });
}

function setFieldValue(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const proto =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  descriptor?.set?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

describe("UtahPersonalizedPlateFlow", () => {
  it("walks type → combos → meaning → checks → fees → MVP handoff", async () => {
    const view = await renderFlow();

    expect(view.textContent).toContain("Currently Utah-registered vehicle");
    expect(view.textContent).toContain("Payment is not approval");
    expect(view.textContent).toContain("Mailed in about 8 weeks");
    expect(view.textContent).toContain("Letters and numbers only");

    await click(view.querySelector("button") as HTMLButtonElement);

    const firstChoice = view.querySelector("#utah-combo-0") as HTMLInputElement;
    expect(firstChoice).toBeTruthy();

    await act(async () => {
      setFieldValue(firstChoice, "REGI-1");
    });

    const continueButtons = () =>
      Array.from(view.querySelectorAll("button")).filter((button) =>
        /continue|see mvp summary/i.test(button.textContent ?? ""),
      );

    await click(continueButtons()[0] as HTMLButtonElement);
    expect(view.textContent).toMatch(/punctuation/i);

    await act(async () => {
      setFieldValue(
        view.querySelector("#utah-combo-0") as HTMLInputElement,
        "REGI01",
      );
    });

    await click(continueButtons()[0] as HTMLButtonElement);

    const meaning = view.querySelector(
      "#utah-plate-meaning",
    ) as HTMLTextAreaElement;
    expect(meaning).toBeTruthy();

    await act(async () => {
      setFieldValue(meaning, "Family nickname");
    });

    await click(continueButtons()[0] as HTMLButtonElement);
    expect(view.textContent).toContain("Soft content check");
    expect(view.textContent).toContain("REGI01");

    await click(continueButtons()[0] as HTMLButtonElement);
    expect(view.textContent).toContain("Fee estimate");
    expect(view.textContent).toContain("$50.00");
    expect(view.textContent).toContain("$25.00");
    expect(view.textContent).toContain("$10.00");
    expect(view.textContent).toMatch(/estimates only/i);
    expect(view.textContent).toMatch(/does not mean/i);

    await click(continueButtons()[0] as HTMLButtonElement);
    expect(view.textContent).toContain("Enter this in Utah MVP");
    expect(view.textContent).toContain("Choice 1: REGI01");
    expect(view.textContent).toContain("Family nickname");
    expect(view.innerHTML).toContain("https://dmv.utah.gov/plates/personalized/");
    expect(view.innerHTML).toContain("https://mvp.tax.utah.gov/");
    expect(view.textContent).toContain("TC-817 is not required");
  });
});
