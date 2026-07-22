/**
 * Client-side downscale/recompress before a screenshot ever hits the network.
 *
 * Multiple full-res phone screenshots (a tall scrolling capture can be
 * 3-8MB+ each) add up fast now that /analyze accepts an unlimited count per
 * read - a handful of them can push a single POST into the tens of MB, which
 * risks a 413 from the hosting gateway in front of the FastAPI backend (and
 * is just slow to upload on mobile data regardless). Re-encoding as JPEG at a
 * capped long edge keeps text/UI screenshots visually lossless while cutting
 * their size by 10x or more.
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;
/** Below this, the size/quality tradeoff isn't worth the recompression pass. */
const SKIP_IF_UNDER_BYTES = 600_000;

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < SKIP_IF_UNDER_BYTES) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    // Re-encoding can occasionally bloat an already-efficient format (or the
    // canvas path can fail silently) - only use it if it actually helped.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // Decode failure (e.g. a format the browser's canvas can't rasterize) -
    // fall back to the original bytes rather than blocking the upload.
    return file;
  }
}

export async function compressImages(files: File[]): Promise<Blob[]> {
  return Promise.all(files.map(compressImage));
}
