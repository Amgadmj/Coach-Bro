import * as FileSystem from "expo-file-system";

import type { ContactSummary, DebateEvent, MemoryRecord } from "@/types/schemas";
import { parseDebateEvents } from "./sseStream";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface AnalyzeParams {
  imageUri: string;
  mimeType: string;
  fileName: string;
  contactId?: string | null;
}

/**
 * Calls POST /analyze and returns the DebateEvents the backend produced.
 *
 * Uses expo-file-system's native uploadAsync instead of fetch+FormData. Two
 * real, confirmed problems with the fetch+FormData approach on device:
 * 1. It was sending the file under form field "image" (singular) while
 *    backend/main.py's /analyze only reads "images" (plural, list) - every
 *    upload silently sent zero images and the backend rejected it outright.
 * 2. Even with that fixed, React Native's fetch/FormData handling of local
 *    file URIs (especially Android content:// URIs) has long-standing
 *    reliability issues - empty or truncated multipart bodies, silent hangs -
 *    and its fetch doesn't reliably support reading a streaming response body
 *    either (the previous sseStream.ts depended on that for live SSE).
 * uploadAsync does the multipart upload at the native layer, sidestepping
 * both. The tradeoff: no true wire-level streaming, so the full SSE-formatted
 * response is parsed in one pass here and the caller (state/analysisStore.ts)
 * replays the events with a short client-side pacing delay to preserve the
 * debate-reveal UX instead of dumping the whole result on screen instantly.
 */
export async function analyzeScreenshot(params: AnalyzeParams): Promise<DebateEvent[]> {
  const result = await FileSystem.uploadAsync(`${API_BASE_URL}/analyze`, params.imageUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "images",
    mimeType: params.mimeType,
    parameters: params.contactId ? { contact_id: params.contactId } : {},
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`/analyze failed: ${result.status} ${result.body}`);
  }

  return parseDebateEvents(result.body);
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
