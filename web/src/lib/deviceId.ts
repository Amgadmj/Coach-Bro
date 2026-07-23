/**
 * A client-generated, persisted anonymous identity - sent as the X-Device-Id
 * header on every request that touches backend memory (see backend/main.py::
 * get_device_id), so contacts/reads/style are scoped to this device instead
 * of leaking across every visitor to the app (the bug this fixes: different
 * users were seeing each other's reads because nothing scoped that data at
 * all). Deliberately not tied to the persisted zustand session store - this
 * is an anonymous identity, not a UI preference, and needs to exist before
 * any store hydrates.
 */

const KEY = "bro-code-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
