import type { DebateEvent } from "@/types/schemas";

/**
 * Parses a `text/event-stream` fetch Response body into DebateEvents as they arrive.
 *
 * Requires a fetch implementation with a streamable ReadableStream body (Expo SDK 51+ /
 * RN 0.74+ on Hermes support this for same-origin-scheme http(s) requests). If the target
 * Expo SDK doesn't support streaming fetch bodies on device, swap this for `react-native-sse`
 * behind the same async-generator signature - callers don't need to change.
 */
export async function* streamDebateEvents(response: Response): AsyncGenerator<DebateEvent> {
  if (!response.body) {
    throw new Error("Response has no readable body - streaming fetch is not supported here.");
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
        if (!dataLine) continue;

        const json = dataLine.slice("data:".length).trim();
        if (!json) continue;

        yield JSON.parse(json) as DebateEvent;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
