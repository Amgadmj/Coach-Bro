import type { DebateEvent } from "@/types/schemas";

/**
 * Parses a complete `text/event-stream`-formatted response body into DebateEvents.
 *
 * Used to read incrementally via a fetch ReadableStream (response.body.getReader()),
 * but React Native/Expo's fetch does not reliably support readable streaming
 * response bodies on device - see api/client.ts, which now uploads via
 * expo-file-system's uploadAsync and gets the complete SSE-formatted text back
 * in one shot instead of a live stream. This parses that same wire format,
 * just all at once rather than as it arrives.
 */
export function parseDebateEvents(raw: string): DebateEvent[] {
  const events: DebateEvent[] = [];

  for (const rawEvent of raw.split("\n\n")) {
    const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
    if (!dataLine) continue;

    const json = dataLine.slice("data:".length).trim();
    if (!json) continue;

    events.push(JSON.parse(json) as DebateEvent);
  }

  return events;
}
