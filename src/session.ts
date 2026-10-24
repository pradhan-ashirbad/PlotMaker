// Tokens remain in local storage; a per-tab pointer prevents unrelated tabs
// from taking over each other's player. Keep an in-memory fallback if blocked.
export type Session = { code: string; token: string };
const pointerKey = "plotrelay-tab";
let tabId: string;
try {
  tabId = sessionStorage.getItem(pointerKey) || newId();
  sessionStorage.setItem(pointerKey, tabId);
} catch {
  tabId = newId();
}
let current = read();
export function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function read(): Session | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(`plotrelay-session:${tabId}`) || "null",
    );
    return value &&
      /^[A-F0-9]{10}$/.test(value.code) &&
      /^[a-f0-9]{64}$/.test(value.token)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function getSession() {
  return current;
}
export function saveSession(value: Session) {
  current = value;
  try {
    localStorage.setItem(`plotrelay-session:${tabId}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function clearSession() {
  current = null;
  try {
    localStorage.removeItem(`plotrelay-session:${tabId}`);
  } catch {
    /* storage blocked */
  }
}
export function releaseSession() {
  // A duplicated tab may share the pointer. Do not erase the new owner's token.
  current = null;
  tabId = newId();
  try {
    sessionStorage.setItem(pointerKey, tabId);
  } catch {
    /* storage blocked */
  }
}
export function readDraft(key: string) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
export function writeDraft(key: string, value: string) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* retain React state */
  }
}
