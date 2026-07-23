import * as FileSystem from "expo-file-system";

/**
 * A client-generated, persisted anonymous identity - sent as the
 * X-Device-Id header on every request that touches backend memory (see
 * backend/main.py::get_device_id and web/src/lib/deviceId.ts for the web
 * equivalent and the bug this fixes: without it, contacts/reads/style were
 * global and leaked across every user of the deployed app).
 *
 * Persisted via expo-file-system (already a dependency here) rather than
 * adding @react-native-async-storage/async-storage or expo-secure-store just
 * for one small anonymous ID.
 */

const FILE_URI = `${FileSystem.documentDirectory}device-id.txt`;

function randomId(): string {
  // Not cryptographically random - doesn't need to be, it's an anonymous
  // per-install identifier, not a security credential.
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const info = await FileSystem.getInfoAsync(FILE_URI);
  if (info.exists) {
    cached = await FileSystem.readAsStringAsync(FILE_URI);
    return cached;
  }
  const id = randomId();
  await FileSystem.writeAsStringAsync(FILE_URI, id);
  cached = id;
  return id;
}
