/**
 * Save a file: build a blob URL and trigger a download. Prepends a UTF-8 BOM
 * for CSV so Excel on Windows detects the encoding.
 */
export const save = (filename: string, content: string | Blob, mimeType: string): void => {
  const bom = typeof content === "string" && mimeType.startsWith("text/csv") ? "\uFEFF" : "";
  const blob =
    typeof content === "string" ? new Blob([bom + content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

/**
 * Convert an SVG string to a PNG blob (preserves transparency). Mirrors
 * streamdown's svgToPngBlob.
 */
export const svgToPngBlob = (svgString: string, options?: { scale?: number }): Promise<Blob> => {
  const scale = options?.scale ?? 5;

  return new Promise((resolve, reject) => {
    const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.width * scale;
      const h = img.height * scale;

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to create 2D canvas context for PNG export"));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create PNG blob"));
          return;
        }
        resolve(blob);
      }, "image/png");
    };

    img.onerror = () => reject(new Error("Failed to load SVG image"));
    img.src = encoded;
  });
};

// Shared scroll lock with reference counting so nested overlays don't
// prematurely unlock each other.
let scrollLockCount = 0;

export const lockBodyScroll = (): void => {
  scrollLockCount += 1;
  if (scrollLockCount === 1) {
    document.body.style.overflow = "hidden";
  }
};

export const unlockBodyScroll = (): void => {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = "";
  }
};
