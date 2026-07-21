import type {
  ContactSummary,
  DebateEvent,
  MemoryRecord,
  SocialMode,
  SuggestResponse,
  SupportedLanguage,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * POST /analyze - streams DebateEvents over SSE (see docs/architecture.md §4).
 * Intentionally an async generator so screens can render each event as it lands;
 * never collapse this into a single awaited JSON response (CLAUDE.md principle #5).
 */
export async function* analyzeScreenshot(
  images: (File | Blob)[],
  contactId?: string | null,
  language: SupportedLanguage = "auto",
): AsyncGenerator<DebateEvent> {
  if (images.length === 0) throw new Error("Attach at least one screenshot.");

  const form = new FormData();
  images.forEach((image, i) => {
    form.append("images", image, image instanceof File ? image.name : `screenshot-${i}.png`);
  });
  if (contactId) form.append("contact_id", contactId);
  form.append("language", language);

  const response = await fetch(`${API_BASE_URL}/analyze`, { method: "POST", body: form });
  if (!response.ok || !response.body) {
    throw new Error(`/analyze failed: ${response.status} ${await response.text()}`);
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

export async function suggestOpeners(
  scenario: string,
  mode: SocialMode,
  language: SupportedLanguage = "auto",
): Promise<SuggestResponse> {
  const response = await fetch(`${API_BASE_URL}/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, mode, language }),
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
