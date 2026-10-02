/**
 * Step 2 of the garage photo pipeline: a raster of this exact model
 * when no free photo exists.
 *
 * Gemini image generation is already wired for document scans, and it is
 * a paid API. This project does not call paid image services, and no
 * unpaid generator is configured. The call site records that and the
 * card keeps the generic body-type raster.
 */
export function unpaidModelRenderAvailable(): boolean {
  return false;
}

export async function generateModelRender(): Promise<null> {
  return null;
}
