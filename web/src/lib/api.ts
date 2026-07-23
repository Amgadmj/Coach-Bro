import { compressImage, ensureImageMimeType } from "./image";
import type {
  ContactSummary,
  DebateEvent,
  ExtractResponse,
  MemoryRecord,
  SocialMode,
  SuggestCategory,
  SuggestResponse,
  SupportedLanguage,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * 413 (and some proxy-level rejections in general, e.g. a hosting gateway in
 * front of the backend) never reach FastAPI, so they come back with no CORS
 * headers and often an HTML body from the gateway itself, not backend JSON.
 * Read the body defensively rather than dumping a raw HTML error page - or a
 * generic "Failed to fetch"/CORS-looking browser error, which is what a 413
 * often surfaces as - into the debate screen.
 */
async function describeAnalyzeError(response: Response, route: string = "/analyze"): Promise<string> {
  if (response.status === 413) {
    return "That upload was too large for the server to accept - try attaching fewer screenshots, or retake them at a smaller size.";
  }
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { detail?: string };
    if (parsed.detail) return parsed.detail;
  } catch {
    // Not JSON (e.g. an HTML error page from a gateway) - fall through.
  }
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 200);
  return `${route} failed: ${response.status}${snippet ? ` - ${snippet}` : ""}`;
}

/**
 * POST /analyze - streams DebateEvents over SSE (see docs/architecture.md §4).
 * Intentionally an async generator so screens can render each event as it lands;
 * never collapse this into a single awaited JSON response (CLAUDE.md principle #5).
 *
 * Accepts screenshots, typed/pasted text, or both - both trigger the full swarm
 * debate identically (CLAUDE.md: pasted text is not a lighter code path). At
 * least one of `images` or `textContent` must be given.
 */
export async function* analyzeInput(
  images: (File | Blob)[] | undefined,
  textContent: string | undefined,
  contactId?: string | null,
  language: SupportedLanguage = "auto",
  mode: SocialMode = "hype",
): AsyncGenerator<DebateEvent> {
  const trimmedText = textContent?.trim();
  if ((!images || images.length === 0) && !trimmedText) {
    throw new Error("Attach at least one screenshot or enter some text.");
  }

  const form = new FormData();
  if (images && images.length > 0) {
    // Downscale/recompress oversized screenshots before they ever hit the wire -
    // see lib/image.ts for why. Non-File Blobs (already-processed callers) pass through.
    const compressed = await Promise.all(
      images.map((image) => (image instanceof File ? compressImage(image) : image)),
    );
    const prepared = await Promise.all(compressed.map(ensureImageMimeType));
    prepared.forEach((image, i) => {
      const original = images[i];
      const extension = image.type.split("/")[1] ?? "jpg";
      const name = original instanceof File ? original.name : `screenshot-${i}.${extension}`;
      form.append("images", image, name);
    });
  }
  if (trimmedText) form.append("text_content", trimmedText);
  if (contactId) form.append("contact_id", contactId);
  form.append("language", language);
  form.append("mode", mode);

  const response = await fetch(`${API_BASE_URL}/analyze`, { method: "POST", body: form });
  if (!response.ok || !response.body) {
    throw new Error(await describeAnalyzeError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
        const json = dataLine?.slice("data:".length).trim();
        if (json) yield JSON.parse(json) as DebateEvent;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * POST /extract - vision-extraction-only preview, fired the moment a
 * screenshot is attached on the Live screen (not at Send). Plain JSON, not
 * SSE - it's a single fast stage, not the multi-stage debate /analyze runs.
 * Reuses the same client-side compression as analyzeInput so both endpoints
 * see identically-prepared images.
 */
export async function extractConversation(images: (File | Blob)[]): Promise<ExtractResponse> {
  const compressed = await Promise.all(
    images.map((image) => (image instanceof File ? compressImage(image) : image)),
  );
  const prepared = await Promise.all(compressed.map(ensureImageMimeType));

  const form = new FormData();
  prepared.forEach((image, i) => {
    const original = images[i];
    const extension = image.type.split("/")[1] ?? "jpg";
    const name = original instanceof File ? original.name : `screenshot-${i}.${extension}`;
    form.append("images", image, name);
  });

  const response = await fetch(`${API_BASE_URL}/extract`, { method: "POST", body: form });
  if (!response.ok) {
    throw new Error(await describeAnalyzeError(response, "/extract"));
  }
  return response.json();
}

export async function suggestOpeners(
  scenario: string,
  mode: SocialMode,
  language: SupportedLanguage = "auto",
  category: SuggestCategory = "opener",
  seed: number = 0,
): Promise<SuggestResponse> {
  const response = await fetch(`${API_BASE_URL}/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, mode, language, category, seed }),
  });
  if (!response.ok) throw new Error(`/suggest failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function fetchContacts(): Promise<ContactSummary[]> {
  const response = await fetch(`${API_BASE_URL}/contacts`);
  if (!response.ok) throw new Error(`/contacts failed: ${response.status}`);
  return response.json();
}

export async function fetchContactHistory(contactId: string): Promise<MemoryRecord[]> {
  const response = await fetch(`${API_BASE_URL}/contacts/${contactId}/history`);
  if (!response.ok) throw new Error(`history failed: ${response.status}`);
  return response.json();
}
