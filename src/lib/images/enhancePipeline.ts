import { ApiError, enhanceDocumentImage } from "@/lib/api/client";
import { base64ToImageFile } from "@/lib/images/base64File";
import {
  prepareScanImage,
  type PreparedScanImage,
} from "@/lib/images/compress";

export type EnhanceChoice = {
  original: PreparedScanImage;
  enhanced: PreparedScanImage | null;
  enhanceError: string | null;
};

/**
 * Compress, then attempt server-side document enhance.
 * On enhance failure, returns original with an error message so callers can continue.
 * Enhanced output is re-compressed so upload/OCR size limits still apply.
 */
export async function prepareAndEnhanceDocument(input: {
  token: string;
  file: File;
}): Promise<EnhanceChoice> {
  const original = await prepareScanImage(input.file);
  try {
    const enhanced = await enhanceDocumentImage(input.token, {
      imageBase64: original.base64,
      mimeType: original.mimeType,
    });
    const enhancedFile = base64ToImageFile({
      base64: enhanced.imageBase64,
      mimeType: enhanced.mimeType,
      filename: original.file.name.replace(/\.[^.]+$/, "") + "-scan",
    });
    const preparedEnhanced = await prepareScanImage(enhancedFile);
    return {
      original,
      enhanced: preparedEnhanced,
      enhanceError: null,
    };
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Could not enhance this photo";
    return {
      original,
      enhanced: null,
      enhanceError: message,
    };
  }
}
