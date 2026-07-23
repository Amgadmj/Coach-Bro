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

const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "mif1",
  "msf1",
]);

/**
 * iOS's default photo format (HEIC/HEIF) isn't rasterizable by every browser's
 * canvas, and the backend only accepts it after server-side conversion - so it
 * must always be routed through the re-encode path below regardless of size,
 * never skipped by the SKIP_IF_UNDER_BYTES fast-path. Checked by declared type
 * and filename extension first (cheap, synchronous); `compressImage` falls back
 * to the magic-byte check (`isHeicByMagicBytes`) when neither is conclusive.
 */
function isHeicByTypeOrName(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const name = file.name?.toLowerCase() ?? "";
  return name.endsWith(".heic") || name.endsWith(".heif");
}

/** Reads the ISO-BMFF 'ftyp' box (bytes 4-7 "ftyp", bytes 8-11 the brand) to
 * detect HEIC/HEIF containers - the format iOS's Photo Library/Files picker
 * hands back by default, which browsers otherwise report with an empty or
 * generic `type`. */
function isHeicByMagicBytes(head: Uint8Array): boolean {
  if (head.length < 12) return false;
  const ftyp = String.fromCharCode(head[4], head[5], head[6], head[7]);
  if (ftyp !== "ftyp") return false;
  const brand = String.fromCharCode(head[8], head[9], head[10], head[11]);
  return HEIC_BRANDS.has(brand);
}

export async function compressImage(file: File): Promise<Blob> {
  let isHeic = isHeicByTypeOrName(file);
  if (!isHeic && (file.type.startsWith("image/") || file.type === "")) {
    // Cheap magic-byte fallback for the case where iOS hands back an empty/
    // generic `type` for a HEIC file (seen on some non-Safari mobile browsers)
    // and the filename itself doesn't carry a .heic/.heif extension.
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    isHeic = isHeicByMagicBytes(head);
  }

  if (!isHeic && (!file.type.startsWith("image/") || file.size < SKIP_IF_UNDER_BYTES)) {
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

/** First few bytes of each format's file signature - enough to distinguish the
 * types the backend accepts (see backend/main.py::ALLOWED_IMAGE_CONTENT_TYPES),
 * including HEIC/HEIF via the ISO-BMFF 'ftyp' box. */
async function sniffImageMimeType(blob: Blob): Promise<string | null> {
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (head[0] === 0xff && head[1] === 0xd8) return "image/jpeg";
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return "image/png";
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return "image/gif";
  const isRiff = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
  const isWebp = head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  if (isRiff && isWebp) return "image/webp";
  if (isHeicByMagicBytes(head)) return "image/heic";
  return null;
}

/**
 * Browsers occasionally hand back a Blob with an empty/generic `type` - canvas
 * exports without an explicit mime, clipboard pastes, some drag-and-drop
 * sources - even though the underlying bytes decode fine. The backend's
 * octet-stream fallback (see backend/main.py::_resolve_image_content_type) only
 * works if there's a recognizable filename extension, which a raw Blob rarely
 * has. Sniff the real format from the file signature and re-wrap with an
 * explicit content type before upload, so the multipart part's Content-Type
 * header - which browsers derive from `blob.type`, not the filename - is
 * actually correct. Falls through unchanged if the format isn't recognized, so
 * the backend can still reject it with a clear error instead of silently
 * mislabeling it.
 */
export async function ensureImageMimeType(blob: Blob): Promise<Blob> {
  if (blob.type.startsWith("image/")) return blob;
  const sniffed = await sniffImageMimeType(blob);
  return sniffed ? blob.slice(0, blob.size, sniffed) : blob;
}
