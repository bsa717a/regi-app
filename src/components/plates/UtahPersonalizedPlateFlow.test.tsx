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
  it("shows official plate previews with meaningful alt text on the type step", async () => {
    const view = await renderFlow();

    const arches = view.querySelector(
      'img[alt="Utah Life Elevated Arches license plate"]',
    ) as HTMLImageElement;
    const skier = view.querySelector(
      'img[alt="Utah Life Elevated Skier license plate"]',
    ) as HTMLImageElement;
    const igwt = view.querySelector(
      'img[alt="Utah In God We Trust license plate"]',
    ) as HTMLImageElement;

    expect(arches?.src).toMatch(/life-elevated-arches\.png$/);
    expect(skier?.src).toMatch(/life-elevated-skier\.png$/);
    expect(igwt?.src).toMatch(/in-god-we-trust\.png$/);
    expect(view.querySelector('img[alt="Utah amateur radio specialty license plate"]')).toBeTruthy();
    expect(view.querySelector('img[alt="Utah Search and Rescue specialty license plate"]')).toBeTruthy();
    expect(view.querySelector('img[alt="Utah disabled person license plate"]')).toBeTruthy();
    expect(
      view.querySelector('img[alt="Utah Wildlife Elk special group license plate"]'),
    ).toBeTruthy();
    expect(
      view.querySelector('img[alt="Utah Jazz special group license plate"]'),
    ).toBeTruthy();
    expect(
      view.querySelector(
        'img[alt="Utah Historic Black and White special group license plate"]',
      ),
    ).toBeTruthy();
    expect(view.textContent).toContain("Special group designs");
    expect(view.textContent).toContain("Plate images are official Utah DMV catalog art.");
  });

  it("lets Derek pick a specific special-group design instead of one example bucket", async () => {
    const view = await renderFlow();

    expect(
      view.querySelector('[data-testid="utah-plate-type-special_group"]'),
    ).toBeNull();

    const elk = view.querySelector(
      '[data-testid="utah-plate-type-special_group_wildlife_elk"]',
    ) as HTMLElement;
    const historic = view.querySelector(
      '[data-testid="utah-plate-type-special_group_historic_bw"]',
    ) as HTMLElement;
    expect(elk).toBeTruthy();
    expect(historic).toBeTruthy();

    await click(elk);
    expect(
      elk.querySelector<HTMLInputElement>('input[name="utah-plate-type"]')
        ?.checked,
    ).toBe(true);
    expect(
      historic.querySelector<HTMLInputElement>('input[name="utah-plate-type"]')
        ?.checked,
    ).toBe(false);

    await click(historic);
    expect(
      historic.querySelector<HTMLInputElement>('input[name="utah-plate-type"]')
        ?.checked,
    ).toBe(true);
    expect(
      elk.querySelector<HTMLInputElement>('input[name="utah-plate-type"]')
        ?.checked,
    ).toBe(false);

    await click(view.querySelector('[data-testid="plates-continue"]') as HTMLElement);
    expect(view.textContent).toMatch(/Historic B&W allows up to 7 characters/i);
    expect(
      view.querySelector('[data-testid="selected-plate-design"]')?.textContent,
    ).toMatch(/Historic B&W/);
  });

  it("enforces Wildlife Elk 5-character and Historic B&W 7-character limits", async () => {
    const view = await renderFlow();

    await click(
      view.querySelector(
        '[data-testid="utah-plate-type-special_group_wildlife_elk"]',
      ) as HTMLElement,
    );
    await click(view.querySelector('[data-testid="plates-continue"]') as HTMLElement);
    expect(view.textContent).toMatch(/Wildlife Elk allows up to 5 characters/i);

    const firstChoice = () =>
      view.querySelector("#utah-combo-0") as HTMLInputElement;
    await act(async () => {
      setFieldValue(firstChoice(), "ELK012");
    });
    await click(view.querySelector('[data-testid="plates-continue"]') as HTMLElement);
    expect(view.textContent).toMatch(/up to 5 characters/i);
    expect(view.querySelector("#utah-combo-0")).toBeTruthy();

    const back = Array.from(view.querySelectorAll("button")).find((button) =>
      /back/i.test(button.textContent ?? ""),
    );
    await click(back as HTMLElement);
    await click(
      view.querySelector(
        '[data-testid="utah-plate-type-special_group_historic_bw"]',
      ) as HTMLElement,
    );
    await click(view.querySelector('[data-testid="plates-continue"]') as HTMLElement);
    expect(view.textContent).toMatch(/Historic B&W allows up to 7 characters/i);

    await act(async () => {
      setFieldValue(firstChoice(), "HISTOR1");
    });
    await click(view.querySelector('[data-testid="plates-continue"]') as HTMLElement);
    expect(view.querySelector("#utah-plate-meaning")).toBeTruthy();
  });

  it("keeps plate-type selection working after choosing a preview card", async () => {
    const view = await renderFlow();
    const igwtImage = view.querySelector(
      'img[alt="Utah In God We Trust license plate"]',
    ) as HTMLImageElement;
    const igwtLabel = igwtImage.closest("label");
    expect(igwtLabel).toBeTruthy();

    await click(igwtLabel as HTMLElement);

    const radios = Array.from(
      view.querySelectorAll<HTMLInputElement>('input[name="utah-plate-type"]'),
    );
    const checked = radios.find((radio) => radio.checked);
    expect(checked?.closest("label")?.textContent).toContain("In God We Trust");

    await click(view.querySelector("button") as HTMLButtonElement);
    expect(view.textContent).toMatch(/In God We Trust allows up to 5 characters/i);
    expect(
      view.querySelector('img[alt="Utah In God We Trust license plate"]'),
    ).toBeTruthy();
  });

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
    expect(view.textContent).toContain("Design id: standard_life_elevated_arches");
    expect(view.textContent).toContain("Family nickname");
    expect(view.innerHTML).toContain("https://dmv.utah.gov/plates/personalized/");
    expect(view.innerHTML).toContain("https://mvp.tax.utah.gov/");
    expect(view.textContent).toContain("TC-817 is not required");
  });
});
