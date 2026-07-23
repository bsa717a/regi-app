/** Convert a base64 image payload into a File for upload/preview. */
export function base64ToImageFile(input: {
  base64: string;
  mimeType: string;
  filename?: string;
}): File {
  const binary = atob(input.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const mimeType = input.mimeType.trim().toLowerCase() || "image/jpeg";
  const ext =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : "jpg";
  const filename = input.filename?.trim() || `document-scan.${ext}`;

  return new File([bytes], filename.replace(/\.[^.]+$/, "") + `.${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export async function fileToPreparedBase64(file: File): Promise<{
  file: File;
  base64: string;
  mimeType: string;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image file"));
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return {
    file,
    base64,
    mimeType: file.type || "image/jpeg",
  };
}
