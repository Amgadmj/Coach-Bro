import type { ContactSummary, DebateEvent, MemoryRecord } from "@/types/schemas";
import { streamDebateEvents } from "./sseStream";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface AnalyzeParams {
  imageUri: string;
  mimeType: string;
  fileName: string;
  contactId?: string | null;
}

/**
 * Calls POST /analyze and returns an async generator of DebateEvents as they stream in.
 * See docs/architecture.md §4 - this is intentionally SSE, not a single JSON response.
 */
export async function* analyzeScreenshot(params: AnalyzeParams): AsyncGenerator<DebateEvent> {
  const form = new FormData();
  form.append("image", {
    uri: params.imageUri,
    name: params.fileName,
    type: params.mimeType,
  } as unknown as Blob);
  if (params.contactId) {
    form.append("contact_id", params.contactId);
  }

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`/analyze failed: ${response.status} ${await response.text()}`);
  }

  yield* streamDebateEvents(response);
}

export async function fetchContacts(): Promise<ContactSummary[]> {
  const response = await fetch(`${API_BASE_URL}/contacts`);
  if (!response.ok) throw new Error(`/contacts failed: ${response.status}`);
  return response.json();
}

export async function fetchContactHistory(contactId: string): Promise<MemoryRecord[]> {
  const response = await fetch(`${API_BASE_URL}/contacts/${contactId}/history`);
  if (!response.ok) throw new Error(`/contacts/${contactId}/history failed: ${response.status}`);
  return response.json();
}
